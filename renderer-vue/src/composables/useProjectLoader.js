import { ref } from 'vue';
import { useAppStore } from '../stores/app';
import { useApi } from './useApi';
import { useNotifications } from './useNotifications';
import { useExtensionPrefs } from './useExtensionPrefs';
import * as debug from '../utils/debug';

const LOAD_PROJECTS_MAX_RETRIES = 2;

/**
 * Composable for loading and syncing projects.
 * Handles getProjects, getAllProjectsInfo merge, preference restoration, and retries.
 * @param {object} options
 * @param {() => Promise<void>} [options.runWithOverlay] - Optional overlay wrapper
 * @returns { { loadProjects: () => Promise<void>, onModalRefresh: () => Promise<void>, onRefresh: () => void, syncAllProjects: (navBarRef?: { finishSync?: () => void }) => Promise<void>, syncExtensions: () => Promise<void> } }
 */
export function useProjectLoader(options = {}) {
  const { runWithOverlay = (fn) => fn() } = options;
  const store = useAppStore();
  const api = useApi();
  const notifications = useNotifications();

  let loadProjectsRetryCount = 0;

  async function syncExtensions() {
    try {
      const result = await api.syncPlanExtensions?.();
      if (result?.installed > 0) {
        notifications.add({
          title: 'Extensions synced',
          message: `${result.installed} extension${result.installed > 1 ? 's' : ''} installed. Restart the app to load them.`,
          type: 'success',
        });
      }
      if (Array.isArray(result?.disabledSlugs) && result.disabledSlugs.length > 0) {
        const extPrefs = useExtensionPrefs();
        extPrefs.applyWebState(result.disabledSlugs.map((s) => ({ slug: s, enabled: false })));
      }
    } catch (_) {}
  }

  async function loadProjects() {
    debug.log('project', 'loadProjects start');
    try {
      if (typeof api.getProjects !== 'function') {
        debug.warn('project', 'loadProjects api.getProjects not ready, retry', loadProjectsRetryCount + 1);
        if (loadProjectsRetryCount < LOAD_PROJECTS_MAX_RETRIES) {
          loadProjectsRetryCount += 1;
          setTimeout(() => loadProjects(), 150);
        }
        return;
      }
      loadProjectsRetryCount = 0;

      debug.log('project', 'loadProjects calling api.getProjects()');
      const list = await api.getProjects();
      const projects = Array.isArray(list) ? list : [];
      debug.log('project', 'loadProjects getProjects result', { count: projects.length, isArray: Array.isArray(list) });
      const willUpdate = projects.length > 0 || store.projects.length === 0;
      debug.log('project', 'loadProjects store.setProjects?', { willUpdate, currentLength: store.projects.length });
      if (willUpdate) {
        store.setProjects(projects);
        debug.log('project', 'loadProjects store.setProjects done', store.projects.length);
      }

      if (projects.length > 0 && api.getAllProjectsInfo) {
        try {
          debug.log('project', 'loadProjects calling getAllProjectsInfo');
          const allInfo = await api.getAllProjectsInfo();
          debug.log('project', 'loadProjects getAllProjectsInfo result', { count: allInfo?.length ?? 0 });
          if (Array.isArray(allInfo) && allInfo.length > 0) {
            const merged = projects.map((p) => {
              const info = allInfo.find((r) => r && r.path === p.path);
              if (!info) return p;
              return {
                ...p,
                ...info,
                tags: p.tags,
                starred: p.starred,
                phpPath: p.phpPath,
                githubToken: p.githubToken,
              };
            });
            store.setProjects(merged);
            debug.log('project', 'loadProjects merged setProjects', merged.length);
          }
        } catch (e) {
          debug.warn('project', 'loadProjects getAllProjectsInfo failed', e?.message ?? e);
        }
      }

      const savedPath = await api.getPreference?.('selectedProjectPath').catch(() => null);
      const savedView = await api.getPreference?.('state.viewMode').catch(() => null);
      const savedDetailTab = await api.getPreference?.('state.detailTab').catch(() => null);
      const detailTabByProject = await api.getPreference?.('detailTabByProject').catch(() => null);
      const rememberLastDetailTab = await api.getPreference?.('rememberLastDetailTab').catch(() => true);
      const normPath = (p) => (p && typeof p === 'string' ? p.trim().replace(/[/\\]+$/, '') : '');
      const pathStillInList = typeof savedPath === 'string' && savedPath && store.projects.some((p) => normPath(p.path) === normPath(savedPath));
      if (pathStillInList) store.setSelectedPath(savedPath);
      else if (store.projects.length > 0 && !store.selectedPath) store.setSelectedPath(store.projects[0].path);
      else store.setSelectedPath(null);
      if (savedView && ['detail', 'dashboard', 'settings', 'extensions', 'docs', 'changelog', 'api'].includes(savedView)) store.setViewMode(savedView);
      const effectivePath = pathStillInList ? savedPath : (store.selectedPath || '');
      const perProjectTab = rememberLastDetailTab && detailTabByProject && typeof detailTabByProject === 'object' && effectivePath ? detailTabByProject[effectivePath] : null;
      const tabToUse = (typeof perProjectTab === 'string' && perProjectTab) ? perProjectTab : (typeof savedDetailTab === 'string' && savedDetailTab ? savedDetailTab : null);
      if (tabToUse) store.setDetailTab(tabToUse);

      const behaviorPrefs = await Promise.all([
        api.getPreference?.('projectSortOrder').catch(() => null),
        api.getPreference?.('confirmDestructiveActions').catch(() => null),
        api.getPreference?.('confirmBeforeDiscard').catch(() => null),
        api.getPreference?.('confirmBeforeForcePush').catch(() => null),
        api.getPreference?.('openLinksInExternalBrowser').catch(() => null),
        api.getPreference?.('sidebarWidthLocked').catch(() => null),
        api.getPreference?.('compactSidebar').catch(() => null),
        api.getPreference?.('showProjectPathInSidebar').catch(() => null),
        api.getPreference?.('rememberLastDetailTab').catch(() => null),
        api.getPreference?.('debugBarVisible').catch(() => null),
        api.getPreference?.('notifyOnRelease').catch(() => null),
        api.getPreference?.('notifyOnSyncComplete').catch(() => null),
      ]).catch(() => []);
      const [ps, cda, cbd, cbfp, oleb, swl, cs, sps, rldt, dbv, nor, nosc] = behaviorPrefs;
      if (ps != null) store.setProjectSortOrder(ps);
      if (cda != null) store.setConfirmDestructiveActions(cda);
      if (cbd != null) store.setConfirmBeforeDiscard(cbd);
      if (cbfp != null) store.setConfirmBeforeForcePush(cbfp);
      if (oleb != null) store.setOpenLinksInExternalBrowser(oleb);
      if (swl != null) store.setSidebarWidthLocked(swl);
      if (cs != null) store.setCompactSidebar(cs);
      if (sps != null) store.setShowProjectPathInSidebar(sps);
      if (rldt != null) store.setRememberLastDetailTab(rldt);
      if (dbv != null) store.setDebugBarVisible(dbv);
      if (nor != null) store.setNotifyOnRelease(nor);
      if (nosc != null) store.setNotifyOnSyncComplete(nosc);
      if (store.selectedPath) {
        const current = store.projects.find((p) => p.path === store.selectedPath);
        if (current) store.setCurrentInfo(current);
      }
      debug.log('project', 'loadProjects done', { projectsLength: store.projects.length, selectedPath: store.selectedPath });
    } catch (e) {
      debug.warn('project', 'loadProjects FAILED', e?.message ?? e, e);
      if (loadProjectsRetryCount < LOAD_PROJECTS_MAX_RETRIES) {
        loadProjectsRetryCount += 1;
        setTimeout(() => loadProjects(), 300);
      }
    }
  }

  async function onModalRefresh() {
    await runWithOverlay(
      (async () => {
        await loadProjects();
        if (store.selectedPath) {
          const current = store.projects.find((p) => p.path === store.selectedPath);
          if (current) store.setCurrentInfo(current);
          else if (api.getProjectInfo) {
            try {
              const info = await api.getProjectInfo(store.selectedPath);
              store.setCurrentInfo(info);
            } catch (_) {}
          }
        }
      })(),
    );
  }

  function onRefresh() {
    debug.log('nav', 'onRefresh triggered');
    loadProjectsRetryCount = 0;
    runWithOverlay(loadProjects());
  }

  async function syncAllProjects(navBarRef) {
    const list = store.projects || [];
    if (!list.length) return;
    try {
      for (const p of list) {
        if (!p?.path) continue;
        try {
          if (api.syncFromRemote) await api.syncFromRemote(p.path);
          else if (api.gitFetch) await api.gitFetch(p.path);
        } catch (e) {
          debug.warn('git', 'syncAll.projectFailed', p.path, e?.message ?? e);
        }
      }
      await onModalRefresh();
      try {
        await api.syncProjectsToShipwell?.();
        await api.syncReleasesToShipwell?.();
      } catch (_) {}
      syncExtensions();
      if (store.notifyOnSyncComplete) {
        notifications.add({ title: 'Sync complete', message: 'Projects synced.', type: 'success', systemNotification: store.notifyOnSyncComplete });
      }
    } catch (e) {
      debug.warn('git', 'syncAll.failed', e?.message ?? e);
      if (store.notifyOnSyncComplete) {
        notifications.add({ title: 'Sync failed', message: e?.message || 'Project sync failed.', type: 'error', systemNotification: store.notifyOnSyncComplete });
      }
    } finally {
      navBarRef?.value?.finishSync?.();
    }
  }

  return {
    loadProjects,
    onModalRefresh,
    onRefresh,
    syncAllProjects,
    syncExtensions,
  };
}
