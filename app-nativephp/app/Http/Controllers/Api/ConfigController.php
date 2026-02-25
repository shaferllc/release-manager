<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ConfigService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConfigController extends Controller
{
    public function __construct(
        private ConfigService $config
    ) {}

    public function getTheme(): JsonResponse
    {
        $theme = $this->config->getTheme();
        $effective = $theme === 'system' ? 'dark' : $theme;

        return response()->json(['theme' => $theme, 'effective' => $effective]);
    }

    public function setTheme(Request $request): JsonResponse
    {
        $theme = $request->input('theme');
        if (is_string($theme)) {
            $this->config->setTheme($theme);
        }

        return response()->json(null, 204);
    }

    public function getPreference(Request $request): JsonResponse
    {
        $key = $request->query('key');
        $value = is_string($key) ? $this->config->getPreference($key) : null;

        return response()->json(['value' => $value]);
    }

    public function setPreference(Request $request): JsonResponse
    {
        $key = $request->input('key');
        $value = $request->input('value');
        if (is_string($key)) {
            $this->config->setPreference($key, $value);
        }

        return response()->json(null, 204);
    }

    public function getOllama(): JsonResponse
    {
        return response()->json($this->config->getOllamaSettings());
    }

    public function setOllama(Request $request): JsonResponse
    {
        $baseUrl = $request->input('baseUrl');
        $model = $request->input('model');
        $this->config->setOllamaSettings(
            is_string($baseUrl) ? $baseUrl : '',
            is_string($model) ? $model : ''
        );

        return response()->json(null, 204);
    }

    public function getGithubToken(): JsonResponse
    {
        return response()->json(['token' => $this->config->getGitHubToken()]);
    }

    public function setGithubToken(Request $request): JsonResponse
    {
        $token = $request->input('token');
        $this->config->setGitHubToken(is_string($token) ? $token : '');

        return response()->json(null, 204);
    }
}
