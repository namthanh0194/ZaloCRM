import type { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../shared/database/prisma-client.js';

export interface ConversationAccessActor {
  id: string;
  orgId: string;
  role: string;
  permissionGroupName?: string | null;
}

export function isConversationAccessManager(actor: ConversationAccessActor): boolean {
  return actor.role === 'owner' || actor.role === 'admin' || actor.permissionGroupName === 'Sale Senior' || actor.permissionGroupName === 'Admin';
}

export function canManageConversationAccess(actor: ConversationAccessActor): boolean {
  return isConversationAccessManager(actor);
}

export function conversationVisibilityWhere(actor: ConversationAccessActor): Record<string, unknown> {
  if (isConversationAccessManager(actor)) return {};
  return { accesses: { some: { userId: actor.id } } };
}

export async function getConversationAccessActor(request: FastifyRequest): Promise<ConversationAccessActor> {
  const user = request.user!;
  if (user.role === 'owner' || user.role === 'admin') return user;
  const dbUser = await prisma.user.findFirst({
    where: { id: user.id, orgId: user.orgId },
    select: { id: true, orgId: true, role: true, permissionGroup: { select: { name: true } } },
  });
  return {
    id: user.id,
    orgId: user.orgId,
    role: dbUser?.role ?? user.role,
    permissionGroupName: dbUser?.permissionGroup?.name ?? null,
  };
}

export function requireConversationAccess(minimum: 'read' | 'chat' = 'read') {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user!;
    if (user.role === 'owner' || user.role === 'admin') return;
    const actor = await getConversationAccessActor(request);
    if (isConversationAccessManager(actor)) return;
    const { id } = request.params as { id?: string };
    if (!id) return reply.status(404).send({ error: 'Conversation not found' });
    const access = await prisma.conversationAccess.findFirst({
      where: { conversationId: id, userId: user.id, conversation: { orgId: user.orgId } },
      select: { canChat: true },
    });
    if (!access || (minimum === 'chat' && !access.canChat)) {
      return reply.status(403).send({ error: 'Bạn chưa được cấp quyền cho hội thoại này', code: 'CONVERSATION_ACCESS_FORBIDDEN' });
    }
  };
}
