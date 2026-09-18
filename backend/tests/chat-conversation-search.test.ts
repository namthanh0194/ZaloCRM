/**
 * Verifies conversation search covers the fields promised by the inbox UI.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { mockIO, mockPrisma, mockUser } from './test-helpers.js';

const prismaMock = mockPrisma();

vi.mock('../src/shared/database/prisma-client.js', () => ({ prisma: prismaMock }));
vi.mock('../src/modules/auth/auth-middleware.js', () => ({
  authMiddleware: async (req: any) => { req.user = mockUser(); },
}));
vi.mock('../src/modules/rbac/rbac-middleware.js', () => ({
  requireGrant: () => async () => {},
}));
vi.mock('../src/modules/zalo/zalo-access-middleware.js', () => ({
  requireZaloAccess: () => async () => {},
}));
vi.mock('../src/modules/zalo/zalo-scope.js', () => ({
  DISPLAYABLE_NICK_WHERE: { archivedAt: null },
  getZaloScope: vi.fn().mockResolvedValue({ isOrgAdmin: true, displayableIds: [] }),
}));
vi.mock('../src/modules/zalo/zalo-pool.js', () => ({ zaloPool: { getInstance: vi.fn() } }));
vi.mock('../src/modules/zalo/zalo-rate-limiter.js', () => ({ zaloRateLimiter: {} }));

const { chatRoutes } = await import('../src/modules/chat/chat-routes.js');

function buildApp(): FastifyInstance {
  const app = Fastify({ logger: false });
  app.decorate('io', mockIO());
  app.register(chatRoutes);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.conversation.findMany.mockResolvedValue([]);
  prismaMock.conversation.count.mockResolvedValue(0);
});

describe('GET /api/v1/conversations search', () => {
  it('searches matching contact fields, group names, and non-deleted message content', async () => {
    const app = buildApp();

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/conversations?search=invoice',
    });

    expect(res.statusCode).toBe(200);
    const where = prismaMock.conversation.findMany.mock.calls[0][0].where;
    expect(where.OR).toEqual(expect.arrayContaining([
      {
        contact: {
          OR: [
            { fullName: { contains: 'invoice', mode: 'insensitive' } },
            { crmName: { contains: 'invoice', mode: 'insensitive' } },
            { phone: { contains: 'invoice' } },
          ],
        },
      },
      { groupName: { contains: 'invoice', mode: 'insensitive' } },
      { messages: { some: { content: { contains: 'invoice', mode: 'insensitive' }, isDeleted: false } } },
    ]));
  });
});
