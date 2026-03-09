import { useAppStore } from '../stores/app';
import { useApi } from './useApi';
import { useLicense } from './useLicense';
import { useNotifications } from './useNotifications';
import { toPlainProjects } from '../utils/plainProjects';
import * as debug from '../utils/debug';

/**
 * Composable for adding projects (directory dialog flow).
 * @param {() => Promise<void>} loadProjects - Callback to reload projects after add
 * @returns { () => void } addProject
 */
export function useAddProject(loadProjects) {
  const store = useAppStore();
  const api = useApi();
  const license = useLicense();
  const notifications = useNotifications();

  function addProject() {
    debug.log('project', 'addProject clicked', {
      hasShowDialog: typeof api.showDirectoryDialog === 'function',
      hasSetProjects: typeof api.setProjects === 'function',
    });
    const maxProjects = license.maxProjects?.value ?? 5;
    if (maxProjects > 0 && store.projects.length >= maxProjects) {
      notifications.add({
        title: 'Project limit reached',
        message: `Your plan allows up to ${maxProjects} projects. Upgrade to add more.`,
        type: 'warn',
      });
      return;
    }
    if (typeof api.showDirectoryDialog !== 'function') {
      debug.warn('project', 'addProject showDirectoryDialog not available – check preload/IPC');
      return;
    }
    const dialogPromise = api.showDirectoryDialog();
    if (!dialogPromise || typeof dialogPromise.then !== 'function') {
      debug.warn('project', 'addProject showDirectoryDialog did not return a promise');
      return;
    }
    dialogPromise
      .then(async (result) => {
        const selectedPath =
          typeof result === 'string'
            ? result
            : Array.isArray(result?.filePaths) && result.filePaths.length > 0
              ? result.filePaths[0]
              : null;
        debug.log('project', 'addProject dialog result', {
          shape: typeof result,
          canceled: typeof result === 'object' ? result?.canceled : undefined,
          raw: result,
          selectedPath,
        });
        if (!selectedPath) return;
        const path = selectedPath;
        const current = store.projects.map((p) => p.path);
        if (current.includes(path)) {
          debug.log('project', 'addProject path already in list, skip');
          return;
        }
        const newEntry = { path, name: path.split(/[/\\]/).pop(), tags: [], starred: false };
        const next = [...store.projects, newEntry];
        debug.log('project', 'addProject optimistic update', { nextLength: next.length, path });
        store.setProjects(next);
        store.setSelectedPath(path);
        if (typeof api.setProjects === 'function') {
          debug.log('project', 'addProject calling api.setProjects', next.length);
          try {
            const result = await api.setProjects(toPlainProjects(next));
            if (result?.limitExceeded) {
              store.setProjects(store.projects.filter((p) => p.path !== path));
              notifications.add({
                title: 'Project limit reached',
                message: `Your plan allows up to ${result.max} projects. Upgrade to add more.`,
                type: 'warn',
              });
              return;
            }
            const persisted = result && result.ok !== false && result.saved != null;
            if (persisted) debug.log('project', 'addProject setProjects persisted', result.saved, 'projects');
            if (typeof api.setPreference === 'function') {
              await api.setPreference('selectedProjectPath', path).catch(() => {});
            }
            await loadProjects();
          } catch (e) {
            debug.warn('project', 'addProject setProjects failed', e?.message ?? e);
          }
        } else {
          debug.warn('project', 'addProject api.setProjects not available');
        }
      })
      .catch((e) => {
        debug.warn('project', 'addProject dialog or flow failed', e?.message ?? e, e);
      });
  }

  return { addProject };
}
