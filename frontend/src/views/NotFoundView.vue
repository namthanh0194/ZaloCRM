<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2026 Nguyễn Tiến Lộc -->
<template>
  <PageShell width="narrow">
    <EmptyState
      title="404 — Không tìm thấy trang"
      description="Đường dẫn bạn truy cập không tồn tại hoặc đã được di chuyển."
    >
      <template #icon>
        <v-icon icon="mdi-alert-circle-outline" size="64" color="primary" />
      </template>
      <template #action>
        <v-btn to="/" color="primary">Về trang chủ</v-btn>
      </template>
    </EmptyState>
  </PageShell>
</template>

<script setup lang="ts">
import { EmptyState, PageShell } from '@/design-system';
</script>
