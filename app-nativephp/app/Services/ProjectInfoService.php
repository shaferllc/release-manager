<?php

namespace App\Services;

use App\Services\Git\GitPorcelainParser;

class ProjectInfoService
{
    public function __construct(
        private ProjectDetectionService $detection,
        private RunInDirService $runInDir
    ) {}

    /**
     * Build full project info (detection + git). Same shape as Electron getProjectInfoAsync.
     *
     * @return array<string, mixed>
     */
    public function getProjectInfo(string $dirPath): array
    {
        $resolved = $this->detection->getProjectNameVersionAndType($dirPath);
        if (! $resolved['ok']) {
            return [
                'ok' => false,
                'error' => $resolved['error'],
                'path' => $resolved['path'] ?? $dirPath,
            ];
        }

        $name = $resolved['name'];
        $version = $resolved['version'];
        $projectType = $resolved['projectType'];
        $hasComposer = is_file($dirPath.DIRECTORY_SEPARATOR.'composer.json');
        $gitDir = $dirPath.DIRECTORY_SEPARATOR.'.git';
        $hasGit = is_dir($gitDir);

        $result = [
            'ok' => true,
            'path' => $dirPath,
            'name' => $name,
            'version' => $version,
            'projectType' => $projectType,
            'hasComposer' => $hasComposer,
            'latestTag' => null,
            'commitsSinceLatestTag' => null,
            'allTags' => [],
            'gitRemote' => null,
            'hasGit' => $hasGit,
            'branch' => null,
            'ahead' => null,
            'behind' => null,
            'uncommittedLines' => [],
            'conflictCount' => 0,
        ];

        if (! $hasGit) {
            return $result;
        }

        try {
            $tagOut = $this->runInDir->run($dirPath, 'git', ['tag', '-l', '--sort=-version:refname']);
            $tags = array_filter(preg_split('/\r?\n/', trim($tagOut['stdout'] ?? '')));
            $result['allTags'] = array_slice(array_values($tags), 0, 100);
            $result['latestTag'] = $result['allTags'][0] ?? null;

            if ($result['latestTag']) {
                $countOut = $this->runInDir->run($dirPath, 'git', ['rev-list', '--count', $result['latestTag'].'..HEAD']);
                if (($countOut['exitCode'] ?? 1) === 0) {
                    $n = (int) trim($countOut['stdout'] ?? '0');
                    $result['commitsSinceLatestTag'] = $n;
                }
            }

            $remoteName = $this->getPushRemote($dirPath);
            if ($remoteName) {
                $urlOut = $this->runInDir->run($dirPath, 'git', ['remote', 'get-url', $remoteName]);
                if (($urlOut['exitCode'] ?? 1) === 0) {
                    $result['gitRemote'] = trim($urlOut['stdout'] ?? '') ?: null;
                }
            }

            $statusOut = $this->runInDir->run($dirPath, 'git', ['status', '-sb']);
            $statusLine = preg_split('/\r?\n/', trim($statusOut['stdout'] ?? ''))[0] ?? '';
            if (preg_match('/^##\s+(.+?)(?:\.\.\.|$)/', $statusLine, $m)) {
                $result['branch'] = trim($m[1]);
            }
            if (preg_match('/ahead\s+(\d+)/', $statusLine, $m)) {
                $result['ahead'] = (int) $m[1];
            }
            if (preg_match('/behind\s+(\d+)/', $statusLine, $m)) {
                $result['behind'] = (int) $m[1];
            }

            $porcelainOut = $this->runInDir->run($dirPath, 'git', ['status', '--porcelain', '-uall']);
            $parsed = GitPorcelainParser::parse($porcelainOut['stdout'] ?? '');
            $result['uncommittedLines'] = $parsed['lines'];
            $result['conflictCount'] = $parsed['conflictCount'];
        } catch (\Throwable) {
            // keep defaults
        }

        return $result;
    }

    private function getPushRemote(string $dirPath): ?string
    {
        try {
            $branchOut = $this->runInDir->run($dirPath, 'git', ['branch', '--show-current']);
            if (($branchOut['exitCode'] ?? 1) !== 0) {
                return $this->firstRemote($dirPath);
            }
            $branch = trim($branchOut['stdout'] ?? '');
            if ($branch !== '') {
                $remoteOut = $this->runInDir->run($dirPath, 'git', ['config', '--get', 'branch.'.$branch.'.remote']);
                if (($remoteOut['exitCode'] ?? 1) === 0) {
                    $remote = trim($remoteOut['stdout'] ?? '');
                    if ($remote !== '') {
                        return $remote;
                    }
                }
            }

            return $this->firstRemote($dirPath);
        } catch (\Throwable) {
            return null;
        }
    }

    private function firstRemote(string $dirPath): ?string
    {
        try {
            $listOut = $this->runInDir->run($dirPath, 'git', ['remote']);
            if (($listOut['exitCode'] ?? 1) !== 0) {
                return null;
            }
            $remotes = array_filter(preg_split('/\r?\n/', trim($listOut['stdout'] ?? '')));

            return count($remotes) > 0 ? $remotes[0] : null;
        } catch (\Throwable) {
            return null;
        }
    }
}
