import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/shared/database/prisma-client.js', () => ({
  prisma: { $queryRaw: vi.fn() },
}));

const {
  classifyUnavailableMigrations,
  getReleaseMigrationBaseline,
  planBaselineMigrations,
} = await import('../src/modules/system-upgrade/system-upgrade-service.js');

describe('system upgrade migration history safeguards', () => {
  const localMigrations = [
    { name: '20260625010000_lead_notify_ack', hasSqlFile: true },
    { name: '20260626010000_add_conversation_access', hasSqlFile: true },
    { name: '20260915120000_add_ai_providers', hasSqlFile: true },
    { name: '20260915130000_add_ai_knowledge_documents', hasSqlFile: true },
  ];

  it('does not label every local migration as pending when Prisma history is unavailable', () => {
    expect(classifyUnavailableMigrations(localMigrations)).toEqual({
      migrations: localMigrations.map((migration) => ({ name: migration.name, status: 'unknown' })),
      pendingCount: 0,
      canMigrate: false,
      hasIntegrityIssue: false,
    });
  });

  it('maps version 3.4.0 to the approved legacy migration cutoff', () => {
    expect(getReleaseMigrationBaseline('3.4.0')).toEqual({
      version: '3.4.0',
      lastMigration: '20260625010000_lead_notify_ack',
    });
  });

  it('plans only unresolved migrations through the selected release cutoff', () => {
    expect(planBaselineMigrations(
      localMigrations,
      '20260625010000_lead_notify_ack',
      new Set(['20260625010000_lead_notify_ack']),
    )).toEqual([]);

    expect(planBaselineMigrations(localMigrations, '20260625010000_lead_notify_ack', new Set()))
      .toEqual(['20260625010000_lead_notify_ack']);
  });
});
