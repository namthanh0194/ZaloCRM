<template>
  <PageShell width="wide">
    <PageHeader
      title="Nâng cấp hệ thống"
      description="Kiểm tra phiên bản và chạy database migration an toàn."
    >
      <template #actions>
        <ZButton
          variant="outline"
          size="md"
          :loading="loading"
          @click="loadStatus"
        >
          <template #prepend>
            <v-icon size="16">mdi-refresh</v-icon>
          </template>
          Kiểm tra lại
        </ZButton>
      </template>
    </PageHeader>

    <v-alert v-if="error" class="mb-2" type="error" variant="tonal">{{ error }}</v-alert>
    <v-alert v-if="migrationHistoryAlert" class="mb-2" :type="migrationHistoryAlert.type" variant="tonal">
      {{ migrationHistoryAlert.message }}
      <template v-if="migrationHistoryAlert.command">
        <div class="mt-2 font-mono text-caption">{{ migrationHistoryAlert.command }}</div>
      </template>
    </v-alert>

    <div v-if="status" class="status-grid">
      <ZCard>
        <template #header>
          <div class="card-header-row">
            <v-icon color="success" size="20">mdi-database-check-outline</v-icon>
            <span class="card-title">Database</span>
          </div>
        </template>
        <div class="card-body-content">
          <ZBadge :variant="status.databaseConnected ? 'success' : 'danger'" :dot="true">
            {{ status.databaseConnected ? "Đã kết nối" : "Mất kết nối" }}
          </ZBadge>
          <div class="card-subtext">{{ status.migrations.length }} migration được phát hiện</div>
        </div>
      </ZCard>

      <ZCard>
        <template #header>
          <div class="card-header-row">
            <v-icon color="primary" size="20">mdi-package-variant-closed</v-icon>
            <span class="card-title">Phiên bản</span>
          </div>
        </template>
        <div class="card-body-content">
          <div class="version-row">Phiên bản: <strong>{{ status.localVersion }}</strong></div>
          <div class="version-row">Git commit: <strong>{{ status.currentCommit || "N/A" }}</strong></div>
          <div class="mt-2">
            <ZBadge variant="success">
              Đã đồng bộ
            </ZBadge>
          </div>
          <div class="card-subtext">Kênh production độc lập, không phụ thuộc kết nối public GitHub.</div>
        </div>
      </ZCard>

      <ZCard>
        <template #header>
          <div class="card-header-row">
            <v-icon color="warning" size="20">mdi-database-arrow-up-outline</v-icon>
            <span class="card-title">Migration</span>
          </div>
        </template>
        <div class="card-body-content">
          <div class="version-row"><strong>{{ status.pendingCount }}</strong> migration đang chờ chạy</div>
          <div class="mt-3">
            <ZButton
              variant="primary"
              size="sm"
              :disabled="!status.canMigrate"
              :loading="migrating"
              @click="runMigrations"
            >
              Chạy migration
            </ZButton>
          </div>
        </div>
      </ZCard>
    </div>

    <ZCard v-if="status" padding="none" class="mt-4">
      <template #header>
        <span class="card-title">Chi tiết migration</span>
      </template>
      <v-table density="compact">
        <thead>
          <tr>
            <th>Tên migration</th>
            <th>Trạng thái</th>
            <th>Hoàn tất lúc</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in status.migrations" :key="m.name">
            <td class="font-mono text-caption">{{ m.name }}</td>
            <td>
              <ZBadge :variant="migrationBadgeVariant(m.status)" size="sm">
                {{ migrationStatusLabel(m.status) }}
              </ZBadge>
            </td>
            <td class="text-caption text-medium-emphasis">
              {{ m.finishedAt ? new Date(m.finishedAt).toLocaleString() : "Chưa chạy" }}
            </td>
          </tr>
        </tbody>
      </v-table>
    </ZCard>
  </PageShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { api } from "@/api";
import { PageShell, PageHeader, ZButton, ZBadge, ZCard } from "@/design-system";

