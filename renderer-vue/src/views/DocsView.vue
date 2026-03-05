<template>
  <div class="docs-content flex-1 overflow-auto">
    <div class="w-full py-8 px-8 text-sm text-rm-text">
      <h2 class="text-xl font-semibold text-rm-text tracking-tight mb-6">Documentation</h2>

      <Accordion v-model:value="activePanel" class="docs-accordion">
        <AccordionPanel value="overview">
          <AccordionHeader class="text-base font-semibold text-rm-text">Overview</AccordionHeader>
          <AccordionContent>
            <p class="m-0 mb-3 text-rm-muted">Shipwell helps you version, tag, and release multiple projects from one place. It supports <strong>npm</strong>, <strong>Rust</strong> (Cargo.toml), <strong>Go</strong> (go.mod), <strong>Python</strong> (pyproject.toml / setup.py), and <strong>PHP</strong> (composer.json). Add project folders, see version and git status, then bump and push or tag-and-push.</p>
          </AccordionContent>
        </AccordionPanel>
        <AccordionPanel value="adding">
          <AccordionHeader class="text-base font-semibold text-rm-text">Adding projects</AccordionHeader>
          <AccordionContent>
            <p class="m-0 mb-2 text-rm-muted">Click <strong>Add project</strong> in the nav and choose a folder that contains one of:</p>
            <ul class="m-0 mb-3 pl-5 text-rm-muted list-disc space-y-1">
              <li><code class="bg-rm-surface px-1 rounded text-xs">package.json</code> (npm/Node)</li>
              <li><code class="bg-rm-surface px-1 rounded text-xs">Cargo.toml</code> (Rust)</li>
              <li><code class="bg-rm-surface px-1 rounded text-xs">go.mod</code> (Go)</li>
              <li><code class="bg-rm-surface px-1 rounded text-xs">pyproject.toml</code> or <code class="bg-rm-surface px-1 rounded text-xs">setup.py</code> (Python)</li>
              <li><code class="bg-rm-surface px-1 rounded text-xs">composer.json</code> (PHP)</li>
            </ul>
            <p class="m-0 text-rm-muted">The app detects the type and shows name and version. Projects are stored in app data; use <strong>Remove</strong> on a project to drop it from the list.</p>
          </AccordionContent>
        </AccordionPanel>
        <AccordionPanel value="detail">
          <AccordionHeader class="text-base font-semibold text-rm-text">Project detail</AccordionHeader>
          <AccordionContent>
            <p class="m-0 mb-3 text-rm-muted">Select a project to see its detail. Use the tabs to switch between sections.</p>
            <ul class="m-0 mb-3 pl-5 text-rm-muted list-disc space-y-1">
              <li><strong>Git</strong> — Branch, ahead/behind, uncommitted files. If there are changes, you can enter a commit message and <strong>Commit</strong> from the app.</li>
              <li><strong>Version &amp; release</strong> — Current version and latest tag. For <strong>npm</strong>: Patch / Minor / Major bump then tag and push. For <strong>Rust, Go, Python, PHP</strong>: <strong>Tag and push</strong> uses the current version in the manifest.</li>
              <li><strong>Sync &amp; download</strong> — <strong>Sync</strong> runs <code class="bg-rm-surface px-1 rounded text-xs font-mono">git fetch</code>. <strong>Download latest</strong> fetches GitHub Release assets for your platform.</li>
            </ul>
            <p class="m-0 mb-2 text-rm-muted">Header actions: <strong>Open in Terminal</strong>, <strong>Open in editor</strong>, <strong>Open in Finder</strong>, <strong>Copy path</strong>, <strong>Remove</strong>.</p>
          </AccordionContent>
        </AccordionPanel>
        <AccordionPanel value="dashboard">
          <AccordionHeader class="text-base font-semibold text-rm-text">Dashboard</AccordionHeader>
          <AccordionContent>
            <p class="m-0 mb-2 text-rm-muted">Click <strong>Dashboard</strong> to see a table of all projects: name, version, latest tag, branch, ahead/behind. Use <strong>Filter</strong> and <strong>Sort</strong>. Click a row to open that project’s detail.</p>
          </AccordionContent>
        </AccordionPanel>
        <AccordionPanel value="settings">
          <AccordionHeader class="text-base font-semibold text-rm-text">Settings</AccordionHeader>
          <AccordionContent>
            <p class="m-0 mb-2 text-rm-muted">Click <strong>Settings</strong> to set a <strong>GitHub token</strong> (optional) and <strong>Ollama</strong> (optional). The token gives higher API limits and the ability to create or update GitHub releases from the app.</p>
          </AccordionContent>
        </AccordionPanel>
        <AccordionPanel value="theme">
          <AccordionHeader class="text-base font-semibold text-rm-text">Theme</AccordionHeader>
          <AccordionContent>
            <p class="m-0 text-rm-muted">Use the <strong>Dark</strong> / <strong>Light</strong> toggle in the nav bar. The choice is saved and applied on next launch.</p>
          </AccordionContent>
        </AccordionPanel>
      </Accordion>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import Accordion from 'primevue/accordion';
import AccordionPanel from 'primevue/accordionpanel';
import AccordionHeader from 'primevue/accordionheader';
import AccordionContent from 'primevue/accordioncontent';

const activePanel = ref('overview');
</script>
