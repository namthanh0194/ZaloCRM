// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nguyễn Tiến Lộc
import { computed, ref } from 'vue';
import { useTheme } from 'vuetify';

export type AppThemePreference = 'light' | 'dark';
export type AppVuetifyTheme = 'hsLight' | 'repuDark';

const THEME_STORAGE_KEY = 'theme';
const LIGHT_THEME_NAMES = new Set(['light', 'hsLight', 'smax-light']);
const DARK_THEME_NAMES = new Set(['dark', 'repuDark', 'legacy-dark']);

export function normalizeThemePreference(value: string | null): AppThemePreference | null {
  if (value && LIGHT_THEME_NAMES.has(value)) return 'light';
  if (value && DARK_THEME_NAMES.has(value)) return 'dark';
  return null;
}

export function resolveInitialTheme(value: string | null): AppThemePreference {
  return normalizeThemePreference(value) ?? 'light';
}

export function toVuetifyTheme(preference: AppThemePreference): AppVuetifyTheme {
  return preference === 'dark' ? 'repuDark' : 'hsLight';
}

export function applyThemeToDocument(preference: AppThemePreference, targetDocument: Document): void {
  targetDocument.documentElement.dataset.theme = preference;
  targetDocument.documentElement.style.colorScheme = preference;
}

function readStoredTheme(): AppThemePreference {
  if (typeof window === 'undefined') return 'light';
  return resolveInitialTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
}

const activeTheme = ref<AppThemePreference>(readStoredTheme());

export function useAppTheme() {
  const vuetifyTheme = useTheme();

  function applyTheme(preference: AppThemePreference, persist = true): void {
    activeTheme.value = preference;
    vuetifyTheme.global.name.value = toVuetifyTheme(preference);

    if (typeof document !== 'undefined') {
      applyThemeToDocument(preference, document);
    }
    if (persist && typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_STORAGE_KEY, preference);
    }
  }

  function initializeTheme(): void {
    applyTheme(readStoredTheme(), false);
  }

  function toggleTheme(): void {
    applyTheme(activeTheme.value === 'dark' ? 'light' : 'dark');
  }

  return {
    themePreference: computed(() => activeTheme.value),
    isDark: computed(() => activeTheme.value === 'dark'),
    initializeTheme,
    setTheme: applyTheme,
    toggleTheme,
  };
}
