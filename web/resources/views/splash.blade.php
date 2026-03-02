<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ config('app.name') }}</title>
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=dm-sans:400,500,600,700|jetbrains-mono:400,500" rel="stylesheet" />
    @if (file_exists(public_path('build/manifest.json')) || file_exists(public_path('hot')))
        @vite(['resources/css/app.css', 'resources/js/app.js'])
    @else
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
            tailwind.config = {
                theme: {
                    extend: {
                        fontFamily: {
                            sans: ['DM Sans', 'system-ui', 'sans-serif'],
                            mono: ['JetBrains Mono', 'monospace'],
                        },
                    },
                },
            }
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
<body class="min-h-screen bg-[var(--splash-bg)] text-[var(--splash-text)] antialiased flex flex-col items-center justify-center px-6 overflow-hidden">
    {{-- Subtle grid background --}}
    <div class="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" aria-hidden="true"></div>

    <main class="relative z-10 text-center max-w-2xl mx-auto">
        {{-- Badge --}}
        <p class="font-mono text-xs uppercase tracking-widest text-[var(--splash-muted)] mb-6">Desktop app · Beta</p>

        <h1 class="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4">
            Shipwell
        </h1>
        <p class="inline-block font-mono text-xs uppercase tracking-wider text-amber-400/90 border border-amber-400/40 rounded px-2.5 py-1 mb-4">Beta</p>

        <p class="text-lg sm:text-xl text-[var(--splash-muted)] mb-10 max-w-lg mx-auto leading-relaxed">
            Manage releases for all your app projects. Version bumps, changelogs, and shipping—from one place.
        </p>

        <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
                href="{{ url('/download') }}"
                class="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg font-medium bg-[var(--splash-accent)] text-[var(--splash-bg)] hover:bg-[var(--splash-accent-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--splash-accent)] focus:ring-offset-2 focus:ring-offset-[var(--splash-bg)]"
            >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
            </a>
            <a
                href="{{ config('github.repo') ? 'https://github.com/' . config('github.repo') : 'https://github.com' }}"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg font-medium border border-[var(--splash-border)] text-[var(--splash-text)] hover:bg-[var(--splash-surface)] transition-colors focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-[var(--splash-bg)]"
            >
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd" />
                </svg>
                GitHub
            </a>
        </div>

        <p class="mt-8 text-sm text-[var(--splash-muted)]">
            macOS · Windows · Linux
        </p>
    </main>

    <footer class="relative z-10 mt-24 text-sm text-[var(--splash-muted)]">
        <p>{{ config('app.name') }} — ship with confidence.</p>
    </footer>
</body>
</html>
