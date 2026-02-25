const projectListEl = document.getElementById('project-list');
const emptyHintEl = document.getElementById('empty-projects-hint');
const noSelectionEl = document.getElementById('no-selection');
const projectDetailEl = document.getElementById('project-detail');
const detailNameEl = document.getElementById('detail-name');
const detailPathEl = document.getElementById('detail-path');
const detailVersionEl = document.getElementById('detail-version');
const detailTagEl = document.getElementById('detail-tag');
const detailUnreleasedCommitsEl = document.getElementById('detail-unreleased-commits');
const detailProjectTypeEl = document.getElementById('detail-project-type');
const detailReleaseHintEl = document.getElementById('detail-release-hint');
const detailReleaseBumpButtonsEl = document.getElementById('detail-release-bump-buttons');
const detailReleaseTagOnlyWrapEl = document.getElementById('detail-release-tag-only-wrap');
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
const settingsViewEl = document.getElementById('settings-view');
const docsViewEl = document.getElementById('docs-view');
const changelogViewEl = document.getElementById('changelog-view');
const changelogContentEl = document.getElementById('changelog-content');
const changelogErrorEl = document.getElementById('changelog-error');
const viewDropdownWrapEl = document.getElementById('view-dropdown-wrap');
const viewDropdownBtnEl = document.getElementById('view-dropdown-btn');
const viewDropdownLabelEl = document.getElementById('view-dropdown-label');
const viewDropdownMenuEl = document.getElementById('view-dropdown-menu');

const VIEW_LABELS = { detail: 'Project', dashboard: 'Dashboard', settings: 'Settings', docs: 'Documentation', changelog: 'Changelog' };
const settingsGithubTokenEl = document.getElementById('settings-github-token');
const dashboardFilterEl = document.getElementById('dashboard-filter');
const dashboardSortEl = document.getElementById('dashboard-sort');
const dashboardTbodyEl = document.getElementById('dashboard-tbody');
const batchReleaseBarEl = document.getElementById('batch-release-bar');
const modalPickReleaseEl = document.getElementById('modal-pick-release');
const modalPickReleaseListEl = document.getElementById('modal-pick-release-list');
const modalPickReleaseStatusEl = document.getElementById('modal-pick-release-status');
const modalPickAssetEl = document.getElementById('modal-pick-asset');
const modalPickAssetListEl = document.getElementById('modal-pick-asset-list');
const detailRecentCommitsWrapEl = document.getElementById('detail-recent-commits-wrap');
const detailRecentCommitsEl = document.getElementById('detail-recent-commits');
const detailBumpSuggestionEl = document.getElementById('detail-bump-suggestion');

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

function setViewDropdown(mode) {
  const value = mode || 'detail';
  if (viewDropdownLabelEl) viewDropdownLabelEl.textContent = VIEW_LABELS[value] || VIEW_LABELS.detail;
  if (viewDropdownMenuEl) {
    viewDropdownMenuEl.querySelectorAll('.view-dropdown-option').forEach((el) => {
      el.setAttribute('aria-selected', el.dataset.value === value);
    });
  }
}

function closeViewDropdown() {
  if (viewDropdownMenuEl) viewDropdownMenuEl.classList.add('hidden');
  if (viewDropdownBtnEl) viewDropdownBtnEl.setAttribute('aria-expanded', 'false');
}

function openViewDropdown() {
  if (viewDropdownMenuEl) viewDropdownMenuEl.classList.remove('hidden');
  if (viewDropdownBtnEl) viewDropdownBtnEl.setAttribute('aria-expanded', 'true');
}

function applyViewChoice(value) {
  closeViewDropdown();
  if (value === 'dashboard') showDashboard();
  else if (value === 'settings') showSettings();
  else if (value === 'docs') showDocs();
  else if (value === 'changelog') showChangelog();
  else if (value === 'detail') (selectedPath ? showDetail() : showNoSelection());
}

