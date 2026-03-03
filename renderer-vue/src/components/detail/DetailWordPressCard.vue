<template>
  <section class="card mb-6 collapsible-card detail-tab-panel flex flex-col min-h-0" data-detail-tab="wordpress" :class="{ 'is-collapsed': collapsed }">
    <div class="collapsible-card-header-row">
      <button type="button" class="collapsible-card-header" :aria-expanded="!collapsed" @click="toggle">
        <span class="collapsible-card-title">WordPress</span>
        <button type="button" class="doc-trigger p-1 rounded-rm text-rm-muted hover:text-rm-accent hover:bg-rm-surface-hover border-0 bg-transparent cursor-pointer text-xs font-normal shrink-0 ml-1" title="Documentation" aria-label="Documentation" @click.stop="openDocs">(i)</button>
        <svg class="collapsible-card-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
    </div>
    <div class="collapsible-card-body flex flex-col flex-1 min-h-0">
      <div class="detail-wp-layout flex flex-1 min-h-[320px] min-w-0">
        <aside class="detail-wp-sidebar shrink-0 border-r border-rm-border bg-rm-bg-elevated/50 flex flex-col overflow-hidden" :style="wpSidebarStyle">
          <div class="p-2 border-b border-rm-border shrink-0">
            <span class="text-[10px] font-semibold text-rm-muted uppercase tracking-wider">Sections</span>
          </div>
          <nav class="flex-1 overflow-y-auto py-2 min-h-0">
            <button
              v-for="opt in wpSectionOptions"
              :key="opt.id"
              type="button"
              class="detail-wp-sidebar-btn w-full text-left px-3 py-2 text-sm rounded-none border-0 bg-transparent cursor-pointer flex items-center gap-2"
              :class="selectedSection === opt.id ? 'text-rm-accent bg-rm-accent/10 font-medium' : 'text-rm-muted hover:text-rm-text hover:bg-rm-surface-hover'"
              @click="selectedSection = opt.id"
            >
              <span v-if="opt.icon" class="shrink-0 w-4 h-4 inline-block" v-html="opt.icon" aria-hidden="true"></span>
              <span class="truncate">{{ opt.label }}</span>
            </button>
          </nav>
        </aside>
        <button type="button" class="detail-sidebar-resizer shrink-0 border-0 bg-transparent hover:bg-rm-accent/20 active:bg-rm-accent/30 transition-colors self-stretch" aria-label="Resize sidebar" @pointerdown="onWpSidebarResize" />
        <div class="detail-wp-content flex-1 min-w-0 overflow-auto p-4 border-l border-rm-border">
          <template v-if="selectedSection === 'overview'">
            <h3 class="text-sm font-semibold text-rm-text mb-2">Overview</h3>
            <p class="text-sm text-rm-muted m-0 mb-3">This project is detected as a WordPress site (wp-config.php or wp-includes present).</p>
            <ul class="text-sm text-rm-muted list-disc pl-5 space-y-1 m-0">
              <li><strong class="text-rm-text">Plugins</strong> — List and manage plugins (wp-content/plugins).</li>
              <li><strong class="text-rm-text">Themes</strong> — List and manage themes (wp-content/themes).</li>
              <li><strong class="text-rm-text">WP-CLI</strong> — Run WP-CLI commands if installed.</li>
              <li><strong class="text-rm-text">Config</strong> — View wp-config.php (DB name, prefix, etc.).</li>
              <li><strong class="text-rm-text">Database</strong> — Quick links for DB tools.</li>
              <li><strong class="text-rm-text">Links</strong> — Handy links (admin, docs, repo).</li>
            </ul>
          </template>
          <template v-else-if="selectedSection === 'plugins'">
            <h3 class="text-sm font-semibold text-rm-text mb-2">Plugins</h3>
            <p class="text-sm text-rm-muted m-0">Plugin list and management. (Add <code class="bg-rm-surface px-1 rounded text-xs">wp-content/plugins</code> directory listing or WP-CLI <code class="bg-rm-surface px-1 rounded text-xs">wp plugin list</code> here.)</p>
          </template>
          <template v-else-if="selectedSection === 'themes'">
            <h3 class="text-sm font-semibold text-rm-text mb-2">Themes</h3>
            <p class="text-sm text-rm-muted m-0">Theme list and management. (Add <code class="bg-rm-surface px-1 rounded text-xs">wp-content/themes</code> listing or WP-CLI <code class="bg-rm-surface px-1 rounded text-xs">wp theme list</code> here.)</p>
          </template>
          <template v-else-if="selectedSection === 'wpcli'">
            <h3 class="text-sm font-semibold text-rm-text mb-2">WP-CLI</h3>
            <p class="text-sm text-rm-muted m-0 mb-2">Run WP-CLI commands from the project root. Requires <a href="https://wp-cli.org/" target="_blank" rel="noopener" class="text-rm-accent hover:underline">WP-CLI</a> installed.</p>
            <p class="text-sm text-rm-muted m-0">Use the inline terminal (Git tab → Terminal) and run <code class="bg-rm-surface px-1 rounded text-xs">wp &lt;command&gt;</code> from this project path.</p>
          </template>
          <template v-else-if="selectedSection === 'config'">
            <h3 class="text-sm font-semibold text-rm-text mb-2">Config</h3>
            <p class="text-sm text-rm-muted m-0">View or edit wp-config.php. (Add file viewer for wp-config.php here, with sensitive values masked if desired.)</p>
          </template>
          <template v-else-if="selectedSection === 'database'">
            <h3 class="text-sm font-semibold text-rm-text mb-2">Database</h3>
            <p class="text-sm text-rm-muted m-0">Database connection info comes from wp-config.php. Use WP-CLI <code class="bg-rm-surface px-1 rounded text-xs">wp db</code> or your preferred DB tool (TablePlus, Sequel Ace, etc.) with the credentials from config.</p>
          </template>
          <template v-else-if="selectedSection === 'links'">
            <h3 class="text-sm font-semibold text-rm-text mb-2">Links</h3>
            <ul class="text-sm text-rm-muted list-none p-0 m-0 space-y-2">
              <li><span class="text-rm-muted">wp-admin</span> — Open your site’s <code class="bg-rm-surface px-1 rounded text-xs">/wp-admin</code> in the browser (e.g. <code class="bg-rm-surface px-1 rounded text-xs">http://localhost/wordpress/wp-admin</code>).</li>
              <li><a href="https://developer.wordpress.org/" target="_blank" rel="noopener" class="text-rm-accent hover:underline">WordPress Developer Resources</a></li>
              <li><a href="https://wp-cli.org/" target="_blank" rel="noopener" class="text-rm-accent hover:underline">WP-CLI documentation</a></li>
            </ul>
          </template>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue';
import { useAppStore } from '../../stores/app';
import { useModals } from '../../composables/useModals';
import { useCollapsible } from '../../composables/useCollapsible';
import { useResizableSidebar } from '../../composables/useResizableSidebar';

const props = defineProps({ info: { type: Object, default: null } });

const store = useAppStore();
const modals = useModals();
const { sidebarStyle: wpSidebarStyle, onResizerPointerDown: onWpSidebarResize } = useResizableSidebar({
  preferenceKey: 'detailSidebarWidthWordPress',
  defaultWidth: 192,
  minWidth: 160,
  maxWidth: 320,
});
const { collapsed, toggle } = useCollapsible('wordpress');
const selectedSection = ref('overview');

const wpSectionIcon = (id) => {
  const size = 'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"';
  const icons = {
    overview: `<svg ${size}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
    plugins: `<svg ${size}><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/></svg>`,
    themes: `<svg ${size}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>`,
    wpcli: `<svg ${size}><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`,
    config: `<svg ${size}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
    database: `<svg ${size}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`,
    links: `<svg ${size}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  };
  return icons[id] || '';
};

const wpSectionOptions = [
  { id: 'overview', label: 'Overview' },
  { id: 'plugins', label: 'Plugins' },
  { id: 'themes', label: 'Themes' },
  { id: 'wpcli', label: 'WP-CLI' },
  { id: 'config', label: 'Config' },
  { id: 'database', label: 'Database' },
  { id: 'links', label: 'Links' },
].map((opt) => ({ ...opt, icon: wpSectionIcon(opt.id) }));

function openDocs() {
  modals.openModal('docs', { docKey: 'wordpress' });
}
</script>

<style scoped>
.detail-wp-sidebar-btn { border-left: 2px solid transparent; }
.detail-wp-sidebar-btn.text-rm-accent { border-left-color: var(--rm-accent); }
</style>
