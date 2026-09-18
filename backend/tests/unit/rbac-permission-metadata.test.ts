// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nguyễn Tiến Lộc
import { describe, expect, it } from 'vitest';
import {
  ACTIONS,
  ACTION_LABELS,
  DEFAULT_PERMISSION_GROUPS,
  RESOURCES,
  RESOURCE_META,
} from '../../src/modules/rbac/permission-types';

describe('RBAC permission metadata', () => {
  it('assigns deterministic display order to every default system group', () => {
    expect(DEFAULT_PERMISSION_GROUPS.map((group) => [group.name, group.displayOrder])).toEqual([
      ['Admin', 10],
      ['CEO', 20],
      ['Trưởng phòng', 30],
      ['Sale Senior', 40],
      ['Sale', 50],
      ['Marketing', 60],
      ['Hành chính - Nhân sự', 70],
    ]);
  });

  it('provides labels and icons for every resource and labels for every action', () => {
    expect(Object.keys(RESOURCE_META)).toEqual([...RESOURCES]);
    expect(Object.keys(ACTION_LABELS)).toEqual([...ACTIONS]);

    for (const resource of RESOURCES) {
      expect(RESOURCE_META[resource].label.trim()).not.toBe('');
      expect(RESOURCE_META[resource].icon).toMatch(/^mdi-/);
    }
  });
});
