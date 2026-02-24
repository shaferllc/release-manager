# Release Manager

Desktop app to manage releases for all your app projects. Add project folders (with `package.json`), bump versions (patch/minor/major), then commit, tag, and push to trigger your CI (e.g. GitHub Actions).

## Requirements

- Node.js 18+
- npm
- Git (for tag & push)

## Quick start

```bash
cd release-manager
npm install
npm start
```

1. Click **Add project** and choose a folder that contains a `package.json` and is a git repo with a remote.
2. Select a project to see its current version and latest git tag.
3. Click **Release (patch)**, **Release (minor)**, or **Release (major)**. The app will bump the version, commit, create tag `vX.Y.Z`, and push branch + tag. If the project has a GitHub Actions workflow that runs on `v*` tags, the release will build and publish automatically.

## Project structure

```
release-manager/
├── assets/icons/       # App icon (placeholder created by ensure-icon.js)
├── scripts/
│   └── ensure-icon.js
├── src-main/
│   ├── main.js         # Electron main: config, project info, version bump, git
│   └── preload.js      # IPC bridge
├── src-renderer/
│   ├── index.html
│   ├── renderer.js      # Project list, detail, bump & push UI
│   ├── input.css        # Tailwind source
│   └── styles.css       # Built CSS
├── package.json
└── README.md
```

## Scripts

| Command        | Description                    |
|----------------|--------------------------------|
| `npm start`    | Run the app                    |
| `npm run dev`  | Run with Electron logging      |
| `npm run watch`| Restart on main/renderer changes (nodemon) |
| `npm run build:css` | Build Tailwind CSS         |
| `npm run build`| Package with electron-builder  |

## How it works

- **Projects** are stored in app user data (`release-manager-config.json`). Each project is a folder path; the app reads `package.json` and git tags from that folder.
- **Release (patch|minor|major)** does everything in one go: runs `npm version <bump> --no-git-tag-version`, then `git add package.json [package-lock.json]`, `git commit`, `git tag vX.Y.Z`, and `git push origin HEAD` + `git push origin vX.Y.Z`. Your repo must have a remote and you should be on the branch you want to release from (e.g. `main`).

For **GitHub Actions** to build and publish when you hit Release, the project repo needs a workflow that triggers on push tags `v*` (e.g. build Electron app and create a GitHub Release with artifacts). The CodeSeer desktop app uses this pattern (see `.github/workflows/release-desktop.yml`).

## Releasing this app (Release Manager)

This repo includes **`.github/workflows/release.yml`**: when you push a tag `v*` (e.g. `v0.1.1`), GitHub Actions builds the app for macOS, Windows, and Linux and creates a GitHub Release with the installers. Use the app itself (add this repo as a project and click Release) or run locally: `npm run version:patch && git push && git push --tags`.
# release-manager
