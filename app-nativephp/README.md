# Release Manager (NativePHP)

Laravel + NativePHP conversion of the Release Manager desktop app. Built for **multi-agent** parallel work — see repo root `docs/MULTI-AGENT-CONVERSION.md` and this folder’s `AGENTS-API.md`.

## Setup (already done in repo)

- Laravel 12 + NativePHP desktop are installed.
- Run once if you need to reinstall NativePHP Electron deps: `php artisan native:install`

## Run

```bash
# Web (no Electron)
php artisan serve

# Native desktop (Electron window)
php artisan native:run
```

## API

All endpoints are under `/api`. Stub implementations return placeholder JSON so the app loads. Implement per agent assignment in `docs/MULTI-AGENT-CONVERSION.md`:

- **Agent A:** `app/Services/ConfigService.php`, `ProjectDetectionService`, `RunInDirService`, `ProjectsController`, `ConfigController`, `AppController`
- **Agent B:** `app/Services/GitService.php`, `app/Http/Controllers/Api/GitController.php`
- **Agent C:** `app/Services/GithubService.php`, `app/Http/Controllers/Api/GithubController.php`
- **Agent D:** Composer, Release, Tests, Ollama services and controllers
- **Agent E:** `app/Services/SystemService.php`, `app/Http/Controllers/Api/SystemController.php`
- **Agent F:** Copy `../src-renderer/index.html` into `resources/views/app.blade.php`, replace `releaseManager.*` with `fetch('/api/...')` per `AGENTS-API.md`

## Shared scaffold

- `routes/api.php` — all API routes (stub closures).
- `AGENTS-API.md` — request/response contract for every endpoint.
- `app/Services/RunInDirService.php` — run shell commands in a directory (used by Git, Composer, Tests).
- `config/release-manager.php` — settings file path and defaults.
