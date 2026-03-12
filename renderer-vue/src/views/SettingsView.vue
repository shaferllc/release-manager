<template>
  <div class="settings-root flex flex-1 min-h-0">
    <nav class="settings-nav shrink-0 flex flex-col border-r border-rm-border bg-rm-bg/50" aria-label="Settings sections">
      <div class="settings-nav-inner py-4 pr-2 pl-4">
        <h2 class="settings-nav-title text-xs font-semibold text-rm-muted uppercase tracking-wider px-3 mb-3">Settings</h2>
        <ul class="settings-nav-list list-none m-0 p-0 space-y-0.5">
          <li v-for="(s, idx) in sections" :key="s?.id ?? idx">
            <Button
              variant="text"
              size="small"
              class="settings-nav-btn w-full justify-start px-3 py-2.5 rounded-rm text-sm font-medium min-w-0"
              :class="{ 'settings-nav-btn-active': activeSection === s.id }"
              :aria-current="activeSection === s.id ? 'page' : undefined"
              @click="onSectionClick(s.id)"
            >
              <span class="settings-nav-icon shrink-0 flex items-center justify-center w-5 h-5 [&>svg]:w-[18px] [&>svg]:h-[18px]" aria-hidden="true" v-html="s.icon"></span>
              {{ s.label }}
            </Button>
          </li>
        </ul>
      </div>
    </nav>
    <div class="settings-content flex-1 overflow-auto min-w-0">
      <div class="settings-content-inner py-8 px-8 max-w-2xl">
        <!-- Account -->
        <section v-show="activeSection === 'account'" class="settings-section">
          <div class="settings-section-hero">
            <div class="settings-section-hero-icon" aria-hidden="true" v-html="getSectionMeta('account').icon"></div>
            <div>
              <h3 class="settings-section-hero-title">{{ getSectionMeta('account').label }}</h3>
              <p class="settings-section-hero-desc">{{ getSectionMeta('account').description }}</p>
            </div>
          </div>
          <div class="settings-section-card">
          <!-- Profile card -->
          <div class="account-profile-card">
            <div class="account-profile-row">
              <div v-if="license.isLoggedIn?.value" class="account-avatar-wrap">
                <img
                  v-if="!avatarError && avatarSrc"
                  :src="avatarSrc"
                  alt=""
                  class="account-avatar"
                  referrerpolicy="no-referrer"
                  @error="avatarError = true"
                />
                <div v-else class="account-avatar-initials">{{ userInitials }}</div>
              </div>
              <div class="account-profile-info">
                <span class="account-profile-name">
                  <template v-if="license.isLoggedIn?.value">
                    {{ license.profile?.value?.name || license.licenseEmail?.value || 'Signed in' }}
                  </template>
                  <template v-else>Not signed in</template>
                </span>
                <p v-if="license.isLoggedIn?.value" class="account-profile-email">
                  {{ license.licenseEmail?.value }}
                </p>
                <p v-else class="account-profile-hint">Sign in to use the app.</p>
              </div>
              <Button
                v-if="license.isLoggedIn?.value"
                severity="secondary"
                size="small"
                label="Sign out"
                @click="signOut"
                class="account-signout-btn"
              />
            </div>
          </div>

          <!-- Your info -->
          <template v-if="license.isLoggedIn?.value">
            <div class="settings-card mb-5">
              <div
                class="settings-row pb-4 cursor-pointer select-none"
                role="button"
                tabindex="0"
                aria-label="Your info"
                @click="onYourInfoTap"
                @keydown.enter="onYourInfoTap"
                @keydown.space.prevent="onYourInfoTap"
              >
                <span class="settings-label block mb-1">Your info</span>
                <p class="settings-desc m-0">Information synced from your account.</p>
              </div>
              <table class="account-info-table">
                <tbody>
                  <tr>
                    <td class="account-info-label">Name</td>
                    <td class="account-info-value">{{ license.profile?.value?.name || '—' }}</td>
                  </tr>
                  <tr>
                    <td class="account-info-label">Email</td>
                    <td class="account-info-value">{{ license.licenseEmail?.value || '—' }}</td>
                  </tr>
                  <tr>
                    <td class="account-info-label">Plan</td>
                    <td class="account-info-value">
                      <template v-if="isDeveloperPlan">
                        <div class="flex items-center gap-2">
                          <Select
                            v-model="selectedPlan"
                            :options="planOptions"
                            optionLabel="label"
                            optionValue="value"
                            class="plan-switcher"
                            :loading="switchingPlan"
                            @change="onPlanSwitch"
                          />
                          <span v-if="switchingPlan" class="text-xs text-rm-muted">Switching…</span>
                        </div>
                      </template>
                      <template v-else>
                        <span class="account-plan-badge" :class="{ 'plan-pro': license.isPro?.value, 'plan-plus': license.isPlus?.value, 'plan-free': !license.isPro?.value && !license.isPlus?.value }">
                          {{ license.tierLabel?.value || 'Free' }}
                        </span>
                      </template>
                    </td>
                  </tr>
                  <tr>
                    <td class="account-info-label">GitHub</td>
                    <td class="account-info-value">
                      <span v-if="license.profile?.value?.github_linked" class="inline-flex items-center gap-1 text-rm-success">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                        Linked
                      </span>
                      <span v-else class="text-rm-muted">Not linked</span>
                    </td>
                  </tr>
                  <tr v-if="license.profile?.value?.created_at">
                    <td class="account-info-label">Member since</td>
                    <td class="account-info-value">{{ formatMemberSince(license.profile.value.created_at) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>

          <!-- Environment (hidden until "Your info" is clicked 7 times) -->
          <div v-if="showEnvSetting" class="env-setting-card">
            <div class="env-setting-header">
              <span class="env-setting-icon" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2"/><path d="M12 21v2"/><path d="M4.22 4.22l1.42 1.42"/><path d="M18.36 18.36l1.42 1.42"/><path d="M1 12h2"/><path d="M21 12h2"/><path d="M4.22 19.78l1.42-1.42"/><path d="M18.36 5.64l1.42-1.42"/></svg>
              </span>
              <div>
                <span class="env-setting-label">Environment</span>
                <p class="env-setting-desc">Backend used for sign-in and password reset.</p>
              </div>
            </div>
            <Select
              v-model="licenseServerEnvironment"
              :options="licenseServerEnvironments"
              option-label="label"
              option-value="id"
              class="env-setting-select"
              placeholder="Development"
              @change="saveLicenseServerEnvironment"
            />
          </div>
          </div>
        </section>

        <!-- Subscription -->
        <section v-show="activeSection === 'subscription'" class="settings-section">
          <div class="settings-section-hero">
            <div class="settings-section-hero-icon" aria-hidden="true" v-html="getSectionMeta('subscription').icon"></div>
            <div>
              <h3 class="settings-section-hero-title">{{ getSectionMeta('subscription').label }}</h3>
              <p class="settings-section-hero-desc">{{ getSectionMeta('subscription').description }}</p>
            </div>
          </div>
          <div class="settings-section-card">
          <!-- Plan info (when logged in) -->
          <div v-if="license.isLoggedIn?.value" class="sub-info-card">
            <div class="sub-info-row">
              <span class="sub-info-label">Plan limits</span>
              <span class="sub-info-value">
                {{ license.maxProjects?.value === -1 ? 'Unlimited' : license.maxProjects?.value }} projects
                ·
                {{ license.maxExtensions?.value === -1 ? 'Unlimited' : license.maxExtensions?.value }} extensions
              </span>
            </div>
            <div v-if="license.team?.value" class="sub-info-row">
              <span class="sub-info-label">Team</span>
              <span class="sub-info-value">{{ license.team?.value?.name || '—' }} ({{ license.team?.value?.member_count ?? license.team?.value?.members?.length ?? 0 }} members)</span>
            </div>
          </div>

          <!-- Current plan banner -->
          <div class="sub-current-banner" :class="{ 'sub-banner-pro': license.isPro?.value, 'sub-banner-plus': license.isPlus?.value }">
            <div class="sub-banner-left">
              <div class="sub-banner-icon">
                <svg v-if="license.isPro?.value" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                <svg v-else-if="license.isPlus?.value" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4"/><path d="m4.9 4.9 2.8 2.8"/><path d="M2 12h4"/><path d="m4.9 19.1 2.8-2.8"/><path d="M12 18v4"/><path d="m19.1 19.1-2.8-2.8"/><path d="M22 12h-4"/><path d="m19.1 4.9-2.8 2.8"/><circle cx="12" cy="12" r="4"/></svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
              </div>
              <div>
                <span class="sub-banner-plan">{{ license.tierLabel?.value || 'Free' }}</span>
                <span class="sub-banner-label">Current plan</span>
              </div>
            </div>
            <div class="sub-banner-right">
              <Button
                v-if="!license.isPro?.value"
                severity="primary"
                size="small"
                label="Upgrade"
                @click="openSubscriptionPage('pricing')"
                :disabled="!license.isLoggedIn?.value"
              />
              <Button
                severity="secondary"
                size="small"
                label="Manage billing"
                @click="openSubscriptionPage('billing/portal')"
                :disabled="!license.isLoggedIn?.value"
              />
            </div>
          </div>

          <!-- Plan tiers -->
          <div class="sub-tiers-row">
            <div v-for="tier in PLAN_TIERS" :key="tier.id" class="sub-tier" :class="{ 'sub-tier-active': currentPlanId === tier.id, 'sub-tier-popular': tier.popular && currentPlanId !== tier.id }">
              <div v-if="tier.popular && currentPlanId !== tier.id" class="sub-tier-tag">Popular</div>
              <div v-else-if="currentPlanId === tier.id" class="sub-tier-tag sub-tier-tag-current">Current</div>
              <div v-if="tier.icon" class="sub-tier-icon" aria-hidden="true" v-html="tier.icon"></div>
              <h4 class="sub-tier-name">{{ tier.name }}</h4>
              <div class="sub-tier-pricing">
                <span class="sub-tier-price">{{ tier.price }}</span>
                <span v-if="tier.period" class="sub-tier-period">{{ tier.period }}</span>
              </div>
              <p class="sub-tier-desc">{{ tier.desc }}</p>
              <Button
                v-if="currentPlanId !== tier.id && tier.id !== 'free'"
                :label="tier.id === 'pro' ? 'Upgrade' : 'Go Team'"
                :severity="tier.popular ? 'primary' : 'secondary'"
                size="small"
                class="w-full mt-2"
                @click="openSubscriptionPage('pricing')"
                :disabled="!license.isLoggedIn?.value"
              />
              <div v-else-if="currentPlanId === tier.id" class="sub-tier-active-label">
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                Active
              </div>
            </div>
          </div>

          <!-- Feature comparison table -->
          <div class="sub-compare-table-wrap">
            <table class="sub-compare-table">
              <thead>
                <tr>
                  <th class="sub-compare-th-feature"></th>
                  <th v-for="tier in PLAN_TIERS" :key="tier.id" class="sub-compare-th" :class="{ 'sub-compare-th-active': currentPlanId === tier.id }">{{ tier.name }}</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="group in PLAN_FEATURES" :key="group.category">
                  <tr class="sub-compare-category-row">
                    <td :colspan="PLAN_TIERS.length + 1" class="sub-compare-category">
                      <span v-if="group.icon" class="sub-compare-category-icon" aria-hidden="true" v-html="group.icon"></span>
                      {{ group.category }}
                    </td>
                  </tr>
                  <tr v-for="feat in group.features" :key="feat.label" class="sub-compare-row">
                    <td class="sub-compare-label">{{ feat.label }}</td>
                    <td v-for="tier in PLAN_TIERS" :key="tier.id" class="sub-compare-cell" :class="{ 'sub-compare-cell-active': currentPlanId === tier.id }">
                      <template v-if="feat[tier.id] === true">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="sub-compare-check"><polyline points="20 6 9 17 4 12"/></svg>
                      </template>
                      <template v-else-if="feat[tier.id] === false">
                        <span class="sub-compare-dash">—</span>
                      </template>
                      <template v-else>
                        <span class="sub-compare-value">{{ feat[tier.id] }}</span>
                      </template>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>

          <p v-if="!license.isLoggedIn?.value" class="text-sm text-rm-warning mt-4 m-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1 align-[-2px]"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            Sign in to manage your subscription.
          </p>
          </div>
        </section>

        <!-- Team -->
        <section v-show="activeSection === 'team'" class="settings-section">
          <div class="settings-section-hero">
            <div class="settings-section-hero-icon" aria-hidden="true" v-html="getSectionMeta('team').icon"></div>
            <div>
              <h3 class="settings-section-hero-title">{{ getSectionMeta('team').label }}</h3>
              <p class="settings-section-hero-desc">{{ getSectionMeta('team').description }}</p>
            </div>
          </div>
          <div class="settings-section-card">
          <!-- Not logged in -->
          <div v-if="!license.isLoggedIn?.value" class="settings-card">
            <div class="settings-row">
              <p class="settings-desc text-rm-warning">Sign in to manage your team.</p>
            </div>
          </div>

          <!-- No team yet — create one -->
          <div v-else-if="!teamData" class="settings-card space-y-5">
            <div class="settings-row">
              <p class="settings-desc mb-4">You're not part of a team yet. Create one to invite members and collaborate on projects.</p>
              <div class="flex items-end gap-3">
                <div class="flex-1 max-w-xs">
                  <label class="settings-label block mb-1" for="create-team-name">Team name</label>
                  <InputText id="create-team-name" v-model="newTeamName" placeholder="e.g. My Team" class="w-full" />
                </div>
                <Button severity="primary" label="Create team" :loading="teamCreating" :disabled="!newTeamName.trim()" @click="handleCreateTeam" />
              </div>
              <p v-if="teamError" class="text-sm text-red-500 mt-2 m-0">{{ teamError }}</p>
            </div>
          </div>

          <!-- Has team -->
          <template v-else>
            <!-- Team switcher (when user has multiple teams) -->
            <div v-if="teamsList.length > 1" class="settings-card mb-5">
              <label class="settings-label block mb-2">Active team</label>
              <Select
                :model-value="activeTeamId"
                :options="teamsList"
                option-label="name"
                option-value="id"
                placeholder="Select team"
                class="w-full max-w-xs"
                @update:model-value="onActiveTeamChange"
              />
            </div>
            <!-- Team header -->
            <div class="settings-card space-y-5 mb-5">
              <div class="settings-row flex items-center justify-between gap-4 flex-wrap">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="settings-label text-base font-semibold">{{ teamData.name }}</span>
                    <span class="team-role-badge" :class="'team-role-' + teamMyRole">{{ teamMyRole }}</span>
                  </div>
                  <p class="settings-desc m-0 mt-1">
                    {{ teamData.member_count || teamData.members?.length || 0 }}
                    member{{ (teamData.member_count || teamData.members?.length || 0) === 1 ? '' : 's' }}
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <Button severity="secondary" size="small" icon="pi pi-refresh" :loading="teamRefreshing" @click="refreshTeamData" v-tooltip.bottom="'Refresh'" />
                  <Button v-if="teamData.is_admin" severity="secondary" size="small" label="Open on web" @click="openSubscriptionPage('teams')" />
                </div>
              </div>

              <!-- Rename (admin only) -->
              <div v-if="teamData.is_admin" class="settings-row pt-3 border-t border-rm-border">
                <label class="settings-label block mb-1" for="rename-team">Rename team</label>
                <div class="flex items-center gap-2">
                  <InputText id="rename-team" v-model="renameTeamName" class="flex-1 max-w-xs" placeholder="Team name" />
                  <Button severity="secondary" size="small" label="Save" :loading="teamRenaming" :disabled="!renameTeamName.trim() || renameTeamName.trim() === teamData.name" @click="handleRenameTeam" />
                </div>
              </div>
            </div>

            <!-- Members -->
            <div class="settings-card space-y-0 mb-5">
              <div class="settings-row flex items-center justify-between gap-3">
                <span class="settings-label">Members</span>
              </div>
              <div v-for="member in teamData.members" :key="member.id" class="team-member-row">
                <div class="flex items-center gap-3 min-w-0 flex-1">
                  <div class="team-member-avatar">
                    <img v-if="member.avatar_url" :src="member.avatar_url" alt="" referrerpolicy="no-referrer" class="team-member-avatar-img" />
                    <span v-else class="team-member-avatar-initials">{{ memberInitials(member) }}</span>
                  </div>
                  <div class="min-w-0 flex-1">
                    <span class="text-sm font-medium text-rm-text block truncate">{{ member.name || member.email }}</span>
                    <span class="text-xs text-rm-muted block truncate">{{ member.email }}</span>
                  </div>
                  <span class="team-role-badge text-[10px]" :class="'team-role-' + member.role">{{ member.role }}</span>
                </div>
                <Button
                  v-if="teamData.is_admin && member.role !== 'owner'"
                  severity="danger"
                  variant="text"
                  size="small"
                  icon="pi pi-times"
                  v-tooltip.bottom="'Remove member'"
                  :loading="removingMemberId === member.id"
                  @click="handleRemoveMember(member)"
                />
              </div>

              <!-- Leave team (non-owner) -->
              <div v-if="!teamData.is_owner" class="settings-row pt-3 border-t border-rm-border">
                <Button severity="danger" variant="text" size="small" label="Leave team" :loading="teamLeaving" @click="handleLeaveTeam" />
              </div>
            </div>

            <!-- Invite (admin only) -->
            <div v-if="teamData.is_admin" class="settings-card space-y-4 mb-5">
              <div class="settings-row">
                <span class="settings-label block mb-1">Invite a member</span>
                <p class="settings-desc m-0 mb-3">They'll receive an invite they can accept from the web app.</p>
                <div class="flex items-end gap-2 flex-wrap">
                  <div class="flex-1 min-w-[200px] max-w-xs">
                    <label class="block text-xs text-rm-muted mb-1" for="invite-email">Email</label>
                    <InputText id="invite-email" v-model="inviteEmail" type="email" placeholder="user@example.com" class="w-full" />
                  </div>
                  <div class="w-28">
                    <label class="block text-xs text-rm-muted mb-1" for="invite-role">Role</label>
                    <Select id="invite-role" v-model="inviteRole" :options="[{label:'Member',value:'member'},{label:'Admin',value:'admin'}]" optionLabel="label" optionValue="value" class="w-full" />
                  </div>
                  <Button severity="primary" size="small" label="Send invite" :loading="inviteSending" :disabled="!inviteEmail.trim()" @click="handleInvite" />
                </div>
                <p v-if="inviteSuccess" class="text-sm text-rm-success mt-2 m-0">{{ inviteSuccess }}</p>
                <p v-if="inviteError" class="text-sm text-red-500 mt-2 m-0">{{ inviteError }}</p>
              </div>

              <!-- Pending invites -->
              <div v-if="teamInvites.length" class="settings-row pt-3 border-t border-rm-border">
                <span class="settings-label block mb-2">Pending invites</span>
                <div class="space-y-2">
                  <div v-for="inv in teamInvites" :key="inv.id" class="flex items-center justify-between gap-3 py-1.5">
                    <div class="min-w-0">
                      <span class="text-sm text-rm-text block truncate">{{ inv.email }}</span>
                      <span class="text-xs text-rm-muted">{{ inv.role }} · sent {{ formatInviteDate(inv.created_at) }}</span>
                    </div>
                    <Button severity="danger" variant="text" size="small" icon="pi pi-times" v-tooltip.bottom="'Cancel invite'" :loading="cancellingInviteId === inv.id" @click="handleCancelInvite(inv)" />
                  </div>
                </div>
              </div>
            </div>

            <p v-if="teamError" class="text-sm text-red-500 m-0">{{ teamError }}</p>
          </template>
          </div>
        </section>

        <!-- Application -->
        <section v-show="activeSection === 'application'" class="settings-section">
          <div class="settings-section-hero">
            <div class="settings-section-hero-icon" aria-hidden="true" v-html="getSectionMeta('application').icon"></div>
            <div>
              <h3 class="settings-section-hero-title">{{ getSectionMeta('application').label }}</h3>
              <p class="settings-section-hero-desc">{{ getSectionMeta('application').description }}</p>
            </div>
          </div>
          <div class="settings-section-card">
          <div class="app-settings-grid">
            <!-- Startup -->
            <div class="app-settings-card">
              <h4 class="app-settings-card-title">Startup</h4>
              <label class="app-settings-row app-settings-row-clickable">
                <div class="min-w-0 flex-1">
                  <span class="app-settings-label">Launch at login</span>
                  <p class="app-settings-desc">Start the app when you log in to your computer.</p>
                </div>
                <Checkbox v-model="launchAtLogin" binary @update:model-value="saveLaunchAtLogin" class="shrink-0" />
              </label>
              <div class="app-settings-row">
                <span class="app-settings-label">Open to</span>
                <p class="app-settings-desc">Default view when the app starts.</p>
                <Select v-model="defaultView" :options="defaultViewOptions" optionLabel="label" optionValue="value" class="app-settings-select mt-2" @change="saveDefaultView" />
              </div>
            </div>

            <!-- Updates -->
            <div class="app-settings-card">
              <h4 class="app-settings-card-title">Updates</h4>
              <div class="app-settings-row">
                <span class="app-settings-label">Check for updates</span>
                <p class="app-settings-desc">When to look for new versions.</p>
                <div class="flex flex-wrap items-center gap-2 mt-2">
                  <Select v-model="checkForUpdates" :options="checkForUpdatesOptions" optionLabel="label" optionValue="value" class="app-settings-select min-w-[10rem]" @change="saveCheckForUpdates" />
                  <Button label="Check now" size="small" severity="secondary" :loading="updateCheckLoading" :disabled="updateCheckLoading" @click="checkForUpdatesNow" />
                </div>
                <p v-if="updateCheckMessage" class="app-settings-hint mt-2">{{ updateCheckMessage }}</p>
                <div v-if="appStore.updateAvailableVersion && !appStore.updateDownloaded" class="flex flex-wrap items-center gap-2 mt-2">
                  <span class="text-sm text-rm-success">Update available (v{{ appStore.updateAvailableVersion }})</span>
                  <Button label="Download" size="small" severity="success" :loading="updateDownloading" :disabled="updateDownloading" @click="downloadUpdate" />
                </div>
                <div v-if="appStore.updateDownloaded" class="flex flex-wrap items-center gap-2 mt-2">
                  <span class="text-sm text-rm-success">Update downloaded. Restart to install.</span>
                  <Button label="Restart now" size="small" severity="success" @click="quitAndInstall" />
                </div>
              </div>
            </div>

            <!-- Quit & Setup -->
            <div class="app-settings-card">
              <h4 class="app-settings-card-title">Quit & setup</h4>
              <label class="app-settings-row app-settings-row-clickable">
                <div class="min-w-0 flex-1">
                  <span class="app-settings-label">Confirm before closing</span>
                  <p class="app-settings-desc">Ask for confirmation when quitting the app.</p>
                </div>
                <Checkbox v-model="confirmBeforeQuit" binary @update:model-value="saveConfirmBeforeQuit" class="shrink-0" />
              </label>
              <div class="app-settings-row">
                <span class="app-settings-label">Setup wizard</span>
                <p class="app-settings-desc">Walk through adding projects, Git, tests, and extensions.</p>
                <Button label="Run setup wizard" size="small" severity="secondary" class="mt-2" @click="openSetupWizard" />
              </div>
            </div>
          </div>
          </div>
        </section>

        <!-- Notifications -->
        <section v-show="activeSection === 'notifications'" class="settings-section">
          <div class="settings-section-hero">
            <div class="settings-section-hero-icon" aria-hidden="true" v-html="getSectionMeta('notifications').icon"></div>
            <div>
              <h3 class="settings-section-hero-title">{{ getSectionMeta('notifications').label }}</h3>
              <p class="settings-section-hero-desc">{{ getSectionMeta('notifications').description }}</p>
            </div>
          </div>
          <div class="settings-section-card">
          <div class="settings-card space-y-5">
            <label class="settings-row settings-row-clickable settings-checkbox-row">
              <div class="min-w-0">
                <span class="settings-label block text-rm-text">Enable notifications</span>
                <p class="settings-desc m-0 text-sm text-rm-muted">Show in-app and system notifications for releases and errors.</p>
              </div>
              <Checkbox v-model="notificationsEnabled" binary @update:model-value="saveNotificationsEnabled" class="shrink-0" />
            </label>
            <label class="settings-row settings-row-clickable settings-checkbox-row pt-2 border-t border-rm-border">
              <div class="min-w-0">
                <span class="settings-label block text-rm-text">Notification sound</span>
                <p class="settings-desc m-0 text-sm text-rm-muted">Play a sound when a notification appears.</p>
              </div>
              <Checkbox v-model="notificationSound" binary @update:model-value="saveNotificationSound" class="shrink-0" />
            </label>
            <label class="settings-row settings-row-clickable settings-checkbox-row pt-2 border-t border-rm-border">
              <div class="min-w-0">
                <span class="settings-label block text-rm-text">Only when app is in background</span>
                <p class="settings-desc m-0 text-sm text-rm-muted">Show system notifications only when the app is not focused.</p>
              </div>
              <Checkbox v-model="notificationsOnlyWhenNotFocused" binary @update:model-value="saveNotificationsOnlyWhenNotFocused" class="shrink-0" />
            </label>
          </div>

          <!-- Notification Preferences (web app API) -->
          <template v-if="license.isLoggedIn?.value">
            <h4 class="text-base font-semibold text-rm-text mt-8 mb-1">Notification preferences</h4>
            <p class="settings-section-desc text-sm text-rm-muted mb-4">Choose which notifications you receive from the web app.</p>

            <div v-if="notifPrefsLoading" class="settings-card py-6 flex items-center justify-center">
              <span class="text-sm text-rm-muted">Loading preferences…</span>
            </div>
            <div v-else-if="notifPrefsError" class="settings-card py-4">
              <Message severity="error" :closable="false" class="m-0">{{ notifPrefsError }}</Message>
            </div>
            <template v-else>
              <div v-for="cat in notifPrefsCategories" :key="cat.id" class="settings-card mb-4">
                <span class="settings-label block text-rm-text text-xs font-semibold uppercase tracking-wider mb-3">{{ cat.label }}</span>
                <div class="space-y-4">
                  <label
                    v-for="(nt, ntIdx) in notifPrefsTypesForCategory(cat.id)"
                    :key="nt.key"
                    class="settings-row settings-row-clickable settings-checkbox-row"
                    :class="{ 'pt-3 border-t border-rm-border': ntIdx > 0 }"
                  >
                    <div class="min-w-0">
                      <span class="settings-label block text-rm-text">{{ nt.label }}</span>
                      <p class="settings-desc m-0 text-sm text-rm-muted">{{ nt.description }}</p>
                    </div>
                    <Checkbox v-model="notifPrefs[nt.key]" binary @update:model-value="saveNotifPrefs" class="shrink-0" />
                  </label>
                </div>
              </div>
              <div v-if="notifPrefsSaveMessage" class="mt-2">
                <Message severity="success" :closable="false" class="m-0">{{ notifPrefsSaveMessage }}</Message>
              </div>
              <div v-if="notifPrefsSaving" class="mt-2">
                <span class="text-sm text-rm-muted">Saving…</span>
              </div>
            </template>
          </template>
          </div>
        </section>

        <!-- Behavior -->
        <section v-show="activeSection === 'behavior'" class="settings-section">
          <div class="settings-section-hero">
            <div class="settings-section-hero-icon" aria-hidden="true" v-html="getSectionMeta('behavior').icon"></div>
            <div>
              <h3 class="settings-section-hero-title">{{ getSectionMeta('behavior').label }}</h3>
              <p class="settings-section-hero-desc">{{ getSectionMeta('behavior').description }}</p>
            </div>
          </div>
          <div class="settings-section-card">
          <div class="settings-card space-y-5">
            <label class="settings-row settings-row-clickable settings-checkbox-row">
              <div class="min-w-0">
                <span class="settings-label block text-rm-text">Double-click to open project</span>
                <p class="settings-desc m-0 text-sm text-rm-muted">Require double-click to open a project in the sidebar (single-click to select only).</p>
              </div>
              <Checkbox v-model="doubleClickToOpenProject" binary @update:model-value="saveDoubleClickToOpenProject" class="shrink-0" />
            </label>
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Default project sort</span>
              <p class="settings-desc">How to order projects in the sidebar.</p>
              <Select v-model="projectSortOrder" :options="projectSortOptions" optionLabel="label" optionValue="value" class="max-w-xs mt-2" @change="saveProjectSortOrder" />
            </div>
            <label class="settings-row settings-row-clickable settings-checkbox-row pt-2 border-t border-rm-border">
              <div class="min-w-0">
                <span class="settings-label block text-rm-text">Lock sidebar width</span>
                <p class="settings-desc m-0 text-sm text-rm-muted">Prevent resizing the sidebar (width stays fixed).</p>
              </div>
              <Checkbox v-model="sidebarWidthLocked" binary @update:model-value="saveSidebarWidthLocked" class="shrink-0" />
            </label>
            <label class="settings-row settings-row-clickable settings-checkbox-row pt-2 border-t border-rm-border">
              <div class="min-w-0">
                <span class="settings-label block text-rm-text">Open project in new tab</span>
                <p class="settings-desc m-0 text-sm text-rm-muted">When using tabs, open projects in a new tab instead of replacing the current one.</p>
              </div>
              <Checkbox v-model="openProjectInNewTab" binary @update:model-value="saveOpenProjectInNewTab" class="shrink-0" />
            </label>
            <label class="settings-row settings-row-clickable settings-checkbox-row pt-2 border-t border-rm-border">
              <div class="min-w-0">
                <span class="settings-label block text-rm-text">Compact sidebar</span>
                <p class="settings-desc m-0 text-sm text-rm-muted">Smaller icons and labels in the project list.</p>
              </div>
              <Checkbox v-model="compactSidebar" binary @update:model-value="saveCompactSidebar" class="shrink-0" />
            </label>
            <label class="settings-row settings-row-clickable settings-checkbox-row pt-2 border-t border-rm-border">
              <div class="min-w-0">
                <span class="settings-label block text-rm-text">Show project path in sidebar</span>
                <p class="settings-desc m-0 text-sm text-rm-muted">Display full path under each project name.</p>
              </div>
              <Checkbox v-model="showProjectPathInSidebar" binary @update:model-value="saveShowProjectPathInSidebar" class="shrink-0" />
            </label>
            <label class="settings-row settings-row-clickable settings-checkbox-row pt-2 border-t border-rm-border">
              <div class="min-w-0">
                <span class="settings-label block text-rm-text">Remember last opened tab</span>
                <p class="settings-desc m-0 text-sm text-rm-muted">Per project, restore the last detail tab (Git, Tests, etc.) when reopening.</p>
              </div>
              <Checkbox v-model="rememberLastDetailTab" binary @update:model-value="saveRememberLastDetailTab" class="shrink-0" />
            </label>
            <label class="settings-row settings-row-clickable settings-checkbox-row pt-2 border-t border-rm-border">
              <div class="min-w-0">
                <span class="settings-label block text-rm-text">Confirm destructive actions</span>
                <p class="settings-desc m-0 text-sm text-rm-muted">Ask for confirmation before delete, release, or batch release.</p>
              </div>
              <Checkbox v-model="confirmDestructiveActions" binary @update:model-value="saveConfirmDestructiveActions" class="shrink-0" />
            </label>
            <label class="settings-row settings-row-clickable settings-checkbox-row pt-2 border-t border-rm-border">
              <div class="min-w-0">
                <span class="settings-label block text-rm-text">Confirm before discarding changes</span>
                <p class="settings-desc m-0 text-sm text-rm-muted">Extra confirmation before git discard or reset.</p>
              </div>
              <Checkbox v-model="confirmBeforeDiscard" binary @update:model-value="saveConfirmBeforeDiscard" class="shrink-0" />
            </label>
            <label class="settings-row settings-row-clickable settings-checkbox-row pt-2 border-t border-rm-border">
              <div class="min-w-0">
                <span class="settings-label block text-rm-text">Confirm before force push</span>
                <p class="settings-desc m-0 text-sm text-rm-muted">Extra confirmation before git push --force.</p>
              </div>
              <Checkbox v-model="confirmBeforeForcePush" binary @update:model-value="saveConfirmBeforeForcePush" class="shrink-0" />
            </label>
            <label class="settings-row settings-row-clickable settings-checkbox-row pt-2 border-t border-rm-border">
              <div class="min-w-0">
                <span class="settings-label block text-rm-text">Open links in default browser</span>
                <p class="settings-desc m-0 text-sm text-rm-muted">Open external links (docs, GitHub, etc.) in the system browser instead of in-app.</p>
              </div>
              <Checkbox v-model="openLinksInExternalBrowser" binary @update:model-value="saveOpenLinksInExternalBrowser" class="shrink-0" />
            </label>
            <label class="settings-row settings-row-clickable settings-checkbox-row pt-2 border-t border-rm-border">
              <div class="min-w-0">
                <span class="settings-label block text-rm-text">Debug bar visible</span>
                <p class="settings-desc m-0 text-sm text-rm-muted">Show the debug bar by default (for developers).</p>
              </div>
              <Checkbox v-model="debugBarVisible" binary @update:model-value="saveDebugBarVisible" class="shrink-0" />
            </label>
            <label class="settings-row settings-row-clickable settings-checkbox-row pt-2 border-t border-rm-border">
              <div class="min-w-0">
                <span class="settings-label block text-rm-text">Notify on release success/failure</span>
                <p class="settings-desc m-0 text-sm text-rm-muted">Show system notifications when a release finishes.</p>
              </div>
              <Checkbox v-model="notifyOnRelease" binary @update:model-value="saveNotifyOnRelease" class="shrink-0" />
            </label>
            <label class="settings-row settings-row-clickable settings-checkbox-row pt-2 border-t border-rm-border">
              <div class="min-w-0">
                <span class="settings-label block text-rm-text">Notify when project sync completes</span>
                <p class="settings-desc m-0 text-sm text-rm-muted">Alert when background sync finishes.</p>
              </div>
              <Checkbox v-model="notifyOnSyncComplete" binary @update:model-value="saveNotifyOnSyncComplete" class="shrink-0" />
            </label>
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Auto-refresh interval</span>
              <p class="settings-desc">How often to refresh project list and dashboard (0 = off).</p>
              <Select v-model="autoRefreshIntervalSeconds" :options="autoRefreshIntervalOptions" optionLabel="label" optionValue="value" class="max-w-xs mt-2" @change="saveAutoRefreshInterval" />
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Recent projects list length</span>
              <p class="settings-desc">Maximum number of recent projects to remember.</p>
              <Select v-model="recentListLength" :options="recentListLengthOptions" optionLabel="label" optionValue="value" class="max-w-xs mt-2" @change="saveRecentListLength" />
            </div>
            <label class="settings-row settings-row-clickable settings-checkbox-row pt-2 border-t border-rm-border">
              <div class="min-w-0">
                <span class="settings-label block text-rm-text">Show tips and onboarding</span>
                <p class="settings-desc m-0 text-sm text-rm-muted">Show first-run tips and occasional hints. Uncheck to hide permanently.</p>
              </div>
              <Checkbox v-model="showTips" binary @update:model-value="saveShowTips" class="shrink-0" />
            </label>
          </div>
          </div>
        </section>

        <!-- Extensions -->
        <section v-show="activeSection === 'extensions'" class="settings-section">
          <div class="settings-section-hero">
            <div class="settings-section-hero-icon" aria-hidden="true" v-html="getSectionMeta('extensions').icon"></div>
            <div>
              <h3 class="settings-section-hero-title">{{ getSectionMeta('extensions').label }}</h3>
              <p class="settings-section-hero-desc">{{ getSectionMeta('extensions').description }}</p>
            </div>
          </div>
          <div class="settings-section-card">
          <!-- Analytics summary -->
          <div v-if="license.isLoggedIn?.value && license.hasFeature?.('usage_analytics') && extAnalytics.overview.value" class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div class="rounded-rm border border-rm-border bg-rm-surface/30 px-4 py-3">
              <span class="text-[10px] uppercase tracking-wider text-rm-muted block">Available</span>
              <span class="text-lg font-bold text-rm-text">{{ extAnalytics.totalExtensions.value ?? '—' }}</span>
            </div>
            <div class="rounded-rm border border-rm-border bg-rm-surface/30 px-4 py-3">
              <span class="text-[10px] uppercase tracking-wider text-rm-muted block">Your installs</span>
              <span class="text-lg font-bold text-rm-text">{{ extAnalytics.totalInstalls.value ?? '—' }}</span>
            </div>
            <div class="rounded-rm border border-rm-border bg-rm-surface/30 px-4 py-3">
              <span class="text-[10px] uppercase tracking-wider text-rm-muted block">Most popular</span>
              <span class="text-sm font-semibold text-rm-text truncate block">{{ extAnalytics.mostPopular.value?.name || '—' }}</span>
            </div>
            <div class="rounded-rm border border-rm-border bg-rm-surface/30 px-4 py-3">
              <span class="text-[10px] uppercase tracking-wider text-rm-muted block">Zero installs</span>
              <span class="text-lg font-bold text-rm-text">{{ extAnalytics.zeroInstalls.value ?? '—' }}</span>
            </div>
          </div>

          <!-- Toolbar -->
          <div class="flex items-center justify-between gap-3 mb-4">
            <div class="flex items-center gap-3">
              <SelectButton v-model="extFilterMode" :options="extFilterOptions" optionLabel="label" optionValue="value" :allowEmpty="false" class="ext-filter-btn" />
            </div>
            <div class="flex items-center gap-2">
              <InputText v-model="extSearchQuery" placeholder="Search extensions..." class="w-48 text-sm" />
              <Button label="Refresh" icon="pi pi-refresh" :loading="extSyncing" size="small" severity="secondary" @click="loadExtensions" />
            </div>
          </div>

          <p v-if="extRegistryError" class="text-sm text-red-500 mb-4">{{ extRegistryError }}</p>

          <div v-if="extSyncing && !extRegistryFetched" class="py-8 text-center text-rm-muted text-sm">
            <i class="pi pi-spin pi-spinner mr-1"></i> Loading extensions...
          </div>

          <div v-else-if="extFilteredRegistry.length === 0 && extRegistryFetched" class="py-6 text-center text-rm-muted text-sm">
            <template v-if="extSearchQuery">No extensions match "<strong>{{ extSearchQuery }}</strong>".</template>
            <template v-else-if="extFilterMode === 'installed'">No extensions installed yet.</template>
            <template v-else-if="extFilterMode === 'not_installed'">All available extensions are installed.</template>
            <template v-else>No extensions available yet.</template>
          </div>

          <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div
              v-for="item in extFilteredRegistry" :key="item.id"
              class="ext-card rounded-rm border px-4 py-3 flex flex-col gap-2"
              :class="item.accessible === false ? 'border-rm-border/50 opacity-70 bg-rm-surface/10' : extIsInstalled(item.slug || item.id) ? 'border-rm-accent/30 bg-rm-accent/[0.04]' : 'border-rm-border bg-rm-surface/30'"
            >
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-semibold text-rm-text text-sm">{{ item.name || item.id }}</span>
                  <Tag v-if="item.version" severity="secondary" class="text-[10px] px-1.5 py-0">v{{ item.version }}</Tag>
                  <Tag v-if="item.required_plan && item.required_plan !== 'free'" :severity="item.accessible === false ? 'warn' : 'info'" class="text-[10px] px-1.5 py-0">
                    {{ item.required_plan.charAt(0).toUpperCase() + item.required_plan.slice(1) }}
                  </Tag>
                  <span v-if="extGetInstallCount(item) != null" class="text-[10px] text-rm-muted inline-flex items-center gap-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    {{ extFormatInstallCount(extGetInstallCount(item)) }}
                  </span>
                </div>
                <p v-if="item.description" class="text-xs text-rm-muted m-0 mt-1 line-clamp-2">{{ item.description }}</p>
                <span v-if="item.author" class="text-[10px] text-rm-muted mt-0.5 block">by {{ item.author }}</span>
              </div>
              <div class="flex items-center gap-2 mt-auto pt-1 flex-wrap">
                <template v-if="extIsInstalled(item.slug || item.id) && item.accessible === false">
                  <Tag severity="warn" class="text-[10px] px-1.5 py-0">Locked</Tag>
                  <Button label="Upgrade" size="small" severity="warn" text @click="extOpenUpgrade" />
                  <Button label="Uninstall" size="small" severity="danger" text :loading="extUninstallingId === (item.slug || item.id)" :disabled="extUninstallingId != null" @click="extUninstall(item.slug || item.id)" />
                </template>
                <template v-else-if="item.accessible === false">
                  <Button :label="'Upgrade to ' + (item.required_plan === 'team' ? 'Team' : 'Pro')" icon="pi pi-lock" size="small" severity="warn" @click="extOpenUpgrade" />
                </template>
                <template v-else-if="extIsInstalled(item.slug || item.id)">
                  <label class="flex items-center gap-1.5 cursor-pointer">
                    <ToggleSwitch :modelValue="extPrefs.isEnabled(item.slug || item.id)" @update:modelValue="(v) => extPrefs.setEnabled(item.slug || item.id, v)" class="ext-switch" />
                    <span class="text-xs" :class="extPrefs.isEnabled(item.slug || item.id) ? 'text-green-500' : 'text-rm-muted'">
                      {{ extPrefs.isEnabled(item.slug || item.id) ? 'Enabled' : 'Disabled' }}
                    </span>
                  </label>
                  <Button v-if="item.version && extInstalledVersion(item.slug || item.id) && item.version !== extInstalledVersion(item.slug || item.id)" label="Update" icon="pi pi-sync" size="small" severity="secondary" :loading="extInstallingId === (item.slug || item.id)" :disabled="extInstallingId != null" @click="extInstall(item)" />
                  <Button label="Uninstall" size="small" severity="danger" text :loading="extUninstallingId === (item.slug || item.id)" :disabled="extUninstallingId != null" @click="extUninstall(item.slug || item.id)" />
                </template>
                <Button v-else label="Install" icon="pi pi-download" size="small" :loading="extInstallingId === (item.slug || item.id)" :disabled="extInstallingId != null" @click="extInstall(item)" />
              </div>
            </div>
          </div>

          <p class="text-xs text-rm-muted mt-4">Restart the app after installing or uninstalling extensions to load changes.</p>
          </div>
        </section>

        <!-- Git -->
        <section v-show="activeSection === 'git'" class="settings-section">
          <div class="settings-section-hero">
            <div class="settings-section-hero-icon" aria-hidden="true" v-html="getSectionMeta('git').icon"></div>
            <div>
              <h3 class="settings-section-hero-title">{{ getSectionMeta('git').label }}</h3>
              <p class="settings-section-hero-desc">{{ getSectionMeta('git').description }}</p>
            </div>
          </div>
          <div class="settings-section-card">

          <!-- Identity -->
          <h4 class="text-xs font-semibold text-rm-muted uppercase tracking-wider mb-3">Identity</h4>
          <div class="settings-card space-y-5 mb-6">
            <div class="settings-row">
              <span class="settings-label">User name</span>
              <p class="settings-desc">Your name for git commits (git config user.name).</p>
              <InputText v-model="gitUserName" type="text" class="max-w-sm mt-2" placeholder="Your Name" @blur="saveGitUserName" />
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Email address</span>
              <p class="settings-desc">Your email for git commits (git config user.email).</p>
              <InputText v-model="gitUserEmail" type="email" class="max-w-sm mt-2" placeholder="you@example.com" @blur="saveGitUserEmail" />
            </div>
          </div>

          <!-- Commit signing -->
          <h4 class="text-xs font-semibold text-rm-muted uppercase tracking-wider mb-3">Commit Signing</h4>
          <div class="settings-card space-y-5 mb-6">
            <label class="settings-row settings-row-clickable settings-checkbox-row">
              <div class="min-w-0">
                <span class="settings-label block text-rm-text">Sign commits</span>
                <p class="settings-desc m-0 text-sm text-rm-muted">Use git commit -S when committing.</p>
              </div>
              <Checkbox v-model="signCommits" binary @update:model-value="saveSignCommits" class="shrink-0" />
            </label>
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Signing format</span>
              <p class="settings-desc">Choose between GPG (OpenPGP) or SSH key signing.</p>
              <Select v-model="gitGpgFormat" :options="gitGpgFormatOptions" optionLabel="label" optionValue="value" class="max-w-xs mt-2" @change="saveGitGpgFormat" />
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Signing key ID</span>
              <p class="settings-desc">GPG key ID or SSH key path used to sign commits.</p>
              <div class="flex flex-wrap items-center gap-2 mt-2">
                <InputText v-model="gitGpgKeyId" type="text" class="flex-1 min-w-0 max-w-sm" placeholder="e.g. 3AA5C34371567BD2" @blur="saveGitGpgKeyId" />
                <Button v-if="gitGpgFormat === 'openpgp'" label="Detect keys" size="small" severity="secondary" :loading="gpgKeysLoading" @click="loadGpgKeys" />
              </div>
            </div>
            <div v-if="gpgKeys.length" class="pt-2 border-t border-rm-border">
              <span class="settings-label text-sm mb-2 block">Available GPG keys</span>
              <div class="space-y-2">
                <div
                  v-for="k in gpgKeys" :key="k.id"
                  class="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors"
                  :class="gitGpgKeyId === k.id ? 'bg-rm-accent/10 border border-rm-accent/30' : 'bg-rm-bg/50 border border-rm-border hover:border-rm-muted'"
                  @click="gitGpgKeyId = k.id; saveGitGpgKeyId()"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0 text-rm-muted"><path d="m21 2-2 2m-7.73 7.73A6.5 6.5 0 1 0 13.26 18H15v2h2v2h4v-4l-7.73-7.73Z"/></svg>
                  <div class="min-w-0 flex-1">
                    <span class="text-xs font-mono text-rm-text block truncate">{{ k.id }}</span>
                    <span v-if="k.uids?.length" class="text-xs text-rm-muted truncate block">{{ k.uids[0] }}</span>
                  </div>
                  <span v-if="gitGpgKeyId === k.id" class="text-xs text-rm-accent font-medium shrink-0">Selected</span>
                </div>
              </div>
            </div>
            <p v-if="gpgKeysError" class="text-xs text-rm-danger mt-1">{{ gpgKeysError }}</p>
            <div v-if="gitGpgFormat === 'openpgp'" class="pt-2 border-t border-rm-border">
              <span class="settings-label text-sm">Generate new GPG key</span>
              <p class="settings-desc">Creates an Ed25519 key using your name and email above. Expires in 2 years.</p>
              <div class="flex items-center gap-2 mt-2">
                <Button label="Generate GPG key" size="small" severity="secondary" :loading="gpgGenerating" :disabled="!gitUserName || !gitUserEmail" @click="generateGpgKey" />
              </div>
              <p v-if="gpgGenerateError" class="text-xs text-rm-danger mt-1">{{ gpgGenerateError }}</p>
            </div>
          </div>

          <!-- Repository defaults -->
          <h4 class="text-xs font-semibold text-rm-muted uppercase tracking-wider mb-3">Repository Defaults</h4>
          <div class="settings-card space-y-5 mb-6">
            <div class="settings-row">
              <span class="settings-label">Default branch name</span>
              <p class="settings-desc">Default branch to use when creating or referring to repos.</p>
              <InputText v-model="gitDefaultBranch" type="text" class="max-w-xs mt-2" placeholder="main" @blur="saveGitDefaultBranch" />
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Pull strategy</span>
              <p class="settings-desc">How to reconcile divergent branches on pull.</p>
              <Select v-model="gitPullRebase" :options="gitPullStrategyOptions" optionLabel="label" optionValue="value" class="max-w-xs mt-2" @change="saveGitPullRebase" />
            </div>
            <label class="settings-row settings-row-clickable settings-checkbox-row pt-2 border-t border-rm-border">
              <div class="min-w-0">
                <span class="settings-label block text-rm-text">Auto-stash before rebase</span>
                <p class="settings-desc m-0 text-sm text-rm-muted">Automatically stash uncommitted changes before rebasing, then pop after.</p>
              </div>
              <Checkbox v-model="gitAutoStash" binary @update:model-value="saveGitAutoStash" class="shrink-0" />
            </label>
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Auto-fetch interval</span>
              <p class="settings-desc">How often to run git fetch in the background (0 = off).</p>
              <Select v-model="gitAutoFetchIntervalMinutes" :options="gitAutoFetchIntervalOptions" optionLabel="label" optionValue="value" class="max-w-xs mt-2" @change="saveGitAutoFetchInterval" />
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Commit message template (optional)</span>
              <p class="settings-desc">Path to a file used as the default commit message template.</p>
              <InputText v-model="gitCommitTemplate" type="text" class="mt-2" placeholder="~/.gitmessage" @blur="saveGitCommitTemplate" />
            </div>
          </div>

          <!-- Tools & paths -->
          <h4 class="text-xs font-semibold text-rm-muted uppercase tracking-wider mb-3">Tools &amp; Paths</h4>
          <div class="settings-card space-y-5 mb-6">
            <div class="settings-row">
              <span class="settings-label">SSH key path (optional)</span>
              <p class="settings-desc">Path to SSH private key for Git operations. Leave empty for default.</p>
              <InputText v-model="gitSshKeyPath" type="text" class="mt-2" placeholder="~/.ssh/id_rsa" @blur="saveGitSshKeyPath" />
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Diff / merge tool (optional)</span>
              <p class="settings-desc">External diff or merge tool command (e.g. code --diff).</p>
              <InputText v-model="gitDiffTool" type="text" class="mt-2" placeholder="" @blur="saveGitDiffTool" />
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">GitHub token (default)</span>
              <p class="settings-desc">Optional. Higher API limits and ability to create or update releases. Stored locally.</p>
              <div class="settings-controls flex flex-wrap items-center gap-2 mt-2">
                <InputText v-model="githubToken" type="password" class="flex-1 min-w-0" placeholder="ghp_..." autocomplete="off" @blur="saveToken" />
                <Button variant="link" label="Create token" class="text-xs text-rm-accent p-0 min-w-0 h-auto shrink-0" @click="openUrl('https://github.com/settings/tokens')" />
              </div>
            </div>
          </div>
          </div>
        </section>

        <!-- GitHub -->
        <section v-show="activeSection === 'github'" class="settings-section">
          <div class="settings-section-hero">
            <div class="settings-section-hero-icon" aria-hidden="true" v-html="getSectionMeta('github').icon"></div>
            <div>
              <h3 class="settings-section-hero-title">{{ getSectionMeta('github').label }}</h3>
              <p class="settings-section-hero-desc">{{ getSectionMeta('github').description }}</p>
            </div>
          </div>
          <div class="settings-section-card">
          <template v-if="!license.isLoggedIn?.value">
            <div class="settings-card">
              <p class="text-sm text-rm-warning m-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1 align-[-2px]"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                Sign in to view GitHub integration status.
              </p>
            </div>
          </template>
          <template v-else>
            <!-- Connection status -->
            <div class="settings-card mb-5">
              <div class="flex items-center justify-between gap-3 flex-wrap">
                <div class="flex items-center gap-3 min-w-0">
                  <span
                    class="gh-status-dot"
                    :class="githubHealthLoading ? 'gh-status-checking' : githubHealth?.connected ? 'gh-status-connected' : 'gh-status-disconnected'"
                  />
                  <div class="min-w-0">
                    <span class="settings-label m-0 block">
                      {{ githubHealthLoading ? 'Checking…' : githubHealth?.connected ? 'Connected' : githubHealthError ? 'Error' : 'Not connected' }}
                    </span>
                    <p v-if="githubHealth?.username" class="text-sm text-rm-muted m-0 mt-0.5 flex items-center gap-1.5">
                      <img v-if="githubHealth.avatar_url" :src="githubHealth.avatar_url" alt="" class="gh-avatar-sm" referrerpolicy="no-referrer" />
                      {{ githubHealth.username }}
                    </p>
                    <p v-if="githubHealthError && !githubHealthLoading" class="text-xs text-rm-danger m-0 mt-0.5">{{ githubHealthError }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <Button size="small" severity="secondary" :loading="githubHealthLoading" @click="fetchGitHubHealth">
                    {{ githubHealthLoading ? 'Checking…' : 'Refresh' }}
                  </Button>
                  <Button size="small" severity="secondary" label="Open on web" @click="openGitHubStatusPage" />
                </div>
              </div>
            </div>

            <!-- Token status -->
            <div v-if="githubHealth" class="settings-card mb-5">
              <div class="settings-row pb-4">
                <span class="settings-label block mb-1">Token status</span>
                <p class="settings-desc m-0">OAuth token and scope information.</p>
              </div>
              <div class="space-y-3">
                <div class="flex items-center gap-2 text-sm">
                  <span class="font-medium text-rm-text">Status:</span>
                  <span
                    class="gh-token-badge"
                    :class="githubHealth.token_status === 'valid' ? 'gh-token-valid' : githubHealth.token_status === 'expired' ? 'gh-token-expired' : 'gh-token-missing'"
                  >
                    {{ githubHealth.token_status === 'valid' ? 'Valid' : githubHealth.token_status === 'expired' ? 'Expired' : 'Missing' }}
                  </span>
                </div>
                <div v-if="githubHealth.scopes?.length" class="text-sm">
                  <span class="font-medium text-rm-text block mb-1.5">Scopes:</span>
                  <div class="flex flex-wrap gap-1.5">
                    <span v-for="scope in githubHealth.scopes" :key="scope" class="gh-scope-tag">{{ scope }}</span>
                  </div>
                </div>
                <div v-if="githubHealth.token_status === 'valid' && githubHealth.has_repo_scope === false" class="gh-scope-warning">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                  <span>Missing <code>repo</code> scope — repository access may be limited.</span>
                </div>
              </div>
            </div>

            <!-- Linked repositories -->
            <div v-if="githubHealth?.projects?.length" class="settings-card">
              <div class="settings-row pb-4">
                <div class="flex items-center justify-between gap-2">
                  <div>
                    <span class="settings-label block mb-1">Linked repositories</span>
                    <p class="settings-desc m-0">Projects with a connected GitHub repository.</p>
                  </div>
                  <span v-if="githubHealth.stale_projects" class="text-xs text-rm-warning font-medium">{{ githubHealth.stale_projects }} stale</span>
                </div>
              </div>
              <table class="gh-repo-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Repository</th>
                    <th>Last sync</th>
                    <th class="gh-repo-th-health">Health</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="proj in githubHealth.projects" :key="proj.name">
                    <td class="gh-repo-name">{{ proj.name }}</td>
                    <td class="gh-repo-repo">{{ proj.github_repo || '—' }}</td>
                    <td class="gh-repo-sync">{{ proj.synced_at ? formatGitHubSyncTime(proj.synced_at) : 'Never' }}</td>
                    <td class="gh-repo-health-cell">
                      <span
                        class="gh-health-dot"
                        :class="proj.health === 'healthy' ? 'gh-health-ok' : proj.health === 'stale' ? 'gh-health-stale' : 'gh-health-never'"
                        :title="proj.health === 'healthy' ? 'Healthy' : proj.health === 'stale' ? 'Stale (>7 days)' : 'Never synced'"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-else-if="githubHealth && !githubHealth.projects?.length" class="settings-card">
              <p class="text-sm text-rm-muted m-0">No projects with linked GitHub repositories.</p>
            </div>
          </template>
          </div>
        </section>

        <!-- AI -->
        <section v-show="activeSection === 'ai'" class="settings-section">
          <div class="settings-section-hero">
            <div class="settings-section-hero-icon" aria-hidden="true" v-html="getSectionMeta('ai').icon"></div>
            <div>
              <h3 class="settings-section-hero-title">{{ getSectionMeta('ai').label }}</h3>
              <p class="settings-section-hero-desc">
                {{ getSectionMeta('ai').description }}
                <span v-if="!license.isLoggedIn?.value" class="settings-section-hero-warning"> Sign in required.</span>
              </p>
            </div>
          </div>

          <div class="settings-section-card space-y-5">
            <!-- AI Onboarding -->
            <div v-if="showAiOnboarding" class="ai-onboarding-card rounded-rm border border-rm-border bg-rm-bg-secondary/50 p-4">
              <div class="flex items-start gap-3">
                <span class="text-2xl" aria-hidden="true">🤖</span>
                <div class="flex-1 min-w-0">
                  <h4 class="font-medium text-rm-fg mb-1">Get started with AI</h4>
                  <p class="text-sm text-rm-muted mb-3">AI powers commit messages, release notes, and test suggestions. Follow these steps:</p>
                  <ol class="ai-onboarding-steps list-decimal list-inside space-y-2 text-sm text-rm-muted">
                    <li>Choose a provider below (Ollama and LM Studio run locally, no API key needed).</li>
                    <li>For local providers: enter the base URL and click <strong>List models</strong> to load options.</li>
                    <li>Select a model. For cloud providers, add your API key and pick a model.</li>
                    <li>Optionally adjust temperature and max tokens under Model parameters.</li>
                  </ol>
                  <Button severity="secondary" size="small" label="Got it" class="mt-3" @click="dismissAiOnboarding" />
                </div>
              </div>
            </div>

            <div class="settings-row">
              <span class="settings-label">Provider</span>
              <p class="settings-desc">Choose where to send prompts.</p>
              <Select v-model="aiProvider" :options="aiProviderOptions" optionLabel="label" optionValue="value" class="max-w-xs mt-2" @change="saveAiProvider" />
            </div>

            <!-- Ollama -->
            <div v-if="aiProvider === 'ollama'" class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Ollama</span>
              <p class="settings-desc m-0">Local models. No API key needed. <Button variant="link" label="Download Ollama" class="text-rm-accent p-0 min-w-0 h-auto inline" @click="openUrl('https://ollama.com')" /></p>
              <div class="grid gap-3 mt-3">
                <div>
                  <label class="block text-xs font-medium text-rm-muted mb-1">Base URL</label>
                  <InputText v-model="ollamaBaseUrl" type="text" placeholder="http://localhost:11434" autocomplete="off" @blur="saveOllama" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-rm-muted mb-1">Model</label>
                  <div class="flex flex-wrap items-center gap-2">
                    <Select
                      v-model="ollamaModel"
                      :options="ollamaModelOptions"
                      option-label="label"
                      option-value="value"
                      placeholder="Choose model"
                      class="flex-1 min-w-[12rem]"
                      :loading="ollamaListLoading"
                      :disabled="ollamaListLoading"
                      @change="saveOllama"
                    />
                    <Button severity="secondary" size="small" class="text-xs" :disabled="ollamaListLoading" @click="listOllamaModels">List models</Button>
                  </div>
                  <p v-if="ollamaListError" class="mt-1 text-xs text-rm-warning">{{ ollamaListError }}</p>
                  <p v-else-if="!ollamaModelOptions.length" class="mt-1 text-xs text-rm-muted">Click <strong>List models</strong> to load options from Ollama.</p>
                </div>
              </div>
            </div>

            <!-- LM Studio -->
            <div v-if="aiProvider === 'lmstudio'" class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">LM Studio</span>
              <p class="settings-desc m-0">Local models via OpenAI-compatible API. No API key needed. <Button variant="link" label="Download LM Studio" class="text-rm-accent p-0 min-w-0 h-auto inline" @click="openUrl('https://lmstudio.ai')" /></p>
              <div class="grid gap-3 mt-3">
                <div>
                  <label class="block text-xs font-medium text-rm-muted mb-1">Base URL</label>
                  <InputText v-model="lmStudioBaseUrl" type="text" placeholder="http://localhost:1234/v1" autocomplete="off" @blur="saveLmStudio" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-rm-muted mb-1">Model</label>
                  <div class="flex flex-wrap items-center gap-2">
                    <Select
                      v-model="lmStudioModel"
                      :options="lmStudioModelOptions"
                      option-label="label"
                      option-value="value"
                      placeholder="Choose model"
                      class="flex-1 min-w-[12rem]"
                      :loading="lmStudioListLoading"
                      :disabled="lmStudioListLoading"
                      @change="saveLmStudio"
                    />
                    <Button severity="secondary" size="small" class="text-xs" :disabled="lmStudioListLoading" @click="listLmStudioModels">List models</Button>
                  </div>
                  <p v-if="lmStudioListError" class="mt-1 text-xs text-rm-warning">{{ lmStudioListError }}</p>
                  <p v-else-if="!lmStudioModelOptions.length" class="mt-1 text-xs text-rm-muted">Click <strong>List models</strong> to load options from LM Studio.</p>
                </div>
              </div>
            </div>

            <!-- Claude -->
            <div v-if="aiProvider === 'claude'" class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Claude (Anthropic)</span>
              <p class="settings-desc m-0">Anthropic API. <Button variant="link" label="Get API key" class="text-rm-accent p-0 min-w-0 h-auto inline" @click="openUrl('https://console.anthropic.com/')" /></p>
              <div class="grid gap-3 mt-3">
                <div>
                  <label class="block text-xs font-medium text-rm-muted mb-1">API key</label>
                  <InputText v-model="claudeApiKey" type="password" placeholder="sk-ant-..." autocomplete="off" @blur="saveClaude" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-rm-muted mb-1">Model</label>
                  <Select v-model="claudeModelPreset" :options="claudeModelPresetOptions" optionLabel="label" optionValue="value" class="max-w-xs" @change="onClaudeModelPresetChange" />
                  <InputText v-if="claudeModelPreset === 'custom'" v-model="claudeModel" type="text" class="mt-2" placeholder="claude-sonnet-4-20250514" autocomplete="off" @blur="saveClaude" />
                </div>
              </div>
            </div>

            <!-- OpenAI -->
            <div v-if="aiProvider === 'openai'" class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">OpenAI</span>
              <p class="settings-desc m-0">OpenAI API. <Button variant="link" label="Get API key" class="text-rm-accent p-0 min-w-0 h-auto inline" @click="openUrl('https://platform.openai.com/api-keys')" /></p>
              <div class="grid gap-3 mt-3">
                <div>
                  <label class="block text-xs font-medium text-rm-muted mb-1">API key</label>
                  <InputText v-model="openaiApiKey" type="password" placeholder="sk-..." autocomplete="off" @blur="saveOpenAI" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-rm-muted mb-1">Model</label>
                  <Select v-model="openaiModelPreset" :options="openaiModelPresetOptions" optionLabel="label" optionValue="value" class="max-w-xs" @change="onOpenAiModelPresetChange" />
                  <InputText v-if="openaiModelPreset === 'custom'" v-model="openaiModel" type="text" class="mt-2" placeholder="gpt-4o-mini" autocomplete="off" @blur="saveOpenAI" />
                </div>
              </div>
            </div>

            <!-- Gemini -->
            <div v-if="aiProvider === 'gemini'" class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Google Gemini</span>
              <p class="settings-desc m-0">Google AI Studio. <Button variant="link" label="Get API key" class="text-rm-accent p-0 min-w-0 h-auto inline" @click="openUrl('https://aistudio.google.com/apikey')" /></p>
              <div class="grid gap-3 mt-3">
                <div>
                  <label class="block text-xs font-medium text-rm-muted mb-1">API key</label>
                  <InputText v-model="geminiApiKey" type="password" placeholder="AIza..." autocomplete="off" @blur="saveGemini" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-rm-muted mb-1">Model</label>
                  <Select v-model="geminiModelPreset" :options="geminiModelPresetOptions" optionLabel="label" optionValue="value" class="max-w-xs" @change="onGeminiModelPresetChange" />
                  <InputText v-if="geminiModelPreset === 'custom'" v-model="geminiModel" type="text" class="mt-2" placeholder="gemini-1.5-flash" autocomplete="off" @blur="saveGemini" />
                </div>
              </div>
            </div>

            <!-- Groq -->
            <div v-if="aiProvider === 'groq'" class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Groq</span>
              <p class="settings-desc m-0">Fast inference. <Button variant="link" label="Get API key" class="text-rm-accent p-0 min-w-0 h-auto inline" @click="openUrl('https://console.groq.com/keys')" /></p>
              <div class="grid gap-3 mt-3">
                <div>
                  <label class="block text-xs font-medium text-rm-muted mb-1">API key</label>
                  <InputText v-model="groqApiKey" type="password" placeholder="gsk_..." autocomplete="off" @blur="saveGroq" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-rm-muted mb-1">Model</label>
                  <Select v-model="groqModelPreset" :options="groqModelPresetOptions" optionLabel="label" optionValue="value" class="max-w-xs" @change="onGroqModelPresetChange" />
                  <InputText v-if="groqModelPreset === 'custom'" v-model="groqModel" type="text" class="mt-2" placeholder="llama-3.3-70b-versatile" autocomplete="off" @blur="saveGroq" />
                </div>
              </div>
            </div>

            <!-- Mistral -->
            <div v-if="aiProvider === 'mistral'" class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Mistral AI</span>
              <p class="settings-desc m-0">Mistral API. <Button variant="link" label="Get API key" class="text-rm-accent p-0 min-w-0 h-auto inline" @click="openUrl('https://console.mistral.ai/api-keys/')" /></p>
              <div class="grid gap-3 mt-3">
                <div>
                  <label class="block text-xs font-medium text-rm-muted mb-1">API key</label>
                  <InputText v-model="mistralApiKey" type="password" placeholder="..." autocomplete="off" @blur="saveMistral" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-rm-muted mb-1">Model</label>
                  <Select v-model="mistralModelPreset" :options="mistralModelPresetOptions" optionLabel="label" optionValue="value" class="max-w-xs" @change="onMistralModelPresetChange" />
                  <InputText v-if="mistralModelPreset === 'custom'" v-model="mistralModel" type="text" class="mt-2" placeholder="mistral-small-latest" autocomplete="off" @blur="saveMistral" />
                </div>
              </div>
            </div>

            <!-- Model parameters (all providers) -->
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Model parameters</span>
              <p class="settings-desc m-0">Adjust generation behavior. Used by Ollama and LM Studio; cloud providers may use their defaults.</p>
              <div class="flex flex-col gap-4 mt-4">
                <div class="grid gap-4 grid-cols-3">
                  <div>
                    <label class="block text-xs font-medium text-rm-muted mb-1">Temperature</label>
                    <InputNumber v-model="aiTemperature" :min="0" :max="2" :step="0.1" class="w-full" inputClass="text-sm" @blur="saveAiParams" />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-rm-muted mb-1">Max tokens</label>
                    <InputNumber v-model="aiMaxTokens" :min="256" :max="32768" :step="256" class="w-full" inputClass="text-sm" @blur="saveAiParams" />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-rm-muted mb-1">Top P</label>
                    <InputNumber v-model="aiTopP" :min="0" :max="1" :step="0.05" class="w-full" inputClass="text-sm" @blur="saveAiParams" />
                  </div>
                </div>
                <div class="grid gap-4 grid-cols-3 text-xs text-rm-muted leading-relaxed">
                  <p class="m-0">0 = deterministic, 2 = creative</p>
                  <p class="m-0">Response length limit (~4 chars/token)</p>
                  <p class="m-0">Nucleus sampling (0.9 = top 90%)</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Tools -->
        <section v-show="activeSection === 'tools'" class="settings-section">
          <div class="settings-section-hero">
            <div class="settings-section-hero-icon" aria-hidden="true" v-html="getSectionMeta('tools').icon"></div>
            <div>
              <h3 class="settings-section-hero-title">{{ getSectionMeta('tools').label }}</h3>
              <p class="settings-section-hero-desc">{{ getSectionMeta('tools').description }}</p>
            </div>
          </div>
          <div class="settings-section-card">

          <div class="settings-card space-y-5">
            <div class="settings-row">
              <span class="settings-label">Preferred editor</span>
              <p class="settings-desc">When opening a project or file from the Git section. Cursor and VS Code must be in your PATH.</p>
              <Select v-model="preferredEditor" :options="preferredEditorOptions" optionLabel="label" optionValue="value" class="max-w-xs mt-2" @change="savePreferredEditor" />
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Default terminal (macOS)</span>
              <p class="settings-desc">When opening a folder or SSH session in your system terminal. Default uses Terminal.app (macOS default).</p>
              <Select v-model="preferredTerminal" :options="preferredTerminalOptions" optionLabel="label" optionValue="value" class="max-w-xs mt-2" @change="savePreferredTerminal" />
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">PHP executable (default)</span>
              <p class="settings-desc">Used for Composer and Pest. Choose a version or enter a custom path.</p>
              <div class="mt-2 flex flex-wrap items-center gap-2">
                <Select
                  v-model="phpPath"
                  :options="phpVersionSelectOptions"
                  option-label="label"
                  option-value="value"
                  placeholder="List PHP versions to see options"
                  class="min-w-[200px]"
                  :loading="phpListLoading"
                  @change="savePhpPath"
                />
                <Button label="Refresh" severity="secondary" size="small" :loading="phpListLoading" @click="listPhpVersions" />
              </div>
              <p v-if="phpListError" class="text-sm text-red-500 mt-1 m-0">{{ phpListError }}</p>
              <div v-if="!phpPath || !phpVersionOptions.some(o => o.value === phpPath)" class="mt-2">
                <label class="block text-xs font-medium text-rm-muted mb-1">Custom path</label>
                <InputText v-model="phpPath" type="text" class="w-full max-w-md" placeholder="/opt/homebrew/opt/php/bin/php" autocomplete="off" @blur="savePhpPath" />
              </div>
            </div>
          </div>
          </div>
        </section>

        <!-- Appearance & behavior -->
        <section v-show="activeSection === 'appearance'" class="settings-section">
          <div class="settings-section-hero">
            <div class="settings-section-hero-icon" aria-hidden="true" v-html="getSectionMeta('appearance').icon"></div>
            <div>
              <h3 class="settings-section-hero-title">{{ getSectionMeta('appearance').label }}</h3>
              <p class="settings-section-hero-desc">{{ getSectionMeta('appearance').description }}</p>
            </div>
          </div>
          <div class="settings-section-card">
          <div class="settings-card space-y-5">
            <div class="settings-row">
              <span class="settings-label">Theme</span>
              <p class="settings-desc">Light, dark, or follow your system.</p>
              <div class="flex flex-wrap gap-2 mt-2">
                <Button
                  v-for="t in themeOptions"
                  :key="t.value"
                  :variant="theme === t.value ? 'outlined' : 'outlined'"
                  size="small"
                  class="appearance-option-btn px-3 py-2 rounded-rm text-sm font-medium min-w-0"
                  :class="theme === t.value ? 'border-rm-accent bg-rm-accent/15 text-rm-accent' : 'border-rm-border bg-rm-surface hover:bg-rm-surface-hover text-rm-text'"
                  @click="setTheme(t.value)"
                >
                  {{ t.label }}
                </Button>
              </div>
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Accent color</span>
              <p class="settings-desc">Buttons, links, and highlights.</p>
              <div class="flex flex-wrap gap-2 mt-2">
                <Button
                  v-for="a in accentOptions"
                  :key="a.value"
                  variant="text"
                  size="small"
                  class="accent-swatch w-9 h-9 min-w-[2.25rem] min-h-[2.25rem] p-0 rounded-full border-2 transition-all"
                  :class="accentColor === a.value ? 'border-rm-text scale-110' : 'border-transparent hover:scale-105'"
                  :style="{ backgroundColor: a.hex }"
                  :title="a.label"
                  :aria-label="`Accent ${a.label}`"
                  @click="setAccent(a.value)"
                />
              </div>
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Density</span>
              <p class="settings-desc">Base font and spacing. Tighter fits more on screen; relaxed is easier to read.</p>
              <Select v-model="fontSize" :options="fontSizeOptions" optionLabel="label" optionValue="value" class="max-w-xs mt-2" @change="saveFontSize" />
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">UI zoom</span>
              <p class="settings-desc">Scale the entire interface (Electron webContents). Useful for high-DPI or accessibility.</p>
              <Select v-model="zoomFactor" :options="zoomOptions" optionLabel="label" optionValue="value" class="max-w-xs mt-2" @change="saveZoomFactor" />
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Corner style</span>
              <p class="settings-desc">Sharp, rounded, or pill-shaped buttons and inputs.</p>
              <Select v-model="borderRadius" :options="borderRadiusOptions" optionLabel="label" optionValue="value" class="max-w-xs mt-2" @change="saveBorderRadius" />
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <label class="settings-row settings-row-clickable settings-checkbox-row">
              <div class="min-w-0">
                <span class="settings-label block text-rm-text">Reduce motion</span>
                <p class="settings-desc m-0 text-sm text-rm-muted">Minimize animations and transitions. Aligns with system accessibility preferences.</p>
              </div>
              <Checkbox v-model="reducedMotion" binary @update:model-value="saveReducedMotion" class="shrink-0" />
            </label>
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <label class="settings-row settings-row-clickable settings-checkbox-row">
              <div class="min-w-0">
                <span class="settings-label block text-rm-text">Reduce transparency</span>
                <p class="settings-desc m-0 text-sm text-rm-muted">Use solid backgrounds instead of semi-transparent panels. Improves readability (Electron / macOS-style).</p>
              </div>
              <Checkbox v-model="reduceTransparency" binary @update:model-value="saveReduceTransparency" class="shrink-0" />
            </label>
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <label class="settings-row settings-row-clickable settings-checkbox-row">
              <div class="min-w-0">
                <span class="settings-label block text-rm-text">High contrast</span>
                <p class="settings-desc m-0 text-sm text-rm-muted">Stronger borders and higher-contrast text. Helps with visibility (Electron / accessibility).</p>
              </div>
              <Checkbox v-model="highContrast" binary @update:model-value="saveHighContrast" class="shrink-0" />
            </label>
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <label class="settings-row settings-row-clickable settings-checkbox-row">
              <div class="min-w-0">
                <span class="settings-label block text-rm-text">Use tabs in project detail</span>
                <p class="settings-desc m-0 text-sm text-rm-muted">Switch between Git, Version & release, and other sections with tabs.</p>
              </div>
              <Checkbox v-model="useDetailTabs" binary @update:model-value="saveUseTabs" class="shrink-0" />
            </label>
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label block mb-1">Terminal popout</span>
              <p class="settings-desc mb-3">When you open a terminal in a separate window, these options control its size and behavior (Electron window options).</p>
              <div class="space-y-3">
                <div>
                  <label class="block text-xs font-medium text-rm-muted mb-1">Size</label>
                  <Select v-model="terminalPopoutSize" :options="terminalPopoutSizeOptions" optionLabel="label" optionValue="value" class="max-w-xs" @change="saveTerminalPopoutSize" />
                </div>
                <label class="settings-row settings-row-clickable settings-checkbox-row">
              <div class="min-w-0">
                <span class="settings-label block text-rm-text">Always on top</span>
                <p class="settings-desc m-0 text-sm text-rm-muted">Keep the terminal window above other windows.</p>
              </div>
              <Checkbox v-model="terminalPopoutAlwaysOnTop" binary @update:model-value="saveTerminalPopoutAlwaysOnTop" class="shrink-0" />
            </label>
                <label class="settings-row settings-row-clickable settings-checkbox-row">
              <div class="min-w-0">
                <span class="settings-label block text-rm-text">Allow fullscreen</span>
                <p class="settings-desc m-0 text-sm text-rm-muted">Allow the terminal window to enter fullscreen (e.g. green traffic light on macOS).</p>
              </div>
              <Checkbox v-model="terminalPopoutFullscreenable" binary @update:model-value="saveTerminalPopoutFullscreenable" class="shrink-0" />
            </label>
              </div>
            </div>
          </div>
          </div>
        </section>

        <!-- Network -->
        <section v-show="activeSection === 'network'" class="settings-section">
          <div class="settings-section-hero">
            <div class="settings-section-hero-icon" aria-hidden="true" v-html="getSectionMeta('network').icon"></div>
            <div>
              <h3 class="settings-section-hero-title">{{ getSectionMeta('network').label }}</h3>
              <p class="settings-section-hero-desc">{{ getSectionMeta('network').description }}</p>
            </div>
          </div>
          <div class="settings-section-card">
          <!-- Connectivity status -->
          <div class="settings-card mb-5">
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-2.5">
                <span class="connectivity-dot" :class="connectivityStatus === 'online' ? 'connectivity-online' : connectivityStatus === 'offline' ? 'connectivity-offline' : 'connectivity-unknown'" />
                <span class="settings-label m-0">
                  {{ connectivityStatus === 'online' ? 'Connected' : connectivityStatus === 'offline' ? 'No connection' : connectivityStatus === 'checking' ? 'Checking…' : 'Unknown' }}
                </span>
                <span v-if="connectivityStatus === 'online'" class="text-xs text-rm-success">Server reachable</span>
                <span v-else-if="connectivityStatus === 'offline'" class="text-xs text-rm-danger">Server unreachable</span>
              </div>
              <Button size="small" severity="secondary" :loading="connectivityStatus === 'checking'" @click="checkConnectivity">
                {{ connectivityStatus === 'checking' ? 'Checking…' : 'Check now' }}
              </Button>
            </div>
          </div>

          <!-- Connection settings -->
          <div class="settings-card space-y-5 mb-5">
            <div class="settings-row">
              <span class="settings-label">Proxy</span>
              <p class="settings-desc">Use system proxy or set custom (e.g. http://proxy:8080). Leave empty for system.</p>
              <InputText v-model="proxy" type="text" class="mt-2 w-full max-w-md" placeholder="System or http://host:port" @blur="saveProxy" />
            </div>
            <div class="settings-row pt-5 mt-5 border-t border-rm-border">
              <span class="settings-label">Request timeout (seconds)</span>
              <p class="settings-desc">How long to wait for HTTP requests before timing out.</p>
              <Select v-model="requestTimeoutSeconds" :options="requestTimeoutOptions" optionLabel="label" optionValue="value" class="max-w-xs mt-2" @change="saveRequestTimeout" />
            </div>
          </div>

          <!-- Offline mode -->
          <div class="settings-card space-y-5">
            <label class="settings-row settings-row-clickable settings-checkbox-row">
              <div class="min-w-0">
                <span class="settings-label block text-rm-text">Offline mode</span>
                <p class="settings-desc m-0 text-sm text-rm-muted">Use the app without a network connection. License, plan, and permissions are cached from your last successful login.</p>
              </div>
              <Checkbox v-model="offlineMode" binary @update:model-value="saveOfflineMode" class="shrink-0" />
            </label>

            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Offline grace period</span>
              <p class="settings-desc">How many days the app can run offline before requiring you to sign in again to verify your account.</p>
              <Select v-model="offlineGraceDays" :options="offlineGraceDaysOptions" optionLabel="label" optionValue="value" class="max-w-xs mt-2" @change="saveOfflineGraceDays" />
            </div>

            <div v-if="offlineLastVerifiedAt" class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Offline status</span>
              <div class="mt-2 space-y-2">
                <div class="flex items-center gap-2 text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-rm-muted shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <span class="text-rm-muted">Last verified: <strong class="text-rm-text">{{ formatTimestamp(offlineLastVerifiedAt) }}</strong></span>
                </div>
                <div v-if="offlineGraceStatus" class="flex items-center gap-2 text-sm">
                  <svg v-if="offlineGraceStatus.valid" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-rm-success shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-rm-danger shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span :class="offlineGraceStatus.valid ? 'text-rm-success' : 'text-rm-danger'">
                    {{ offlineGraceStatus.valid ? `${offlineGraceStatus.daysRemaining} day${offlineGraceStatus.daysRemaining === 1 ? '' : 's'} remaining` : 'Grace period expired — sign in required' }}
                  </span>
                </div>
              </div>
            </div>

            <div v-if="!offlineLastVerifiedAt && license.isLoggedIn?.value" class="settings-row pt-2 border-t border-rm-border">
              <p class="text-sm text-rm-muted m-0">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-rm-info inline-block mr-1 align-text-bottom" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                Your offline grace period will start the next time your account is verified online.
              </p>
            </div>
          </div>
          </div>
        </section>

        <!-- Extension settings (e.g. Email) -->
        <section
          v-for="ext in settingsExtensionSections"
          :key="ext.id"
          v-show="activeSection === ext.id"
          class="settings-section"
        >
          <div class="settings-section-hero">
            <div class="settings-section-hero-icon" aria-hidden="true" v-html="getSectionMeta(ext.id).icon"></div>
            <div>
              <h3 class="settings-section-hero-title">{{ getSectionMeta(ext.id).label }}</h3>
              <p class="settings-section-hero-desc">{{ getSectionMeta(ext.id).description }}</p>
            </div>
          </div>
          <div class="settings-section-card">
            <component :is="ext.component" />
          </div>
        </section>

        <!-- Keyboard -->
        <section v-show="activeSection === 'keyboard'" class="settings-section">
          <div class="settings-section-hero">
            <div class="settings-section-hero-icon" aria-hidden="true" v-html="getSectionMeta('keyboard').icon"></div>
            <div>
              <h3 class="settings-section-hero-title">{{ getSectionMeta('keyboard').label }}</h3>
              <p class="settings-section-hero-desc">{{ getSectionMeta('keyboard').description }}</p>
            </div>
          </div>
          <div class="settings-section-card">
          <div class="settings-card mb-5">
            <h4 class="text-xs font-semibold uppercase tracking-wider text-rm-muted mb-4">Navigation</h4>
            <table class="shortcut-table">
              <tbody>
                <tr>
                  <td class="shortcut-keys"><kbd>{{ modKey }}</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd></td>
                  <td>Command palette</td>
                </tr>
                <tr>
                  <td class="shortcut-keys"><kbd>{{ modKey }}</kbd> + <kbd>B</kbd></td>
                  <td>Toggle sidebar</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="settings-card mb-5">
            <h4 class="text-xs font-semibold uppercase tracking-wider text-rm-muted mb-4">Project detail <span class="font-normal normal-case text-rm-muted/70">(when a project is open)</span></h4>
            <table class="shortcut-table">
              <tbody>
                <tr>
                  <td class="shortcut-keys"><kbd>{{ modKey }}</kbd> + <kbd>1</kbd></td>
                  <td>Release patch</td>
                </tr>
                <tr>
                  <td class="shortcut-keys"><kbd>{{ modKey }}</kbd> + <kbd>2</kbd></td>
                  <td>Release minor</td>
                </tr>
                <tr>
                  <td class="shortcut-keys"><kbd>{{ modKey }}</kbd> + <kbd>3</kbd></td>
                  <td>Release major</td>
                </tr>
                <tr>
                  <td class="shortcut-keys"><kbd>{{ modKey }}</kbd> + <kbd>S</kbd></td>
                  <td>Sync from remote</td>
                </tr>
                <tr>
                  <td class="shortcut-keys"><kbd>{{ modKey }}</kbd> + <kbd>D</kbd></td>
                  <td>Download latest release</td>
                </tr>
                <tr>
                  <td class="shortcut-keys"><kbd>{{ modKey }}</kbd> + <kbd>K</kbd></td>
                  <td>Clear Codeseer messages <span class="font-normal normal-case text-rm-muted/70">(Codeseer tab)</span></td>
                </tr>
                <tr>
                  <td class="shortcut-keys"><kbd>{{ modKey }}</kbd> + <kbd>{{ altKey }}</kbd> + <kbd>F</kbd></td>
                  <td>Focus Git filter <span class="font-normal normal-case text-rm-muted/70">(Git tab)</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="settings-card mb-5">
            <h4 class="text-xs font-semibold uppercase tracking-wider text-rm-muted mb-4">Standard <span class="font-normal normal-case text-rm-muted/70">(Electron / OS defaults)</span></h4>
            <table class="shortcut-table">
              <tbody>
                <tr>
                  <td class="shortcut-keys"><kbd>{{ modKey }}</kbd> + <kbd>Q</kbd></td>
                  <td>Quit application</td>
                </tr>
                <tr>
                  <td class="shortcut-keys"><kbd>{{ modKey }}</kbd> + <kbd>W</kbd></td>
                  <td>Close window</td>
                </tr>
                <tr>
                  <td class="shortcut-keys"><kbd>{{ modKey }}</kbd> + <kbd>M</kbd></td>
                  <td>Minimize window</td>
                </tr>
                <tr>
                  <td class="shortcut-keys"><kbd>{{ modKey }}</kbd> + <kbd>R</kbd></td>
                  <td>Reload window</td>
                </tr>
                <tr>
                  <td class="shortcut-keys"><kbd>{{ modKey }}</kbd> + <kbd>+</kbd></td>
                  <td>Zoom in</td>
                </tr>
                <tr>
                  <td class="shortcut-keys"><kbd>{{ modKey }}</kbd> + <kbd>-</kbd></td>
                  <td>Zoom out</td>
                </tr>
                <tr>
                  <td class="shortcut-keys"><kbd>{{ modKey }}</kbd> + <kbd>0</kbd></td>
                  <td>Reset zoom</td>
                </tr>
                <tr>
                  <td class="shortcut-keys"><kbd>{{ modKey }}</kbd> + <kbd>Shift</kbd> + <kbd>I</kbd></td>
                  <td>Toggle Developer Tools</td>
                </tr>
                <tr>
                  <td class="shortcut-keys"><kbd>F11</kbd></td>
                  <td>Toggle fullscreen</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="settings-card">
            <h4 class="text-xs font-semibold uppercase tracking-wider text-rm-muted mb-4">Command palette commands</h4>
            <p class="text-sm text-rm-muted mb-3">Open the command palette with <kbd class="kbd-inline">{{ modKey }}</kbd> + <kbd class="kbd-inline">Shift</kbd> + <kbd class="kbd-inline">P</kbd>, then type to search:</p>
            <div class="flex flex-wrap gap-2">
              <span v-for="cmd in paletteCommands" :key="cmd" class="palette-cmd-badge">{{ cmd }}</span>
            </div>
          </div>
          </div>
        </section>

        <!-- Data & privacy -->
        <section v-show="activeSection === 'dataPrivacy'" class="settings-section">
          <div class="settings-section-hero">
            <div class="settings-section-hero-icon" aria-hidden="true" v-html="getSectionMeta('dataPrivacy').icon"></div>
            <div>
              <h3 class="settings-section-hero-title">{{ getSectionMeta('dataPrivacy').label }}</h3>
              <p class="settings-section-hero-desc">{{ getSectionMeta('dataPrivacy').description }}</p>
            </div>
          </div>
          <div class="settings-section-card">
          <div class="settings-card space-y-5">
            <label class="settings-row settings-row-clickable settings-checkbox-row">
              <div class="min-w-0">
                <span class="settings-label block text-rm-text">Usage data</span>
                <p class="settings-desc m-0 text-sm text-rm-muted">Send anonymous usage events (e.g. app opened, views and tabs used) to help improve the app.</p>
              </div>
              <Checkbox v-model="telemetry" binary @update:model-value="saveTelemetry" class="shrink-0" />
            </label>
            <label class="settings-row settings-row-clickable settings-checkbox-row pt-2 border-t border-rm-border">
              <div class="min-w-0">
                <span class="settings-label block text-rm-text">Crash reports</span>
                <p class="settings-desc m-0 text-sm text-rm-muted">Send crash reports to help fix bugs. Reports are sent to the same backend as your account.</p>
              </div>
              <Checkbox v-model="crashReports" binary @update:model-value="saveCrashReports" class="shrink-0" />
            </label>
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Settings backup</span>
              <p class="settings-desc">Export or import preferences. Reset restores defaults (does not remove projects).</p>
              <div class="flex flex-wrap gap-2 mt-2">
                <Button severity="secondary" size="small" @click="exportSettingsToFile">Export</Button>
                <Button severity="secondary" size="small" @click="importSettingsFromFile">Import</Button>
                <Button severity="danger" size="small" @click="confirmResetSettings">Reset</Button>
              </div>
              <Message v-if="dataPrivacyMessage" :severity="dataPrivacyMessageOk ? 'success' : 'warn'" class="mt-2 text-sm">{{ dataPrivacyMessage }}</Message>
            </div>

            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Cloud sync</span>
              <p class="settings-desc">
                Syncable preferences (theme, accent, notifications, git, AI provider, etc.) are automatically pushed to the web app when you change them and pulled when you open Settings.
              </p>
              <div class="flex flex-wrap items-center gap-2 mt-2">
                <Button severity="secondary" size="small" :loading="syncStatus === 'pushing'" :disabled="!license.isLoggedIn?.value" @click="pushSettingsToRemote">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-1"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                  Sync now
                </Button>
                <Button severity="secondary" size="small" :loading="syncStatus === 'pulling'" :disabled="!license.isLoggedIn?.value" @click="pullRemoteSettings">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-1"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Pull from web
                </Button>
                <span v-if="lastSyncedAt" class="text-xs text-rm-muted">Last synced: {{ new Date(lastSyncedAt).toLocaleString() }}</span>
                <span v-else-if="!license.isLoggedIn?.value" class="text-xs text-rm-warning">Sign in to sync settings.</span>
              </div>
              <Message v-if="syncError" severity="warn" class="mt-2 text-sm">{{ syncError }}</Message>
            </div>

            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Project sync</span>
              <p class="settings-desc">
                Push your local projects to the web dashboard so you can see them at {{ license.serverUrl?.value || 'shipwell' }}.
                Projects are also synced automatically on login and after "Sync all".
              </p>
              <div class="flex flex-wrap items-center gap-2 mt-2">
                <Button severity="secondary" size="small" :loading="projectSyncStatus === 'syncing'" :disabled="!license.isLoggedIn?.value" @click="syncProjectsToWeb">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-1"><path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 0 1 9-9"/></svg>
                  Sync projects to web
                </Button>
                <span v-if="projectSyncResult" class="text-xs" :class="projectSyncResult.ok ? 'text-rm-accent' : 'text-rm-warning'">{{ projectSyncResultText }}</span>
                <span v-else-if="!license.isLoggedIn?.value" class="text-xs text-rm-warning">Sign in to sync projects.</span>
              </div>
            </div>
          </div>

          <!-- Custom telemetry events -->
          <h4 class="text-sm font-semibold text-rm-text mt-8 mb-2">Custom events</h4>
          <p class="text-sm text-rm-muted mb-4">Define custom usage events that extensions can fire via <code class="text-xs bg-rm-surface px-1 py-0.5 rounded">window.__sendTelemetry(event, properties)</code>.</p>
          <div class="settings-card space-y-4">
            <div v-if="customTelemetryEvents.length" class="space-y-2">
              <div
                v-for="(evt, idx) in customTelemetryEvents"
                :key="idx"
                class="custom-event-row flex items-center gap-3 p-2 rounded-lg bg-rm-bg/50 border border-rm-border/50"
              >
                <div class="flex-1 min-w-0">
                  <code class="text-xs font-mono text-rm-accent break-all">{{ evt.event }}</code>
                  <p v-if="evt.description" class="text-xs text-rm-muted mt-0.5 m-0">{{ evt.description }}</p>
                </div>
                <Button severity="danger" text size="small" @click="removeCustomEvent(idx)" aria-label="Remove event">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </Button>
              </div>
            </div>
            <p v-else class="text-sm text-rm-muted italic">No custom events defined yet.</p>

            <div class="custom-event-add flex flex-col gap-2 pt-2 border-t border-rm-border">
              <div class="flex gap-2">
                <InputText v-model="newEventName" placeholder="custom.my_event" size="small" class="flex-1 font-mono text-xs" @keydown.enter="addCustomEvent" />
                <Button severity="secondary" size="small" :disabled="!newEventName?.trim()" @click="addCustomEvent">Add</Button>
              </div>
              <InputText v-model="newEventDescription" placeholder="Optional description" size="small" class="text-xs" @keydown.enter="addCustomEvent" />
            </div>

            <div class="pt-3 border-t border-rm-border">
              <p class="text-xs text-rm-muted mb-2">Build your own extension that fires custom events. Download the starter template to get started.</p>
              <div class="flex flex-wrap gap-2">
                <Button severity="secondary" size="small" @click="downloadExtensionTemplate">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Download template
                </Button>
              </div>
            </div>
          </div>
          </div>
        </section>

        <!-- Window -->
        <section v-show="activeSection === 'window'" class="settings-section">
          <div class="settings-section-hero">
            <div class="settings-section-hero-icon" aria-hidden="true" v-html="getSectionMeta('window').icon"></div>
            <div>
              <h3 class="settings-section-hero-title">{{ getSectionMeta('window').label }}</h3>
              <p class="settings-section-hero-desc">{{ getSectionMeta('window').description }}</p>
            </div>
          </div>
          <div class="settings-section-card">
          <div class="settings-card space-y-5">
            <label class="settings-row settings-row-clickable settings-checkbox-row">
              <div class="min-w-0">
                <span class="settings-label block text-rm-text">Always on top</span>
                <p class="settings-desc m-0 text-sm text-rm-muted">Keep the app window above other windows.</p>
              </div>
              <Checkbox v-model="alwaysOnTop" binary @update:model-value="saveAlwaysOnTop" class="shrink-0" />
            </label>
            <label class="settings-row settings-row-clickable settings-checkbox-row pt-2 border-t border-rm-border">
              <div class="min-w-0">
                <span class="settings-label block text-rm-text">Minimize to tray</span>
                <p class="settings-desc m-0 text-sm text-rm-muted">Closing the window hides it to the system tray instead of quitting.</p>
              </div>
              <Checkbox v-model="minimizeToTray" binary @update:model-value="saveMinimizeToTray" class="shrink-0" />
            </label>
          </div>
          </div>
        </section>

        <!-- Accessibility -->
        <section v-show="activeSection === 'accessibility'" class="settings-section">
          <div class="settings-section-hero">
            <div class="settings-section-hero-icon" aria-hidden="true" v-html="getSectionMeta('accessibility').icon"></div>
            <div>
              <h3 class="settings-section-hero-title">{{ getSectionMeta('accessibility').label }}</h3>
              <p class="settings-section-hero-desc">{{ getSectionMeta('accessibility').description }}</p>
            </div>
          </div>
          <div class="settings-section-card">
          <div class="settings-card space-y-5">
            <label class="settings-row settings-row-clickable settings-checkbox-row">
              <div class="min-w-0">
                <span class="settings-label block text-rm-text">Always show focus outline</span>
                <p class="settings-desc m-0 text-sm text-rm-muted">Show a visible focus ring on keyboard focus.</p>
              </div>
              <Checkbox v-model="focusOutlineVisible" binary @update:model-value="saveFocusOutlineVisible" class="shrink-0" />
            </label>
            <label class="settings-row settings-row-clickable settings-checkbox-row pt-2 border-t border-rm-border">
              <div class="min-w-0">
                <span class="settings-label block text-rm-text">Large cursor in inputs</span>
                <p class="settings-desc m-0 text-sm text-rm-muted">Use a larger text cursor in input fields.</p>
              </div>
              <Checkbox v-model="largeCursor" binary @update:model-value="saveLargeCursor" class="shrink-0" />
            </label>
            <label class="settings-row settings-row-clickable settings-checkbox-row pt-2 border-t border-rm-border">
              <div class="min-w-0">
                <span class="settings-label block text-rm-text">Screen reader support</span>
                <p class="settings-desc m-0 text-sm text-rm-muted">Announce live regions for assistive technologies.</p>
              </div>
              <Checkbox v-model="screenReaderSupport" binary @update:model-value="saveScreenReaderSupport" class="shrink-0" />
            </label>
          </div>
          </div>
        </section>

        <!-- Webhooks -->
        <section v-show="activeSection === 'webhooks'" class="settings-section">
          <div class="settings-section-hero">
            <div class="settings-section-hero-icon" aria-hidden="true" v-html="getSectionMeta('webhooks').icon"></div>
            <div>
              <h3 class="settings-section-hero-title">{{ getSectionMeta('webhooks').label }}</h3>
              <p class="settings-section-hero-desc">{{ getSectionMeta('webhooks').description }}</p>
            </div>
          </div>
          <div class="settings-section-card">
          <!-- Not logged in -->
          <div v-if="!license.isLoggedIn?.value" class="settings-card">
            <div class="settings-row">
              <p class="settings-desc text-rm-warning">Sign in to manage webhooks.</p>
            </div>
          </div>

          <template v-else>
            <!-- Toolbar -->
            <div class="flex items-center justify-between gap-3 mb-4">
              <Button severity="primary" size="small" label="Add webhook" @click="openWebhookDialog(null)" />
              <Button severity="secondary" size="small" icon="pi pi-refresh" :loading="whLoading" @click="loadWebhooks" v-tooltip.bottom="'Refresh'" />
            </div>

            <!-- Loading -->
            <div v-if="whLoading && !whList.length" class="settings-card">
              <div class="settings-row">
                <p class="settings-desc text-rm-muted">Loading webhooks…</p>
              </div>
            </div>

            <!-- Error -->
            <p v-if="whError" class="text-sm text-red-500 mb-3 m-0">{{ whError }}</p>

            <!-- Empty state -->
            <div v-if="!whLoading && !whList.length && !whError" class="settings-card">
              <div class="settings-row text-center py-6">
                <div class="text-rm-muted mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" class="inline-block w-10 h-10 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2"/><path d="m6 17 3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06"/><path d="m12 6 3.13 5.73C15.66 12.7 16.9 13 18 13a4 4 0 0 1 0 8H12"/></svg>
                </div>
                <p class="settings-label">No webhooks configured</p>
                <p class="settings-desc m-0 mt-1">Webhooks let you send real-time notifications to external services when events happen.</p>
              </div>
            </div>

            <!-- Webhook list -->
            <div v-for="wh in whList" :key="wh.id" class="settings-card mb-3">
              <div class="settings-row flex items-start justify-between gap-3">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="settings-label text-sm font-semibold truncate max-w-[20rem]" :title="wh.url">{{ wh.url }}</span>
                    <span
                      class="wh-status-badge text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                      :class="wh.is_active ? 'wh-status-active' : 'wh-status-inactive'"
                    >
                      {{ wh.is_active ? 'Active' : 'Inactive' }}
                    </span>
                  </div>
                  <p v-if="wh.description" class="settings-desc m-0 mt-0.5 text-xs">{{ wh.description }}</p>
                  <div class="flex items-center gap-4 mt-1.5 text-xs text-rm-muted flex-wrap">
                    <span v-if="wh.events?.length">{{ wh.events.length }} event{{ wh.events.length === 1 ? '' : 's' }}</span>
                    <span v-if="wh.last_triggered_at">Last triggered {{ formatWebhookDate(wh.last_triggered_at) }}</span>
                    <span v-if="wh.last_http_status" :class="wh.last_http_status >= 200 && wh.last_http_status < 300 ? 'text-rm-success' : 'text-red-400'">
                      HTTP {{ wh.last_http_status }}
                    </span>
                  </div>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                  <Button severity="secondary" variant="text" size="small" icon="pi pi-play" v-tooltip.bottom="'Send test ping'" :loading="whTestingId === wh.id" @click="handleTestWebhook(wh)" />
                  <Button severity="secondary" variant="text" size="small" icon="pi pi-pencil" v-tooltip.bottom="'Edit'" @click="openWebhookDialog(wh)" />
                  <Button severity="danger" variant="text" size="small" icon="pi pi-trash" v-tooltip.bottom="'Delete'" :loading="whDeletingId === wh.id" @click="handleDeleteWebhook(wh)" />
                </div>
              </div>
            </div>
          </template>

          <!-- Webhook create/edit dialog -->
          <Dialog
            v-model:visible="whDialogVisible"
            :header="whEditing ? 'Edit Webhook' : 'Add Webhook'"
            modal
            :closable="true"
            :style="{ width: '32rem' }"
            class="wh-dialog"
          >
            <div class="space-y-4">
              <div>
                <label class="settings-label block mb-1" for="wh-url">URL</label>
                <InputText id="wh-url" v-model="whForm.url" placeholder="https://example.com/webhook" class="w-full" />
              </div>
              <div>
                <label class="settings-label block mb-1" for="wh-desc">Description</label>
                <InputText id="wh-desc" v-model="whForm.description" placeholder="Optional description" class="w-full" />
              </div>
              <div>
                <label class="settings-label block mb-1" for="wh-secret">Secret</label>
                <InputText id="wh-secret" v-model="whForm.secret" placeholder="Optional signing secret" class="w-full" type="password" />
                <p class="settings-desc m-0 mt-1">Used to sign payloads so you can verify authenticity.</p>
              </div>
              <div v-if="whAvailableEvents.length">
                <span class="settings-label block mb-2">Events</span>
                <div class="wh-events-grid">
                  <label v-for="evt in whAvailableEvents" :key="evt" class="flex items-center gap-2 text-sm text-rm-text cursor-pointer py-1">
                    <Checkbox v-model="whForm.events" :value="evt" class="shrink-0" />
                    <span class="truncate">{{ evt }}</span>
                  </label>
                </div>
              </div>
              <label class="flex items-center gap-2 text-sm text-rm-text cursor-pointer">
                <Checkbox v-model="whForm.is_active" binary class="shrink-0" />
                <span>Active</span>
              </label>
              <p v-if="whFormError" class="text-sm text-red-500 m-0">{{ whFormError }}</p>
            </div>
            <template #footer>
              <div class="flex items-center justify-end gap-2">
                <Button severity="secondary" label="Cancel" @click="whDialogVisible = false" />
                <Button severity="primary" :label="whEditing ? 'Save' : 'Create'" :loading="whSaving" @click="handleSaveWebhook" />
              </div>
            </template>
          </Dialog>
          </div>
        </section>

        <section v-show="activeSection === 'developer'" class="settings-section">
          <div class="settings-section-hero">
            <div class="settings-section-hero-icon" aria-hidden="true" v-html="getSectionMeta('developer').icon"></div>
            <div>
              <h3 class="settings-section-hero-title">{{ getSectionMeta('developer').label }}</h3>
              <p class="settings-section-hero-desc">{{ getSectionMeta('developer').description }}</p>
            </div>
          </div>
          <div class="settings-section-card">
          <div class="settings-card">
            <label class="settings-row settings-row-clickable settings-checkbox-row">
              <div class="min-w-0">
                <span class="settings-label block text-rm-text">Enable debug logging</span>
                <p class="settings-desc m-0 text-sm text-rm-muted">Log app actions (project load, IPC, preferences, nav). Renderer logs in DevTools; main process in terminal.</p>
              </div>
              <Checkbox v-model="debugLogging" binary @update:model-value="saveDebugLogging" class="shrink-0" />
            </label>
          </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import Dialog from 'primevue/dialog';
import Divider from 'primevue/divider';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import ToggleSwitch from 'primevue/toggleswitch';
import Message from 'primevue/message';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import SelectButton from 'primevue/selectbutton';
import { computed, ref, watch, onMounted } from 'vue';
import { useSettings } from '../composables/useSettings';
import { useNotificationPreferences } from '../composables/useNotificationPreferences';
import { useApi } from '../composables/useApi';
import { useModals } from '../composables/useModals';
import { useExtensionPrefs } from '../composables/useExtensionPrefs';
import { useExtensionAnalytics } from '../composables/useExtensionAnalytics';
import { useNotifications } from '../composables/useNotifications';

import { useAppStore } from '../stores/app';

const modals = useModals();
const api = useApi();
const appStore = useAppStore();
const extPrefs = useExtensionPrefs();
const extAnalytics = useExtensionAnalytics();
const extNotifications = useNotifications();

const extSearchQuery = ref('');
const extFilterMode = ref('all');
const extFilterOptions = [
  { label: 'All', value: 'all' },
  { label: 'Installed', value: 'installed' },
  { label: 'Not installed', value: 'not_installed' },
];
const extInstallingId = ref(null);
const extUninstallingId = ref(null);
const extInstalledUser = ref([]);
const extSyncing = ref(false);
const extRegistryList = ref([]);
const extRegistryFetched = ref(false);
const extRegistryError = ref('');

const extMergedList = computed(() => {
  const registry = extRegistryList.value;
  const registryIds = new Set(registry.map((item) => item.slug || item.id));
  const localOnly = extInstalledUser.value
    .filter((u) => !registryIds.has(u.id))
    .map((u) => ({
      id: u.id,
      slug: u.id,
      name: u.name || u.id,
      description: u.description || '',
      version: u.version || null,
      download_url: null,
      github_repo: null,
      homepage: null,
      author: null,
      icon: null,
      required_plan: 'free',
      accessible: true,
      installed: true,
      installed_version: u.version || null,
      _localOnly: true,
    }));
  return [...registry, ...localOnly];
});

const extFilteredRegistry = computed(() => {
  let list = extMergedList.value;
  if (extFilterMode.value === 'installed') list = list.filter((item) => extIsInstalled(item.slug || item.id));
  else if (extFilterMode.value === 'not_installed') list = list.filter((item) => !extIsInstalled(item.slug || item.id));
  if (extSearchQuery.value.trim()) {
    const q = extSearchQuery.value.toLowerCase();
    list = list.filter((item) => (item.name || '').toLowerCase().includes(q) || (item.id || '').toLowerCase().includes(q) || (item.description || '').toLowerCase().includes(q));
  }
  return list;
});

function extIsInstalled(idOrSlug) { return extInstalledUser.value.some((u) => u.id === idOrSlug || u.id === String(idOrSlug)); }
function extInstalledVersion(idOrSlug) { const u = extInstalledUser.value.find((u) => u.id === idOrSlug); return u?.version || null; }
function extGetInstallCount(item) { if (item.install_count != null) return item.install_count; const counts = extAnalytics.installCounts.value; return counts[item.slug || item.id] ?? null; }
function extFormatInstallCount(n) { if (n == null) return ''; if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`; return String(n); }

async function loadExtensions() {
  if (extSyncing.value) return;
  extSyncing.value = true;
  extRegistryError.value = '';
  await extPrefs.fetchFromWeb();
  try {
    const syncResult = await window.releaseManager?.syncPlanExtensions?.();
    if (syncResult?.disabledSlugs) extPrefs.applyWebState(syncResult.disabledSlugs.map((s) => ({ slug: s, enabled: false })));
  } catch (_) {}
  extInstalledUser.value = await window.releaseManager?.getInstalledUserExtensions?.() || [];
  try {
    const result = await window.releaseManager?.getGitHubExtensionRegistry?.();
    if (!result?.ok) { extRegistryError.value = result?.error || 'Failed to load extensions'; extRegistryList.value = []; }
    else extRegistryList.value = result.data || [];
  } catch (e) { extRegistryError.value = e.message || 'Failed to load extensions'; }
  finally { extRegistryFetched.value = true; extSyncing.value = false; }
  if (license.isLoggedIn?.value && license.hasFeature?.('usage_analytics')) extAnalytics.fetchOverview();
}

function extOpenUpgrade() {
  const base = license.serverUrl?.value;
  if (base) window.releaseManager?.openUrl?.(base.replace(/\/+$/, '') + '/pricing');
}

async function extInstall(item) {
  if (item.accessible === false) { extOpenUpgrade(); return; }
  const extId = item.slug || item.id;
  extInstallingId.value = extId;
  extRegistryError.value = '';
  try {
    let result;
    if (item.github_repo) result = await window.releaseManager?.installExtensionFromGitHub?.(item);
    else if (item.download_url) result = await window.releaseManager?.installExtension?.(extId, item, item.download_url);
    else { extRegistryError.value = 'No download source'; return; }
    if (result?.ok) extInstalledUser.value = await window.releaseManager?.getInstalledUserExtensions?.() || [];
    else extRegistryError.value = result?.error || 'Install failed';
  } finally { extInstallingId.value = null; }
}

async function extUninstall(extId) {
  extUninstallingId.value = extId;
  try {
    const result = await window.releaseManager?.uninstallExtension?.(extId);
    if (result?.ok) extInstalledUser.value = await window.releaseManager?.getInstalledUserExtensions?.() || [];
    else extRegistryError.value = result?.error || 'Uninstall failed';
  } finally { extUninstallingId.value = null; }
}

function onSectionClick(id) {
  activeSection.value = id;
  if (id === 'extensions') loadExtensions();
}

  const {
  sections,
  getSectionMeta,
  activeSection,
  license,
  themeOptions,
  accentOptions,
  defaultViewOptions,
  checkForUpdatesOptions,
  autoRefreshIntervalOptions,
  projectSortOptions,
  recentListLengthOptions,
  gitAutoFetchIntervalOptions,
  aiProviderOptions,
  claudeModelPresetOptions,
  openaiModelPresetOptions,
  geminiModelPresetOptions,
  groqModelPresetOptions,
  mistralModelPresetOptions,
  preferredEditorOptions,
  preferredTerminalOptions,
  fontSizeOptions,
  zoomOptions,
  borderRadiusOptions,
  terminalPopoutSizeOptions,
  requestTimeoutOptions,
  settingsExtensionSections,
  githubToken,
  signCommits,
  aiProvider,
  ollamaBaseUrl,
  ollamaModel,
  lmStudioBaseUrl,
  lmStudioModel,
  aiTemperature,
  aiMaxTokens,
  aiTopP,
  claudeApiKey,
  claudeModel,
  claudeModelPreset,
  openaiApiKey,
  openaiModel,
  openaiModelPreset,
  geminiApiKey,
  geminiModel,
  geminiModelPreset,
  groqApiKey,
  groqModel,
  groqModelPreset,
  mistralApiKey,
  mistralModel,
  mistralModelPreset,
  preferredEditor,
  preferredTerminal,
  savePreferredTerminal,
  phpPath,
  phpVersionOptions,
  phpVersionSelectOptions,
  listPhpVersions,
  phpListLoading,
  phpListError,
  useDetailTabs,
  debugLogging,
  theme,
  accentColor,
  fontSize,
  zoomFactor,
  borderRadius,
  reducedMotion,
  reduceTransparency,
  highContrast,
  terminalPopoutSize,
  terminalPopoutAlwaysOnTop,
  terminalPopoutFullscreenable,
  launchAtLogin,
  defaultView,
  checkForUpdates,
  confirmBeforeQuit,
  notificationsEnabled,
  notificationSound,
  notificationsOnlyWhenNotFocused,
  doubleClickToOpenProject,
  confirmDestructiveActions,
  confirmBeforeDiscard,
  confirmBeforeForcePush,
  openLinksInExternalBrowser,
  projectSortOrder,
  sidebarWidthLocked,
  openProjectInNewTab,
  compactSidebar,
  showProjectPathInSidebar,
  rememberLastDetailTab,
  debugBarVisible,
  notifyOnRelease,
  notifyOnSyncComplete,
  autoRefreshIntervalSeconds,
  recentListLength,
  showTips,
  saveConfirmBeforeDiscard,
  saveConfirmBeforeForcePush,
  saveOpenLinksInExternalBrowser,
  saveProjectSortOrder,
  saveSidebarWidthLocked,
  saveOpenProjectInNewTab,
  saveCompactSidebar,
  saveShowProjectPathInSidebar,
  saveRememberLastDetailTab,
  saveDebugBarVisible,
  saveNotifyOnRelease,
  saveNotifyOnSyncComplete,
  gitDefaultBranch,
  gitAutoFetchIntervalMinutes,
  gitSshKeyPath,
  gitDiffTool,
  gitUserName,
  gitUserEmail,
  gitGpgKeyId,
  gitGpgFormat,
  gitPullRebase,
  gitAutoStash,
  gitCommitTemplate,
  gpgKeys,
  gpgKeysLoading,
  gpgKeysError,
  gpgGenerating,
  gpgGenerateError,
  gitPullStrategyOptions,
  gitGpgFormatOptions,
  proxy,
  requestTimeoutSeconds,
  offlineMode,
  offlineGraceDays,
  offlineGraceDaysOptions,
  offlineLastVerifiedAt,
  offlineGraceStatus,
  connectivityStatus,
  telemetry,
  crashReports,
  dataPrivacyMessage,
  dataPrivacyMessageOk,
  alwaysOnTop,
  minimizeToTray,
  focusOutlineVisible,
  largeCursor,
  screenReaderSupport,
  ollamaModelOptions,
  ollamaModels,
  ollamaListLoading,
  ollamaListError,
  lmStudioModelOptions,
  lmStudioModels,
  lmStudioListLoading,
  lmStudioListError,
  listLmStudioModels,
  saveLmStudio,
  saveAiParams,
  showAiOnboarding,
  dismissAiOnboarding,
  setTheme,
  setAccent,
  saveLaunchAtLogin,
  saveDefaultView,
  saveCheckForUpdates,
  saveConfirmBeforeQuit,
  saveNotificationsEnabled,
  saveNotificationSound,
  saveNotificationsOnlyWhenNotFocused,
  saveDoubleClickToOpenProject,
  saveConfirmDestructiveActions,
  saveAutoRefreshInterval,
  saveRecentListLength,
  saveShowTips,
  saveGitDefaultBranch,
  saveGitAutoFetchInterval,
  saveGitSshKeyPath,
  saveGitDiffTool,
  saveGitUserName,
  saveGitUserEmail,
  saveGitGpgKeyId,
  saveGitGpgFormat,
  saveGitPullRebase,
  saveGitAutoStash,
  saveGitCommitTemplate,
  loadGpgKeys,
  generateGpgKey,
  saveToken,
  openUrl,
  saveOllama,
  saveClaude,
  saveOpenAI,
  saveGemini,
  saveGroq,
  saveMistral,
  saveAiProvider,
  onClaudeModelPresetChange,
  onOpenAiModelPresetChange,
  onGeminiModelPresetChange,
  onGroqModelPresetChange,
  onMistralModelPresetChange,
  listOllamaModels,
  savePreferredEditor,
  savePhpPath,
  saveFontSize,
  saveZoomFactor,
  saveBorderRadius,
  saveReducedMotion,
  saveReduceTransparency,
  saveHighContrast,
  saveUseTabs,
  saveTerminalPopoutSize,
  saveTerminalPopoutAlwaysOnTop,
  saveTerminalPopoutFullscreenable,
  saveProxy,
  saveRequestTimeout,
  saveOfflineMode,
  saveOfflineGraceDays,
  checkConnectivity,
  loadOfflineGraceConfig,
  saveTelemetry,
  saveCrashReports,
  exportSettingsToFile,
  importSettingsFromFile,
  confirmResetSettings,
  saveAlwaysOnTop,
  saveMinimizeToTray,
  saveFocusOutlineVisible,
  saveLargeCursor,
  saveScreenReaderSupport,
  saveDebugLogging,
  saveSignCommits,
  licenseServerEnvironment,
  licenseServerEnvironments,
  saveLicenseServerEnvironment,
  customTelemetryEvents,
  loadCustomTelemetryEvents,
  saveCustomTelemetryEvents,
  downloadExtensionTemplate,
  syncStatus,
  lastSyncedAt,
  syncError,
  pushSettingsToRemote,
  pullRemoteSettings,
  githubHealth,
  githubHealthLoading,
  githubHealthError,
  fetchGitHubHealth,
} = useSettings();

const {
  preferences: notifPrefs,
  loading: notifPrefsLoading,
  saving: notifPrefsSaving,
  error: notifPrefsError,
  saveMessage: notifPrefsSaveMessage,
  categories: notifPrefsCategories,
  typesForCategory: notifPrefsTypesForCategory,
  fetchPreferences: fetchNotifPrefs,
  savePreferences: saveNotifPrefs,
} = useNotificationPreferences();

watch(() => license.isLoggedIn?.value, (loggedIn) => {
  if (loggedIn) fetchNotifPrefs();
}, { immediate: true });

const newEventName = ref('');
const newEventDescription = ref('');

const projectSyncStatus = ref('');
const projectSyncResult = ref(null);
const projectSyncResultText = computed(() => {
  const r = projectSyncResult.value;
  if (!r) return '';
  if (!r.ok) return r.error || 'Sync failed';
  const parts = [];
  if (r.created) parts.push(`${r.created} added`);
  if (r.updated) parts.push(`${r.updated} updated`);
  if (r.skipped) parts.push(`${r.skipped} skipped`);
  return parts.length ? parts.join(', ') : 'All projects up to date';
});

const isDeveloperPlan = computed(() => selectedPlan.value === 'developer' || license.tierLabel?.value === 'Developer');

const planOptions = [
  { label: 'Free', value: 'free' },
  { label: 'Pro', value: 'pro' },
  { label: 'Team', value: 'team' },
  { label: 'Developer', value: 'developer' },
];
const selectedPlan = ref('free');
const switchingPlan = ref(false);

watch(() => license.tier?.value, (t) => {
  if (t === 'pro' && license.tierLabel?.value === 'Developer') selectedPlan.value = 'developer';
  else if (t === 'pro' && license.tierLabel?.value === 'Team') selectedPlan.value = 'team';
  else if (t === 'pro') selectedPlan.value = 'pro';
  else selectedPlan.value = t || 'free';
}, { immediate: true });

watch(() => license.tierLabel?.value, (label) => {
  if (!label) return;
  const match = planOptions.find((o) => o.label === label);
  if (match) selectedPlan.value = match.value;
}, { immediate: true });

async function onPlanSwitch({ value }) {
  if (!value || switchingPlan.value) return;
  switchingPlan.value = true;
  try {
    const result = await api.switchPlan?.(value);
    if (result?.ok) {
      await license.loadStatus?.();
    }
  } catch (_) {}
  switchingPlan.value = false;
}

async function syncProjectsToWeb() {
  if (projectSyncStatus.value === 'syncing') return;
  projectSyncStatus.value = 'syncing';
  projectSyncResult.value = null;
  try {
    const result = await api.syncProjectsToShipwell?.();
    projectSyncResult.value = result || { ok: false, error: 'No response' };
    await api.syncReleasesToShipwell?.().catch(() => {});
  } catch (e) {
    projectSyncResult.value = { ok: false, error: e?.message || 'Sync failed' };
  }
  projectSyncStatus.value = '';
}

function addCustomEvent() {
  const name = (newEventName.value || '').trim();
  if (!name) return;
  if (customTelemetryEvents.value.some((e) => e.event === name)) return;
  customTelemetryEvents.value.push({ event: name, description: (newEventDescription.value || '').trim() });
  saveCustomTelemetryEvents();
  newEventName.value = '';
  newEventDescription.value = '';
}

function removeCustomEvent(idx) {
  customTelemetryEvents.value.splice(idx, 1);
  saveCustomTelemetryEvents();
}

const modKey = navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl';
const altKey = navigator.platform?.includes('Mac') ? '⌥' : 'Alt';

const avatarError = ref(false);
const yourInfoTapCount = ref(0);
let yourInfoTapTimer = null;
const YOUR_INFO_TAP_THRESHOLD = 7;
const YOUR_INFO_TAP_WINDOW_MS = 3000;
const showEnvSetting = ref(false);

function onYourInfoTap() {
  yourInfoTapCount.value++;
  clearTimeout(yourInfoTapTimer);
  yourInfoTapTimer = setTimeout(() => { yourInfoTapCount.value = 0; }, YOUR_INFO_TAP_WINDOW_MS);
  if (yourInfoTapCount.value >= YOUR_INFO_TAP_THRESHOLD) {
    yourInfoTapCount.value = 0;
    showEnvSetting.value = !showEnvSetting.value;
  }
}

const avatarSrc = computed(() => {
  const profile = license.profile?.value;
  if (profile?.avatar_url) return profile.avatar_url;
  const email = (license.licenseEmail?.value || '').trim().toLowerCase();
  if (email) {
    const hash = Array.from(email).reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
    const hex = Math.abs(hash).toString(16).padStart(8, '0').slice(0, 32);
    return `https://www.gravatar.com/avatar/${hex}?d=404&s=128`;
  }
  return '';
});

const userInitials = computed(() => {
  const name = license.profile?.value?.name || license.licenseEmail?.value || '';
  const parts = name.split(/[\s@.]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0]?.[0] || '?').toUpperCase();
});

watch(() => license.profile?.value?.avatar_url, () => { avatarError.value = false; });

const TIER_ICONS = {
  free: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
  pro: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  team: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
};

const PLAN_TIERS = [
  { id: 'free', name: 'Free', price: '$0', period: '', desc: 'For personal projects', icon: TIER_ICONS.free },
  { id: 'pro', name: 'Pro', price: '$9', period: '/mo', desc: 'For developers who ship regularly', popular: true, icon: TIER_ICONS.pro },
  { id: 'team', name: 'Team', price: '$29', period: '/mo', desc: 'For teams and organizations', icon: TIER_ICONS.team },
];

const FEATURE_CATEGORY_ICONS = {
  Limits: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>',
  Core: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2 1.33-2 0 0-2.77 2.24-5 5-5 1.66 0 3 1.35 3 3.02 0 1.33 2 1.33 2 0"/></svg>',
  'Pro features': '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  'Team features': '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
};

const PLAN_FEATURES = [
  { category: 'Limits', icon: FEATURE_CATEGORY_ICONS.Limits, features: [
    { label: 'Projects', free: '3', pro: '50', team: 'Unlimited' },
    { label: 'Extensions', free: '3', pro: '25', team: 'Unlimited' },
    { label: 'Team members', free: '1', pro: '1', team: '10' },
  ]},
  { category: 'Core', icon: FEATURE_CATEGORY_ICONS.Core, features: [
    { label: 'Releases & version bumps', free: true, pro: true, team: true },
    { label: 'Git integration', free: true, pro: true, team: true },
    { label: 'Dashboard overview', free: true, pro: true, team: true },
    { label: 'Notes, wiki & bookmarks', free: true, pro: true, team: true },
    { label: 'Kanban & checklists', free: true, pro: true, team: true },
    { label: 'Env file editor', free: true, pro: true, team: true },
    { label: 'Settings sync', free: false, pro: true, team: true },
  ]},
  { category: 'Pro features', icon: FEATURE_CATEGORY_ICONS['Pro features'], features: [
    { label: 'AI commit messages', free: false, pro: true, team: true },
    { label: 'AI release notes', free: false, pro: true, team: true },
    { label: 'Pull requests', free: false, pro: true, team: true },
    { label: 'GitHub issues', free: false, pro: true, team: true },
    { label: 'Terminal & processes', free: false, pro: true, team: true },
    { label: 'Runbooks & changelogs', free: false, pro: true, team: true },
    { label: 'Usage analytics', free: false, pro: true, team: true },
    { label: 'Priority support', free: false, pro: true, team: true },
  ]},
  { category: 'Team features', icon: FEATURE_CATEGORY_ICONS['Team features'], features: [
    { label: 'Team collaboration', free: false, pro: false, team: true },
    { label: 'Shared dashboard', free: false, pro: false, team: true },
    { label: 'Batch release', free: false, pro: false, team: true },
    { label: 'SSH, FTP & tunnels', free: false, pro: false, team: true },
  ]},
];

const currentPlanId = computed(() => selectedPlan.value || 'free');

function formatMemberSince(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
}

function formatTimestamp(unixSec) {
  if (!unixSec) return '—';
  const d = new Date(unixSec * 1000);
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'Today at ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday at ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatGitHubSyncTime(iso) {
  if (!iso) return 'Never';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

async function openGitHubStatusPage() {
  const config = await api.getLicenseServerConfig?.().catch(() => ({}));
  const base = (config?.url || '').replace(/\/+$/, '');
  if (base) openUrl(`${base}/github`);
}

const paletteCommands = [
  'Go to Project',
  'Go to Dashboard',
  'Go to Settings',
  'Go to Extensions',
  'Go to Documentation',
  'Go to Changelog',
  'Go to API',
  'Refresh current project',
  'Add project',
  'Sync all projects',
  'Open hidden options',
  'Open setup wizard',
];

// Redirect away from Team section when user is not on Team plan
watch(() => license.isTeam?.value, (isTeam) => {
  if (!isTeam && activeSection.value === 'team') activeSection.value = 'account';
}, { immediate: true });

// Refetch license when user opens Account so expired/invalid session immediately shows login screen
watch(activeSection, (section) => {
  if (section === 'account' && license.loadStatus) license.loadStatus();
  if (section === 'team' && license.isLoggedIn?.value && license.isTeam?.value) refreshTeamData();
  if (section === 'webhooks' && license.isLoggedIn?.value) loadWebhooks();
  if (section === 'extensions') loadExtensions();
  if (section === 'github' && license.isLoggedIn?.value && !githubHealth.value && !githubHealthLoading.value) fetchGitHubHealth();
  if (section === 'network') {
    checkConnectivity();
    loadOfflineGraceConfig();
  }
});

onMounted(async () => {
  if (!license.isLoggedIn?.value) {
    activeSection.value = 'account';
  }
  extInstalledUser.value = await window.releaseManager?.getInstalledUserExtensions?.() || [];
});

const updateCheckLoading = ref(false);
const updateCheckMessage = ref('');
const updateDownloading = ref(false);

async function checkForUpdatesNow() {
  updateCheckLoading.value = true;
  updateCheckMessage.value = '';
  appStore.clearUpdateState();
  try {
    const result = await api.checkForUpdatesNow?.();
    if (result?.updateAvailable) {
      appStore.setUpdateAvailableVersion(result.version || 'new');
      updateCheckMessage.value = `Update available (v${result.version || 'new'}). Download to install.`;
    } else if (result?.ok) {
      updateCheckMessage.value = 'You\'re up to date.';
    } else {
      updateCheckMessage.value = result?.error || 'Update server not configured.';
    }
  } catch (_) {
    updateCheckMessage.value = 'Could not check for updates.';
  } finally {
    updateCheckLoading.value = false;
  }
}

async function downloadUpdate() {
  updateDownloading.value = true;
  try {
    await api.downloadUpdate?.();
  } finally {
    updateDownloading.value = false;
  }
}

function quitAndInstall() {
  api.quitAndInstall?.();
}

function openSetupWizard() {
  modals.openModal('setupWizard');
}

async function openSubscriptionPage(path) {
  const config = await api.getLicenseServerConfig?.().catch(() => ({}));
  const base = (config?.url || '').replace(/\/+$/, '');
  if (base) openUrl(`${base}/${path}`);
}

async function signOut() {
  await api.logoutFromLicenseServer?.();
  await license.loadStatus();
}

// ── Team management ──

const teamData = ref(null);
const teamsList = ref([]);
const activeTeamId = ref(null);
const teamInvites = ref([]);
const teamError = ref('');
const teamRefreshing = ref(false);
const teamCreating = ref(false);
const teamRenaming = ref(false);
const teamLeaving = ref(false);
const inviteSending = ref(false);
const inviteSuccess = ref('');
const inviteError = ref('');
const removingMemberId = ref(null);
const cancellingInviteId = ref(null);
const newTeamName = ref('');
const renameTeamName = ref('');
const inviteEmail = ref('');
const inviteRole = ref('member');

const teamMyRole = computed(() => {
  if (teamData.value?.is_owner) return 'owner';
  if (teamData.value?.is_admin) return 'admin';
  return 'member';
});

function memberInitials(m) {
  const name = m.name || m.email || '';
  const parts = name.split(/[\s@.]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0]?.[0] || '?').toUpperCase();
}

function formatInviteDate(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
  catch { return ''; }
}

async function refreshTeamData() {
  teamRefreshing.value = true;
  teamError.value = '';
  try {
    const [teamsRes, activeId] = await Promise.all([
      api.getTeams?.().catch(() => ({ teams: [] })),
      api.getActiveTeamId?.().catch(() => null),
    ]);
    teamsList.value = teamsRes?.teams || [];
    activeTeamId.value = activeId || null;
    const currentTeam = teamsList.value.find((t) => String(t.id) === String(activeTeamId.value))
      || teamsList.value[0]
      || null;
    teamData.value = currentTeam;
    renameTeamName.value = teamData.value?.name || '';
    if (teamData.value?.is_admin) {
      const inv = await api.getTeamInvites?.();
      teamInvites.value = inv?.invites || [];
    } else {
      teamInvites.value = [];
    }
  } catch (e) {
    teamError.value = e.message || 'Failed to load team';
  } finally {
    teamRefreshing.value = false;
  }
}

async function onActiveTeamChange(teamId) {
  if (!teamId) return;
  try {
    await api.setActiveTeamId?.(teamId);
    const t = teamsList.value.find((x) => String(x.id) === String(teamId));
    teamData.value = t || teamData.value;
    renameTeamName.value = teamData.value?.name || '';
  } catch (e) {
    teamError.value = e.message || 'Failed to switch team';
  }
}

async function handleCreateTeam() {
  teamCreating.value = true;
  teamError.value = '';
  try {
    const res = await api.createTeam?.(newTeamName.value.trim());
    if (res?.ok) {
      teamData.value = res.team;
      renameTeamName.value = res.team?.name || '';
      newTeamName.value = '';
      await license.loadStatus();
    } else {
      teamError.value = res?.error || 'Failed to create team';
    }
  } catch (e) {
    teamError.value = e.message || 'Failed to create team';
  } finally {
    teamCreating.value = false;
  }
}

async function handleRenameTeam() {
  teamRenaming.value = true;
  teamError.value = '';
  try {
    const res = await api.updateTeam?.(renameTeamName.value.trim());
    if (res?.ok) {
      teamData.value = res.team;
      renameTeamName.value = res.team?.name || '';
    } else {
      teamError.value = res?.error || 'Failed to rename team';
    }
  } catch (e) {
    teamError.value = e.message || 'Failed';
  } finally {
    teamRenaming.value = false;
  }
}

async function handleInvite() {
  inviteSending.value = true;
  inviteError.value = '';
  inviteSuccess.value = '';
  try {
    const res = await api.inviteTeamMember?.(inviteEmail.value.trim(), inviteRole.value);
    if (res?.ok) {
      inviteSuccess.value = `Invite sent to ${inviteEmail.value.trim()}`;
      inviteEmail.value = '';
      inviteRole.value = 'member';
      if (res.team) teamData.value = res.team;
      const inv = await api.getTeamInvites?.();
      teamInvites.value = inv?.invites || [];
    } else {
      inviteError.value = res?.error || 'Failed to send invite';
    }
  } catch (e) {
    inviteError.value = e.message || 'Failed';
  } finally {
    inviteSending.value = false;
  }
}

async function handleCancelInvite(inv) {
  cancellingInviteId.value = inv.id;
  teamError.value = '';
  try {
    const res = await api.cancelTeamInvite?.(inv.id);
    if (res?.ok) {
      teamInvites.value = teamInvites.value.filter((i) => i.id !== inv.id);
      if (res.team) teamData.value = res.team;
    } else {
      teamError.value = res?.error || 'Failed to cancel invite';
    }
  } catch (e) {
    teamError.value = e.message || 'Failed';
  } finally {
    cancellingInviteId.value = null;
  }
}

async function handleRemoveMember(member) {
  removingMemberId.value = member.id;
  teamError.value = '';
  try {
    const res = await api.removeTeamMember?.(member.id);
    if (res?.ok) {
      if (res.team) teamData.value = res.team;
    } else {
      teamError.value = res?.error || 'Failed to remove member';
    }
  } catch (e) {
    teamError.value = e.message || 'Failed';
  } finally {
    removingMemberId.value = null;
  }
}

async function handleLeaveTeam() {
  teamLeaving.value = true;
  teamError.value = '';
  try {
    const res = await api.leaveTeam?.();
    if (res?.ok) {
      teamData.value = null;
      teamInvites.value = [];
      await license.loadStatus();
    } else {
      teamError.value = res?.error || 'Failed to leave team';
    }
  } catch (e) {
    teamError.value = e.message || 'Failed';
  } finally {
    teamLeaving.value = false;
  }
}

// ── Webhook management ──

const whList = ref([]);
const whAvailableEvents = ref([]);
const whLoading = ref(false);
const whError = ref('');
const whDialogVisible = ref(false);
const whEditing = ref(null);
const whSaving = ref(false);
const whFormError = ref('');
const whTestingId = ref(null);
const whDeletingId = ref(null);
const whForm = ref({ url: '', description: '', secret: '', events: [], is_active: true });

function formatWebhookDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now - d;
    if (diffMs < 60_000) return 'just now';
    if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
    if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch { return ''; }
}

