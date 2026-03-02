@extends('layouts.app')

@section('title', 'Download — ' . config('app.name'))

@section('content')
    <h1 class="text-3xl font-bold tracking-tight mb-2">Download</h1>
    <p class="text-[var(--splash-muted)] mb-2">Get the latest version for your platform.</p>
    <p class="text-sm text-amber-400/90 mb-10">Shipwell is currently in <strong>beta</strong> — we’re actively improving it and welcome your feedback.</p>

    @if($error)
        <div class="rounded-lg border border-amber-500/50 bg-amber-500/10 text-amber-200 px-4 py-3 mb-8">
            <p class="font-medium">Could not load releases</p>
            <p class="text-sm mt-1">{{ $error }}</p>
            <p class="text-sm mt-2">Set <code class="font-mono text-xs bg-white/10 px-1 rounded">GITHUB_REPO=owner/repo</code> in <code class="font-mono text-xs bg-white/10 px-1 rounded">.env</code>.</p>
        </div>
    @endif

    @if($latest)
        <div class="rounded-xl border border-[var(--splash-border)] bg-[var(--splash-surface)] overflow-hidden mb-10">
            <div class="px-6 py-4 border-b border-[var(--splash-border)] flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 class="text-xl font-semibold">{{ $latest['name'] ?? $latest['tag_name'] }}</h2>
                    <p class="text-sm text-[var(--splash-muted)] mt-0.5">
                        {{ \Carbon\Carbon::parse($latest['published_at'])->format('M j, Y') }}
                        @if($repo)
                            · <a href="https://github.com/{{ $repo }}/releases/tag/{{ $latest['tag_name'] }}" target="_blank" rel="noopener noreferrer" class="hover:text-[var(--splash-accent)] transition-colors">View on GitHub</a>
                        @endif
                    </p>
                </div>
                <span class="font-mono text-sm px-3 py-1 rounded-lg bg-[var(--splash-bg)] border border-[var(--splash-border)]">{{ $latest['tag_name'] }}</span>
            </div>

            @if(!empty($latest['body']))
                <div class="px-6 py-4 text-[var(--splash-muted)] text-sm leading-relaxed prose prose-invert prose-sm max-w-none">
                    {!! \Illuminate\Support\Str::markdown($latest['body']) !!}
                </div>
            @endif

            @if(!empty($latest['assets']))
                <div class="px-6 py-4 border-t border-[var(--splash-border)] bg-[var(--splash-bg)]/50">
                    <h3 class="text-sm font-medium text-[var(--splash-muted)] mb-3">Downloads</h3>
                    <ul class="space-y-2">
                        @foreach($latest['assets'] as $asset)
                            <li>
                                <a
                                    href="{{ $asset['browser_download_url'] }}"
                                    class="inline-flex items-center gap-3 rounded-lg border border-[var(--splash-border)] bg-[var(--splash-surface)] px-4 py-3 w-full sm:w-auto hover:border-[var(--splash-accent)] hover:bg-[var(--splash-surface)] transition-colors group"
                                >
                                    <svg class="w-5 h-5 text-[var(--splash-muted)] group-hover:text-[var(--splash-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    <span class="font-medium">{{ $asset['name'] }}</span>
                                    @if(isset($asset['size']) && $asset['size'] > 0)
                                        <span class="text-sm text-[var(--splash-muted)]">({{ number_format($asset['size'] / 1024 / 1024, 1) }} MB)</span>
                                    @endif
                                </a>
                            </li>
                        @endforeach
                    </ul>
                </div>
            @else
                <div class="px-6 py-4 border-t border-[var(--splash-border)] text-sm text-[var(--splash-muted)]">
                    No build assets for this release yet.
                    @if($repo)
                        Check <a href="https://github.com/{{ $repo }}/releases/tag/{{ $latest['tag_name'] }}" target="_blank" rel="noopener noreferrer" class="hover:text-[var(--splash-accent)]">GitHub</a> for details.
                    @endif
                </div>
            @endif
        </div>
    @elseif(!$error)
        <div class="rounded-lg border border-[var(--splash-border)] bg-[var(--splash-surface)] px-6 py-8 text-center text-[var(--splash-muted)]">
            <p>No releases found for this repository.</p>
            @if($repo)
                <a href="https://github.com/{{ $repo }}/releases" target="_blank" rel="noopener noreferrer" class="inline-block mt-3 text-[var(--splash-accent)] hover:underline">View on GitHub</a>
            @endif
        </div>
    @endif

    <p class="text-sm text-[var(--splash-muted)]">
        <a href="{{ url('/releases') }}" class="hover:text-[var(--splash-text)] transition-colors">View all releases</a>
    </p>
@endsection
