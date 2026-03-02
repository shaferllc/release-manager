<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class ReleaseController extends Controller
{
    /**
     * Fetch releases from GitHub API (cached).
     *
     * @return array{releases: array, repo: string|null, error: string|null}
     */
    protected function getReleases(): array
    {
        $repo = config('github.repo');

        if (empty($repo)) {
            return [
                'releases' => [],
                'repo' => null,
                'error' => 'GITHUB_REPO is not set in .env',
            ];
        }

        $cacheKey = 'github_releases_' . str_replace('/', '_', $repo);

        $data = Cache::remember($cacheKey, config('github.releases_cache_ttl'), function () use ($repo) {
            $response = Http::withHeaders([
                'Accept' => 'application/vnd.github+json',
                'X-GitHub-Api-Version' => '2022-11-28',
            ])->get("https://api.github.com/repos/{$repo}/releases");

            if (! $response->successful()) {
                return [
                    'releases' => [],
                    'error' => $response->body(),
                ];
            }

            return [
                'releases' => $response->json(),
                'error' => null,
            ];
        });

        return [
            'releases' => $data['releases'] ?? [],
            'repo' => $repo,
            'error' => $data['error'] ?? null,
        ];
    }

    /**
     * Download page — latest release and assets.
     */
    public function download()
    {
        $result = $this->getReleases();
        $latest = isset($result['releases'][0]) ? $result['releases'][0] : null;

        return view('download', [
            'latest' => $latest,
            'repo' => $result['repo'],
            'error' => $result['error'],
        ]);
    }

    /**
     * Releases page — all releases.
     */
    public function releases()
    {
        $result = $this->getReleases();

        return view('releases', [
            'releases' => $result['releases'],
            'repo' => $result['repo'],
            'error' => $result['error'],
        ]);
    }
}
