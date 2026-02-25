<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ConfigService;
use App\Services\ProjectInfoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProjectsController extends Controller
{
    public function __construct(
        private ConfigService $config,
        private ProjectInfoService $projectInfo
    ) {}

    public function index(): JsonResponse
    {
        return response()->json(['projects' => $this->config->getProjects()]);
    }

    public function store(Request $request): JsonResponse
    {
        $projects = $request->input('projects');
        if (is_array($projects)) {
            $normalized = [];
            foreach ($projects as $p) {
                if (is_array($p) && ! empty($p['path']) && is_string($p['path']) && trim($p['path']) !== '') {
                    $normalized[] = [
                        'path' => trim($p['path']),
                        'name' => isset($p['name']) && is_string($p['name']) ? $p['name'] : null,
                    ];
                }
            }
            $this->config->setProjects($normalized);
        }

        return response()->json(null, 204);
    }

    public function allInfo(): JsonResponse
    {
        $list = $this->config->getProjects();
        $results = [];
        foreach ($list as $p) {
            $path = $p['path'];
            $info = $this->projectInfo->getProjectInfo($path);
            $results[] = array_merge(
                ['path' => $path, 'name' => $p['name'] ?? $info['name'] ?? basename($path)],
                $info
            );
        }

        return response()->json($results);
    }

    public function projectInfo(Request $request): JsonResponse
    {
        $path = $request->query('path');
        if (! is_string($path) || trim($path) === '') {
            return response()->json(['ok' => false, 'error' => 'path required']);
        }
        $path = trim($path);
        if (! is_dir($path)) {
            return response()->json(['ok' => false, 'error' => 'Directory not found', 'path' => $path]);
        }

        return response()->json($this->projectInfo->getProjectInfo($path));
    }

    public function directoryDialog(): JsonResponse
    {
        return response()->json(['path' => null], 501);
    }
}
