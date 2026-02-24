const projectListEl = document.getElementById('project-list');
const emptyHintEl = document.getElementById('empty-projects-hint');
const noSelectionEl = document.getElementById('no-selection');
const projectDetailEl = document.getElementById('project-detail');
const detailNameEl = document.getElementById('detail-name');
const detailPathEl = document.getElementById('detail-path');
const detailVersionEl = document.getElementById('detail-version');
const detailTagEl = document.getElementById('detail-tag');
const detailAllVersionsWrapEl = document.getElementById('detail-all-versions-wrap');
const detailAllVersionsEl = document.getElementById('detail-all-versions');
const detailAllVersionsEmptyEl = document.getElementById('detail-all-versions-empty');
const detailErrorEl = document.getElementById('detail-error');
const linkReleasesEl = document.getElementById('link-releases');
const releaseStatusEl = document.getElementById('release-status');
const syncDownloadStatusEl = document.getElementById('sync-download-status');
const detailGitStateEl = document.getElementById('detail-git-state');
const detailBranchEl = document.getElementById('detail-branch');
const detailAheadBehindEl = document.getElementById('detail-ahead-behind');
const detailUncommittedWrapEl = document.getElementById('detail-uncommitted-wrap');
const detailUncommittedLabelEl = document.getElementById('detail-uncommitted-label');
const detailUncommittedListEl = document.getElementById('detail-uncommitted-list');
const detailCommitWrapEl = document.getElementById('detail-commit-wrap');
const detailCommitMessageEl = document.getElementById('detail-commit-message');
const detailCommitStatusEl = document.getElementById('detail-commit-status');
const releaseNotesEl = document.getElementById('release-notes');
const releaseDraftEl = document.getElementById('release-draft');
const releasePrereleaseEl = document.getElementById('release-prerelease');
const releaseActionsWrapEl = document.getElementById('release-actions-wrap');
const releaseActionsLinkEl = document.getElementById('release-actions-link');
const githubTokenEl = document.getElementById('github-token');
const dashboardViewEl = document.getElementById('dashboard-view');
const dashboardFilterEl = document.getElementById('dashboard-filter');
const dashboardSortEl = document.getElementById('dashboard-sort');
const dashboardTbodyEl = document.getElementById('dashboard-tbody');
const batchReleaseBarEl = document.getElementById('batch-release-bar');
const modalPickReleaseEl = document.getElementById('modal-pick-release');
const modalPickReleaseListEl = document.getElementById('modal-pick-release-list');
const modalPickReleaseStatusEl = document.getElementById('modal-pick-release-status');
const modalPickAssetEl = document.getElementById('modal-pick-asset');
const modalPickAssetListEl = document.getElementById('modal-pick-asset-list');

let projects = [];
let selectedPath = null;
let currentInfo = null;
let viewMode = 'detail';
let dashboardData = [];
let selectedPaths = new Set();

function applyTheme(effective) {
  document.documentElement.setAttribute('data-theme', effective || 'dark');
  document.getElementById('theme-dark')?.classList.toggle('is-active', effective === 'dark');
  document.getElementById('theme-light')?.classList.toggle('is-active', effective === 'light');
}

async function initTheme() {
  const { effective } = await window.releaseManager.getTheme();
  applyTheme(effective);
  window.releaseManager.onTheme(applyTheme);
  document.getElementById('theme-dark')?.addEventListener('click', () => window.releaseManager.setTheme('dark'));
  document.getElementById('theme-light')?.addEventListener('click', () => window.releaseManager.setTheme('light'));
}