async function loadWebhooks() {
  whLoading.value = true;
  whError.value = '';
  try {
    const res = await api.getWebhooks?.();
    if (res?.ok) {
      whList.value = Array.isArray(res.webhooks) ? res.webhooks : [];
      whAvailableEvents.value = Array.isArray(res.available_events) ? res.available_events : [];
    } else {
      whError.value = res?.error || 'Failed to load webhooks';
    }
  } catch (e) {
    whError.value = e.message || 'Failed to load webhooks';
  } finally {
    whLoading.value = false;
  }
}

function openWebhookDialog(webhook) {
  whFormError.value = '';
  if (webhook) {
    whEditing.value = webhook;
    whForm.value = {
      url: webhook.url || '',
      description: webhook.description || '',
      secret: '',
      events: Array.isArray(webhook.events) ? [...webhook.events] : [],
      is_active: webhook.is_active !== false,
    };
  } else {
    whEditing.value = null;
    whForm.value = { url: '', description: '', secret: '', events: [], is_active: true };
  }
  whDialogVisible.value = true;
}

async function handleSaveWebhook() {
  const url = (whForm.value.url || '').trim();
  if (!url) {
    whFormError.value = 'URL is required.';
    return;
  }
  whSaving.value = true;
  whFormError.value = '';
  const payload = {
    url,
    description: (whForm.value.description || '').trim(),
    events: whForm.value.events,
    is_active: !!whForm.value.is_active,
  };
  const secret = (whForm.value.secret || '').trim();
  if (secret) payload.secret = secret;

  try {
    let res;
    if (whEditing.value) {
      res = await api.updateWebhook?.(whEditing.value.id, payload);
    } else {
      res = await api.createWebhook?.(payload);
    }
    if (res?.ok) {
      whDialogVisible.value = false;
      await loadWebhooks();
    } else {
      whFormError.value = res?.error || 'Failed to save webhook';
    }
  } catch (e) {
    whFormError.value = e.message || 'Failed to save webhook';
  } finally {
    whSaving.value = false;
  }
}

