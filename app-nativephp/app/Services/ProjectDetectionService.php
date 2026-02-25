<?php

namespace App\Services;

use Illuminate\Support\Facades\File;

class ProjectDetectionService
{
    public const DEFAULT_ERROR = 'Not a supported project (package.json, Cargo.toml, go.mod, pyproject.toml, or composer.json)';

    /**
     * Get project name, version, and type from directory.
     *
     * @return array{ok: true, name: string, version: string|null, projectType: string}|array{ok: false, error: string, path: string}
     */
    public function getProjectNameVersionAndType(string $dirPath): array
    {
        if (! $dirPath || ! is_dir($dirPath)) {
            return ['ok' => false, 'error' => self::DEFAULT_ERROR, 'path' => $dirPath];
        }

        $pkgPath = $dirPath.DIRECTORY_SEPARATOR.'package.json';
        if (File::exists($pkgPath)) {
            $content = File::get($pkgPath);
            $parsed = $this->parsePackageInfo($content, $dirPath);
            if ($parsed['ok']) {
                return [
                    'ok' => true,
                    'name' => $parsed['name'],
                    'version' => $parsed['version'],
                    'projectType' => 'npm',
                ];
            }
        }

        $detected = $this->detectProjectType($dirPath);
        if ($detected === null) {
            return ['ok' => false, 'error' => self::DEFAULT_ERROR, 'path' => $dirPath];
        }

        $nonNpm = $this->getNonNpmProjectInfo($dirPath, $detected);
        if (! $nonNpm['ok']) {
            return [
                'ok' => false,
                'error' => $nonNpm['error'] ?? self::DEFAULT_ERROR,
                'path' => $dirPath,
            ];
        }

        return [
            'ok' => true,
            'name' => $nonNpm['name'],
            'version' => $nonNpm['version'],
            'projectType' => $nonNpm['projectType'],
        ];
    }

    /**
     * @return array{ok: true, name: string, version: string|null}|array{ok: false, error: string}
     */
    private function parsePackageInfo(string $content, string $dirPath): array
    {
        if ($content === '') {
            return ['ok' => false, 'error' => 'No package.json or invalid JSON'];
        }
        $pkg = json_decode($content, true);
        if (! is_array($pkg)) {
            return ['ok' => false, 'error' => 'No package.json or invalid JSON'];
        }
        $name = $pkg['name'] ?? basename($dirPath) ?: 'project';
        $version = isset($pkg['version']) && is_string($pkg['version']) ? $pkg['version'] : null;

        return ['ok' => true, 'name' => $name, 'version' => $version];
    }

    /**
     * @return array{type: string, manifestPath: string}|null
     */
    private function detectProjectType(string $dirPath): ?array
    {
        $cargo = $dirPath.DIRECTORY_SEPARATOR.'Cargo.toml';
        if (File::exists($cargo)) {
            return ['type' => 'cargo', 'manifestPath' => $cargo];
        }
        $go = $dirPath.DIRECTORY_SEPARATOR.'go.mod';
        if (File::exists($go)) {
            return ['type' => 'go', 'manifestPath' => $go];
        }
        $py = $dirPath.DIRECTORY_SEPARATOR.'pyproject.toml';
        if (File::exists($py)) {
            return ['type' => 'python', 'manifestPath' => $py];
        }
        $setup = $dirPath.DIRECTORY_SEPARATOR.'setup.py';
        if (File::exists($setup)) {
            return ['type' => 'python', 'manifestPath' => $setup];
        }
        $composer = $dirPath.DIRECTORY_SEPARATOR.'composer.json';
        if (File::exists($composer)) {
            return ['type' => 'php', 'manifestPath' => $composer];
        }

        return null;
    }

    /**
     * @param  array{type: string, manifestPath: string}  $detected
     * @return array{ok: bool, name?: string, version?: string|null, projectType?: string, error?: string}
     */
    private function getNonNpmProjectInfo(string $dirPath, array $detected): array
    {
        $basename = $dirPath ? basename($dirPath) : 'project';
        $name = $basename;
        $version = null;

        try {
            $content = File::get($detected['manifestPath']);
            switch ($detected['type']) {
                case 'cargo':
                    $version = $this->parseCargoVersion($content);
                    if (preg_match('/^name\s*=\s*["\']([^"\']+)["\']\s*$/m', $content, $m)) {
                        $name = trim($m[1]);
                    }
                    break;
                case 'go':
                    if (preg_match('/^module\s+(\S+)\s*$/m', $content, $m)) {
                        $parts = explode('/', trim($m[1]));
                        $name = end($parts) ?: $name;
                    }
                    break;
                case 'python':
                    if (str_ends_with($detected['manifestPath'], 'pyproject.toml')) {
                        $version = $this->parsePyprojectVersion($content);
                        if (preg_match('/^name\s*=\s*["\']([^"\']+)["\']\s*$/m', $content, $m)) {
                            $name = trim($m[1]);
                        }
                    } else {
                        $version = $this->parseSetupPyVersion($content);
                        if (preg_match('/name\s*=\s*["\']([^"\']+)["\']/', $content, $m)) {
                            $name = trim($m[1]);
                        }
                    }
                    break;
                case 'php':
                    $version = $this->parseComposerVersion($content);
                    $data = json_decode($content, true);
                    if (is_array($data) && ! empty($data['name']) && is_string($data['name'])) {
                        $parts = explode('/', trim($data['name']));
                        $name = end($parts) ?: $name;
                    }
                    break;
            }
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => $e->getMessage() ?: 'Failed to read manifest'];
        }

        return [
            'ok' => true,
            'name' => $name,
            'version' => $version,
            'projectType' => $detected['type'],
        ];
    }

    private function parseCargoVersion(string $content): ?string
    {
        return preg_match('/^version\s*=\s*["\']([^"\']+)["\']\s*$/m', $content, $m) ? trim($m[1]) : null;
    }

    private function parsePyprojectVersion(string $content): ?string
    {
        return preg_match('/^version\s*=\s*["\']([^"\']+)["\']\s*$/m', $content, $m) ? trim($m[1]) : null;
    }

    private function parseSetupPyVersion(string $content): ?string
    {
        return preg_match('/version\s*=\s*["\']([^"\']+)["\']/', $content, $m) ? trim($m[1]) : null;
    }

    private function parseComposerVersion(string $content): ?string
    {
        $data = json_decode($content, true);
        if (! is_array($data) || ! isset($data['version']) || ! is_string($data['version'])) {
            return null;
        }
        $v = trim($data['version']);

        return $v !== '' ? $v : null;
    }
}
