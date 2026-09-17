import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { Client } from 'pg';
import {
  getReleaseMigrationBaseline,
  planBaselineMigrations,
} from '../src/modules/system-upgrade/migration-release-manifest.js';

const execFileAsync = promisify(execFile);
const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDir = path.join(backendRoot, 'prisma', 'migrations');

function argument(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

function printHelp(): void {
  console.log(`Usage:
  npm run db:baseline -- --version=3.4.0
  npm run db:baseline -- --version=3.4.0 --apply --confirm=BASELINE_3.4.0

The first command is dry-run only. The apply command records historical migrations
with Prisma migrate resolve; it never executes their migration.sql files.`);
}

function readLocalMigrations() {
  return fs.readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      name: entry.name,
      hasSqlFile: fs.existsSync(path.join(migrationsDir, entry.name, 'migration.sql')),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function main(): Promise<void> {
  if (process.argv.includes('--help')) {
    printHelp();
    return;
  }

  const version = argument('version');
  if (!version) throw new Error('Thiếu --version. Ví dụ: --version=3.4.0');

  const baseline = getReleaseMigrationBaseline(version);
  if (!baseline) throw new Error(`Không có release baseline được duyệt cho version ${version}.`);

  const localMigrations = readLocalMigrations();
  const cutoff = localMigrations.find((migration) => migration.name === baseline.lastMigration);
  if (!cutoff?.hasSqlFile) {
    throw new Error(`Không tìm thấy migration cutoff hợp lệ: ${baseline.lastMigration}`);
  }

  const missingSql = localMigrations
    .filter((migration) => migration.name.localeCompare(baseline.lastMigration) <= 0 && !migration.hasSqlFile)
    .map((migration) => migration.name);
  if (missingSql.length) {
    throw new Error(`Không thể baseline vì migration thiếu migration.sql: ${missingSql.join(', ')}`);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL chưa được cấu hình.');

  const client = new Client({ connectionString });
  await client.connect();

  try {
    const schemaCheck = await client.query<{
      organizations: boolean;
      users: boolean;
      conversations: boolean;
      messages: boolean;
      customerLists: boolean;
      leadNotifyAcks: boolean;
    }>(`
      SELECT
        to_regclass('public.organizations') IS NOT NULL AS "organizations",
        to_regclass('public.users') IS NOT NULL AS "users",
        to_regclass('public.conversations') IS NOT NULL AS "conversations",
        to_regclass('public.messages') IS NOT NULL AS "messages",
        to_regclass('public.customer_lists') IS NOT NULL AS "customerLists",
        to_regclass('public.lead_notify_acks') IS NOT NULL AS "leadNotifyAcks"
    `);
    const schema = schemaCheck.rows[0];
    const missingTables = Object.entries(schema ?? {})
      .filter(([, exists]) => !exists)
      .map(([table]) => table);
    if (missingTables.length) {
      throw new Error(`Schema production chưa đạt baseline ${version}; thiếu bảng kiểm chứng: ${missingTables.join(', ')}`);
    }

    const requiredColumns = [
      'lead_notify_ack_enabled',
      'lead_notify_ack_interval_sec',
      'lead_notify_ack_max_attempts',
    ];
    const columnResult = await client.query<{ column_name: string }>(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'customer_lists'
        AND column_name = ANY($1::text[])
    `, [requiredColumns]);
    const existingColumns = new Set(columnResult.rows.map((row) => row.column_name));
    const missingColumns = requiredColumns.filter((column) => !existingColumns.has(column));
    if (missingColumns.length) {
      throw new Error(`Schema production chưa đạt baseline ${version}; thiếu cột: ${missingColumns.join(', ')}`);
    }

    const historyProbe = await client.query<{ historyTable: string | null }>(`
      SELECT to_regclass('public._prisma_migrations')::text AS "historyTable"
    `);
    const appliedNames = new Set<string>();

    if (historyProbe.rows[0]?.historyTable) {
      const history = await client.query<{
        migration_name: string;
        finished_at: Date | null;
        rolled_back_at: Date | null;
      }>(`
        SELECT migration_name, finished_at, rolled_back_at
        FROM public._prisma_migrations
      `);
      const broken = history.rows.filter((row) => row.rolled_back_at || !row.finished_at);
      if (broken.length) {
        throw new Error(`Lịch sử migration có bản ghi failed/rolled back: ${broken.map((row) => row.migration_name).join(', ')}`);
      }
      history.rows.forEach((row) => appliedNames.add(row.migration_name));
    }

    const plan = planBaselineMigrations(localMigrations, baseline.lastMigration, appliedNames);
    console.log(`Release baseline: ${baseline.version}`);
    console.log(`Migration cutoff: ${baseline.lastMigration}`);
    console.log(`Đã có trong lịch sử: ${appliedNames.size}`);
    console.log(`Sẽ đánh dấu applied: ${plan.length}`);
    plan.forEach((migration) => console.log(`  - ${migration}`));

    if (!process.argv.includes('--apply')) {
      console.log('\nDRY-RUN: chưa thay đổi database.');
      return;
    }

    const expectedConfirmation = `BASELINE_${version}`;
    if (argument('confirm') !== expectedConfirmation) {
      throw new Error(`Để apply, cần thêm --confirm=${expectedConfirmation}`);
    }

    await client.end();
    const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    for (const migration of plan) {
      console.log(`Marking applied: ${migration}`);
      await execFileAsync(npx, [
        'prisma',
        'migrate',
        'resolve',
        '--applied',
        migration,
        '--schema',
        'prisma/schema.prisma',
      ], {
        cwd: backendRoot,
        env: process.env,
      });
    }
    console.log(`Baseline ${version} hoàn tất. Chạy prisma migrate status để kiểm tra lại.`);
    return;
  } finally {
    if (!client.ended) await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
