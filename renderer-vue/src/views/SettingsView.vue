<template>
  <div class="flex flex-1 min-h-0 bg-rm-bg">
    <nav class="shrink-0 flex flex-col w-48 border-r border-rm-border bg-rm-bg/50" aria-label="Settings sections">
      <div class="py-4 pr-2 pl-4">
        <h2 class="text-xs font-semibold text-rm-muted uppercase tracking-[0.05em] px-3 mb-3">Settings</h2>
        <ul class="list-none m-0 p-0 space-y-0.5">
          <li v-for="(s, idx) in sections" :key="s?.id ?? idx">
            <Button
              variant="text"
              size="small"
              class="settings-nav-btn w-full justify-start px-3 py-2.5 rounded-rm text-sm font-medium min-w-0 border-none bg-transparent text-rm-text hover:bg-rm-surface-hover/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-rm-border-focus/40 border-l-[3px] border-transparent -ml-[3px] pl-[calc(0.75rem+3px)]"
              :class="[activeSection === s.id ? 'bg-rm-accent/15 text-rm-accent border-l-rm-accent settings-nav-btn-active' : '']"
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
    <div class="flex-1 overflow-auto min-w-0 flex flex-col">
      <div class="py-8 px-8 max-w-2xl flex-1 min-h-full bg-rm-bg">
        <!-- Account -->
        <SettingsSectionAccount />

        <!-- Subscription -->
        <section v-show="activeSection === 'subscription'" class="settings-section">
          <div class="flex items-start gap-4 p-5 mb-4 rounded-xl border border-rm-accent/25 bg-gradient-to-br from-rm-accent/12 via-rm-accent/[0.04] to-transparent">
            <div class="shrink-0 w-12 h-12 flex items-center justify-center rounded-[10px] bg-rm-accent/20 text-rm-accent" aria-hidden="true" v-html="getSectionMeta('subscription').icon"></div>
            <div>
              <h3 class="text-2xl font-bold text-rm-text tracking-[-0.03em] m-0 mb-1">{{ getSectionMeta('subscription').label }}</h3>
              <p class="text-[0.9375rem] text-rm-muted m-0 leading-normal">{{ getSectionMeta('subscription').description }}</p>
            </div>
          </div>
          <div class="settings-section-card">
          <!-- Plan info (when logged in) -->
          <div v-if="license.isLoggedIn?.value" class="py-3.5 px-4 rounded-lg border border-rm-border bg-rm-surface/50 mb-4">
            <div class="flex items-baseline gap-2 text-[0.8125rem]">
              <span class="text-rm-muted font-medium min-w-[5rem]">Plan limits</span>
              <span class="text-rm-text">
                {{ license.maxProjects?.value === -1 ? 'Unlimited' : license.maxProjects?.value }} projects
                ·
                {{ license.maxExtensions?.value === -1 ? 'Unlimited' : license.maxExtensions?.value }} extensions
              </span>
            </div>
            <div v-if="license.team?.value" class="flex items-baseline gap-2 text-[0.8125rem] mt-1.5">
              <span class="text-rm-muted font-medium min-w-[5rem]">Team</span>
              <span class="text-rm-text">{{ license.team?.value?.name || '—' }} ({{ license.team?.value?.member_count ?? license.team?.value?.members?.length ?? 0 }} members)</span>
            </div>
          </div>

          <!-- Current plan banner -->
          <div class="flex items-center justify-between gap-4 flex-wrap p-4 px-5 rounded-[10px] border border-rm-border bg-rm-surface mb-5" :class="license.isPro?.value ? 'border-rm-accent/30 bg-rm-accent/6' : license.isPlus?.value ? 'border-blue-500/25 bg-blue-500/5' : ''">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" :class="license.isPro?.value ? 'bg-rm-accent/15 text-rm-accent' : license.isPlus?.value ? 'bg-blue-500/12 text-blue-400' : 'bg-rm-accent/12 text-rm-accent'">
                <svg v-if="license.isPro?.value" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                <svg v-else-if="license.isPlus?.value" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4"/><path d="m4.9 4.9 2.8 2.8"/><path d="M2 12h4"/><path d="m4.9 19.1 2.8-2.8"/><path d="M12 18v4"/><path d="m19.1 19.1-2.8-2.8"/><path d="M22 12h-4"/><path d="m19.1 4.9-2.8 2.8"/><circle cx="12" cy="12" r="4"/></svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
              </div>
              <div>
                <span class="block text-base font-bold text-rm-text leading-tight">{{ license.tierLabel?.value || 'Free' }}</span>
                <span class="block text-[0.6875rem] text-rm-muted font-medium">Current plan</span>
              </div>
            </div>
            <div class="flex gap-2 shrink-0">
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
          <div class="grid grid-cols-3 gap-2.5 mb-5">
            <div v-for="tier in PLAN_TIERS" :key="tier.id" class="border border-rm-border rounded-[10px] p-4 bg-rm-surface/40 relative text-center transition-[border-color] duration-150 hover:border-rm-border-focus/30" :class="currentPlanId === tier.id ? 'border-rm-accent/40 bg-rm-accent/4' : tier.popular ? 'border-rm-accent/25' : ''">
              <div v-if="tier.popular && currentPlanId !== tier.id" class="absolute -top-[0.4375rem] left-1/2 -translate-x-1/2 text-[0.5625rem] font-bold uppercase tracking-wider py-px px-2 rounded-full bg-rm-accent text-rm-bg whitespace-nowrap">Popular</div>
              <div v-else-if="currentPlanId === tier.id" class="absolute -top-[0.4375rem] left-1/2 -translate-x-1/2 text-[0.5625rem] font-bold uppercase tracking-wider py-px px-2 rounded-full bg-rm-accent/15 text-rm-accent whitespace-nowrap">Current</div>
              <div v-if="tier.icon" class="flex items-center justify-center w-8 h-8 mx-auto mb-2 text-rm-muted" :class="currentPlanId === tier.id ? 'text-rm-accent' : ''" aria-hidden="true" v-html="tier.icon"></div>
              <h4 class="text-[0.8125rem] font-bold text-rm-text m-0">{{ tier.name }}</h4>
              <div class="mt-1 mb-0.5 leading-none">
                <span class="text-xl font-extrabold text-rm-text tabular-nums">{{ tier.price }}</span>
                <span v-if="tier.period" class="text-[0.6875rem] text-rm-muted font-medium">{{ tier.period }}</span>
              </div>
              <p class="text-[0.6875rem] text-rm-muted m-0 leading-snug">{{ tier.desc }}</p>
              <Button
                v-if="currentPlanId !== tier.id && tier.id !== 'free'"
                :label="tier.id === 'pro' ? 'Upgrade' : 'Go Team'"
                :severity="tier.popular ? 'primary' : 'secondary'"
                size="small"
                class="w-full mt-2"
                @click="openSubscriptionPage('pricing')"
                :disabled="!license.isLoggedIn?.value"
              />
              <div v-else-if="currentPlanId === tier.id" class="flex items-center justify-center gap-1 text-[0.6875rem] font-semibold text-rm-accent mt-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                Active
              </div>
            </div>
          </div>

          <!-- Feature comparison table -->
          <div class="border border-rm-border rounded-[10px] overflow-hidden bg-rm-surface/25">
            <table class="w-full border-collapse text-[0.75rem]">
              <thead>
                <tr>
                  <th class="w-[45%] text-center py-2.5 px-2 text-[0.6875rem] font-semibold text-rm-muted border-b border-rm-border uppercase tracking-wider text-left pl-4"></th>
                  <th v-for="tier in PLAN_TIERS" :key="tier.id" class="text-center py-2.5 px-2 text-[0.6875rem] font-semibold text-rm-muted border-b border-rm-border uppercase tracking-wider" :class="currentPlanId === tier.id ? 'text-rm-accent' : ''">{{ tier.name }}</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="group in PLAN_FEATURES" :key="group.category">
                  <tr>
                    <td :colspan="PLAN_TIERS.length + 1" class="p-0 text-[0.625rem] font-bold uppercase tracking-wider text-rm-muted py-2.5 px-4 pt-2.5 pb-1.5 bg-rm-bg/50 border-b border-rm-border/50">
                      <span v-if="group.icon" class="inline-flex items-center justify-center mr-1.5 align-[-0.15em] text-rm-muted" aria-hidden="true" v-html="group.icon"></span>
                      {{ group.category }}
                    </td>
                  </tr>
                  <tr v-for="feat in group.features" :key="feat.label" class="border-b border-rm-border/30 last:border-b-0">
                    <td class="py-[0.4375rem] px-2 py-[0.4375rem] pl-4 text-rm-text font-normal">{{ feat.label }}</td>
                    <td v-for="tier in PLAN_TIERS" :key="tier.id" class="text-center py-[0.4375rem] px-2 align-middle" :class="currentPlanId === tier.id ? 'bg-rm-accent/3' : ''">
                      <template v-if="feat[tier.id] === true">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="inline-block align-middle text-rm-accent"><polyline points="20 6 9 17 4 12"/></svg>
                      </template>
                      <template v-else-if="feat[tier.id] === false">
                        <span class="text-rm-muted/25 text-sm">—</span>
                      </template>
                      <template v-else>
                        <span class="text-rm-text font-semibold tabular-nums">{{ feat[tier.id] }}</span>
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
          <div class="flex items-start gap-4 p-5 mb-4 rounded-xl border border-rm-accent/25 bg-gradient-to-br from-rm-accent/12 via-rm-accent/[0.04] to-transparent">
            <div class="shrink-0 w-12 h-12 flex items-center justify-center rounded-[10px] bg-rm-accent/20 text-rm-accent" aria-hidden="true" v-html="getSectionMeta('team').icon"></div>
            <div>
              <h3 class="text-2xl font-bold text-rm-text tracking-[-0.03em] m-0 mb-1">{{ getSectionMeta('team').label }}</h3>
              <p class="text-[0.9375rem] text-rm-muted m-0 leading-normal">{{ getSectionMeta('team').description }}</p>
            </div>
          </div>
          <div class="settings-section-card">
          <!-- Not logged in -->
          <div v-if="!license.isLoggedIn?.value" class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6">
            <div class="block">
              <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] text-rm-warning">Sign in to manage your team.</p>
            </div>
          </div>

          <!-- No team yet — create one -->
          <div v-else-if="!teamData" class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 space-y-5">
            <div class="block">
              <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] mb-4">You're not part of a team yet. Create one to invite members and collaborate on projects.</p>
              <div class="flex items-end gap-3">
                <div class="flex-1 max-w-xs">
                  <label class="text-[0.8125rem] font-semibold text-rm-text block mb-1" for="create-team-name">Team name</label>
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
            <div v-if="teamsList.length > 1" class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 mb-5">
              <label class="text-[0.8125rem] font-semibold text-rm-text block mb-2">Active team</label>
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
            <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 space-y-5 mb-5">
              <div class="block flex items-center justify-between gap-4 flex-wrap">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-[0.8125rem] font-semibold text-rm-text text-base font-semibold">{{ teamData.name }}</span>
                    <span class="inline-flex items-center py-0.5 px-2 text-[0.7rem] font-semibold capitalize rounded tracking-wide" :class="teamMyRole === 'owner' ? 'bg-rm-accent/15 text-rm-accent' : teamMyRole === 'admin' ? 'bg-rm-accent/10 text-rm-accent/85' : 'bg-rm-surface-hover text-rm-muted'">{{ teamMyRole }}</span>
                  </div>
                  <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 mt-1">
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
              <div v-if="teamData.is_admin" class="block pt-3 border-t border-rm-border">
                <label class="text-[0.8125rem] font-semibold text-rm-text block mb-1" for="rename-team">Rename team</label>
                <div class="flex items-center gap-2">
                  <InputText id="rename-team" v-model="renameTeamName" class="flex-1 max-w-xs" placeholder="Team name" />
                  <Button severity="secondary" size="small" label="Save" :loading="teamRenaming" :disabled="!renameTeamName.trim() || renameTeamName.trim() === teamData.name" @click="handleRenameTeam" />
                </div>
              </div>
            </div>

            <!-- Members -->
            <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 space-y-0 mb-5">
              <div class="block flex items-center justify-between gap-3">
                <span class="text-[0.8125rem] font-semibold text-rm-text">Members</span>
              </div>
              <div v-for="member in teamData.members" :key="member.id" class="flex items-center justify-between gap-2 py-2.5 px-5 border-t border-rm-border/50">
                <div class="flex items-center gap-3 min-w-0 flex-1">
                  <div class="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-rm-surface-hover">
                    <img v-if="member.avatar_url" :src="member.avatar_url" alt="" referrerpolicy="no-referrer" class="w-full h-full object-cover" />
                    <span v-else class="w-full h-full flex items-center justify-center text-[0.7rem] font-semibold text-rm-muted">{{ memberInitials(member) }}</span>
                  </div>
                  <div class="min-w-0 flex-1">
                    <span class="text-sm font-medium text-rm-text block truncate">{{ member.name || member.email }}</span>
                    <span class="text-xs text-rm-muted block truncate">{{ member.email }}</span>
                  </div>
                  <span class="inline-flex items-center py-0.5 px-2 text-[10px] font-semibold capitalize rounded tracking-wide" :class="member.role === 'owner' ? 'bg-rm-accent/15 text-rm-accent' : member.role === 'admin' ? 'bg-rm-accent/10 text-rm-accent/85' : 'bg-rm-surface-hover text-rm-muted'">{{ member.role }}</span>
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
              <div v-if="!teamData.is_owner" class="block pt-3 border-t border-rm-border">
                <Button severity="danger" variant="text" size="small" label="Leave team" :loading="teamLeaving" @click="handleLeaveTeam" />
              </div>
            </div>

            <!-- Invite (admin only) -->
            <div v-if="teamData.is_admin" class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 space-y-4 mb-5">
              <div class="block">
                <span class="text-[0.8125rem] font-semibold text-rm-text block mb-1">Invite a member</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 mb-3">They'll receive an invite they can accept from the web app.</p>
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
              <div v-if="teamInvites.length" class="block pt-3 border-t border-rm-border">
                <span class="text-[0.8125rem] font-semibold text-rm-text block mb-2">Pending invites</span>
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
          <div class="flex items-start gap-4 p-5 mb-4 rounded-xl border border-rm-accent/25 bg-gradient-to-br from-rm-accent/12 via-rm-accent/[0.04] to-transparent">
            <div class="shrink-0 w-12 h-12 flex items-center justify-center rounded-[10px] bg-rm-accent/20 text-rm-accent" aria-hidden="true" v-html="getSectionMeta('application').icon"></div>
            <div>
              <h3 class="text-2xl font-bold text-rm-text tracking-[-0.03em] m-0 mb-1">{{ getSectionMeta('application').label }}</h3>
              <p class="text-[0.9375rem] text-rm-muted m-0 leading-normal">{{ getSectionMeta('application').description }}</p>
            </div>
          </div>
          <div class="settings-section-card">
          <div class="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
            <!-- Startup -->
            <div class="bg-rm-surface border border-rm-border/60 rounded-xl p-5 px-6 flex flex-col gap-0">
              <h4 class="text-xs font-semibold uppercase tracking-wider text-rm-muted m-0 mb-4 pb-3 border-b border-rm-border/50">Startup</h4>
              <label class="flex flex-col py-3 border-b border-rm-border/40 last:border-b-0 last:pb-0 flex-row items-center gap-4 cursor-pointer">
                <div class="min-w-0 flex-1">
                  <span class="text-[0.9375rem] font-semibold text-rm-text">Launch at login</span>
                  <p class="text-[0.8125rem] text-rm-muted mt-1 m-0 leading-[1.45]">Start the app when you log in to your computer.</p>
                </div>
                <Checkbox v-model="launchAtLogin" binary @update:model-value="saveLaunchAtLogin" class="shrink-0" />
              </label>
              <div class="flex flex-col py-3 border-b border-rm-border/40 last:border-b-0 last:pb-0">
                <span class="text-[0.9375rem] font-semibold text-rm-text">Open to</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 m-0 leading-[1.45]">Default view when the app starts.</p>
                <Select v-model="defaultView" :options="defaultViewOptions" optionLabel="label" optionValue="value" class="max-w-full mt-2" @change="saveDefaultView" />
              </div>
            </div>

            <!-- Updates -->
            <div class="bg-rm-surface border border-rm-border/60 rounded-xl p-5 px-6 flex flex-col gap-0">
              <h4 class="text-xs font-semibold uppercase tracking-wider text-rm-muted m-0 mb-4 pb-3 border-b border-rm-border/50">Updates</h4>
              <div class="flex flex-col py-3 border-b border-rm-border/40 last:border-b-0 last:pb-0">
                <span class="text-[0.9375rem] font-semibold text-rm-text">Check for updates</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 m-0 leading-[1.45]">When to look for new versions.</p>
                <div class="flex flex-wrap items-center gap-2 mt-2">
                  <Select v-model="checkForUpdates" :options="checkForUpdatesOptions" optionLabel="label" optionValue="value" class="min-w-[10rem] max-w-full" @change="saveCheckForUpdates" />
                  <Button label="Check now" size="small" severity="secondary" :loading="updateCheckLoading" :disabled="updateCheckLoading" @click="checkForUpdatesNow" />
                </div>
                <p v-if="updateCheckMessage" class="text-[0.8125rem] text-rm-muted m-0 mt-2">{{ updateCheckMessage }}</p>
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
            <div class="bg-rm-surface border border-rm-border/60 rounded-xl p-5 px-6 flex flex-col gap-0">
              <h4 class="text-xs font-semibold uppercase tracking-wider text-rm-muted m-0 mb-4 pb-3 border-b border-rm-border/50">Quit & setup</h4>
              <label class="flex flex-col py-3 border-b border-rm-border/40 last:border-b-0 last:pb-0 flex-row items-center gap-4 cursor-pointer">
                <div class="min-w-0 flex-1">
                  <span class="text-[0.9375rem] font-semibold text-rm-text">Confirm before closing</span>
                  <p class="text-[0.8125rem] text-rm-muted mt-1 m-0 leading-[1.45]">Ask for confirmation when quitting the app.</p>
                </div>
                <Checkbox v-model="confirmBeforeQuit" binary @update:model-value="saveConfirmBeforeQuit" class="shrink-0" />
              </label>
              <div class="flex flex-col py-3 border-b border-rm-border/40 last:border-b-0 last:pb-0">
                <span class="text-[0.9375rem] font-semibold text-rm-text">Setup wizard</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 m-0 leading-[1.45]">Walk through adding projects, Git, tests, and extensions.</p>
                <Button label="Run setup wizard" size="small" severity="secondary" class="mt-2" @click="openSetupWizard" />
              </div>
            </div>
          </div>
          </div>
        </section>

        <!-- Notifications -->
        <section v-show="activeSection === 'notifications'" class="settings-section">
          <div class="flex items-start gap-4 p-5 mb-4 rounded-xl border border-rm-accent/25 bg-gradient-to-br from-rm-accent/12 via-rm-accent/[0.04] to-transparent">
            <div class="shrink-0 w-12 h-12 flex items-center justify-center rounded-[10px] bg-rm-accent/20 text-rm-accent" aria-hidden="true" v-html="getSectionMeta('notifications').icon"></div>
            <div>
              <h3 class="text-2xl font-bold text-rm-text tracking-[-0.03em] m-0 mb-1">{{ getSectionMeta('notifications').label }}</h3>
              <p class="text-[0.9375rem] text-rm-muted m-0 leading-normal">{{ getSectionMeta('notifications').description }}</p>
            </div>
          </div>
          <div class="settings-section-card">
          <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 space-y-5">
            <label class="block settings-row-clickable settings-row-checkbox">
              <div class="min-w-0">
                <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Enable notifications</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Show in-app and system notifications for releases and errors.</p>
              </div>
              <Checkbox v-model="notificationsEnabled" binary @update:model-value="saveNotificationsEnabled" class="shrink-0" />
            </label>
            <label class="block settings-row-clickable settings-row-checkbox pt-2 border-t border-rm-border">
              <div class="min-w-0">
                <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Notification sound</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Play a sound when a notification appears.</p>
              </div>
              <Checkbox v-model="notificationSound" binary @update:model-value="saveNotificationSound" class="shrink-0" />
            </label>
            <label class="block settings-row-clickable settings-row-checkbox pt-2 border-t border-rm-border">
              <div class="min-w-0">
                <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Only when app is in background</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Show system notifications only when the app is not focused.</p>
              </div>
              <Checkbox v-model="notificationsOnlyWhenNotFocused" binary @update:model-value="saveNotificationsOnlyWhenNotFocused" class="shrink-0" />
            </label>
          </div>

          <!-- Notification Preferences (web app API) -->
          <template v-if="license.isLoggedIn?.value">
            <h4 class="text-base font-semibold text-rm-text mt-8 mb-1">Notification preferences</h4>
            <p class="text-sm text-rm-muted mb-4 m-0">Choose which notifications you receive from the web app.</p>

            <div v-if="notifPrefsLoading" class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 py-6 flex items-center justify-center">
              <span class="text-sm text-rm-muted">Loading preferences…</span>
            </div>
            <div v-else-if="notifPrefsError" class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 py-4">
              <Message severity="error" :closable="false" class="m-0">{{ notifPrefsError }}</Message>
            </div>
            <template v-else>
              <div v-for="cat in notifPrefsCategories" :key="cat.id" class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 mb-4">
                <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text text-xs font-semibold uppercase tracking-wider mb-3">{{ cat.label }}</span>
                <div class="space-y-4">
                  <label
                    v-for="(nt, ntIdx) in notifPrefsTypesForCategory(cat.id)"
                    :key="nt.key"
                    class="block settings-row-clickable settings-row-checkbox"
                    :class="{ 'pt-3 border-t border-rm-border': ntIdx > 0 }"
                  >
                    <div class="min-w-0">
                      <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">{{ nt.label }}</span>
                      <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">{{ nt.description }}</p>
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
          <div class="flex items-start gap-4 p-5 mb-4 rounded-xl border border-rm-accent/25 bg-gradient-to-br from-rm-accent/12 via-rm-accent/[0.04] to-transparent">
            <div class="shrink-0 w-12 h-12 flex items-center justify-center rounded-[10px] bg-rm-accent/20 text-rm-accent" aria-hidden="true" v-html="getSectionMeta('behavior').icon"></div>
            <div>
              <h3 class="text-2xl font-bold text-rm-text tracking-[-0.03em] m-0 mb-1">{{ getSectionMeta('behavior').label }}</h3>
              <p class="text-[0.9375rem] text-rm-muted m-0 leading-normal">{{ getSectionMeta('behavior').description }}</p>
            </div>
          </div>
          <div class="settings-section-card">
          <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 space-y-5">
            <label class="block settings-row-clickable settings-row-checkbox">
              <div class="min-w-0">
                <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Double-click to open project</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Require double-click to open a project in the sidebar (single-click to select only).</p>
              </div>
              <Checkbox v-model="doubleClickToOpenProject" binary @update:model-value="saveDoubleClickToOpenProject" class="shrink-0" />
            </label>
            <div class="block pt-2 border-t border-rm-border">
              <span class="text-[0.8125rem] font-semibold text-rm-text">Default project sort</span>
              <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">How to order projects in the sidebar.</p>
              <Select v-model="projectSortOrder" :options="projectSortOptions" optionLabel="label" optionValue="value" class="max-w-xs mt-2" @change="saveProjectSortOrder" />
            </div>
            <label class="block settings-row-clickable settings-row-checkbox pt-2 border-t border-rm-border">
              <div class="min-w-0">
                <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Lock sidebar width</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Prevent resizing the sidebar (width stays fixed).</p>
              </div>
              <Checkbox v-model="sidebarWidthLocked" binary @update:model-value="saveSidebarWidthLocked" class="shrink-0" />
            </label>
            <label class="block settings-row-clickable settings-row-checkbox pt-2 border-t border-rm-border">
              <div class="min-w-0">
                <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Open project in new tab</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">When using tabs, open projects in a new tab instead of replacing the current one.</p>
              </div>
              <Checkbox v-model="openProjectInNewTab" binary @update:model-value="saveOpenProjectInNewTab" class="shrink-0" />
            </label>
            <label class="block settings-row-clickable settings-row-checkbox pt-2 border-t border-rm-border">
              <div class="min-w-0">
                <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Compact sidebar</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Smaller icons and labels in the project list.</p>
              </div>
              <Checkbox v-model="compactSidebar" binary @update:model-value="saveCompactSidebar" class="shrink-0" />
            </label>
            <label class="block settings-row-clickable settings-row-checkbox pt-2 border-t border-rm-border">
              <div class="min-w-0">
                <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Show project path in sidebar</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Display full path under each project name.</p>
              </div>
              <Checkbox v-model="showProjectPathInSidebar" binary @update:model-value="saveShowProjectPathInSidebar" class="shrink-0" />
            </label>
            <label class="block settings-row-clickable settings-row-checkbox pt-2 border-t border-rm-border">
              <div class="min-w-0">
                <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Remember last opened tab</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Per project, restore the last detail tab (Git, Tests, etc.) when reopening.</p>
              </div>
              <Checkbox v-model="rememberLastDetailTab" binary @update:model-value="saveRememberLastDetailTab" class="shrink-0" />
            </label>
            <label class="block settings-row-clickable settings-row-checkbox pt-2 border-t border-rm-border">
              <div class="min-w-0">
                <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Confirm destructive actions</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Ask for confirmation before delete, release, or batch release.</p>
              </div>
              <Checkbox v-model="confirmDestructiveActions" binary @update:model-value="saveConfirmDestructiveActions" class="shrink-0" />
            </label>
            <label class="block settings-row-clickable settings-row-checkbox pt-2 border-t border-rm-border">
              <div class="min-w-0">
                <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Confirm before discarding changes</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Extra confirmation before git discard or reset.</p>
              </div>
              <Checkbox v-model="confirmBeforeDiscard" binary @update:model-value="saveConfirmBeforeDiscard" class="shrink-0" />
            </label>
            <label class="block settings-row-clickable settings-row-checkbox pt-2 border-t border-rm-border">
              <div class="min-w-0">
                <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Confirm before force push</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Extra confirmation before git push --force.</p>
              </div>
              <Checkbox v-model="confirmBeforeForcePush" binary @update:model-value="saveConfirmBeforeForcePush" class="shrink-0" />
            </label>
            <label class="block settings-row-clickable settings-row-checkbox pt-2 border-t border-rm-border">
              <div class="min-w-0">
                <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Open links in default browser</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Open external links (docs, GitHub, etc.) in the system browser instead of in-app.</p>
              </div>
              <Checkbox v-model="openLinksInExternalBrowser" binary @update:model-value="saveOpenLinksInExternalBrowser" class="shrink-0" />
            </label>
            <label class="block settings-row-clickable settings-row-checkbox pt-2 border-t border-rm-border">
              <div class="min-w-0">
                <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Debug bar visible</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Show the debug bar by default (for developers).</p>
              </div>
              <Checkbox v-model="debugBarVisible" binary @update:model-value="saveDebugBarVisible" class="shrink-0" />
            </label>
            <label class="block settings-row-clickable settings-row-checkbox pt-2 border-t border-rm-border">
              <div class="min-w-0">
                <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Notify on release success/failure</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Show system notifications when a release finishes.</p>
              </div>
              <Checkbox v-model="notifyOnRelease" binary @update:model-value="saveNotifyOnRelease" class="shrink-0" />
            </label>
            <label class="block settings-row-clickable settings-row-checkbox pt-2 border-t border-rm-border">
              <div class="min-w-0">
                <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Notify when project sync completes</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Alert when background sync finishes.</p>
              </div>
              <Checkbox v-model="notifyOnSyncComplete" binary @update:model-value="saveNotifyOnSyncComplete" class="shrink-0" />
            </label>
            <div class="block pt-2 border-t border-rm-border">
              <span class="text-[0.8125rem] font-semibold text-rm-text">Auto-refresh interval</span>
              <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">How often to refresh project list and dashboard (0 = off).</p>
              <Select v-model="autoRefreshIntervalSeconds" :options="autoRefreshIntervalOptions" optionLabel="label" optionValue="value" class="max-w-xs mt-2" @change="saveAutoRefreshInterval" />
            </div>
            <div class="block pt-2 border-t border-rm-border">
              <span class="text-[0.8125rem] font-semibold text-rm-text">Recent projects list length</span>
              <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">Maximum number of recent projects to remember.</p>
              <Select v-model="recentListLength" :options="recentListLengthOptions" optionLabel="label" optionValue="value" class="max-w-xs mt-2" @change="saveRecentListLength" />
            </div>
            <label class="block settings-row-clickable settings-row-checkbox pt-2 border-t border-rm-border">
              <div class="min-w-0">
                <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Show tips and onboarding</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Show first-run tips and occasional hints. Uncheck to hide permanently.</p>
              </div>
              <Checkbox v-model="showTips" binary @update:model-value="saveShowTips" class="shrink-0" />
            </label>
          </div>
          </div>
        </section>

        <!-- Extensions -->
        <section v-show="activeSection === 'extensions'" class="settings-section max-w-none -mr-8">
          <div class="flex items-start gap-4 p-5 mb-4 rounded-xl border border-rm-accent/25 bg-gradient-to-br from-rm-accent/12 via-rm-accent/[0.04] to-transparent">
            <div class="shrink-0 w-12 h-12 flex items-center justify-center rounded-[10px] bg-rm-accent/20 text-rm-accent" aria-hidden="true" v-html="getSectionMeta('extensions').icon"></div>
            <div>
              <h3 class="text-2xl font-bold text-rm-text tracking-[-0.03em] m-0 mb-1">{{ getSectionMeta('extensions').label }}</h3>
              <p class="text-[0.9375rem] text-rm-muted m-0 leading-normal">Browse, install, and manage extensions from the marketplace.</p>
            </div>
          </div>

          <!-- Stats + filter bar -->
          <div v-if="extRegistryFetched" class="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div class="flex items-center gap-4">
              <span class="text-2xl font-bold text-rm-text leading-none">{{ extRegistryList.length }}</span>
              <div class="text-xs text-rm-muted leading-relaxed">
                <span class="text-green-400 font-medium">{{ extEnabledCount }}</span> enabled
                <template v-if="extDisabledCount > 0">
                  · <span class="text-yellow-400 font-medium">{{ extDisabledCount }}</span> disabled
                </template>
                <template v-if="extRegistryList.length - extInstalledCount > 0">
                  · <span class="text-rm-muted">{{ extRegistryList.length - extInstalledCount }}</span> available
                </template>
              </div>
            </div>
            <div class="flex items-center gap-0.5 rounded-lg p-0.5 bg-rm-surface border border-rm-border">
              <button
                v-for="opt in extFilterTabs"
                :key="opt.value"
                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer border-none transition-all duration-150"
                :class="extFilterMode === opt.value
                  ? 'bg-rm-bg-elevated text-rm-text shadow-sm'
                  : 'bg-transparent text-rm-muted hover:text-rm-text'"
                @click="extFilterMode = opt.value"
              >
                {{ opt.label }}
                <span class="text-[9px] opacity-50 font-semibold">{{ opt.count }}</span>
              </button>
            </div>
          </div>

          <!-- Error -->
          <div v-if="extRegistryError" class="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs mb-4">{{ extRegistryError }}</div>

          <!-- Loading -->
          <div v-if="extSyncing && !extRegistryFetched" class="py-16 text-center">
            <ProgressSpinner style="width: 28px; height: 28px" strokeWidth="3" />
            <p class="text-xs text-rm-muted mt-3 m-0">Loading extensions...</p>
          </div>

          <!-- Empty state -->
          <div v-else-if="extFilteredRegistry.length === 0 && extRegistryFetched" class="py-16 text-center">
            <svg class="w-10 h-10 mx-auto text-rm-muted opacity-20 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
            </svg>
            <p class="text-sm text-rm-text font-medium m-0">
              <template v-if="extSearchQuery">No results for "{{ extSearchQuery }}"</template>
              <template v-else-if="extFilterMode === 'installed'">No extensions installed</template>
              <template v-else-if="extFilterMode === 'not_installed'">All extensions installed</template>
              <template v-else>No extensions available</template>
            </p>
          </div>

          <!-- Extension grid -->
          <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            <div
              v-for="item in extFilteredRegistry" :key="item.id"
              class="flex flex-col min-h-[100px] py-3.5 px-3.5 pl-4 rounded-[10px] border border-rm-border bg-rm-bg-elevated transition-all duration-200 hover:border-rm-accent/40 hover:bg-rm-surface"
              :class="[
                extIsInstalled(item.slug || item.id) && item.accessible !== false ? 'border-rm-accent/25 bg-rm-accent/[0.04] hover:bg-rm-accent/[0.07]' : '',
                item.accessible === false ? 'opacity-55 hover:opacity-75' : '',
                extCardPlanBorderClass(item.required_plan || 'free'),
              ]"
            >
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-2 mb-1.5">
                  <span class="font-semibold text-rm-text text-[13px] leading-tight">{{ item.name || item.id }}</span>
                  <div class="flex items-center gap-1 shrink-0">
                    <span v-if="item.version" class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-rm-surface text-rm-muted">{{ item.version }}</span>
                    <span
                      v-if="item.required_plan && item.required_plan !== 'free'"
                      class="inline-flex items-center text-[8px] font-bold px-1.5 py-px rounded tracking-wide uppercase"
                      :class="{
                        'bg-purple-500/15 text-purple-600 dark:text-purple-400': item.required_plan === 'pro',
                        'bg-blue-500/15 text-blue-600 dark:text-blue-400': item.required_plan === 'team',
                        'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400': item.required_plan === 'developer',
                      }"
                    >
                      {{ item.required_plan.charAt(0).toUpperCase() + item.required_plan.slice(1) }}
                    </span>
                  </div>
                </div>
                <p v-if="item.description" class="text-[11px] text-rm-muted m-0 leading-relaxed line-clamp-2">{{ item.description }}</p>
              </div>

              <div class="flex items-center justify-between gap-2 mt-auto pt-2">
                <span v-if="extGetInstallCount(item) != null" class="text-[10px] text-rm-muted inline-flex items-center gap-1 opacity-60">
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  {{ extFormatInstallCount(extGetInstallCount(item)) }}
                </span>
                <span v-else></span>

                <div class="flex items-center gap-2">
                  <template v-if="extIsInstalled(item.slug || item.id) && item.accessible === false">
                    <button class="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-md bg-purple-500/12 text-purple-600 dark:text-purple-400 border border-purple-500/25 cursor-pointer transition-all hover:bg-purple-500/20 hover:border-purple-500/40" @click="extOpenUpgrade">Upgrade</button>
                    <button class="text-[10px] font-semibold px-1.5 py-1 bg-transparent border-none text-rm-muted cursor-pointer transition-colors hover:text-rm-danger disabled:opacity-40 disabled:cursor-not-allowed" :disabled="extUninstallingId != null" @click="extUninstall(item.slug || item.id)">
                      {{ extUninstallingId === (item.slug || item.id) ? '...' : 'Uninstall' }}
                    </button>
                  </template>
                  <template v-else-if="item.accessible === false">
                    <button class="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-md bg-purple-500/12 text-purple-600 dark:text-purple-400 border border-purple-500/25 cursor-pointer transition-all hover:bg-purple-500/20 hover:border-purple-500/40" @click="extOpenUpgrade">
                      <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                      Upgrade
                    </button>
                  </template>
                  <template v-else-if="extIsInstalled(item.slug || item.id)">
                    <button
                      class="relative inline-flex w-[30px] h-4 items-center rounded-full border-none p-0 cursor-pointer transition-colors duration-200"
                      :class="extPrefs.isEnabled(item.slug || item.id) ? 'bg-rm-accent' : 'bg-rm-border'"
                      @click="extPrefs.setEnabled(item.slug || item.id, !extPrefs.isEnabled(item.slug || item.id))"
                    >
                      <span class="inline-block w-3 h-3 rounded-full bg-white shadow transition-transform duration-200" :class="extPrefs.isEnabled(item.slug || item.id) ? 'translate-x-[14px]' : 'translate-x-[2px]'"></span>
                    </button>
                    <button class="text-[10px] font-semibold px-1.5 py-1 bg-transparent border-none text-rm-muted cursor-pointer transition-colors hover:text-rm-danger disabled:opacity-40 disabled:cursor-not-allowed" :disabled="extUninstallingId != null" @click="extUninstall(item.slug || item.id)">
                      {{ extUninstallingId === (item.slug || item.id) ? '...' : 'Uninstall' }}
                    </button>
                  </template>
                  <template v-else>
                    <button class="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-md bg-rm-accent text-rm-bg-elevated border-none cursor-pointer transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed" :disabled="extInstallingId != null" @click="extInstall(item)">
                      <svg v-if="extInstallingId !== (item.slug || item.id)" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      {{ extInstallingId === (item.slug || item.id) ? 'Installing...' : 'Install' }}
                    </button>
                  </template>
                </div>
              </div>
            </div>
          </div>

          <p class="text-[10px] text-rm-muted mt-4 opacity-60">Restart the app after installing or uninstalling extensions to apply changes.</p>
        </section>

        <!-- Git -->
        <section v-show="activeSection === 'git'" class="settings-section">
          <div class="flex items-start gap-4 p-5 mb-4 rounded-xl border border-rm-accent/25 bg-gradient-to-br from-rm-accent/12 via-rm-accent/[0.04] to-transparent">
            <div class="shrink-0 w-12 h-12 flex items-center justify-center rounded-[10px] bg-rm-accent/20 text-rm-accent" aria-hidden="true" v-html="getSectionMeta('git').icon"></div>
            <div>
              <h3 class="text-2xl font-bold text-rm-text tracking-[-0.03em] m-0 mb-1">{{ getSectionMeta('git').label }}</h3>
              <p class="text-[0.9375rem] text-rm-muted m-0 leading-normal">{{ getSectionMeta('git').description }}</p>
            </div>
          </div>
          <div class="settings-section-card">

          <!-- Identity -->
          <h4 class="text-xs font-semibold text-rm-muted uppercase tracking-wider mb-3">Identity</h4>
          <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 space-y-5 mb-6">
            <div class="block">
              <span class="text-[0.8125rem] font-semibold text-rm-text">User name</span>
              <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">Your name for git commits (git config user.name).</p>
              <InputText v-model="gitUserName" type="text" class="max-w-sm mt-2" placeholder="Your Name" @blur="saveGitUserName" />
            </div>
            <div class="block pt-2 border-t border-rm-border">
              <span class="text-[0.8125rem] font-semibold text-rm-text">Email address</span>
              <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">Your email for git commits (git config user.email).</p>
              <InputText v-model="gitUserEmail" type="email" class="max-w-sm mt-2" placeholder="you@example.com" @blur="saveGitUserEmail" />
            </div>
          </div>

          <!-- Commit signing -->
          <h4 class="text-xs font-semibold text-rm-muted uppercase tracking-wider mb-3">Commit Signing</h4>
          <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 space-y-5 mb-6">
            <label class="block settings-row-clickable settings-row-checkbox">
              <div class="min-w-0">
                <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Sign commits</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Use git commit -S when committing.</p>
              </div>
              <Checkbox v-model="signCommits" binary @update:model-value="saveSignCommits" class="shrink-0" />
            </label>
            <div class="block pt-2 border-t border-rm-border">
              <span class="text-[0.8125rem] font-semibold text-rm-text">Signing format</span>
              <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">Choose between GPG (OpenPGP) or SSH key signing.</p>
              <Select v-model="gitGpgFormat" :options="gitGpgFormatOptions" optionLabel="label" optionValue="value" class="max-w-xs mt-2" @change="saveGitGpgFormat" />
            </div>
            <div class="block pt-2 border-t border-rm-border">
              <span class="text-[0.8125rem] font-semibold text-rm-text">Signing key ID</span>
              <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">GPG key ID or SSH key path used to sign commits.</p>
              <div class="flex flex-wrap items-center gap-2 mt-2">
                <InputText v-model="gitGpgKeyId" type="text" class="flex-1 min-w-0 max-w-sm" placeholder="e.g. 3AA5C34371567BD2" @blur="saveGitGpgKeyId" />
                <Button v-if="gitGpgFormat === 'openpgp'" label="Detect keys" size="small" severity="secondary" :loading="gpgKeysLoading" @click="loadGpgKeys" />
              </div>
            </div>
            <div v-if="gpgKeys.length" class="pt-2 border-t border-rm-border">
              <span class="text-[0.8125rem] font-semibold text-rm-text text-sm mb-2 block">Available GPG keys</span>
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
              <span class="text-[0.8125rem] font-semibold text-rm-text text-sm">Generate new GPG key</span>
              <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">Creates an Ed25519 key using your name and email above. Expires in 2 years.</p>
              <div class="flex items-center gap-2 mt-2">
                <Button label="Generate GPG key" size="small" severity="secondary" :loading="gpgGenerating" :disabled="!gitUserName || !gitUserEmail" @click="generateGpgKey" />
              </div>
              <p v-if="gpgGenerateError" class="text-xs text-rm-danger mt-1">{{ gpgGenerateError }}</p>
            </div>
          </div>

          <!-- Repository defaults -->
          <h4 class="text-xs font-semibold text-rm-muted uppercase tracking-wider mb-3">Repository Defaults</h4>
          <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 space-y-5 mb-6">
            <div class="block">
              <span class="text-[0.8125rem] font-semibold text-rm-text">Default branch name</span>
              <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">Default branch to use when creating or referring to repos.</p>
              <InputText v-model="gitDefaultBranch" type="text" class="max-w-xs mt-2" placeholder="main" @blur="saveGitDefaultBranch" />
            </div>
            <div class="block pt-2 border-t border-rm-border">
              <span class="text-[0.8125rem] font-semibold text-rm-text">Pull strategy</span>
              <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">How to reconcile divergent branches on pull.</p>
              <Select v-model="gitPullRebase" :options="gitPullStrategyOptions" optionLabel="label" optionValue="value" class="max-w-xs mt-2" @change="saveGitPullRebase" />
            </div>
            <label class="block settings-row-clickable settings-row-checkbox pt-2 border-t border-rm-border">
              <div class="min-w-0">
                <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Auto-stash before rebase</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Automatically stash uncommitted changes before rebasing, then pop after.</p>
              </div>
              <Checkbox v-model="gitAutoStash" binary @update:model-value="saveGitAutoStash" class="shrink-0" />
            </label>
            <div class="block pt-2 border-t border-rm-border">
              <span class="text-[0.8125rem] font-semibold text-rm-text">Auto-fetch interval</span>
              <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">How often to run git fetch in the background (0 = off).</p>
              <Select v-model="gitAutoFetchIntervalMinutes" :options="gitAutoFetchIntervalOptions" optionLabel="label" optionValue="value" class="max-w-xs mt-2" @change="saveGitAutoFetchInterval" />
            </div>
            <div class="block pt-2 border-t border-rm-border">
              <span class="text-[0.8125rem] font-semibold text-rm-text">Commit message template (optional)</span>
              <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">Path to a file used as the default commit message template.</p>
              <InputText v-model="gitCommitTemplate" type="text" class="mt-2" placeholder="~/.gitmessage" @blur="saveGitCommitTemplate" />
            </div>
          </div>

          <!-- Tools & paths -->
          <h4 class="text-xs font-semibold text-rm-muted uppercase tracking-wider mb-3">Tools &amp; Paths</h4>
          <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 space-y-5 mb-6">
            <div class="block">
              <span class="text-[0.8125rem] font-semibold text-rm-text">SSH key path (optional)</span>
              <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">Path to SSH private key for Git operations. Leave empty for default.</p>
              <InputText v-model="gitSshKeyPath" type="text" class="mt-2" placeholder="~/.ssh/id_rsa" @blur="saveGitSshKeyPath" />
            </div>
            <div class="block pt-2 border-t border-rm-border">
              <span class="text-[0.8125rem] font-semibold text-rm-text">Diff / merge tool (optional)</span>
              <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">External diff or merge tool command (e.g. code --diff).</p>
              <InputText v-model="gitDiffTool" type="text" class="mt-2" placeholder="" @blur="saveGitDiffTool" />
            </div>
            <div class="block pt-2 border-t border-rm-border">
              <span class="text-[0.8125rem] font-semibold text-rm-text">GitHub token (default)</span>
              <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">Optional. Higher API limits and ability to create or update releases. Stored locally.</p>
              <div class="flex flex-wrap items-center gap-2 mt-2">
                <InputText v-model="githubToken" type="password" class="flex-1 min-w-0" placeholder="ghp_..." autocomplete="off" @blur="saveToken" />
                <Button variant="link" label="Create token" class="text-xs text-rm-accent p-0 min-w-0 h-auto shrink-0" @click="openUrl('https://github.com/settings/tokens')" />
              </div>
            </div>
          </div>
          </div>
        </section>

        <!-- GitHub -->
        <section v-show="activeSection === 'github'" class="settings-section">
          <div class="flex items-start gap-4 p-5 mb-4 rounded-xl border border-rm-accent/25 bg-gradient-to-br from-rm-accent/12 via-rm-accent/[0.04] to-transparent">
            <div class="shrink-0 w-12 h-12 flex items-center justify-center rounded-[10px] bg-rm-accent/20 text-rm-accent" aria-hidden="true" v-html="getSectionMeta('github').icon"></div>
            <div>
              <h3 class="text-2xl font-bold text-rm-text tracking-[-0.03em] m-0 mb-1">{{ getSectionMeta('github').label }}</h3>
              <p class="text-[0.9375rem] text-rm-muted m-0 leading-normal">{{ getSectionMeta('github').description }}</p>
            </div>
          </div>
          <div class="settings-section-card">
          <template v-if="!license.isLoggedIn?.value">
            <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6">
              <p class="text-sm text-rm-warning m-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1 align-[-2px]"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                Sign in to view GitHub integration status.
              </p>
            </div>
          </template>
          <template v-else>
            <!-- Connection status -->
            <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 mb-5">
              <div class="flex items-center justify-between gap-3 flex-wrap">
                <div class="flex items-center gap-3 min-w-0">
                  <span
                    class="w-2.5 h-2.5 rounded-full shrink-0"
                    :class="githubHealthLoading ? 'gh-status-checking' : githubHealth?.connected ? 'bg-rm-success shadow-[0_0_0_3px_rgb(var(--rm-success)/0.2)]' : 'bg-rm-danger shadow-[0_0_0_3px_rgb(var(--rm-danger)/0.2)]'"
                  />
                  <div class="min-w-0">
                    <span class="text-[0.8125rem] font-semibold text-rm-text m-0 block">
                      {{ githubHealthLoading ? 'Checking…' : githubHealth?.connected ? 'Connected' : githubHealthError ? 'Error' : 'Not connected' }}
                    </span>
                    <p v-if="githubHealth?.username" class="text-sm text-rm-muted m-0 mt-0.5 flex items-center gap-1.5">
                      <img v-if="githubHealth.avatar_url" :src="githubHealth.avatar_url" alt="" class="w-[18px] h-[18px] rounded-full border border-rm-border object-cover" referrerpolicy="no-referrer" />
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

            <!-- Add from GitHub -->
            <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 mb-5">
              <div class="block pb-4">
                <span class="text-[0.8125rem] font-semibold text-rm-text block mb-1">Add from GitHub</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0">Browse your repositories or search GitHub to clone and add a project.</p>
              </div>
              <Button label="Clone from GitHub" icon="pi pi-github" size="small" @click="openCloneFromGit?.('github')" />
            </div>

            <!-- Token status -->
            <div v-if="githubHealth" class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 mb-5">
              <div class="block pb-4">
                <span class="text-[0.8125rem] font-semibold text-rm-text block mb-1">Token status</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0">OAuth token and scope information.</p>
              </div>
              <div class="space-y-3">
                <div class="flex items-center gap-2 text-sm">
                  <span class="font-medium text-rm-text">Status:</span>
                  <span
                    class="inline-block text-[0.6875rem] font-semibold py-0.5 px-2 rounded-full leading-[1.4]"
                    :class="githubHealth.token_status === 'valid' ? 'bg-rm-success/12 text-rm-success' : githubHealth.token_status === 'expired' ? 'bg-rm-warning/12 text-rm-warning' : 'bg-rm-danger/12 text-rm-danger'"
                  >
                    {{ githubHealth.token_status === 'valid' ? 'Valid' : githubHealth.token_status === 'expired' ? 'Expired' : 'Missing' }}
                  </span>
                </div>
                <div v-if="githubHealth.scopes?.length" class="text-sm">
                  <span class="font-medium text-rm-text block mb-1.5">Scopes:</span>
                  <div class="flex flex-wrap gap-1.5">
                    <span v-for="scope in githubHealth.scopes" :key="scope" class="inline-block text-[0.6875rem] font-medium font-mono py-0.5 px-[0.4375rem] rounded bg-rm-bg border border-rm-border text-rm-text">{{ scope }}</span>
                  </div>
                </div>
                <div v-if="githubHealth.token_status === 'valid' && githubHealth.has_repo_scope === false" class="flex items-start gap-2 text-[0.8125rem] text-rm-warning py-2 px-3 rounded-md bg-rm-warning/6 border border-rm-warning/15">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                  <span>Missing <code class="text-[0.75rem] font-semibold py-0 px-1 rounded bg-rm-warning/10">repo</code> scope — repository access may be limited.</span>
                </div>
              </div>
            </div>

            <!-- Linked repositories -->
            <div v-if="githubHealth?.projects?.length" class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6">
              <div class="block pb-4">
                <div class="flex items-center justify-between gap-2">
                  <div>
                    <span class="text-[0.8125rem] font-semibold text-rm-text block mb-1">Linked repositories</span>
                    <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0">Projects with a connected GitHub repository.</p>
                  </div>
                  <span v-if="githubHealth.stale_projects" class="text-xs text-rm-warning font-medium">{{ githubHealth.stale_projects }} stale</span>
                </div>
              </div>
              <table class="w-full border-collapse text-[0.8125rem] [&_thead_th]:text-left [&_thead_th]:py-1.5 [&_thead_th]:px-2 [&_thead_th]:py-1.5 [&_thead_th]:pr-0 [&_thead_th]:text-[0.6875rem] [&_thead_th]:font-semibold [&_thead_th]:uppercase [&_thead_th]:tracking-wider [&_thead_th]:text-rm-muted [&_thead_th]:border-b [&_thead_th]:border-rm-border [&_tbody_tr]:border-b [&_tbody_tr]:border-rm-border/40 [&_tbody_tr:last-child]:border-b-0 [&_tbody_td]:py-2 [&_tbody_td]:px-2 [&_tbody_td]:pr-0 [&_tbody_td]:align-middle">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Repository</th>
                    <th>Last sync</th>
                    <th class="w-12 text-center">Health</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="proj in githubHealth.projects" :key="proj.name">
                    <td class="font-medium text-rm-text max-w-40 overflow-hidden text-ellipsis whitespace-nowrap">{{ proj.name }}</td>
                    <td class="font-mono text-[0.75rem] text-rm-muted max-w-56 overflow-hidden text-ellipsis whitespace-nowrap">{{ proj.github_repo || '—' }}</td>
                    <td class="text-[0.75rem] text-rm-muted whitespace-nowrap">{{ proj.synced_at ? formatGitHubSyncTime(proj.synced_at) : 'Never' }}</td>
                    <td class="text-center">
                      <span
                        class="inline-block w-2 h-2 rounded-full"
                        :class="proj.health === 'healthy' ? 'bg-rm-success shadow-[0_0_0_2px_rgb(var(--rm-success)/0.2)]' : proj.health === 'stale' ? 'bg-rm-warning shadow-[0_0_0_2px_rgb(var(--rm-warning)/0.2)]' : 'bg-rm-danger shadow-[0_0_0_2px_rgb(var(--rm-danger)/0.2)]'"
                        :title="proj.health === 'healthy' ? 'Healthy' : proj.health === 'stale' ? 'Stale (>7 days)' : 'Never synced'"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-else-if="githubHealth && !githubHealth.projects?.length" class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6">
              <p class="text-sm text-rm-muted m-0">No projects with linked GitHub repositories.</p>
            </div>
          </template>
          </div>
        </section>

        <!-- GitLab -->
        <section v-show="activeSection === 'gitlab'" class="settings-section">
          <div class="flex items-start gap-4 p-5 mb-4 rounded-xl border border-rm-accent/25 bg-gradient-to-br from-rm-accent/12 via-rm-accent/[0.04] to-transparent">
            <div class="shrink-0 w-12 h-12 flex items-center justify-center rounded-[10px] bg-rm-accent/20 text-rm-accent" aria-hidden="true" v-html="getSectionMeta('gitlab').icon"></div>
            <div>
              <h3 class="text-2xl font-bold text-rm-text tracking-[-0.03em] m-0 mb-1">{{ getSectionMeta('gitlab').label }}</h3>
              <p class="text-[0.9375rem] text-rm-muted m-0 leading-normal">{{ getSectionMeta('gitlab').description }}</p>
            </div>
          </div>
          <div class="settings-section-card">
            <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 mb-5">
              <div class="block pb-4">
                <span class="text-[0.8125rem] font-semibold text-rm-text block mb-1">Add from GitLab</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0">Browse your projects or search GitLab to clone and add.</p>
              </div>
              <Button label="Clone from GitLab" icon="pi pi-gitlab" size="small" @click="openCloneFromGit?.('gitlab')" />
            </div>
            <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 space-y-5">
              <div class="block">
                <span class="text-[0.8125rem] font-semibold text-rm-text">Instance URL</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">GitLab instance URL. Leave empty for gitlab.com.</p>
                <InputText v-model="gitlabUrl" type="text" class="max-w-md mt-2" placeholder="https://gitlab.com" @blur="saveGitLabUrl" />
              </div>
              <div class="block pt-2 border-t border-rm-border">
                <span class="text-[0.8125rem] font-semibold text-rm-text">Personal access token</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">Required for listing and searching your projects.</p>
                <div class="flex flex-wrap items-center gap-2 mt-2">
                  <InputText v-model="gitlabToken" type="password" class="flex-1 min-w-0" placeholder="glpat-..." autocomplete="off" @blur="saveGitLabToken" />
                  <Button variant="link" label="Create token" class="text-xs text-rm-accent p-0 min-w-0 h-auto shrink-0" @click="openUrl('https://gitlab.com/-/user_settings/personal_access_tokens')" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Bitbucket -->
        <section v-show="activeSection === 'bitbucket'" class="settings-section">
          <div class="flex items-start gap-4 p-5 mb-4 rounded-xl border border-rm-accent/25 bg-gradient-to-br from-rm-accent/12 via-rm-accent/[0.04] to-transparent">
            <div class="shrink-0 w-12 h-12 flex items-center justify-center rounded-[10px] bg-rm-accent/20 text-rm-accent" aria-hidden="true" v-html="getSectionMeta('bitbucket').icon"></div>
            <div>
              <h3 class="text-2xl font-bold text-rm-text tracking-[-0.03em] m-0 mb-1">{{ getSectionMeta('bitbucket').label }}</h3>
              <p class="text-[0.9375rem] text-rm-muted m-0 leading-normal">{{ getSectionMeta('bitbucket').description }}</p>
            </div>
          </div>
          <div class="settings-section-card">
            <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 mb-5">
              <div class="block pb-4">
                <span class="text-[0.8125rem] font-semibold text-rm-text block mb-1">Add from Bitbucket</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0">Browse your repositories or search Bitbucket to clone and add.</p>
              </div>
              <Button label="Clone from Bitbucket" icon="pi pi-bitbucket" size="small" @click="openCloneFromGit?.('bitbucket')" />
            </div>
            <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 space-y-5">
              <div class="block">
                <span class="text-[0.8125rem] font-semibold text-rm-text">Username</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">Your Bitbucket username or email (for API token auth).</p>
                <InputText v-model="bitbucketUsername" type="text" class="max-w-md mt-2" placeholder="username" @blur="saveBitbucketUsername" />
              </div>
              <div class="block pt-2 border-t border-rm-border">
                <span class="text-[0.8125rem] font-semibold text-rm-text">API token</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">Bitbucket API token with repository read scope. App passwords are deprecated; use API tokens.</p>
                <div class="flex flex-wrap items-center gap-2 mt-2">
                  <InputText v-model="bitbucketToken" type="password" class="flex-1 min-w-0" placeholder="API token" autocomplete="off" @blur="saveBitbucketToken" />
                  <Button variant="link" label="Create API token" class="text-xs text-rm-accent p-0 min-w-0 h-auto shrink-0" @click="openUrl('https://id.atlassian.com/manage-profile/security/api-tokens')" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Gitea -->
        <section v-show="activeSection === 'gitea'" class="settings-section">
          <div class="flex items-start gap-4 p-5 mb-4 rounded-xl border border-rm-accent/25 bg-gradient-to-br from-rm-accent/12 via-rm-accent/[0.04] to-transparent">
            <div class="shrink-0 w-12 h-12 flex items-center justify-center rounded-[10px] bg-rm-accent/20 text-rm-accent" aria-hidden="true" v-html="getSectionMeta('gitea').icon"></div>
            <div>
              <h3 class="text-2xl font-bold text-rm-text tracking-[-0.03em] m-0 mb-1">{{ getSectionMeta('gitea').label }}</h3>
              <p class="text-[0.9375rem] text-rm-muted m-0 leading-normal">{{ getSectionMeta('gitea').description }}</p>
            </div>
          </div>
          <div class="settings-section-card">
            <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 mb-5">
              <div class="block pb-4">
                <span class="text-[0.8125rem] font-semibold text-rm-text block mb-1">Add from Gitea</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0">Browse your repositories or search Gitea/Forgejo to clone and add.</p>
              </div>
              <Button label="Clone from Gitea" icon="pi pi-box" size="small" @click="openCloneFromGit?.('gitea')" />
            </div>
            <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 space-y-5">
              <div class="block">
                <span class="text-[0.8125rem] font-semibold text-rm-text">Instance URL</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">Gitea or Forgejo instance URL. Leave empty for gitea.com.</p>
                <InputText v-model="giteaUrl" type="text" class="max-w-md mt-2" placeholder="https://gitea.com" @blur="saveGiteaUrl" />
              </div>
              <div class="block pt-2 border-t border-rm-border">
                <span class="text-[0.8125rem] font-semibold text-rm-text">Access token</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">Required for listing and searching your repositories.</p>
                <div class="flex flex-wrap items-center gap-2 mt-2">
                  <InputText v-model="giteaToken" type="password" class="flex-1 min-w-0" placeholder="Token" autocomplete="off" @blur="saveGiteaToken" />
                  <Button variant="link" label="Create token" class="text-xs text-rm-accent p-0 min-w-0 h-auto shrink-0" @click="openUrl(((giteaUrl || 'https://gitea.com').replace(/\/+$/, '')) + '/user/settings/applications')" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Azure DevOps -->
        <section v-show="activeSection === 'azureDevOps'" class="settings-section">
          <div class="flex items-start gap-4 p-5 mb-4 rounded-xl border border-rm-accent/25 bg-gradient-to-br from-rm-accent/12 via-rm-accent/[0.04] to-transparent">
            <div class="shrink-0 w-12 h-12 flex items-center justify-center rounded-[10px] bg-rm-accent/20 text-rm-accent" aria-hidden="true" v-html="getSectionMeta('azureDevOps').icon"></div>
            <div>
              <h3 class="text-2xl font-bold text-rm-text tracking-[-0.03em] m-0 mb-1">{{ getSectionMeta('azureDevOps').label }}</h3>
              <p class="text-[0.9375rem] text-rm-muted m-0 leading-normal">{{ getSectionMeta('azureDevOps').description }}</p>
            </div>
          </div>
          <div class="settings-section-card">
            <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 mb-5">
              <div class="block pb-4">
                <span class="text-[0.8125rem] font-semibold text-rm-text">Add from Azure DevOps</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0">Browse your repositories across all projects to clone and add.</p>
              </div>
              <Button label="Clone from Azure DevOps" icon="pi pi-microsoft" size="small" @click="openCloneFromGit?.('azure-devops')" />
            </div>
            <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 space-y-5">
              <div class="block">
                <span class="text-[0.8125rem] font-semibold text-rm-text">Organization</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">Your Azure DevOps organization name (e.g. from dev.azure.com/your-org).</p>
                <InputText v-model="azureDevOpsOrg" type="text" class="max-w-md mt-2" placeholder="my-organization" @blur="saveAzureDevOpsOrg" />
              </div>
              <div class="block pt-2 border-t border-rm-border">
                <span class="text-[0.8125rem] font-semibold text-rm-text">Personal access token</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">PAT with Code (Read) scope for listing repositories.</p>
                <div class="flex flex-wrap items-center gap-2 mt-2">
                  <InputText v-model="azureDevOpsToken" type="password" class="flex-1 min-w-0" placeholder="PAT" autocomplete="off" @blur="saveAzureDevOpsToken" />
                  <Button variant="link" label="Create PAT" class="text-xs text-rm-accent p-0 min-w-0 h-auto shrink-0" @click="openUrl('https://dev.azure.com/_usersSettings/tokens')" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- AI -->
        <section v-show="activeSection === 'ai'" class="settings-section">
          <div class="flex items-start gap-4 p-5 mb-4 rounded-xl border border-rm-accent/25 bg-gradient-to-br from-rm-accent/12 via-rm-accent/[0.04] to-transparent">
            <div class="shrink-0 w-12 h-12 flex items-center justify-center rounded-[10px] bg-rm-accent/20 text-rm-accent" aria-hidden="true" v-html="getSectionMeta('ai').icon"></div>
            <div>
              <h3 class="text-2xl font-bold text-rm-text tracking-[-0.03em] m-0 mb-1">{{ getSectionMeta('ai').label }}</h3>
              <p class="text-[0.9375rem] text-rm-muted m-0 leading-normal">
                {{ getSectionMeta('ai').description }}
                <span v-if="!license.isLoggedIn?.value" class="text-rm-warning"> Sign in required.</span>
              </p>
            </div>
          </div>

          <div class="settings-section-card space-y-5">
            <!-- AI Onboarding -->
            <div v-if="showAiOnboarding" class="rounded-rm border border-rm-border bg-rm-bg/50 p-4">
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

            <div class="block">
              <span class="text-[0.8125rem] font-semibold text-rm-text">Provider</span>
              <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">Choose where to send prompts.</p>
              <Select v-model="aiProvider" :options="aiProviderOptions" optionLabel="label" optionValue="value" class="max-w-xs mt-2" @change="saveAiProvider" />
            </div>

            <!-- Ollama -->
            <div v-if="aiProvider === 'ollama'" class="block pt-2 border-t border-rm-border">
              <span class="text-[0.8125rem] font-semibold text-rm-text">Ollama</span>
              <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0">Local models. No API key needed. <Button variant="link" label="Download Ollama" class="text-rm-accent p-0 min-w-0 h-auto inline" @click="openUrl('https://ollama.com')" /></p>
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
            <div v-if="aiProvider === 'lmstudio'" class="block pt-2 border-t border-rm-border">
              <span class="text-[0.8125rem] font-semibold text-rm-text">LM Studio</span>
              <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0">Local models via OpenAI-compatible API. No API key needed. <Button variant="link" label="Download LM Studio" class="text-rm-accent p-0 min-w-0 h-auto inline" @click="openUrl('https://lmstudio.ai')" /></p>
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
            <div v-if="aiProvider === 'claude'" class="block pt-2 border-t border-rm-border">
              <span class="text-[0.8125rem] font-semibold text-rm-text">Claude (Anthropic)</span>
              <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0">Anthropic API. <Button variant="link" label="Get API key" class="text-rm-accent p-0 min-w-0 h-auto inline" @click="openUrl('https://console.anthropic.com/')" /></p>
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
            <div v-if="aiProvider === 'openai'" class="block pt-2 border-t border-rm-border">
              <span class="text-[0.8125rem] font-semibold text-rm-text">OpenAI</span>
              <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0">OpenAI API. <Button variant="link" label="Get API key" class="text-rm-accent p-0 min-w-0 h-auto inline" @click="openUrl('https://platform.openai.com/api-keys')" /></p>
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
            <div v-if="aiProvider === 'gemini'" class="block pt-2 border-t border-rm-border">
              <span class="text-[0.8125rem] font-semibold text-rm-text">Google Gemini</span>
              <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0">Google AI Studio. <Button variant="link" label="Get API key" class="text-rm-accent p-0 min-w-0 h-auto inline" @click="openUrl('https://aistudio.google.com/apikey')" /></p>
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
            <div v-if="aiProvider === 'groq'" class="block pt-2 border-t border-rm-border">
              <span class="text-[0.8125rem] font-semibold text-rm-text">Groq</span>
              <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0">Fast inference. <Button variant="link" label="Get API key" class="text-rm-accent p-0 min-w-0 h-auto inline" @click="openUrl('https://console.groq.com/keys')" /></p>
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
            <div v-if="aiProvider === 'mistral'" class="block pt-2 border-t border-rm-border">
              <span class="text-[0.8125rem] font-semibold text-rm-text">Mistral AI</span>
              <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0">Mistral API. <Button variant="link" label="Get API key" class="text-rm-accent p-0 min-w-0 h-auto inline" @click="openUrl('https://console.mistral.ai/api-keys/')" /></p>
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
            <div class="block pt-2 border-t border-rm-border">
              <span class="text-[0.8125rem] font-semibold text-rm-text">Model parameters</span>
              <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0">Adjust generation behavior. Used by Ollama and LM Studio; cloud providers may use their defaults.</p>
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
          <div class="flex items-start gap-4 p-5 mb-4 rounded-xl border border-rm-accent/25 bg-gradient-to-br from-rm-accent/12 via-rm-accent/[0.04] to-transparent">
            <div class="shrink-0 w-12 h-12 flex items-center justify-center rounded-[10px] bg-rm-accent/20 text-rm-accent" aria-hidden="true" v-html="getSectionMeta('tools').icon"></div>
            <div>
              <h3 class="text-2xl font-bold text-rm-text tracking-[-0.03em] m-0 mb-1">{{ getSectionMeta('tools').label }}</h3>
              <p class="text-[0.9375rem] text-rm-muted m-0 leading-normal">{{ getSectionMeta('tools').description }}</p>
            </div>
          </div>
          <div class="settings-section-card">

          <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 space-y-5">
            <div class="block">
              <span class="text-[0.8125rem] font-semibold text-rm-text">Preferred editor</span>
              <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">When opening a project or file from the Git section. Cursor and VS Code must be in your PATH.</p>
              <Select v-model="preferredEditor" :options="preferredEditorOptions" optionLabel="label" optionValue="value" class="max-w-xs mt-2" @change="savePreferredEditor" />
            </div>
            <div class="block pt-2 border-t border-rm-border">
              <span class="text-[0.8125rem] font-semibold text-rm-text">Default terminal (macOS)</span>
              <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">When opening a folder or SSH session in your system terminal. Default uses Terminal.app (macOS default).</p>
              <Select v-model="preferredTerminal" :options="preferredTerminalOptions" optionLabel="label" optionValue="value" class="max-w-xs mt-2" @change="savePreferredTerminal" />
            </div>
            <div class="block pt-2 border-t border-rm-border">
              <span class="text-[0.8125rem] font-semibold text-rm-text">PHP executable (default)</span>
              <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">Used for Composer and Pest. Choose a version or enter a custom path.</p>
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
          <div class="flex items-start gap-4 p-5 mb-4 rounded-xl border border-rm-accent/25 bg-gradient-to-br from-rm-accent/12 via-rm-accent/[0.04] to-transparent">
            <div class="shrink-0 w-12 h-12 flex items-center justify-center rounded-[10px] bg-rm-accent/20 text-rm-accent" aria-hidden="true" v-html="getSectionMeta('appearance').icon"></div>
            <div>
              <h3 class="text-2xl font-bold text-rm-text tracking-[-0.03em] m-0 mb-1">{{ getSectionMeta('appearance').label }}</h3>
              <p class="text-[0.9375rem] text-rm-muted m-0 leading-normal">{{ getSectionMeta('appearance').description }}</p>
            </div>
          </div>
          <div class="settings-section-card">
          <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 space-y-5">
            <div class="block">
              <span class="text-[0.8125rem] font-semibold text-rm-text">Theme</span>
              <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">Light, dark, or follow your system.</p>
              <div class="flex flex-wrap gap-2 mt-2">
                <Button
                  v-for="t in themeOptions"
                  :key="t.value"
                  :variant="theme === t.value ? 'outlined' : 'outlined'"
                  size="small"
                  class="px-3 py-2 rounded-rm text-sm font-medium min-w-0"
                  :class="theme === t.value ? 'border-rm-accent bg-rm-accent/15 text-rm-accent' : 'border-rm-border bg-rm-surface hover:bg-rm-surface-hover text-rm-text'"
                  @click="setTheme(t.value)"
                >
                  {{ t.label }}
                </Button>
              </div>
            </div>
            <div class="block pt-2 border-t border-rm-border">
              <span class="text-[0.8125rem] font-semibold text-rm-text">Accent color</span>
              <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">Buttons, links, and highlights.</p>
              <div class="flex flex-wrap gap-2 mt-2">
                <Button
                  v-for="a in accentOptions"
                  :key="a.value"
                  variant="text"
                  size="small"
                  class="w-9 h-9 min-w-[2.25rem] min-h-[2.25rem] p-0 rounded-full border-2 transition-all cursor-pointer border-transparent"
                  :class="accentColor === a.value ? 'border-rm-text scale-110' : 'border-transparent hover:scale-105'"
                  :style="{ backgroundColor: a.hex }"
                  :title="a.label"
                  :aria-label="`Accent ${a.label}`"
                  @click="setAccent(a.value)"
                />
              </div>
            </div>
            <div class="block pt-2 border-t border-rm-border">
              <span class="text-[0.8125rem] font-semibold text-rm-text">Density</span>
              <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">Base font and spacing. Tighter fits more on screen; relaxed is easier to read.</p>
              <Select v-model="fontSize" :options="fontSizeOptions" optionLabel="label" optionValue="value" class="max-w-xs mt-2" @change="saveFontSize" />
            </div>
            <div class="block pt-2 border-t border-rm-border">
              <span class="text-[0.8125rem] font-semibold text-rm-text">UI zoom</span>
              <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">Scale the entire interface (Electron webContents). Useful for high-DPI or accessibility.</p>
              <Select v-model="zoomFactor" :options="zoomOptions" optionLabel="label" optionValue="value" class="max-w-xs mt-2" @change="saveZoomFactor" />
            </div>
            <div class="block pt-2 border-t border-rm-border">
              <span class="text-[0.8125rem] font-semibold text-rm-text">Corner style</span>
              <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">Sharp, rounded, or pill-shaped buttons and inputs.</p>
              <Select v-model="borderRadius" :options="borderRadiusOptions" optionLabel="label" optionValue="value" class="max-w-xs mt-2" @change="saveBorderRadius" />
            </div>
            <div class="block pt-2 border-t border-rm-border">
              <label class="block settings-row-clickable settings-row-checkbox">
              <div class="min-w-0">
                <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Reduce motion</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Minimize animations and transitions. Aligns with system accessibility preferences.</p>
              </div>
              <Checkbox v-model="reducedMotion" binary @update:model-value="saveReducedMotion" class="shrink-0" />
            </label>
            </div>
            <div class="block pt-2 border-t border-rm-border">
              <label class="block settings-row-clickable settings-row-checkbox">
              <div class="min-w-0">
                <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Reduce transparency</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Use solid backgrounds instead of semi-transparent panels. Improves readability (Electron / macOS-style).</p>
              </div>
              <Checkbox v-model="reduceTransparency" binary @update:model-value="saveReduceTransparency" class="shrink-0" />
            </label>
            </div>
            <div class="block pt-2 border-t border-rm-border">
              <label class="block settings-row-clickable settings-row-checkbox">
              <div class="min-w-0">
                <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">High contrast</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Stronger borders and higher-contrast text. Helps with visibility (Electron / accessibility).</p>
              </div>
              <Checkbox v-model="highContrast" binary @update:model-value="saveHighContrast" class="shrink-0" />
            </label>
            </div>
            <div class="block pt-2 border-t border-rm-border">
              <label class="block settings-row-clickable settings-row-checkbox">
              <div class="min-w-0">
                <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Use tabs in project detail</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Switch between Git, Version & release, and other sections with tabs.</p>
              </div>
              <Checkbox v-model="useDetailTabs" binary @update:model-value="saveUseTabs" class="shrink-0" />
            </label>
            </div>
            <div class="block pt-2 border-t border-rm-border">
              <span class="text-[0.8125rem] font-semibold text-rm-text block mb-1">Terminal popout</span>
              <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] mb-3">When you open a terminal in a separate window, these options control its size and behavior (Electron window options).</p>
              <div class="space-y-3">
                <div>
                  <label class="block text-xs font-medium text-rm-muted mb-1">Size</label>
                  <Select v-model="terminalPopoutSize" :options="terminalPopoutSizeOptions" optionLabel="label" optionValue="value" class="max-w-xs" @change="saveTerminalPopoutSize" />
                </div>
                <label class="block settings-row-clickable settings-row-checkbox">
              <div class="min-w-0">
                <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Always on top</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Keep the terminal window above other windows.</p>
              </div>
              <Checkbox v-model="terminalPopoutAlwaysOnTop" binary @update:model-value="saveTerminalPopoutAlwaysOnTop" class="shrink-0" />
            </label>
                <label class="block settings-row-clickable settings-row-checkbox">
              <div class="min-w-0">
                <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Allow fullscreen</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Allow the terminal window to enter fullscreen (e.g. green traffic light on macOS).</p>
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
          <div class="flex items-start gap-4 p-5 mb-4 rounded-xl border border-rm-accent/25 bg-gradient-to-br from-rm-accent/12 via-rm-accent/[0.04] to-transparent">
            <div class="shrink-0 w-12 h-12 flex items-center justify-center rounded-[10px] bg-rm-accent/20 text-rm-accent" aria-hidden="true" v-html="getSectionMeta('network').icon"></div>
            <div>
              <h3 class="text-2xl font-bold text-rm-text tracking-[-0.03em] m-0 mb-1">{{ getSectionMeta('network').label }}</h3>
              <p class="text-[0.9375rem] text-rm-muted m-0 leading-normal">{{ getSectionMeta('network').description }}</p>
            </div>
          </div>
          <div class="settings-section-card">
          <!-- Connectivity status -->
          <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 mb-5">
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-2.5">
                <span class="w-2.5 h-2.5 rounded-full shrink-0" :class="connectivityStatus === 'online' ? 'bg-rm-success shadow-[0_0_0_3px_rgb(var(--rm-success)/0.2)]' : connectivityStatus === 'offline' ? 'bg-rm-danger shadow-[0_0_0_3px_rgb(var(--rm-danger)/0.2)]' : 'bg-rm-muted/40'" />
                <span class="text-[0.8125rem] font-semibold text-rm-text m-0">
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
          <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 space-y-5 mb-5">
            <div class="block">
              <span class="text-[0.8125rem] font-semibold text-rm-text">Proxy</span>
              <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">Use system proxy or set custom (e.g. http://proxy:8080). Leave empty for system.</p>
              <InputText v-model="proxy" type="text" class="mt-2 w-full max-w-md" placeholder="System or http://host:port" @blur="saveProxy" />
            </div>
            <div class="block pt-5 mt-5 border-t border-rm-border">
              <span class="text-[0.8125rem] font-semibold text-rm-text">Request timeout (seconds)</span>
              <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">How long to wait for HTTP requests before timing out.</p>
              <Select v-model="requestTimeoutSeconds" :options="requestTimeoutOptions" optionLabel="label" optionValue="value" class="max-w-xs mt-2" @change="saveRequestTimeout" />
            </div>
          </div>

          <!-- Offline mode -->
          <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 space-y-5">
            <label class="block settings-row-clickable settings-row-checkbox">
              <div class="min-w-0">
                <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Offline mode</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Use the app without a network connection. License, plan, and permissions are cached from your last successful login.</p>
              </div>
              <Checkbox v-model="offlineMode" binary @update:model-value="saveOfflineMode" class="shrink-0" />
            </label>

            <div class="block pt-2 border-t border-rm-border">
              <span class="text-[0.8125rem] font-semibold text-rm-text">Offline grace period</span>
              <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">How many days the app can run offline before requiring you to sign in again to verify your account.</p>
              <Select v-model="offlineGraceDays" :options="offlineGraceDaysOptions" optionLabel="label" optionValue="value" class="max-w-xs mt-2" @change="saveOfflineGraceDays" />
            </div>

            <div v-if="offlineLastVerifiedAt" class="block pt-2 border-t border-rm-border">
              <span class="text-[0.8125rem] font-semibold text-rm-text">Offline status</span>
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

            <div v-if="!offlineLastVerifiedAt && license.isLoggedIn?.value" class="block pt-2 border-t border-rm-border">
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
          <div class="flex items-start gap-4 p-5 mb-4 rounded-xl border border-rm-accent/25 bg-gradient-to-br from-rm-accent/12 via-rm-accent/[0.04] to-transparent">
            <div class="shrink-0 w-12 h-12 flex items-center justify-center rounded-[10px] bg-rm-accent/20 text-rm-accent" aria-hidden="true" v-html="getSectionMeta(ext.id).icon"></div>
            <div>
              <h3 class="text-2xl font-bold text-rm-text tracking-[-0.03em] m-0 mb-1">{{ getSectionMeta(ext.id).label }}</h3>
              <p class="text-[0.9375rem] text-rm-muted m-0 leading-normal">{{ getSectionMeta(ext.id).description }}</p>
            </div>
          </div>
          <div class="settings-section-card">
            <component :is="ext.component" />
          </div>
        </section>

        <!-- Keyboard -->
        <section v-show="activeSection === 'keyboard'" class="settings-section">
          <div class="flex items-start gap-4 p-5 mb-4 rounded-xl border border-rm-accent/25 bg-gradient-to-br from-rm-accent/12 via-rm-accent/[0.04] to-transparent">
            <div class="shrink-0 w-12 h-12 flex items-center justify-center rounded-[10px] bg-rm-accent/20 text-rm-accent" aria-hidden="true" v-html="getSectionMeta('keyboard').icon"></div>
            <div>
              <h3 class="text-2xl font-bold text-rm-text tracking-[-0.03em] m-0 mb-1">{{ getSectionMeta('keyboard').label }}</h3>
              <p class="text-[0.9375rem] text-rm-muted m-0 leading-normal">{{ getSectionMeta('keyboard').description }}</p>
            </div>
          </div>
          <div class="settings-section-card">
          <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 mb-5">
            <h4 class="text-xs font-semibold uppercase tracking-wider text-rm-muted mb-4">Navigation</h4>
            <table class="w-full border-collapse text-[0.8125rem] [&_tr]:border-b [&_tr]:border-rm-border/50 [&_tr:last-child]:border-b-0 [&_td]:py-2 [&_td]:align-middle [&_.shortcut-keys]:w-56 [&_.shortcut-keys]:whitespace-nowrap [&_.shortcut-keys]:pr-6 [&_.shortcut-keys]:text-rm-text [&_td:last-child]:text-rm-muted [&_kbd]:inline-block [&_kbd]:min-w-[1.5em] [&_kbd]:py-[0.15em] [&_kbd]:px-[0.45em] [&_kbd]:font-inherit [&_kbd]:text-[0.75rem] [&_kbd]:font-semibold [&_kbd]:leading-[1.4] [&_kbd]:text-center [&_kbd]:text-rm-text [&_kbd]:bg-rm-bg [&_kbd]:border [&_kbd]:border-rm-border [&_kbd]:rounded [&_kbd]:shadow-[0_1px_0_rgb(var(--rm-border))]">
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

          <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 mb-5">
            <h4 class="text-xs font-semibold uppercase tracking-wider text-rm-muted mb-4">Project detail <span class="font-normal normal-case text-rm-muted/70">(when a project is open)</span></h4>
            <table class="w-full border-collapse text-[0.8125rem] [&_tr]:border-b [&_tr]:border-rm-border/50 [&_tr:last-child]:border-b-0 [&_td]:py-2 [&_td]:align-middle [&_.shortcut-keys]:w-56 [&_.shortcut-keys]:whitespace-nowrap [&_.shortcut-keys]:pr-6 [&_.shortcut-keys]:text-rm-text [&_td:last-child]:text-rm-muted [&_kbd]:inline-block [&_kbd]:min-w-[1.5em] [&_kbd]:py-[0.15em] [&_kbd]:px-[0.45em] [&_kbd]:font-inherit [&_kbd]:text-[0.75rem] [&_kbd]:font-semibold [&_kbd]:leading-[1.4] [&_kbd]:text-center [&_kbd]:text-rm-text [&_kbd]:bg-rm-bg [&_kbd]:border [&_kbd]:border-rm-border [&_kbd]:rounded [&_kbd]:shadow-[0_1px_0_rgb(var(--rm-border))]">
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

          <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 mb-5">
            <h4 class="text-xs font-semibold uppercase tracking-wider text-rm-muted mb-4">Standard <span class="font-normal normal-case text-rm-muted/70">(Electron / OS defaults)</span></h4>
            <table class="w-full border-collapse text-[0.8125rem] [&_tr]:border-b [&_tr]:border-rm-border/50 [&_tr:last-child]:border-b-0 [&_td]:py-2 [&_td]:align-middle [&_.shortcut-keys]:w-56 [&_.shortcut-keys]:whitespace-nowrap [&_.shortcut-keys]:pr-6 [&_.shortcut-keys]:text-rm-text [&_td:last-child]:text-rm-muted [&_kbd]:inline-block [&_kbd]:min-w-[1.5em] [&_kbd]:py-[0.15em] [&_kbd]:px-[0.45em] [&_kbd]:font-inherit [&_kbd]:text-[0.75rem] [&_kbd]:font-semibold [&_kbd]:leading-[1.4] [&_kbd]:text-center [&_kbd]:text-rm-text [&_kbd]:bg-rm-bg [&_kbd]:border [&_kbd]:border-rm-border [&_kbd]:rounded [&_kbd]:shadow-[0_1px_0_rgb(var(--rm-border))]">
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

          <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6">
            <h4 class="text-xs font-semibold uppercase tracking-wider text-rm-muted mb-4">Command palette commands</h4>
            <p class="text-sm text-rm-muted mb-3">Open the command palette with <kbd class="inline-block min-w-[1.5em] py-[0.15em] px-[0.45em] font-inherit text-[0.75rem] font-semibold leading-[1.4] text-center text-rm-text bg-rm-bg border border-rm-border rounded shadow-[0_1px_0_rgb(var(--rm-border))]">{{ modKey }}</kbd> + <kbd class="inline-block min-w-[1.5em] py-[0.15em] px-[0.45em] font-inherit text-[0.75rem] font-semibold leading-[1.4] text-center text-rm-text bg-rm-bg border border-rm-border rounded shadow-[0_1px_0_rgb(var(--rm-border))]">Shift</kbd> + <kbd class="inline-block min-w-[1.5em] py-[0.15em] px-[0.45em] font-inherit text-[0.75rem] font-semibold leading-[1.4] text-center text-rm-text bg-rm-bg border border-rm-border rounded shadow-[0_1px_0_rgb(var(--rm-border))]">P</kbd>, then type to search:</p>
            <div class="flex flex-wrap gap-2">
              <span v-for="cmd in paletteCommands" :key="cmd" class="palette-cmd-badge">{{ cmd }}</span>
            </div>
          </div>
          </div>
        </section>

        <!-- Data & privacy -->
        <section v-show="activeSection === 'dataPrivacy'" class="settings-section">
          <div class="flex items-start gap-4 p-5 mb-4 rounded-xl border border-rm-accent/25 bg-gradient-to-br from-rm-accent/12 via-rm-accent/[0.04] to-transparent">
            <div class="shrink-0 w-12 h-12 flex items-center justify-center rounded-[10px] bg-rm-accent/20 text-rm-accent" aria-hidden="true" v-html="getSectionMeta('dataPrivacy').icon"></div>
            <div>
              <h3 class="text-2xl font-bold text-rm-text tracking-[-0.03em] m-0 mb-1">{{ getSectionMeta('dataPrivacy').label }}</h3>
              <p class="text-[0.9375rem] text-rm-muted m-0 leading-normal">{{ getSectionMeta('dataPrivacy').description }}</p>
            </div>
          </div>
          <div class="settings-section-card">
          <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 space-y-5">
            <label class="block settings-row-clickable settings-row-checkbox">
              <div class="min-w-0">
                <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Usage data</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Send anonymous usage events (e.g. app opened, views and tabs used) to help improve the app.</p>
              </div>
              <Checkbox v-model="telemetry" binary @update:model-value="saveTelemetry" class="shrink-0" />
            </label>
            <label class="block settings-row-clickable settings-row-checkbox pt-2 border-t border-rm-border">
              <div class="min-w-0">
                <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Crash reports</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Send crash reports to help fix bugs. Reports are sent to the same backend as your account.</p>
              </div>
              <Checkbox v-model="crashReports" binary @update:model-value="saveCrashReports" class="shrink-0" />
            </label>
            <div class="block pt-2 border-t border-rm-border">
              <span class="text-[0.8125rem] font-semibold text-rm-text">Settings backup</span>
              <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">Export or import preferences. Reset restores defaults (does not remove projects).</p>
              <div class="flex flex-wrap gap-2 mt-2">
                <Button severity="secondary" size="small" @click="exportSettingsToFile">Export</Button>
                <Button severity="secondary" size="small" @click="importSettingsFromFile">Import</Button>
                <Button severity="danger" size="small" @click="confirmResetSettings">Reset</Button>
              </div>
              <Message v-if="dataPrivacyMessage" :severity="dataPrivacyMessageOk ? 'success' : 'warn'" class="mt-2 text-sm">{{ dataPrivacyMessage }}</Message>
            </div>

            <div class="block pt-2 border-t border-rm-border">
              <span class="text-[0.8125rem] font-semibold text-rm-text">Cloud sync</span>
              <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">
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

            <div class="block pt-2 border-t border-rm-border">
              <span class="text-[0.8125rem] font-semibold text-rm-text">Project sync</span>
              <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">
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
          <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 space-y-4">
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
          <div class="flex items-start gap-4 p-5 mb-4 rounded-xl border border-rm-accent/25 bg-gradient-to-br from-rm-accent/12 via-rm-accent/[0.04] to-transparent">
            <div class="shrink-0 w-12 h-12 flex items-center justify-center rounded-[10px] bg-rm-accent/20 text-rm-accent" aria-hidden="true" v-html="getSectionMeta('window').icon"></div>
            <div>
              <h3 class="text-2xl font-bold text-rm-text tracking-[-0.03em] m-0 mb-1">{{ getSectionMeta('window').label }}</h3>
              <p class="text-[0.9375rem] text-rm-muted m-0 leading-normal">{{ getSectionMeta('window').description }}</p>
            </div>
          </div>
          <div class="settings-section-card">
          <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 space-y-5">
            <label class="block settings-row-clickable settings-row-checkbox">
              <div class="min-w-0">
                <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Always on top</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Keep the app window above other windows.</p>
              </div>
              <Checkbox v-model="alwaysOnTop" binary @update:model-value="saveAlwaysOnTop" class="shrink-0" />
            </label>
            <label class="block settings-row-clickable settings-row-checkbox pt-2 border-t border-rm-border">
              <div class="min-w-0">
                <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Minimize to tray</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Closing the window hides it to the system tray instead of quitting.</p>
              </div>
              <Checkbox v-model="minimizeToTray" binary @update:model-value="saveMinimizeToTray" class="shrink-0" />
            </label>
          </div>
          </div>
        </section>

        <!-- Accessibility -->
        <section v-show="activeSection === 'accessibility'" class="settings-section">
          <div class="flex items-start gap-4 p-5 mb-4 rounded-xl border border-rm-accent/25 bg-gradient-to-br from-rm-accent/12 via-rm-accent/[0.04] to-transparent">
            <div class="shrink-0 w-12 h-12 flex items-center justify-center rounded-[10px] bg-rm-accent/20 text-rm-accent" aria-hidden="true" v-html="getSectionMeta('accessibility').icon"></div>
            <div>
              <h3 class="text-2xl font-bold text-rm-text tracking-[-0.03em] m-0 mb-1">{{ getSectionMeta('accessibility').label }}</h3>
              <p class="text-[0.9375rem] text-rm-muted m-0 leading-normal">{{ getSectionMeta('accessibility').description }}</p>
            </div>
          </div>
          <div class="settings-section-card">
          <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 space-y-5">
            <label class="block settings-row-clickable settings-row-checkbox">
              <div class="min-w-0">
                <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Always show focus outline</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Show a visible focus ring on keyboard focus.</p>
              </div>
              <Checkbox v-model="focusOutlineVisible" binary @update:model-value="saveFocusOutlineVisible" class="shrink-0" />
            </label>
            <label class="block settings-row-clickable settings-row-checkbox pt-2 border-t border-rm-border">
              <div class="min-w-0">
                <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Large cursor in inputs</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Use a larger text cursor in input fields.</p>
              </div>
              <Checkbox v-model="largeCursor" binary @update:model-value="saveLargeCursor" class="shrink-0" />
            </label>
            <label class="block settings-row-clickable settings-row-checkbox pt-2 border-t border-rm-border">
              <div class="min-w-0">
                <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Screen reader support</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Announce live regions for assistive technologies.</p>
              </div>
              <Checkbox v-model="screenReaderSupport" binary @update:model-value="saveScreenReaderSupport" class="shrink-0" />
            </label>
          </div>
          </div>
        </section>

        <!-- Webhooks -->
        <section v-show="activeSection === 'webhooks'" class="settings-section">
          <div class="flex items-start gap-4 p-5 mb-4 rounded-xl border border-rm-accent/25 bg-gradient-to-br from-rm-accent/12 via-rm-accent/[0.04] to-transparent">
            <div class="shrink-0 w-12 h-12 flex items-center justify-center rounded-[10px] bg-rm-accent/20 text-rm-accent" aria-hidden="true" v-html="getSectionMeta('webhooks').icon"></div>
            <div>
              <h3 class="text-2xl font-bold text-rm-text tracking-[-0.03em] m-0 mb-1">{{ getSectionMeta('webhooks').label }}</h3>
              <p class="text-[0.9375rem] text-rm-muted m-0 leading-normal">{{ getSectionMeta('webhooks').description }}</p>
            </div>
          </div>
          <div class="settings-section-card">
          <!-- Not logged in -->
          <div v-if="!license.isLoggedIn?.value" class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6">
            <div class="block">
              <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] text-rm-warning">Sign in to manage webhooks.</p>
            </div>
          </div>

          <template v-else>
            <!-- Toolbar -->
            <div class="flex items-center justify-between gap-3 mb-4">
              <Button severity="primary" size="small" label="Add webhook" @click="openWebhookDialog(null)" />
              <Button severity="secondary" size="small" icon="pi pi-refresh" :loading="whLoading" @click="loadWebhooks" v-tooltip.bottom="'Refresh'" />
            </div>

            <!-- Loading -->
            <div v-if="whLoading && !whList.length" class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6">
              <div class="block">
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] text-rm-muted">Loading webhooks…</p>
              </div>
            </div>

            <!-- Error -->
            <p v-if="whError" class="text-sm text-red-500 mb-3 m-0">{{ whError }}</p>

            <!-- Empty state -->
            <div v-if="!whLoading && !whList.length && !whError" class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6">
              <div class="block text-center py-6">
                <div class="text-rm-muted mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" class="inline-block w-10 h-10 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2"/><path d="m6 17 3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06"/><path d="m12 6 3.13 5.73C15.66 12.7 16.9 13 18 13a4 4 0 0 1 0 8H12"/></svg>
                </div>
                <p class="text-[0.8125rem] font-semibold text-rm-text">No webhooks configured</p>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 mt-1">Webhooks let you send real-time notifications to external services when events happen.</p>
              </div>
            </div>

            <!-- Webhook list -->
            <div v-for="wh in whList" :key="wh.id" class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 mb-3">
              <div class="block flex items-start justify-between gap-3">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-[0.8125rem] font-semibold text-rm-text text-sm font-semibold truncate max-w-[20rem]" :title="wh.url">{{ wh.url }}</span>
                    <span
                      class="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                      :class="wh.is_active ? 'text-rm-success bg-rm-success/12' : 'text-rm-muted bg-rm-surface-hover/50'"
                    >
                      {{ wh.is_active ? 'Active' : 'Inactive' }}
                    </span>
                  </div>
                  <p v-if="wh.description" class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 mt-0.5 text-xs">{{ wh.description }}</p>
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
                <label class="text-[0.8125rem] font-semibold text-rm-text block mb-1" for="wh-url">URL</label>
                <InputText id="wh-url" v-model="whForm.url" placeholder="https://example.com/webhook" class="w-full" />
              </div>
              <div>
                <label class="text-[0.8125rem] font-semibold text-rm-text block mb-1" for="wh-desc">Description</label>
                <InputText id="wh-desc" v-model="whForm.description" placeholder="Optional description" class="w-full" />
              </div>
              <div>
                <label class="text-[0.8125rem] font-semibold text-rm-text block mb-1" for="wh-secret">Secret</label>
                <InputText id="wh-secret" v-model="whForm.secret" placeholder="Optional signing secret" class="w-full" type="password" />
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 mt-1">Used to sign payloads so you can verify authenticity.</p>
              </div>
              <div v-if="whAvailableEvents.length">
                <span class="text-[0.8125rem] font-semibold text-rm-text block mb-2">Events</span>
                <div class="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-0 max-h-56 overflow-y-auto py-1">
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
          <div class="flex items-start gap-4 p-5 mb-4 rounded-xl border border-rm-accent/25 bg-gradient-to-br from-rm-accent/12 via-rm-accent/[0.04] to-transparent">
            <div class="shrink-0 w-12 h-12 flex items-center justify-center rounded-[10px] bg-rm-accent/20 text-rm-accent" aria-hidden="true" v-html="getSectionMeta('developer').icon"></div>
            <div>
              <h3 class="text-2xl font-bold text-rm-text tracking-[-0.03em] m-0 mb-1">{{ getSectionMeta('developer').label }}</h3>
              <p class="text-[0.9375rem] text-rm-muted m-0 leading-normal">{{ getSectionMeta('developer').description }}</p>
            </div>
          </div>
          <div class="settings-section-card">
          <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6">
            <label class="block settings-row-clickable settings-row-checkbox">
              <div class="min-w-0">
                <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Enable debug logging</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Log app actions (project load, IPC, preferences, nav). Renderer logs in DevTools; main process in terminal.</p>
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
import ProgressSpinner from 'primevue/progressspinner';
import Dialog from 'primevue/dialog';
import Divider from 'primevue/divider';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import ToggleSwitch from 'primevue/toggleswitch';
import Message from 'primevue/message';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import SelectButton from 'primevue/selectbutton';
import { computed, ref, watch, onMounted, inject, provide } from 'vue';
import { useSettings } from '../composables/useSettings';
import { useNotificationPreferences } from '../composables/useNotificationPreferences';
import { useApi } from '../composables/useApi';
import { useModals } from '../composables/useModals';
import { useExtensionPrefs } from '../composables/useExtensionPrefs';
import { useExtensionAnalytics } from '../composables/useExtensionAnalytics';
import { useNotifications } from '../composables/useNotifications';

