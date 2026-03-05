<template>
  <GitPanelCard :title="panelTitle" :icon="panelIcon" :collapsible="true" :defaultOpen="true" class="bisect-card">
    <!-- Active session: test & mark -->
    <template v-if="bisect.status.active">
      <div class="bisect-active-intro text-xs text-rm-muted mb-3 p-2.5 rounded-rm border border-rm-border bg-rm-surface/30">
        <p class="m-0 font-medium text-rm-text mb-1">Test this commit</p>
        <p class="m-0">Run your app or tests. If the bug is <strong>present</strong>, mark <strong>Bad</strong>. If the bug is <strong>absent</strong>, mark <strong>Good</strong>.</p>
      </div>
      <p class="text-xs text-rm-muted mb-1 font-mono">{{ bisect.status.current }}</p>
      <p v-if="bisect.status.remaining" class="text-xs text-rm-muted mb-3">~{{ bisect.status.remaining }} revisions left to test</p>
      <div class="flex flex-wrap gap-2 mb-2">
        <Button severity="primary" size="small" class="text-xs" @click="bisect.markGood">Good</Button>
        <Button severity="danger" size="small" class="text-xs" @click="bisect.markBad">Bad</Button>
        <Button severity="secondary" size="small" class="text-xs" title="Skip this commit (e.g. does not build)" @click="bisect.markSkip">Skip</Button>
        <Button severity="secondary" size="small" class="text-xs" @click="bisect.resetBisect">Reset bisect</Button>
      </div>
      <div v-if="bisect.canRunTests" class="mb-3">
        <Button severity="secondary" size="small" class="text-xs" :disabled="bisect.runTestsBusy" @click="bisect.runTestsHere">
          {{ bisect.runTestsBusy ? 'Running…' : 'Run tests' }}
        </Button>
        <span v-if="bisect.lastTestResult" class="ml-2 text-[11px]" :class="bisect.lastTestResult.ok ? 'text-rm-success' : 'text-rm-warning'">{{ bisect.lastTestResult.ok ? 'Passed (mark Good)' : 'Failed (mark Bad)' }}</span>
      </div>
      <div v-if="bisect.canRunTests && bisect.testScripts.length > 0" class="mb-3 p-2.5 rounded-rm border border-rm-border bg-rm-surface/20">
        <p class="text-[11px] font-medium text-rm-text m-0 mb-1.5">Automated bisect</p>
        <p class="text-[11px] text-rm-muted m-0 mb-2">Run bisect with a script: exit 0 = good, non-zero = bad.</p>
        <div class="flex flex-wrap items-center gap-2">
          <Select v-model="bisect.selectedBisectScript" :options="bisect.bisectScriptOptions" optionLabel="label" optionValue="value" class="text-xs py-1 px-2 min-w-0 max-w-[10rem]" />
          <Button severity="primary" size="small" class="text-xs" :disabled="bisect.bisectRunBusy" @click="bisect.runAutomatedBisect">
            {{ bisect.bisectRunBusy ? 'Running…' : 'Run bisect' }}
          </Button>
        </div>
      </div>
      <p v-if="bisect.status.good || bisect.status.bad" class="text-[11px] text-rm-muted mt-2">
        <span v-if="bisect.status.good">Good: {{ bisect.status.good }}</span>
        <span v-if="bisect.status.good && bisect.status.bad"> · </span>
        <span v-if="bisect.status.bad">Bad: {{ bisect.status.bad }}</span>
      </p>
    </template>

    <!-- Not started: intro / wizard -->
    <template v-else>
      <BisectIntro />
      <p class="text-xs text-rm-muted mb-3">Mark a "bad" ref (has the bug) and a "good" ref (no bug), then test each checkout and mark Good or Bad.</p>
      <Button severity="primary" size="small" class="text-xs" @click="bisect.startBisect">Start bisect</Button>
    </template>

    <Message v-if="bisect.error" severity="warn" class="mt-2 text-xs">{{ bisect.error }}</Message>
  </GitPanelCard>
</template>

<script setup>
import { computed } from 'vue';
import Button from 'primevue/button';
import Message from 'primevue/message';
import Select from 'primevue/select';
import GitPanelCard from '../GitPanelCard.vue';
import BisectIntro from './BisectIntro.vue';
import { useBisect } from './useBisect.js';

const props = defineProps({ info: { type: Object, default: null }, panelTitle: { type: String, default: 'Bisect' }, panelIcon: { type: String, default: '' } });
const emit = defineEmits(['refresh']);

const projectType = computed(() => (props.info?.projectType || '').toLowerCase());
const bisect = useBisect({ projectTypeRef: projectType, onRefresh: () => emit('refresh') });
</script>