async function handleDeleteWebhook(wh) {
  if (!window.confirm(`Delete webhook "${wh.url}"?`)) return;
  whDeletingId.value = wh.id;
  whError.value = '';
  try {
    const res = await api.deleteWebhook?.(wh.id);
    if (res?.ok) {
      whList.value = whList.value.filter((w) => w.id !== wh.id);
    } else {
      whError.value = res?.error || 'Failed to delete webhook';
    }
  } catch (e) {
    whError.value = e.message || 'Failed to delete webhook';
  } finally {
    whDeletingId.value = null;
  }
}

async function handleTestWebhook(wh) {
  whTestingId.value = wh.id;
  whError.value = '';
  try {
    const res = await api.testWebhook?.(wh.id);
    if (res?.ok) {
      whError.value = '';
      await loadWebhooks();
    } else {
      whError.value = res?.error || 'Test ping failed';
    }
  } catch (e) {
    whError.value = e.message || 'Test ping failed';
  } finally {
    whTestingId.value = null;
  }
}

</script>

<style scoped>
.settings-root {
  background: rgb(var(--rm-bg));
}
.settings-nav {
  width: 12rem;
}
.settings-nav-title {
  letter-spacing: 0.05em;
}
.settings-nav-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  font: inherit;
  color: rgb(var(--rm-text));
}
.settings-nav-btn:hover {
  background: rgb(var(--rm-surface-hover) / 0.6);
}
.settings-nav-btn-active,
.settings-nav-btn[aria-current="page"] {
  background: rgb(var(--rm-accent) / 0.15);
  color: rgb(var(--rm-accent));
  border-left: 3px solid rgb(var(--rm-accent));
  margin-left: -3px;
  padding-left: calc(0.75rem + 3px);
}
.settings-nav-btn:focus {
  outline: none;
}
.settings-nav-btn:focus-visible {
  box-shadow: 0 0 0 2px rgb(var(--rm-border-focus) / 0.4);
}
.settings-section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: rgb(var(--rm-text));
  letter-spacing: -0.02em;
  margin: 0 0 0.25rem 0;
}
.settings-section-desc {
  margin: 0 0 1.5rem 0;
}
.settings-section {
  animation: settings-fade 0.15s ease-out;
}
@keyframes settings-fade {
  from { opacity: 0.6; }
  to { opacity: 1; }
}
.settings-card {
  background: rgb(var(--rm-surface));
  border: 1px solid rgb(var(--rm-border));
  border-radius: 10px;
  padding: 1.25rem 1.5rem;
}
/* AI section: hero header + standout card */
.ai-settings-section {
  position: relative;
}
/* Shared section hero + card design for all settings sections */
.settings-section-hero {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, rgb(var(--rm-accent) / 0.12) 0%, rgb(var(--rm-accent) / 0.04) 50%, transparent 100%);
  border: 1px solid rgb(var(--rm-accent) / 0.25);
  border-radius: 12px;
}
.settings-section-hero-icon {
  flex-shrink: 0;
  width: 3rem;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: rgb(var(--rm-accent) / 0.2);
  color: rgb(var(--rm-accent));
}
.settings-section-hero-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: rgb(var(--rm-text));
  letter-spacing: -0.03em;
  margin: 0 0 0.25rem 0;
}
.settings-section-hero-desc {
  font-size: 0.9375rem;
  color: rgb(var(--rm-muted));
  margin: 0;
  line-height: 1.5;
}
.settings-section-hero-warning {
  color: rgb(var(--rm-warning));
}
.settings-section-card {
  position: relative;
  overflow: hidden;
  background: rgb(var(--rm-surface));
  border: 1px solid rgb(var(--rm-border) / 0.8);
  border-left: 4px solid rgb(var(--rm-accent) / 0.6);
  border-radius: 12px;
  padding: 1.5rem 1.75rem;
  box-shadow: 0 2px 8px rgb(0 0 0 / 0.08);
}
.settings-section-card::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 20% 30%, rgb(var(--rm-accent) / 0.05) 0%, transparent 45%),
    radial-gradient(circle at 85% 75%, rgb(var(--rm-accent) / 0.03) 0%, transparent 40%),
    repeating-radial-gradient(circle at 50% 50%, transparent 0, transparent 2px, rgb(var(--rm-border) / 0.04) 2px, rgb(var(--rm-border) / 0.04) 3px);
  background-size: 100% 100%, 100% 100%, 28px 28px;
  opacity: 0.7;
}
.settings-section-card > * {
  position: relative;
  z-index: 1;
}
.settings-row {
  display: block;
}
/* Checkbox rows: checkbox on the left, label + description on the right */
.settings-checkbox-row {
  display: grid !important;
  grid-template-columns: auto 1fr;
  grid-template-areas: "control text";
  align-items: center;
  column-gap: 0.75rem;
  row-gap: 0.25rem;
  padding-right: 1rem;
}
.settings-checkbox-row > .min-w-0 {
  grid-area: text;
  min-width: 0;
}
.settings-checkbox-row > *:last-child {
  grid-area: control;
  align-self: center;
}
/* Override .settings-row so checkbox + label are one line, description below (grid wins over block) */
.settings-row.settings-checkbox-inline {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  column-gap: 0.75rem;
  row-gap: 0.25rem;
}
.settings-row.settings-checkbox-inline > .checkbox-input {
  grid-column: 1;
  grid-row: 1;
  align-self: center;
}
.settings-row.settings-checkbox-inline > div {
  display: contents;
}
.settings-row.settings-checkbox-inline .settings-label {
  grid-column: 2;
  grid-row: 1;
}
.settings-row.settings-checkbox-inline .settings-desc {
  grid-column: 2;
  grid-row: 2;
  margin: 0;
}
.settings-row-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.settings-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: rgb(var(--rm-text));
}
.settings-status {
  font-size: 0.75rem;
  font-weight: 500;
}
.settings-desc {
  font-size: 0.8125rem;
  color: rgb(var(--rm-muted));
  margin: 0.25rem 0 0 0;
  line-height: 1.4;
}
.settings-desc a {
  color: inherit;
}
.settings-controls {
  margin-top: 0.5rem;
}
.settings-divider {
  height: 1px;
  background: rgb(var(--rm-border));
  margin: 1.25rem 0;
}