type Migration = {
  name: string;
  status: "applied" | "pending" | "failed" | "missing_file" | "unknown";
  finishedAt: string | null;
  appliedSteps: number;
  totalSteps: number;
};

type ReleaseMigrationBaseline = {
  version: string;
  lastMigration: string;
};

type UpgradeStatus = {
  databaseConnected: boolean;
  migrationHistoryStatus: "available" | "fresh" | "baseline_required" | "unreadable";
  migrationHistoryError: string | null;
  canMigrate: boolean;
  localVersion: string;
  currentCommit: string | null;
  deploymentChannel: "production";
  pendingCount: number;
  migrations: Migration[];
  releaseMigrationBaselines: ReleaseMigrationBaseline[];
  currentReleaseBaseline: ReleaseMigrationBaseline | null;
};

const status = ref<UpgradeStatus | null>(null);
const loading = ref(false);
const migrating = ref(false);
const error = ref("");

const migrationHistoryAlert = computed(() => {
  if (status.value?.migrationHistoryStatus === "baseline_required") {
    const baseline = status.value.releaseMigrationBaselines.find(({ version }) => version === "3.4.0");
    return {
      type: "warning" as const,
      message: "Database đã kết nối nhưng lịch sử Prisma migration thiếu hoặc trống. Không chạy migration trước khi baseline an toàn.",
      command: baseline ? `cd backend && npm run db:baseline -- --version=${baseline.version}` : null,
    };
  }

  if (status.value?.migrationHistoryStatus === "unreadable") {
    return {
      type: "error" as const,
      message: status.value.migrationHistoryError || "Không đọc được lịch sử Prisma migration. Migration đang bị khóa để bảo vệ dữ liệu.",
      command: null,
    };
  }

  if (status.value?.migrationHistoryStatus === "fresh") {
    return {
      type: "info" as const,
      message: "Database chưa có schema ứng dụng. Migration có thể khởi tạo một database mới.",
      command: null,
    };
  }

  return null;
});

async function loadStatus() {
  loading.value = true;
  error.value = "";
  try {
    status.value = (await api.get("/system/upgrade/status")).data;
  } catch (err: any) {
    error.value = err?.response?.data?.error || err.message || "Không tải được trạng thái nâng cấp";
  } finally {
    loading.value = false;
  }
}

async function runMigrations() {
  migrating.value = true;
  error.value = "";
  try {
    const result = (await api.post("/system/upgrade/migrate")).data;
    if (result.status) status.value = result.status;
    if (!result.success) error.value = result.error || "Chạy migration thất bại";
  } catch (err: any) {
    error.value = err?.response?.data?.error || err.message || "Chạy migration thất bại";
  } finally {
    migrating.value = false;
  }
}

function migrationBadgeVariant(value: Migration["status"]): "success" | "warning" | "danger" | "neutral" {
  if (value === "applied") return "success";
  if (value === "pending") return "warning";
  if (value === "failed") return "danger";
  return "neutral";
}

function migrationStatusLabel(value: Migration["status"]) {
  return {
    applied: "Đã áp dụng",
    pending: "Chờ chạy",
    failed: "Lỗi",
    missing_file: "Thiếu file",
    unknown: "Chưa xác minh",
  }[value];
}

onMounted(loadStatus);
</script>

<style scoped>
.status-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4, 16px);
}
@media (min-width: 768px) {
  .status-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.card-header-row {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
}

.card-title {
  font-size: var(--font-size-md, 14px);
  font-weight: var(--font-weight-semibold, 600);
  color: var(--color-text, #141a24);
}

.card-body-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-2, 8px);
}

.card-subtext {
  font-size: var(--font-size-xs, 12px);
  color: var(--color-text-muted, #6b7488);
}

.version-row {
  font-size: var(--font-size-sm, 13px);
  color: var(--color-text-secondary, #475066);
}

.font-mono {
  font-family: var(--font-family-mono);
}
</style>
