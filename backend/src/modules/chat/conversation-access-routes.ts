import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../shared/database/prisma-client.js';
import { authMiddleware } from '../auth/auth-middleware.js';
import { getConversationAccessActor, isConversationAccessManager } from './conversation-access.js';
import { getZaloScope } from '../zalo/zalo-scope.js';

async function findManagedConversation(request: FastifyRequest, reply: FastifyReply) {
  const actor = await getConversationAccessActor(request);
  if (!isConversationAccessManager(actor)) {
    reply.status(403).send({ error: 'Chỉ Admin hoặc Sale Senior được phân quyền hội thoại' });
    return null;
  }

  const { id } = request.params as { id: string };
  const conversation = await prisma.conversation.findFirst({
    where: { id, orgId: actor.orgId },
    select: { id: true, zaloAccountId: true },
  });
  if (!conversation) {
    reply.status(404).send({ error: 'Conversation not found' });
    return null;
  }

  if (actor.role !== 'owner' && actor.role !== 'admin' && actor.permissionGroupName !== 'Admin') {
    const scope = await getZaloScope(actor.id, actor.orgId, actor.role);
    if (!scope.accessibleIds.includes(conversation.zaloAccountId)) {
      reply.status(403).send({ error: 'Bạn không có quyền phân quyền hội thoại của nick này' });
      return null;
    }
  }

  return { actor, conversation };
}

async function audit(request: FastifyRequest, action: string, conversationId: string, details: Record<string, unknown>) {
  const user = request.user!;
  try {
    await prisma.activityLog.create({
      data: {
        orgId: user.orgId,
        userId: user.id,
        actorType: 'user',
        category: 'admin',
        action,
        entityType: 'conversation',
        entityId: conversationId,
        details: details as any,
      },
    });
  } catch { /* audit không chặn nghiệp vụ */ }
}

export async function conversationAccessRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  app.get('/api/v1/conversations/:id/access', async (request, reply) => {
    const managed = await findManagedConversation(request, reply);
    if (!managed) return;
    return prisma.conversationAccess.findMany({
      where: { conversationId: managed.conversation.id, orgId: managed.actor.orgId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        userId: true,
        canChat: true,
        createdAt: true,
        user: { select: { id: true, fullName: true, email: true, role: true, permissionGroup: { select: { name: true } } } },
      },
    });
  });

  app.get('/api/v1/conversation-access/users', async (request, reply) => {
    const actor = await getConversationAccessActor(request);
    if (!isConversationAccessManager(actor)) return reply.status(403).send({ error: 'Không có quyền phân quyền hội thoại' });
    return prisma.user.findMany({
      where: { orgId: actor.orgId, isActive: true, role: { notIn: ['owner', 'admin'] } },
      orderBy: { fullName: 'asc' },
      select: { id: true, fullName: true, email: true, role: true, permissionGroup: { select: { name: true } } },
    });
  });

  app.put('/api/v1/conversations/:id/access/:userId', async (request, reply) => {
    const managed = await findManagedConversation(request, reply);
    if (!managed) return;
    const { userId } = request.params as { userId: string };
    const body = (request.body ?? {}) as { canChat?: boolean };
    const target = await prisma.user.findFirst({ where: { id: userId, orgId: managed.actor.orgId, isActive: true }, select: { id: true, role: true } });
    if (!target || target.role === 'owner' || target.role === 'admin') return reply.status(400).send({ error: 'User không hợp lệ để phân quyền hội thoại' });
    const access = await prisma.conversationAccess.upsert({
      where: { conversationId_userId: { conversationId: managed.conversation.id, userId } },
      create: { id: randomUUID(), orgId: managed.actor.orgId, conversationId: managed.conversation.id, userId, assignedById: managed.actor.id, canChat: body.canChat !== false },
      update: { assignedById: managed.actor.id, canChat: body.canChat !== false },
      select: { id: true, conversationId: true, userId: true, canChat: true },
    });
    await audit(request, 'conversation_access_granted', managed.conversation.id, { targetUserId: userId, canChat: access.canChat });
    (app as any).io?.to(`org:${managed.actor.orgId}`).emit('conversation:access-changed', { conversationId: managed.conversation.id, userId, canChat: access.canChat });
    return access;
  });

  app.delete('/api/v1/conversations/:id/access/:userId', async (request, reply) => {
    const managed = await findManagedConversation(request, reply);
    if (!managed) return;
    const { userId } = request.params as { userId: string };
    const deleted = await prisma.conversationAccess.deleteMany({ where: { conversationId: managed.conversation.id, userId, orgId: managed.actor.orgId } });
    if (deleted.count === 0) return reply.status(404).send({ error: 'Quyền hội thoại không tồn tại' });
    await audit(request, 'conversation_access_revoked', managed.conversation.id, { targetUserId: userId });
    (app as any).io?.to(`org:${managed.actor.orgId}`).emit('conversation:access-changed', { conversationId: managed.conversation.id, userId, revoked: true });
    return { ok: true };
  });
}
