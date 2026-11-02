# Cosmarium

[![CI](https://github.com/levi5/cosmarium/actions/workflows/ci.yml/badge.svg)](https://github.com/levi5/cosmarium/actions/workflows/ci.yml)

A focused desktop file manager built with Tauri, React and TypeScript.

## Stack

- **Shell** — Tauri 2 (Rust) for the backend, native webview frontend
- **UI** — React 18, TypeScript, Zustand for state, react-router-dom
- **Build** — Vite 4, Biome for linting and formatting
- **Platform** — `notify` for filesystem watching, `trash` for recycle bin, `sysinfo` for volumes

## Requirements

- Node.js 24 or newer
- pnpm 10 or newer
- Rust stable and the [Tauri system dependencies](https://tauri.app/start/prerequisites/)

## Getting started

```bash
pnpm install
pnpm tauri dev
```

## Scripts

| Script | Description |
| --- | --- |
| `pnpm dev` | Start the Vite dev server |
| `pnpm tauri dev` | Start the full desktop app |
| `pnpm build` | Type-check and build the frontend |
| `pnpm tauri build` | Produce a native bundle |
| `pnpm lint` | Lint with Biome |
| `pnpm lint:fix` | Apply Biome fixes |
| `pnpm format` | Format with Biome |
| `pnpm check` | Type-check, lint and format check |

## Backend checks

```bash
cargo check --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets
cargo fmt --manifest-path src-tauri/Cargo.toml
```

## Project layout

```txt
src/
  components/   UI components
  constants/    Shared constants
  features/     Feature modules
  global/       Global stylesheets and design tokens
  hooks/        Reusable hooks
  lib/          Framework-agnostic logic and contexts
  pages/        Routed pages
  services/     Tauri API wrappers
  stores/       Zustand stores
  types/        TypeScript types
src-tauri/
  src/
    commands/     Tauri command handlers
    filesystem/   Directory reads, previews, stats, recents
    operations/   Mutations, transfers, undo stack
    platform/     Locations, paths, trash, volumes, open-with
    watcher/      Filesystem watcher
web/            GitHub Pages site built with React and Vite
```

## Features

- Browse, sort, search and preview files
- Create, rename, copy, move and delete entries
- Multi-select with copy, cut and paste
- Recycle bin with restore and empty
- Undo for destructive operations
- Pinned quick access and custom shortcuts
- Tabbed browsing
- Drag and drop to move entries between folders
- Colored tags on files and folders
- Filesystem watching for live refresh
- Live folder size and item counts
- Dual-pane browsing with independent navigation and transfers between panes
- ZIP creation and extraction without silently overwriting existing files
- Batch rename with replacement, prefixes, numbering and a preview
- Content-based duplicate detection with SHA-256 (read-only)
- PDF preview rendered with PDF.js and audio playback
- Open a terminal in the current folder
- Serialized transfers with in-session pause/resume, cancellation, speed and remaining time
- Saved searches and recursive filters for size, modification date and text content
- Keyboard-accessible dialogs and context menus

## Search filters

Searches include subfolders by default, up to eight levels. Combine a file name with filters:

```text
report ext:pdf size:1mb maxsize:10mb after:2026-01-01 before:2026-12-31
content:invoice ext:txt depth:4
type:folder hidden:true
```

Dates use UTC day boundaries. Content search scans UTF-8 text files up to 2 MiB. Results are limited to 5,000 entries. Saved searches retain both the query and its root folder.

## Operation safety

- Media previews start with an empty asset-protocol scope. Only supported, readable regular files requested for preview or thumbnails are authorized, by canonical path, for the current application session.
- ZIP extraction rejects path traversal and symbolic links, and is limited to 100,000 entries and 20 GiB of extracted content. Existing output folders are never replaced.
- Batch renames validate the full plan first, reject existing targets and attempt rollback on failure. Cyclic renames are not supported.
- Transfers do not follow symbolic links. Replacement copies are staged before recycling an existing destination. A failed directory copy never triggers deletion of its source tree.
- Move cleanup verifies copied contents and preserves new source files. Undo sends copied or created items to the recycle bin instead of permanently deleting them.
- Pause/resume applies to the running application session; transfers do not survive an application restart. Same-volume moves may complete atomically before they can be paused.
- Duplicate scans are limited to 100,000 visited entries and never delete files automatically.

## Tests

```bash
pnpm test
cargo test --manifest-path src-tauri/Cargo.toml
```

Tests cover search filters, rename previews, modal focus, binary previews, transfer state, ZIP safety, duplicate detection, copy/move undo, cancellation and pause/resume. Native terminal launch and platform-specific integration still require desktop smoke testing.

## Continuous integration

GitHub Actions runs on every push and pull request against `master`:

- **Frontend** — type check, Biome lint and format check, and a production build
- **Backend** — `cargo fmt`, `cargo clippy` with warnings denied, and `cargo check`

Dependabot watches npm, Cargo and GitHub Actions dependencies on a weekly schedule.

## Builds

Build bundles for the current operating system with the Tauri CLI:

```bash
pnpm install
pnpm tauri build                       # default bundles for this OS
pnpm tauri build --bundles deb,appimage  # Linux: .deb and .AppImage
pnpm tauri build --bundles nsis          # Windows: setup .exe
```

Installers are written to `src-tauri/target/release/bundle/`:

| Platform | Bundle | Path |
| --- | --- | --- |
| Linux | Debian package | `bundle/deb/*.deb` |
| Linux | AppImage | `bundle/appimage/*.AppImage` |
| Windows | NSIS installer | `bundle/nsis/*-setup.exe` |

Tauri does not cross-compile Windows bundles from Linux, so the **Release**
workflow builds both platforms natively. Run it from **Actions → Release → Run
workflow**, or push a tag such as `v0.1.0`. Each run uploads the installers as
workflow artifacts and, for tags, attaches them to a draft GitHub release.
Linux builds target Ubuntu 22.04 for a wider glibc range; Windows builds are
unsigned unless a code-signing certificate is configured.

## Website

The marketing site lives in [`web/`](web) and is published to GitHub Pages at
<https://levi5.github.io/cosmarium/> by the `Website` workflow. It reuses the
app's component layout (`components/base`, `components/<Feature>`, `pages`,
`lib`, `global`) and its design tokens, with Portuguese and English content.

```bash
cd web
pnpm install
pnpm dev     # http://localhost:1422
pnpm build   # static output in web/dist
```

Pages must use **GitHub Actions** as the publishing source in the repository
settings. The site is built with the `/cosmarium/` base path expected by a
project site.

## License

[MIT](LICENSE) — Copyright (c) 2020 Levi Araújo.

Cosmarium began as an Electron file manager by Levi Araújo and was migrated to Tauri, React and TypeScript. If you fork this project, please keep the original copyright notice and license terms intact.
