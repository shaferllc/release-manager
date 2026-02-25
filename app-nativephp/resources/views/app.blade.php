<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Release Manager</title>
  @if (file_exists(public_path('build/manifest.json')) || file_exists(public_path('hot')))
    @vite(['resources/css/app.css', 'resources/js/app.js'])
  @else
    <style>.bg-rm-bg{background:#0a0a0a}.text-rm-text{color:#ededec}.text-rm-muted{color:#a1a09a}.bg-rm-surface{background:#1a1a18}.border-rm-border{border-color:#3e3e3a}.rounded{padding:1rem;border-radius:0.25rem}.nav-bar{display:flex;align-items:center;gap:1rem;padding:0.75rem 1rem;border-bottom:1px solid}.text-rm-accent{color:#7cb8ff}</style>
  @endif
  @stack('styles')
</head>
<body class="bg-rm-bg text-rm-text antialiased">
  <div id="app" class="flex flex-col h-screen">
    {{-- Full UI is loaded from resources/js/app.js and mirrors src-renderer/index.html structure. --}}
    {{-- Agent F: copy src-renderer/index.html body content here and use releaseManagerBridge (see public/js/release-manager-bridge.js). --}}
    <nav class="nav-bar flex items-center justify-between gap-4 px-4 py-3 bg-rm-surface border-b border-rm-border">
      <h1 class="m-0 text-base font-semibold text-rm-text">Release Manager (NativePHP)</h1>
      <a href="{{ url('/api/projects') }}" class="text-sm text-rm-accent">API: projects</a>
    </nav>
    <main class="flex-1 flex min-h-0 p-6">
      <p class="text-rm-muted">
        Multi-agent scaffold is ready. Implement API routes per <code class="bg-rm-surface px-1 rounded">docs/MULTI-AGENT-CONVERSION.md</code> and <code class="bg-rm-surface px-1 rounded">AGENTS-API.md</code>.
        Replace this view with the full UI from <code class="bg-rm-surface px-1 rounded">../src-renderer/index.html</code> and wire JS to <code class="bg-rm-surface px-1 rounded">/api/*</code>.
      </p>
    </main>
  </div>
  <script>
    // Stub: when frontend is copied, use releaseManagerBridge (see README).
    window.releaseManager = window.releaseManager || {
      getProjects: () => fetch('/api/projects').then(r => r.json()).then(d => d.projects),
      getProjectInfo: (path) => fetch('/api/project-info?path=' + encodeURIComponent(path)).then(r => r.json()),
    };
  </script>
  @stack('scripts')
</body>
</html>