import { useAppStore } from '../stores/app';
import SettingsSectionAccount from '../components/settings/SettingsSectionAccount.vue';
import { SETTINGS_INJECTION_KEY } from '../components/settings/settingsInjectionKey';

const modals = useModals();
const api = useApi();
const appStore = useAppStore();
const openCloneFromGit = inject('openCloneFromGit', null);
const extPrefs = useExtensionPrefs();
const extAnalytics = useExtensionAnalytics();
const extNotifications = useNotifications();

const extSearchQuery = ref('');
const extFilterMode = ref('all');
const extInstalledCount = computed(() => extRegistryList.value.filter(i => extIsInstalled(i.slug || i.id)).length);
const extEnabledCount = computed(() => extRegistryList.value.filter(i => {
  const slug = i.slug || i.id;
  return extIsInstalled(slug) && extPrefs.isEnabled(slug);
}).length);
const extDisabledCount = computed(() => extInstalledCount.value - extEnabledCount.value);
const extFilterTabs = computed(() => {
  const total = extRegistryList.value.length;
  const inst = extInstalledCount.value;
  const tabs = [
    { label: 'All', value: 'all', count: total },
    { label: 'Installed', value: 'installed', count: inst },
  ];
  if (total - inst > 0) tabs.push({ label: 'Available', value: 'not_installed', count: total - inst });
  if (extDisabledCount.value > 0) tabs.push({ label: 'Disabled', value: 'disabled', count: extDisabledCount.value });
  return tabs;
});
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
  else if (extFilterMode.value === 'disabled') list = list.filter((item) => {
    const slug = item.slug || item.id;
    return extIsInstalled(slug) && !extPrefs.isEnabled(slug);
  });
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
function extCardPlanBorderClass(plan) {
  if (plan === 'pro') return 'border-l-[3px] border-l-purple-500';
  if (plan === 'team') return 'border-l-[3px] border-l-blue-500';
  if (plan === 'developer') return 'border-l-[3px] border-l-amber-500';
  return 'border-l-[3px] border-l-rm-success';
}

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

