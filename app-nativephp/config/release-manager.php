<?php

return [
    'name' => env('RELEASE_MANAGER_NAME', 'Release Manager'),
    'version' => env('RELEASE_MANAGER_VERSION', '0.1.0'),

    /*
    |--------------------------------------------------------------------------
    | Release Manager settings storage
    |--------------------------------------------------------------------------
    | Path to JSON file for projects list, GitHub token, Ollama, theme, preferences.
    | Stored in storage/app by default.
    */
    'storage_file' => storage_path('app/release-manager.json'),

    'defaults' => [
        'ollama_base_url' => 'http://127.0.0.1:11434',
        'ollama_model' => 'llama3.2',
        'theme' => 'dark',
    ],
];
