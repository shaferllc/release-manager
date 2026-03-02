<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>@yield('title', config('app.name'))</title>
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=dm-sans:400,500,600,700|jetbrains-mono:400,500" rel="stylesheet" />
    @if (file_exists(public_path('build/manifest.json')) || file_exists(public_path('hot')))
        @vite(['resources/css/app.css', 'resources/js/app.js'])
    @else
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
            tailwind.config = { theme: { extend: { fontFamily: { sans: ['DM Sans', 'system-ui', 'sans-serif'], mono: ['JetBrains Mono', 'monospace'] } } } }
        </script>
    @endif
    <style>
        :root {
            --splash-bg: #0f0f0f;
            --splash-surface: #1a1a1a;
            --splash-border: #2a2a2a;
            --splash-text: #fafafa;
            --splash-muted: #a1a1aa;
            --splash-accent: #22c55e;
            --splash-accent-hover: #16a34a;
        }
        body { font-family: 'DM Sans', system-ui, sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
    </style>
</head>
<body class="min-h-screen bg-[var(--splash-bg)] text-[var(--splash-text)] antialiased">
    <div class="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" aria-hidden="true"></div>

    <nav class="relative z-20 border-b border-[var(--splash-border)]">
        <div class="max-w-4xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
            <a href="{{ url('/') }}" class="font-semibold text-[var(--splash-text)] hover:text-[var(--splash-accent)] transition-colors">{{ config('app.name') }}</a>
            <span class="font-mono text-[10px] uppercase tracking-wider text-amber-400/90 border border-amber-400/40 rounded px-1.5 py-0.5 ml-2 align-middle">Beta</span>
            <div class="flex items-center gap-6 text-sm">
                <a href="{{ url('/download') }}" class="text-[var(--splash-muted)] hover:text-[var(--splash-text)] transition-colors">Download</a>
                <a href="{{ url('/releases') }}" class="text-[var(--splash-muted)] hover:text-[var(--splash-text)] transition-colors">Releases</a>
                @if(config('github.repo'))
                    <a href="https://github.com/{{ config('github.repo') }}" target="_blank" rel="noopener noreferrer" class="text-[var(--splash-muted)] hover:text-[var(--splash-text)] transition-colors">GitHub</a>
                @endif
            </div>
        </div>
    </nav>

    <main class="relative z-10 max-w-4xl mx-auto px-6 py-12">
        @yield('content')
    </main>

    <footer class="relative z-10 border-t border-[var(--splash-border)] mt-16">
        <div class="max-w-4xl mx-auto px-6 py-6 text-sm text-[var(--splash-muted)]">
            <a href="{{ url('/') }}" class="hover:text-[var(--splash-text)] transition-colors">{{ config('app.name') }}</a> — ship with confidence. <span class="text-amber-400/80">Beta.</span>
        </div>
    </footer>
</body>
</html>
