<template>
  <section v-show="activeSection === 'notifications'" class="settings-section">
    <SettingsSectionHeader :meta="getSectionMeta('notifications')" />
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
</template>

<script setup>
import { inject } from 'vue';
import Checkbox from 'primevue/checkbox';
import Message from 'primevue/message';
import SettingsSectionHeader from './SettingsSectionHeader.vue';
import { SETTINGS_INJECTION_KEY } from './settingsInjectionKey';

const ctx = inject(SETTINGS_INJECTION_KEY);
const {
  getSectionMeta,
  license,
  activeSection,
  notificationsEnabled,
  notificationSound,
  notificationsOnlyWhenNotFocused,
  saveNotificationsEnabled,
  saveNotificationSound,
  saveNotificationsOnlyWhenNotFocused,
  notifPrefs,
  notifPrefsLoading,
  notifPrefsError,
  notifPrefsSaveMessage,
  notifPrefsSaving,
  notifPrefsCategories,
  notifPrefsTypesForCategory,
  saveNotifPrefs,
} = ctx;
</script>