function showNoSelection() {
  viewMode = 'detail';
  setViewDropdown(null);
  dashboardViewEl.classList.add('hidden');
  settingsViewEl?.classList.add('hidden');
  docsViewEl?.classList.add('hidden');
  changelogViewEl?.classList.add('hidden');
  noSelectionEl.classList.remove('hidden');
  projectDetailEl.classList.add('hidden');
}

function showDetail() {
  viewMode = 'detail';
  setViewDropdown(null);
  dashboardViewEl.classList.add('hidden');
  settingsViewEl?.classList.add('hidden');
  docsViewEl?.classList.add('hidden');
  changelogViewEl?.classList.add('hidden');
  noSelectionEl.classList.add('hidden');
  projectDetailEl.classList.remove('hidden');
}

function showDashboard() {
  viewMode = 'dashboard';
  setViewDropdown('dashboard');
  settingsViewEl?.classList.add('hidden');
  docsViewEl?.classList.add('hidden');
  changelogViewEl?.classList.add('hidden');
  noSelectionEl.classList.add('hidden');
  projectDetailEl.classList.add('hidden');
  dashboardViewEl.classList.remove('hidden');
  loadDashboard();
}

async function showSettings() {
  viewMode = 'settings';
  setViewDropdown('settings');
  dashboardViewEl.classList.add('hidden');
  docsViewEl?.classList.add('hidden');
  changelogViewEl?.classList.add('hidden');
  noSelectionEl.classList.add('hidden');
  projectDetailEl.classList.add('hidden');
  settingsViewEl?.classList.remove('hidden');
  const token = await window.releaseManager.getGitHubToken();
  if (settingsGithubTokenEl) settingsGithubTokenEl.value = token || '';
  const ollama = await window.releaseManager.getOllamaSettings();
  const ollamaBaseUrlEl = document.getElementById('settings-ollama-base-url');
  const ollamaModelEl = document.getElementById('settings-ollama-model');
  if (ollamaBaseUrlEl) ollamaBaseUrlEl.value = ollama?.baseUrl || '';
  if (ollamaModelEl) ollamaModelEl.value = ollama?.model || '';
}

function showDocs() {
  viewMode = 'docs';
  setViewDropdown('docs');
  dashboardViewEl.classList.add('hidden');
  settingsViewEl?.classList.add('hidden');
  changelogViewEl?.classList.add('hidden');
  noSelectionEl.classList.add('hidden');
  projectDetailEl.classList.add('hidden');
  docsViewEl?.classList.remove('hidden');
}

async function showChangelog() {
  viewMode = 'changelog';
  setViewDropdown('changelog');
  dashboardViewEl.classList.add('hidden');
  settingsViewEl?.classList.add('hidden');
  docsViewEl?.classList.add('hidden');
  noSelectionEl.classList.add('hidden');
  projectDetailEl.classList.add('hidden');
  changelogViewEl?.classList.remove('hidden');
  if (changelogErrorEl) changelogErrorEl.classList.add('hidden');
  if (changelogContentEl) changelogContentEl.innerHTML = '<span class="text-rm-muted">Loading…</span>';
  try {
    const result = await window.releaseManager.getChangelog();
    if (result?.ok && changelogContentEl) {
      changelogContentEl.innerHTML = result.content;
      changelogContentEl.classList.remove('hidden');
    } else if (changelogErrorEl) {
      changelogErrorEl.textContent = result?.error || 'Could not load changelog.';
      changelogErrorEl.classList.remove('hidden');
      if (changelogContentEl) changelogContentEl.innerHTML = '';
    }
  } catch (e) {
    if (changelogErrorEl) {
      changelogErrorEl.textContent = e.message || 'Could not load changelog.';
      changelogErrorEl.classList.remove('hidden');
    }
    if (changelogContentEl) changelogContentEl.innerHTML = '';
  }
}

