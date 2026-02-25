<?php

namespace App\Services;

use Illuminate\Support\Facades\File;

class ConfigService
{
    public function getStoragePath(): string
    {
        return config('release-manager.storage_file', storage_path('app/release-manager.json'));
    }

    /** @return array<string, mixed> */
    public function getStoredConfig(): array
    {
        $path = $this->getStoragePath();
        if (! File::exists($path)) {
            return [];
        }
        $content = File::get($path);
        $decoded = json_decode($content, true);

        return is_array($decoded) ? $decoded : [];
    }

    /** @param array<string, mixed> $updates */
    public function setStoredConfig(array $updates): void
    {
        $path = $this->getStoragePath();
        $dir = dirname($path);
        if (! File::isDirectory($dir)) {
            File::makeDirectory($dir, 0755, true);
        }
        $data = array_merge($this->getStoredConfig(), $updates);
        File::put($path, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    }

    /**
     * @return array<int, array{path: string, name?: string}>
     */
    public function getProjects(): array
    {
        $config = $this->getStoredConfig();
        $list = $config['projects'] ?? null;
        if (! is_array($list)) {
            return [];
        }
        $out = [];
        foreach ($list as $p) {
            if (is_array($p) && ! empty($p['path']) && is_string($p['path']) && trim($p['path']) !== '') {
                $out[] = [
                    'path' => trim($p['path']),
                    'name' => isset($p['name']) && is_string($p['name']) ? $p['name'] : null,
                ];
            }
        }

        return $out;
    }

    /**
     * @param  array<int, array{path: string, name?: string}>  $projects
     */
    public function setProjects(array $projects): void
    {
        $this->setStoredConfig(['projects' => $projects]);
    }

    public function getTheme(): string
    {
        $t = $this->getStoredConfig()['theme'] ?? null;
        $valid = ['dark', 'light', 'system'];

        return is_string($t) && in_array($t, $valid, true) ? $t : config('release-manager.defaults.theme', 'dark');
    }

    public function setTheme(string $theme): void
    {
        if (in_array($theme, ['dark', 'light', 'system'], true)) {
            $this->setStoredConfig(['theme' => $theme]);
        }
    }

    public function getPreference(string $key): mixed
    {
        $prefs = $this->getStoredConfig()['preferences'] ?? [];

        return is_array($prefs) && array_key_exists($key, $prefs) ? $prefs[$key] : null;
    }

    public function setPreference(string $key, mixed $value): void
    {
        $config = $this->getStoredConfig();
        $prefs = $config['preferences'] ?? [];
        if (! is_array($prefs)) {
            $prefs = [];
        }
        $prefs[$key] = $value;
        $this->setStoredConfig(['preferences' => $prefs]);
    }

    /** @return array{baseUrl: string, model: string} */
    public function getOllamaSettings(): array
    {
        $config = $this->getStoredConfig();
        $base = $config['ollamaBaseUrl'] ?? config('release-manager.defaults.ollama_base_url');
        $model = $config['ollamaModel'] ?? config('release-manager.defaults.ollama_model');

        return [
            'baseUrl' => is_string($base) ? trim($base) : config('release-manager.defaults.ollama_base_url'),
            'model' => is_string($model) ? trim($model) : config('release-manager.defaults.ollama_model'),
        ];
    }

    public function setOllamaSettings(string $baseUrl, string $model): void
    {
        $this->setStoredConfig([
            'ollamaBaseUrl' => trim($baseUrl) ?: config('release-manager.defaults.ollama_base_url'),
            'ollamaModel' => trim($model) ?: config('release-manager.defaults.ollama_model'),
        ]);
    }

    public function getGitHubToken(): string
    {
        $t = $this->getStoredConfig()['githubToken'] ?? '';

        return is_string($t) ? $t : '';
    }

    public function setGitHubToken(string $token): void
    {
        $this->setStoredConfig(['githubToken' => $token]);
    }
}
