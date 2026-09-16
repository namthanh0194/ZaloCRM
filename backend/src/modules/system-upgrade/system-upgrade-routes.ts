import type { FastifyInstance, FastifyRequest } from 'fastify';
import { prisma } from '../../shared/database/prisma-client.js';
import { authMiddleware, requireActiveUser } from '../auth/auth-middleware.js';
import { requireRole } from '../auth/role-middleware.js';
import { SystemUpgradeService } from './system-upgrade-service.js';

async function writeUpgradeAudit(request: FastifyRequest, action: string, details: Record<string, unknown>) {
  const user = request.user!;
  try {
    await prisma.activityLog.create({
      data: {
        orgId: user.orgId,
        userId: user.id,
        actorType: 'user',
        category: 'admin',
        action,
        entityType: 'system_upgrade',
        entityId: null,
        details: details as any,
      },
    });
  } catch {
    // Audit failure must not hide the migration result.
  }
}

export async function systemUpgradeRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);
  app.addHook('preHandler', requireActiveUser);
  app.addHook('preHandler', requireRole('owner'));

  app.get('/api/v1/system/upgrade/status', async () => SystemUpgradeService.getMigrationStatus());

  app.post('/api/v1/system/upgrade/migrate', async (request) => {
    const result = await SystemUpgradeService.runMigrations();
    await writeUpgradeAudit(request, result.success ? 'system_migration_success' : 'system_migration_failed', {
      success: result.success,
      error: result.error ?? null,
      output: result.output.slice(-4000),
    });
    return result;
  });
}