function needsRelease(row) {
  const a = row.ahead != null && row.ahead > 0;
  const u = row.uncommittedLines && row.uncommittedLines.length > 0;
  const unreleased = row.commitsSinceLatestTag != null && row.commitsSinceLatestTag > 0;
  return a || u || unreleased;
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
    const unreleased = row.commitsSinceLatestTag != null && row.commitsSinceLatestTag > 0
      ? `${row.commitsSinceLatestTag} commit${row.commitsSinceLatestTag === 1 ? '' : 's'}`
      : '—';
    tr.innerHTML = `
      <td class="py-2 pr-3 font-medium text-rm-text">${escapeHtml(row.name || '—')}</td>
      <td class="py-2 pr-3 font-mono text-sm text-rm-muted">${escapeHtml(row.version || '—')}</td>
      <td class="py-2 pr-3 font-mono text-sm text-rm-muted">${escapeHtml(row.latestTag || '—')}</td>
      <td class="py-2 pr-3 text-rm-muted">${escapeHtml(unreleased)}</td>
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
    detailRecentCommitsWrapEl?.classList.add('hidden');
    detailErrorEl.classList.add('hidden');
    linkReleasesEl.classList.add('hidden');
    if (releaseNotesEl) releaseNotesEl.value = '';
    return;
  }
  if (releaseNotesEl) releaseNotesEl.value = '';
  const project = projects.find((p) => p.path === selectedPath);
  if (githubTokenEl) githubTokenEl.value = (project?.githubToken && typeof project.githubToken === 'string' ? project.githubToken : '') || '';
  detailNameEl.textContent = info.name || '—';
  detailPathEl.textContent = info.path || '';
  detailVersionEl.textContent = info.version ?? '—';
  detailTagEl.textContent = info.latestTag || 'none';
  if (detailUnreleasedCommitsEl) {
    const n = info.commitsSinceLatestTag;
    if (n != null && n > 0 && info.latestTag) {
      detailUnreleasedCommitsEl.textContent = `${n} unreleased commit${n === 1 ? '' : 's'} since ${info.latestTag}`;
      detailUnreleasedCommitsEl.classList.remove('hidden');
      detailUnreleasedCommitsEl.classList.add('text-rm-warning');
      detailUnreleasedCommitsEl.classList.remove('text-rm-muted');
    } else {
      detailUnreleasedCommitsEl.textContent = '';
      detailUnreleasedCommitsEl.classList.add('hidden');
      detailUnreleasedCommitsEl.classList.remove('text-rm-warning');
      detailUnreleasedCommitsEl.classList.add('text-rm-muted');
    }
  }
  const projectType = info.projectType || 'npm';
  const projectTypeLabel = { npm: '', cargo: 'Rust', go: 'Go', python: 'Python' }[projectType] || '';
  if (detailProjectTypeEl) {
    detailProjectTypeEl.textContent = projectTypeLabel ? `(${projectTypeLabel})` : '';
    detailProjectTypeEl.classList.toggle('hidden', !projectTypeLabel);
  }
  const isNonNpm = projectType !== 'npm';
  if (detailReleaseHintEl) {
    detailReleaseHintEl.textContent = isNonNpm
      ? 'Tag and push current version from your manifest. With a GitHub token you can add notes, draft, or pre-release.'
      : 'Bump version, tag vX.Y.Z, push. With a GitHub token you can add notes, draft, or pre-release.';
  }
  if (detailReleaseBumpButtonsEl) detailReleaseBumpButtonsEl.classList.toggle('hidden', isNonNpm);
  if (detailReleaseTagOnlyWrapEl) detailReleaseTagOnlyWrapEl.classList.toggle('hidden', !isNonNpm);
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
          li.className = 'flex items-center gap-3 flex-wrap font-mono text-sm py-0.5';
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
  if (info.ok && selectedPath && info.hasGit) {
    loadRecentCommitsHint(selectedPath);
  } else {
    detailRecentCommitsWrapEl?.classList.add('hidden');
    if (detailBumpSuggestionEl) {
      detailBumpSuggestionEl.classList.add('hidden');
      detailBumpSuggestionEl.textContent = '';
    }
  }
}

async function loadRecentCommitsHint(dirPath) {
  try {
    const result = await window.releaseManager.getRecentCommits(dirPath, 7);
    if (selectedPath !== dirPath) return;
    if (!detailRecentCommitsWrapEl || !detailRecentCommitsEl) return;
    if (!result.ok || !result.commits?.length) {
      detailRecentCommitsWrapEl.classList.add('hidden');
      if (detailBumpSuggestionEl) {
        detailBumpSuggestionEl.classList.add('hidden');
        detailBumpSuggestionEl.textContent = '';
      }
      return;
    }
    detailRecentCommitsEl.innerHTML = '';
    result.commits.slice(0, 7).forEach((subject) => {
      const li = document.createElement('li');
      li.className = 'truncate';
      li.title = subject;
      li.textContent = subject;
      detailRecentCommitsEl.appendChild(li);
    });
    detailRecentCommitsWrapEl.classList.remove('hidden');
    const suggested = await window.releaseManager.getSuggestedBump(result.commits);
    if (selectedPath !== dirPath) return;
    if (detailBumpSuggestionEl) {
      if (suggested) {
        detailBumpSuggestionEl.textContent = `Suggested bump: ${suggested} (from conventional commits)`;
        detailBumpSuggestionEl.classList.remove('hidden');
      } else {
        detailBumpSuggestionEl.textContent = '';
        detailBumpSuggestionEl.classList.add('hidden');
      }
    }
  } catch (_) {
    if (selectedPath === dirPath) detailRecentCommitsWrapEl?.classList.add('hidden');
  }
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
  const optionsWithToken = { ...options };
  const projectToken = githubTokenEl?.value?.trim();
  if (projectToken) optionsWithToken.githubToken = projectToken;
  releaseStatusEl.textContent = 'Bumping version, then committing and pushing…';
  releaseStatusEl.classList.remove('hidden');
  releaseActionsWrapEl?.classList.add('hidden');
  detailErrorEl.classList.add('hidden');
  try {
    const result = await window.releaseManager.release(selectedPath, bump, force, optionsWithToken);
    if (result.ok) {
      let msg = `Tag ${result.tag} created and pushed.`;
      if (result.releaseError) msg += ` GitHub release note: ${result.releaseError}`;
      else msg += ' GitHub Actions will build and attach the DMG (and other installers) to the release.';
      releaseStatusEl.textContent = msg;
      releaseStatusEl.classList.add('text-rm-success');
      if (result.actionsUrl && releaseActionsLinkEl) {
        releaseActionsLinkEl.href = result.actionsUrl;
        releaseActionsLinkEl.textContent = 'Open Actions (workflow builds DMG) →';
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
document.getElementById('btn-open-in-terminal').addEventListener('click', async () => {
  if (!selectedPath) return;
  const result = await window.releaseManager.openInTerminal(selectedPath);
  if (result?.ok === false && result?.error) syncDownloadStatusEl.textContent = result.error;
});
document.getElementById('btn-open-in-editor').addEventListener('click', async () => {
  if (!selectedPath) return;
  const result = await window.releaseManager.openInEditor(selectedPath);
  if (result?.ok === false && result?.error) syncDownloadStatusEl.textContent = result.error;
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
document.getElementById('btn-release-tag-only')?.addEventListener('click', () => release('patch'));

githubTokenEl.addEventListener('blur', async () => {
  if (!selectedPath) return;
  const token = githubTokenEl.value?.trim() || undefined;
  const list = await window.releaseManager.getProjects();
  const updated = list.map((p) => (p.path === selectedPath ? { ...p, githubToken: token } : p));
  await window.releaseManager.setProjects(updated);
  projects = updated;
});

document.getElementById('btn-sync').addEventListener('click', syncFromRemote);
document.getElementById('btn-download-latest').addEventListener('click', downloadLatestRelease);

viewDropdownWrapEl?.addEventListener('click', (e) => {
  e.stopPropagation();
  if (e.target.closest('#view-dropdown-btn')) {
    const isOpen = viewDropdownMenuEl && !viewDropdownMenuEl.classList.contains('hidden');
    if (isOpen) closeViewDropdown();
    else openViewDropdown();
  }
});
viewDropdownMenuEl?.querySelectorAll('.view-dropdown-option').forEach((el) => {
  el.addEventListener('click', () => applyViewChoice(el.dataset.value));
});
document.addEventListener('click', () => closeViewDropdown());

changelogContentEl?.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="http"]');
  if (a && a.href) {
    e.preventDefault();
    window.releaseManager.openUrl(a.href);
  }
});

document.addEventListener('keydown', async (e) => {
  const action = await window.releaseManager.getShortcutAction(
    viewMode,
    selectedPath,
    e.key,
    e.metaKey,
    e.ctrlKey,
    !!e.target.closest('input, textarea, [contenteditable="true"]')
  );
  if (!action) return;
  e.preventDefault();
  if (action === 'release-patch') release('patch');
  else if (action === 'release-minor') release('minor');
  else if (action === 'release-major') release('major');
  else if (action === 'sync') syncFromRemote();
  else if (action === 'download-latest') downloadLatestRelease();
});

if (settingsGithubTokenEl) {
  settingsGithubTokenEl.addEventListener('blur', () => {
    window.releaseManager.setGitHubToken(settingsGithubTokenEl.value?.trim() ?? '');
  });
}
const settingsOllamaBaseUrlEl = document.getElementById('settings-ollama-base-url');
const settingsOllamaModelEl = document.getElementById('settings-ollama-model');
if (settingsOllamaBaseUrlEl) {
  settingsOllamaBaseUrlEl.addEventListener('blur', () => {
    window.releaseManager.setOllamaSettings(settingsOllamaBaseUrlEl.value?.trim() || 'http://localhost:11434', settingsOllamaModelEl?.value?.trim() || 'llama3.2');
  });
}
if (settingsOllamaModelEl) {
  settingsOllamaModelEl.addEventListener('blur', () => {
    window.releaseManager.setOllamaSettings(settingsOllamaBaseUrlEl?.value?.trim() || 'http://localhost:11434', settingsOllamaModelEl.value?.trim() || 'llama3.2');
  });
}
const settingsOllamaListModelsBtn = document.getElementById('settings-ollama-list-models');
const settingsOllamaModelsStatusEl = document.getElementById('settings-ollama-models-status');
const settingsOllamaModelsListEl = document.getElementById('settings-ollama-models-list');
if (settingsOllamaListModelsBtn) {
  settingsOllamaListModelsBtn.addEventListener('click', async () => {
    const baseUrl = settingsOllamaBaseUrlEl?.value?.trim() || '';
    if (!settingsOllamaModelsStatusEl || !settingsOllamaModelsListEl) return;
    settingsOllamaModelsStatusEl.textContent = 'Loading…';
    settingsOllamaModelsStatusEl.classList.remove('hidden');
    settingsOllamaModelsListEl.classList.add('hidden');
    settingsOllamaModelsListEl.innerHTML = '';
    try {
      const result = await window.releaseManager.ollamaListModels(baseUrl);
      if (result?.ok && Array.isArray(result.models)) {
        const n = result.models.length;
        settingsOllamaModelsStatusEl.textContent = n === 0 ? 'No models that support generation. Pull one with ollama pull <model> (e.g. llama3.2).' : `${n} model${n === 1 ? '' : 's'} that support generation — click to select:`;
        if (n > 0) {
          const initialCount = 3;
          const createModelBtn = (name) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'text-xs px-2 py-1 rounded bg-rm-surface text-rm-text border border-rm-border hover:bg-rm-hover cursor-pointer';
            btn.textContent = name;
            btn.addEventListener('click', () => {
              if (settingsOllamaModelEl) {
                settingsOllamaModelEl.value = name;
                window.releaseManager.setOllamaSettings(
                  settingsOllamaBaseUrlEl?.value?.trim() || 'http://localhost:11434',
                  name
                );
              }
            });
            return btn;
          };
          const toShow = result.models.slice(0, initialCount);
          const rest = result.models.slice(initialCount);
          toShow.forEach((name) => settingsOllamaModelsListEl.appendChild(createModelBtn(name)));
          if (rest.length > 0) {
            const loadMoreBtn = document.createElement('button');
            loadMoreBtn.type = 'button';
            loadMoreBtn.className = 'text-xs px-2 py-1 rounded bg-rm-surface text-rm-accent border border-rm-border hover:bg-rm-hover cursor-pointer';
            loadMoreBtn.textContent = `Load more (${rest.length})`;
            loadMoreBtn.addEventListener('click', () => {
              rest.forEach((name) => settingsOllamaModelsListEl.appendChild(createModelBtn(name)));
              loadMoreBtn.remove();
            });
            settingsOllamaModelsListEl.appendChild(loadMoreBtn);
          }
          settingsOllamaModelsListEl.classList.remove('hidden');
        }
      } else {
        settingsOllamaModelsStatusEl.textContent = result?.error || 'Could not list models.';
      }
    } catch (e) {
      settingsOllamaModelsStatusEl.textContent = e?.message || 'Could not list models.';
    }
  });
}

document.getElementById('btn-ollama-commit')?.addEventListener('click', async () => {
  if (!selectedPath) return;
  if (detailCommitStatusEl) {
    detailCommitStatusEl.textContent = 'Generating…';
    detailCommitStatusEl.classList.remove('hidden', 'text-rm-success');
  }
  try {
    const result = await window.releaseManager.ollamaGenerateCommitMessage(selectedPath);
    if (result?.ok && result.text) {
      if (detailCommitMessageEl) detailCommitMessageEl.value = result.text;
      if (detailCommitStatusEl) {
        detailCommitStatusEl.textContent = 'Generated. Edit if needed.';
        detailCommitStatusEl.classList.add('text-rm-success');
      }
    } else {
      if (detailCommitStatusEl) {
        detailCommitStatusEl.textContent = result?.error || 'Generate failed.';
        detailCommitStatusEl.classList.remove('text-rm-success');
      }
    }
  } catch (e) {
    if (detailCommitStatusEl) {
      detailCommitStatusEl.textContent = e.message || 'Generate failed';
      detailCommitStatusEl.classList.remove('text-rm-success');
    }
  }
});

document.getElementById('btn-ollama-release-notes')?.addEventListener('click', async () => {
  if (!selectedPath) return;
  const sinceTag = currentInfo?.latestTag || null;
  const prevNotes = releaseNotesEl?.value ?? '';
  if (releaseNotesEl) releaseNotesEl.value = 'Generating…';
  try {
    const result = await window.releaseManager.ollamaGenerateReleaseNotes(selectedPath, sinceTag);
    if (result?.ok && result.text) {
      releaseNotesEl.value = result.text;
    } else {
      releaseNotesEl.value = prevNotes;
      syncDownloadStatusEl.textContent = result?.error || 'Generate failed.';
      syncDownloadStatusEl.classList.remove('hidden', 'text-rm-success');
    }
  } catch (e) {
    if (releaseNotesEl) releaseNotesEl.value = prevNotes;
    syncDownloadStatusEl.textContent = e.message || 'Generate failed';
    syncDownloadStatusEl.classList.remove('hidden', 'text-rm-success');
  }
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

async function refreshFromFilesystem() {
  projects = await window.releaseManager.getProjects();
  renderProjectList();
  if (viewMode === 'dashboard') {
    loadDashboard();
  } else if (selectedPath) {
    loadProjectInfo(selectedPath);
  }
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

document.getElementById('btn-refresh').addEventListener('click', async () => {
  const btn = document.getElementById('btn-refresh');
  if (btn?.classList.contains('refreshing')) return;
  btn?.classList.add('refreshing');
  try {
    await Promise.all([
      refreshFromFilesystem(),
      new Promise((r) => setTimeout(r, 1000)),
    ]);
  } finally {
    btn?.classList.remove('refreshing');
  }
});

init();
