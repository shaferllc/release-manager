@extends('layouts.app')

@section('title', 'Releases — ' . config('app.name'))

@section('content')
    <h1 class="text-3xl font-bold tracking-tight mb-2">Releases</h1>
    <p class="text-[var(--splash-muted)] mb-10">Version history from GitHub.</p>

    @if($error)
        <div class="rounded-lg border border-amber-500/50 bg-amber-500/10 text-amber-200 px-4 py-3 mb-8">
            <p class="font-medium">Could not load releases</p>
            <p class="text-sm mt-1">{{ $error }}</p>
            <p class="text-sm mt-2">Set <code class="font-mono text-xs bg-white/10 px-1 rounded">GITHUB_REPO=owner/repo</code> in <code class="font-mono text-xs bg-white/10 px-1 rounded">.env</code>.</p>
        </div>
    @endif

    @if(!empty($releases))
        <ul class="space-y-4">
            @foreach($releases as $release)
                <li class="rounded-xl border border-[var(--splash-border)] bg-[var(--splash-surface)] overflow-hidden">
                    <div class="px-6 py-4 flex flex-wrap items-center justify-between gap-4">
                        <div class="min-w-0">
                            <h2 class="text-lg font-semibold truncate">
                                <a href="https://github.com/{{ $repo }}/releases/tag/{{ $release['tag_name'] }}" target="_blank" rel="noopener noreferrer" class="hover:text-[var(--splash-accent)] transition-colors">
                                    {{ $release['name'] ?? $release['tag_name'] }}
                                </a>
                            </h2>
                            <p class="text-sm text-[var(--splash-muted)] mt-0.5">
                                {{ \Carbon\Carbon::parse($release['published_at'])->format('M j, Y') }}
                                @if(!empty($release['assets']))
                                    · {{ count($release['assets']) }} asset{{ count($release['assets']) === 1 ? '' : 's' }}
                                @endif
                            </p>
                        </div>
                        <div class="flex items-center gap-2 shrink-0">
                            <span class="font-mono text-sm px-3 py-1 rounded-lg bg-[var(--splash-bg)] border border-[var(--splash-border)]">{{ $release['tag_name'] }}</span>
                            <a href="{{ url('/download') }}?v={{ $release['tag_name'] }}" class="text-sm font-medium text-[var(--splash-accent)] hover:underline">Download</a>
                        </div>
                    </div>
                    @if(!empty($release['body']))
                        <div class="px-6 py-3 border-t border-[var(--splash-border)] text-[var(--splash-muted)] text-sm leading-relaxed max-h-16 overflow-hidden">
                            {{ \Illuminate\Support\Str::limit(strip_tags(preg_replace('/[#*`\[\]]/', '', $release['body'])), 180) }}
                        </div>
                    @endif
                </li>
            @endforeach
        </ul>

        @if($repo)
            <p class="mt-8 text-sm text-[var(--splash-muted)]">
                <a href="https://github.com/{{ $repo }}/releases" target="_blank" rel="noopener noreferrer" class="hover:text-[var(--splash-text)] transition-colors">View all releases on GitHub</a>
            </p>
        @endif
    @elseif(!$error)
        <div class="rounded-lg border border-[var(--splash-border)] bg-[var(--splash-surface)] px-6 py-8 text-center text-[var(--splash-muted)]">
            <p>No releases found.</p>
            @if($repo)
                <a href="https://github.com/{{ $repo }}/releases" target="_blank" rel="noopener noreferrer" class="inline-block mt-3 text-[var(--splash-accent)] hover:underline">View on GitHub</a>
            @endif
        </div>
    @endif
@endsection
