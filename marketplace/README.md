# Release Manager Extension Marketplace

Backend API for discovering, downloading, and updating extensions used by the Release Manager Electron app.

**Production marketplace and OAuth (GitHub, Bitbucket, app login) live in the Shipwell web app:**  
**`~/Projects/Apps/shipwell-web`**. See that repo’s README for Extension marketplace API, Git provider OAuth, and Passport OAuth for the desktop app.

## Quick start (standalone, no Laravel)

For local development you can use the simple PHP API in this repo:

```bash
# From repo root
php -S localhost:8000 -t marketplace/public
```

Then open `http://localhost:8000/api/extensions`. Edit `marketplace/storage/extensions.json` to add or change extensions. The app can be configured to use this URL as the marketplace base.

## Laravel / Shipwell web

The **shipwell-web** Laravel app (`~/Projects/Apps/shipwell-web`) already includes:

- Extension marketplace: `GET /api/extensions`, `GET /api/extensions/{id}`, `GET /api/extensions/{id}/download`
- GitHub and Bitbucket OAuth for login and git repo access
- Laravel Passport for the Shipwell desktop app OAuth

To add the marketplace to another Laravel app, use the skeleton in this repo:

- Copy `marketplace-skeleton/routes/api.php` (or merge the routes) into your `routes/api.php`.
- Copy `marketplace-skeleton/app/Http/Controllers/Api/ExtensionController.php` to `app/Http/Controllers/Api/`.
- Copy `marketplace-skeleton/app/Models/Extension.php` to `app/Models/`.
- Copy the migration from `marketplace-skeleton/database/migrations/` to `database/migrations/`.
- Run `php artisan migrate`.
- Store extension packages (zip or js bundles) in `storage/app/public/extensions/` and run `php artisan storage:link`.

## API

- `GET /api/extensions` – List all extensions (id, name, slug, description, version, download_url, etc.).
- `GET /api/extensions/{id}` – Single extension details.
- `GET /api/extensions/{id}/download` – Redirect or stream the extension package file.

## Extension package format

See `docs/EXTENSION_PACKAGE_FORMAT.md` in the main repo for the expected manifest and bundle format so the app can install and load extensions at runtime.