function renderProjectList() {
  projectListEl.innerHTML = '';
  if (projects.length === 0) {
    emptyHintEl.classList.remove('hidden');
    batchReleaseBarEl.classList.add('hidden');
    return;
  }
  emptyHintEl.classList.add('hidden');
  projects.forEach((p) => {
    const li = document.createElement('li');
    li.className = `project-list-item flex items-center gap-1.5 rounded-rm px-3 py-2 text-sm cursor-pointer transition-colors group ${selectedPath === p.path ? 'bg-rm-accent/20 text-rm-accent font-medium' : 'text-rm-text hover:bg-rm-surface-hover'}`;
    li.dataset.path = p.path;
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'batch-checkbox shrink-0 cursor-pointer';
    cb.checked = selectedPaths.has(p.path);
    cb.addEventListener('click', (e) => e.stopPropagation());
    cb.addEventListener('change', () => {
      if (cb.checked) selectedPaths.add(p.path);
      else selectedPaths.delete(p.path);
      batchReleaseBarEl.classList.toggle('hidden', selectedPaths.size < 2);
      const countEl = document.getElementById('batch-release-count');
      if (countEl) countEl.textContent = selectedPaths.size;
    });
    li.appendChild(cb);
    const name = p.name || (p.path && p.path.split(/[/\\]/).filter(Boolean).pop()) || 'Project';
    const label = document.createElement('span');
    label.className = 'flex-1 min-w-0 truncate';
    label.textContent = name;
    label.title = p.path;
    li.appendChild(label);
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'project-remove-btn p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-rm-surface-hover text-rm-muted hover:text-rm-text transition-opacity border-none cursor-pointer shrink-0';
    removeBtn.title = 'Remove from list';
    removeBtn.setAttribute('aria-label', 'Remove from list');
    removeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const projectName = p.name || p.path.split(/[/\\]/).filter(Boolean).pop() || 'this project';
      if (!confirm(`Remove "${projectName}" from the list?`)) return;
      removeProject(p.path);
    });
    li.appendChild(removeBtn);
    li.addEventListener('click', (e) => { if (!e.target.classList.contains('batch-checkbox')) selectProject(p.path); });
    projectListEl.appendChild(li);
  });
  batchReleaseBarEl.classList.toggle('hidden', selectedPaths.size < 2);
  const countEl = document.getElementById('batch-release-count');
  if (countEl) countEl.textContent = selectedPaths.size;
}

function showNoSelection() {
  viewMode = 'detail';
  dashboardViewEl.classList.add('hidden');
  noSelectionEl.classList.remove('hidden');
  projectDetailEl.classList.add('hidden');
}

function showDetail() {
  viewMode = 'detail';
  dashboardViewEl.classList.add('hidden');
  noSelectionEl.classList.add('hidden');
  projectDetailEl.classList.remove('hidden');
}

function showDashboard() {
  viewMode = 'dashboard';
  noSelectionEl.classList.add('hidden');
  projectDetailEl.classList.add('hidden');
  dashboardViewEl.classList.remove('hidden');
  loadDashboard();
}

function needsRelease(row) {
  const a = row.ahead != null && row.ahead > 0;
  const u = row.uncommittedLines && row.uncommittedLines.length > 0;
  return a || u;
}

async function loadDashboard() {
  const filter = dashboardFilterEl?.value || 'all';
  const sort = dashboardSortEl?.value || 'name';
  const raw = await window.releaseManager.getAllProjectsInfo();
  dashboardData = raw.map((r) => ({
    ...r,
    needsRelease: needsRelease(r),
  }));
  let rows = filter === 'needs-release' ? dashboardData.filter((r) => r.needsRelease) : dashboardData;
  if (sort === 'needs-release') {
    rows = [...rows].sort((a, b) => (b.needsRelease ? 1 : 0) - (a.needsRelease ? 1 : 0) || (a.name || '').localeCompare(b.name || ''));
  } else {
    rows = [...rows].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }
  dashboardTbodyEl.innerHTML = '';
  rows.forEach((row) => {
    const tr = document.createElement('tr');
    tr.className = 'dashboard-row cursor-pointer';
    tr.dataset.path = row.path;
    const ab = formatAheadBehind(row.ahead, row.behind);
    tr.innerHTML = `
      <td class="py-2 pr-3 font-medium text-rm-text">${escapeHtml(row.name || '—')}</td>
      <td class="py-2 pr-3 font-mono text-sm text-rm-muted">${escapeHtml(row.version || '—')}</td>
      <td class="py-2 pr-3 font-mono text-sm text-rm-muted">${escapeHtml(row.latestTag || '—')}</td>
      <td class="py-2 pr-3 text-rm-muted">${escapeHtml(row.branch || '—')}</td>
      <td class="py-2 pr-3 text-rm-muted">${ab || '—'}</td>
    `;
    tr.addEventListener('click', () => selectProject(row.path));
    dashboardTbodyEl.appendChild(tr);
  });
}

