import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { prisma } from '../../shared/database/prisma-client.js';
import { runSystemQuery } from '../../shared/tenant/tenant-context.js';
import { logger } from '../../shared/utils/logger.js';
import {
  RELEASE_MIGRATION_BASELINES,
  getReleaseMigrationBaseline,
} from './migration-release-manifest.js';

export {
  getReleaseMigrationBaseline,
  planBaselineMigrations,
} from './migration-release-manifest.js';

const execAsync = promisify(exec);

export interface LocalMigrationInfo {
  name: string;
  hasSqlFile: boolean;
}

export interface AppliedMigrationRow {
  migration_name: string;
  finished_at: Date | null;
  rolled_back_at: Date | null;
}

export interface MigrationStatusItem {
  name: string;
  status: 'applied' | 'pending' | 'failed' | 'missing_file' | 'unknown';
  finishedAt?: string | null;
}

export type MigrationHistoryStatus = 'available' | 'fresh' | 'baseline_required' | 'unreadable';

export interface ClassificationResult {
  migrations: MigrationStatusItem[];
  canMigrate: boolean;
  pendingCount: number;
  hasIntegrityIssue: boolean;
}

export function resolveRunningCommit(): string | null {
  const raw =
    process.env.SOURCE_COMMIT ||
    process.env.COOLIFY_COMMIT_SHA ||
    process.env.GIT_COMMIT ||
    process.env.COMMIT_SHA ||
    null;

  if (!raw) return null;
  const trimmed = raw.trim();
  return trimmed.length >= 7 ? trimmed.slice(0, 8) : trimmed;
}

export function compareVersions(local: string, remote: string): 'up_to_date' | 'remote_newer' | 'local_newer' {
  const pLocal = local.split('.').map((x) => parseInt(x, 10) || 0);
  const pRemote = remote.split('.').map((x) => parseInt(x, 10) || 0);
  const maxLen = Math.max(pLocal.length, pRemote.length);

  for (let i = 0; i < maxLen; i++) {
    const l = pLocal[i] ?? 0;
    const r = pRemote[i] ?? 0;
    if (l < r) return 'remote_newer';
    if (l > r) return 'local_newer';
  }
  return 'up_to_date';
}

export function classifyUnavailableMigrations(localMigrations: LocalMigrationInfo[]): ClassificationResult {
  return {
    migrations: localMigrations.map((migration) => ({ name: migration.name, status: 'unknown' })),
    pendingCount: 0,
    hasIntegrityIssue: false,
    canMigrate: false,
  };
}

export function classifyMigrations(
  localMigrations: LocalMigrationInfo[],
  appliedRows: AppliedMigrationRow[],
): ClassificationResult {
  const appliedMap = new Map<string, AppliedMigrationRow>();
  for (const row of appliedRows) {
    appliedMap.set(row.migration_name, row);
  }

  let pendingCount = 0;
  let hasIntegrityIssue = false;

  const localNames = new Set(localMigrations.map((migration) => migration.name));
  const migrations: MigrationStatusItem[] = localMigrations.map((m) => {
    if (!m.hasSqlFile) {
      hasIntegrityIssue = true;
      return { name: m.name, status: 'missing_file' };
    }

    const applied = appliedMap.get(m.name);
    if (!applied) {
      pendingCount++;
      return { name: m.name, status: 'pending' };
    }

    if (applied.rolled_back_at || !applied.finished_at) {
      hasIntegrityIssue = true;
      return { name: m.name, status: 'failed', finishedAt: applied.finished_at?.toISOString() ?? null };
    }

    return {
      name: m.name,
      status: 'applied',
      finishedAt: applied.finished_at.toISOString(),
    };
  });

  for (const applied of appliedRows) {
    if (!localNames.has(applied.migration_name)) {
      hasIntegrityIssue = true;
      migrations.push({
        name: applied.migration_name,
        status: 'missing_file',
        finishedAt: applied.finished_at?.toISOString() ?? null,
      });
    }
  }

  migrations.sort((a, b) => a.name.localeCompare(b.name));

  return {
    migrations,
    pendingCount,
    hasIntegrityIssue,
    canMigrate: !hasIntegrityIssue && pendingCount > 0,
  };
}

let isMigrating = false;

export class SystemUpgradeService {
  static getLocalVersion(): string {
    try {
      const pkgPath = path.resolve(process.cwd(), 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        return pkg.version || 'unknown';
      }
    } catch (e) {
      logger.warn('[system-upgrade] cannot read local package.json: ' + String(e));
    }
    return 'unknown';
  }

