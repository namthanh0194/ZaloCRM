// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nguyễn Tiến Lộc
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { authMiddleware } from '../auth/auth-middleware.js';
import { requireGrant } from '../rbac/rbac-middleware.js';
import { requireZaloAccess } from '../zalo/zalo-access-middleware.js';
import { getAiConfig, getAiUsage, updateAiConfig, generateAiOutput, aiFormatRichText, aiGenerateSalesHandoffMessage } from './ai-service.js';
// M53 2026-05-30 — Trợ Lý AI Virtual Chat
import { DEFAULT_VIRTUAL_CHAT_PROMPT } from './prompts/virtual-chat-assistant.js';
import {
  getAvailableProviders,
  getProviderBaseUrl,
  resolveProviderApiKey,
  setProviderApiKey,
  setProviderBaseUrl,
  createCustomProvider,
  updateCustomProvider,
  deleteCustomProvider,
} from './provider-registry.js';
import { generateWithOpenaiCompat } from './providers/openai-compat.js';
import { generateText } from './ai-service.js';
import { listProviderModels, invalidateModelCache } from './providers/list-models.js';
import { logger } from '../../shared/utils/logger.js';
import { prisma } from '../../shared/database/prisma-client.js';

async function assertConversationReadAccess(request: FastifyRequest, reply: FastifyReply, conversationId: string) {
  const user = request.user!;
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, orgId: user.orgId },
    select: { id: true, zaloAccountId: true },
  });
  if (!conversation) {
    reply.status(404).send({ error: 'Conversation not found' });
    return null;
  }
  if (['owner', 'admin'].includes(user.role)) return conversation;

  const access = await prisma.zaloAccountAccess.findFirst({
    where: { zaloAccountId: conversation.zaloAccountId, userId: user.id },
    select: { permission: true },
  });
  if (!access) {
    reply.status(403).send({ error: 'Không có quyền truy cập tài khoản Zalo này' });
    return null;
  }
  return conversation;
}

/**
 * PRIVACY 2026-06-11 (audit C6/H10) — chặn AI đọc content của nick Riêng tư cho
 * người KHÔNG phải chính chủ đã unlock. Tóm tắt/cảm xúc/nháp được SINH RA từ nội
 * dung nên không thể chỉ blur output — phải ngăn AI đọc input. Trả false (đã gửi
 * 403) nếu không được phép; true nếu OK.
 */
async function assertPrivacyAllowsAi(request: FastifyRequest, reply: FastifyReply, conversationId: string): Promise<boolean> {
  const conv = await prisma.conversation.findFirst({
    where: { id: conversationId, orgId: request.user!.orgId },
    select: { zaloAccount: { select: { privacyMode: true, ownerUserId: true } } },
  });
  if (!conv) {
    reply.status(404).send({ error: 'Conversation not found' });
    return false;
  }
  const { buildPrivacyContext, canSeeConversationContent } = await import('../privacy/redact.js');
  const ctx = await buildPrivacyContext(request);
  if (!canSeeConversationContent(conv as any, ctx)) {
    reply.status(403).send({
      error: 'Nick này đang bật Riêng tư — chỉ chính chủ đã mở khoá mới dùng được AI trên hội thoại này.',
      code: 'PRIVACY_LOCKED',
    });
    return false;
  }
  return true;
}

function getStatusFromError(err: unknown, fallback: string) {
  const message = err instanceof Error ? err.message : fallback;
  const status = message.includes('quota exceeded') ? 429 : message.includes('not found') ? 404 : message.includes('disabled') || message.includes('configured') ? 400 : 500;
  return { message, status };
}

function sendHandledError(reply: FastifyReply, err: unknown, fallback: string) {
  const handled = getStatusFromError(err, fallback);
  const safeMessage = handled.status === 500 ? fallback : handled.message;
  return reply.status(handled.status).send({ error: safeMessage });
}


