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

```
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

## Continuous integration

GitHub Actions runs on every push and pull request against `master`:

- **Frontend** — type check, Biome lint and format check, and a production build
- **Backend** — `cargo fmt`, `cargo clippy` with warnings denied, and `cargo check`

Dependabot watches npm, Cargo and GitHub Actions dependencies on a weekly schedule.

## License

[MIT](LICENSE) — Copyright (c) 2020 Levi Araújo.

Cosmarium began as an Electron file manager by Levi Araújo and was migrated to Tauri, React and TypeScript. If you fork this project, please keep the original copyright notice and license terms intact.
