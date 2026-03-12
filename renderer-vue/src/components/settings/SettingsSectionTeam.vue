<template>
  <section v-show="activeSection === 'team'" class="settings-section">
    <SettingsSectionHeader :meta="getSectionMeta('team')" />
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
</template>

<script setup>
import { inject } from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import SettingsSectionHeader from './SettingsSectionHeader.vue';
import { SETTINGS_INJECTION_KEY } from './settingsInjectionKey';

const ctx = inject(SETTINGS_INJECTION_KEY);
const {
  getSectionMeta,
  license,
  activeSection,
  openSubscriptionPage,
  teamData,
  teamsList,
  activeTeamId,
  teamInvites,
  teamError,
  teamRefreshing,
  teamCreating,
  teamRenaming,
  teamLeaving,
  inviteSending,
  inviteSuccess,
  inviteError,
  removingMemberId,
  cancellingInviteId,
  newTeamName,
  renameTeamName,
  inviteEmail,
  inviteRole,
  teamMyRole,
  memberInitials,
  formatInviteDate,
  refreshTeamData,
  onActiveTeamChange,
  handleCreateTeam,
  handleRenameTeam,
  handleRemoveMember,
  handleLeaveTeam,
  handleInvite,
  handleCancelInvite,
} = ctx;
</script>