function escapeHtml(s) {
  if (s == null) return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function formatAheadBehind(ahead, behind) {
  const parts = [];
  if (ahead != null && ahead > 0) parts.push(`${ahead} ahead`);
  if (behind != null && behind > 0) parts.push(`${behind} behind`);
  return parts.length ? parts.join(', ') : null;
}

function setDetailContent(info, releasesUrl = null) {
  currentInfo = info;
  if (!info || !info.ok) {
    detailNameEl.textContent = '—';
    detailPathEl.textContent = selectedPath || '';
    detailVersionEl.textContent = '—';
    detailTagEl.textContent = '—';
    detailGitStateEl.classList.add('hidden');
    detailAllVersionsWrapEl?.classList.add('hidden');
    detailErrorEl.classList.add('hidden');
    linkReleasesEl.classList.add('hidden');
    if (releaseNotesEl) releaseNotesEl.value = '';
    return;
  }
  if (releaseNotesEl) releaseNotesEl.value = '';
  detailNameEl.textContent = info.name || '—';
  detailPathEl.textContent = info.path || '';
  detailVersionEl.textContent = info.version || '—';
  detailTagEl.textContent = info.latestTag || 'none';
  const allTags = info.allTags || [];
  if (detailAllVersionsWrapEl) {
    detailAllVersionsWrapEl.classList.toggle('hidden', !info.hasGit);
    if (info.hasGit) {
      if (detailAllVersionsEmptyEl) {
        detailAllVersionsEmptyEl.classList.toggle('hidden', allTags.length > 0);
      }
      if (detailAllVersionsEl) {
        detailAllVersionsEl.innerHTML = '';
        const tagUrlBase = releasesUrl ? releasesUrl.replace(/\/?$/, '') + '/tag/' : null;
        allTags.forEach((tag) => {
          const li = document.createElement('li');
          li.className = 'flex items-center gap-2 flex-wrap font-mono text-sm';
          if (tagUrlBase) {
            const a = document.createElement('a');
            a.href = tagUrlBase + encodeURIComponent(tag);
            a.className = 'text-rm-accent hover:underline';
            a.textContent = tag;
            a.target = '_blank';
            a.rel = 'noopener';
            a.onclick = (e) => {
              e.preventDefault();
              window.releaseManager.openUrl(a.href);
            };
            li.appendChild(a);
            const downloadBtn = document.createElement('button');
            downloadBtn.type = 'button';
            downloadBtn.className = 'text-xs text-rm-muted hover:text-rm-accent border-none bg-transparent cursor-pointer p-0';
            downloadBtn.textContent = 'Download';
            downloadBtn.addEventListener('click', (e) => {
              e.preventDefault();
              openDownloadForTag(tag);
            });
            li.appendChild(downloadBtn);
          } else {
            li.textContent = tag;
          }
          detailAllVersionsEl.appendChild(li);
        });
      }
    }
  }
  if (info.hasGit) {
    detailGitStateEl.classList.remove('hidden');
    detailBranchEl.textContent = info.branch ? `Branch: ${info.branch}` : 'Branch: —';
    const ab = formatAheadBehind(info.ahead, info.behind);
    detailAheadBehindEl.textContent = ab || 'Up to date';
    detailAheadBehindEl.classList.toggle('text-rm-muted', !ab);
    const lines = info.uncommittedLines || [];
    if (detailUncommittedLabelEl) {
      detailUncommittedLabelEl.textContent =
        lines.length > 0 ? `Uncommitted changes (${lines.length})` : 'Working tree clean';
      detailUncommittedLabelEl.classList.toggle('text-rm-warning', lines.length > 0);
      detailUncommittedLabelEl.classList.toggle('text-rm-muted', lines.length === 0);
    }
    if (detailUncommittedListEl) {
      detailUncommittedListEl.innerHTML = '';
      lines.forEach((line) => {
        const path = line.length > 3 ? line.slice(3).trim() : line;
        const li = document.createElement('li');
        li.className = 'truncate';
        li.title = path;
        li.textContent = path;
        detailUncommittedListEl.appendChild(li);
      });
    }
    if (detailCommitWrapEl) {
      detailCommitWrapEl.classList.toggle('hidden', lines.length === 0);
      if (lines.length === 0 && detailCommitMessageEl) detailCommitMessageEl.value = '';
      if (detailCommitStatusEl) {
        detailCommitStatusEl.textContent = '';
        detailCommitStatusEl.classList.add('hidden');
      }
    }
  } else {
    detailGitStateEl.classList.add('hidden');
  }
  if (info.gitRemote && releasesUrl) {
    linkReleasesEl.classList.remove('hidden');
    linkReleasesEl.href = releasesUrl;
    linkReleasesEl.onclick = (e) => {
      e.preventDefault();
      window.releaseManager.openUrl(releasesUrl);
    };
  } else {
    linkReleasesEl.classList.add('hidden');
  }
  detailErrorEl.classList.add('hidden');
}

async function loadProjectInfo(dirPath) {
  try {
    const info = await window.releaseManager.getProjectInfo(dirPath);
    let releasesUrl = null;
    if (info.ok && info.gitRemote) {
      releasesUrl = await window.releaseManager.getReleasesUrl(info.gitRemote);
    }
    setDetailContent(info, releasesUrl);
  } catch (e) {
    setDetailContent({ ok: false, error: e.message });
    detailErrorEl.textContent = e.message || 'Failed to load project';
    detailErrorEl.classList.remove('hidden');
  }
}

function selectProject(path) {
  selectedPath = path;
  renderProjectList();
  showDetail();
  setDetailContent(null);
  loadProjectInfo(path);
}

async function addProject() {
  const dirPath = await window.releaseManager.showDirectoryDialog();
  if (!dirPath) return;
  const info = await window.releaseManager.getProjectInfo(dirPath);
  if (!info.ok) {
    alert(info.error || 'Invalid project folder');
    return;
  }
  const name = info.name || dirPath.split(/[/\\]/).filter(Boolean).pop();
  if (projects.some((p) => p.path === dirPath)) return;
  projects.push({ path: dirPath, name });
  await window.releaseManager.setProjects(projects);
  renderProjectList();
  selectProject(dirPath);
}

function removeProject(path) {
  projects = projects.filter((p) => p.path !== path);
  window.releaseManager.setProjects(projects);
  renderProjectList();
  if (selectedPath === path) {
    selectedPath = projects.length ? projects[0].path : null;
    if (selectedPath) selectProject(selectedPath);
    else showNoSelection();
  }
}

async function release(bump, force = false) {
  if (!selectedPath) return;
  if (!force) {
    const status = await window.releaseManager.getGitStatus(selectedPath);
    if (!status.clean) {
      const go = confirm('Uncommitted changes. Commit or stash them before releasing.\n\nRelease anyway?');
      if (!go) return;
      force = true;
    }
  }
  const releaseNotes = releaseNotesEl?.value?.trim() || null;
  const draft = releaseDraftEl?.checked === true;
  const prereleaseChecked = releasePrereleaseEl?.checked === true;
  const prerelease = prereleaseChecked || bump === 'prerelease';
  const options = {
    releaseNotes: releaseNotes || undefined,
    draft,
    prerelease,
  };
  if (githubTokenEl?.value?.trim()) {
    await window.releaseManager.setGitHubToken(githubTokenEl.value.trim());
  }
  releaseStatusEl.textContent = 'Bumping version, then committing and pushing…';
  releaseStatusEl.classList.remove('hidden');
  releaseActionsWrapEl?.classList.add('hidden');
  detailErrorEl.classList.add('hidden');
  try {
    const result = await window.releaseManager.release(selectedPath, bump, force, options);
    if (result.ok) {
      let msg = `Released ${result.tag}.`;
      if (result.releaseError) msg += ` (GitHub release: ${result.releaseError})`;
      else msg += ' GitHub Actions will build and publish.';
      releaseStatusEl.textContent = msg;
      releaseStatusEl.classList.add('text-rm-success');
      if (result.actionsUrl && releaseActionsLinkEl) {
        releaseActionsLinkEl.href = result.actionsUrl;
        releaseActionsLinkEl.onclick = (e) => {
          e.preventDefault();
          window.releaseManager.openUrl(result.actionsUrl);
        };
        releaseActionsWrapEl?.classList.remove('hidden');
      }
      loadProjectInfo(selectedPath);
    } else {
      releaseStatusEl.textContent = '';
      releaseStatusEl.classList.add('hidden');
      releaseStatusEl.classList.remove('text-rm-success');
      detailErrorEl.textContent = result.error || 'Release failed';
      detailErrorEl.classList.remove('hidden');
    }
  } catch (e) {
    releaseStatusEl.classList.add('hidden');
    releaseStatusEl.classList.remove('text-rm-success');
    detailErrorEl.textContent = e.message || 'Release failed';
    detailErrorEl.classList.remove('hidden');
  }
}

async function syncFromRemote() {
  if (!selectedPath) return;
  syncDownloadStatusEl.textContent = 'Fetching…';
  syncDownloadStatusEl.classList.remove('hidden', 'text-rm-success');
  detailErrorEl.classList.add('hidden');
  try {
    const result = await window.releaseManager.syncFromRemote(selectedPath);
    if (result.ok) {
      syncDownloadStatusEl.textContent = 'Synced.';
      syncDownloadStatusEl.classList.add('text-rm-success');
      loadProjectInfo(selectedPath);
    } else {
      syncDownloadStatusEl.textContent = result.error || 'Sync failed';
      syncDownloadStatusEl.classList.remove('text-rm-success');
    }
  } catch (e) {
    syncDownloadStatusEl.textContent = e.message || 'Sync failed';
    syncDownloadStatusEl.classList.remove('text-rm-success');
  }
}

async function downloadLatestRelease() {
  if (!selectedPath || !currentInfo?.ok || !currentInfo.gitRemote) {
    syncDownloadStatusEl.textContent = 'Select a project with a GitHub remote.';
    syncDownloadStatusEl.classList.remove('hidden', 'text-rm-success');
    return;
  }
  syncDownloadStatusEl.textContent = 'Fetching release list…';
  syncDownloadStatusEl.classList.remove('hidden', 'text-rm-success');
  detailErrorEl.classList.add('hidden');
  try {
    const result = await window.releaseManager.downloadLatestRelease(currentInfo.gitRemote);
    if (result.canceled) {
      syncDownloadStatusEl.textContent = 'Canceled.';
      return;
    }
    if (result.ok) {
      syncDownloadStatusEl.textContent = `Saved to ${result.filePath}`;
      syncDownloadStatusEl.classList.add('text-rm-success');
    } else {
      syncDownloadStatusEl.textContent = result.error || 'Download failed';
      syncDownloadStatusEl.classList.remove('text-rm-success');
    }
  } catch (e) {
    syncDownloadStatusEl.textContent = e.message || 'Download failed';
    syncDownloadStatusEl.classList.remove('text-rm-success');
  }
}

document.getElementById('btn-add-project').addEventListener('click', addProject);
document.getElementById('btn-remove-project').addEventListener('click', () => {
  if (!selectedPath) return;
  const p = projects.find((x) => x.path === selectedPath);
  const projectName = p?.name || selectedPath.split(/[/\\]/).filter(Boolean).pop() || 'this project';
  if (!confirm(`Remove "${projectName}" from the list?`)) return;
  removeProject(selectedPath);
});
document.getElementById('btn-open-in-finder').addEventListener('click', () => {
  if (selectedPath) window.releaseManager.openPathInFinder(selectedPath);
});
document.getElementById('btn-copy-path').addEventListener('click', () => {
  if (selectedPath) {
    window.releaseManager.copyToClipboard(selectedPath);
    document.getElementById('btn-copy-path')?.setAttribute('title', 'Copied!');
    showCopyFeedback('copy-path-feedback', 'btn-copy-path', 'Copy path');
  }
});
function showCopyFeedback(feedbackId, buttonId, resetTitle) {
  const el = document.getElementById(feedbackId);
  if (el) {
    el.classList.remove('hidden');
    setTimeout(() => {
      el.classList.add('hidden');
      const btn = document.getElementById(buttonId);
      if (btn) btn.setAttribute('title', resetTitle);
    }, 1200);
  }
}

document.getElementById('btn-copy-version').addEventListener('click', () => {
  if (currentInfo?.ok && currentInfo.version) {
    window.releaseManager.copyToClipboard(currentInfo.version);
    document.getElementById('btn-copy-version')?.setAttribute('title', 'Copied!');
    showCopyFeedback('copy-version-feedback', 'btn-copy-version', 'Copy version');
  }
});
document.getElementById('btn-copy-tag').addEventListener('click', () => {
  if (currentInfo?.ok && currentInfo.latestTag) {
    window.releaseManager.copyToClipboard(currentInfo.latestTag);
    document.getElementById('btn-copy-tag')?.setAttribute('title', 'Copied!');
    showCopyFeedback('copy-tag-feedback', 'btn-copy-tag', 'Copy tag');
  }
});
document.getElementById('btn-commit').addEventListener('click', async () => {
  if (!selectedPath) return;
  const message = detailCommitMessageEl?.value?.trim();
  if (!message) {
    if (detailCommitStatusEl) {
      detailCommitStatusEl.textContent = 'Enter a commit message.';
      detailCommitStatusEl.classList.remove('hidden');
      detailCommitStatusEl.classList.remove('text-rm-success');
    }
    return;
  }
  if (detailCommitStatusEl) {
    detailCommitStatusEl.textContent = 'Committing…';
    detailCommitStatusEl.classList.remove('hidden');
    detailCommitStatusEl.classList.remove('text-rm-success');
  }
  try {
    const result = await window.releaseManager.commitChanges(selectedPath, message);
    if (result?.ok) {
      detailCommitStatusEl.textContent = 'Committed.';
      detailCommitStatusEl.classList.add('text-rm-success');
      if (detailCommitMessageEl) detailCommitMessageEl.value = '';
      loadProjectInfo(selectedPath);
    } else {
      detailCommitStatusEl.textContent = result?.error || 'Commit failed';
      detailCommitStatusEl.classList.remove('text-rm-success');
    }
  } catch (e) {
    detailCommitStatusEl.textContent = e.message || 'Commit failed';
    detailCommitStatusEl.classList.remove('text-rm-success');
  }
});

document.getElementById('btn-load-commits').addEventListener('click', async () => {
  if (!selectedPath || !currentInfo?.ok) return;
  const sinceTag = currentInfo.latestTag || null;
  try {
    const result = await window.releaseManager.getCommitsSinceTag(selectedPath, sinceTag);
    if (result && result.ok && result.commits && result.commits.length) {
      releaseNotesEl.value = result.commits.join('\n');
    } else if (result && result.ok) {
      releaseNotesEl.value = '(no commits since last tag)';
    } else {
      releaseNotesEl.value = (result && result.error) ? result.error : 'Could not load commits. Try restarting the app.';
    }
  } catch (e) {
    releaseNotesEl.value = 'Could not load commits. Quit and restart the app, then try again.';
  }
});

document.getElementById('btn-release-patch').addEventListener('click', () => release('patch'));
document.getElementById('btn-release-minor').addEventListener('click', () => release('minor'));
document.getElementById('btn-release-major').addEventListener('click', () => release('major'));
document.getElementById('btn-release-prerelease').addEventListener('click', () => release('prerelease'));

githubTokenEl.addEventListener('blur', () => {
  window.releaseManager.setGitHubToken(githubTokenEl.value?.trim() ?? '');
});

document.getElementById('btn-sync').addEventListener('click', syncFromRemote);
document.getElementById('btn-download-latest').addEventListener('click', downloadLatestRelease);

document.getElementById('btn-view-dashboard').addEventListener('click', () => {
  if (viewMode === 'dashboard') return;
  showDashboard();
});
dashboardFilterEl?.addEventListener('change', () => loadDashboard());
dashboardSortEl?.addEventListener('change', () => loadDashboard());
document.getElementById('btn-dashboard-refresh').addEventListener('click', () => loadDashboard());

async function runBatchRelease(bump) {
  const paths = Array.from(selectedPaths);
  if (paths.length < 2) return;
  const names = paths.map((p) => projects.find((x) => x.path === p)?.name || p.split(/[/\\]/).filter(Boolean).pop() || p);
  const ok = confirm(`Release (${bump}) for ${paths.length} projects?\n\n${names.join('\n')}`);
  if (!ok) return;
  const results = [];
  for (const dirPath of paths) {
    try {
      const result = await window.releaseManager.release(dirPath, bump, false, {});
      results.push({ path: dirPath, ok: result?.ok, tag: result?.tag, error: result?.error });
    } catch (e) {
      results.push({ path: dirPath, ok: false, error: e.message });
    }
  }
  const succeeded = results.filter((r) => r.ok).length;
  alert(`Done. ${succeeded}/${paths.length} succeeded.`);
  selectedPaths.clear();
  renderProjectList();
  if (viewMode === 'dashboard') loadDashboard();
  else if (selectedPath) loadProjectInfo(selectedPath);
}
document.getElementById('btn-batch-patch').addEventListener('click', () => runBatchRelease('patch'));
document.getElementById('btn-batch-minor').addEventListener('click', () => runBatchRelease('minor'));
document.getElementById('btn-batch-major').addEventListener('click', () => runBatchRelease('major'));

async function openDownloadForTag(tagName) {
  if (!currentInfo?.ok || !currentInfo.gitRemote) {
    syncDownloadStatusEl.textContent = 'Select a project with a GitHub remote.';
    syncDownloadStatusEl.classList.remove('hidden');
    return;
  }
  try {
    const result = await window.releaseManager.getGitHubReleases(currentInfo.gitRemote);
    if (!result.ok || !result.releases?.length) {
      syncDownloadStatusEl.textContent = result.error || 'No releases found.';
      syncDownloadStatusEl.classList.remove('hidden');
      return;
    }
    const release = result.releases.find((r) => r.tag_name === tagName);
    if (!release) {
      syncDownloadStatusEl.textContent = `Release ${tagName} not found on GitHub.`;
      syncDownloadStatusEl.classList.remove('hidden');
      return;
    }
    const assets = release.assets || [];
    if (assets.length === 0) {
      syncDownloadStatusEl.textContent = 'No assets for this release.';
      syncDownloadStatusEl.classList.remove('hidden');
      return;
    }
    modalPickAssetListEl.innerHTML = '';
    assets.forEach((asset) => {
      const aLi = document.createElement('li');
      aLi.className = 'modal-list-item';
      aLi.textContent = asset.name + (asset.size ? ` (${(asset.size / 1024 / 1024).toFixed(2)} MB)` : '');
      aLi.dataset.url = asset.browser_download_url || '';
      aLi.dataset.name = asset.name || 'download';
      aLi.addEventListener('click', async () => {
        modalPickAssetEl.classList.add('hidden');
        const r = await window.releaseManager.downloadAsset(aLi.dataset.url, aLi.dataset.name);
        if (r?.ok) syncDownloadStatusEl.textContent = `Saved to ${r.filePath}`;
        else if (!r?.canceled) syncDownloadStatusEl.textContent = r?.error || 'Download failed';
        syncDownloadStatusEl.classList.remove('hidden');
      });
      modalPickAssetListEl.appendChild(aLi);
    });
    modalPickAssetEl.classList.remove('hidden');
  } catch (e) {
    syncDownloadStatusEl.textContent = e.message || 'Failed to load release.';
    syncDownloadStatusEl.classList.remove('hidden');
  }
}

async function openChooseVersionModal() {
  if (!currentInfo?.ok || !currentInfo.gitRemote) {
    syncDownloadStatusEl.textContent = 'Select a project with a GitHub remote.';
    syncDownloadStatusEl.classList.remove('hidden');
    return;
  }
  modalPickReleaseEl.classList.remove('hidden');
  modalPickReleaseStatusEl.textContent = 'Loading releases…';
  modalPickReleaseListEl.innerHTML = '';
  try {
    const result = await window.releaseManager.getGitHubReleases(currentInfo.gitRemote);
    modalPickReleaseStatusEl.textContent = '';
    if (!result.ok || !result.releases?.length) {
      modalPickReleaseStatusEl.textContent = result.error || 'No releases found';
      return;
    }
    result.releases.forEach((rel) => {
      const li = document.createElement('li');
      li.className = 'modal-list-item';
      li.textContent = rel.tag_name + (rel.name && rel.name !== rel.tag_name ? ` — ${rel.name}` : '');
      li.dataset.tag = rel.tag_name;
      li.dataset.assets = JSON.stringify(rel.assets || []);
      li.addEventListener('click', () => {
        const assets = JSON.parse(li.dataset.assets || '[]');
        modalPickReleaseEl.classList.add('hidden');
        if (assets.length === 0) {
          syncDownloadStatusEl.textContent = 'No assets for this release.';
          syncDownloadStatusEl.classList.remove('hidden');
          return;
        }
        modalPickAssetListEl.innerHTML = '';
        assets.forEach((asset) => {
          const aLi = document.createElement('li');
          aLi.className = 'modal-list-item';
          aLi.textContent = asset.name + (asset.size ? ` (${(asset.size / 1024 / 1024).toFixed(2)} MB)` : '');
          aLi.dataset.url = asset.browser_download_url || '';
          aLi.dataset.name = asset.name || 'download';
          aLi.addEventListener('click', async () => {
            modalPickAssetEl.classList.add('hidden');
            const r = await window.releaseManager.downloadAsset(aLi.dataset.url, aLi.dataset.name);
            if (r?.ok) syncDownloadStatusEl.textContent = `Saved to ${r.filePath}`;
            else if (!r?.canceled) syncDownloadStatusEl.textContent = r?.error || 'Download failed';
            syncDownloadStatusEl.classList.remove('hidden');
          });
          modalPickAssetListEl.appendChild(aLi);
        });
        modalPickAssetEl.classList.remove('hidden');
      });
      modalPickReleaseListEl.appendChild(li);
    });
  } catch (e) {
    modalPickReleaseStatusEl.textContent = e.message || 'Failed to load releases';
  }
}
document.getElementById('btn-choose-version').addEventListener('click', openChooseVersionModal);
document.getElementById('modal-pick-release-close').addEventListener('click', () => {
  if (confirm('Close without choosing a release?')) modalPickReleaseEl.classList.add('hidden');
});
document.getElementById('modal-pick-asset-close').addEventListener('click', () => {
  if (confirm('Close without downloading?')) modalPickAssetEl.classList.add('hidden');
});

const COLLAPSED_STORAGE_KEY = 'release-manager-collapsed-sections';

function initCollapsibleSections() {
  let saved = {};
  try {
    const raw = localStorage.getItem(COLLAPSED_STORAGE_KEY);
    if (raw) saved = JSON.parse(raw);
  } catch (_) {}
  document.querySelectorAll('.collapsible-card').forEach((card) => {
    const section = card.dataset.section;
    const bodyId = card.querySelector('.collapsible-card-body')?.id;
    const header = card.querySelector('.collapsible-card-header');
    const collapsed = saved[section] === true;
    if (collapsed) {
      card.classList.add('is-collapsed');
      if (header) header.setAttribute('aria-expanded', 'false');
    } else {
      card.classList.remove('is-collapsed');
      if (header) header.setAttribute('aria-expanded', 'true');
    }
    if (header && bodyId) {
      header.setAttribute('aria-controls', bodyId);
      header.addEventListener('click', () => {
        const isCollapsed = card.classList.toggle('is-collapsed');
        header.setAttribute('aria-expanded', String(!isCollapsed));
        try {
          const current = JSON.parse(localStorage.getItem(COLLAPSED_STORAGE_KEY) || '{}');
          current[section] = isCollapsed;
          localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(current));
        } catch (_) {}
      });
    }
  });
}

async function init() {
  await initTheme();
  initCollapsibleSections();
  projects = await window.releaseManager.getProjects();
  renderProjectList();
  if (projects.length > 0 && !selectedPath) {
    selectProject(projects[0].path);
  } else if (selectedPath) {
    selectProject(selectedPath);
  } else {
    showNoSelection();
  }
}

init();
