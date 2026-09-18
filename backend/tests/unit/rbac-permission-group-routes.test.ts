// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nguyễn Tiến Lộc
import Fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ACTIONS, RESOURCES } from '../../src/modules/rbac/permission-types';

vi.mock('../../src/modules/auth/auth-middleware.js', () => ({
  authMiddleware: async (request: any) => {
    request.user = { userId: 'user-1', orgId: 'org-1' };
  },
}));

vi.mock('../../src/modules/rbac/rbac-middleware.js', () => ({
  requireGrant: () => async () => undefined,
}));

vi.mock('../../src/modules/rbac/permission-group-service.js', () => ({
  getOrgPermissionGroups: vi.fn(async () => []),
  getPermissionGroup: vi.fn(async () => null),
  createPermissionGroup: vi.fn(),
  updatePermissionGroup: vi.fn(),
  archivePermissionGroup: vi.fn(),
}));

import { registerPermissionGroupRoutes } from '../../src/modules/rbac/permission-group-routes';

describe('permission group metadata route', () => {
  const apps: Array<ReturnType<typeof Fastify>> = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  it('returns labels and icons for all resources and labels for all actions', async () => {
    const app = Fastify();
    apps.push(app);
    await registerPermissionGroupRoutes(app);

    const response = await app.inject({ method: 'GET', url: '/api/v1/permission-groups/meta' });
    expect(response.statusCode).toBe(200);

    const body = response.json();
    expect(body.resources).toEqual([...RESOURCES]);
    expect(body.actions).toEqual([...ACTIONS]);
    expect(Object.keys(body.resourceMeta)).toEqual([...RESOURCES]);
    expect(Object.keys(body.actionLabels)).toEqual([...ACTIONS]);
    expect(body.resourceMeta.care_session.label).toBe('Phiên chăm sóc');
    expect(body.resourceMeta.media.icon).toMatch(/^mdi-/);
  });
});
