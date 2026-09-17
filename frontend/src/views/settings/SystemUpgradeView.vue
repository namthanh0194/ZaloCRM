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
    <v-alert v-if="status?.remoteError" class="mb-2" type="warning" variant="tonal">
      Không lấy được version GitHub: {{ status.remoteError }}
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
          <div class="version-row">Local: <strong>{{ status.localVersion }}</strong></div>
          <div class="version-row">GitHub: <strong>{{ status.remoteVersion }}</strong></div>
          <div class="mt-2">
            <ZBadge :variant="versionBadgeVariant">
              {{ versionLabel }}
            </ZBadge>
          </div>
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
              :disabled="!status.pendingCount || !status.databaseConnected"
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
                {{ m.status }}
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
  status: "applied" | "pending" | "failed" | "missing_file";
  finishedAt: string | null;
  appliedSteps: number;
  totalSteps: number;
};

type UpgradeStatus = {
  databaseConnected: boolean;
  localVersion: string;
  remoteVersion: string;
  remoteCommit: string | null;
  remoteError?: string | null;
  versionStatus: "up_to_date" | "remote_newer" | "local_newer" | "unknown";
  pendingCount: number;
  migrations: Migration[];
};

const status = ref<UpgradeStatus | null>(null);
const loading = ref(false);
const migrating = ref(false);
const error = ref("");

const versionLabel = computed(() => ({
  up_to_date: "Đang ở phiên bản mới nhất",
  remote_newer: "Có phiên bản mới hơn",
  local_newer: "Bản local đang đi trước GitHub",
  unknown: "Chưa rõ trạng thái",
})[status.value?.versionStatus || "unknown"]);

const versionBadgeVariant = computed<"success" | "warning" | "neutral">(() => {
  if (status.value?.versionStatus === "remote_newer") return "warning";
  if (status.value?.versionStatus === "up_to_date") return "success";
  return "neutral";
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
    status.value = result.status;
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
