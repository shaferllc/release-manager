<?php

use App\Http\Controllers\Api\AppController;
use App\Http\Controllers\Api\ConfigController;
use App\Http\Controllers\Api\GitController;
use App\Http\Controllers\Api\ProjectsController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Release Manager API (multi-agent conversion)
|--------------------------------------------------------------------------
| All routes return JSON. Request/response shapes documented in AGENTS-API.md.
| Agent ownership: A=Foundation, B=Git, C=GitHub, D=Composer/Release/Tests/Ollama, E=System.
*/

// --- Agent A: Foundation ---
Route::get('/projects', [ProjectsController::class, 'index'])->name('api.projects.index');
Route::post('/projects', [ProjectsController::class, 'store'])->name('api.projects.store');
Route::get('/projects/all-info', [ProjectsController::class, 'allInfo'])->name('api.projects.all-info');
Route::get('/project-info', [ProjectsController::class, 'projectInfo'])->name('api.project-info');
Route::post('/dialog/directory', [ProjectsController::class, 'directoryDialog'])->name('api.dialog.directory');

Route::get('/app-info', [AppController::class, 'info'])->name('api.app-info');
Route::get('/config/theme', [ConfigController::class, 'getTheme'])->name('api.config.theme.get');
Route::post('/config/theme', [ConfigController::class, 'setTheme'])->name('api.config.theme.set');
Route::get('/config/preference', [ConfigController::class, 'getPreference'])->name('api.config.preference.get');
Route::post('/config/preference', [ConfigController::class, 'setPreference'])->name('api.config.preference.set');
Route::get('/config/ollama', [ConfigController::class, 'getOllama'])->name('api.config.ollama.get');
Route::post('/config/ollama', [ConfigController::class, 'setOllama'])->name('api.config.ollama.set');
Route::get('/config/github-token', [ConfigController::class, 'getGithubToken'])->name('api.config.github-token.get');
Route::post('/config/github-token', [ConfigController::class, 'setGithubToken'])->name('api.config.github-token.set');

// --- Agent B: Git ---
Route::get('/git/status', [GitController::class, 'status'])->name('api.git.status');
Route::post('/git/pull', [GitController::class, 'pull'])->name('api.git.pull');
Route::post('/git/fetch', [GitController::class, 'fetch'])->name('api.git.fetch');
Route::post('/git/commit', [GitController::class, 'commit'])->name('api.git.commit');
Route::post('/git/stash-push', [GitController::class, 'stashPush'])->name('api.git.stash-push');
Route::post('/git/stash-pop', [GitController::class, 'stashPop'])->name('api.git.stash-pop');
Route::post('/git/discard', [GitController::class, 'discard'])->name('api.git.discard');
Route::post('/git/merge-abort', [GitController::class, 'mergeAbort'])->name('api.git.merge-abort');
Route::get('/git/recent-commits', [GitController::class, 'recentCommits'])->name('api.git.recent-commits');
Route::get('/git/commits-since-tag', [GitController::class, 'commitsSinceTag'])->name('api.git.commits-since-tag');
Route::get('/git/file-diff', [GitController::class, 'fileDiff'])->name('api.git.file-diff');

// --- Agent C: GitHub ---
Route::get('/github/releases-url', fn () => response()->json(['url' => null]))->name('api.github.releases-url');
Route::get('/github/actions-url', fn () => response()->json(['url' => null]))->name('api.github.actions-url');
Route::get('/github/releases', fn () => response()->json(['ok' => false, 'error' => 'Not implemented', 'releases' => []]))->name('api.github.releases');
Route::post('/github/download-asset', fn () => response()->json(['ok' => false, 'error' => 'Not implemented']))->name('api.github.download-asset');
Route::post('/github/create-release', fn () => response()->json(['ok' => false]))->name('api.github.create-release');

// --- Agent D: Composer, Release, Tests, Ollama ---
Route::get('/composer/info', fn () => response()->json(['ok' => false, 'error' => 'Not implemented']))->name('api.composer.info');
Route::get('/composer/outdated', fn () => response()->json(['ok' => false, 'packages' => []]))->name('api.composer.outdated');
Route::get('/composer/validate', fn () => response()->json(['valid' => false]))->name('api.composer.validate');
Route::get('/composer/audit', fn () => response()->json(['ok' => false, 'advisories' => []]))->name('api.composer.audit');
Route::post('/composer/update', fn () => response()->json(['ok' => false]))->name('api.composer.update');

Route::post('/release/version-bump', fn () => response()->json(['ok' => false]))->name('api.release.version-bump');
Route::post('/release/tag-and-push', fn () => response()->json(['ok' => false]))->name('api.release.tag-and-push');
Route::post('/release/run', fn () => response()->json(['ok' => false]))->name('api.release.run');
Route::get('/release/suggested-bump', fn () => response()->json(['bump' => null]))->name('api.release.suggested-bump');

Route::get('/tests/scripts', fn () => response()->json(['ok' => true, 'scripts' => []]))->name('api.tests.scripts');
Route::post('/tests/run', fn () => response()->json(['ok' => false, 'stdout' => '', 'stderr' => '']))->name('api.tests.run');
Route::post('/tests/coverage', fn () => response()->json(['ok' => false, 'summary' => null]))->name('api.tests.coverage');

Route::get('/ollama/models', fn () => response()->json(['ok' => false, 'models' => [], 'error' => null]))->name('api.ollama.models');
Route::post('/ollama/generate-commit-message', fn () => response()->json(['ok' => false, 'error' => 'Not implemented']))->name('api.ollama.generate-commit-message');
Route::post('/ollama/generate-release-notes', fn () => response()->json(['ok' => false, 'error' => 'Not implemented']))->name('api.ollama.generate-release-notes');

// --- Agent E: System ---
Route::post('/system/copy-to-clipboard', fn () => response()->json(null, 204))->name('api.system.copy-to-clipboard');
Route::post('/system/open-path', fn () => response()->json(['ok' => false]))->name('api.system.open-path');
Route::post('/system/open-terminal', fn () => response()->json(['ok' => false]))->name('api.system.open-terminal');
Route::post('/system/open-editor', fn () => response()->json(['ok' => false]))->name('api.system.open-editor');
Route::post('/system/open-file-in-editor', fn () => response()->json(['ok' => false]))->name('api.system.open-file-in-editor');
Route::post('/system/open-url', fn () => response()->json(null, 204))->name('api.system.open-url');
Route::get('/changelog', fn () => response()->json(['ok' => false, 'error' => 'Not implemented']))->name('api.changelog');