.settings-row-clickable:hover .settings-label {
  color: rgb(var(--rm-accent));
}
.settings-nav-icon :deep(svg) {
  stroke: currentColor;
  color: inherit;
}
.developer-title-select {
  cursor: pointer;
  user-select: none;
}
.accent-swatch {
  cursor: pointer;
  border: 2px solid transparent;
}

/* Keyboard shortcut table */
.shortcut-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
}
.shortcut-table tr {
  border-bottom: 1px solid rgb(var(--rm-border) / 0.5);
}
.shortcut-table tr:last-child {
  border-bottom: none;
}
.shortcut-table td {
  padding: 0.5rem 0;
  vertical-align: middle;
}
.shortcut-table .shortcut-keys {
  width: 14rem;
  white-space: nowrap;
  padding-right: 1.5rem;
  color: rgb(var(--rm-text));
}
.shortcut-table td:last-child {
  color: rgb(var(--rm-muted));
}
.shortcut-table kbd,
.kbd-inline {
  display: inline-block;
  min-width: 1.5em;
  padding: 0.15em 0.45em;
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.4;
  text-align: center;
  color: rgb(var(--rm-text));
  background: rgb(var(--rm-bg));
  border: 1px solid rgb(var(--rm-border));
  border-radius: 4px;
  box-shadow: 0 1px 0 rgb(var(--rm-border));
}
/* Connectivity status dot */
.connectivity-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.connectivity-online {
  background: rgb(var(--rm-success));
  box-shadow: 0 0 0 3px rgb(var(--rm-success) / 0.2);
}
.connectivity-offline {
  background: rgb(var(--rm-danger));
  box-shadow: 0 0 0 3px rgb(var(--rm-danger) / 0.2);
}
.connectivity-unknown {
  background: rgb(var(--rm-muted) / 0.4);
}

