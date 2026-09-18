import { describe, expect, it } from 'vitest';
import {
  applyThemeToDocument,
  normalizeThemePreference,
  resolveInitialTheme,
  toVuetifyTheme,
} from './app-theme';

describe('app theme', () => {
  it('normalizes current and legacy stored theme names', () => {
    expect(normalizeThemePreference('hsLight')).toBe('light');
    expect(normalizeThemePreference('smax-light')).toBe('light');
    expect(normalizeThemePreference('light')).toBe('light');
    expect(normalizeThemePreference('repuDark')).toBe('dark');
    expect(normalizeThemePreference('legacy-dark')).toBe('dark');
    expect(normalizeThemePreference('dark')).toBe('dark');
  });

  it('keeps light mode as the safe default when no valid preference exists', () => {
    expect(resolveInitialTheme(null)).toBe('light');
    expect(resolveInitialTheme('unknown-theme')).toBe('light');
  });

  it('maps application preferences to the canonical Vuetify themes', () => {
    expect(toVuetifyTheme('light')).toBe('hsLight');
    expect(toVuetifyTheme('dark')).toBe('repuDark');
  });

  it('synchronizes semantic tokens and native controls on the document root', () => {
    const root = {
      dataset: {} as DOMStringMap,
      style: { colorScheme: '' },
    };
    const documentLike = { documentElement: root } as unknown as Document;

    applyThemeToDocument('dark', documentLike);
    expect(root.dataset.theme).toBe('dark');
    expect(root.style.colorScheme).toBe('dark');

    applyThemeToDocument('light', documentLike);
    expect(root.dataset.theme).toBe('light');
    expect(root.style.colorScheme).toBe('light');
  });
});
