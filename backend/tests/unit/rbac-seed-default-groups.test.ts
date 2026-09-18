// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nguyễn Tiến Lộc
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}));

vi.mock('../../src/shared/database/prisma-client.js', () => ({
  prisma: {
    permissionGroup: {
      findFirst: mocks.findFirst,
      create: mocks.create,
      update: mocks.update,
    },
  },
}));

import { seedDefaultPermissionGroups } from '../../src/modules/rbac/seed-default-groups';

describe('seedDefaultPermissionGroups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates displayOrder for existing system groups', async () => {
    mocks.findFirst.mockImplementation(async ({ where }: any) => ({
      id: `group-${where.name}`,
      name: where.name,
      isSystem: true,
    }));
    mocks.update.mockImplementation(async ({ data, where }: any) => ({
      id: where.id,
      name: data.name,
      isSystem: true,
    }));

    await seedDefaultPermissionGroups('org-1');

    expect(mocks.update).toHaveBeenCalledTimes(7);
    expect(mocks.update.mock.calls.map(([call]) => call.data.displayOrder)).toEqual([
      10, 20, 30, 40, 50, 60, 70,
    ]);
  });

  it('sets displayOrder when creating missing system groups', async () => {
    mocks.findFirst.mockResolvedValue(null);
    mocks.create.mockImplementation(async ({ data }: any) => ({
      id: data.id,
      name: data.name,
      isSystem: data.isSystem,
    }));

    await seedDefaultPermissionGroups('org-1');

    expect(mocks.create).toHaveBeenCalledTimes(7);
    expect(mocks.create.mock.calls.map(([call]) => call.data.displayOrder)).toEqual([
      10, 20, 30, 40, 50, 60, 70,
    ]);
  });
});
