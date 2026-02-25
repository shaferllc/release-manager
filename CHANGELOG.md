# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

- E2E smoke test (Playwright for Electron)
- Clear offline/network error messages for GitHub and Ollama

## [0.2.1] - 2026-02-24

### Added

- **Unreleased commits** – Dashboard and project detail show how many commits exist since the latest tag. "Needs release" filter includes projects with unreleased commits.
- **Ollama** – Generate commit messages and release notes with a local Ollama model. Settings: base URL and model; List models (filtered to models that support generation); model choice persists when selected from the list.
- **Ollama error messages** – Friendlier messages for: not running, address already in use, missing model file, model doesn’t support generate, and JSON errors from the API.
- **Documentation** – In-app Documentation tab with overview, adding projects, dashboard, batch release, Settings, Generate with Ollama, package managers, and theme. README updated with features and troubleshooting.

### Changed

- **Electron reload** – Only enabled when `NODE_ENV=development` to avoid SIGABRT on macOS when running `npm start`.
- **Ollama connection** – Default base URL and request URL use `127.0.0.1` instead of `localhost` to avoid IPv6 issues on macOS.
- **Commit message field** – Replaced single-line input with a resizable textarea; commit block layout and styling updated in Settings.
- **GitHub / network errors** – Clear messages when GitHub is unreachable (e.g. "Cannot reach GitHub. Check your connection and token.").

### Fixed

- Model selection from List models now saves immediately (no need to blur the field).
- Troubleshooting note in README for SIGABRT and `DISABLE_ELECTRON_RELOAD`.

## [0.2.0]

### Added

- Multiple package managers: npm, Rust (Cargo.toml), Go (go.mod), Python (pyproject.toml / setup.py).
- Project list, add/remove projects, project detail with version, latest tag, and release options.
- Git: branch, ahead/behind, uncommitted files; commit from the app.
- Release: npm bump (patch/minor/major) + tag + push; Rust/Go/Python tag-and-push.
- Optional GitHub token for higher limits and creating/updating releases.
- Dashboard with filter and sort; batch release for multiple npm projects.
- Sync (git fetch), download release assets from GitHub.
- Open in Terminal, Cursor/VS Code, Finder; copy path.
- Theme: dark / light; choice saved.
- Keyboard shortcuts (e.g. ⌘1/2/3 for bump, ⌘S sync).

[Unreleased]: https://github.com/your-org/release-manager/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/your-org/release-manager/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/your-org/release-manager/releases/tag/v0.2.0
