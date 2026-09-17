# ZaloCRM Token Contract

`primitives.css` contains raw values and must not be used by views.

`semantic.css` is the official visual API for shared components and migrated
pages. Choose tokens by purpose, never by a desired color.

`foundations.css` contains spacing, radius, typography, elevation, and motion
scales. New UI should use these values instead of page-local visual constants.

`compatibility.css` is a temporary bridge. Existing `--smax-*`, `--at-*`,
`--rk-*`, and HS variables remain supported until their owning migration phase.
Do not add new consumers of those legacy namespaces.

Current theme: `light`. The `[data-theme='dark']` semantic mapping reserves a
future dark-mode contract; no current page should add theme-specific overrides.