/* GitHub integration */
.gh-status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.gh-status-connected {
  background: rgb(var(--rm-success));
  box-shadow: 0 0 0 3px rgb(var(--rm-success) / 0.2);
}
.gh-status-disconnected {
  background: rgb(var(--rm-danger));
  box-shadow: 0 0 0 3px rgb(var(--rm-danger) / 0.2);
}
.gh-status-checking {
  background: rgb(var(--rm-muted) / 0.4);
  animation: gh-pulse 1s infinite alternate;
}
@keyframes gh-pulse {
  from { opacity: 0.4; }
  to { opacity: 1; }
}
.gh-avatar-sm {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid rgb(var(--rm-border));
  object-fit: cover;
}
.gh-token-badge {
  display: inline-block;
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  line-height: 1.4;
}
.gh-token-valid {
  background: rgb(var(--rm-success) / 0.12);
  color: rgb(var(--rm-success));
}
.gh-token-expired {
  background: rgb(var(--rm-warning) / 0.12);
  color: rgb(var(--rm-warning));
}
.gh-token-missing {
  background: rgb(var(--rm-danger) / 0.12);
  color: rgb(var(--rm-danger));
}
.gh-scope-tag {
  display: inline-block;
  font-size: 0.6875rem;
  font-weight: 500;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  padding: 0.125rem 0.4375rem;
  border-radius: 4px;
  background: rgb(var(--rm-bg));
  border: 1px solid rgb(var(--rm-border));
  color: rgb(var(--rm-text));
}
.gh-scope-warning {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.8125rem;
  color: rgb(var(--rm-warning));
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  background: rgb(var(--rm-warning) / 0.06);
  border: 1px solid rgb(var(--rm-warning) / 0.15);
}
.gh-scope-warning code {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0 0.25rem;
  border-radius: 3px;
  background: rgb(var(--rm-warning) / 0.1);
}
.gh-repo-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
}
.gh-repo-table thead th {
  text-align: left;
  padding: 0.375rem 0.5rem 0.375rem 0;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgb(var(--rm-muted));
  border-bottom: 1px solid rgb(var(--rm-border));
}
.gh-repo-th-health {
  width: 3rem;
  text-align: center !important;
}
.gh-repo-table tbody tr {
  border-bottom: 1px solid rgb(var(--rm-border) / 0.4);
}
.gh-repo-table tbody tr:last-child {
  border-bottom: none;
}
.gh-repo-table tbody td {
  padding: 0.5rem 0.5rem 0.5rem 0;
  vertical-align: middle;
}
.gh-repo-name {
  font-weight: 500;
  color: rgb(var(--rm-text));
  max-width: 10rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.gh-repo-repo {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.75rem;
  color: rgb(var(--rm-muted));
  max-width: 14rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.gh-repo-sync {
  font-size: 0.75rem;
  color: rgb(var(--rm-muted));
  white-space: nowrap;
}
.gh-repo-health-cell {
  text-align: center;
}
.gh-health-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.gh-health-ok {
  background: rgb(var(--rm-success));
  box-shadow: 0 0 0 2px rgb(var(--rm-success) / 0.2);
}
.gh-health-stale {
  background: rgb(var(--rm-warning));
  box-shadow: 0 0 0 2px rgb(var(--rm-warning) / 0.2);
}
.gh-health-never {
  background: rgb(var(--rm-danger));
  box-shadow: 0 0 0 2px rgb(var(--rm-danger) / 0.2);
}

/* Subscription */
.sub-info-card {
  padding: 0.875rem 1rem;
  border-radius: 8px;
  border: 1px solid rgb(var(--rm-border));
  background: rgb(var(--rm-surface) / 0.5);
  margin-bottom: 1rem;
}
.sub-info-row {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  font-size: 0.8125rem;
}
.sub-info-row + .sub-info-row { margin-top: 0.375rem; }
.sub-info-label { color: rgb(var(--rm-muted)); font-weight: 500; min-width: 5rem; }
.sub-info-value { color: rgb(var(--rm-text)); }

.sub-current-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 1rem 1.25rem;
  border-radius: 10px;
  border: 1px solid rgb(var(--rm-border));
  background: rgb(var(--rm-surface));
  margin-bottom: 1.25rem;
}
.sub-banner-pro {
  border-color: rgb(var(--rm-accent) / 0.3);
  background: rgb(var(--rm-accent) / 0.06);
}
.sub-banner-plus {
  border-color: rgba(59, 130, 246, 0.25);
  background: rgba(59, 130, 246, 0.05);
}
.sub-banner-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.sub-banner-icon {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(var(--rm-accent) / 0.12);
  color: rgb(var(--rm-accent));
  flex-shrink: 0;
}
.sub-banner-pro .sub-banner-icon { background: rgb(var(--rm-accent) / 0.15); }
.sub-banner-plus .sub-banner-icon { background: rgba(59, 130, 246, 0.12); color: rgb(96, 165, 250); }
.sub-banner-plan {
  display: block;
  font-size: 1rem;
  font-weight: 700;
  color: rgb(var(--rm-text));
  line-height: 1.2;
}
.sub-banner-label {
  display: block;
  font-size: 0.6875rem;
  color: rgb(var(--rm-muted));
  font-weight: 500;
}
.sub-banner-right {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

/* Tier cards row */
.sub-tiers-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.625rem;
  margin-bottom: 1.25rem;
}
.sub-tier {
  border: 1px solid rgb(var(--rm-border));
  border-radius: 10px;
  padding: 1rem;
  background: rgb(var(--rm-surface) / 0.4);
  position: relative;
  text-align: center;
  transition: border-color 0.15s;
}
.sub-tier:hover { border-color: rgb(var(--rm-border-focus) / 0.3); }
.sub-tier-active { border-color: rgb(var(--rm-accent) / 0.4); background: rgb(var(--rm-accent) / 0.04); }
.sub-tier-popular:not(.sub-tier-active) { border-color: rgb(var(--rm-accent) / 0.25); }
.sub-tier-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  margin: 0 auto 0.5rem;
  color: rgb(var(--rm-muted));
}
.sub-tier-active .sub-tier-icon { color: rgb(var(--rm-accent)); }
.sub-tier-tag {
  position: absolute;
  top: -0.4375rem;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.5625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.0625rem 0.5rem;
  border-radius: 9999px;
  background: rgb(var(--rm-accent));
  color: rgb(var(--rm-bg));
  white-space: nowrap;
}
.sub-tier-tag-current { background: rgb(var(--rm-accent) / 0.15); color: rgb(var(--rm-accent)); }
.sub-tier-name { font-size: 0.8125rem; font-weight: 700; color: rgb(var(--rm-text)); margin: 0; }
.sub-tier-pricing { margin: 0.25rem 0 0.125rem; line-height: 1; }
.sub-tier-price { font-size: 1.25rem; font-weight: 800; color: rgb(var(--rm-text)); font-variant-numeric: tabular-nums; }
.sub-tier-period { font-size: 0.6875rem; color: rgb(var(--rm-muted)); font-weight: 500; }
.sub-tier-desc { font-size: 0.6875rem; color: rgb(var(--rm-muted)); margin: 0; line-height: 1.3; }
.sub-tier-active-label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: rgb(var(--rm-accent));
  margin-top: 0.5rem;
}