  static async fetchRemoteVersion(): Promise<{ version: string; error?: string }> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(
        'https://raw.githubusercontent.com/namthanh0194/ZaloCRM/main/backend/package.json',
        { signal: controller.signal },
      );
      clearTimeout(timeout);
      if (!res.ok) {
        return { version: 'unknown', error: `GitHub HTTP ${res.status}` };
      }
      const data = (await res.json()) as { version?: string };
      return { version: data.version || 'unknown' };
    } catch (e: any) {
      return { version: 'unknown', error: e.message || 'Cannot reach GitHub' };
    }
  }

  static getLocalMigrationFiles(): LocalMigrationInfo[] {
    const migrationsDir = path.resolve(process.cwd(), 'prisma/migrations');
    if (!fs.existsSync(migrationsDir)) return [];

    const entries = fs.readdirSync(migrationsDir, { withFileTypes: true });
    const result: LocalMigrationInfo[] = [];

    for (const ent of entries) {
      if (!ent.isDirectory()) continue;
      const sqlFile = path.join(migrationsDir, ent.name, 'migration.sql');
      result.push({
        name: ent.name,
        hasSqlFile: fs.existsSync(sqlFile),
      });
    }

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }

  static async getMigrationStatus() {
    const localMigrations = this.getLocalMigrationFiles();
    let appliedRows: AppliedMigrationRow[] = [];
    let dbConnected = false;
    let migrationHistoryStatus: MigrationHistoryStatus = 'unreadable';
    let migrationHistoryError: string | null = null;

    try {
      await runSystemQuery(() => prisma.$queryRaw`SELECT 1`);
      dbConnected = true;
    } catch (e) {
      logger.warn('[system-upgrade] database health check failed: ' + String(e));
    }

    if (dbConnected) {
      try {
        const [probe] = await runSystemQuery(() => prisma.$queryRaw<{
          migrationHistoryTable: string | null;
          applicationSchemaTable: string | null;
        }[]>`
          SELECT
            to_regclass('public._prisma_migrations')::text AS "migrationHistoryTable",
            to_regclass('public.organizations')::text AS "applicationSchemaTable"
        `);

        if (!probe?.migrationHistoryTable) {
          migrationHistoryStatus = probe?.applicationSchemaTable ? 'baseline_required' : 'fresh';
        } else {
          appliedRows = await runSystemQuery(() => prisma.$queryRaw<AppliedMigrationRow[]>`
            SELECT migration_name, finished_at, rolled_back_at
            FROM public._prisma_migrations
            ORDER BY started_at ASC
          `);
          migrationHistoryStatus = appliedRows.length === 0 && probe.applicationSchemaTable
            ? 'baseline_required'
            : 'available';
        }
      } catch (e) {
        logger.warn('[system-upgrade] error reading Prisma migration history: ' + String(e));
        migrationHistoryError = 'Không đọc được lịch sử Prisma migration.';
      }
    }

    const classification = migrationHistoryStatus === 'available' || migrationHistoryStatus === 'fresh'
      ? classifyMigrations(localMigrations, appliedRows)
      : classifyUnavailableMigrations(localMigrations);
    const localVersion = this.getLocalVersion();
    const currentCommit = resolveRunningCommit();

    return {
      databaseConnected: dbConnected,
      migrationHistoryStatus,
      migrationHistoryError,
      releaseMigrationBaselines: RELEASE_MIGRATION_BASELINES,
      currentReleaseBaseline: getReleaseMigrationBaseline(localVersion) ?? null,
      localVersion,
      currentCommit,
      deploymentChannel: 'production' as const,
      ...classification,
      isMigrating,
    };
  }

  static async runMigrations(): Promise<{ success: boolean; output: string; error?: string }> {
    if (isMigrating) {
      return { success: false, output: '', error: 'Một tiến trình migration khác đang chạy' };
    }

    const status = await this.getMigrationStatus();
    if (!status.databaseConnected) {
      return { success: false, output: '', error: 'Không thể kết nối cơ sở dữ liệu' };
    }
    if (status.hasIntegrityIssue) {
      return { success: false, output: '', error: 'Phát hiện thư mục migration bị thiếu file hoặc lỗi toàn vẹn' };
    }
    if (status.migrationHistoryStatus !== 'available' && status.migrationHistoryStatus !== 'fresh') {
      return {
        success: false,
        output: '',
        error: status.migrationHistoryStatus === 'baseline_required'
          ? 'Cần baseline lịch sử Prisma migration trước khi chạy migration mới.'
          : 'Không thể xác minh lịch sử Prisma migration.',
      };
    }
    if (status.pendingCount === 0) {
      return { success: true, output: 'Cơ sở dữ liệu đã ở trạng thái mới nhất, không có migration cần chạy.' };
    }
    if (!status.canMigrate) {
      return { success: false, output: '', error: 'Không thể chạy migration trong trạng thái hiện tại.' };
    }

    isMigrating = true;
    try {
      const { stdout, stderr } = await execAsync('npx prisma migrate deploy', {
        cwd: process.cwd(),
        env: process.env,
      });
      return { success: true, output: stdout + (stderr ? '\n' + stderr : '') };
    } catch (err: any) {
      logger.error('[system-upgrade] migrate deploy error: ' + String(err));
      return {
        success: false,
        output: err.stdout || '',
        error: err.message || 'Lỗi trong quá trình chạy prisma migrate deploy',
      };
    } finally {
      isMigrating = false;
    }
  }
}
