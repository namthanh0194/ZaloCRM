// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nguyễn Tiến Lộc
export interface PermissionMatrixMeta {
  resources: string[];
  actions: string[];
  resourceActions: Record<string, string[]>;
  resourceMeta: Record<string, { label: string; icon: string }>;
  actionLabels: Record<string, string>;
}

export function getPermissionResourceLabel(meta: PermissionMatrixMeta | null, resource: string): string {
  return meta?.resourceMeta?.[resource]?.label ?? resource;
}

export function getPermissionResourceIcon(meta: PermissionMatrixMeta | null, resource: string): string {
  return meta?.resourceMeta?.[resource]?.icon ?? 'mdi-shield-outline';
}

export function getPermissionActionLabel(meta: PermissionMatrixMeta | null, action: string): string {
  return meta?.actionLabels?.[action] ?? action;
}
