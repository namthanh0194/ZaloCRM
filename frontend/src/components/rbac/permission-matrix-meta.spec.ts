// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nguyễn Tiến Lộc
import { describe, expect, it } from 'vitest';
import {
  getPermissionActionLabel,
  getPermissionResourceIcon,
  getPermissionResourceLabel,
  type PermissionMatrixMeta,
} from './permission-matrix-meta';

const meta: PermissionMatrixMeta = {
  resources: ['care_session', 'media'],
  actions: ['access'],
  resourceActions: {
    care_session: ['access'],
    media: ['access'],
  },
  resourceMeta: {
    care_session: { label: 'Phiên chăm sóc', icon: 'mdi-account-clock-outline' },
    media: { label: 'Kho phương tiện', icon: 'mdi-folder-multiple-image' },
  },
  actionLabels: {
    access: 'Truy cập',
  },
};

describe('permission matrix metadata helpers', () => {
  it('uses labels and icons supplied by the backend metadata', () => {
    expect(getPermissionResourceLabel(meta, 'care_session')).toBe('Phiên chăm sóc');
    expect(getPermissionResourceIcon(meta, 'media')).toBe('mdi-folder-multiple-image');
    expect(getPermissionActionLabel(meta, 'access')).toBe('Truy cập');
  });

  it('falls back to the raw key when metadata is missing', () => {
    expect(getPermissionResourceLabel(meta, 'unknown')).toBe('unknown');
    expect(getPermissionResourceIcon(meta, 'unknown')).toBe('mdi-shield-outline');
    expect(getPermissionActionLabel(meta, 'unknown')).toBe('unknown');
  });
});
