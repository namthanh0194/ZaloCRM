# Legacy Compatibility Layer & Consumer Tracking

Baseline captured at Phase 2 completion.

## Rules
1. New components and migrated views **must not** use legacy namespaces (`--smax-*`, `--at-*`, `--rk-*`, or bare HS variables).
2. Every alias in `compatibility.css` has an `@deprecated` comment and a target migration wave.
3. As each wave completes its migration, the corresponding legacy stylesheet is retired and its aliases removed.

## Namespace Inventory & Migration Roadmap

| Namespace | Source Stylesheet | Consumers | Target Migration Wave | Target Removal Phase |
| --- | --- | --- | --- | --- |
| `--at-*` | `assets/airtable.css`, `assets/atlas-v2-dashboard.css` | 741 usages | Wave 1 (Dashboard) & Wave 3 (CRM / Appointments) | Phase 6 & Phase 8 |
| `--rk-*` | `assets/report-kit.css` | 108 usages | Wave 1 (Reports) | Phase 6 |
| `--brand`, `--ink`, `--surface`, `--line` | `assets/hs-crm-theme.css` | 1,600+ usages | Wave 2 (Settings / Admin) | Phase 7 |
| `--smax-*` | `assets/tokens.css` | 988 usages | Wave 4 (Chat View & Components) | Phase 9 |

## Verification Command
Run the legacy consumer counter:
```bash
node frontend/scripts/check-legacy-tokens.mjs
```
