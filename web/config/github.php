<?php

return [

    /*
    |--------------------------------------------------------------------------
    | GitHub Repository
    |--------------------------------------------------------------------------
    |
    | Repository in "owner/name" format for fetching releases.
    | Set GITHUB_REPO in .env (e.g. tomshafer/release-manager).
    |
    */

    'repo' => env('GITHUB_REPO', ''),

    /*
    |--------------------------------------------------------------------------
    | Releases cache TTL (seconds)
    |--------------------------------------------------------------------------
    */

    'releases_cache_ttl' => env('GITHUB_RELEASES_CACHE_TTL', 300),

];
