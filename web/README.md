# Shipwell — Splash site

Laravel site serving the Shipwell splash/landing page, with **Download** and **Releases** pages that pull from GitHub.

## GitHub releases

Set your repo in `.env` so the Download and Releases pages can fetch from the GitHub API:

```env
GITHUB_REPO=your-username/release-manager
```

Releases are cached for 5 minutes (configurable via `GITHUB_RELEASES_CACHE_TTL` in seconds).

## Run locally

```bash
cd web
php artisan serve
```

Open [http://localhost:8000](http://localhost:8000).

## Build assets (optional)

For production-style assets (Vite):

```bash
npm install && npm run build
```

For development with hot reload:

```bash
npm install && npm run dev
```

The splash page works without building assets (Tailwind CDN fallback).
