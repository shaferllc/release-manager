(() => {
  // src-renderer/js/state.js
  var state = {
    lastCoverageByPath: {},
    projects: [],
    selectedPath: null,
    filterByType: "",
    filterByTag: "",
    currentInfo: null,
    viewMode: "detail",
    dashboardData: [],
    selectedPaths: /* @__PURE__ */ new Set(),
    currentGitSubtab: "main",
    gitSectionsMovedToRightPanel: false,
    isRefreshingAfterCheckout: false,
    switchWithChangesModalResolve: null,
    modalCommitDetailSha: null,
    rightPanelCommitSha: null,
    fileViewerModalProjectPath: null,
    fileViewerModalFilePath: null,
    fileViewerModalIsUntracked: false
  };

  // src-renderer/js/constants.js
  var VIEW_LABELS = {
    detail: "Project",
    dashboard: "Dashboard",
    settings: "Settings",
    docs: "Documentation",
    changelog: "Changelog"
  };
  var PREF_DETAIL_USE_TABS = "detailUseTabs";
  var PREF_COLLAPSED_SECTIONS = "collapsedSections";
  var GIT_SUBTAB_LABELS = { main: "Main", history: "History", advanced: "Advanced" };
  var GIT_RIGHT_SECTION_IDS = [
    "git-section-branch-sync",
    "git-section-merge-rebase",
    "git-section-stash",
    "git-section-tags",
    "git-section-commit-history",
    "git-section-reflog",
    "git-section-delete-branch",
    "git-section-remotes",
    "git-section-compare-reset",
    "git-section-gitignore",
    "git-section-gitattributes",
    "git-section-submodules",
    "git-section-worktrees",
    "git-section-bisect"
  ];
  var GIT_ACTION_CONFIRMS = {
    pull: "Pull fetches from the remote and merges into your current branch. Your local commits and any uncommitted changes may be updated or merged with remote changes.\n\nContinue?",
    push: "Push uploads your current branch to the remote. Continue?",
    forcePush: "Force push overwrites the remote branch with your local branch. This can discard others' commits. Only use if you are sure (e.g. after rebasing).\n\nContinue?",
    forcePushLease: "Force push with lease overwrites the remote only if no one else has pushed. Safer than plain force push.\n\nContinue?",
    stash: "Stash temporarily saves your uncommitted changes (modified and untracked files) so you can switch branches or pull. You can restore them later with Pop stash.\n\nContinue?",
    pop: "Pop stash reapplies the most recent stashed changes to your working tree. If you already have uncommitted changes, they may conflict and you may need to resolve them.\n\nContinue?",
    discard: "Discard all will permanently remove every uncommitted change: modified and staged files will be reverted to the last commit, and untracked files and directories will be deleted. This cannot be undone.\n\nAre you sure?",
    stage: "Stage this file so it will be included in the next commit?",
    unstage: "Unstage this file? Changes will remain in the working tree but won't be included in the next commit.",
    discardFile: "Discard all changes in this file? This cannot be undone.",
    mergeAbort: "Abort the current merge? Your branch will be restored to its state before the merge. Uncommitted changes from the merge (including conflict resolutions) will be lost.\n\nContinue?",
    checkout: "Switch branch? Uncommitted changes may need to be committed or stashed first.\n\nContinue?",
    merge: "Merge the chosen branch into the current branch. Resolve any conflicts in your editor if needed.\n\nContinue?"
  };
  var GIT_ACTION_SUCCESS = {
    pull: "Pulled from remote. Your branch is up to date.",
    stash: "Changes stashed. Use Pop stash to restore them.",
    pop: "Stash applied. Your stashed changes are back in the working tree.",
    discard: "Uncommitted changes discarded.",
    mergeAbort: "Merge aborted. Branch restored to pre-merge state.",
    checkout: "Switched branch.",
    fetch: "Fetched from remote.",
    push: "Pushed to remote.",
    createBranch: "Branch created and checked out.",
    merge: "Merge completed.",
    stashApply: "Stash applied.",
    stashDrop: "Stash dropped.",
    rebase: "Rebase completed.",
    rebaseAbort: "Rebase aborted.",
    cherryPickAbort: "Cherry-pick aborted.",
    cherryPick: "Cherry-pick applied.",
    amend: "Commit amended.",
    deleteTag: "Tag deleted.",
    revert: "Revert committed."
  };
  var BTN_ICONS = {
    plus: "M12 5v14M5 12h14",
    check: "M20 6 9 17l-5-5",
    minus: "M5 12h14",
    trash: ["M3 6h18", "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"],
    play: "M5 3l14 9-14 9V3z",
    "git-branch": "M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM15 6a9 9 0 0 1-9 9"
  };

  // src-renderer/js/utils.js
  function escapeHtml(s) {
    if (s == null) return "";
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }
  function createBtnIcon(pathDOrArray) {
    if (pathDOrArray == null) return null;
    const paths = Array.isArray(pathDOrArray) ? pathDOrArray : [pathDOrArray];
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "btn-icon");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    paths.forEach((d) => {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", d);
      svg.appendChild(path);
    });
    return svg;
  }
  function stripAnsi(text) {
    if (text == null || typeof text !== "string") return "";
    return text.replace(/\x1b\[[\d;]*[a-zA-Z]/g, "").replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, "").replace(/\x1b\[?[\d;]*[a-zA-Z]/g, "");
  }
  function formatAheadBehind(ahead, behind) {
    const parts = [];
    if (ahead != null && ahead > 0) parts.push(`${ahead} ahead`);
    if (behind != null && behind > 0) parts.push(`${behind} behind`);
    return parts.length ? parts.join(", ") : null;
  }

  // src-renderer/app.js
  var projectListEl = document.getElementById("project-list");
  var emptyHintEl = document.getElementById("empty-projects-hint");
  var noSelectionEl = document.getElementById("no-selection");
  var projectDetailEl = document.getElementById("project-detail");
  var detailNameEl = document.getElementById("detail-name");
  var detailPathEl = document.getElementById("detail-path");
  var detailVersionEl = document.getElementById("detail-version");
  var detailTagEl = document.getElementById("detail-tag");
  var detailUnreleasedCommitsEl = document.getElementById("detail-unreleased-commits");
  var detailProjectTypeEl = document.getElementById("detail-project-type");
  var detailReleaseHintEl = document.getElementById("detail-release-hint");
  var detailReleaseBumpButtonsEl = document.getElementById("detail-release-bump-buttons");
  var detailReleaseTagOnlyWrapEl = document.getElementById("detail-release-tag-only-wrap");
  var detailAllVersionsWrapEl = document.getElementById("detail-all-versions-wrap");
  var detailAllVersionsEl = document.getElementById("detail-all-versions");
  var detailAllVersionsEmptyEl = document.getElementById("detail-all-versions-empty");
  var detailErrorEl = document.getElementById("detail-error");
  var linkReleasesEl = document.getElementById("link-releases");
  var releaseStatusEl = document.getElementById("release-status");
  var syncDownloadStatusEl = document.getElementById("sync-download-status");
  var syncDownloadStatusWrapEl = document.getElementById("sync-download-status-wrap");
  var detailGitStateEl = document.getElementById("detail-git-state");
  var detailGitCardsWrapEl = document.getElementById("detail-git-cards-wrap");
  var detailBranchEl = document.getElementById("detail-branch");
  var detailAheadBehindEl = document.getElementById("detail-ahead-behind");
  var detailBranchSelectEl = document.getElementById("detail-branch-select");
  var detailUncommittedWrapEl = document.getElementById("detail-uncommitted-wrap");
  var detailUncommittedLabelEl = document.getElementById("detail-uncommitted-label");
  var detailUncommittedListEl = document.getElementById("detail-uncommitted-list");
  var detailCommitWrapEl = document.getElementById("detail-commit-wrap");
  var detailCommitMessageEl = document.getElementById("detail-commit-message");
  var detailCommitStatusEl = document.getElementById("detail-commit-status");
  var releaseNotesEl = document.getElementById("release-notes");
  var releaseDraftEl = document.getElementById("release-draft");
  var releasePrereleaseEl = document.getElementById("release-prerelease");
  var releaseActionsWrapEl = document.getElementById("release-actions-wrap");
  var releaseActionsLinkEl = document.getElementById("release-actions-link");
  var githubTokenEl = document.getElementById("github-token");
  var dashboardViewEl = document.getElementById("dashboard-view");
  var settingsViewEl = document.getElementById("settings-view");
  var docsViewEl = document.getElementById("docs-view");
  var changelogViewEl = document.getElementById("changelog-view");
  var changelogContentEl = document.getElementById("changelog-content");
  var changelogErrorEl = document.getElementById("changelog-error");
  var viewDropdownWrapEl = document.getElementById("view-dropdown-wrap");
  var viewDropdownBtnEl = document.getElementById("view-dropdown-btn");
  var viewDropdownLabelEl = document.getElementById("view-dropdown-label");
  var viewDropdownMenuEl = document.getElementById("view-dropdown-menu");
  var VIEW_LABELS2 = VIEW_LABELS;
  var settingsGithubTokenEl = document.getElementById("settings-github-token");
  var dashboardFilterEl = document.getElementById("dashboard-filter");
  var dashboardSortEl = document.getElementById("dashboard-sort");
  var dashboardTbodyEl = document.getElementById("dashboard-tbody");
  var batchReleaseBarEl = document.getElementById("batch-release-bar");
  var modalPickReleaseEl = document.getElementById("modal-pick-release");
  var modalPickReleaseListEl = document.getElementById("modal-pick-release-list");
  var modalPickReleaseStatusEl = document.getElementById("modal-pick-release-status");
  var modalPickAssetEl = document.getElementById("modal-pick-asset");
  var modalPickAssetListEl = document.getElementById("modal-pick-asset-list");
  var detailRecentCommitsWrapEl = document.getElementById("detail-recent-commits-wrap");
  var detailRecentCommitsEl = document.getElementById("detail-recent-commits");
  var detailBumpSuggestionEl = document.getElementById("detail-bump-suggestion");
  var filterTypeEl = document.getElementById("filter-type");
  var filterTagEl = document.getElementById("filter-tag");
  var detailTagsWrapEl = document.getElementById("detail-tags-wrap");
  var detailTagsInputEl = document.getElementById("detail-tags-input");
  var detailPhpPathEl = document.getElementById("detail-php-path");
  var detailPhpWrapEl = document.getElementById("detail-php-wrap");
  var detailComposerCardEl = document.getElementById("detail-composer-card");
  var detailTestsCardEl = document.getElementById("detail-tests-card");
  var detailCoverageCardEl = document.getElementById("detail-coverage-card");
  var detailCoverageWrapEl = document.getElementById("detail-coverage-wrap");
  var detailCoverageSummaryEl = document.getElementById("detail-coverage-summary");
  var detailTagsCardEl = document.getElementById("git-section-tags");
  var detailCommitLogCardEl = document.getElementById("git-section-commit-history");
  var detailBranchesDeleteCardEl = document.getElementById("git-section-delete-branch");
  var detailRemotesCardEl = document.getElementById("git-section-remotes");
  var detailCompareResetCardEl = document.getElementById("git-section-compare-reset");
  var detailGitignoreCardEl = document.getElementById("git-section-gitignore");
  var detailSubmodulesCardEl = document.getElementById("git-section-submodules");
  var detailReflogCardEl = document.getElementById("git-section-reflog");
  var detailGitattributesCardEl = document.getElementById("git-section-gitattributes");
  var detailWorktreesCardEl = document.getElementById("git-section-worktrees");
  var detailBisectCardEl = document.getElementById("git-section-bisect");
  var PREF_DETAIL_USE_TABS2 = PREF_DETAIL_USE_TABS;
  var PREF_COLLAPSED_SECTIONS2 = PREF_COLLAPSED_SECTIONS;
  var GIT_SUBTAB_LABELS2 = GIT_SUBTAB_LABELS;
  var GIT_RIGHT_SECTION_IDS2 = GIT_RIGHT_SECTION_IDS;
  function ensureGitSectionsInRightPanel() {
    const viewsEl = document.getElementById("detail-git-right-views");
    if (!viewsEl || state.gitSectionsMovedToRightPanel || viewsEl.children.length > 0) return;
    GIT_RIGHT_SECTION_IDS2.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.remove("hidden");
        el.classList.add("detail-git-right-section-panel", "min-w-max");
        viewsEl.appendChild(el);
      }
    });
    state.gitSectionsMovedToRightPanel = true;
  }
  function updateGitRightPanelSection(selectedValue) {
    const workingTreeEl = document.getElementById("detail-git-right-working-tree");
    const viewsEl = document.getElementById("detail-git-right-views");
    const headerFiles = document.querySelector(".detail-git-right-header-files");
    const stageAllBtn = document.getElementById("btn-git-right-stage-all");
    if (!workingTreeEl || !viewsEl) return;
    const isWorkingTree = selectedValue === "working-tree";
    workingTreeEl.classList.toggle("hidden", !isWorkingTree);
    if (isWorkingTree) {
      viewsEl.classList.add("hidden");
      workingTreeEl.classList.remove("hidden");
      if (headerFiles) headerFiles.classList.remove("hidden");
      if (stageAllBtn) stageAllBtn.classList.remove("hidden");
    } else {
      viewsEl.classList.remove("hidden");
      workingTreeEl.classList.add("hidden");
      if (headerFiles) headerFiles.classList.add("hidden");
      if (stageAllBtn) stageAllBtn.classList.add("hidden");
      viewsEl.querySelectorAll(".detail-git-right-section-panel").forEach((el) => {
        const show = el.id === selectedValue;
        el.classList.toggle("hidden", !show);
        el.style.display = show ? "" : "none";
        if (show && el.classList.contains("collapsible-card")) {
          el.classList.remove("is-collapsed");
          const header = el.querySelector(".collapsible-card-header");
          if (header) header.setAttribute("aria-expanded", "true");
        }
      });
    }
  }
  function updateGitJumpLinks() {
    const nav = document.getElementById("detail-git-jump-links");
    const jumpWrap = document.getElementById("detail-git-jump");
    if (!nav || !jumpWrap) return;
    const panels = document.querySelectorAll(
      `.git-subtab-panel[data-git-subtab="${state.currentGitSubtab}"]`
    );
    nav.innerHTML = "";
    nav.className = "detail-git-jump-links flex flex-col gap-0.5";
    const subtabLabel = GIT_SUBTAB_LABELS2[state.currentGitSubtab] || state.currentGitSubtab;
    const labelEl = document.createElement("span");
    labelEl.className = "detail-git-jump-subtab text-rm-muted font-semibold uppercase tracking-wider text-[10px]";
    labelEl.textContent = subtabLabel;
    nav.appendChild(labelEl);
    const list = document.createElement("div");
    list.className = "detail-git-jump-list flex flex-col gap-0.5";
    const addLink = (value, label, panel) => {
      const a = document.createElement("a");
      a.href = `#${value}`;
      a.className = "detail-git-jump-link text-rm-accent hover:underline text-xs block truncate";
      a.textContent = label;
      a.addEventListener("click", (e) => {
        e.preventDefault();
        const sectionSelect = document.getElementById("detail-git-right-section-select");
        if (sectionSelect) {
          sectionSelect.value = value;
          updateGitRightPanelSection(value);
        } else if (panel) {
          panel.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
      list.appendChild(a);
    };
    if (state.currentGitSubtab === "main") {
      addLink("working-tree", "Working tree & commit", null);
    }
    panels.forEach((panel) => {
      const id = panel.id;
      const sectionLabel = panel.dataset.section || id;
      if (!id) return;
      const sectionValue = id === "git-section-working-tree" ? "working-tree" : id;
      addLink(sectionValue, sectionLabel, panel);
    });
    nav.appendChild(list);
  }
  function updateGitSubtabVisibility(subtab) {
    state.currentGitSubtab = subtab || "main";
    document.querySelectorAll(".detail-git-subtab-btn").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.gitSubtab === state.currentGitSubtab);
    });
    document.querySelectorAll(".git-subtab-panel").forEach((panel) => {
      panel.classList.toggle("hidden", panel.dataset.gitSubtab !== state.currentGitSubtab);
    });
    updateGitJumpLinks();
  }
  function updateDetailTabPanelVisibility() {
    const useTabsEl = document.getElementById("detail-use-tabs");
    const panelsEl = document.getElementById("detail-tab-panels");
    const barEl = document.getElementById("detail-tabs-bar");
    if (!panelsEl || !barEl) return;
    const useTabs = useTabsEl?.checked ?? false;
    if (useTabs) {
      barEl.classList.remove("hidden");
      panelsEl.classList.add("detail-tabs-mode");
      const activeBtn = document.querySelector(".detail-tab-btn.is-active");
      const activeTab = activeBtn?.dataset?.tab || "git";
      panelsEl.querySelectorAll(":scope > .detail-tab-panel").forEach((panel) => {
        const tab = panel.dataset.detailTab;
        const show = activeTab === "all" || tab === activeTab;
        panel.classList.toggle("detail-tab-panel-visible", show);
      });
      const gitSubtabsBar = document.getElementById("detail-git-subtabs-bar");
      if (gitSubtabsBar) gitSubtabsBar.classList.toggle("hidden", activeTab !== "git");
      const gitJumpEl = document.getElementById("detail-git-jump");
      if (gitJumpEl) gitJumpEl.classList.toggle("hidden", activeTab !== "git");
      const showCoverageHeader = (activeTab === "coverage" || activeTab === "all") && (state.currentInfo?.projectType === "npm" || state.currentInfo?.projectType === "php");
      if (detailCoverageWrapEl) detailCoverageWrapEl.classList.toggle("hidden", !showCoverageHeader);
      const showTestsPanel = (activeTab === "tests" || activeTab === "all") && (state.currentInfo?.projectType === "npm" || state.currentInfo?.projectType === "php");
      if (detailTestsCardEl) detailTestsCardEl.classList.toggle("hidden", !showTestsPanel);
      const showCoveragePanel = (activeTab === "coverage" || activeTab === "all") && (state.currentInfo?.projectType === "npm" || state.currentInfo?.projectType === "php");
      if (detailCoverageCardEl) detailCoverageCardEl.classList.toggle("hidden", !showCoveragePanel);
      if (detailGitCardsWrapEl) detailGitCardsWrapEl.classList.add("hidden");
      if (activeTab === "git") {
        ensureGitSectionsInRightPanel();
        updateGitSubtabVisibility(state.currentGitSubtab);
      }
    } else {
      barEl.classList.add("hidden");
      panelsEl.classList.remove("detail-tabs-mode");
      panelsEl.querySelectorAll(":scope > .detail-tab-panel").forEach((p) => p.classList.remove("detail-tab-panel-visible"));
      document.querySelectorAll(".git-subtab-panel").forEach((p) => p.classList.remove("hidden"));
      const gitSubtabsBar = document.getElementById("detail-git-subtabs-bar");
      if (gitSubtabsBar) gitSubtabsBar.classList.add("hidden");
      const gitJumpEl = document.getElementById("detail-git-jump");
      if (gitJumpEl) gitJumpEl.classList.add("hidden");
      if (detailGitCardsWrapEl) detailGitCardsWrapEl.classList.add("hidden");
      const coverageWrap = document.getElementById("detail-coverage-wrap");
      if (coverageWrap && state.currentInfo?.projectType) {
        const showTests = state.currentInfo.projectType === "npm" || state.currentInfo.projectType === "php";
        coverageWrap.classList.toggle("hidden", !showTests);
      }
    }
  }
  function applyTheme(effective) {
    document.documentElement.setAttribute("data-theme", effective || "dark");
    document.getElementById("theme-dark")?.classList.toggle("is-active", effective === "dark");
    document.getElementById("theme-light")?.classList.toggle("is-active", effective === "light");
  }
  async function initTheme() {
    const { effective } = await window.releaseManager.getTheme();
    applyTheme(effective);
    window.releaseManager.onTheme(applyTheme);
    document.getElementById("theme-dark")?.addEventListener("click", () => window.releaseManager.setTheme("dark"));
    document.getElementById("theme-light")?.addEventListener("click", () => window.releaseManager.setTheme("light"));
  }
  function getFilteredProjects() {
    const typeFilter = (filterTypeEl?.value ?? "").trim();
    const tagFilter = (filterTagEl?.value ?? "").trim();
    const filtered = state.projects.filter((p) => {
      if (typeFilter) {
        if (typeFilter === "php") {
          if ((p.projectType || "") !== "php" && !p.hasComposer) return false;
        } else if ((p.projectType || "") !== typeFilter) {
          return false;
        }
      }
      if (tagFilter) {
        const tags = Array.isArray(p.tags) ? p.tags : [];
        if (!tags.includes(tagFilter)) return false;
      }
      return true;
    });
    return filtered.sort((a, b) => {
      const aStarred = a.starred === true;
      const bStarred = b.starred === true;
      if (aStarred && !bStarred) return -1;
      if (!aStarred && bStarred) return 1;
      const aName = (a.name || a.path || "").toString();
      const bName = (b.name || b.path || "").toString();
      return aName.localeCompare(bName, void 0, { sensitivity: "base" });
    });
  }
  function updateFilterTagOptions() {
    if (!filterTagEl) return;
    const allTags = /* @__PURE__ */ new Set();
    state.projects.forEach((p) => {
      (Array.isArray(p.tags) ? p.tags : []).forEach((t) => {
        if (t && String(t).trim()) allTags.add(String(t).trim());
      });
    });
    const current = filterTagEl.value;
    filterTagEl.innerHTML = '<option value="">All tags</option>' + [...allTags].sort().map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("");
    if (allTags.has(current)) filterTagEl.value = current;
  }
  function renderProjectList() {
    if (!projectListEl) return;
    const filtersEl = document.getElementById("project-filters");
    if (filtersEl) filtersEl.classList.toggle("hidden", state.projects.length === 0);
    projectListEl.innerHTML = "";
    updateFilterTagOptions();
    const list = getFilteredProjects();
    if (list.length === 0) {
      emptyHintEl.classList.remove("hidden");
      emptyHintEl.textContent = state.projects.length > 0 ? "No projects match the current filters." : "Click \u201CAdd project\u201D to add a folder (npm, Rust, Go, Python, or PHP: package.json, Cargo.toml, go.mod, pyproject.toml, or composer.json).";
      batchReleaseBarEl.classList.add("hidden");
      return;
    }
    emptyHintEl.classList.add("hidden");
    list.forEach((p) => {
      const li = document.createElement("li");
      li.className = `project-list-item flex items-center gap-1.5 rounded-rm px-3 py-2 text-sm cursor-pointer transition-colors group ${state.selectedPath === p.path ? "bg-rm-accent/20 text-rm-accent font-medium" : "text-rm-text hover:bg-rm-surface-hover"}`;
      li.dataset.path = p.path;
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = "batch-checkbox shrink-0 cursor-pointer";
      cb.checked = state.selectedPaths.has(p.path);
      cb.addEventListener("click", (e) => e.stopPropagation());
      cb.addEventListener("change", () => {
        if (cb.checked) state.selectedPaths.add(p.path);
        else state.selectedPaths.delete(p.path);
        batchReleaseBarEl.classList.toggle("hidden", state.selectedPaths.size < 2);
        const countEl2 = document.getElementById("batch-release-count");
        if (countEl2) countEl2.textContent = state.selectedPaths.size;
      });
      li.appendChild(cb);
      const starBtn = document.createElement("button");
      starBtn.type = "button";
      starBtn.className = "project-star-btn p-0.5 rounded shrink-0 border-none cursor-pointer text-rm-muted hover:text-rm-accent transition-colors";
      starBtn.title = p.starred ? "Unstar (remove from top)" : "Star (keep at top)";
      starBtn.setAttribute("aria-label", p.starred ? "Unstar" : "Star");
      starBtn.innerHTML = p.starred ? '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 6.86 14.14 2 9.27 8.91 8.26 12 2"/></svg>' : '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 6.86 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
      starBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        p.starred = !p.starred;
        window.releaseManager.setProjects(state.projects);
        renderProjectList();
      });
      li.appendChild(starBtn);
      const name = p.name || p.path && p.path.split(/[/\\]/).filter(Boolean).pop() || "Project";
      const label = document.createElement("span");
      label.className = "flex-1 min-w-0 truncate";
      label.textContent = name;
      label.title = p.path;
      li.appendChild(label);
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "project-remove-btn p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-rm-surface-hover text-rm-muted hover:text-rm-text transition-opacity border-none cursor-pointer shrink-0";
      removeBtn.title = "Remove from list";
      removeBtn.setAttribute("aria-label", "Remove from list");
      removeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
      removeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const projectName = p.name || p.path.split(/[/\\]/).filter(Boolean).pop() || "this project";
        if (!confirm(`Remove "${projectName}" from the list?`)) return;
        removeProject(p.path);
      });
      li.appendChild(removeBtn);
      li.addEventListener("click", (e) => {
        if (e.target.classList.contains("batch-checkbox") || e.target.closest(".project-star-btn") || e.target.closest(".project-remove-btn")) return;
        selectProject(p.path);
      });
      projectListEl.appendChild(li);
    });
    batchReleaseBarEl.classList.toggle("hidden", state.selectedPaths.size < 2);
    const countEl = document.getElementById("batch-release-count");
    if (countEl) countEl.textContent = state.selectedPaths.size;
  }
  function setViewDropdown(mode) {
    const value = mode || "detail";
    if (viewDropdownLabelEl) viewDropdownLabelEl.textContent = VIEW_LABELS2[value] || VIEW_LABELS2.detail;
    if (viewDropdownMenuEl) {
      viewDropdownMenuEl.querySelectorAll(".view-dropdown-option").forEach((el) => {
        el.setAttribute("aria-selected", el.dataset.value === value);
      });
    }
  }
  function closeViewDropdown() {
    if (viewDropdownMenuEl) viewDropdownMenuEl.classList.add("hidden");
    if (viewDropdownBtnEl) viewDropdownBtnEl.setAttribute("aria-expanded", "false");
  }
  function openViewDropdown() {
    if (viewDropdownMenuEl) viewDropdownMenuEl.classList.remove("hidden");
    if (viewDropdownBtnEl) viewDropdownBtnEl.setAttribute("aria-expanded", "true");
  }
  function applyViewChoice(value) {
    closeViewDropdown();
    if (value === "dashboard") showDashboard();
    else if (value === "settings") showSettings();
    else if (value === "docs") showDocs();
    else if (value === "changelog") showChangelog();
    else if (value === "detail") state.selectedPath ? showDetail() : showNoSelection();
  }
  function showNoSelection() {
    state.viewMode = "detail";
    window.releaseManager.setPreference("selectedProjectPath", "");
    setViewDropdown(null);
    dashboardViewEl.classList.add("hidden");
    settingsViewEl?.classList.add("hidden");
    docsViewEl?.classList.add("hidden");
    changelogViewEl?.classList.add("hidden");
    noSelectionEl.classList.remove("hidden");
    projectDetailEl.classList.add("hidden");
  }
  function showDetail() {
    saveSettingsToStore();
    state.viewMode = "detail";
    window.releaseManager.setPreference("state.viewMode", state.viewMode);
    setViewDropdown(null);
    dashboardViewEl.classList.add("hidden");
    settingsViewEl?.classList.add("hidden");
    docsViewEl?.classList.add("hidden");
    changelogViewEl?.classList.add("hidden");
    noSelectionEl.classList.add("hidden");
    projectDetailEl.classList.remove("hidden");
  }
  function saveSettingsToStore() {
    if (state.viewMode !== "settings") return;
    const tokenEl = document.getElementById("settings-github-token");
    const baseUrlEl = document.getElementById("settings-ollama-base-url");
    const modelEl = document.getElementById("settings-ollama-model");
    const phpPathEl = document.getElementById("settings-php-path");
    if (tokenEl) window.releaseManager.setGitHubToken(tokenEl.value?.trim() ?? "");
    if (baseUrlEl && modelEl) {
      window.releaseManager.setOllamaSettings(
        baseUrlEl.value?.trim() || "http://localhost:11434",
        modelEl.value?.trim() || "llama3.2"
      );
    }
    if (phpPathEl) window.releaseManager.setPreference("phpPath", phpPathEl.value?.trim() ?? "");
    const signCommitsEl = document.getElementById("settings-sign-commits");
    if (signCommitsEl) window.releaseManager.setPreference("signCommits", signCommitsEl.checked);
  }
  function showDashboard() {
    saveSettingsToStore();
    state.viewMode = "dashboard";
    window.releaseManager.setPreference("state.viewMode", state.viewMode);
    setViewDropdown("dashboard");
    settingsViewEl?.classList.add("hidden");
    docsViewEl?.classList.add("hidden");
    changelogViewEl?.classList.add("hidden");
    noSelectionEl.classList.add("hidden");
    projectDetailEl.classList.add("hidden");
    dashboardViewEl.classList.remove("hidden");
    loadDashboard();
  }
  async function showSettings() {
    state.viewMode = "settings";
    window.releaseManager.setPreference("state.viewMode", state.viewMode);
    setViewDropdown("settings");
    dashboardViewEl.classList.add("hidden");
    docsViewEl?.classList.add("hidden");
    changelogViewEl?.classList.add("hidden");
    noSelectionEl.classList.add("hidden");
    projectDetailEl.classList.add("hidden");
    settingsViewEl?.classList.remove("hidden");
    const token = await window.releaseManager.getGitHubToken();
    if (settingsGithubTokenEl) settingsGithubTokenEl.value = token || "";
    const ollama = await window.releaseManager.getOllamaSettings();
    const ollamaBaseUrlEl = document.getElementById("settings-ollama-base-url");
    const ollamaModelEl = document.getElementById("settings-ollama-model");
    if (ollamaBaseUrlEl) ollamaBaseUrlEl.value = ollama?.baseUrl || "";
    if (ollamaModelEl) ollamaModelEl.value = ollama?.model || "";
    const phpPath = await window.releaseManager.getPreference("phpPath");
    const settingsPhpPathEl = document.getElementById("settings-php-path");
    if (settingsPhpPathEl) settingsPhpPathEl.value = phpPath || "";
    const signCommits = await window.releaseManager.getPreference("signCommits");
    const settingsSignCommitsEl = document.getElementById("settings-sign-commits");
    if (settingsSignCommitsEl) settingsSignCommitsEl.checked = !!signCommits;
  }
  function showDocs() {
    saveSettingsToStore();
    state.viewMode = "docs";
    window.releaseManager.setPreference("state.viewMode", state.viewMode);
    setViewDropdown("docs");
    dashboardViewEl.classList.add("hidden");
    settingsViewEl?.classList.add("hidden");
    changelogViewEl?.classList.add("hidden");
    noSelectionEl.classList.add("hidden");
    projectDetailEl.classList.add("hidden");
    docsViewEl?.classList.remove("hidden");
  }
  async function showChangelog() {
    saveSettingsToStore();
    state.viewMode = "changelog";
    window.releaseManager.setPreference("state.viewMode", state.viewMode);
    setViewDropdown("changelog");
    dashboardViewEl.classList.add("hidden");
    settingsViewEl?.classList.add("hidden");
    docsViewEl?.classList.add("hidden");
    noSelectionEl.classList.add("hidden");
    projectDetailEl.classList.add("hidden");
    changelogViewEl?.classList.remove("hidden");
    if (changelogErrorEl) changelogErrorEl.classList.add("hidden");
    if (changelogContentEl) changelogContentEl.innerHTML = '<span class="text-rm-muted">Loading\u2026</span>';
    try {
      const result = await window.releaseManager.getChangelog();
      if (result?.ok && changelogContentEl) {
        changelogContentEl.innerHTML = result.content;
        changelogContentEl.classList.remove("hidden");
      } else if (changelogErrorEl) {
        changelogErrorEl.textContent = result?.error || "Could not load changelog.";
        changelogErrorEl.classList.remove("hidden");
        if (changelogContentEl) changelogContentEl.innerHTML = "";
      }
    } catch (e) {
      if (changelogErrorEl) {
        changelogErrorEl.textContent = e.message || "Could not load changelog.";
        changelogErrorEl.classList.remove("hidden");
      }
      if (changelogContentEl) changelogContentEl.innerHTML = "";
    }
  }
  function needsRelease(row) {
    const a = row.ahead != null && row.ahead > 0;
    const u = row.uncommittedLines && row.uncommittedLines.length > 0;
    const unreleased = row.commitsSinceLatestTag != null && row.commitsSinceLatestTag > 0;
    return a || u || unreleased;
  }
  async function loadDashboard() {
    const filter = dashboardFilterEl?.value || "all";
    const sort = dashboardSortEl?.value || "name";
    const raw = await window.releaseManager.getAllProjectsInfo();
    state.dashboardData = raw.map((r) => ({
      ...r,
      needsRelease: needsRelease(r)
    }));
    let rows = filter === "needs-release" ? state.dashboardData.filter((r) => r.needsRelease) : state.dashboardData;
    if (sort === "needs-release") {
      rows = [...rows].sort((a, b) => (b.needsRelease ? 1 : 0) - (a.needsRelease ? 1 : 0) || (a.name || "").localeCompare(b.name || ""));
    } else {
      rows = [...rows].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }
    dashboardTbodyEl.innerHTML = "";
    rows.forEach((row) => {
      const tr = document.createElement("tr");
      tr.className = "dashboard-row cursor-pointer";
      tr.dataset.path = row.path;
      const ab = formatAheadBehind(row.ahead, row.behind);
      const unreleased = row.commitsSinceLatestTag != null && row.commitsSinceLatestTag > 0 ? `${row.commitsSinceLatestTag} commit${row.commitsSinceLatestTag === 1 ? "" : "s"}` : "\u2014";
      tr.innerHTML = `
      <td class="py-2 pr-3 font-medium text-rm-text">${escapeHtml(row.name || "\u2014")}</td>
      <td class="py-2 pr-3 font-mono text-sm text-rm-muted">${escapeHtml(row.version || "\u2014")}</td>
      <td class="py-2 pr-3 font-mono text-sm text-rm-muted">${escapeHtml(row.latestTag || "\u2014")}</td>
      <td class="py-2 pr-3 text-rm-muted">${escapeHtml(unreleased)}</td>
      <td class="py-2 pr-3 text-rm-muted">${escapeHtml(row.branch || "\u2014")}</td>
      <td class="py-2 pr-3 text-rm-muted">${ab || "\u2014"}</td>
    `;
      tr.addEventListener("click", () => selectProject(row.path));
      dashboardTbodyEl.appendChild(tr);
    });
  }
  async function openFileViewerModal(dirPath, filePath, isUntracked) {
    const modalEl = document.getElementById("modal-file-view");
    const titleEl = document.getElementById("modal-file-view-title");
    const contentEl = document.getElementById("modal-file-view-content");
    const blameBtn = document.getElementById("modal-file-view-blame");
    const diffBtn = document.getElementById("modal-file-view-diff");
    if (!modalEl || !titleEl || !contentEl) return;
    state.fileViewerModalProjectPath = dirPath;
    state.fileViewerModalFilePath = filePath;
    state.fileViewerModalIsUntracked = !!isUntracked;
    if (blameBtn) blameBtn.classList.toggle("hidden", isUntracked);
    if (diffBtn) diffBtn.classList.add("hidden");
    titleEl.textContent = filePath;
    contentEl.textContent = "Loading\u2026";
    contentEl.innerHTML = "";
    modalEl.classList.remove("hidden");
    contentEl.classList.remove("diff-view", "blame-view", "image-view");
    try {
      const result = await window.releaseManager.getFileDiff(dirPath, filePath, isUntracked);
      if (!result.ok) {
        contentEl.textContent = result.error || "Failed to load";
        return;
      }
      if (result.type === "image" && result.dataUrl) {
        contentEl.classList.add("image-view");
        const img = document.createElement("img");
        img.src = result.dataUrl;
        img.alt = filePath;
        img.className = "modal-file-image max-w-full max-h-full object-contain";
        contentEl.appendChild(img);
        if (blameBtn) blameBtn.classList.add("hidden");
      } else if (result.type === "diff" && result.content) {
        contentEl.classList.add("diff-view");
        const lines = result.content.split("\n");
        contentEl.innerHTML = lines.map((line) => {
          let cls = "modal-file-line";
          if (line.startsWith("diff --git ")) cls += " diff-header";
          else if (line.startsWith("index ")) cls += " diff-meta";
          else if (line.startsWith("--- ")) cls += " diff-file-old";
          else if (line.startsWith("+++ ")) cls += " diff-file-new";
          else if (line.startsWith("@@") && line.includes("@@")) cls += " diff-hunk";
          else if (line.startsWith("+")) cls += " diff-add";
          else if (line.startsWith("-")) cls += " diff-remove";
          else cls += " diff-context";
          return `<div class="${cls}">${escapeHtml(line)}</div>`;
        }).join("");
      } else if (result.type === "new" && result.content != null) {
        const lines = String(result.content).split("\n");
        contentEl.innerHTML = lines.map((line) => `<div class="modal-file-line">${escapeHtml(line)}</div>`).join("");
      } else {
        contentEl.textContent = result.content || "(empty)";
      }
    } catch (e) {
      contentEl.textContent = e?.message || "Failed to load file";
    }
  }
  async function showFileViewerBlame() {
    const contentEl = document.getElementById("modal-file-view-content");
    const blameBtn = document.getElementById("modal-file-view-blame");
    const diffBtn = document.getElementById("modal-file-view-diff");
    if (!contentEl || !state.fileViewerModalProjectPath || !state.fileViewerModalFilePath) return;
    contentEl.textContent = "Loading blame\u2026";
    contentEl.classList.remove("diff-view");
    contentEl.classList.add("blame-view");
    if (blameBtn) blameBtn.classList.add("hidden");
    if (diffBtn) diffBtn.classList.remove("hidden");
    try {
      const result = await window.releaseManager.getBlame(state.fileViewerModalProjectPath, state.fileViewerModalFilePath);
      if (!result.ok) {
        contentEl.textContent = result.error || "Blame failed";
        return;
      }
      const lines = (result.text || "").split("\n");
      contentEl.innerHTML = lines.map((line) => `<div class="modal-file-line blame-line">${escapeHtml(line)}</div>`).join("");
    } catch (e) {
      contentEl.textContent = e?.message || "Failed to load blame";
    }
  }
  async function showFileViewerDiff() {
    const blameBtn = document.getElementById("modal-file-view-blame");
    const diffBtn = document.getElementById("modal-file-view-diff");
    if (diffBtn) diffBtn.classList.add("hidden");
    if (blameBtn && !state.fileViewerModalIsUntracked) blameBtn.classList.remove("hidden");
    if (state.fileViewerModalProjectPath && state.fileViewerModalFilePath != null) {
      await openFileViewerModal(state.fileViewerModalProjectPath, state.fileViewerModalFilePath, state.fileViewerModalIsUntracked);
    }
  }
  async function runComposerUpdate(dirPath, packageNames) {
    const statusEl = document.getElementById("detail-composer-update-status");
    const isAll = !packageNames || packageNames.length === 0;
    if (statusEl) {
      statusEl.textContent = isAll ? "Updating all packages\u2026" : `Updating ${packageNames.join(", ")}\u2026`;
      statusEl.classList.remove("hidden", "text-rm-warning");
    }
    try {
      const result = await window.releaseManager.composerUpdate(dirPath, packageNames);
      if (result?.ok) {
        if (statusEl) statusEl.textContent = "Update complete. Refreshing\u2026";
        await loadComposerSection(dirPath);
        if (statusEl) {
          statusEl.textContent = "";
          statusEl.classList.add("hidden");
        }
      } else {
        if (statusEl) {
          statusEl.textContent = result?.error || "Update failed";
          statusEl.classList.add("text-rm-warning");
        }
      }
    } catch (e) {
      if (statusEl) {
        statusEl.textContent = e?.message || "Update failed";
        statusEl.classList.add("text-rm-warning");
      }
    }
  }
  async function loadComposerSection(dirPath) {
    const summaryEl = document.getElementById("detail-composer-summary");
    const metaEl = document.getElementById("detail-composer-meta");
    const validateEl = document.getElementById("detail-composer-validate");
    const lockWarningEl = document.getElementById("detail-composer-lock-warning");
    const scriptsWrapEl = document.getElementById("detail-composer-scripts-wrap");
    const scriptsListEl = document.getElementById("detail-composer-scripts");
    const loadingEl = document.getElementById("detail-composer-outdated-loading");
    const errorEl = document.getElementById("detail-composer-outdated-error");
    const wrapEl = document.getElementById("detail-composer-outdated-wrap");
    const tbodyEl = document.getElementById("detail-composer-outdated-tbody");
    const emptyEl = document.getElementById("detail-composer-outdated-empty");
    const auditWrapEl = document.getElementById("detail-composer-audit-wrap");
    const auditTbodyEl = document.getElementById("detail-composer-audit-tbody");
    const auditEmptyEl = document.getElementById("detail-composer-audit-empty");
    const auditErrorEl = document.getElementById("detail-composer-audit-error");
    if (!summaryEl) return;
    errorEl?.classList.add("hidden");
    lockWarningEl?.classList.add("hidden");
    metaEl?.classList.add("hidden");
    validateEl?.classList.add("hidden");
    scriptsWrapEl?.classList.add("hidden");
    auditWrapEl?.classList.add("hidden");
    auditErrorEl?.classList.add("hidden");
    document.getElementById("detail-composer-update-status")?.classList.add("hidden");
    document.getElementById("btn-composer-update-all")?.classList.add("hidden");
    loadingEl?.classList.remove("hidden");
    wrapEl?.classList.add("hidden");
    emptyEl?.classList.add("hidden");
    try {
      const manifest = await window.releaseManager.getComposerInfo(dirPath);
      if (manifest.ok) {
        const req = manifest.requireCount ?? 0;
        const dev = manifest.requireDevCount ?? 0;
        const lock = manifest.hasLock ? "composer.lock present" : "No composer.lock";
        summaryEl.textContent = `${req} require, ${dev} require-dev \xB7 ${lock}`;
        const metaParts = [];
        if (manifest.phpRequire) metaParts.push(`PHP ${manifest.phpRequire}`);
        if (manifest.license) metaParts.push(manifest.license);
        if (metaParts.length) {
          metaEl.textContent = metaParts.join(" \xB7 ");
          metaEl.classList.remove("hidden");
        }
        if (manifest.description) {
          if (!metaEl.textContent) metaEl.textContent = manifest.description;
          else metaEl.textContent += " \xB7 " + manifest.description;
          metaEl.classList.remove("hidden");
        }
        if (manifest.scripts && manifest.scripts.length > 0 && scriptsListEl) {
          scriptsWrapEl?.classList.remove("hidden");
          scriptsListEl.innerHTML = manifest.scripts.map((s) => `<li><code class="bg-rm-surface px-1 rounded text-xs">${escapeHtml(s)}</code></li>`).join("");
        }
      } else {
        summaryEl.textContent = manifest.error || "Could not read composer.json";
      }
    } catch (_) {
      summaryEl.textContent = "Could not read composer info";
    }
    try {
      const validateResult = await window.releaseManager.getComposerValidate(dirPath);
      if (validateEl) {
        validateEl.classList.remove("hidden");
        if (validateResult.valid) {
          validateEl.textContent = "composer.json is valid.";
          validateEl.classList.remove("text-rm-warning");
          validateEl.classList.add("text-rm-muted");
        } else {
          validateEl.textContent = "Invalid: " + (validateResult.message || "validation failed").split("\n")[0];
          validateEl.classList.add("text-rm-warning");
          validateEl.classList.remove("text-rm-muted");
        }
      }
      if (lockWarningEl && validateResult.lockOutOfDate) lockWarningEl.classList.remove("hidden");
    } catch (_) {
      if (validateEl) {
        validateEl.classList.remove("hidden");
        validateEl.textContent = "Could not run composer validate.";
        validateEl.classList.add("text-rm-warning");
      }
    }
    const directOnly = document.getElementById("detail-composer-direct-only")?.checked ?? false;
    try {
      const outdated = await window.releaseManager.getComposerOutdated(dirPath, directOnly);
      if (errorEl) errorEl.classList.add("hidden");
      if (loadingEl) loadingEl.classList.add("hidden");
      if (!outdated.ok) {
        if (errorEl) {
          errorEl.textContent = outdated.error || "Failed to check outdated";
          errorEl.classList.remove("hidden");
        }
        if (wrapEl) wrapEl.classList.add("hidden");
      } else {
        const packages = outdated.packages || [];
        if (wrapEl) wrapEl.classList.remove("hidden");
        const updateAllBtn = document.getElementById("btn-composer-update-all");
        if (updateAllBtn) updateAllBtn.classList.toggle("hidden", packages.length === 0);
        if (tbodyEl) {
          tbodyEl.innerHTML = "";
          packages.forEach((p) => {
            const tr = document.createElement("tr");
            tr.className = "border-b border-rm-border last:border-b-0";
            const updateBtn = document.createElement("button");
            updateBtn.type = "button";
            updateBtn.className = "text-xs text-rm-accent hover:underline border-none bg-transparent cursor-pointer p-0";
            updateBtn.textContent = "Update";
            updateBtn.addEventListener("click", () => runComposerUpdate(dirPath, [p.name]));
            tr.innerHTML = `
          <td class="py-2 px-3 font-mono text-rm-text">${escapeHtml(p.name)}</td>
          <td class="py-2 px-3 font-mono text-sm text-rm-muted">${escapeHtml(p.version)}</td>
          <td class="py-2 px-3 font-mono text-sm text-rm-accent">${escapeHtml(p.latest)}</td>
          <td class="py-2 px-3 text-sm text-rm-muted">${escapeHtml(p.latestStatus || "")}</td>
          <td class="py-2 px-3"></td>
        `;
            tr.querySelector("td:last-child").appendChild(updateBtn);
            tbodyEl.appendChild(tr);
          });
        }
        if (emptyEl) emptyEl.classList.toggle("hidden", packages.length > 0);
      }
    } catch (_) {
      if (loadingEl) loadingEl.classList.add("hidden");
      if (errorEl) {
        errorEl.textContent = "Failed to check outdated packages";
        errorEl.classList.remove("hidden");
      }
      if (wrapEl) wrapEl.classList.add("hidden");
    }
    try {
      const auditResult = await window.releaseManager.getComposerAudit(dirPath);
      if (auditWrapEl) auditWrapEl.classList.remove("hidden");
      if (auditErrorEl) auditErrorEl.classList.add("hidden");
      if (!auditResult.ok) {
        if (auditErrorEl) {
          auditErrorEl.textContent = auditResult.error || "composer audit failed";
          auditErrorEl.classList.remove("hidden");
        }
        if (auditEmptyEl) auditEmptyEl.classList.add("hidden");
        if (auditTbodyEl) auditTbodyEl.innerHTML = "";
      } else {
        const advisories = auditResult.advisories || [];
        if (auditTbodyEl) {
          auditTbodyEl.innerHTML = "";
          advisories.forEach((a) => {
            const tr = document.createElement("tr");
            tr.className = "border-b border-rm-border last:border-b-0";
            const linkCell = a.link && String(a.link).startsWith("http") ? `<a href="${escapeHtml(a.link)}" class="text-rm-accent hover:underline" target="_blank" rel="noopener">${escapeHtml(a.advisory)}</a>` : escapeHtml(a.advisory);
            tr.innerHTML = `
          <td class="py-2 px-3 font-mono text-rm-text">${escapeHtml(a.name)}${a.version ? ` ${escapeHtml(a.version)}` : ""}</td>
          <td class="py-2 px-3 text-sm">${escapeHtml(a.severity || "\u2014")}</td>
          <td class="py-2 px-3 text-sm text-rm-muted">${linkCell}</td>
        `;
            auditTbodyEl.appendChild(tr);
          });
        }
        if (auditEmptyEl) auditEmptyEl.classList.toggle("hidden", advisories.length > 0);
      }
    } catch (_) {
      if (auditWrapEl) auditWrapEl.classList.remove("hidden");
      if (auditErrorEl) {
        auditErrorEl.textContent = "Could not run composer audit.";
        auditErrorEl.classList.remove("hidden");
      }
      if (auditEmptyEl) auditEmptyEl.classList.add("hidden");
    }
  }
  async function loadTestsScripts(dirPath, projectType) {
    const wrapEl = document.getElementById("detail-tests-scripts-wrap");
    const listEl = document.getElementById("detail-tests-scripts");
    if (!wrapEl || !listEl) return;
    wrapEl.classList.add("hidden");
    listEl.innerHTML = "";
    try {
      const { ok, scripts } = await window.releaseManager.getProjectTestScripts(dirPath, projectType);
      if (!ok || !scripts || scripts.length === 0) return;
      wrapEl.classList.remove("hidden");
      scripts.forEach((name) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn-secondary btn-compact text-xs";
        btn.dataset.script = name;
        btn.textContent = name;
        listEl.appendChild(btn);
      });
    } catch (_) {
    }
  }
  function setDetailContent(info, releasesUrl = null, githubReleases = []) {
    state.currentInfo = info;
    if (!info || !info.ok) {
      detailNameEl.textContent = "\u2014";
      detailPathEl.textContent = state.selectedPath || "";
      detailPathEl.title = state.selectedPath || "";
      detailVersionEl.textContent = "\u2014";
      detailTagEl.textContent = "\u2014";
      detailGitStateEl.classList.add("hidden");
      [detailTagsCardEl, detailCommitLogCardEl, detailBranchesDeleteCardEl, detailRemotesCardEl, detailCompareResetCardEl, detailGitignoreCardEl, detailSubmodulesCardEl, detailReflogCardEl, detailGitattributesCardEl, detailWorktreesCardEl, detailBisectCardEl].forEach((el) => {
        if (el) el.classList.add("hidden");
      });
      detailAllVersionsWrapEl?.classList.add("hidden");
      detailRecentCommitsWrapEl?.classList.add("hidden");
      detailErrorEl.classList.add("hidden");
      linkReleasesEl.classList.add("hidden");
      detailTagsWrapEl?.classList.add("hidden");
      if (detailPhpPathEl) detailPhpPathEl.innerHTML = '<option value="">Use default</option>';
      detailPhpWrapEl?.classList.add("hidden");
      detailComposerCardEl?.classList.add("hidden");
      detailTestsCardEl?.classList.add("hidden");
      detailCoverageCardEl?.classList.add("hidden");
      detailCoverageWrapEl?.classList.add("hidden");
      if (releaseNotesEl) releaseNotesEl.value = "";
      return;
    }
    const proj = state.projects.find((p) => p.path === state.selectedPath);
    if (detailTagsWrapEl && detailTagsInputEl) {
      detailTagsWrapEl.classList.remove("hidden");
      const tags = Array.isArray(proj?.tags) ? proj.tags : [];
      detailTagsInputEl.value = tags.join(", ");
    }
    if (releaseNotesEl) releaseNotesEl.value = "";
    const project = state.projects.find((p) => p.path === state.selectedPath);
    if (githubTokenEl) githubTokenEl.value = (project?.githubToken && typeof project.githubToken === "string" ? project.githubToken : "") || "";
    const projectType = info.projectType || "npm";
    if (detailPhpWrapEl) detailPhpWrapEl.classList.add("hidden");
    detailNameEl.textContent = info.name || "\u2014";
    detailPathEl.textContent = info.path || "";
    detailPathEl.title = info.path || "";
    detailVersionEl.textContent = info.version ?? "\u2014";
    detailTagEl.textContent = info.latestTag || "none";
    if (detailUnreleasedCommitsEl) {
      const n = info.commitsSinceLatestTag;
      if (n != null && n > 0 && info.latestTag) {
        detailUnreleasedCommitsEl.textContent = `${n} unreleased commit${n === 1 ? "" : "s"} since ${info.latestTag}`;
        detailUnreleasedCommitsEl.classList.remove("hidden");
        detailUnreleasedCommitsEl.classList.add("text-rm-warning");
        detailUnreleasedCommitsEl.classList.remove("text-rm-muted");
      } else {
        detailUnreleasedCommitsEl.textContent = "";
        detailUnreleasedCommitsEl.classList.add("hidden");
        detailUnreleasedCommitsEl.classList.remove("text-rm-warning");
        detailUnreleasedCommitsEl.classList.add("text-rm-muted");
      }
    }
    const projectTypeLabel = { npm: "", cargo: "Rust", go: "Go", python: "Python", php: "PHP" }[projectType] || "";
    if (detailProjectTypeEl) {
      detailProjectTypeEl.textContent = projectTypeLabel ? `(${projectTypeLabel})` : "";
      detailProjectTypeEl.classList.toggle("hidden", !projectTypeLabel);
    }
    const isNonNpm = projectType !== "npm";
    if (detailReleaseHintEl) {
      detailReleaseHintEl.textContent = isNonNpm ? "Tag and push current version from your manifest." : "Bump version, tag vX.Y.Z, push. With a GitHub token you can add release notes, draft, or pre-release.";
    }
    const detailReleaseNotesWrapEl = document.getElementById("detail-release-notes-wrap");
    const detailReleaseDraftPrereleaseWrapEl = document.getElementById("detail-release-draft-prerelease-wrap");
    const releaseActionsWrapEl2 = document.getElementById("release-actions-wrap");
    if (detailReleaseNotesWrapEl) detailReleaseNotesWrapEl.classList.toggle("hidden", isNonNpm);
    if (detailReleaseDraftPrereleaseWrapEl) detailReleaseDraftPrereleaseWrapEl.classList.toggle("hidden", isNonNpm);
    if (releaseActionsWrapEl2 && isNonNpm) releaseActionsWrapEl2.classList.add("hidden");
    const releaseShortcutsHintEl = document.getElementById("release-shortcuts-hint");
    if (releaseShortcutsHintEl) releaseShortcutsHintEl.classList.toggle("hidden", isNonNpm);
    if (detailReleaseBumpButtonsEl) detailReleaseBumpButtonsEl.classList.toggle("hidden", isNonNpm);
    if (detailReleaseTagOnlyWrapEl) detailReleaseTagOnlyWrapEl.classList.toggle("hidden", !isNonNpm);
    if (detailComposerCardEl) {
      detailComposerCardEl.classList.add("hidden");
      const composerTabBtn = document.querySelector(".detail-tab-composer");
      if (composerTabBtn) composerTabBtn.classList.add("hidden");
      updateDetailTabPanelVisibility();
      if (state.selectedPath) {
        window.releaseManager.getComposerInfo(state.selectedPath).then((manifest) => {
          if (manifest && manifest.ok) {
            detailComposerCardEl.classList.remove("hidden");
            if (composerTabBtn) composerTabBtn.classList.remove("hidden");
            loadComposerSection(state.selectedPath);
            if (detailPhpWrapEl) detailPhpWrapEl.classList.remove("hidden");
            if (detailPhpPathEl) {
              detailPhpPathEl.innerHTML = '<option value="">Use default</option>';
              loadPhpVersionSelect(state.selectedPath, project);
            }
          }
          updateDetailTabPanelVisibility();
        }).catch(() => {
          updateDetailTabPanelVisibility();
        });
      } else {
        updateDetailTabPanelVisibility();
      }
    } else {
      updateDetailTabPanelVisibility();
    }
    const showTests = projectType === "npm" || projectType === "php";
    if (detailTestsCardEl) {
      detailTestsCardEl.classList.toggle("hidden", !showTests);
      const testsTabBtn = document.querySelector(".detail-tab-tests");
      if (testsTabBtn) testsTabBtn.classList.toggle("hidden", !showTests);
      if (showTests && state.selectedPath) loadTestsScripts(state.selectedPath, projectType);
    }
    if (detailCoverageCardEl) {
      detailCoverageCardEl.classList.toggle("hidden", !showTests);
      const coverageTabBtn = document.querySelector(".detail-tab-coverage");
      if (coverageTabBtn) coverageTabBtn.classList.toggle("hidden", !showTests);
    }
    if (detailCoverageWrapEl && detailCoverageSummaryEl) {
      detailCoverageWrapEl.classList.toggle("hidden", !showTests);
      detailCoverageSummaryEl.textContent = showTests && state.selectedPath && state.lastCoverageByPath[state.selectedPath] ? state.lastCoverageByPath[state.selectedPath] : "\u2014";
    }
    updateDetailTabPanelVisibility();
    const tagsFromReleases = githubReleases.length > 0 ? githubReleases.map((r) => r.tag_name) : info.allTags || [];
    if (detailAllVersionsWrapEl) {
      detailAllVersionsWrapEl.classList.toggle("hidden", !info.hasGit);
      if (info.hasGit) {
        if (detailAllVersionsEmptyEl) {
          detailAllVersionsEmptyEl.classList.toggle("hidden", tagsFromReleases.length > 0);
          detailAllVersionsEmptyEl.textContent = "No releases yet. Sync to fetch tags, or create a release.";
        }
        if (detailAllVersionsEl) {
          detailAllVersionsEl.innerHTML = "";
          const tagUrlBase = releasesUrl ? releasesUrl.replace(/\/?$/, "") + "/tag/" : null;
          tagsFromReleases.forEach((tag) => {
            const li = document.createElement("li");
            li.className = "flex items-center gap-3 flex-wrap font-mono text-sm py-0.5";
            if (tagUrlBase) {
              const a = document.createElement("a");
              a.href = tagUrlBase + encodeURIComponent(tag);
              a.className = "text-rm-accent hover:underline";
              a.textContent = tag;
              a.target = "_blank";
              a.rel = "noopener";
              a.onclick = (e) => {
                e.preventDefault();
                window.releaseManager.openUrl(a.href);
              };
              li.appendChild(a);
              const downloadBtn = document.createElement("button");
              downloadBtn.type = "button";
              downloadBtn.className = "text-xs text-rm-muted hover:text-rm-accent border-none bg-transparent cursor-pointer p-0";
              downloadBtn.textContent = "Download";
              downloadBtn.addEventListener("click", (e) => {
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
      let makeFileRow = function(line, showStage, showUnstage) {
        const filePath = isParsed ? line.filePath : line.includes(" -> ") ? line.split(" -> ")[1].trim() : line.length > 3 ? line.slice(3).trim() : line;
        const isUntracked = isParsed ? line.isUntracked : line.slice(0, 2) === "??" || line.length > 0 && line[0] === "?";
        const isUnmerged = isParsed ? line.isUnmerged : /^[UAD][UAD]$/.test(line.length >= 2 ? line.slice(0, 2) : "");
        const li = document.createElement("li");
        li.className = "flex items-center gap-2 flex-wrap" + (isUnmerged ? " font-medium text-rm-warning" : "");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "text-left truncate flex-1 min-w-0 text-rm-muted hover:text-rm-accent hover:underline bg-transparent border-0 p-0 cursor-pointer text-xs";
        if (isUnmerged) btn.classList.add("text-rm-warning", "hover:text-rm-warning");
        btn.title = isUnmerged ? `Conflict: ${filePath}` : `View: ${filePath}`;
        btn.textContent = isUnmerged ? `${filePath} (conflict)` : filePath;
        btn.dataset.filePath = filePath;
        btn.dataset.untracked = isUntracked ? "1" : "0";
        btn.addEventListener("click", () => {
          if (state.selectedPath) openFileViewerModal(state.selectedPath, filePath, isUntracked);
        });
        li.appendChild(btn);
        const span = document.createElement("span");
        span.className = "flex items-center gap-1 shrink-0";
        if (showStage) {
          const stageBtn = document.createElement("button");
          stageBtn.type = "button";
          stageBtn.className = "text-xs text-rm-accent hover:underline border-none bg-transparent cursor-pointer p-0 btn-with-icon";
          stageBtn.appendChild(createBtnIcon(BTN_ICONS.plus));
          stageBtn.appendChild(document.createTextNode("Stage"));
          stageBtn.onclick = (e) => {
            e.stopPropagation();
            if (state.selectedPath && confirm(GIT_ACTION_CONFIRMS.stage)) runGitAction("Stage", () => window.releaseManager.stageFile(state.selectedPath, filePath), { refreshAlways: true });
          };
          span.appendChild(stageBtn);
        }
        if (showUnstage) {
          const unstageBtn = document.createElement("button");
          unstageBtn.type = "button";
          unstageBtn.className = "text-xs text-rm-muted hover:underline border-none bg-transparent cursor-pointer p-0 btn-with-icon";
          unstageBtn.appendChild(createBtnIcon(BTN_ICONS.minus));
          unstageBtn.appendChild(document.createTextNode("Unstage"));
          unstageBtn.onclick = (e) => {
            e.stopPropagation();
            if (state.selectedPath && confirm(GIT_ACTION_CONFIRMS.unstage)) runGitAction("Unstage", () => window.releaseManager.unstageFile(state.selectedPath, filePath), { refreshAlways: true });
          };
          span.appendChild(unstageBtn);
        }
        const discardBtn = document.createElement("button");
        discardBtn.type = "button";
        discardBtn.className = "text-xs text-rm-warning hover:underline border-none bg-transparent cursor-pointer p-0 btn-with-icon";
        discardBtn.appendChild(createBtnIcon(BTN_ICONS.trash));
        discardBtn.appendChild(document.createTextNode("Discard"));
        discardBtn.onclick = (e) => {
          e.stopPropagation();
          if (state.selectedPath && confirm((GIT_ACTION_CONFIRMS.discardFile || "Discard changes in this file?") + "\n\n" + filePath)) runGitAction("Discard file", () => window.releaseManager.discardFile(state.selectedPath, filePath), { refreshAlways: true });
        };
        span.appendChild(discardBtn);
        li.appendChild(span);
        return li;
      }, makeRightPanelFileRow = function(line) {
        const filePath = isParsed ? line.filePath : line.includes(" -> ") ? line.split(" -> ")[1].trim() : line.length > 3 ? line.slice(3).trim() : line;
        const isUntracked = isParsed ? line.isUntracked : line.slice(0, 2) === "??" || line.length > 0 && line[0] === "?";
        const li = document.createElement("li");
        li.className = "flex items-center gap-1.5 truncate";
        const icon = document.createElement("span");
        icon.className = "shrink-0 text-rm-muted";
        icon.innerHTML = isUntracked ? '<span class="text-rm-accent">+</span>' : '<span class="text-rm-warning">M</span>';
        li.appendChild(icon);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "text-left truncate flex-1 min-w-0 text-rm-muted hover:text-rm-accent hover:underline bg-transparent border-0 p-0 cursor-pointer text-xs";
        btn.textContent = filePath;
        btn.title = filePath;
        btn.dataset.filePath = filePath;
        btn.dataset.untracked = isUntracked ? "1" : "0";
        btn.addEventListener("click", () => {
          if (state.selectedPath) openFileViewerModal(state.selectedPath, filePath, isUntracked);
        });
        li.appendChild(btn);
        return li;
      };
      detailGitStateEl.classList.remove("hidden");
      const repoNameEl = document.getElementById("detail-git-repo-name");
      if (repoNameEl) repoNameEl.textContent = (info.name || state.selectedPath && state.selectedPath.split(/[/\\]/).filter(Boolean).pop() || "\u2014").slice(0, 24);
      const workingDirEl = document.getElementById("detail-git-working-dir-status");
      const btnViewChange = document.getElementById("btn-git-view-change");
      if (workingDirEl) {
        const count = (info.uncommittedLines || []).length;
        workingDirEl.textContent = count > 0 ? `${count} file change${count !== 1 ? "s" : ""} in working directory` : "Working directory clean";
      }
      if (btnViewChange) btnViewChange.classList.toggle("hidden", !(info.uncommittedLines || []).length);
      const rightFileCountEl = document.getElementById("detail-git-right-file-count");
      const btnRightStageAll = document.getElementById("btn-git-right-stage-all");
      const btnRightStageAndCommit = document.getElementById("btn-git-right-stage-and-commit");
      if (rightFileCountEl) {
        const n = (info.uncommittedLines || []).length;
        const branch = info.branch || "current branch";
        rightFileCountEl.textContent = n === 0 ? `0 file changes on ${branch}` : `${n} file change${n !== 1 ? "s" : ""} on ${branch}`;
      }
      if (btnRightStageAll) btnRightStageAll.classList.toggle("hidden", (info.uncommittedLines || []).length === 0);
      if (btnRightStageAndCommit) btnRightStageAndCommit.classList.toggle("hidden", (info.uncommittedLines || []).length === 0);
      [detailTagsCardEl, detailCommitLogCardEl, detailBranchesDeleteCardEl, detailRemotesCardEl, detailCompareResetCardEl, detailGitignoreCardEl, detailSubmodulesCardEl, detailReflogCardEl, detailGitattributesCardEl, detailWorktreesCardEl, detailBisectCardEl].forEach((el) => {
        if (el) el.classList.remove("hidden");
      });
      updateGitSubtabVisibility(state.currentGitSubtab);
      const conflictBtn = document.getElementById("btn-open-conflicted-in-editor");
      if (conflictBtn) conflictBtn.classList.toggle("hidden", !(info.conflictCount > 0));
      detailBranchEl.textContent = info.branch ? `Branch: ${info.branch}` : "Branch: \u2014";
      const ab = formatAheadBehind(info.ahead, info.behind);
      detailAheadBehindEl.textContent = ab || "Up to date";
      detailAheadBehindEl.classList.toggle("text-rm-muted", !ab);
      const lines = info.uncommittedLines || [];
      const conflictCount = info.conflictCount ?? 0;
      const hasMergeConflicts = conflictCount > 0;
      const isParsed = lines.length > 0 && typeof lines[0] === "object" && lines[0] !== null && "filePath" in lines[0];
      if (detailUncommittedLabelEl) {
        if (hasMergeConflicts) {
          detailUncommittedLabelEl.textContent = `Merge conflicts (${conflictCount}) \u2014 resolve in editor or abort merge`;
        } else {
          detailUncommittedLabelEl.textContent = lines.length > 0 ? `Uncommitted changes (${lines.length}) \u2014 click a file to view changes` : "Working tree clean";
        }
        detailUncommittedLabelEl.classList.toggle("text-rm-warning", lines.length > 0);
        detailUncommittedLabelEl.classList.toggle("text-rm-muted", lines.length === 0);
      }
      const detailGitNextStepEl = document.getElementById("detail-git-next-step");
      if (detailGitNextStepEl) detailGitNextStepEl.classList.toggle("hidden", lines.length > 0);
      const btnMergeAbort = document.getElementById("btn-git-merge-abort");
      if (btnMergeAbort) btnMergeAbort.classList.toggle("hidden", !hasMergeConflicts);
      const mergeConflictHintEl = document.getElementById("detail-git-merge-conflict-hint");
      if (mergeConflictHintEl) mergeConflictHintEl.classList.toggle("hidden", !hasMergeConflicts);
      const unstagedLines = isParsed ? lines.filter((l) => l.hasUnstaged) : lines.filter((l) => {
        const s = typeof l === "string" ? l.slice(0, 2) : l.status || "";
        return s === "??" || s[1] && s[1] !== " ";
      });
      const stagedLines = isParsed ? lines.filter((l) => l.isStaged) : lines.filter((l) => {
        const s = typeof l === "string" ? l.slice(0, 2) : l.status || "";
        return s[0] && s[0] !== " " && s[0] !== "?";
      });
      const detailUnstagedLabelEl = document.getElementById("detail-unstaged-label");
      const detailStagedLabelEl = document.getElementById("detail-staged-label");
      const detailStagedListEl = document.getElementById("detail-staged-list");
      if (detailUnstagedLabelEl) detailUnstagedLabelEl.classList.toggle("hidden", unstagedLines.length === 0);
      if (detailStagedLabelEl) detailStagedLabelEl.classList.toggle("hidden", stagedLines.length === 0);
      if (detailUncommittedListEl) {
        detailUncommittedListEl.innerHTML = "";
        unstagedLines.forEach((line) => detailUncommittedListEl.appendChild(makeFileRow(line, true, false)));
      }
      if (detailStagedListEl) {
        detailStagedListEl.innerHTML = "";
        stagedLines.forEach((line) => detailStagedListEl.appendChild(makeFileRow(line, false, true)));
      }
      const rightUnstagedEl = document.getElementById("detail-git-right-unstaged");
      const rightUnstagedEmptyEl = document.getElementById("detail-git-right-unstaged-empty");
      const rightStagedEl = document.getElementById("detail-git-right-staged");
      const rightStagedEmptyEl = document.getElementById("detail-git-right-staged-empty");
      if (rightUnstagedEl && rightUnstagedEmptyEl) {
        rightUnstagedEl.innerHTML = "";
        if (unstagedLines.length) {
          rightUnstagedEmptyEl.classList.add("hidden");
          unstagedLines.forEach((line) => rightUnstagedEl.appendChild(makeRightPanelFileRow(line)));
        } else {
          rightUnstagedEmptyEl.classList.remove("hidden");
        }
      }
      if (rightStagedEl && rightStagedEmptyEl) {
        rightStagedEl.innerHTML = "";
        if (stagedLines.length) {
          rightStagedEmptyEl.classList.add("hidden");
          stagedLines.forEach((line) => rightStagedEl.appendChild(makeRightPanelFileRow(line)));
        } else {
          rightStagedEmptyEl.classList.remove("hidden");
        }
      }
      if (detailCommitWrapEl) {
        detailCommitWrapEl.classList.toggle("hidden", lines.length === 0);
        if (lines.length === 0 && detailCommitMessageEl) detailCommitMessageEl.value = "";
        if (detailCommitStatusEl) {
          detailCommitStatusEl.textContent = "";
          detailCommitStatusEl.classList.add("hidden");
        }
        const btnAmend = document.getElementById("btn-git-amend");
        if (btnAmend) btnAmend.classList.toggle("hidden", lines.length === 0);
      }
      const btnStash = document.getElementById("btn-git-stash");
      const btnDiscard = document.getElementById("btn-git-discard");
      if (btnStash) btnStash.disabled = lines.length === 0;
      if (btnDiscard) btnDiscard.disabled = lines.length === 0;
    } else {
      detailGitStateEl.classList.add("hidden");
    }
    if (info.gitRemote && releasesUrl) {
      linkReleasesEl.classList.remove("hidden");
      linkReleasesEl.href = releasesUrl;
      linkReleasesEl.onclick = (e) => {
        e.preventDefault();
        window.releaseManager.openUrl(releasesUrl);
      };
    } else {
      linkReleasesEl.classList.add("hidden");
    }
    detailErrorEl.classList.add("hidden");
    if (info.ok && state.selectedPath && info.hasGit) {
      loadRecentCommitsHint(state.selectedPath);
    } else {
      detailRecentCommitsWrapEl?.classList.add("hidden");
      if (detailBumpSuggestionEl) {
        detailBumpSuggestionEl.classList.add("hidden");
        detailBumpSuggestionEl.textContent = "";
      }
    }
  }
  async function loadRecentCommitsHint(dirPath) {
    try {
      const result = await window.releaseManager.getRecentCommits(dirPath, 7);
      if (state.selectedPath !== dirPath) return;
      if (!detailRecentCommitsWrapEl || !detailRecentCommitsEl) return;
      if (!result.ok || !result.commits?.length) {
        detailRecentCommitsWrapEl.classList.add("hidden");
        if (detailBumpSuggestionEl) {
          detailBumpSuggestionEl.classList.add("hidden");
          detailBumpSuggestionEl.textContent = "";
        }
        return;
      }
      detailRecentCommitsEl.innerHTML = "";
      result.commits.slice(0, 7).forEach((subject) => {
        const li = document.createElement("li");
        li.className = "truncate";
        li.title = subject;
        li.textContent = subject;
        detailRecentCommitsEl.appendChild(li);
      });
      detailRecentCommitsWrapEl.classList.remove("hidden");
      const suggested = await window.releaseManager.getSuggestedBump(result.commits);
      if (state.selectedPath !== dirPath) return;
      if (detailBumpSuggestionEl) {
        if (suggested) {
          detailBumpSuggestionEl.textContent = `Suggested bump: ${suggested} (from conventional commits)`;
          detailBumpSuggestionEl.classList.remove("hidden");
        } else {
          detailBumpSuggestionEl.textContent = "";
          detailBumpSuggestionEl.classList.add("hidden");
        }
      }
    } catch (_) {
      if (state.selectedPath === dirPath) detailRecentCommitsWrapEl?.classList.add("hidden");
    }
  }
  function applyGitSidebarFilter() {
    const filterEl = document.getElementById("detail-git-filter");
    const query = (filterEl?.value ?? "").trim().toLowerCase();
    const selector = "#detail-git-sidebar-local li, #detail-git-sidebar-remote li, #detail-git-sidebar-tags li";
    document.querySelectorAll(selector).forEach((li) => {
      const text = (li.textContent ?? "").trim();
      const match = !query || text.toLowerCase().includes(query);
      li.classList.toggle("hidden", !match);
    });
  }
  async function loadGitExtras(dirPath, currentBranch, branchResult) {
    const current = currentBranch || (branchResult?.current ?? "");
    const branches = branchResult?.ok && branchResult?.branches?.length ? branchResult.branches : [];
    const otherBranches = branches.filter((b) => b !== current);
    const signCommits = await window.releaseManager.getPreference("signCommits");
    const detailCommitSignEl = document.getElementById("detail-commit-sign");
    if (detailCommitSignEl) detailCommitSignEl.checked = !!signCommits;
    const mergeSelect = document.getElementById("detail-merge-branch-select");
    const rebaseSelect = document.getElementById("detail-rebase-onto-select");
    const deleteSelect = document.getElementById("detail-delete-branch-select");
    if (mergeSelect) {
      mergeSelect.innerHTML = '<option value="">\u2014</option>';
      otherBranches.forEach((b) => {
        const o = document.createElement("option");
        o.value = b;
        o.textContent = b;
        mergeSelect.appendChild(o);
      });
    }
    if (rebaseSelect) {
      rebaseSelect.innerHTML = '<option value="">\u2014</option>';
      otherBranches.forEach((b) => {
        const o = document.createElement("option");
        o.value = b;
        o.textContent = b;
        rebaseSelect.appendChild(o);
      });
    }
    if (deleteSelect) {
      deleteSelect.innerHTML = '<option value="">\u2014</option>';
      otherBranches.forEach((b) => {
        const o = document.createElement("option");
        o.value = b;
        o.textContent = b;
        deleteSelect.appendChild(o);
      });
    }
    const state2 = await window.releaseManager.getGitState(dirPath);
    const btnMergeContinue = document.getElementById("btn-git-merge-continue");
    const btnRebaseContinue = document.getElementById("btn-git-rebase-continue");
    const btnRebaseSkip = document.getElementById("btn-git-rebase-skip");
    const btnRebaseAbort = document.getElementById("btn-git-rebase-abort");
    const btnCherryPickAbort = document.getElementById("btn-git-cherry-pick-abort");
    const btnCherryPickContinue = document.getElementById("btn-git-cherry-pick-continue");
    if (btnMergeContinue) btnMergeContinue.classList.toggle("hidden", !state2?.merging);
    if (btnRebaseContinue) btnRebaseContinue.classList.toggle("hidden", !state2?.rebasing);
    if (btnRebaseSkip) btnRebaseSkip.classList.toggle("hidden", !state2?.rebasing);
    if (btnRebaseAbort) btnRebaseAbort.classList.toggle("hidden", !state2?.rebasing);
    if (btnCherryPickAbort) btnCherryPickAbort.classList.toggle("hidden", !state2?.cherryPicking);
    if (btnCherryPickContinue) btnCherryPickContinue.classList.toggle("hidden", !state2?.cherryPicking);
    const stashWrap = document.getElementById("detail-stash-list-wrap");
    const stashList = document.getElementById("detail-stash-list");
    const stashRes = await window.releaseManager.getStashList(dirPath);
    if (stashWrap && stashList) {
      stashList.innerHTML = "";
      if (stashRes.ok && stashRes.entries?.length) {
        stashWrap.classList.remove("hidden");
        stashRes.entries.forEach((e) => {
          const li = document.createElement("li");
          li.className = "flex items-center gap-2 flex-wrap";
          li.innerHTML = `<span class="truncate">${e.index}: ${e.message || "(no message)"}</span>`;
          const applyBtn = document.createElement("button");
          applyBtn.type = "button";
          applyBtn.className = "text-xs text-rm-accent hover:underline border-none bg-transparent cursor-pointer p-0 btn-with-icon";
          applyBtn.appendChild(createBtnIcon(BTN_ICONS.play));
          applyBtn.appendChild(document.createTextNode("Apply"));
          applyBtn.dataset.index = e.index;
          applyBtn.onclick = async () => {
            const statusEl = document.getElementById("detail-git-action-status");
            if (statusEl) {
              statusEl.textContent = "Applying stash\u2026";
              statusEl.classList.remove("hidden");
            }
            const result = await window.releaseManager.stashApply(dirPath, e.index);
            if (statusEl) {
              statusEl.textContent = result?.ok ? GIT_ACTION_SUCCESS.stashApply : result?.error || "Failed";
              statusEl.classList.toggle("text-rm-warning", !result?.ok);
            }
            loadProjectInfo(dirPath);
          };
          const dropBtn = document.createElement("button");
          dropBtn.type = "button";
          dropBtn.className = "text-xs text-rm-warning hover:underline border-none bg-transparent cursor-pointer p-0 btn-with-icon";
          dropBtn.appendChild(createBtnIcon(BTN_ICONS.trash));
          dropBtn.appendChild(document.createTextNode("Drop"));
          dropBtn.dataset.index = e.index;
          dropBtn.onclick = async () => {
            if (!confirm("Drop this stash entry?")) return;
            const statusEl = document.getElementById("detail-git-action-status");
            if (statusEl) {
              statusEl.textContent = "Dropping stash\u2026";
              statusEl.classList.remove("hidden");
            }
            const result = await window.releaseManager.stashDrop(dirPath, e.index);
            if (statusEl) {
              statusEl.textContent = result?.ok ? GIT_ACTION_SUCCESS.stashDrop : result?.error || "Failed";
              statusEl.classList.toggle("text-rm-warning", !result?.ok);
            }
            loadProjectInfo(dirPath);
          };
          li.appendChild(applyBtn);
          li.appendChild(dropBtn);
          stashList.appendChild(li);
        });
      } else stashWrap.classList.add("hidden");
    }
    const tagRes = await window.releaseManager.getTags(dirPath);
    const tagSelect = document.getElementById("detail-tag-select");
    if (tagSelect) {
      tagSelect.innerHTML = '<option value="">\u2014</option>';
      if (tagRes.ok && tagRes.tags?.length) tagRes.tags.forEach((t) => {
        const o = document.createElement("option");
        o.value = t;
        o.textContent = t;
        tagSelect.appendChild(o);
      });
    }
    const sidebarTagsEl = document.getElementById("detail-git-sidebar-tags");
    if (sidebarTagsEl) {
      sidebarTagsEl.innerHTML = "";
      if (tagRes.ok && tagRes.tags?.length) {
        tagRes.tags.slice(0, 30).forEach((t) => {
          const li = document.createElement("li");
          li.className = "detail-git-sidebar-tag cursor-pointer hover:text-rm-accent truncate";
          li.textContent = t;
          li.title = t;
          li.dataset.tag = t;
          li.addEventListener("click", () => {
            if (!state2.selectedPath) return;
            runCheckoutWithStashOption(() => window.releaseManager.checkoutTag(state2.selectedPath, t));
          });
          sidebarTagsEl.appendChild(li);
        });
      }
    }
    const createTagRefSelect = document.getElementById("detail-create-tag-ref");
    if (createTagRefSelect) {
      createTagRefSelect.innerHTML = '<option value="">HEAD</option>';
      branches.forEach((b) => {
        const o = document.createElement("option");
        o.value = b;
        o.textContent = b;
        createTagRefSelect.appendChild(o);
      });
    }
    const logList = document.getElementById("detail-commit-log-list");
    const logEmpty = document.getElementById("detail-commit-log-empty");
    const commitTbody = document.getElementById("detail-git-commit-tbody");
    const commitEmpty = document.getElementById("detail-git-commit-empty");
    const toolbarBranch = document.getElementById("detail-git-toolbar-branch");
    const sidebarLocal = document.getElementById("detail-git-sidebar-local");
    const sidebarRemote = document.getElementById("detail-git-sidebar-remote");
    if (toolbarBranch) {
      toolbarBranch.innerHTML = '<option value="">\u2014</option>';
      if (branches?.length) {
        branches.forEach((b) => {
          const opt = document.createElement("option");
          opt.value = b;
          opt.textContent = b;
          if (b === current) opt.selected = true;
          toolbarBranch.appendChild(opt);
        });
      }
    }
    if (sidebarLocal) {
      sidebarLocal.innerHTML = "";
      if (branches?.length) {
        branches.forEach((b) => {
          const li = document.createElement("li");
          li.className = "detail-git-sidebar-branch cursor-pointer hover:text-rm-accent truncate";
          li.textContent = b;
          li.title = b;
          if (b === current) li.classList.add("font-medium", "text-rm-accent");
          li.dataset.branch = b;
          li.addEventListener("click", () => {
            if (!state2.selectedPath || b === current) return;
            runCheckoutWithStashOption(() => window.releaseManager.checkoutBranch(state2.selectedPath, b));
          });
          sidebarLocal.appendChild(li);
        });
      }
    }
    const remoteBranchesRes = sidebarRemote ? await window.releaseManager.getRemoteBranches(dirPath) : null;
    if (sidebarRemote) {
      sidebarRemote.innerHTML = "";
      if (remoteBranchesRes?.ok && remoteBranchesRes.branches?.length) {
        remoteBranchesRes.branches.slice(0, 20).forEach((ref) => {
          const li = document.createElement("li");
          li.className = "truncate text-rm-muted text-xs cursor-pointer hover:text-rm-accent";
          li.textContent = ref;
          li.title = ref;
          li.dataset.ref = ref;
          li.addEventListener("click", () => {
            if (!state2.selectedPath) return;
            runCheckoutWithStashOption(() => window.releaseManager.checkoutRemoteBranch(state2.selectedPath, ref));
          });
          sidebarRemote.appendChild(li);
        });
      }
    }
    applyGitSidebarFilter();
    const logRes = await window.releaseManager.getCommitLog(dirPath, 50);
    if (logList && logEmpty) {
      logList.innerHTML = "";
      if (logRes.ok && logRes.commits?.length) {
        logEmpty.classList.add("hidden");
        logRes.commits.forEach((c) => {
          const li = document.createElement("li");
          li.className = "flex items-center gap-2 flex-wrap cursor-pointer hover:text-rm-text";
          li.innerHTML = `<span class="font-mono text-rm-accent">${c.sha}</span> <span class="truncate flex-1 min-w-0">${escapeHtml(c.subject)}</span> <span class="text-rm-muted text-xs">${escapeHtml(c.author)} ${c.date}</span>`;
          li.dataset.sha = c.sha;
          li.onclick = () => openCommitDetailModal(dirPath, c.sha);
          logList.appendChild(li);
        });
      } else {
        logEmpty.classList.remove("hidden");
      }
    }
    if (commitTbody && commitEmpty) {
      commitTbody.innerHTML = "";
      if (logRes.ok && logRes.commits?.length) {
        commitEmpty.classList.add("hidden");
        logRes.commits.forEach((c, i) => {
          const tr = document.createElement("tr");
          tr.dataset.sha = c.sha;
          tr.innerHTML = `<td class="text-rm-muted">\u25CF</td><td class="truncate max-w-[16rem]" title="${escapeHtml(c.subject)}">${escapeHtml(c.subject)}</td><td class="text-rm-muted text-xs">${escapeHtml(c.author)}</td><td class="text-rm-muted text-xs">${c.date}</td>`;
          tr.addEventListener("click", () => openCommitDetailModal(dirPath, c.sha));
          commitTbody.appendChild(tr);
        });
      } else {
        commitEmpty.classList.remove("hidden");
      }
    }
    const remotesList = document.getElementById("detail-remotes-list");
    const fetchRemoteSelect = document.getElementById("detail-fetch-remote-select");
    if (remotesList || fetchRemoteSelect) {
      const remotesRes = await window.releaseManager.getRemotes(dirPath);
      if (fetchRemoteSelect) {
        fetchRemoteSelect.innerHTML = '<option value="">\u2014</option>';
        if (remotesRes.ok && remotesRes.remotes?.length) remotesRes.remotes.forEach((r) => {
          const o = document.createElement("option");
          o.value = r.name;
          o.textContent = r.name;
          fetchRemoteSelect.appendChild(o);
        });
      }
      if (remotesList) {
        remotesList.innerHTML = "";
        if (remotesRes.ok && remotesRes.remotes?.length) {
          remotesRes.remotes.forEach((r) => {
            const li = document.createElement("li");
            li.className = "flex items-center justify-between gap-2 flex-wrap";
            li.innerHTML = `<span class="font-medium">${escapeHtml(r.name)}</span> <span class="text-rm-muted text-xs truncate flex-1 min-w-0">${escapeHtml(r.url)}</span>`;
            const rmBtn = document.createElement("button");
            rmBtn.type = "button";
            rmBtn.className = "text-xs text-rm-warning hover:underline border-none bg-transparent cursor-pointer p-0 shrink-0 btn-with-icon";
            rmBtn.appendChild(createBtnIcon(BTN_ICONS.trash));
            rmBtn.appendChild(document.createTextNode("Remove"));
            rmBtn.onclick = () => {
              if (confirm(`Remove remote "${r.name}"?`)) runGitAction("Remove remote", () => window.releaseManager.removeRemote(dirPath, r.name), { refreshAlways: true });
            };
            li.appendChild(rmBtn);
            remotesList.appendChild(li);
          });
        }
      }
    }
    const gitignoreContent = document.getElementById("detail-gitignore-content");
    const gitignoreEmpty = document.getElementById("detail-gitignore-empty");
    const btnOpenGitignore = document.getElementById("btn-open-gitignore-editor");
    const btnSaveGitignore = document.getElementById("btn-save-gitignore");
    if (gitignoreContent && gitignoreEmpty && btnOpenGitignore) {
      const igRes = await window.releaseManager.getGitignore(dirPath);
      if (igRes.ok) {
        gitignoreContent.value = igRes.content != null ? igRes.content : "";
        gitignoreContent.classList.toggle("hidden", false);
        gitignoreEmpty.classList.add("hidden");
        btnOpenGitignore.classList.remove("hidden");
        btnOpenGitignore.onclick = () => {
          if (state2.selectedPath) window.releaseManager.openFileInEditor(dirPath, ".gitignore");
        };
        if (btnSaveGitignore) {
          btnSaveGitignore.classList.remove("hidden");
          btnSaveGitignore.onclick = async () => {
            if (!state2.selectedPath) return;
            const r = await window.releaseManager.writeGitignore(state2.selectedPath, gitignoreContent.value);
            const statusEl = document.getElementById("detail-git-action-status");
            if (r?.ok) {
              if (statusEl) {
                statusEl.textContent = "Saved.";
                statusEl.classList.remove("hidden");
              }
              loadProjectInfo(state2.selectedPath);
            } else if (statusEl && r?.error) statusEl.textContent = r.error;
          };
        }
      } else {
        gitignoreContent.classList.add("hidden");
        gitignoreEmpty.classList.remove("hidden");
        gitignoreEmpty.textContent = igRes.error || "No .gitignore file.";
        btnOpenGitignore.classList.add("hidden");
        if (btnSaveGitignore) btnSaveGitignore.classList.add("hidden");
      }
    }
    const subList = document.getElementById("detail-submodules-list");
    const subEmpty = document.getElementById("detail-submodules-empty");
    const btnSubUpdate = document.getElementById("btn-submodule-update");
    if (subList && subEmpty && btnSubUpdate) {
      const subRes = await window.releaseManager.getSubmodules(dirPath);
      subList.innerHTML = "";
      if (subRes.ok && subRes.submodules?.length) {
        subEmpty.classList.add("hidden");
        btnSubUpdate.classList.remove("hidden");
        subRes.submodules.forEach((s) => {
          const li = document.createElement("li");
          li.textContent = `${s.path} (${s.sha.slice(0, 7)}) ${s.url || ""}`;
          subList.appendChild(li);
        });
      } else {
        subEmpty.classList.remove("hidden");
        subEmpty.textContent = subRes.ok ? "No submodules." : subRes.error || "";
        btnSubUpdate.classList.add("hidden");
      }
    }
    const gitattributesContent = document.getElementById("detail-gitattributes-content");
    const gitattributesEmpty = document.getElementById("detail-gitattributes-empty");
    const btnOpenGitattributes = document.getElementById("btn-open-gitattributes-editor");
    const btnSaveGitattributes = document.getElementById("btn-save-gitattributes");
    if (gitattributesContent && gitattributesEmpty && btnOpenGitattributes) {
      const gaRes = await window.releaseManager.getGitattributes(dirPath);
      if (gaRes.ok) {
        gitattributesContent.value = gaRes.content != null ? gaRes.content : "";
        gitattributesContent.classList.toggle("hidden", false);
        gitattributesEmpty.classList.add("hidden");
        btnOpenGitattributes.classList.remove("hidden");
        btnOpenGitattributes.onclick = () => {
          if (state2.selectedPath) window.releaseManager.openFileInEditor(dirPath, ".gitattributes");
        };
        if (btnSaveGitattributes) {
          btnSaveGitattributes.classList.remove("hidden");
          btnSaveGitattributes.onclick = async () => {
            if (!state2.selectedPath) return;
            const r = await window.releaseManager.writeGitattributes(state2.selectedPath, gitattributesContent.value);
            const statusEl = document.getElementById("detail-git-action-status");
            if (r?.ok) {
              if (statusEl) {
                statusEl.textContent = "Saved.";
                statusEl.classList.remove("hidden");
              }
              loadProjectInfo(state2.selectedPath);
            } else if (statusEl && r?.error) statusEl.textContent = r.error;
          };
        }
      } else {
        gitattributesContent.classList.add("hidden");
        gitattributesEmpty.classList.remove("hidden");
        gitattributesEmpty.textContent = gaRes.error || "No .gitattributes file.";
        btnOpenGitattributes.classList.add("hidden");
        if (btnSaveGitattributes) btnSaveGitattributes.classList.add("hidden");
      }
    }
    const wtRes = await window.releaseManager.getWorktrees(dirPath);
    const sidebarWorktreesCountEl = document.getElementById("detail-git-sidebar-worktrees-count");
    if (sidebarWorktreesCountEl) {
      const n = wtRes?.ok && wtRes.worktrees?.length ? wtRes.worktrees.length : 0;
      sidebarWorktreesCountEl.textContent = n === 0 ? "No additional worktrees" : n === 1 ? "1 worktree" : `${n} worktrees`;
    }
    const worktreesList = document.getElementById("detail-worktrees-list");
    if (worktreesList) {
      worktreesList.innerHTML = "";
      if (wtRes.ok && wtRes.worktrees?.length) {
        wtRes.worktrees.forEach((w) => {
          const li = document.createElement("li");
          li.className = "flex items-center justify-between gap-2 flex-wrap text-xs";
          li.innerHTML = `<span class="font-mono truncate">${escapeHtml(w.path)}</span> <span class="text-rm-muted">${escapeHtml(w.branch || w.head || "")}</span>`;
          const rmBtn = document.createElement("button");
          rmBtn.type = "button";
          rmBtn.className = "text-rm-warning hover:underline border-none bg-transparent cursor-pointer p-0 shrink-0 btn-with-icon";
          rmBtn.appendChild(createBtnIcon(BTN_ICONS.trash));
          rmBtn.appendChild(document.createTextNode("Remove"));
          rmBtn.dataset.path = w.path;
          rmBtn.onclick = () => {
            if (confirm(`Remove worktree "${w.path}"?`)) runGitAction("Remove worktree", () => window.releaseManager.worktreeRemove(dirPath, w.path), { refreshAlways: true });
          };
          li.appendChild(rmBtn);
          worktreesList.appendChild(li);
        });
      }
    }
    const bisectStatusEl = document.getElementById("detail-bisect-status");
    const bisectActiveWrap = document.getElementById("detail-bisect-active-wrap");
    const bisectCurrentEl = document.getElementById("detail-bisect-current");
    const bisectGoodBadEl = document.getElementById("detail-bisect-good-bad");
    const bisectProgressEl = document.getElementById("detail-bisect-progress");
    const bisectViewCommitLink = document.getElementById("detail-bisect-view-commit");
    const bisectStartWrap = document.getElementById("detail-bisect-start-wrap");
    const btnBisectGood = document.getElementById("btn-bisect-good");
    const btnBisectBad = document.getElementById("btn-bisect-bad");
    const btnBisectRunTest = document.getElementById("btn-bisect-run-test");
    const btnBisectReset = document.getElementById("btn-bisect-reset");
    if (bisectStatusEl || btnBisectGood) {
      const bisectRes = await window.releaseManager.getBisectStatus(dirPath);
      if (bisectRes.ok && bisectRes.raw) {
        if (bisectStatusEl) {
          bisectStatusEl.textContent = bisectRes.raw;
          bisectStatusEl.classList.remove("hidden");
        }
        const active = !!bisectRes.active;
        if (bisectActiveWrap) bisectActiveWrap.classList.toggle("hidden", !active);
        if (bisectStartWrap) bisectStartWrap.classList.toggle("hidden", active);
        if (active) {
          if (bisectCurrentEl) bisectCurrentEl.textContent = bisectRes.current ? `Current commit: ${bisectRes.current}` : "Current commit: \u2014";
          if (bisectGoodBadEl) bisectGoodBadEl.textContent = [bisectRes.good && `Good: ${bisectRes.good}`, bisectRes.bad && `Bad: ${bisectRes.bad}`].filter(Boolean).join(" \xB7 ") || "\u2014";
          if (bisectProgressEl) bisectProgressEl.textContent = bisectRes.remaining !== "" ? `${bisectRes.remaining} revisions left to test` : "";
          const sha = bisectRes.currentSha || (bisectRes.current ? bisectRes.current.trim().split(/\s/)[0] : "");
          if (bisectViewCommitLink) {
            bisectViewCommitLink.classList.toggle("hidden", !sha);
            bisectViewCommitLink.dataset.bisectSha = sha || "";
          }
        }
        if (btnBisectGood) btnBisectGood.classList.toggle("hidden", !active);
        if (btnBisectBad) btnBisectBad.classList.toggle("hidden", !active);
        const canRunTest = (state2.currentInfo?.projectType === "npm" || state2.currentInfo?.projectType === "php") && active;
        if (btnBisectRunTest) btnBisectRunTest.classList.toggle("hidden", !canRunTest);
        if (btnBisectReset) btnBisectReset.classList.toggle("hidden", !active);
      } else {
        if (bisectStatusEl) bisectStatusEl.classList.add("hidden");
        if (bisectActiveWrap) bisectActiveWrap.classList.add("hidden");
        if (bisectStartWrap) bisectStartWrap.classList.remove("hidden");
        if (bisectViewCommitLink) bisectViewCommitLink.classList.add("hidden");
        if (btnBisectGood) btnBisectGood.classList.add("hidden");
        if (btnBisectBad) btnBisectBad.classList.add("hidden");
        if (btnBisectRunTest) btnBisectRunTest.classList.add("hidden");
        if (btnBisectReset) btnBisectReset.classList.add("hidden");
      }
    }
  }
  function openCommitDetailModal(dirPath, sha) {
    state.modalCommitDetailSha = sha;
    const modal = document.getElementById("modal-commit-detail");
    const title = document.getElementById("modal-commit-detail-title");
    const content = document.getElementById("modal-commit-detail-content");
    if (!modal || !title || !content) return;
    window.releaseManager.getCommitDetail(dirPath, sha).then((r) => {
      if (!r.ok) {
        content.textContent = r.error || "Failed to load";
        title.textContent = sha;
      } else {
        title.textContent = `${r.sha} \u2014 ${r.subject}`;
        content.textContent = `${r.author} ${r.date}

${r.body || ""}

--- diff ---
${r.diff || ""}`;
      }
      modal.classList.remove("hidden");
    });
    window.releaseManager.getCommitLog(dirPath, 1).then((logRes) => {
      const headSha = logRes?.ok && logRes.commits?.[0]?.sha ? logRes.commits[0].sha : null;
      const amendBtn = document.getElementById("btn-commit-detail-amend");
      if (amendBtn) amendBtn.classList.toggle("hidden", !headSha || headSha !== sha);
    });
  }
  function closeCommitDetailModal() {
    document.getElementById("modal-commit-detail")?.classList.add("hidden");
    state.modalCommitDetailSha = null;
  }
  async function loadProjectInfo(dirPath) {
    try {
      const info = await window.releaseManager.getProjectInfo(dirPath);
      let releasesUrl = null;
      let githubReleases = [];
      if (info.ok && info.gitRemote) {
        releasesUrl = await window.releaseManager.getReleasesUrl(info.gitRemote);
        if (releasesUrl) {
          const project = state.projects.find((p) => p.path === dirPath);
          const token = project?.githubToken || null;
          const res = await window.releaseManager.getGitHubReleases(info.gitRemote, token);
          if (res.ok && res.releases?.length) githubReleases = res.releases;
        }
      }
      setDetailContent(info, releasesUrl, githubReleases);
      const proj = state.projects.find((p) => p.path === dirPath);
      if (proj) {
        if (info.projectType != null) proj.projectType = info.projectType;
        if (info.hasComposer != null) proj.hasComposer = info.hasComposer;
        await window.releaseManager.setProjects(state.projects);
      }
      if (info.ok && info.hasGit && state.selectedPath === dirPath && detailBranchSelectEl) {
        const branchResult = await window.releaseManager.getBranches(dirPath);
        detailBranchSelectEl.innerHTML = '<option value="">\u2014</option>';
        if (branchResult.ok && branchResult.branches?.length) {
          branchResult.branches.forEach((b) => {
            const opt = document.createElement("option");
            opt.value = b;
            opt.textContent = b;
            if (b === (branchResult.current || info.branch)) opt.selected = true;
            detailBranchSelectEl.appendChild(opt);
          });
        }
        await loadGitExtras(dirPath, info.branch, branchResult);
      }
    } catch (e) {
      setDetailContent({ ok: false, error: e.message });
      detailErrorEl.textContent = e.message || "Failed to load project";
      detailErrorEl.classList.remove("hidden");
    }
  }
  function showDetailLoading() {
    const el = document.getElementById("detail-loading-overlay");
    if (el) {
      el.classList.remove("hidden");
      el.style.display = "flex";
      el.style.visibility = "visible";
      el.setAttribute("aria-hidden", "false");
    }
    const sidebar = document.getElementById("projects-sidebar");
    if (sidebar) sidebar.classList.remove("hidden");
  }
  function hideDetailLoading() {
    const el = document.getElementById("detail-loading-overlay");
    if (!el) return;
    let done = false;
    function finishHide() {
      if (done) return;
      done = true;
      el.classList.remove("detail-loading-overlay--out");
      el.classList.add("hidden");
      el.style.display = "";
      el.style.visibility = "";
      el.setAttribute("aria-hidden", "true");
    }
    el.classList.add("detail-loading-overlay--out");
    el.addEventListener("animationend", finishHide, { once: true });
    setTimeout(finishHide, 350);
  }
  function selectProject(path) {
    state.selectedPath = path;
    window.releaseManager.setPreference("selectedProjectPath", path || "");
    renderProjectList();
    showDetail();
    setDetailContent(null);
    showDetailLoading();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        loadProjectInfo(path).finally(hideDetailLoading);
      });
    });
  }
  async function addProject() {
    const dirPath = await window.releaseManager.showDirectoryDialog();
    if (!dirPath) return;
    const info = await window.releaseManager.getProjectInfo(dirPath);
    if (!info.ok) {
      alert(info.error || "Invalid project folder");
      return;
    }
    const name = info.name || dirPath.split(/[/\\]/).filter(Boolean).pop();
    if (state.projects.some((p) => p.path === dirPath)) return;
    state.projects.push({ path: dirPath, name, projectType: info.projectType || null, hasComposer: info.hasComposer || false, tags: [], starred: false });
    await window.releaseManager.setProjects(state.projects);
    renderProjectList();
    selectProject(dirPath);
  }
  function removeProject(path) {
    state.projects = state.projects.filter((p) => p.path !== path);
    window.releaseManager.setProjects(state.projects);
    renderProjectList();
    if (state.selectedPath === path) {
      state.selectedPath = state.projects.length ? state.projects[0].path : null;
      if (state.selectedPath) selectProject(state.selectedPath);
      else showNoSelection();
    }
  }
  async function release(bump, force = false) {
    if (!state.selectedPath) return;
    if (!force) {
      const status = await window.releaseManager.getGitStatus(state.selectedPath);
      if (!status.clean) {
        const go = confirm("Uncommitted changes. Commit or stash them before releasing.\n\nRelease anyway?");
        if (!go) return;
        force = true;
      }
    }
    const isNpmRelease = state.currentInfo?.projectType === "npm";
    const releaseNotes = isNpmRelease ? releaseNotesEl?.value?.trim() || null : null;
    const draft = isNpmRelease && releaseDraftEl?.checked === true;
    const prereleaseChecked = isNpmRelease && releasePrereleaseEl?.checked === true;
    const prerelease = prereleaseChecked || isNpmRelease && bump === "prerelease";
    const options = {
      releaseNotes: releaseNotes || void 0,
      draft,
      prerelease
    };
    const optionsWithToken = { ...options };
    const projectToken = githubTokenEl?.value?.trim();
    if (projectToken) optionsWithToken.githubToken = projectToken;
    releaseStatusEl.textContent = isNpmRelease ? "Bumping version, then committing and pushing\u2026" : "Tagging and pushing\u2026";
    releaseStatusEl.classList.remove("hidden");
    releaseActionsWrapEl?.classList.add("hidden");
    detailErrorEl.classList.add("hidden");
    try {
      const result = await window.releaseManager.release(state.selectedPath, bump, force, optionsWithToken);
      if (result.ok) {
        let msg = `Tag ${result.tag} created and pushed.`;
        if (result.releaseError) msg += ` GitHub release note: ${result.releaseError}`;
        else if (result.actionsUrl) msg += " Open the Actions tab to see workflow runs.";
        releaseStatusEl.textContent = msg;
        releaseStatusEl.classList.add("text-rm-success");
        if (result.actionsUrl && releaseActionsLinkEl) {
          releaseActionsLinkEl.href = result.actionsUrl;
          releaseActionsLinkEl.textContent = "Open Actions \u2192";
          releaseActionsLinkEl.onclick = (e) => {
            e.preventDefault();
            window.releaseManager.openUrl(result.actionsUrl);
          };
          releaseActionsWrapEl?.classList.remove("hidden");
        }
        loadProjectInfo(state.selectedPath);
      } else {
        releaseStatusEl.textContent = "";
        releaseStatusEl.classList.add("hidden");
        releaseStatusEl.classList.remove("text-rm-success");
        detailErrorEl.textContent = result.error || "Release failed";
        detailErrorEl.classList.remove("hidden");
      }
    } catch (e) {
      releaseStatusEl.classList.add("hidden");
      releaseStatusEl.classList.remove("text-rm-success");
      detailErrorEl.textContent = e.message || "Release failed";
      detailErrorEl.classList.remove("hidden");
    }
  }
  async function syncFromRemote() {
    if (!state.selectedPath) return;
    syncDownloadStatusEl.textContent = "Fetching\u2026";
    if (syncDownloadStatusWrapEl) syncDownloadStatusWrapEl.classList.remove("hidden");
    syncDownloadStatusEl.classList.remove("hidden", "text-rm-success");
    detailErrorEl.classList.add("hidden");
    try {
      const result = await window.releaseManager.syncFromRemote(state.selectedPath);
      if (result.ok) {
        syncDownloadStatusEl.textContent = "Synced.";
        syncDownloadStatusEl.classList.add("text-rm-success");
        loadProjectInfo(state.selectedPath);
      } else {
        syncDownloadStatusEl.textContent = result.error || "Sync failed";
        syncDownloadStatusEl.classList.remove("text-rm-success");
      }
    } catch (e) {
      syncDownloadStatusEl.textContent = e.message || "Sync failed";
      syncDownloadStatusEl.classList.remove("text-rm-success");
    }
  }
  async function downloadLatestRelease() {
    if (!state.selectedPath || !state.currentInfo?.ok || !state.currentInfo.gitRemote) {
      syncDownloadStatusEl.textContent = "Select a project with a GitHub remote.";
      if (syncDownloadStatusWrapEl) syncDownloadStatusWrapEl.classList.remove("hidden");
      syncDownloadStatusEl.classList.remove("hidden", "text-rm-success");
      return;
    }
    syncDownloadStatusEl.textContent = "Fetching release list\u2026";
    if (syncDownloadStatusWrapEl) syncDownloadStatusWrapEl.classList.remove("hidden");
    syncDownloadStatusEl.classList.remove("hidden", "text-rm-success");
    detailErrorEl.classList.add("hidden");
    try {
      const result = await window.releaseManager.downloadLatestRelease(state.currentInfo.gitRemote);
      if (result.canceled) {
        syncDownloadStatusEl.textContent = "Canceled.";
        return;
      }
      if (result.ok) {
        syncDownloadStatusEl.textContent = `Saved to ${result.filePath}`;
        syncDownloadStatusEl.classList.add("text-rm-success");
      } else {
        syncDownloadStatusEl.textContent = result.error || "Download failed";
        syncDownloadStatusEl.classList.remove("text-rm-success");
      }
    } catch (e) {
      syncDownloadStatusEl.textContent = e.message || "Download failed";
      syncDownloadStatusEl.classList.remove("text-rm-success");
    }
  }
  document.getElementById("btn-add-project").addEventListener("click", addProject);
  document.getElementById("btn-remove-project").addEventListener("click", () => {
    if (!state.selectedPath) return;
    const p = state.projects.find((x) => x.path === state.selectedPath);
    const projectName = p?.name || state.selectedPath.split(/[/\\]/).filter(Boolean).pop() || "this project";
    if (!confirm(`Remove "${projectName}" from the list?`)) return;
    removeProject(state.selectedPath);
  });
  document.getElementById("btn-open-in-terminal").addEventListener("click", async () => {
    if (!state.selectedPath) return;
    const result = await window.releaseManager.openInTerminal(state.selectedPath);
    if (result?.ok === false && result?.error) syncDownloadStatusEl.textContent = result.error;
  });
  document.getElementById("btn-open-in-editor").addEventListener("click", async () => {
    if (!state.selectedPath) return;
    const result = await window.releaseManager.openInEditor(state.selectedPath);
    if (result?.ok === false && result?.error) syncDownloadStatusEl.textContent = result.error;
  });
  document.getElementById("btn-open-in-finder").addEventListener("click", () => {
    if (state.selectedPath) window.releaseManager.openPathInFinder(state.selectedPath);
  });
  document.getElementById("btn-copy-path").addEventListener("click", () => {
    if (state.selectedPath) {
      window.releaseManager.copyToClipboard(state.selectedPath);
      document.getElementById("btn-copy-path")?.setAttribute("title", "Copied!");
      showCopyFeedback("copy-path-feedback", "btn-copy-path", "Copy path");
    }
  });
  function showCopyFeedback(feedbackId, buttonId, resetTitle) {
    const el = document.getElementById(feedbackId);
    if (el) {
      el.classList.remove("hidden");
      setTimeout(() => {
        el.classList.add("hidden");
        const btn = document.getElementById(buttonId);
        if (btn) btn.setAttribute("title", resetTitle);
      }, 1200);
    }
  }
  document.getElementById("btn-copy-branch")?.addEventListener("click", () => {
    const branch = state.currentInfo?.branch || detailBranchSelectEl?.value?.trim();
    if (branch) {
      window.releaseManager.copyToClipboard(branch);
      document.getElementById("btn-copy-branch")?.setAttribute("title", "Copied!");
      setTimeout(() => document.getElementById("btn-copy-branch")?.setAttribute("title", "Copy branch name"), 1200);
    }
  });
  document.getElementById("btn-copy-version").addEventListener("click", () => {
    if (state.currentInfo?.ok && state.currentInfo.version) {
      window.releaseManager.copyToClipboard(state.currentInfo.version);
      document.getElementById("btn-copy-version")?.setAttribute("title", "Copied!");
      showCopyFeedback("copy-version-feedback", "btn-copy-version", "Copy version");
    }
  });
  document.getElementById("btn-copy-tag").addEventListener("click", () => {
    if (state.currentInfo?.ok && state.currentInfo.latestTag) {
      window.releaseManager.copyToClipboard(state.currentInfo.latestTag);
      document.getElementById("btn-copy-tag")?.setAttribute("title", "Copied!");
      showCopyFeedback("copy-tag-feedback", "btn-copy-tag", "Copy tag");
    }
  });
  document.getElementById("btn-copy-commit-message")?.addEventListener("click", () => {
    const text = detailCommitMessageEl?.value ?? "";
    window.releaseManager.copyToClipboard(text);
    document.getElementById("btn-copy-commit-message")?.setAttribute("title", "Copied!");
    showCopyFeedback("copy-commit-message-feedback", "btn-copy-commit-message", "Copy to clipboard");
  });
  document.getElementById("btn-copy-release-notes")?.addEventListener("click", () => {
    const text = releaseNotesEl?.value ?? "";
    window.releaseManager.copyToClipboard(text);
    document.getElementById("btn-copy-release-notes")?.setAttribute("title", "Copied!");
    showCopyFeedback("copy-release-notes-feedback", "btn-copy-release-notes", "Copy to clipboard");
  });
  document.getElementById("btn-copy-sync-status")?.addEventListener("click", () => {
    const text = syncDownloadStatusEl?.textContent?.trim() ?? "";
    if (!text) return;
    window.releaseManager.copyToClipboard(text);
    document.getElementById("btn-copy-sync-status")?.setAttribute("title", "Copied!");
    showCopyFeedback("copy-sync-status-feedback", "btn-copy-sync-status", "Copy to clipboard");
  });
  document.getElementById("btn-commit").addEventListener("click", async () => {
    if (!state.selectedPath) return;
    const message = detailCommitMessageEl?.value?.trim();
    if (!message) {
      if (detailCommitStatusEl) {
        detailCommitStatusEl.textContent = "Enter a commit message.";
        detailCommitStatusEl.classList.remove("hidden");
        detailCommitStatusEl.classList.remove("text-rm-success");
      }
      return;
    }
    if (detailCommitStatusEl) {
      detailCommitStatusEl.textContent = "Committing\u2026";
      detailCommitStatusEl.classList.remove("hidden");
      detailCommitStatusEl.classList.remove("text-rm-success");
    }
    try {
      const signEl = document.getElementById("detail-commit-sign");
      const sign = signEl?.checked ?? false;
      const result = await window.releaseManager.commitChanges(state.selectedPath, message, { sign });
      if (result?.ok) {
        detailCommitStatusEl.textContent = "Committed. All changes have been recorded to the current branch.";
        detailCommitStatusEl.classList.add("text-rm-success");
        if (detailCommitMessageEl) detailCommitMessageEl.value = "";
        loadProjectInfo(state.selectedPath);
      } else {
        detailCommitStatusEl.textContent = result?.error || "Commit failed";
        detailCommitStatusEl.classList.remove("text-rm-success");
      }
    } catch (e) {
      detailCommitStatusEl.textContent = e.message || "Commit failed";
      detailCommitStatusEl.classList.remove("text-rm-success");
    }
  });
  var detailGitRightSummaryEl = document.getElementById("detail-git-right-commit-summary");
  var detailGitRightSummaryCountEl = document.getElementById("detail-git-right-summary-count");
  if (detailGitRightSummaryEl && detailGitRightSummaryCountEl) {
    const updateSummaryCount = () => {
      detailGitRightSummaryCountEl.textContent = `${(detailGitRightSummaryEl.value || "").length}/72`;
    };
    detailGitRightSummaryEl.addEventListener("input", updateSummaryCount);
    detailGitRightSummaryEl.addEventListener("change", updateSummaryCount);
    updateSummaryCount();
  }
  document.getElementById("btn-git-right-stage-all")?.addEventListener("click", () => {
    if (!state.selectedPath) return;
    if (!confirm(GIT_ACTION_CONFIRMS.stage.replace("this file", "all unstaged files"))) return;
    runGitAction("Stage all", async () => {
      const info = await window.releaseManager.getProjectInfo(state.selectedPath);
      const lines = info.uncommittedLines || [];
      const isParsed = lines.length > 0 && typeof lines[0] === "object" && lines[0] !== null && "filePath" in lines[0];
      const unstaged = isParsed ? lines.filter((l) => l.hasUnstaged) : lines.filter((l) => {
        const s = typeof l === "string" ? l.slice(0, 2) : l.status || "";
        return s === "??" || s[1] && s[1] !== " ";
      });
      for (const line of unstaged) {
        const filePath = isParsed ? line.filePath : line.includes(" -> ") ? line.split(" -> ")[1].trim() : line.length > 3 ? line.slice(3).trim() : line;
        await window.releaseManager.stageFile(state.selectedPath, filePath);
      }
      return { ok: true };
    }, { refreshAlways: true });
  });
  document.getElementById("btn-git-right-commit")?.addEventListener("click", async () => {
    if (!state.selectedPath) return;
    const summaryEl = document.getElementById("detail-git-right-commit-summary");
    const descEl = document.getElementById("detail-git-right-commit-description");
    const amendEl = document.getElementById("detail-git-right-amend");
    const summary = summaryEl?.value?.trim() ?? "";
    const desc = descEl?.value?.trim() ?? "";
    const message = desc ? `${summary}

${desc}` : summary;
    if (!message) {
      const statusEl2 = document.getElementById("detail-git-action-status");
      if (statusEl2) {
        statusEl2.textContent = "Enter a commit summary.";
        statusEl2.classList.remove("hidden");
      }
      return;
    }
    const statusEl = document.getElementById("detail-git-action-status");
    if (statusEl) {
      statusEl.textContent = "Committing\u2026";
      statusEl.classList.remove("hidden", "text-rm-warning");
    }
    try {
      const amend = amendEl?.checked ?? false;
      const result = amend ? await window.releaseManager.gitAmend(state.selectedPath, message) : await window.releaseManager.commitChanges(state.selectedPath, message, {});
      if (result?.ok) {
        if (statusEl) {
          statusEl.textContent = amend ? "Amended." : "Committed.";
          statusEl.classList.remove("text-rm-warning");
        }
        if (summaryEl) summaryEl.value = "";
        if (descEl) descEl.value = "";
        const countEl = document.getElementById("detail-git-right-summary-count");
        if (countEl) countEl.textContent = "0/72";
        loadProjectInfo(state.selectedPath);
      } else {
        if (statusEl) {
          statusEl.textContent = result?.error || "Commit failed";
          statusEl.classList.add("text-rm-warning");
        }
      }
    } catch (e) {
      if (statusEl) {
        statusEl.textContent = e?.message || "Commit failed";
        statusEl.classList.add("text-rm-warning");
      }
    }
  });
  document.getElementById("btn-git-right-ollama-commit")?.addEventListener("click", async () => {
    if (!state.selectedPath) return;
    const summaryEl = document.getElementById("detail-git-right-commit-summary");
    const statusEl = document.getElementById("detail-git-action-status");
    if (statusEl) {
      statusEl.textContent = "Generating\u2026";
      statusEl.classList.remove("hidden", "text-rm-warning");
    }
    try {
      const result = await window.releaseManager.ollamaGenerateCommitMessage(state.selectedPath);
      if (result?.ok && result.text) {
        if (summaryEl) {
          const text = result.text.trim();
          const firstLine = text.split(/\n/)[0] || "";
          summaryEl.value = firstLine.slice(0, 72);
        }
        const countEl = document.getElementById("detail-git-right-summary-count");
        if (countEl) countEl.textContent = `${(summaryEl?.value || "").length}/72`;
        if (statusEl) {
          statusEl.textContent = "Generated. Edit if needed.";
          statusEl.classList.remove("text-rm-warning");
        }
      } else {
        if (statusEl) {
          statusEl.textContent = result?.error || "Generate failed.";
          statusEl.classList.add("text-rm-warning");
        }
      }
    } catch (e) {
      if (statusEl) {
        statusEl.textContent = e?.message || "Generate failed";
        statusEl.classList.add("text-rm-warning");
      }
    }
  });
  document.getElementById("btn-git-right-stage-and-commit")?.addEventListener("click", () => {
    const stageAllBtn = document.getElementById("btn-git-right-stage-all");
    if (stageAllBtn && !stageAllBtn.classList.contains("hidden")) {
      stageAllBtn.click();
    }
    document.getElementById("detail-git-right-commit-summary")?.focus();
  });
  document.querySelectorAll(".detail-git-view-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".detail-git-view-toggle").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      const view = btn.dataset.view;
      const panel = document.querySelector(".detail-git-right-panel");
      if (panel) panel.dataset.fileView = view || "path";
    });
  });
  async function runGitAction(label, fn, options = {}) {
    const { confirmKey, successKey, refreshAlways } = options;
    const statusEl = document.getElementById("detail-git-action-status");
    if (!state.selectedPath) return;
    if (confirmKey && GIT_ACTION_CONFIRMS[confirmKey] && !confirm(GIT_ACTION_CONFIRMS[confirmKey])) return;
    if (statusEl) {
      statusEl.textContent = `${label}\u2026`;
      statusEl.classList.remove("hidden");
      statusEl.classList.remove("text-rm-warning");
    }
    try {
      const result = await fn();
      if (statusEl) {
        const successMsg = successKey && GIT_ACTION_SUCCESS[successKey] ? GIT_ACTION_SUCCESS[successKey] : result?.ok ? "Done." : null;
        statusEl.textContent = result?.ok ? successMsg : result?.error || "Failed";
        statusEl.classList.toggle("text-rm-warning", !result?.ok);
      }
      if (result?.ok || refreshAlways) await loadProjectInfo(state.selectedPath);
    } catch (e) {
      if (statusEl) {
        statusEl.textContent = e?.message || "Failed";
        statusEl.classList.add("text-rm-warning");
      }
      if (refreshAlways) await loadProjectInfo(state.selectedPath);
    }
  }
  (function setupSwitchWithChangesModal() {
    const modal = document.getElementById("modal-switch-with-changes");
    if (!modal) return;
    const done = (value) => {
      if (!state.switchWithChangesModalResolve) return;
      modal.classList.add("hidden");
      const r = state.switchWithChangesModalResolve;
      state.switchWithChangesModalResolve = null;
      r(value);
    };
    document.getElementById("modal-switch-stash-pop")?.addEventListener("click", () => done("stash-pop"));
    document.getElementById("modal-switch-stash-only")?.addEventListener("click", () => done("stash"));
    document.getElementById("modal-switch-cancel")?.addEventListener("click", () => done("cancel"));
    document.getElementById("modal-switch-with-changes-close")?.addEventListener("click", () => done("cancel"));
    modal.addEventListener("click", (e) => {
      if (e.target === modal) done("cancel");
    });
  })();
  function showSwitchWithChangesModal() {
    const modal = document.getElementById("modal-switch-with-changes");
    if (!modal) return Promise.resolve("cancel");
    return new Promise((resolve) => {
      state.switchWithChangesModalResolve = resolve;
      modal.classList.remove("hidden");
    });
  }
  async function runCheckoutWithStashOption(doCheckout, options = {}) {
    if (!state.selectedPath || state.isRefreshingAfterCheckout) return;
    const hasUncommitted = (state.currentInfo?.uncommittedLines?.length ?? 0) > 0;
    if (!hasUncommitted) {
      if (!confirm(GIT_ACTION_CONFIRMS.checkout)) {
        options.onCancel?.();
        return;
      }
      const statusEl2 = document.getElementById("detail-git-action-status");
      if (statusEl2) {
        statusEl2.textContent = "Switch branch\u2026";
        statusEl2.classList.remove("hidden");
        statusEl2.classList.remove("text-rm-warning");
      }
      try {
        const result = await doCheckout();
        if (statusEl2) {
          statusEl2.textContent = result?.ok ? "Switched branch." : result?.error || "Failed";
          statusEl2.classList.toggle("text-rm-warning", !result?.ok);
        }
        state.isRefreshingAfterCheckout = true;
        await loadProjectInfo(state.selectedPath);
      } catch (e) {
        if (statusEl2) {
          statusEl2.textContent = e?.message || "Failed";
          statusEl2.classList.add("text-rm-warning");
        }
        await loadProjectInfo(state.selectedPath);
      } finally {
        state.isRefreshingAfterCheckout = false;
      }
      return;
    }
    const choice = await showSwitchWithChangesModal();
    if (choice === "cancel") {
      options.onCancel?.();
      return;
    }
    const statusEl = document.getElementById("detail-git-action-status");
    if (statusEl) {
      statusEl.textContent = "Stashing\u2026";
      statusEl.classList.remove("hidden");
      statusEl.classList.remove("text-rm-warning");
    }
    try {
      const stashRes = await window.releaseManager.gitStashPush(state.selectedPath, "", {});
      if (!stashRes?.ok) throw new Error(stashRes?.error || "Stash failed");
      if (statusEl) statusEl.textContent = "Switching\u2026";
      const checkoutRes = await doCheckout();
      if (checkoutRes && typeof checkoutRes === "object" && checkoutRes.ok === false) throw new Error(checkoutRes?.error || "Checkout failed");
      if (choice === "stash-pop") {
        if (statusEl) statusEl.textContent = "Popping stash\u2026";
        const popRes = await window.releaseManager.gitStashPop(state.selectedPath);
        if (!popRes?.ok) throw new Error(popRes?.error || "Pop failed");
        if (statusEl) statusEl.textContent = "Switched; stash applied.";
      } else {
        if (statusEl) statusEl.textContent = "Switched; changes stashed.";
      }
      if (statusEl) statusEl.classList.remove("text-rm-warning");
    } catch (e) {
      if (statusEl) {
        statusEl.textContent = e?.message || "Failed";
        statusEl.classList.add("text-rm-warning");
      }
    }
    state.isRefreshingAfterCheckout = true;
    await loadProjectInfo(state.selectedPath);
    state.isRefreshingAfterCheckout = false;
  }
  detailBranchSelectEl?.addEventListener("change", async () => {
    if (!state.selectedPath || !detailBranchSelectEl?.value) return;
    const branch = detailBranchSelectEl.value.trim();
    if (!branch) return;
    if (state.currentInfo?.branch === branch) return;
    await runCheckoutWithStashOption(
      () => window.releaseManager.checkoutBranch(state.selectedPath, branch),
      { onCancel: () => {
        detailBranchSelectEl.value = state.currentInfo?.branch || "";
      } }
    );
  });
  var toolbarBranchEl = document.getElementById("detail-git-toolbar-branch");
  if (toolbarBranchEl) {
    toolbarBranchEl.addEventListener("change", async () => {
      if (!state.selectedPath || !toolbarBranchEl.value) return;
      const branch = toolbarBranchEl.value.trim();
      if (state.currentInfo?.branch === branch) return;
      await runCheckoutWithStashOption(
        () => window.releaseManager.checkoutBranch(state.selectedPath, branch),
        { onCancel: () => {
          toolbarBranchEl.value = state.currentInfo?.branch || "";
        } }
      );
    });
  }
  document.getElementById("btn-git-toolbar-pull")?.addEventListener("click", () => {
    if (!state.selectedPath) return;
    runGitAction("Pull", () => window.releaseManager.gitPull(state.selectedPath), { confirmKey: "pull", successKey: "pull", refreshAlways: true });
  });
  document.getElementById("btn-git-toolbar-push")?.addEventListener("click", () => {
    if (!state.selectedPath) return;
    runGitAction("Push", () => window.releaseManager.gitPush(state.selectedPath), { confirmKey: "push", successKey: "push", refreshAlways: true });
  });
  document.getElementById("btn-git-toolbar-branch")?.addEventListener("click", () => {
    if (!state.selectedPath) return;
    const name = (window.prompt("New branch name:") ?? "").trim();
    if (!name) return;
    runGitAction("Create branch", () => window.releaseManager.createBranch(state.selectedPath, name, true), { successKey: "createBranch", refreshAlways: true });
  });
  document.getElementById("btn-git-toolbar-stash")?.addEventListener("click", () => {
    if (!state.selectedPath) return;
    runGitAction("Stash", () => window.releaseManager.gitStashPush(state.selectedPath, "", {}), { successKey: "stash", refreshAlways: true });
  });
  document.getElementById("btn-git-toolbar-terminal")?.addEventListener("click", () => {
    document.getElementById("btn-open-in-terminal")?.click();
  });
  document.getElementById("btn-git-view-change")?.addEventListener("click", () => {
    detailUncommittedWrapEl?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  document.getElementById("btn-git-right-copy-sha")?.addEventListener("click", () => {
    if (state.rightPanelCommitSha) window.releaseManager.copyToClipboard(state.rightPanelCommitSha);
  });
  document.getElementById("btn-git-right-cherry-pick")?.addEventListener("click", () => {
    if (!state.selectedPath || !state.rightPanelCommitSha) return;
    runGitAction("Cherry-pick", () => window.releaseManager.gitCherryPick(state.selectedPath, state.rightPanelCommitSha), { successKey: "cherryPick", refreshAlways: true });
  });
  document.getElementById("btn-git-right-revert")?.addEventListener("click", () => {
    if (!state.selectedPath || !state.rightPanelCommitSha) return;
    if (!confirm(`Revert commit ${state.rightPanelCommitSha}? This will create a new commit that undoes it.`)) return;
    runGitAction("Revert", () => window.releaseManager.gitRevert(state.selectedPath, state.rightPanelCommitSha), { successKey: "revert", refreshAlways: true });
  });
  document.getElementById("btn-git-pull")?.addEventListener("click", () => {
    if (!state.selectedPath) return;
    runGitAction("Pull", () => window.releaseManager.gitPull(state.selectedPath), { confirmKey: "pull", successKey: "pull", refreshAlways: true });
  });
  document.getElementById("btn-git-fetch")?.addEventListener("click", () => {
    if (!state.selectedPath) return;
    runGitAction("Fetch", () => window.releaseManager.gitFetch(state.selectedPath), { successKey: "fetch", refreshAlways: true });
  });
  document.getElementById("btn-git-prune")?.addEventListener("click", () => {
    if (!state.selectedPath) return;
    runGitAction("Prune remotes", () => window.releaseManager.gitPruneRemotes(state.selectedPath), { successKey: "prune", refreshAlways: true });
  });
  document.getElementById("btn-git-push")?.addEventListener("click", () => {
    if (!state.selectedPath) return;
    runGitAction("Push", () => window.releaseManager.gitPush(state.selectedPath), { confirmKey: "push", successKey: "push", refreshAlways: true });
  });
  document.getElementById("btn-git-push-force")?.addEventListener("click", () => {
    if (!state.selectedPath) return;
    runGitAction("Force push", () => window.releaseManager.gitPushForce(state.selectedPath, false), { confirmKey: "forcePush", successKey: "push", refreshAlways: true });
  });
  document.getElementById("btn-git-push-force-lease")?.addEventListener("click", () => {
    if (!state.selectedPath) return;
    runGitAction("Force push (lease)", () => window.releaseManager.gitPushForce(state.selectedPath, true), { confirmKey: "forcePushLease", successKey: "push", refreshAlways: true });
  });
  document.getElementById("btn-git-create-branch")?.addEventListener("click", () => {
    if (!state.selectedPath) return;
    const name = (window.prompt("New branch name:") ?? "").trim();
    if (!name) return;
    runGitAction("Create branch", () => window.releaseManager.createBranch(state.selectedPath, name, true), { successKey: "createBranch", refreshAlways: true });
  });
  document.getElementById("btn-git-merge-picker")?.addEventListener("click", () => {
    if (!state.selectedPath) return;
    const sel = document.getElementById("detail-merge-branch-select");
    const branch = sel?.value?.trim();
    if (!branch) return;
    if (!confirm(GIT_ACTION_CONFIRMS.merge)) return;
    const strategySel = document.getElementById("detail-merge-strategy");
    const strategyOptionSel = document.getElementById("detail-merge-strategy-option");
    const options = {};
    if (strategySel?.value) options.strategy = strategySel.value;
    if (strategyOptionSel?.value) options.strategyOption = strategyOptionSel.value;
    runGitAction("Merge", () => window.releaseManager.gitMerge(state.selectedPath, branch, options), { successKey: "merge", refreshAlways: true });
  });
  document.querySelectorAll(".detail-git-subtab-btn").forEach((btn) => {
    btn.addEventListener("click", () => updateGitSubtabVisibility(btn.dataset.gitSubtab));
  });
  document.getElementById("btn-git-merge-continue")?.addEventListener("click", () => {
    if (!state.selectedPath) return;
    runGitAction("Continue merge", () => window.releaseManager.gitMergeContinue(state.selectedPath), { successKey: "merge", refreshAlways: true });
  });
  document.getElementById("btn-git-merge-abort")?.addEventListener("click", () => {
    if (!state.selectedPath) return;
    runGitAction("Abort merge", () => window.releaseManager.gitMergeAbort(state.selectedPath), { confirmKey: "mergeAbort", successKey: "mergeAbort" });
  });
  document.getElementById("btn-git-rebase-continue")?.addEventListener("click", () => {
    if (!state.selectedPath) return;
    runGitAction("Continue rebase", () => window.releaseManager.gitRebaseContinue(state.selectedPath), { successKey: "rebase", refreshAlways: true });
  });
  document.getElementById("btn-git-rebase-skip")?.addEventListener("click", () => {
    if (!state.selectedPath) return;
    runGitAction("Skip rebase", () => window.releaseManager.gitRebaseSkip(state.selectedPath), { successKey: "rebase", refreshAlways: true });
  });
  document.getElementById("btn-git-stash")?.addEventListener("click", () => {
    if (!state.selectedPath) return;
    if (!confirm(GIT_ACTION_CONFIRMS.stash)) return;
    const msg = window.prompt("Stash message (optional):") ?? "";
    const includeUntracked = document.getElementById("stash-include-untracked")?.checked ?? false;
    const keepIndex = document.getElementById("stash-keep-index")?.checked ?? false;
    runGitAction("Stash", () => window.releaseManager.gitStashPush(state.selectedPath, msg || void 0, { includeUntracked, keepIndex }), { successKey: "stash" });
  });
  document.getElementById("btn-git-stash-pop")?.addEventListener("click", () => {
    if (!state.selectedPath) return;
    runGitAction("Pop stash", () => window.releaseManager.gitStashPop(state.selectedPath), { confirmKey: "pop", successKey: "pop" });
  });
  document.getElementById("btn-git-discard")?.addEventListener("click", () => {
    if (!state.selectedPath) return;
    runGitAction("Discard", () => window.releaseManager.gitDiscardChanges(state.selectedPath), { confirmKey: "discard", successKey: "discard" });
  });
  document.getElementById("btn-git-amend")?.addEventListener("click", () => {
    if (!state.selectedPath) return;
    const msg = document.getElementById("detail-commit-message")?.value?.trim();
    runGitAction("Amend", () => window.releaseManager.gitAmend(state.selectedPath, msg || void 0), { successKey: "amend", refreshAlways: true });
  });
  document.getElementById("btn-load-remote-branches")?.addEventListener("click", async () => {
    if (!state.selectedPath) return;
    const statusEl = document.getElementById("detail-git-action-status");
    if (statusEl) {
      statusEl.textContent = "Fetching remote branches\u2026";
      statusEl.classList.remove("hidden");
    }
    const res = await window.releaseManager.getRemoteBranches(state.selectedPath);
    const sel = document.getElementById("detail-remote-branch-select");
    if (sel) {
      sel.innerHTML = '<option value="">\u2014</option>';
      if (res.ok && res.branches?.length) res.branches.forEach((b) => {
        const o = document.createElement("option");
        o.value = b;
        o.textContent = b;
        sel.appendChild(o);
      });
    }
    if (statusEl) {
      statusEl.textContent = res.ok ? "Remote branches loaded." : res.error || "Failed";
      statusEl.classList.toggle("text-rm-warning", !res.ok);
    }
  });
  document.getElementById("btn-checkout-remote-branch")?.addEventListener("click", () => {
    if (!state.selectedPath) return;
    const sel = document.getElementById("detail-remote-branch-select");
    const ref = sel?.value?.trim();
    if (!ref) return;
    if (!confirm("Create local tracking branch from " + ref + "?")) return;
    runGitAction("Checkout remote branch", () => window.releaseManager.checkoutRemoteBranch(state.selectedPath, ref), { successKey: "checkout", refreshAlways: true });
  });
  document.getElementById("btn-git-pull-rebase")?.addEventListener("click", () => {
    if (!state.selectedPath) return;
    runGitAction("Pull (rebase)", () => window.releaseManager.gitPullRebase(state.selectedPath), { confirmKey: "pull", successKey: "pull", refreshAlways: true });
  });
  document.getElementById("btn-git-rebase")?.addEventListener("click", () => {
    if (!state.selectedPath) return;
    const sel = document.getElementById("detail-rebase-onto-select");
    const onto = sel?.value?.trim();
    if (!onto) return;
    if (!confirm("Rebase current branch onto " + onto + "?")) return;
    runGitAction("Rebase", () => window.releaseManager.gitRebase(state.selectedPath, onto), { successKey: "rebase", refreshAlways: true });
  });
  document.getElementById("btn-git-rebase-abort")?.addEventListener("click", () => {
    if (!state.selectedPath) return;
    runGitAction("Abort rebase", () => window.releaseManager.gitRebaseAbort(state.selectedPath), { successKey: "rebaseAbort", refreshAlways: true });
  });
  document.getElementById("btn-git-rebase-interactive")?.addEventListener("click", () => {
    if (!state.selectedPath) return;
    const sel = document.getElementById("detail-rebase-onto-select");
    const ref = sel?.value?.trim();
    if (!ref) return;
    runGitAction("Interactive rebase", () => window.releaseManager.gitRebaseInteractive(state.selectedPath, ref), { successKey: "rebase", refreshAlways: true });
  });
  document.getElementById("btn-git-cherry-pick-continue")?.addEventListener("click", () => {
    if (!state.selectedPath) return;
    runGitAction("Continue cherry-pick", () => window.releaseManager.gitCherryPickContinue(state.selectedPath), { successKey: "cherryPick", refreshAlways: true });
  });
  document.getElementById("btn-git-cherry-pick-abort")?.addEventListener("click", () => {
    if (!state.selectedPath) return;
    runGitAction("Abort cherry-pick", () => window.releaseManager.gitCherryPickAbort(state.selectedPath), { successKey: "cherryPickAbort", refreshAlways: true });
  });
  document.getElementById("btn-open-conflicted-in-editor")?.addEventListener("click", () => {
    if (!state.selectedPath || !state.currentInfo?.uncommittedLines) return;
    const lines = state.currentInfo.uncommittedLines;
    const isParsed = lines.length > 0 && typeof lines[0] === "object" && lines[0] !== null && "filePath" in lines[0];
    const conflicted = lines.filter((l) => isParsed ? l.isUnmerged : /^[UAD][UAD]/.test(String(l).slice(0, 2)));
    conflicted.forEach((l) => {
      const fp = isParsed ? l.filePath : String(l).includes(" -> ") ? String(l).split(" -> ")[1].trim() : String(l).slice(3).trim();
      if (fp) window.releaseManager.openFileInEditor(state.selectedPath, fp);
    });
  });
  document.getElementById("btn-create-tag")?.addEventListener("click", () => {
    if (!state.selectedPath) return;
    const nameEl = document.getElementById("detail-create-tag-name");
    const name = nameEl?.value?.trim();
    if (!name) return;
    const messageEl = document.getElementById("detail-create-tag-message");
    const message = messageEl?.value?.trim() || void 0;
    const refSel = document.getElementById("detail-create-tag-ref");
    const ref = refSel?.value?.trim() || "HEAD";
    runGitAction("Create tag", () => window.releaseManager.createTag(state.selectedPath, name, message, ref), { successKey: "createTag", refreshAlways: true });
    if (nameEl) nameEl.value = "";
    if (messageEl) messageEl.value = "";
  });
  document.getElementById("btn-checkout-tag")?.addEventListener("click", () => {
    if (!state.selectedPath) return;
    const sel = document.getElementById("detail-tag-select");
    const tag = sel?.value?.trim();
    if (!tag) return;
    if (!confirm("Checkout tag " + tag + "? (Detached HEAD)")) return;
    runGitAction("Checkout tag", () => window.releaseManager.checkoutTag(state.selectedPath, tag), { successKey: "checkout", refreshAlways: true });
  });
  document.getElementById("btn-push-tag")?.addEventListener("click", () => {
    if (!state.selectedPath) return;
    const sel = document.getElementById("detail-tag-select");
    const tag = sel?.value?.trim();
    if (!tag) return;
    runGitAction("Push tag", () => window.releaseManager.pushTag(state.selectedPath, tag), { successKey: "push", refreshAlways: true });
  });
  document.getElementById("btn-delete-tag")?.addEventListener("click", () => {
    if (!state.selectedPath) return;
    const sel = document.getElementById("detail-tag-select");
    const tag = sel?.value?.trim();
    if (!tag) return;
    if (!confirm("Delete tag " + tag + " locally?")) return;
    runGitAction("Delete tag", () => window.releaseManager.deleteTag(state.selectedPath, tag), { successKey: "deleteTag", refreshAlways: true });
  });
  document.getElementById("btn-rename-branch")?.addEventListener("click", () => {
    if (!state.selectedPath) return;
    const newNameEl = document.getElementById("detail-rename-branch-new-name");
    const newName = newNameEl?.value?.trim();
    if (!newName) return;
    const sel = document.getElementById("detail-delete-branch-select");
    const oldName = sel?.value?.trim() || null;
    runGitAction("Rename branch", () => window.releaseManager.renameBranch(state.selectedPath, oldName, newName), { successKey: "renameBranch", refreshAlways: true });
    if (newNameEl) newNameEl.value = "";
  });
  document.getElementById("btn-delete-branch")?.addEventListener("click", () => {
    if (!state.selectedPath) return;
    const sel = document.getElementById("detail-delete-branch-select");
    const branch = sel?.value?.trim();
    if (!branch) return;
    if (!confirm('Delete local branch "' + branch + '"?')) return;
    runGitAction("Delete branch", () => window.releaseManager.deleteBranch(state.selectedPath, branch, false), { refreshAlways: true });
  });
  document.getElementById("btn-delete-remote-branch")?.addEventListener("click", () => {
    if (!state.selectedPath) return;
    const sel = document.getElementById("detail-delete-branch-select");
    const branch = sel?.value?.trim();
    if (!branch) return;
    if (!confirm('Delete branch "' + branch + '" on remote origin?')) return;
    runGitAction("Delete remote branch", () => window.releaseManager.deleteRemoteBranch(state.selectedPath, "origin", branch), { refreshAlways: true });
  });
  document.getElementById("btn-fetch-remote")?.addEventListener("click", () => {
    if (!state.selectedPath) return;
    const sel = document.getElementById("detail-fetch-remote-select");
    const remote = sel?.value?.trim();
    if (!remote) return;
    runGitAction("Fetch " + remote, () => window.releaseManager.gitFetchRemote(state.selectedPath, remote), { successKey: "fetch", refreshAlways: true });
  });
  document.getElementById("btn-add-remote")?.addEventListener("click", () => {
    if (!state.selectedPath) return;
    const name = document.getElementById("detail-add-remote-name")?.value?.trim();
    const url = document.getElementById("detail-add-remote-url")?.value?.trim();
    if (!name || !url) return;
    runGitAction("Add remote", () => window.releaseManager.addRemote(state.selectedPath, name, url), { refreshAlways: true });
  });
  document.getElementById("btn-compare")?.addEventListener("click", async () => {
    if (!state.selectedPath) return;
    const refA = document.getElementById("detail-compare-ref-a")?.value?.trim() || "HEAD";
    const refB = document.getElementById("detail-compare-ref-b")?.value?.trim();
    if (!refB) return;
    const res = await window.releaseManager.getDiffBetween(state.selectedPath, refA, refB);
    const el = document.getElementById("detail-compare-result");
    if (el) {
      el.classList.remove("hidden");
      if (res.ok) el.textContent = res.stats || (res.files?.length ? res.files.length + " file(s) changed" : "No changes");
      else el.textContent = res.error || "Failed";
    }
  });
  document.getElementById("btn-compare-show-diff")?.addEventListener("click", async () => {
    if (!state.selectedPath) return;
    const refA = document.getElementById("detail-compare-ref-a")?.value?.trim() || "HEAD";
    const refB = document.getElementById("detail-compare-ref-b")?.value?.trim();
    if (!refB) return;
    const res = await window.releaseManager.getDiffBetweenFull(state.selectedPath, refA, refB);
    const modal = document.getElementById("modal-diff-full");
    const title = document.getElementById("modal-diff-full-title");
    const content = document.getElementById("modal-diff-full-content");
    if (!modal || !title || !content) return;
    title.textContent = `Diff: ${refA} .. ${refB}`;
    content.textContent = res.ok ? res.diff || "(no changes)" : res.error || "Failed";
    modal.classList.remove("hidden");
  });
  function closeDiffFullModal() {
    document.getElementById("modal-diff-full")?.classList.add("hidden");
  }
  document.getElementById("modal-diff-full")?.addEventListener("click", (e) => {
    if (e.target.id === "modal-diff-full") closeDiffFullModal();
  });
  document.getElementById("modal-diff-full-close")?.addEventListener("click", closeDiffFullModal);
  document.getElementById("modal-diff-full-close-btn")?.addEventListener("click", closeDiffFullModal);
  document.getElementById("btn-reset-soft")?.addEventListener("click", () => {
    if (!state.selectedPath) return;
    const ref = document.getElementById("detail-reset-ref")?.value?.trim() || "HEAD";
    if (!confirm("Reset (soft) to " + ref + "? Keeps changes staged.")) return;
    runGitAction("Reset soft", () => window.releaseManager.gitReset(state.selectedPath, ref, "soft"), { refreshAlways: true });
  });
  document.getElementById("btn-reset-mixed")?.addEventListener("click", () => {
    if (!state.selectedPath) return;
    const ref = document.getElementById("detail-reset-ref")?.value?.trim() || "HEAD";
    if (!confirm("Reset (mixed) to " + ref + "? Unstages changes.")) return;
    runGitAction("Reset mixed", () => window.releaseManager.gitReset(state.selectedPath, ref, "mixed"), { refreshAlways: true });
  });
  document.getElementById("btn-reset-hard")?.addEventListener("click", () => {
    if (!state.selectedPath) return;
    const ref = document.getElementById("detail-reset-ref")?.value?.trim() || "HEAD";
    if (!confirm("Reset (hard) to " + ref + "? This will discard all uncommitted and committed changes after that ref. Cannot be undone.")) return;
    runGitAction("Reset hard", () => window.releaseManager.gitReset(state.selectedPath, ref, "hard"), { refreshAlways: true });
  });
  document.getElementById("btn-submodule-update")?.addEventListener("click", () => {
    if (!state.selectedPath) return;
    runGitAction("Update submodules", () => window.releaseManager.submoduleUpdate(state.selectedPath, true), { refreshAlways: true });
  });
  document.getElementById("btn-load-reflog")?.addEventListener("click", async () => {
    if (!state.selectedPath) return;
    const listEl = document.getElementById("detail-reflog-list");
    const emptyEl = document.getElementById("detail-reflog-empty");
    if (!listEl || !emptyEl) return;
    listEl.innerHTML = "";
    emptyEl.classList.add("hidden");
    const res = await window.releaseManager.getReflog(state.selectedPath, 50);
    if (!res.ok || !res.entries?.length) {
      emptyEl.textContent = res.error || "No reflog or load first.";
      emptyEl.classList.remove("hidden");
      return;
    }
    res.entries.forEach((e) => {
      const li = document.createElement("li");
      li.className = "flex items-center gap-2 flex-wrap";
      li.innerHTML = `<span class="font-mono text-rm-accent">${escapeHtml(e.sha)}</span> <span class="text-rm-muted truncate flex-1 min-w-0">${escapeHtml(e.message || "")}</span>`;
      const checkoutBtn = document.createElement("button");
      checkoutBtn.type = "button";
      checkoutBtn.className = "text-xs text-rm-accent hover:underline border-none bg-transparent cursor-pointer p-0 shrink-0 btn-with-icon";
      checkoutBtn.appendChild(createBtnIcon(BTN_ICONS["git-branch"]));
      checkoutBtn.appendChild(document.createTextNode("Checkout"));
      checkoutBtn.onclick = () => {
        if (confirm("Checkout " + e.sha + "?")) runGitAction("Checkout ref", () => window.releaseManager.checkoutRef(state.selectedPath, e.sha), { successKey: "checkout", refreshAlways: true });
      };
      li.appendChild(checkoutBtn);
      listEl.appendChild(li);
    });
  });
  document.getElementById("btn-worktree-add")?.addEventListener("click", () => {
    if (!state.selectedPath) return;
    const pathInput = document.getElementById("detail-worktree-path");
    const branchInput = document.getElementById("detail-worktree-branch");
    const worktreePath = pathInput?.value?.trim();
    const branch = branchInput?.value?.trim() || void 0;
    if (!worktreePath) return;
    runGitAction("Add worktree", () => window.releaseManager.worktreeAdd(state.selectedPath, worktreePath, branch), { refreshAlways: true });
  });
  var bisectRefPickerTargetInputId = null;
  var bisectRefPickerOutsideClick = null;
  function closeBisectRefPicker() {
    const picker = document.getElementById("detail-bisect-ref-picker");
    if (picker) picker.classList.add("hidden");
    bisectRefPickerTargetInputId = null;
    if (bisectRefPickerOutsideClick) {
      document.removeEventListener("click", bisectRefPickerOutsideClick);
      bisectRefPickerOutsideClick = null;
    }
  }
  async function openBisectRefPicker(anchorEl, targetInputId) {
    if (!state.selectedPath || !anchorEl || !targetInputId) return;
    const picker = document.getElementById("detail-bisect-ref-picker");
    const listEl = document.getElementById("detail-bisect-ref-picker-list");
    if (!picker || !listEl) return;
    closeBisectRefPicker();
    bisectRefPickerTargetInputId = targetInputId;
    listEl.innerHTML = '<div class="p-3 text-xs text-rm-muted">Loading\u2026</div>';
    const rect = anchorEl.getBoundingClientRect();
    picker.style.left = `${rect.left}px`;
    picker.style.top = `${rect.bottom + 4}px`;
    picker.classList.remove("hidden");
    const [logRes, branchRes, tagRes] = await Promise.all([
      window.releaseManager.getCommitLog(state.selectedPath, 30),
      window.releaseManager.getBranches(state.selectedPath),
      window.releaseManager.getTags(state.selectedPath)
    ]);
    listEl.innerHTML = "";
    const addSection = (label) => {
      const section = document.createElement("div");
      section.className = "detail-bisect-ref-picker-section";
      section.textContent = label;
      listEl.appendChild(section);
    };
    const addItem = (refValue, label, subLabel = "") => {
      const item = document.createElement("div");
      item.className = "detail-bisect-ref-picker-item";
      item.dataset.ref = refValue;
      if (subLabel) {
        item.innerHTML = `<span class="ref-sha">${escapeHtml(refValue)}</span><span class="ref-subject" title="${escapeHtml(subLabel)}">${escapeHtml(subLabel)}</span>`;
      } else {
        item.textContent = label;
      }
      item.addEventListener("click", () => {
        const input = document.getElementById(bisectRefPickerTargetInputId);
        if (input) input.value = refValue;
        closeBisectRefPicker();
      });
      listEl.appendChild(item);
    };
    addItem("HEAD", "HEAD");
    if (branchRes?.ok && branchRes.branches?.length) {
      addSection("Branches");
      branchRes.branches.forEach((b) => addItem(b, b));
    }
    if (tagRes?.ok && tagRes.tags?.length) {
      addSection("Tags");
      tagRes.tags.forEach((t) => addItem(t, t));
    }
    if (logRes?.ok && logRes.commits?.length) {
      addSection("Recent commits");
      logRes.commits.forEach((c) => addItem(c.sha, c.sha, c.subject || "(no message)"));
    }
    bisectRefPickerOutsideClick = (e) => {
      if (picker.contains(e.target) || anchorEl.contains(e.target)) return;
      closeBisectRefPicker();
    };
    setTimeout(() => document.addEventListener("click", bisectRefPickerOutsideClick), 0);
  }
  document.getElementById("btn-bisect-browse-bad")?.addEventListener("click", (e) => {
    if (!state.selectedPath) return;
    e.stopPropagation();
    openBisectRefPicker(e.currentTarget, "detail-bisect-bad");
  });
  document.getElementById("btn-bisect-browse-good")?.addEventListener("click", (e) => {
    if (!state.selectedPath) return;
    e.stopPropagation();
    openBisectRefPicker(e.currentTarget, "detail-bisect-good");
  });
  document.getElementById("btn-bisect-start")?.addEventListener("click", () => {
    if (!state.selectedPath) return;
    const badEl = document.getElementById("detail-bisect-bad");
    const goodEl = document.getElementById("detail-bisect-good");
    const bad = badEl?.value?.trim() || "HEAD";
    const good = goodEl?.value?.trim() || void 0;
    runGitAction("Start bisect", () => window.releaseManager.bisectStart(state.selectedPath, bad, good), { refreshAlways: true });
  });
  document.getElementById("btn-bisect-good")?.addEventListener("click", () => {
    if (!state.selectedPath) return;
    runGitAction("Mark good", () => window.releaseManager.bisectGood(state.selectedPath), { refreshAlways: true });
  });
  document.getElementById("btn-bisect-bad")?.addEventListener("click", () => {
    if (!state.selectedPath) return;
    runGitAction("Mark bad", () => window.releaseManager.bisectBad(state.selectedPath), { refreshAlways: true });
  });
  document.getElementById("btn-bisect-reset")?.addEventListener("click", () => {
    if (!state.selectedPath) return;
    runGitAction("Reset bisect", () => window.releaseManager.bisectReset(state.selectedPath), { refreshAlways: true });
  });
  document.getElementById("detail-bisect-view-commit")?.addEventListener("click", (e) => {
    e.preventDefault();
    const link = e.currentTarget;
    const sha = link?.dataset?.bisectSha;
    if (state.selectedPath && sha) openCommitDetailModal(state.selectedPath, sha);
  });
  document.getElementById("btn-bisect-run-test")?.addEventListener("click", async () => {
    if (!state.selectedPath || !state.currentInfo?.ok) return;
    const pt = state.currentInfo.projectType;
    if (pt !== "npm" && pt !== "php") return;
    const statusEl = document.getElementById("detail-git-action-status");
    if (statusEl) {
      statusEl.textContent = "Running tests\u2026";
      statusEl.classList.remove("hidden");
    }
    try {
      const result = await window.releaseManager.runProjectTests(state.selectedPath, pt, "test");
      const exitCode = result?.exitCode ?? (result?.ok ? 0 : 1);
      if (exitCode === 0) {
        await window.releaseManager.bisectGood(state.selectedPath);
        if (statusEl) statusEl.textContent = "Tests passed \u2192 marked Good.";
      } else {
        await window.releaseManager.bisectBad(state.selectedPath);
        if (statusEl) statusEl.textContent = "Tests failed \u2192 marked Bad.";
      }
      loadProjectInfo(state.selectedPath);
    } catch (e) {
      if (statusEl) statusEl.textContent = e?.message || "Run test failed.";
    }
  });
  document.getElementById("modal-commit-detail")?.addEventListener("click", (e) => {
    if (e.target.id === "modal-commit-detail") closeCommitDetailModal();
  });
  document.getElementById("modal-commit-detail-close")?.addEventListener("click", closeCommitDetailModal);
  document.getElementById("modal-commit-detail-close-btn")?.addEventListener("click", closeCommitDetailModal);
  document.getElementById("btn-commit-detail-copy-sha")?.addEventListener("click", () => {
    if (state.modalCommitDetailSha) window.releaseManager.copyToClipboard(state.modalCommitDetailSha);
  });
  document.getElementById("btn-commit-detail-cherry-pick")?.addEventListener("click", () => {
    if (!state.selectedPath || !state.modalCommitDetailSha) return;
    closeCommitDetailModal();
    runGitAction("Cherry-pick", () => window.releaseManager.gitCherryPick(state.selectedPath, state.modalCommitDetailSha), { successKey: "cherryPick", refreshAlways: true });
  });
  document.getElementById("btn-commit-detail-revert")?.addEventListener("click", () => {
    if (!state.selectedPath || !state.modalCommitDetailSha) return;
    if (!confirm(`Revert commit ${state.modalCommitDetailSha}? This will create a new commit that undoes it.`)) return;
    closeCommitDetailModal();
    runGitAction("Revert", () => window.releaseManager.gitRevert(state.selectedPath, state.modalCommitDetailSha), { successKey: "revert", refreshAlways: true });
  });
  document.getElementById("btn-commit-detail-amend")?.addEventListener("click", () => {
    if (!state.selectedPath || !state.modalCommitDetailSha) return;
    closeCommitDetailModal();
    runGitAction("Amend", () => window.releaseManager.gitAmend(state.selectedPath), { successKey: "amend", refreshAlways: true });
  });
  document.getElementById("btn-load-commits").addEventListener("click", async () => {
    if (!state.selectedPath || !state.currentInfo?.ok) return;
    const sinceTag = state.currentInfo.latestTag || null;
    try {
      const result = await window.releaseManager.getCommitsSinceTag(state.selectedPath, sinceTag);
      if (result && result.ok && result.commits && result.commits.length) {
        releaseNotesEl.value = result.commits.join("\n");
      } else if (result && result.ok) {
        releaseNotesEl.value = "(no commits since last tag)";
      } else {
        releaseNotesEl.value = result && result.error ? result.error : "Could not load commits. Try restarting the app.";
      }
    } catch (e) {
      releaseNotesEl.value = "Could not load commits. Quit and restart the app, then try again.";
    }
  });
  document.getElementById("btn-release-patch").addEventListener("click", () => release("patch"));
  document.getElementById("btn-release-minor").addEventListener("click", () => release("minor"));
  document.getElementById("btn-release-major").addEventListener("click", () => release("major"));
  document.getElementById("btn-release-prerelease").addEventListener("click", () => release("prerelease"));
  document.getElementById("btn-release-tag-only")?.addEventListener("click", () => release("patch"));
  githubTokenEl.addEventListener("blur", async () => {
    if (!state.selectedPath) return;
    const token = githubTokenEl.value?.trim() || void 0;
    const list = await window.releaseManager.getProjects();
    const updated = list.map((p) => p.path === state.selectedPath ? { ...p, githubToken: token } : p);
    await window.releaseManager.setProjects(updated);
    state.projects = updated;
  });
  async function loadPhpVersionSelect(dirPath, project) {
    const selectEl = document.getElementById("detail-php-path");
    if (!selectEl || !dirPath) return;
    try {
      const [available, composerInfo] = await Promise.all([
        window.releaseManager.getAvailablePhpVersions(),
        window.releaseManager.getComposerInfo(dirPath)
      ]);
      const savedPath = (project?.phpPath && typeof project.phpPath === "string" ? project.phpPath : "").trim() || null;
      selectEl.innerHTML = '<option value="">Use default</option>';
      available.forEach(({ version, path: phpPath }) => {
        const opt = document.createElement("option");
        opt.value = phpPath;
        opt.textContent = `PHP ${version}`;
        selectEl.appendChild(opt);
      });
      if (savedPath) {
        const found = available.some((a) => a.path === savedPath);
        if (!found) {
          const customOpt = document.createElement("option");
          customOpt.value = savedPath;
          customOpt.textContent = "Custom (saved)";
          selectEl.appendChild(customOpt);
        }
        selectEl.value = savedPath;
      }
      if (!savedPath && composerInfo?.ok && composerInfo.phpRequire) {
        const preferred = await window.releaseManager.getPhpVersionFromRequire(composerInfo.phpRequire);
        if (preferred && available.length > 0) {
          const match = available.find((a) => {
            const [am, an] = a.version.split(".").map(Number);
            const [pm, pn] = preferred.split(".").map(Number);
            return am > pm || am === pm && (an || 0) >= (pn || 0);
          }) || available.find((a) => a.version === preferred);
          if (match) {
            selectEl.value = match.path;
            const list = await window.releaseManager.getProjects();
            const updated = list.map((p) => p.path === dirPath ? { ...p, phpPath: match.path } : p);
            await window.releaseManager.setProjects(updated);
            state.projects = updated;
          }
        }
      }
    } catch (_) {
      selectEl.innerHTML = '<option value="">Use default</option>';
    }
  }
  detailPhpPathEl?.addEventListener("change", async () => {
    if (!state.selectedPath) return;
    const phpPath = detailPhpPathEl.value?.trim() || void 0;
    const list = await window.releaseManager.getProjects();
    const updated = list.map((p) => p.path === state.selectedPath ? { ...p, phpPath } : p);
    await window.releaseManager.setProjects(updated);
    state.projects = updated;
  });
  async function runProjectTestAndShowOutput(scriptName) {
    if (!state.selectedPath || !state.currentInfo?.ok) return;
    const projectType = state.currentInfo.projectType || "npm";
    if (projectType !== "npm" && projectType !== "php") return;
    const statusEl = document.getElementById("detail-tests-status");
    const outputEl = document.getElementById("detail-tests-output");
    if (statusEl) {
      statusEl.textContent = scriptName ? `Running ${scriptName}\u2026` : "Running\u2026";
      statusEl.classList.remove("hidden", "text-rm-warning");
    }
    if (outputEl) {
      outputEl.textContent = "";
      outputEl.classList.add("hidden");
    }
    try {
      const result = await window.releaseManager.runProjectTests(state.selectedPath, projectType, scriptName);
      const raw = [result.stdout, result.stderr].filter(Boolean).join(result.stdout && result.stderr ? "\n" : "") || "(no output)";
      const out = stripAnsi(raw);
      if (outputEl) {
        outputEl.textContent = out;
        outputEl.classList.remove("hidden");
      }
      if (statusEl) {
        statusEl.textContent = result.ok ? "Done (passed)." : `Done (exit code ${result.exitCode}).`;
        statusEl.classList.toggle("text-rm-warning", !result.ok);
      }
    } catch (e) {
      if (statusEl) {
        statusEl.textContent = e?.message || "Failed to run tests";
        statusEl.classList.add("text-rm-warning");
      }
      if (outputEl) {
        outputEl.textContent = e?.message || "Failed";
        outputEl.classList.remove("hidden");
      }
    }
  }
  document.getElementById("btn-run-tests")?.addEventListener("click", () => runProjectTestAndShowOutput());
  document.getElementById("detail-tests-scripts")?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-script]");
    if (btn) runProjectTestAndShowOutput(btn.dataset.script);
  });
  async function runCoverageAndShowOutput() {
    if (!state.selectedPath || !state.currentInfo?.ok) return;
    const projectType = state.currentInfo.projectType || "npm";
    if (projectType !== "npm" && projectType !== "php") return;
    const statusEl = document.getElementById("detail-coverage-status");
    const outputEl = document.getElementById("detail-coverage-output");
    if (statusEl) {
      statusEl.textContent = "Running\u2026";
      statusEl.classList.remove("hidden", "text-rm-warning");
    }
    if (outputEl) {
      outputEl.textContent = "";
      outputEl.classList.add("hidden");
    }
    if (detailCoverageSummaryEl) detailCoverageSummaryEl.textContent = "\u2026";
    try {
      const result = await window.releaseManager.runProjectCoverage(state.selectedPath, projectType);
      const raw = [result.stdout, result.stderr].filter(Boolean).join(result.stdout && result.stderr ? "\n" : "") || "(no output)";
      const out = stripAnsi(raw);
      if (outputEl) {
        outputEl.textContent = out;
        outputEl.classList.remove("hidden");
      }
      if (statusEl) {
        statusEl.textContent = result.ok ? "Done." : `Done (exit code ${result.exitCode}).`;
        statusEl.classList.toggle("text-rm-warning", !result.ok);
      }
      const summary = result.summary || null;
      if (summary) {
        state.lastCoverageByPath[state.selectedPath] = summary;
        if (detailCoverageSummaryEl) detailCoverageSummaryEl.textContent = summary;
      } else if (detailCoverageSummaryEl) detailCoverageSummaryEl.textContent = "\u2014";
    } catch (e) {
      if (statusEl) {
        statusEl.textContent = e?.message || "Failed to run coverage";
        statusEl.classList.add("text-rm-warning");
      }
      if (outputEl) {
        outputEl.textContent = e?.message || "Failed";
        outputEl.classList.remove("hidden");
      }
      if (detailCoverageSummaryEl) detailCoverageSummaryEl.textContent = "\u2014";
    }
  }
  document.getElementById("btn-run-coverage")?.addEventListener("click", runCoverageAndShowOutput);
  document.getElementById("btn-run-coverage-header")?.addEventListener("click", runCoverageAndShowOutput);
  document.getElementById("btn-composer-refresh")?.addEventListener("click", () => {
    if (state.selectedPath) loadComposerSection(state.selectedPath);
  });
  document.getElementById("btn-composer-update-all")?.addEventListener("click", () => {
    if (!state.selectedPath) return;
    if (!confirm("Run composer update for all packages? This may change composer.lock and many dependencies.")) return;
    runComposerUpdate(state.selectedPath, []);
  });
  document.getElementById("detail-composer-direct-only")?.addEventListener("change", () => {
    if (state.selectedPath) loadComposerSection(state.selectedPath);
  });
  document.getElementById("btn-sync").addEventListener("click", syncFromRemote);
  document.getElementById("btn-download-latest").addEventListener("click", downloadLatestRelease);
  viewDropdownWrapEl?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (e.target.closest("#view-dropdown-btn")) {
      const isOpen = viewDropdownMenuEl && !viewDropdownMenuEl.classList.contains("hidden");
      if (isOpen) closeViewDropdown();
      else openViewDropdown();
    }
  });
  viewDropdownMenuEl?.querySelectorAll(".view-dropdown-option").forEach((el) => {
    el.addEventListener("click", () => applyViewChoice(el.dataset.value));
  });
  document.addEventListener("click", () => closeViewDropdown());
  changelogContentEl?.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="http"]');
    if (a && a.href) {
      e.preventDefault();
      window.releaseManager.openUrl(a.href);
    }
  });
  document.addEventListener("keydown", async (e) => {
    const action = await window.releaseManager.getShortcutAction(
      state.viewMode,
      state.selectedPath,
      e.key,
      e.metaKey,
      e.ctrlKey,
      !!e.target.closest('input, textarea, [contenteditable="true"]')
    );
    if (!action) return;
    e.preventDefault();
    if (action === "release-patch") release("patch");
    else if (action === "release-minor") release("minor");
    else if (action === "release-major") release("major");
    else if (action === "sync") syncFromRemote();
    else if (action === "download-latest") downloadLatestRelease();
  });
  if (settingsGithubTokenEl) {
    settingsGithubTokenEl.addEventListener("blur", () => {
      window.releaseManager.setGitHubToken(settingsGithubTokenEl.value?.trim() ?? "");
    });
  }
  var settingsPhpPathInputEl = document.getElementById("settings-php-path");
  if (settingsPhpPathInputEl) {
    settingsPhpPathInputEl.addEventListener("blur", () => {
      window.releaseManager.setPreference("phpPath", settingsPhpPathInputEl.value?.trim() ?? "");
    });
  }
  var settingsOllamaBaseUrlEl = document.getElementById("settings-ollama-base-url");
  var settingsOllamaModelEl = document.getElementById("settings-ollama-model");
  if (settingsOllamaBaseUrlEl) {
    settingsOllamaBaseUrlEl.addEventListener("blur", () => {
      window.releaseManager.setOllamaSettings(settingsOllamaBaseUrlEl.value?.trim() || "http://localhost:11434", settingsOllamaModelEl?.value?.trim() || "llama3.2");
    });
  }
  if (settingsOllamaModelEl) {
    settingsOllamaModelEl.addEventListener("blur", () => {
      window.releaseManager.setOllamaSettings(settingsOllamaBaseUrlEl?.value?.trim() || "http://localhost:11434", settingsOllamaModelEl.value?.trim() || "llama3.2");
    });
  }
  var settingsOllamaListModelsBtn = document.getElementById("settings-ollama-list-models");
  var settingsOllamaModelsStatusEl = document.getElementById("settings-ollama-models-status");
  var settingsOllamaModelsListEl = document.getElementById("settings-ollama-models-list");
  if (settingsOllamaListModelsBtn) {
    settingsOllamaListModelsBtn.addEventListener("click", async () => {
      const baseUrl = settingsOllamaBaseUrlEl?.value?.trim() || "";
      if (!settingsOllamaModelsStatusEl || !settingsOllamaModelsListEl) return;
      settingsOllamaModelsStatusEl.textContent = "Loading\u2026";
      settingsOllamaModelsStatusEl.classList.remove("hidden");
      settingsOllamaModelsListEl.classList.add("hidden");
      settingsOllamaModelsListEl.innerHTML = "";
      try {
        const result = await window.releaseManager.ollamaListModels(baseUrl);
        if (result?.ok && Array.isArray(result.models)) {
          const n = result.models.length;
          settingsOllamaModelsStatusEl.textContent = n === 0 ? "No models that support generation. Pull one with ollama pull <model> (e.g. llama3.2)." : `${n} model${n === 1 ? "" : "s"} that support generation \u2014 click to select:`;
          if (n > 0) {
            const initialCount = 3;
            const createModelBtn = (name) => {
              const btn = document.createElement("button");
              btn.type = "button";
              btn.className = "text-xs px-2 py-1 rounded bg-rm-surface text-rm-text border border-rm-border hover:bg-rm-hover cursor-pointer";
              btn.textContent = name;
              btn.addEventListener("click", () => {
                if (settingsOllamaModelEl) {
                  settingsOllamaModelEl.value = name;
                  window.releaseManager.setOllamaSettings(
                    settingsOllamaBaseUrlEl?.value?.trim() || "http://localhost:11434",
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
              const loadMoreBtn = document.createElement("button");
              loadMoreBtn.type = "button";
              loadMoreBtn.className = "text-xs px-2 py-1 rounded bg-rm-surface text-rm-accent border border-rm-border hover:bg-rm-hover cursor-pointer";
              loadMoreBtn.textContent = `Load more (${rest.length})`;
              loadMoreBtn.addEventListener("click", () => {
                rest.forEach((name) => settingsOllamaModelsListEl.appendChild(createModelBtn(name)));
                loadMoreBtn.remove();
              });
              settingsOllamaModelsListEl.appendChild(loadMoreBtn);
            }
            settingsOllamaModelsListEl.classList.remove("hidden");
          }
        } else {
          settingsOllamaModelsStatusEl.textContent = result?.error || "Could not list models.";
        }
      } catch (e) {
        settingsOllamaModelsStatusEl.textContent = e?.message || "Could not list models.";
      }
    });
  }
  document.getElementById("btn-ollama-commit")?.addEventListener("click", async () => {
    if (!state.selectedPath) return;
    if (detailCommitStatusEl) {
      detailCommitStatusEl.textContent = "Generating\u2026";
      detailCommitStatusEl.classList.remove("hidden", "text-rm-success");
    }
    try {
      const result = await window.releaseManager.ollamaGenerateCommitMessage(state.selectedPath);
      if (result?.ok && result.text) {
        if (detailCommitMessageEl) detailCommitMessageEl.value = result.text;
        if (detailCommitStatusEl) {
          detailCommitStatusEl.textContent = "Generated. Edit if needed.";
          detailCommitStatusEl.classList.add("text-rm-success");
        }
      } else {
        if (detailCommitStatusEl) {
          detailCommitStatusEl.textContent = result?.error || "Generate failed.";
          detailCommitStatusEl.classList.remove("text-rm-success");
        }
      }
    } catch (e) {
      if (detailCommitStatusEl) {
        detailCommitStatusEl.textContent = e.message || "Generate failed";
        detailCommitStatusEl.classList.remove("text-rm-success");
      }
    }
  });
  document.getElementById("btn-ollama-release-notes")?.addEventListener("click", async () => {
    if (!state.selectedPath) return;
    const sinceTag = state.currentInfo?.latestTag || null;
    const prevNotes = releaseNotesEl?.value ?? "";
    if (releaseNotesEl) releaseNotesEl.value = "Generating\u2026";
    try {
      const result = await window.releaseManager.ollamaGenerateReleaseNotes(state.selectedPath, sinceTag);
      if (result?.ok && result.text) {
        releaseNotesEl.value = result.text;
      } else {
        releaseNotesEl.value = prevNotes;
        syncDownloadStatusEl.textContent = result?.error || "Generate failed.";
        if (syncDownloadStatusWrapEl) syncDownloadStatusWrapEl.classList.remove("hidden");
        syncDownloadStatusEl.classList.remove("hidden", "text-rm-success");
      }
    } catch (e) {
      if (releaseNotesEl) releaseNotesEl.value = prevNotes;
      syncDownloadStatusEl.textContent = e.message || "Generate failed";
      if (syncDownloadStatusWrapEl) syncDownloadStatusWrapEl.classList.remove("hidden");
      syncDownloadStatusEl.classList.remove("hidden", "text-rm-success");
    }
  });
  dashboardFilterEl?.addEventListener("change", () => loadDashboard());
  dashboardSortEl?.addEventListener("change", () => loadDashboard());
  document.getElementById("btn-dashboard-refresh").addEventListener("click", () => loadDashboard());
  async function runBatchRelease(bump) {
    const paths = Array.from(state.selectedPaths);
    if (paths.length < 2) return;
    const names = paths.map((p) => state.projects.find((x) => x.path === p)?.name || p.split(/[/\\]/).filter(Boolean).pop() || p);
    const ok = confirm(`Release (${bump}) for ${paths.length} projects?

${names.join("\n")}`);
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
    state.selectedPaths.clear();
    renderProjectList();
    if (state.viewMode === "dashboard") loadDashboard();
    else if (state.selectedPath) loadProjectInfo(state.selectedPath);
  }
  document.getElementById("btn-batch-patch").addEventListener("click", () => runBatchRelease("patch"));
  document.getElementById("btn-batch-minor").addEventListener("click", () => runBatchRelease("minor"));
  document.getElementById("btn-batch-major").addEventListener("click", () => runBatchRelease("major"));
  async function openDownloadForTag(tagName) {
    if (!state.currentInfo?.ok || !state.currentInfo.gitRemote) {
      syncDownloadStatusEl.textContent = "Select a project with a GitHub remote.";
      if (syncDownloadStatusWrapEl) syncDownloadStatusWrapEl.classList.remove("hidden");
      syncDownloadStatusEl.classList.remove("hidden");
      return;
    }
    try {
      const result = await window.releaseManager.getGitHubReleases(state.currentInfo.gitRemote);
      if (!result.ok || !result.releases?.length) {
        syncDownloadStatusEl.textContent = result.error || "No releases found.";
        if (syncDownloadStatusWrapEl) syncDownloadStatusWrapEl.classList.remove("hidden");
        syncDownloadStatusEl.classList.remove("hidden");
        return;
      }
      const release2 = result.releases.find((r) => r.tag_name === tagName);
      if (!release2) {
        syncDownloadStatusEl.textContent = `Release ${tagName} not found on GitHub.`;
        if (syncDownloadStatusWrapEl) syncDownloadStatusWrapEl.classList.remove("hidden");
        syncDownloadStatusEl.classList.remove("hidden");
        return;
      }
      const assets = release2.assets || [];
      if (assets.length === 0) {
        syncDownloadStatusEl.textContent = "No assets for this release.";
        if (syncDownloadStatusWrapEl) syncDownloadStatusWrapEl.classList.remove("hidden");
        syncDownloadStatusEl.classList.remove("hidden");
        return;
      }
      modalPickAssetListEl.innerHTML = "";
      assets.forEach((asset) => {
        const aLi = document.createElement("li");
        aLi.className = "modal-list-item";
        aLi.textContent = asset.name + (asset.size ? ` (${(asset.size / 1024 / 1024).toFixed(2)} MB)` : "");
        aLi.dataset.url = asset.browser_download_url || "";
        aLi.dataset.name = asset.name || "download";
        aLi.addEventListener("click", async () => {
          modalPickAssetEl.classList.add("hidden");
          const r = await window.releaseManager.downloadAsset(aLi.dataset.url, aLi.dataset.name);
          if (r?.ok) syncDownloadStatusEl.textContent = `Saved to ${r.filePath}`;
          else if (!r?.canceled) syncDownloadStatusEl.textContent = r?.error || "Download failed";
          if (syncDownloadStatusWrapEl) syncDownloadStatusWrapEl.classList.remove("hidden");
          syncDownloadStatusEl.classList.remove("hidden");
        });
        modalPickAssetListEl.appendChild(aLi);
      });
      modalPickAssetEl.classList.remove("hidden");
    } catch (e) {
      syncDownloadStatusEl.textContent = e.message || "Failed to load release.";
      if (syncDownloadStatusWrapEl) syncDownloadStatusWrapEl.classList.remove("hidden");
      syncDownloadStatusEl.classList.remove("hidden");
    }
  }
  async function openChooseVersionModal() {
    if (!state.currentInfo?.ok || !state.currentInfo.gitRemote) {
      syncDownloadStatusEl.textContent = "Select a project with a GitHub remote.";
      if (syncDownloadStatusWrapEl) syncDownloadStatusWrapEl.classList.remove("hidden");
      syncDownloadStatusEl.classList.remove("hidden");
      return;
    }
    modalPickReleaseEl.classList.remove("hidden");
    modalPickReleaseStatusEl.textContent = "Loading releases\u2026";
    modalPickReleaseListEl.innerHTML = "";
    try {
      const result = await window.releaseManager.getGitHubReleases(state.currentInfo.gitRemote);
      modalPickReleaseStatusEl.textContent = "";
      if (!result.ok || !result.releases?.length) {
        modalPickReleaseStatusEl.textContent = result.error || "No releases found";
        return;
      }
      result.releases.forEach((rel) => {
        const li = document.createElement("li");
        li.className = "modal-list-item";
        li.textContent = rel.tag_name + (rel.name && rel.name !== rel.tag_name ? ` \u2014 ${rel.name}` : "");
        li.dataset.tag = rel.tag_name;
        li.dataset.assets = JSON.stringify(rel.assets || []);
        li.addEventListener("click", () => {
          const assets = JSON.parse(li.dataset.assets || "[]");
          modalPickReleaseEl.classList.add("hidden");
          if (assets.length === 0) {
            syncDownloadStatusEl.textContent = "No assets for this release.";
            if (syncDownloadStatusWrapEl) syncDownloadStatusWrapEl.classList.remove("hidden");
            syncDownloadStatusEl.classList.remove("hidden");
            return;
          }
          modalPickAssetListEl.innerHTML = "";
          assets.forEach((asset) => {
            const aLi = document.createElement("li");
            aLi.className = "modal-list-item";
            aLi.textContent = asset.name + (asset.size ? ` (${(asset.size / 1024 / 1024).toFixed(2)} MB)` : "");
            aLi.dataset.url = asset.browser_download_url || "";
            aLi.dataset.name = asset.name || "download";
            aLi.addEventListener("click", async () => {
              modalPickAssetEl.classList.add("hidden");
              const r = await window.releaseManager.downloadAsset(aLi.dataset.url, aLi.dataset.name);
              if (r?.ok) syncDownloadStatusEl.textContent = `Saved to ${r.filePath}`;
              else if (!r?.canceled) syncDownloadStatusEl.textContent = r?.error || "Download failed";
              if (syncDownloadStatusWrapEl) syncDownloadStatusWrapEl.classList.remove("hidden");
              syncDownloadStatusEl.classList.remove("hidden");
            });
            modalPickAssetListEl.appendChild(aLi);
          });
          modalPickAssetEl.classList.remove("hidden");
        });
        modalPickReleaseListEl.appendChild(li);
      });
    } catch (e) {
      modalPickReleaseStatusEl.textContent = e.message || "Failed to load releases";
    }
  }
  document.getElementById("btn-choose-version").addEventListener("click", openChooseVersionModal);
  document.getElementById("modal-pick-release-close").addEventListener("click", () => {
    if (confirm("Close without choosing a release?")) modalPickReleaseEl.classList.add("hidden");
  });
  document.getElementById("modal-pick-asset-close").addEventListener("click", () => {
    if (confirm("Close without downloading?")) modalPickAssetEl.classList.add("hidden");
  });
  var modalFileViewEl = document.getElementById("modal-file-view");
  document.getElementById("modal-file-view-close")?.addEventListener("click", () => {
    modalFileViewEl?.classList.add("hidden");
  });
  document.getElementById("modal-file-view-close-btn")?.addEventListener("click", () => {
    modalFileViewEl?.classList.add("hidden");
  });
  document.getElementById("modal-file-view-open-editor")?.addEventListener("click", () => {
    if (state.fileViewerModalProjectPath && state.fileViewerModalFilePath) {
      window.releaseManager.openFileInEditor(state.fileViewerModalProjectPath, state.fileViewerModalFilePath);
    }
    modalFileViewEl?.classList.add("hidden");
  });
  document.getElementById("modal-file-view-blame")?.addEventListener("click", () => showFileViewerBlame());
  document.getElementById("modal-file-view-diff")?.addEventListener("click", () => showFileViewerDiff());
  function openDocsModal(docKey) {
    if (typeof DOCS === "undefined" || !DOCS[docKey]) return;
    const entry = DOCS[docKey];
    const modal = document.getElementById("modal-docs");
    const titleEl = document.getElementById("modal-docs-title");
    const bodyEl = document.getElementById("modal-docs-body");
    if (!modal || !titleEl || !bodyEl) return;
    titleEl.textContent = entry.title;
    bodyEl.innerHTML = entry.body.trim();
    modal.classList.remove("hidden");
  }
  function closeDocsModal() {
    document.getElementById("modal-docs")?.classList.add("hidden");
  }
  document.getElementById("modal-docs-close")?.addEventListener("click", closeDocsModal);
  document.getElementById("modal-docs-close-btn")?.addEventListener("click", closeDocsModal);
  document.getElementById("modal-docs")?.addEventListener("click", (e) => {
    if (e.target.id === "modal-docs") closeDocsModal();
  });
  document.addEventListener("click", (e) => {
    const trigger = e.target.closest(".doc-trigger");
    if (!trigger) return;
    e.preventDefault();
    e.stopPropagation();
    const key = trigger.dataset.doc;
    if (key) openDocsModal(key);
  });
  async function initCollapsibleSections() {
    let saved = {};
    try {
      const prefs = await window.releaseManager.getPreference(PREF_COLLAPSED_SECTIONS2);
      if (typeof prefs === "object" && prefs !== null) saved = prefs;
    } catch (_) {
    }
    document.querySelectorAll(".collapsible-card").forEach((card) => {
      const section = card.dataset.section;
      const bodyId = card.querySelector(".collapsible-card-body")?.id;
      const header = card.querySelector(".collapsible-card-header");
      const collapsed = saved[section] === true;
      if (collapsed) {
        card.classList.add("is-collapsed");
        if (header) header.setAttribute("aria-expanded", "false");
      } else {
        card.classList.remove("is-collapsed");
        if (header) header.setAttribute("aria-expanded", "true");
      }
      if (header && bodyId) {
        header.setAttribute("aria-controls", bodyId);
        header.addEventListener("click", async () => {
          const isCollapsed = card.classList.toggle("is-collapsed");
          header.setAttribute("aria-expanded", String(!isCollapsed));
          try {
            const current = await window.releaseManager.getPreference(PREF_COLLAPSED_SECTIONS2) || {};
            const next = { ...current, [section]: isCollapsed };
            await window.releaseManager.setPreference(PREF_COLLAPSED_SECTIONS2, next);
          } catch (_) {
          }
        });
      }
    });
  }
  async function refreshProjectsMetadata() {
    if (!state.projects.length) return;
    let updated = false;
    await Promise.all(state.projects.map(async (p) => {
      try {
        const info = await window.releaseManager.getProjectInfo(p.path);
        if (info && info.ok) {
          if (info.hasComposer != null) {
            p.hasComposer = info.hasComposer;
            updated = true;
          }
          if (info.projectType != null) {
            p.projectType = info.projectType;
            updated = true;
          }
        }
      } catch (_) {
      }
    }));
    if (updated) await window.releaseManager.setProjects(state.projects);
  }
  async function refreshFromFilesystem() {
    state.projects = await window.releaseManager.getProjects();
    await refreshProjectsMetadata();
    renderProjectList();
    if (state.viewMode === "dashboard") {
      loadDashboard();
    } else if (state.selectedPath) {
      loadProjectInfo(state.selectedPath);
    }
  }
  async function init() {
    try {
      await initTheme();
    } catch (e) {
      console.error("initTheme failed:", e);
    }
    try {
      await initCollapsibleSections();
    } catch (e) {
      console.error("initCollapsibleSections failed:", e);
    }
    document.querySelectorAll(".detail-git-sidebar-group-title").forEach((btn) => {
      btn.addEventListener("click", () => {
        const group = btn.closest(".detail-git-sidebar-group");
        const expanded = btn.getAttribute("aria-expanded") !== "false";
        btn.setAttribute("aria-expanded", !expanded);
        if (group) group.dataset.collapsed = expanded ? "true" : "false";
      });
    });
    try {
      const useTabs = await window.releaseManager.getPreference(PREF_DETAIL_USE_TABS2);
      const useTabsEl = document.getElementById("detail-use-tabs");
      if (useTabsEl) useTabsEl.checked = useTabs !== false;
    } catch (_) {
    }
    updateDetailTabPanelVisibility();
    document.getElementById("detail-use-tabs")?.addEventListener("change", () => {
      const checked = document.getElementById("detail-use-tabs")?.checked ?? false;
      window.releaseManager.setPreference(PREF_DETAIL_USE_TABS2, checked);
      updateDetailTabPanelVisibility();
    });
    const sectionSelectEl = document.getElementById("detail-git-right-section-select");
    sectionSelectEl?.addEventListener("change", () => {
      const value = sectionSelectEl.value || "working-tree";
      updateGitRightPanelSection(value);
    });
    document.querySelectorAll(".detail-tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".detail-tab-btn").forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        updateDetailTabPanelVisibility();
      });
    });
    document.getElementById("btn-git-go-version")?.addEventListener("click", () => {
      const versionTab = document.querySelector('.detail-tab-btn[data-tab="version"]');
      if (versionTab) versionTab.click();
    });
    try {
      const list = await window.releaseManager.getProjects();
      state.projects = Array.isArray(list) ? list : [];
    } catch (e) {
      console.error("Failed to load projects:", e);
      state.projects = [];
    }
    try {
      await refreshProjectsMetadata();
    } catch (e) {
      console.error("Failed to refresh project metadata:", e);
    }
    const savedPath = await window.releaseManager.getPreference("selectedProjectPath").catch(() => null);
    const savedView = await window.releaseManager.getPreference("state.viewMode").catch(() => null);
    const pathStillInList = typeof savedPath === "string" && savedPath && state.projects.some((p) => p.path === savedPath);
    if (pathStillInList) state.selectedPath = savedPath;
    else if (state.projects.length > 0 && !state.selectedPath) state.selectedPath = state.projects[0].path;
    else state.selectedPath = null;
    renderProjectList();
    if (state.selectedPath) {
      selectProject(state.selectedPath);
    } else {
      showNoSelection();
    }
    if (savedView && savedView !== "detail") {
      if (savedView === "dashboard") showDashboard();
      else if (savedView === "settings") showSettings();
      else if (savedView === "docs") showDocs();
      else if (savedView === "changelog") showChangelog();
    }
    window.addEventListener("beforeunload", saveSettingsToStore);
  }
  document.getElementById("detail-git-filter")?.addEventListener("input", applyGitSidebarFilter);
  filterTypeEl?.addEventListener("change", () => {
    state.filterByType = (filterTypeEl.value || "").trim();
    const filtered = getFilteredProjects();
    if (state.selectedPath && !filtered.some((p) => p.path === state.selectedPath)) {
      state.selectedPath = filtered.length ? filtered[0].path : null;
      if (state.selectedPath) selectProject(state.selectedPath);
      else showNoSelection();
    }
    renderProjectList();
  });
  filterTagEl?.addEventListener("change", () => {
    state.filterByTag = (filterTagEl.value || "").trim();
    const filtered = getFilteredProjects();
    if (state.selectedPath && !filtered.some((p) => p.path === state.selectedPath)) {
      state.selectedPath = filtered.length ? filtered[0].path : null;
      if (state.selectedPath) selectProject(state.selectedPath);
      else showNoSelection();
    }
    renderProjectList();
  });
  detailTagsInputEl?.addEventListener("blur", async () => {
    if (!state.selectedPath) return;
    const proj = state.projects.find((p) => p.path === state.selectedPath);
    if (!proj) return;
    const raw = (detailTagsInputEl.value || "").trim();
    const tags = raw ? raw.split(/[\s,]+/).map((t) => t.trim()).filter(Boolean) : [];
    proj.tags = [...new Set(tags)];
    await window.releaseManager.setProjects(state.projects);
    updateFilterTagOptions();
    renderProjectList();
  });
  document.getElementById("btn-refresh").addEventListener("click", async () => {
    const btn = document.getElementById("btn-refresh");
    if (btn?.classList.contains("refreshing")) return;
    btn?.classList.add("refreshing");
    try {
      await Promise.all([
        refreshFromFilesystem(),
        new Promise((r) => setTimeout(r, 1e3))
      ]);
    } finally {
      btn?.classList.remove("refreshing");
    }
  });
  init();
})();