function extToPlain(item) {
  return {
    id: item?.id,
    slug: item?.slug,
    name: item?.name,
    description: item?.description,
    version: item?.version,
    download_url: item?.download_url,
    github_repo: item?.github_repo,
  };
}

async function extInstall(item) {
  if (item.accessible === false) { extOpenUpgrade(); return; }
  const extId = item.slug || item.id;
  extInstallingId.value = extId;
  extRegistryError.value = '';
  try {
    let result;
    const plain = extToPlain(item);
    if (item.github_repo) result = await window.releaseManager?.installExtensionFromGitHub?.(plain);
    else if (item.download_url) result = await window.releaseManager?.installExtension?.(extId, plain, item.download_url);
    else { extRegistryError.value = 'No download source'; return; }
    if (result?.ok) {
      const fresh = await window.releaseManager?.getInstalledUserExtensions?.() || [];
      if (fresh.some((u) => u.id === extId || u.id === String(extId))) {
        extInstalledUser.value = fresh;
      } else {
        extInstalledUser.value = [...fresh, { id: extId, name: item.name || extId, version: item.version || '1.0.0', description: item.description || '' }];
      }
      await window.__loadUserExtension?.(extId);
    } else extRegistryError.value = result?.error || 'Install failed';
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

const settingsFromUseSettings = useSettings();
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
  gitlabToken,
  gitlabUrl,
  bitbucketUsername,
  bitbucketToken,
  giteaToken,
  giteaUrl,
  azureDevOpsToken,
  azureDevOpsOrg,
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
  saveGitLabToken,
  saveGitLabUrl,
  saveBitbucketUsername,
  saveBitbucketToken,
  saveGiteaToken,
  saveGiteaUrl,
  saveAzureDevOpsToken,
  saveAzureDevOpsOrg,
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
} = settingsFromUseSettings;

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

watch(() => appStore.pendingSettingsSection, (section) => {
  if (section && typeof section === 'string') {
    activeSection.value = section;
    appStore.clearPendingSettingsSection();
  }
}, { immediate: true });

onMounted(async () => {
  if (!license.isLoggedIn?.value) {
    activeSection.value = 'account';
  }
  if (appStore.pendingSettingsSection) {
    activeSection.value = appStore.pendingSettingsSection;
    appStore.clearPendingSettingsSection();
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

provide(SETTINGS_INJECTION_KEY, {
  ...settingsFromUseSettings,
  signOut,
  planOptions,
  selectedPlan,
  switchingPlan,
  onPlanSwitch,
  isDeveloperPlan,
});

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
/* Section fade animation — cannot express @keyframes in Tailwind */
.settings-section {
  animation: settings-fade 0.15s ease-out;
}
@keyframes settings-fade {
  from { opacity: 0.6; }
  to { opacity: 1; }
}

/* Section card with complex ::before gradient overlay — keep in CSS */
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

/* Parent hover for clickable rows — pseudo-selector */
.settings-row-clickable:hover .min-w-0 > span:first-of-type {
  color: rgb(var(--rm-accent));
}
.settings-nav-icon :deep(svg) {
  stroke: currentColor;
  color: inherit;
}

/* GitHub status checking animation — @keyframes */
.gh-status-checking {
  background: rgb(var(--rm-muted) / 0.4);
  animation: gh-pulse 1s infinite alternate;
}
@keyframes gh-pulse {
  from { opacity: 0.4; }
  to { opacity: 1; }
}

/* PrimeVue :deep overrides */
.plan-switcher :deep(.p-select) { font-size: 0.75rem; height: 28px; }
.wh-dialog :deep(.p-dialog-content) {
  padding-top: 0.75rem;
}
</style>
