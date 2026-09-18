# ZaloCRM Token Contract

`primitives.css` contains raw values and must not be used by views.

`semantic.css` is the official visual API for shared components and migrated
pages. Choose tokens by purpose, never by a desired color.

`foundations.css` contains spacing, radius, typography, elevation, and motion
scales. New UI should use these values instead of page-local visual constants.

`compatibility.css` is a temporary bridge. Existing `--smax-*`, `--at-*`,
`--rk-*`, and HS variables remain supported until their owning migration phase.
Do not add new consumers of those legacy namespaces.

The application supports `light` and `dark`. `useAppTheme` synchronizes the
semantic `[data-theme]` contract, native `color-scheme`, persisted preference,
and Vuetify themes (`hsLight` / `repuDark`).

New pages and components must consume semantic or domain tokens so both modes
work without page-local theme overrides.