export async function aiRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  /* Danh sách provider (cả 5) + baseUrl + trạng thái key per-org. */
  app.get('/api/v1/ai/providers', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      return await getAvailableProviders(request.user!.orgId);
    } catch (err) {
      logger.error('[ai] Get providers error:', err);
      return reply.status(500).send({ error: 'Failed to fetch providers' });
    }
  });

  app.post('/api/v1/ai/providers/test', { preHandler: requireGrant('settings', 'edit') }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = (request.body ?? {}) as { baseUrl?: string; apiKey?: string; model?: string; apiType?: string };
      const rawBaseUrl = (body.baseUrl || '').trim().replace(/\/$/, '');
      const apiKey = (body.apiKey || '').trim();
      const model = (body.model || '').trim();
      const apiType = body.apiType || 'chat_completions';
      if (!rawBaseUrl || !apiKey) {
        return reply.status(400).send({ error: 'Base URL và API key là bắt buộc để kiểm tra' });
      }
      if (model) {
        const endpointPath = apiType === 'responses' ? '/responses' : '/chat/completions';
        const completionsUrl = rawBaseUrl.endsWith(endpointPath)
          ? rawBaseUrl
          : rawBaseUrl.endsWith('/v1')
            ? `${rawBaseUrl}${endpointPath}`
            : `${rawBaseUrl}/v1${endpointPath}`;
        await generateWithOpenaiCompat(completionsUrl, apiKey, model, 'You are a test assistant.', 'ping', undefined);
        return { ok: true, message: `Kết nối thành công với model "${model}"` };
      }
      const modelsUrl = rawBaseUrl.endsWith('/v1') ? `${rawBaseUrl}/models` : `${rawBaseUrl}/v1/models`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);
      try {
        const res = await fetch(modelsUrl, {
          headers: { authorization: `Bearer ${apiKey}` },
          signal: controller.signal,
        });
        if (!res.ok) {
          const errBody = await res.text().catch(() => '');
          throw new Error(`HTTP ${res.status}: ${errBody.slice(0, 150)}`);
        }
        const data = (await res.json()) as { data?: Array<{ id?: string }> };
        const modelCount = data.data?.length ?? 0;
        return { ok: true, message: `Kết nối thành công! Tìm thấy ${modelCount} models.` };
      } finally {
        clearTimeout(timeout);
      }
    } catch (err) {
      logger.warn('[ai] Test connection fail: %s', (err as Error).message);
      return reply.status(400).send({ error: `Kiểm tra thất bại: ${(err as Error).message}` });
    }
  });

  // ════════ KNOWLEDGE BASE ROUTES ════════
  app.get('/api/v1/ai/knowledge', async (request: FastifyRequest) => {
    const orgId = request.user!.orgId;
    try {
      return await prisma.aiKnowledgeDocument.findMany({
        where: { orgId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (err) {
      logger.warn('[ai] Knowledge table maybe not migrated yet: %s', (err as Error).message);
      return [];
    }
  });

  app.post('/api/v1/ai/knowledge', { preHandler: requireGrant('settings', 'edit') }, async (request: FastifyRequest, reply: FastifyReply) => {
    const orgId = request.user!.orgId;
    const body = (request.body ?? {}) as { title?: string; content?: string; isActive?: boolean };
    const title = (body.title || '').trim();
    const content = (body.content || '').trim();
    if (!title || !content) {
      return reply.status(400).send({ error: 'Tiêu đề và nội dung tài liệu là bắt buộc' });
    }
    try {
      const doc = await prisma.aiKnowledgeDocument.create({
        data: {
          orgId,
          title,
          content,
          isActive: body.isActive ?? true,
        },
      });
      return reply.status(201).send(doc);
    } catch (err) {
      logger.error('[ai] Create knowledge doc error: %s', (err as Error).message);
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  app.put('/api/v1/ai/knowledge/:id', { preHandler: requireGrant('settings', 'edit') }, async (request: FastifyRequest, reply: FastifyReply) => {
    const orgId = request.user!.orgId;
    const { id } = request.params as { id: string };
    const body = (request.body ?? {}) as { title?: string; content?: string; isActive?: boolean };
    try {
      const doc = await prisma.aiKnowledgeDocument.findFirst({ where: { id, orgId } });
      if (!doc) return reply.status(404).send({ error: 'Không tìm thấy tài liệu' });
      const updated = await prisma.aiKnowledgeDocument.update({
        where: { id },
        data: {
          ...(body.title !== undefined ? { title: body.title.trim() } : {}),
          ...(body.content !== undefined ? { content: body.content.trim() } : {}),
          ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        },
      });
      return updated;
    } catch (err) {
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  app.delete('/api/v1/ai/knowledge/:id', { preHandler: requireGrant('settings', 'edit') }, async (request: FastifyRequest, reply: FastifyReply) => {
    const orgId = request.user!.orgId;
    const { id } = request.params as { id: string };
    try {
      const doc = await prisma.aiKnowledgeDocument.findFirst({ where: { id, orgId } });
      if (!doc) return reply.status(404).send({ error: 'Không tìm thấy tài liệu' });
      await prisma.aiKnowledgeDocument.delete({ where: { id } });
      return { ok: true };
    } catch (err) {
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  // ════════ KNOWLEDGE BASE ASK / QUERY FOR SIDEBAR CHAT ════════
  app.post('/api/v1/ai/knowledge/ask', async (request: FastifyRequest, reply: FastifyReply) => {
    const orgId = request.user!.orgId;
    const body = (request.body ?? {}) as { question?: string; conversationId?: string };
    const question = (body.question || '').trim();
    if (!question) {
      return reply.status(400).send({ error: 'Vui lòng nhập câu hỏi' });
    }
    try {
      const aiCfg = await prisma.aiConfig.findUnique({ where: { orgId } });
      const provider = aiCfg?.provider || 'openai';
      const model = aiCfg?.model || 'combozalo';
      const [apiKey, baseUrl] = await Promise.all([
        resolveProviderApiKey(orgId, provider),
        getProviderBaseUrl(orgId, provider),
      ]);

      let docs: Array<{ title: string; content: string }> = [];
      try {
        docs = await prisma.aiKnowledgeDocument.findMany({
          where: { orgId, isActive: true },
          select: { title: true, content: true },
          take: 10,
          orderBy: { updatedAt: 'desc' },
        });
      } catch {
        // ignore if not migrated yet
      }

      const knowledgeContext = docs.length > 0
        ? docs.map((d, idx) => `[Tài liệu ${idx + 1}: ${d.title}]\n${d.content}`).join('\n\n')
        : `Repu Digital là công ty chuyên cung cấp các dịch vụ Digital Marketing, tư vấn giải pháp công nghệ Martech (Công nghệ tiếp thị) và tự động hóa doanh nghiệp (Automation Solutions) tại Việt Nam.`;

      const systemPrompt = `Bạn là Trợ lý AI Repu Digital - hỗ trợ nhân viên tư vấn khách hàng.
Hãy dựa vào cơ sở tri thức dưới đây để trả lời câu hỏi của nhân viên hoặc soạn tin nhắn trả lời khách hàng một cách chuyên nghiệp, chính xác và lịch sự.
Nếu không có đủ thông tin trong tài liệu, hãy thành thật nêu rõ hoặc gợi ý liên hệ thêm bộ phận chuyên môn của Repu Digital.

=== CƠ SỞ TRI THỨC (REPU DIGITAL) ===
${knowledgeContext}
=======================================`;

      const answer = await generateText(
        provider,
        apiKey,
        model,
        systemPrompt,
        question,
        undefined,
        baseUrl,
      );

      return { ok: true, answer };
    } catch (err) {
      logger.error('[ai] Knowledge ask error: %s', (err as Error).message);
      return reply.status(500).send({ error: (err as Error).message || 'Không thể lấy câu trả lời từ AI' });
    }
  });

  app.post('/api/v1/ai/providers', { preHandler: requireGrant('settings', 'edit') }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = (request.body ?? {}) as { name?: string; slug?: string; baseUrl?: string; model?: string; apiKey?: string };
      const provider = await createCustomProvider({
        orgId: request.user!.orgId,
        name: body.name || '',
        slug: body.slug || '',
        baseUrl: body.baseUrl || '',
        model: body.model || '',
        apiKey: body.apiKey || '',
      });
      invalidateModelCache(request.user!.orgId, provider.slug);
      return reply.status(201).send({ ok: true, id: provider.slug });
    } catch (err) {
      logger.error('[ai] Create provider error:', err);
      return reply.status(400).send({ error: (err as Error).message || 'Failed to create provider' });
    }
  });

  /* Set/xoá API key + base URL của 1 provider (per-org). apiKey rỗng = xoá → fallback .env. */
  app.put('/api/v1/ai/providers/:id', { preHandler: requireGrant('settings', 'edit') }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const orgId = request.user!.orgId;
      const { id } = request.params as { id: string };
      const body = (request.body ?? {}) as { apiKey?: string | null; baseUrl?: string | null; name?: string; model?: string; isActive?: boolean };
      if (body.name !== undefined || body.model !== undefined || body.isActive !== undefined) {
        await updateCustomProvider(orgId, id, {
          name: body.name,
          baseUrl: body.baseUrl ?? undefined,
          model: body.model,
          apiKey: body.apiKey ?? undefined,
          isActive: body.isActive,
        });
      } else {
        if (body.apiKey !== undefined) await setProviderApiKey(orgId, id, body.apiKey?.trim() || null);
        if (body.baseUrl !== undefined) await setProviderBaseUrl(orgId, id, body.baseUrl ?? null);
      }
      invalidateModelCache(orgId, id);
      return { ok: true };
    } catch (err) {
      logger.error('[ai] Update provider error:', err);
      return reply.status(400).send({ error: (err as Error).message || 'Failed to update provider' });
    }
  });

  app.delete('/api/v1/ai/providers/:id', { preHandler: requireGrant('settings', 'edit') }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const orgId = request.user!.orgId;
      const { id } = request.params as { id: string };
      await deleteCustomProvider(orgId, id);
      invalidateModelCache(orgId, id);
      return { ok: true };
    } catch (err) {
      logger.error('[ai] Delete provider error:', err);
      return reply.status(400).send({ error: (err as Error).message || 'Failed to delete provider' });
    }
  });

  /* Danh sách model lấy động từ provider. Lỗi → {models:[],error} (200) để UI fallback gõ tay. */
  app.get('/api/v1/ai/providers/:id/models', async (request: FastifyRequest) => {
    const orgId = request.user!.orgId;
    const { id } = request.params as { id: string };
    try {
      const [apiKey, baseUrl] = await Promise.all([
        resolveProviderApiKey(orgId, id),
        getProviderBaseUrl(orgId, id),
      ]);
      if (!apiKey) return { models: [], error: 'Chưa cấu hình API key' };
      const models = await listProviderModels(id, baseUrl, apiKey, orgId);
      return { models };
    } catch (err) {
      logger.warn('[ai] List models fail provider=%s: %s', id, (err as Error).message);
      return { models: [], error: (err as Error).message };
    }
  });

  app.get('/api/v1/ai/config', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      return await getAiConfig(request.user!.orgId);
    } catch (err) {
      logger.error('[ai] Get config error:', err);
      return reply.status(500).send({ error: 'Failed to fetch AI config' });
    }
  });

  app.put('/api/v1/ai/config', { preHandler: requireGrant('settings', 'edit') }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as { provider?: string; model?: string; maxDaily?: number; enabled?: boolean };
      if (body.maxDaily !== undefined && body.maxDaily < 1) return reply.status(400).send({ error: 'maxDaily must be at least 1' });
      return await updateAiConfig(request.user!.orgId, body);
    } catch (err) {
      logger.error('[ai] Update config error:', err);
      return reply.status(500).send({ error: 'Failed to update AI config' });
    }
  });

  app.get('/api/v1/ai/usage', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      return await getAiUsage(request.user!.orgId);
    } catch (err) {
      logger.error('[ai] Usage error:', err);
      return reply.status(500).send({ error: 'Failed to fetch AI usage' });
    }
  });

  app.post('/api/v1/ai/suggest', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as { conversationId?: string; messageId?: string };
      if (!body.conversationId) return reply.status(400).send({ error: 'conversationId is required' });
      const access = await assertConversationReadAccess(request, reply, body.conversationId);
      if (!access) return;
      if (!(await assertPrivacyAllowsAi(request, reply, body.conversationId))) return;
      return await generateAiOutput({ orgId: request.user!.orgId, conversationId: body.conversationId, messageId: body.messageId, type: 'reply_draft' });
    } catch (err) {
      logger.error('[ai] Suggest error:', err);
      return sendHandledError(reply, err, 'Failed to generate AI suggestion');
    }
  });

  app.post('/api/v1/ai/summarize/:id', { preHandler: requireZaloAccess('read') }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      if (!(await assertPrivacyAllowsAi(request, reply, id))) return;
      return await generateAiOutput({ orgId: request.user!.orgId, conversationId: id, type: 'summary' });
    } catch (err) {
      logger.error('[ai] Summary error:', err);
      return sendHandledError(reply, err, 'Failed to summarize conversation');
    }
  });

  app.post('/api/v1/ai/sentiment/:id', { preHandler: requireZaloAccess('read') }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      if (!(await assertPrivacyAllowsAi(request, reply, id))) return;
      return await generateAiOutput({ orgId: request.user!.orgId, conversationId: id, type: 'sentiment' });
    } catch (err) {
      logger.error('[ai] Sentiment error:', err);
      return sendHandledError(reply, err, 'Failed to analyze sentiment');
    }
  });

  // ── POST /ai/sales-handoff-message ─ Template tin nội bộ sale-to-sale. 2026-05-22 v2 ─
  // Dùng cho widget "Đồng đội cùng chăm KH" tab CRM (chat cột 4).
  // Body: {
  //   contactId: string,
  //   targetUserId: string (sale nhận tin — User.id),
  //   targetZaloAccountId?: string (optional, để lấy Friend per-pair activity)
  // }
  // Response: {
  //   content: string,                       // tin nhắn theo template anh đã chốt
  //   source: 'template',
  //   targetZaloUid: string | null,          // UID nick Zalo của sale target → mở zalo.me/{uid}
  //   targetZaloAccountName: string | null   // tên nick (FE hiển thị)
  // }
  app.post('/api/v1/ai/sales-handoff-message', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user!;
      const body = request.body as { contactId?: string; targetUserId?: string; targetZaloAccountId?: string };
      if (!body?.contactId) return reply.status(400).send({ error: 'contactId is required' });
      if (!body?.targetUserId) return reply.status(400).send({ error: 'targetUserId is required' });

      const [contact, toUser] = await Promise.all([
        prisma.contact.findFirst({
          where: { id: body.contactId, orgId: user.orgId, mergedInto: null },
          select: {
            id: true, fullName: true, crmName: true, phone: true,
            engagementPattern: true, status: true,
            priorityScore: true, leadScore: true,
            nextAppointment: true,
            statusRef: { select: { name: true } },
          },
        }),
        prisma.user.findFirst({ where: { id: body.targetUserId, orgId: user.orgId }, select: { id: true, fullName: true } }),
      ]);

      if (!contact) return reply.status(404).send({ error: 'Contact not found' });
      if (!toUser) return reply.status(404).send({ error: 'Target sale not found' });

      // Lấy Friend per-pair activity của sale target × KH (cho mục "tương tác gần nhất")
      let targetActivity: { lastInboundAt?: Date | null; lastOutboundAt?: Date | null; lastInteractionAt?: Date | null; totalInbound?: number; totalOutbound?: number } | undefined;
      if (body.targetZaloAccountId) {
        const friend = await prisma.friend.findFirst({
          where: {
            orgId: user.orgId,
            contactId: contact.id,
            zaloAccountId: body.targetZaloAccountId,
          },
          select: { lastInboundAt: true, lastOutboundAt: true, lastInteractionAt: true, totalInbound: true, totalOutbound: true },
        });
        if (friend) targetActivity = friend;
      }

      // Tìm appointment kế tiếp (nếu có) → bổ sung vào template
      const upcomingAppt = await prisma.appointment.findFirst({
        where: { contactId: contact.id, orgId: user.orgId, appointmentDate: { gte: new Date() }, status: 'scheduled' },
        orderBy: { appointmentDate: 'asc' },
        select: { appointmentDate: true, location: true },
      });

      // Tìm zalo nick CỦA SALE TARGET (target user) — dùng để FE mở zalo.me/{uid}
      // → người dùng đang online nick X nhắn DM trực tiếp tới nick của sale target.
      // Ưu tiên privacyMode='main' (nick cá nhân/chính của sale) → đó là nick nhận DM nội bộ.
      // Fallback: nick connected mới nhất.
      const targetZaloNick = await prisma.zaloAccount.findFirst({
        where: {
          orgId: user.orgId,
          ownerUserId: body.targetUserId,
          zaloUid: { not: null },
        },
        orderBy: [
          { privacyMode: 'asc' },            // 'main' < 'sub' theo alphabet → main lên trước
          { lastConnectedAt: 'desc' },
        ],
        select: { id: true, zaloUid: true, displayName: true },
      });

      const displayName = contact.crmName || contact.fullName || 'KH này';

      const result = aiGenerateSalesHandoffMessage({
        orgId: user.orgId,
        fromSaleName: '',  // không dùng trong template mới
        toSaleName: toUser.fullName || 'anh/chị',
        contact: {
          displayName,
          phone: contact.phone,
          statusLabel: contact.statusRef?.name || contact.status,
          priorityScore: contact.priorityScore,
          leadScore: contact.leadScore,
          engagementPattern: contact.engagementPattern,
          nextAppointmentAt: upcomingAppt?.appointmentDate || contact.nextAppointment || null,
          nextAppointmentLocation: upcomingAppt?.location || null,
        },
        targetActivity,
      });

      return {
        content: result.content,
        source: result.source,
        targetZaloUid: targetZaloNick?.zaloUid || null,
        targetZaloAccountName: targetZaloNick?.displayName || null,
      };
    } catch (err) {
      logger.error('[ai] Sales handoff error:', err);
      return sendHandledError(reply, err, 'Không soạn được tin phối hợp');
    }
  });

  // ── POST /ai/format-rich ─ AI auto-format text → Zalo styles. 2026-05-21 ─
  // Body: { text: string }  → Response: { text, styles[], source: 'ai'|'fallback' }
  // source='fallback' khi AI tắt, hết quota, hoặc parse fail — FE gửi tin plain.
  app.post('/api/v1/ai/format-rich', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as { text?: string };
      if (!body?.text?.trim()) return reply.status(400).send({ error: 'text is required' });
      if (body.text.length > 3000) return reply.status(400).send({ error: 'Đoạn text quá dài (tối đa 3000 ký tự)' });
      return await aiFormatRichText({ orgId: request.user!.orgId, rawText: body.text });
    } catch (err) {
      logger.error('[ai] Format-rich error:', err);
      return sendHandledError(reply, err, 'Không format được tin bằng AI');
    }
  });

  // ── M53 2026-05-30 — AI Trợ Lý Virtual Chat ──────────────────────────────

  // GET /ai/assistant-config — load prompt template + toggle + skip regex
  app.get('/api/v1/ai/assistant-config', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const cfg = await getAiConfig(request.user!.orgId);
      return {
        aiAssistantEnabled: cfg.aiAssistantEnabled,
        aiAssistantPromptTemplate: cfg.aiAssistantPromptTemplate ?? DEFAULT_VIRTUAL_CHAT_PROMPT,
        aiAssistantSkipNoisePattern: cfg.aiAssistantSkipNoisePattern,
        defaultPrompt: DEFAULT_VIRTUAL_CHAT_PROMPT,
        provider: cfg.provider,
        model: cfg.model,
        maxDaily: cfg.maxDaily,
        enabled: cfg.enabled,
      };
    } catch (err) {
      logger.error('[ai] assistant-config GET error:', err);
      return reply.status(500).send({ error: 'Failed to load AI assistant config' });
    }
  });

  // PUT /ai/assistant-config — admin update prompt + toggle + skip regex
  app.put(
    '/api/v1/ai/assistant-config',
    { preHandler: requireGrant('settings', 'edit') },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = request.body as {
          aiAssistantEnabled?: boolean;
          aiAssistantPromptTemplate?: string | null;
          aiAssistantSkipNoisePattern?: string;
        };
        // Validate regex
        if (body.aiAssistantSkipNoisePattern) {
          try {
            new RegExp(body.aiAssistantSkipNoisePattern);
          } catch {
            return reply.status(400).send({ error: 'Regex không hợp lệ' });
          }
        }
        const updated = await prisma.aiConfig.update({
          where: { orgId: request.user!.orgId },
          data: {
            aiAssistantEnabled: body.aiAssistantEnabled,
            aiAssistantPromptTemplate: body.aiAssistantPromptTemplate,
            aiAssistantSkipNoisePattern: body.aiAssistantSkipNoisePattern,
          },
        });
        return { ok: true, aiAssistantEnabled: updated.aiAssistantEnabled };
      } catch (err) {
        logger.error('[ai] assistant-config PUT error:', err);
        return reply.status(500).send({ error: 'Failed to update AI assistant config' });
      }
    },
  );

  // PATCH /contacts/:contactId/apply-ai-suggestion — sale apply field từ AiSuggestionCard
  // Body: { messageId, acceptedFields: [{field, value}], rejectedFields?: string[] }
  app.patch(
    '/api/v1/contacts/:contactId/apply-ai-suggestion',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = request.user!;
        const { contactId } = request.params as { contactId: string };
        const body = request.body as {
          messageId: string;
          acceptedFields: Array<{ field: string; value: unknown }>;
          rejectedFields?: string[];
        };
        if (!body.messageId || !Array.isArray(body.acceptedFields)) {
          return reply.status(400).send({ error: 'messageId + acceptedFields required' });
        }

        // Load contact + verify org
        const contact = await prisma.contact.findFirst({
          where: { id: contactId, orgId: user.orgId },
          select: { id: true, tags: true, metadata: true, notes: true },
        });
        if (!contact) return reply.status(404).send({ error: 'Contact not found' });

        // M55.3 2026-05-30: Mở rộng whitelist — thêm tags + propertyNeed (lưu vào
        // metadata.propertyNeed vì Contact schema chưa có cột riêng). Special handling:
        // - tags: MERGE với tags hiện tại (không overwrite, dedup)
        // - propertyNeed: serialize vào Contact.metadata.propertyNeed + tóm tắt vào notes
        const ALLOWED_SCALAR = new Set([
          'fullName', 'gender', 'birthYear', 'occupation', 'incomeRange',
          'province', 'district', 'ward', 'source',
        ]);
        const update: Record<string, unknown> = {};
        const acceptedLog: Array<{ field: string; value: unknown }> = [];

        for (const item of body.acceptedFields) {
          if (ALLOWED_SCALAR.has(item.field)) {
            update[item.field] = item.value;
            acceptedLog.push(item);
          } else if (item.field === 'tags' && Array.isArray(item.value)) {
            // M57 Wave 3 /plan-eng-review: route qua tag-service (source=ai_suggest).
            // tag-service dual-write Contact.tags + ContactTag junction trong $transaction.
            // KHÔNG còn set update.tags ở đây.
            const newTags = (item.value as unknown[]).filter((t): t is string => typeof t === 'string');
            const { addCrmTag } = await import('../tags/tag-service.js');
            for (const tagName of newTags) {
              try {
                const res = await addCrmTag({
                  contactId,
                  tagName,
                  source: 'ai_suggest',
                  addedBy: user.id,
                  autoCreate: true,
                });
                // CareSession 2026-06-07: gắn CRM tag (AI) → đóng phiên nếu ∈ closeConditions.
                if (res?.tag?.id) {
                  const { onTagAdded } = await import('../../shared/ee-registry/automation.js');
                  await onTagAdded({ orgId: user.orgId, contactId, tagKind: 'crmTag', tagId: res.tag.id });
                }
              } catch (err) {
                logger.warn('[ai-routes] addCrmTag fail %s: %s', tagName, (err as Error).message);
              }
            }
            acceptedLog.push(item);
          } else if (item.field === 'propertyNeed' && item.value && typeof item.value === 'object') {
            // Lưu vào metadata.propertyNeed — merge với existing metadata
            const existingMeta = (contact.metadata && typeof contact.metadata === 'object')
              ? contact.metadata as Record<string, unknown>
              : {};
            update.metadata = { ...existingMeta, propertyNeed: item.value };
            // Bonus: append tóm tắt vào notes để sale đọc nhanh
            const pn = item.value as {
              type?: string;
              budgetMin?: number;
              budgetMax?: number;
              purpose?: string;
              area?: string;
              decisionTimeline?: string;
            };
            const parts: string[] = [];
            if (pn.type) parts.push(pn.type);
            if (pn.budgetMin || pn.budgetMax) {
              parts.push(pn.budgetMax ? `${pn.budgetMin || '?'}-${pn.budgetMax} tỷ` : `${pn.budgetMin} tỷ`);
            }
            if (pn.purpose) parts.push(pn.purpose);
            if (pn.area) parts.push(`tại ${pn.area}`);
            if (pn.decisionTimeline) parts.push(`quyết định ${pn.decisionTimeline}`);
            if (parts.length > 0) {
              const summary = `[AI ${new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}] Nhu cầu BĐS: ${parts.join(' · ')}`;
              const oldNotes = (contact.notes || '').trim();
              update.notes = oldNotes ? `${oldNotes}\n\n${summary}` : summary;
            }
            acceptedLog.push(item);
          }
        }

        if (Object.keys(update).length > 0) {
          await prisma.contact.update({ where: { id: contactId }, data: update });
        }

        // Audit log
        await prisma.aiSuggestionApplied.create({
          data: {
            orgId: user.orgId,
            contactId,
            messageId: body.messageId,
            userId: user.id,
            acceptedFields: acceptedLog,
            rejectedFields: body.rejectedFields ?? [],
          },
        });

        // ActivityLog
        await prisma.activityLog.create({
          data: {
            orgId: user.orgId,
            userId: user.id,
            actorType: 'user',
            botName: null,
            category: 'customer_info',
            action: 'ai_suggestion_applied',
            entityType: 'contact',
            entityId: contactId,
            details: { acceptedFields: acceptedLog, messageId: body.messageId },
          },
        });

        return { ok: true, applied: Object.keys(update) };
      } catch (err) {
        logger.error('[ai] apply-suggestion error:', err);
        return reply.status(500).send({ error: 'Failed to apply suggestion' });
      }
    },
  );
}
