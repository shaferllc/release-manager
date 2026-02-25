<?php

namespace App\Services;

use App\Services\Git\GitPorcelainParser;

class GitService
{
    public function __construct(
        private RunInDirService $runInDir
    ) {}

    /**
     * Get git status: clean, branch, ahead/behind, uncommitted lines, conflict count.
     *
     * @return array{clean: bool, branch: string|null, ahead: int|null, behind: int|null, uncommittedLines: array, conflictCount: int}
     */
    public function getStatus(string $dirPath): array
    {
        $default = [
            'clean' => true,
            'branch' => null,
            'ahead' => null,
            'behind' => null,
            'uncommittedLines' => [],
            'conflictCount' => 0,
        ];

        if (! is_dir($dirPath.DIRECTORY_SEPARATOR.'.git')) {
            return $default;
        }

        try {
            $porcelainOut = $this->runInDir->run($dirPath, 'git', ['status', '--porcelain', '-uall']);
            $parsed = GitPorcelainParser::parse($porcelainOut['stdout'] ?? '');
            $clean = $parsed['conflictCount'] === 0 && count($parsed['lines']) === 0;

            $branch = null;
            $ahead = null;
            $behind = null;
            $statusOut = $this->runInDir->run($dirPath, 'git', ['status', '-sb']);
            $statusLine = preg_split('/\r?\n/', trim($statusOut['stdout'] ?? ''))[0] ?? '';
            if (preg_match('/^##\s+(.+?)(?:\.\.\.|$)/', $statusLine, $m)) {
                $branch = trim($m[1]);
            }
            if (preg_match('/ahead\s+(\d+)/', $statusLine, $m)) {
                $ahead = (int) $m[1];
            }
            if (preg_match('/behind\s+(\d+)/', $statusLine, $m)) {
                $behind = (int) $m[1];
            }

            return [
                'clean' => $clean,
                'branch' => $branch,
                'ahead' => $ahead,
                'behind' => $behind,
                'uncommittedLines' => $parsed['lines'],
                'conflictCount' => $parsed['conflictCount'],
            ];
        } catch (\Throwable) {
            return array_merge($default, ['clean' => false]);
        }
    }

