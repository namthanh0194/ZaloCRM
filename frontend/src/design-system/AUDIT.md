# ZaloCRM UI Design-System Audit

Baseline recorded on September 16, 2026 before the first presentation-layer
migration. This document records source truth; it does not change behavior.

## Frontend Architecture

| Area | Current source truth |
| --- | --- |
| Framework | Vue 3 + TypeScript + Vite 8 |
| UI framework | Vuetify 4 with `@mdi/font`; Lucide is also used by feature UI |
| State | Pinia |
| Routing | Vue Router |
| Theme | `frontend/src/plugins/vuetify.ts`; `hsLight` is forced as the current theme |
| Entry styles | `frontend/src/main.ts` imports design tokens plus legacy/global styles |
| Shared UI | `frontend/src/components/ui/` contains Avatar, CareStatusBadge, ConfirmHost, TagChipList, ToastContainer |
| Views | `frontend/src/views/` plus feature subdirectories |
| Tests | Vitest; `npm test` runs `src/**/*.spec.ts` |
| Type-check | `npx vue-tsc -b --noEmit` from `frontend/` |
| Dev server | `npm run dev` (Vite HMR, port 5173) |

## Current Token and Namespace Inventory

| Namespace | Location | Role | Migration status |
| --- | --- | --- | --- |
| `--smax-*` | `assets/tokens.css` | Chat/navigation palette and utilities | Legacy; preserve until Chat wave |
| `--brand`, `--ink`, `--surface`, `--r-*`, `--sh-*` | `assets/hs-crm-theme.css` | Existing global foundation and utility classes | Legacy foundation; mapping source |
| `--at-*` | `assets/airtable.css`, `assets/atlas-v2-dashboard.css` | Marketing, appointments, dashboard and CRM table vocabulary | Page-system legacy |
| `--rk-*` | `assets/report-kit.css` | Reports-only vocabulary | Page-system legacy |
| Dynamic feature variables | Feature components | Tags, scores, charts, and data-driven colors | Keep feature-local where justified |

The audit found **6,509 hard-coded color occurrences across 184 source files**.
The densest migration candidates are `ConversationFilterSidebar.vue`,
`MessageThread.vue`, `rbac-page.css`, `hs-crm-theme.css`, and Dashboard/CRM
feature styles. These findings are not candidates for bulk replacement.

## Common Visual Mapping

| Current value | Current meaning | Canonical semantic token |
| --- | --- | --- |
| `#1786be` | Primary action and info | `--color-primary` / `--color-info` |
| `#0f6fa0` | Primary hover | `--color-primary-hover` |
| `#0b5880` | Primary active | `--color-primary-active` |
| `#f7f9fc`, `#f8fafc` | Page background / hover surface | `--color-bg` / `--color-surface-hover` |
| `#ffffff`, `#fff` | Canvas and inverse text | `--color-surface` / `--color-text-inverse` |
| `#e7eaf0`, `#e5e7eb`, `#e2e8f0` | Standard borders | `--color-border` |
| `#141a24`, `#0f172a` | Primary text | `--color-text` |
| `#475066`, `#6b7280`, `#64748b` | Secondary/muted text | `--color-text-secondary` / `--color-text-muted` |
| `#12b76a`, `#10b981` | Positive state | `--color-success` |
| `#f5a524`, `#f59e0b`, `#d97706` | Warning state | `--color-warning` |
| `#f04438`, `#ef4444`, `#dc2626` | Destructive/error state | `--color-danger` |
| `#e4f1f8`, `#eff6ff`, `#dbeafe` | Brand/info subtle surface | `--color-primary-subtle` / `--color-info-subtle` |

## Repeated Foundation Values

| Category | Repeated values | Canonical scale |
| --- | --- | --- |
| Radius | `4`, `6`, `7`, `8`, `9`, `10`, `12`, `14`, `999` px | `--radius-sm` through `--radius-pill` |
| Typography | `10`, `11`, `12`, `13`, `14`, `16`, `22` px; weights 400-800 | `--font-size-*`, `--font-weight-*` |
| Elevation | Repeated 1px, 4px, and 12px card/popover shadows | `--shadow-sm`, `--shadow-md`, `--shadow-lg` |
| Layering | Local values from 1 to 9999 | Define a z-index contract before modal migration |

## Existing Reusable Components

| Component | Reuse assessment |
| --- | --- |
| `components/ui/Avatar.vue` | Keep as a domain-ready primitive |
| `components/ui/CareStatusBadge.vue` | Align with a future `ZBadge` contract |
| `components/ui/ConfirmHost.vue` | Keep; assess with dialog patterns |
| `components/ui/TagChipList.vue` | Align with future chip/badge primitives |
| `components/ui/ToastContainer.vue` | Reuse for toast standardization |

There is no general-purpose Button, Input, Card, Dialog, Table, or Tabs wrapper
in `components/ui/`. Phase 3 must assess Vuetify extension points first.

## Ordered Migration Candidates

1. Foundation bridge for new UI, without changing old consumers.
2. Pilot Dashboard and an adjacent shared dashboard component.
3. Reports and RBAC namespaces (`--rk-*`, `rbac-page.css`).
4. Settings/Admin CRUD page patterns.
5. Contacts, Friends, and CRM table patterns (`--at-*`).
6. Chat shared UI (`--smax-*`) after generic primitives exist.
7. Remove legacy definitions only after consumers are migrated.

## Rules Effective After This Audit

- Do not introduce hard-coded visual values in new shared UI.
- New shared UI consumes `--color-*`, `--space-*`, `--radius-*`, and `--shadow-*`.
- Data-driven domain colors remain allowed.
- Do not delete or rename legacy namespaces in a broad replacement.
- Page migrations remain visual-only unless a blocking bug is documented.
