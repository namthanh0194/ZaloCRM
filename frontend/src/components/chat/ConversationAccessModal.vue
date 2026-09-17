<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2026 Nguyễn Tiến Lộc -->
<template>
  <v-dialog :model-value="modelValue" max-width="540" persistent @update:model-value="emit('update:modelValue', $event)">
    <v-card class="conv-access-dialog">
      <v-card-title class="d-flex align-center justify-space-between py-3 px-4 border-b">
        <span class="text-subtitle-1 font-weight-bold">Phân quyền hội thoại</span>
        <v-btn icon="mdi-close" variant="text" size="small" @click="close" />
      </v-card-title>
      <v-card-text class="pa-4">
        <div class="mb-3 text-caption text-medium-emphasis">
          Chọn nhân viên Sale được phép xem và chat trong hội thoại này:
        </div>
        <div v-if="loading" class="py-4 text-center">
          <v-progress-circular indeterminate size="24" color="primary" />
        </div>
        <div v-else-if="users.length === 0" class="py-4 text-center text-caption text-medium-emphasis">
          Chưa có nhân viên nào phù hợp để phân quyền.
        </div>
        <v-list v-else lines="one" density="compact" class="user-access-list">
          <v-list-item
            v-for="u in users"
            :key="u.id"
            class="px-2 rounded-lg mb-1"
          >
            <template #prepend>
              <v-checkbox-btn
                :model-value="isUserAssigned(u.id)"
                :disabled="saving"
                @update:model-value="toggleUser(u.id)"
              />
            </template>
            <v-list-item-title class="text-body-2 font-weight-medium">
              {{ u.fullName || u.email }}
            </v-list-item-title>
            <v-list-item-subtitle class="text-caption">
              {{ u.email }} <span v-if="u.permissionGroup?.name">({{ u.permissionGroup.name }})</span>
            </v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </v-card-text>
      <v-card-actions class="px-4 py-3 border-t d-flex justify-end gap-2">
        <v-btn variant="text" :disabled="saving" @click="close">Đóng</v-btn>
        <v-btn color="primary" variant="flat" :loading="saving" @click="save">Lưu thay đổi</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { api } from '@/api/index';

const props = defineProps<{
  modelValue: boolean;
  conversationId?: string | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'saved'): void;
}>();

interface Assignee {
  id: string;
  email: string;
  fullName: string | null;
  permissionGroup?: { id: string; name: string } | null;
}

const loading = ref(false);
const saving = ref(false);
const users = ref<Assignee[]>([]);
const selectedUserIds = ref<string[]>([]);

function close() {
  emit('update:modelValue', false);
}

function isUserAssigned(userId: string): boolean {
  return selectedUserIds.value.includes(userId);
}

function toggleUser(userId: string) {
  if (selectedUserIds.value.includes(userId)) {
    selectedUserIds.value = selectedUserIds.value.filter((id) => id !== userId);
  } else {
    selectedUserIds.value.push(userId);
  }
}

async function loadData() {
  if (!props.conversationId) return;
  loading.value = true;
  try {
    const [uRes, aRes] = await Promise.all([
      api.get('/conversation-access/users'),
      api.get(`/conversations/${props.conversationId}/access`),
    ]);
    users.value = Array.isArray(uRes.data) ? uRes.data : (uRes.data?.users || []);
    const accessList = Array.isArray(aRes.data) ? aRes.data : [];
    selectedUserIds.value = accessList.map((a: { userId: string }) => a.userId);
  } catch (e) {
    console.error('Failed to load conversation access data', e);
  } finally {
    loading.value = false;
  }
}

async function save() {
  if (!props.conversationId) return;
  saving.value = true;
  try {
    const currentRes = await api.get(`/conversations/${props.conversationId}/access`);
    const currentList = Array.isArray(currentRes.data) ? currentRes.data : [];
    const currentIds = new Set<string>(currentList.map((a: { userId: string }) => a.userId));
    const nextIds = new Set(selectedUserIds.value);
    const toAdd = selectedUserIds.value.filter((id) => !currentIds.has(id));
    const toRemove = [...currentIds].filter((id) => !nextIds.has(id));
    await Promise.all([
      ...toAdd.map((id) => api.put(`/conversations/${props.conversationId}/access/${id}`, { canChat: true })),
      ...toRemove.map((id) => api.delete(`/conversations/${props.conversationId}/access/${id}`)),
    ]);
    emit('saved');
    close();
  } catch (e) {
    console.error('Failed to save conversation access', e);
  } finally {
    saving.value = false;
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      loadData();
    }
  },
);
</script>

<style scoped>
.conv-access-dialog {
  overflow: hidden;
}
.user-access-list {
  max-height: 320px;
  overflow-y: auto;
}
</style>
