<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\GitService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GitController extends Controller
{
    public function __construct(
        private GitService $git
    ) {}

    public function status(Request $request): JsonResponse
    {
        $path = $request->query('path');
        if (! is_string($path) || trim($path) === '') {
            return response()->json([
                'clean' => true,
                'branch' => null,
                'ahead' => 0,
                'behind' => 0,
                'uncommittedLines' => [],
                'conflictCount' => 0,
            ]);
        }

        return response()->json($this->git->getStatus(trim($path)));
    }

    public function pull(Request $request): JsonResponse
    {
        $path = $request->input('path');
        if (! is_string($path) || trim($path) === '') {
            return response()->json(['ok' => false, 'error' => 'path required']);
        }

        return response()->json($this->git->pull(trim($path)));
    }

    public function fetch(Request $request): JsonResponse
    {
        $path = $request->input('path');
        if (! is_string($path) || trim($path) === '') {
            return response()->json(['ok' => false, 'error' => 'path required']);
        }

        return response()->json($this->git->fetch(trim($path)));
    }

    public function commit(Request $request): JsonResponse
    {
        $path = $request->input('path');
        $message = $request->input('message');
        if (! is_string($path) || trim($path) === '') {
            return response()->json(['ok' => false, 'error' => 'path required']);
        }

        return response()->json($this->git->commit(trim($path), is_string($message) ? $message : ''));
    }

    public function stashPush(Request $request): JsonResponse
    {
        $path = $request->input('path');
        $message = $request->input('message');
        if (! is_string($path) || trim($path) === '') {
            return response()->json(['ok' => false, 'error' => 'path required']);
        }

        return response()->json($this->git->stashPush(trim($path), is_string($message) ? $message : null));
    }

    public function stashPop(Request $request): JsonResponse
    {
        $path = $request->input('path');
        if (! is_string($path) || trim($path) === '') {
            return response()->json(['ok' => false, 'error' => 'path required']);
        }

        return response()->json($this->git->stashPop(trim($path)));
    }

    public function discard(Request $request): JsonResponse
    {
        $path = $request->input('path');
        if (! is_string($path) || trim($path) === '') {
            return response()->json(['ok' => false, 'error' => 'path required']);
        }

        return response()->json($this->git->discardChanges(trim($path)));
    }

    public function mergeAbort(Request $request): JsonResponse
    {
        $path = $request->input('path');
        if (! is_string($path) || trim($path) === '') {
            return response()->json(['ok' => false, 'error' => 'path required']);
        }

        return response()->json($this->git->mergeAbort(trim($path)));
    }

    public function recentCommits(Request $request): JsonResponse
    {
        $path = $request->query('path');
        $n = (int) $request->query('n', 10);
        if (! is_string($path) || trim($path) === '') {
            return response()->json(['commits' => []]);
        }

        $result = $this->git->getRecentCommits(trim($path), $n);

        return response()->json(['commits' => $result['commits'] ?? []]);
    }

    public function commitsSinceTag(Request $request): JsonResponse
    {
        $path = $request->query('path');
        $since = $request->query('since');
        if (! is_string($path) || trim($path) === '') {
            return response()->json(['ok' => true, 'commits' => []]);
        }

        return response()->json($this->git->getCommitsSinceTag(
            trim($path),
            is_string($since) && $since !== '' ? $since : null
        ));
    }

    public function fileDiff(Request $request): JsonResponse
    {
        $path = $request->query('path');
        $file = $request->query('file');
        $untracked = filter_var($request->query('untracked'), FILTER_VALIDATE_BOOLEAN);
        if (! is_string($path) || trim($path) === '' || ! is_string($file)) {
            return response()->json(['ok' => false, 'error' => 'path and file required']);
        }

        return response()->json($this->git->getFileDiff(trim($path), $file, $untracked));
    }
}