/* Comparison table */
.sub-compare-table-wrap {
  border: 1px solid rgb(var(--rm-border));
  border-radius: 10px;
  overflow: hidden;
  background: rgb(var(--rm-surface) / 0.25);
}
.sub-compare-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.75rem;
}
.sub-compare-category-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-right: 0.375rem;
  vertical-align: -0.15em;
  color: rgb(var(--rm-muted));
}
.sub-compare-th-feature { width: 45%; }
.sub-compare-th,
.sub-compare-th-feature {
  text-align: center;
  padding: 0.625rem 0.5rem;
  font-weight: 600;
  font-size: 0.6875rem;
  color: rgb(var(--rm-muted));
  border-bottom: 1px solid rgb(var(--rm-border));
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.sub-compare-th-feature { text-align: left; padding-left: 1rem; }
.sub-compare-th-active { color: rgb(var(--rm-accent)); }
.sub-compare-category-row td { padding: 0; }
.sub-compare-category {
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgb(var(--rm-muted));
  padding: 0.625rem 1rem 0.3125rem !important;
  background: rgb(var(--rm-bg) / 0.5);
  border-bottom: 1px solid rgb(var(--rm-border) / 0.5);
}
.sub-compare-row { border-bottom: 1px solid rgb(var(--rm-border) / 0.3); }
.sub-compare-row:last-child { border-bottom: none; }
.sub-compare-label {
  padding: 0.4375rem 0.5rem 0.4375rem 1rem;
  color: rgb(var(--rm-text));
  font-weight: 400;
}
.sub-compare-cell {
  text-align: center;
  padding: 0.4375rem 0.5rem;
  vertical-align: middle;
}
.sub-compare-cell-active { background: rgb(var(--rm-accent) / 0.03); }
.sub-compare-check { color: rgb(var(--rm-accent)); display: inline-block; vertical-align: middle; }
.sub-compare-dash { color: rgb(var(--rm-muted) / 0.25); font-size: 0.875rem; }
.sub-compare-value { color: rgb(var(--rm-text)); font-weight: 600; font-variant-numeric: tabular-nums; }

/* Profile card — clean, minimal layout */
.account-profile-card {
  background: rgb(var(--rm-surface));
  border: 1px solid rgb(var(--rm-border) / 0.6);
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  margin-bottom: 1.25rem;
}
.account-profile-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.account-profile-info {
  flex: 1;
  min-width: 0;
}
.account-profile-name {
  display: block;
  font-size: 1rem;
  font-weight: 600;
  color: rgb(var(--rm-text));
  letter-spacing: -0.01em;
}
.account-profile-email {
  font-size: 0.8125rem;
  color: rgb(var(--rm-muted));
  margin: 0.25rem 0 0 0;
  line-height: 1.4;
}
.account-profile-hint {
  font-size: 0.8125rem;
  color: rgb(var(--rm-warning));
  margin: 0.25rem 0 0 0;
}
.account-signout-btn {
  flex-shrink: 0;
}
.env-setting-card {
  background: rgb(var(--rm-surface));
  border: 1px solid rgb(var(--rm-border) / 0.6);
  border-left: 3px solid rgb(var(--rm-accent) / 0.5);
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.env-setting-header {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}
.env-setting-icon {
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: rgb(var(--rm-accent) / 0.12);
  color: rgb(var(--rm-accent));
}
.env-setting-label {
  display: block;
  font-size: 0.9375rem;
  font-weight: 600;
  color: rgb(var(--rm-text));
  letter-spacing: -0.01em;
}
.env-setting-desc {
  font-size: 0.8125rem;
  color: rgb(var(--rm-muted));
  margin: 0.25rem 0 0 0;
  line-height: 1.45;
}
.env-setting-select {
  max-width: 12rem;
}
.app-settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}
.app-settings-card {
  background: rgb(var(--rm-surface));
  border: 1px solid rgb(var(--rm-border) / 0.6);
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0;
}
.app-settings-card-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgb(var(--rm-muted));
  margin: 0 0 1rem 0;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgb(var(--rm-border) / 0.5);
}
.app-settings-row {
  display: flex;
  flex-direction: column;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgb(var(--rm-border) / 0.4);
}
.app-settings-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}
.app-settings-row-clickable {
  flex-direction: row;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
}
.app-settings-label {
  font-size: 0.9375rem;
  font-weight: 600;
  color: rgb(var(--rm-text));
}
.app-settings-desc {
  font-size: 0.8125rem;
  color: rgb(var(--rm-muted));
  margin: 0.25rem 0 0 0;
  line-height: 1.45;
}
.app-settings-select {
  max-width: 100%;
}
.app-settings-hint {
  font-size: 0.8125rem;
  color: rgb(var(--rm-muted));
  margin: 0;
}
.settings-row[role="button"]:hover {
  opacity: 0.9;
}
.account-avatar-wrap {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  position: relative;
}
.account-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 1px solid rgb(var(--rm-border) / 0.5);
  object-fit: cover;
  display: block;
}
.account-avatar-initials {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 1px solid rgb(var(--rm-accent) / 0.3);
  background: rgb(var(--rm-accent) / 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgb(var(--rm-accent));
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  user-select: none;
}
.account-info-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
}
.account-info-table tr {
  border-bottom: 1px solid rgb(var(--rm-border) / 0.3);
}
.account-info-table tr:last-child {
  border-bottom: none;
}
.account-info-table td {
  padding: 0.625rem 1.25rem;
  vertical-align: middle;
}
.account-info-label {
  width: 9rem;
  color: rgb(var(--rm-muted));
  font-weight: 500;
}
.account-info-value {
  color: rgb(var(--rm-text));
}
.account-plan-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.1em 0.5em;
  font-size: 0.7rem;
  font-weight: 600;
  border-radius: 4px;
  letter-spacing: 0.02em;
}
.account-plan-badge.plan-pro {
  background: rgb(var(--rm-accent) / 0.15);
  color: rgb(var(--rm-accent));
}
.account-plan-badge.plan-plus {
  background: rgb(var(--rm-accent) / 0.1);
  color: rgb(var(--rm-accent) / 0.85);
}
.account-plan-badge.plan-free {
  background: rgb(var(--rm-surface-hover));
  color: rgb(var(--rm-muted));
}

