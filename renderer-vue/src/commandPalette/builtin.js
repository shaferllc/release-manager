/**
 * Registers built-in commands for the command palette.
 * @param {object} context
 * @param {import('pinia').Store} context.store - App store (useAppStore())
 * @param {() => void} context.onRefresh - Refresh current project
 * @param {() => void} context.onAddProject - Open add-project flow
 * @param {() => Promise<void>} [context.onSyncAll] - Sync all projects
 */

import { registerCommand } from './registry';

const BUILTIN_IDS = [
  'app.go-to-project',
  'app.go-to-dashboard',
  'app.go-to-settings',
  'app.go-to-extensions',
  'app.go-to-docs',
  'app.go-to-changelog',
  'app.go-to-api',
  'app.refresh',
  'app.add-project',
  'app.sync-all',
  'app.setup-wizard',
];

export function registerBuiltinCommands(context) {
  const { store, onRefresh, onAddProject, onSyncAll, openSetupWizard } = context;

  registerCommand({
    id: 'app.go-to-project',
    label: 'Go to Project (detail)',
    category: 'Navigation',
    run: () => store.setViewMode('detail'),
  });

  registerCommand({
    id: 'app.go-to-dashboard',
    label: 'Go to Dashboard',
    category: 'Navigation',
    run: () => store.setViewMode('dashboard'),
  });

  registerCommand({
    id: 'app.go-to-settings',
    label: 'Go to Settings',
    category: 'Navigation',
    icon: 'pi pi-cog',
    run: () => store.setViewMode('settings'),
  });

  registerCommand({
    id: 'app.go-to-extensions',
    label: 'Go to Extensions',
    category: 'Navigation',
    run: () => store.setViewMode('extensions'),
  });

  registerCommand({
    id: 'app.go-to-docs',
    label: 'Go to Documentation',
    category: 'Navigation',
    run: () => store.setViewMode('docs'),
  });

  registerCommand({
    id: 'app.go-to-changelog',
    label: 'Go to Changelog',
    category: 'Navigation',
    run: () => store.setViewMode('changelog'),
  });

  registerCommand({
    id: 'app.go-to-api',
    label: 'Go to API docs',
    category: 'Navigation',
    run: () => store.setViewMode('api'),
  });

  registerCommand({
    id: 'app.refresh',
    label: 'Refresh current project',
    category: 'Project',
    icon: 'pi pi-refresh',
    run: () => onRefresh?.(),
  });

  registerCommand({
    id: 'app.add-project',
    label: 'Add a project',
    category: 'Project',
    icon: 'pi pi-plus',
    run: () => onAddProject?.(),
  });

  registerCommand({
    id: 'app.sync-all',
    label: 'Sync all projects from Git',
    category: 'Project',
    run: () => onSyncAll?.(),
  });

  registerCommand({
    id: 'app.setup-wizard',
    label: 'Open setup wizard',
    category: 'General',
    icon: 'pi pi-list',
    description: 'Walk through adding projects, Git, tests, and extensions',
    run: () => openSetupWizard?.(),
  });
}

export { BUILTIN_IDS };
