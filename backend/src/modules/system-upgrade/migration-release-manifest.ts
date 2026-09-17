export interface ReleaseMigrationBaseline {
  version: string;
  lastMigration: string;
}

export interface BaselineMigrationFile {
  name: string;
  hasSqlFile: boolean;
}

export const RELEASE_MIGRATION_BASELINES: ReleaseMigrationBaseline[] = [
  { version: '3.4.0', lastMigration: '20260625010000_lead_notify_ack' },
  { version: '3.6.0', lastMigration: '20260915130000_add_ai_knowledge_documents' },
];

export function getReleaseMigrationBaseline(version: string): ReleaseMigrationBaseline | undefined {
  return RELEASE_MIGRATION_BASELINES.find((baseline) => baseline.version === version);
}

export function planBaselineMigrations(
  localMigrations: BaselineMigrationFile[],
  lastMigration: string,
  appliedMigrationNames: ReadonlySet<string>,
): string[] {
  return localMigrations
    .filter((migration) => migration.hasSqlFile)
    .map((migration) => migration.name)
    .filter((name) => name.localeCompare(lastMigration) <= 0 && !appliedMigrationNames.has(name))
    .sort((a, b) => a.localeCompare(b));
}
