<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2026 Nguyễn Tiến Lộc -->
<template>
  <v-app>
    <OfflineIndicator />

    <!-- Slim mobile app bar -->
    <v-app-bar density="compact" flat class="mobile-app-bar text-white">
      <RouterLink to="/" class="hs-brand ml-2" :title="brandName + ' CRM'">
        <span class="hs-bbox"><img :src="brandLogo" :alt="brandName" @error="onLogoError" /></span>
        <span class="hs-bwm"><span class="hs-b1">{{ brandName }}</span><span class="hs-b2">CRM</span></span>
      </RouterLink>

      <v-spacer />

      <NotificationBell />
      <v-btn
        icon
        size="small"
        variant="text"
        :title="isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'"
        :aria-label="isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'"
        @click="toggleTheme"
      >
        <v-icon size="20">{{ isDark ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
      </v-btn>
      <v-btn icon size="small" variant="text" @click="logout">
        <v-icon size="20">mdi-logout</v-icon>
      </v-btn>
    </v-app-bar>

    <!-- Main content with padding for bottom nav -->
    <v-main>
      <div style="padding-bottom: 72px;">
        <slot />
      </div>
    </v-main>

    <BottomNav />
  </v-app>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { RouterLink, useRouter } from 'vue-router';
import { fetchPublicBranding } from '@/api/public-branding';
import { useAppTheme } from '@/composables/app-theme';
import NotificationBell from '@/components/NotificationBell.vue';
import BottomNav from '@/components/BottomNav.vue';
import OfflineIndicator from '@/components/OfflineIndicator.vue';

const authStore = useAuthStore();
const router = useRouter();
const { isDark, toggleTheme } = useAppTheme();

const DEFAULT_LOGO = '/brand/hs-monogram.png';
const brandLogo = ref(DEFAULT_LOGO);
const brandName = ref('Repu Digital');

function onLogoError() {
  if (brandLogo.value !== DEFAULT_LOGO) brandLogo.value = DEFAULT_LOGO;
}

onMounted(async () => {
  try {
    const branding = await fetchPublicBranding();
    if (branding) {
      brandLogo.value = branding.logoUrl || DEFAULT_LOGO;
      brandName.value = branding.name || 'Repu Digital';
    }
  } catch {
    // Giữ thương hiệu mặc định khi API chưa sẵn sàng.
  }
});

function logout() {
  authStore.logout();
  router.push('/login');
}
</script>

<style scoped>
.mobile-app-bar {
  background: var(--color-shell-bg) !important;
}

.hs-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
  text-decoration: none;
}

.hs-bbox {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}

.hs-bbox img {
  width: 28px;
  height: 28px;
  object-fit: contain;
  display: block;
}

.hs-bwm {
  display: flex;
  flex-direction: column;
  line-height: 1.08;
  white-space: nowrap;
}

.hs-b1 {
  font-size: 13px;
  font-weight: 800;
  color: #fff;
  letter-spacing: .01em;
}

.hs-b2 {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .24em;
  color: var(--nav-accent, #5bb8e5);
  text-transform: uppercase;
}
</style>
