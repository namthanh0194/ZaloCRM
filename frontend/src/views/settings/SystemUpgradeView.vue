<template>
  <v-container fluid>
    <div class="d-flex align-center justify-space-between mb-6">
      <div><h1 class="text-h5 font-weight-bold">Nâng cấp hệ thống</h1><p class="text-body-2 text-medium-emphasis mt-1">Kiểm tra phiên bản và chạy database migration an toàn.</p></div>
      <v-btn :loading="loading" prepend-icon="mdi-refresh" variant="tonal" @click="loadStatus">Kiểm tra lại</v-btn>
    </div>
    <v-alert v-if="error" class="mb-4" type="error" variant="tonal">{{ error }}</v-alert>
    <v-alert v-if="status?.remoteError" class="mb-4" type="warning" variant="tonal">Không lấy được version GitHub: {{ status.remoteError }}</v-alert>
    <v-row v-if="status">
      <v-col cols="12" md="4"><v-card height="100%"><v-card-item><template #prepend><v-icon color="success">mdi-database-check-outline</v-icon></template><v-card-title>Database</v-card-title></v-card-item><v-card-text><v-chip :color="status.databaseConnected ? 'success' : 'error'" size="small">{{ status.databaseConnected ? 'Đã kết nối' : 'Mất kết nối' }}</v-chip><div class="text-caption mt-3">{{ status.migrations.length }} migration được phát hiện</div></v-card-text></v-card></v-col>
      <v-col cols="12" md="4"><v-card height="100%"><v-card-item><template #prepend><v-icon color="primary">mdi-package-variant-closed</v-icon></template><v-card-title>Phiên bản</v-card-title></v-card-item><v-card-text><div>Local: <strong>{{ status.localVersion }}</strong></div><div>GitHub: <strong>{{ status.remoteVersion }}</strong></div><v-chip class="mt-3" :color="versionColor" size="small">{{ versionLabel }}</v-chip></v-card-text></v-card></v-col>
      <v-col cols="12" md="4"><v-card height="100%"><v-card-item><template #prepend><v-icon color="warning">mdi-database-arrow-up-outline</v-icon></template><v-card-title>Migration</v-card-title></v-card-item><v-card-text><div>{{ status.pendingCount }} migration đang chờ</div><v-btn class="mt-4" color="primary" :disabled="!status.canMigrate || status.isMigrating" :loading="migrating" @click="runMigrations">Chạy migration</v-btn></v-card-text></v-card></v-col>
    </v-row>
    <v-card v-if="status" class="mt-6"><v-card-title>Chi tiết migration</v-card-title><v-table density="comfortable"><thead><tr><th>Tên migration</th><th>Trạng thái</th><th>Thời gian hoàn tất</th></tr></thead><tbody><tr v-for="migration in status.migrations" :key="migration.name"><td class="text-caption">{{ migration.name }}</td><td><v-chip :color="migrationColor(migration.status)" size="small">{{ migrationLabel(migration.status) }}</v-chip></td><td class="text-caption">{{ migration.finishedAt ? formatDate(migration.finishedAt) : '—' }}</td></tr></tbody></v-table><v-alert v-if="status.hasIntegrityIssue" class="ma-4" type="error" variant="tonal">Không thể chạy migration vì lịch sử migration không toàn vẹn hoặc đang thiếu file migration.sql.</v-alert></v-card>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { api } from '@/api';
type Migration = { name: string; status: 'applied' | 'pending' | 'failed' | 'missing_file'; finishedAt?: string | null };
type UpgradeStatus = { databaseConnected: boolean; localVersion: string; remoteVersion: string; remoteError?: string; versionStatus: string; migrations: Migration[]; canMigrate: boolean; pendingCount: number; hasIntegrityIssue: boolean; isMigrating: boolean };
const status = ref<UpgradeStatus | null>(null); const loading = ref(false); const migrating = ref(false); const error = ref('');
const versionLabel = computed(() => ({ up_to_date: 'Đang ở phiên bản mới nhất', remote_newer: 'Có phiên bản mới', local_newer: 'Local mới hơn' }[status.value?.versionStatus ?? ''] ?? 'Chưa xác định'));
const versionColor = computed(() => status.value?.versionStatus === 'remote_newer' ? 'warning' : status.value?.versionStatus === 'up_to_date' ? 'success' : 'info');
async function loadStatus() { loading.value = true; error.value = ''; try { status.value = (await api.get('/system/upgrade/status')).data; } catch (e: any) { error.value = e?.response?.data?.error || 'Không thể tải trạng thái nâng cấp.'; } finally { loading.value = false; } }
async function runMigrations() { migrating.value = true; error.value = ''; try { const result = (await api.post('/system/upgrade/migrate')).data; if (!result.success) error.value = result.error || 'Migration thất bại.'; await loadStatus(); } catch (e: any) { error.value = e?.response?.data?.error || 'Không thể chạy migration.'; } finally { migrating.value = false; } }
function migrationColor(value: Migration['status']) { return { applied: 'success', pending: 'warning', failed: 'error', missing_file: 'error' }[value]; }
function migrationLabel(value: Migration['status']) { return { applied: 'Đã chạy', pending: 'Chờ chạy', failed: 'Lỗi', missing_file: 'Thiếu file' }[value]; }
function formatDate(value: string) { return new Date(value).toLocaleString('vi-VN'); }
onMounted(loadStatus);
</script>