    /** @return array{ok: bool, error?: string} */
    public function pull(string $dirPath): array
    {
        try {
            $this->runInDir->runOrFail($dirPath, 'git', ['pull', '--no-rebase']);
            return ['ok' => true];
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => $e->getMessage() ?: 'git pull failed'];
        }
    }

    /** @return array{ok: bool, error?: string} */
    public function fetch(string $dirPath): array
    {
        try {
            $this->runInDir->runOrFail($dirPath, 'git', ['fetch']);
            return ['ok' => true];
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => $e->getMessage() ?: 'git fetch failed'];
        }
    }

    /** @return array{ok: bool, error?: string} */
    public function commit(string $dirPath, string $message): array
    {
        $msg = trim($message);
        if ($msg === '') {
            return ['ok' => false, 'error' => 'Commit message is required'];
        }
        try {
            $this->runInDir->runOrFail($dirPath, 'git', ['add', '-A']);
            $this->runInDir->runOrFail($dirPath, 'git', ['commit', '-m', $msg]);
            return ['ok' => true];
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => $e->getMessage() ?: 'Commit failed'];
        }
    }

    /** @return array{ok: bool, error?: string} */
    public function stashPush(string $dirPath, ?string $message = null): array
    {
        try {
            $args = $message !== null && trim($message) !== ''
                ? ['stash', 'push', '-m', trim($message)]
                : ['stash', 'push'];
            $this->runInDir->runOrFail($dirPath, 'git', $args);
            return ['ok' => true];
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => $e->getMessage() ?: 'git stash failed'];
        }
    }

    /** @return array{ok: bool, error?: string} */
    public function stashPop(string $dirPath): array
    {
        try {
            $this->runInDir->runOrFail($dirPath, 'git', ['stash', 'pop']);
            return ['ok' => true];
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => $e->getMessage() ?: 'git stash pop failed'];
        }
    }

    /** @return array{ok: bool, error?: string} */
    public function discardChanges(string $dirPath): array
    {
        try {
            $this->runInDir->runOrFail($dirPath, 'git', ['reset', '--hard', 'HEAD']);
            $this->runInDir->runOrFail($dirPath, 'git', ['clean', '-fd']);
            return ['ok' => true];
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => $e->getMessage() ?: 'Discard failed'];
        }
    }

    /** @return array{ok: bool, error?: string} */
    public function mergeAbort(string $dirPath): array
    {
        try {
            $this->runInDir->runOrFail($dirPath, 'git', ['merge', '--abort']);
            return ['ok' => true];
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => $e->getMessage() ?: 'Merge abort failed'];
        }
    }

    /**
     * Recent commit subjects (no merges).
     *
     * @return array{ok: bool, commits: array<int, string>, error?: string}
     */
    public function getRecentCommits(string $dirPath, int $n = 10): array
    {
        $limit = max(1, min(50, $n));
        try {
            $out = $this->runInDir->run($dirPath, 'git', [
                'log', '-n', (string) $limit, '--pretty=format:%s', '--no-merges',
            ]);
            if (($out['exitCode'] ?? 1) !== 0) {
                return ['ok' => false, 'commits' => [], 'error' => $out['stderr'] ?: 'git log failed'];
            }
            $lines = array_filter(preg_split('/\r?\n/', trim($out['stdout'] ?? '')));

            return ['ok' => true, 'commits' => array_values($lines)];
        } catch (\Throwable $e) {
            return ['ok' => false, 'commits' => [], 'error' => $e->getMessage() ?: 'git log failed'];
        }
    }

    /**
     * Commit subjects since tag (or last 30 if no tag).
     *
     * @return array{ok: bool, commits: array<int, string>, error?: string}
     */
    public function getCommitsSinceTag(string $dirPath, ?string $sinceTag = null): array
    {
        try {
            $args = $sinceTag
                ? ['log', $sinceTag.'..HEAD', '--pretty=format:%s', '--no-merges']
                : ['log', '-n', '30', '--pretty=format:%s', '--no-merges'];
            $out = $this->runInDir->run($dirPath, 'git', $args);
            if (($out['exitCode'] ?? 1) !== 0) {
                return ['ok' => false, 'commits' => [], 'error' => $out['stderr'] ?: 'git log failed'];
            }
            $lines = array_filter(preg_split('/\r?\n/', trim($out['stdout'] ?? '')));

            return ['ok' => true, 'commits' => array_values($lines)];
        } catch (\Throwable $e) {
            return ['ok' => false, 'commits' => [], 'error' => $e->getMessage() ?: 'git log failed'];
        }
    }

    /**
     * Get diff for a file, or full content if untracked. Max 512KB for untracked file read.
     *
     * @return array{ok: true, type: 'diff'|'new', content: string}|array{ok: false, error: string}
     */
    public function getFileDiff(string $dirPath, string $filePath, bool $isUntracked = false): array
    {
        $fullPath = $dirPath.DIRECTORY_SEPARATOR.ltrim(preg_replace('#^[/\\\\]+#', '', $filePath), DIRECTORY_SEPARATOR);
        $fullPath = realpath($fullPath) ?: $fullPath;

        if ($isUntracked) {
            if (! is_file($fullPath)) {
                return ['ok' => false, 'error' => is_dir($fullPath) ? 'Cannot view directory' : 'File not found'];
            }
            $size = filesize($fullPath);
            if ($size > 512 * 1024) {
                return ['ok' => false, 'error' => 'File too large to view ('.round($size / 1024).' KB). Open in editor instead.'];
            }
            $content = file_get_contents($fullPath);
            if ($content === false) {
                return ['ok' => false, 'error' => 'Failed to read file'];
            }

            return ['ok' => true, 'type' => 'new', 'content' => $content];
        }

        try {
            $out = $this->runInDir->run($dirPath, 'git', ['diff', 'HEAD', '--', $filePath]);
            $content = trim(($out['stdout'] ?? '')."\n".($out['stderr'] ?? '')) ?: '(no diff)';

            return ['ok' => true, 'type' => 'diff', 'content' => $content];
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => $e->getMessage() ?: 'Failed to load file'];
        }
    }
}