.plan-switcher { min-width: 130px; }
.plan-switcher :deep(.p-select) { font-size: 0.75rem; height: 28px; }

.palette-cmd-badge {
  display: inline-block;
  padding: 0.2em 0.6em;
  font-size: 0.75rem;
  font-weight: 500;
  color: rgb(var(--rm-text));
  background: rgb(var(--rm-bg));
  border: 1px solid rgb(var(--rm-border));
  border-radius: 4px;
}

/* Team section */
.team-role-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.1em 0.5em;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: capitalize;
  border-radius: 4px;
  letter-spacing: 0.02em;
}
.team-role-owner {
  background: rgb(var(--rm-accent) / 0.15);
  color: rgb(var(--rm-accent));
}
.team-role-admin {
  background: rgb(var(--rm-accent) / 0.1);
  color: rgb(var(--rm-accent) / 0.85);
}
.team-role-member {
  background: rgb(var(--rm-surface-hover));
  color: rgb(var(--rm-muted));
}
.team-member-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border-top: 1px solid rgb(var(--rm-border) / 0.5);
}
.team-member-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: rgb(var(--rm-surface-hover));
}
.team-member-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.team-member-avatar-initials {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 600;
  color: rgb(var(--rm-muted));
}

/* Webhooks */
.wh-status-badge {
  letter-spacing: 0.04em;
}
.wh-status-active {
  color: rgb(var(--rm-success));
  background: rgb(var(--rm-success) / 0.12);
}
.wh-status-inactive {
  color: rgb(var(--rm-muted));
  background: rgb(var(--rm-surface-hover) / 0.5);
}
.wh-events-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
  gap: 0;
  max-height: 14rem;
  overflow-y: auto;
  padding: 0.25rem 0;
}
.wh-dialog :deep(.p-dialog-content) {
  padding-top: 0.75rem;
}
.ext-card {
  transition: border-color 0.15s ease;
}
.ext-card:hover {
  border-color: var(--rm-accent, var(--p-primary-400));
}
.ext-filter-btn :deep(.p-selectbutton) {
  gap: 0;
}
.ext-filter-btn :deep(.p-togglebutton) {
  font-size: 0.7rem;
  padding: 0.25rem 0.5rem;
}
.ext-switch :deep(.p-toggleswitch) {
  width: 2rem;
  height: 1rem;
}
.ext-switch :deep(.p-toggleswitch-slider:before) {
  width: 0.75rem;
  height: 0.75rem;
}
</style>
