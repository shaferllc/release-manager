# App Update Checking

The app has a **Check for updates** setting (Application → Updates) and a **Check now** button. Update checking is implemented via electron-updater.

## Current State

- **Where we check:** On app start (if `auto`) and every 24 hours, or when the user clicks **Check now** (if `manual`).
- **Check now button:** Calls `checkForUpdatesNow()` which uses electron-updater. Returns `{ ok: true, updateAvailable, version }` or `{ ok: false, error }`.
- **Preference:** `auto` = check on startup + every 24h; `manual` = only when user clicks Check now; `never` = no checks.

## What Needs to Happen

### 1. Add electron-updater

```bash
npm install electron-updater
```

### 2. Configure electron-builder publish

In `package.json` → `build`, set `publish` to your update server. **Replace `your-org` with your GitHub org/username**:

```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "your-org",
      "repo": "shipwell"
    }
  }
}
```

Or use a generic server:

```json
{
  "build": {
    "publish": {
      "provider": "generic",
      "url": "https://your-domain.com/releases"
    }
  }
}
```

### 3. Website / Server Requirements

The update server must host an **update manifest** that electron-updater can fetch. The format depends on the provider:

#### GitHub Releases (recommended)

- Create a GitHub Release for each version (e.g. `v0.10.0`)
- Upload the built artifacts: `.dmg` (macOS), `.exe` / `.nsis` (Windows), `.AppImage` (Linux)
- electron-updater fetches `https://github.com/owner/repo/releases/latest` and parses the release assets

#### Generic server

Host a JSON file at a stable URL, e.g.:

```
https://your-domain.com/releases/latest-mac.json
https://your-domain.com/releases/latest-win.json
https://your-domain.com/releases/latest-linux.json
```

Example `latest-mac.json` (macOS):

```json
{
  "version": "0.10.0",
  "releaseDate": "2026-03-09T12:00:00.000Z",
  "url": "https://your-domain.com/releases/Shipwell-0.10.0.dmg",
  "sha512": "..."
}
```

### 4. Implement checkForUpdatesNow in main.js

Replace the stub in `main.js` with:

```js
const { autoUpdater } = require('electron-updater');

// In apiRegistry:
checkForUpdatesNow: async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    const updateAvailable = result?.updateInfo?.version && result.updateInfo.version !== app.getVersion();
    return { ok: true, updateAvailable };
  } catch (e) {
    return { ok: false, error: e?.message || 'Update check failed' };
  }
},
```

### 5. Respect checkForUpdates preference

When `checkForUpdates` is `auto`, call `autoUpdater.checkForUpdates()` periodically (e.g. on app start and every 24 hours). When `manual`, only check when the user clicks **Check now**. When `never`, skip checks entirely.

### 6. Download and install flow

Use `autoUpdater` events (`update-available`, `update-downloaded`) to notify the app and prompt the user to restart. electron-updater handles downloading; the app just needs to listen and show UI.

## Summary

| Component | Status |
|-----------|--------|
| UI (Check for updates dropdown, Check now, Download, Restart) | ✅ Done |
| Preference storage | ✅ Done |
| electron-updater | ✅ Installed |
| Publish config in package.json | ✅ Set (replace `your-org` with your GitHub org) |
| Update server / GitHub Releases | ⚠️ Create releases and upload artifacts |
| checkForUpdatesNow implementation | ✅ Implemented |
| Auto-check on startup / periodic | ✅ Implemented |
