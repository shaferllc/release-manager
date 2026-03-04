<template>
  <div class="git-card bisect-card">
    <RmCardHeader tag="p" class="mb-2">Bisect</RmCardHeader>

    <!-- Active session: test & mark -->
    <template v-if="status.active">
      <div class="bisect-active-intro text-xs text-rm-muted mb-3 p-2.5 rounded-rm border border-rm-border bg-rm-surface/30">
        <p class="m-0 font-medium text-rm-text mb-1">Test this commit</p>
        <p class="m-0">Run your app or tests. If the bug is <strong>present</strong>, mark <strong>Bad</strong>. If the bug is <strong>absent</strong>, mark <strong>Good</strong>.</p>
      </div>
      <p class="text-xs text-rm-muted mb-1 font-mono">{{ status.current }}</p>
      <p v-if="status.remaining" class="text-xs text-rm-muted mb-3">~{{ status.remaining }} revisions left to test</p>
      <div class="flex flex-wrap gap-2 mb-2">
        <RmButton variant="primary" size="compact" class="text-xs" @click="markGood">Good</RmButton>
        <RmButton variant="secondary" size="compact" class="text-xs text-rm-warning hover:bg-rm-warning/10" @click="markBad">Bad</RmButton>
        <RmButton variant="secondary" size="compact" class="text-xs" title="Skip this commit (e.g. does not build)" @click="markSkip">Skip</RmButton>
        <RmButton variant="secondary" size="compact" class="text-xs" @click="resetBisect">Reset bisect</RmButton>
      </div>
      <div v-if="canRunTests" class="mb-3">
        <RmButton variant="secondary" size="compact" class="text-xs" :disabled="runTestsBusy" @click="runTestsHere">
          {{ runTestsBusy ? 'Running…' : 'Run tests' }}
        </RmButton>
        <span v-if="lastTestResult" class="ml-2 text-[11px]" :class="lastTestResult.ok ? 'text-rm-success' : 'text-rm-warning'">{{ lastTestResult.ok ? 'Passed (mark Good)' : 'Failed (mark Bad)' }}</span>
      </div>
      <div v-if="canRunTests && testScripts.length > 0" class="mb-3 p-2.5 rounded-rm border border-rm-border bg-rm-surface/20">
        <p class="text-[11px] font-medium text-rm-text m-0 mb-1.5">Automated bisect</p>
        <p class="text-[11px] text-rm-muted m-0 mb-2">Run bisect with a script: exit 0 = good, non-zero = bad.</p>
        <div class="flex flex-wrap items-center gap-2">
          <RmSelect v-model="selectedBisectScript" :options="bisectScriptOptions" option-label="label" option-value="value" class="text-xs py-1 px-2 min-w-0 max-w-[10rem]" />
          <RmButton variant="primary" size="compact" class="text-xs" :disabled="bisectRunBusy" @click="runAutomatedBisect">
            {{ bisectRunBusy ? 'Running…' : 'Run bisect' }}
          </RmButton>
        </div>
      </div>
      <p v-if="status.good || status.bad" class="text-[11px] text-rm-muted mt-2">
        <span v-if="status.good">Good: {{ status.good }}</span>
        <span v-if="status.good && status.bad"> · </span>
        <span v-if="status.bad">Bad: {{ status.bad }}</span>
      </p>
    </template>

    <!-- Not started: intro / wizard -->
    <template v-else>
      <div v-if="showIntro" class="bisect-intro mb-4 space-y-3">
        <p class="text-xs text-rm-muted m-0">
          <strong class="text-rm-text">Git bisect</strong> finds the commit that introduced a bug using binary search. You point to one “bad” commit (has the bug) and one “good” commit (no bug); Git checks out a commit in the middle and you repeat until the first bad commit is found.
        </p>
        <div class="bisect-steps rounded-rm border border-rm-border bg-rm-surface/20 p-3 text-xs">
          <p class="font-medium text-rm-text m-0 mb-2">Steps</p>
          <ol class="m-0 pl-4 space-y-1.5 text-rm-muted list-decimal">
            <li><strong class="text-rm-text">Set refs</strong> — Choose the bad ref (e.g. HEAD) and a good ref (e.g. main or an older commit).</li>
            <li><strong class="text-rm-text">Test</strong> — Git checks out a commit in the range. Run your app or tests.</li>
            <li><strong class="text-rm-text">Mark</strong> — Click Good if the bug is absent, Bad if it’s present.</li>
            <li><strong class="text-rm-text">Repeat</strong> — Git narrows the range until it reports the first bad commit.</li>
          </ol>
        </div>
        <button type="button" class="text-[11px] text-rm-muted hover:text-rm-accent border-0 bg-transparent cursor-pointer p-0" @click="showIntro = false">Hide intro</button>
      </div>
      <div v-else class="mb-3">
        <button type="button" class="text-[11px] text-rm-muted hover:text-rm-accent border-0 bg-transparent cursor-pointer p-0" @click="showIntro = true">What is bisect?</button>
      </div>
      <p class="text-xs text-rm-muted mb-3">Mark a “bad” ref (has the bug) and a “good” ref (no bug), then test each checkout and mark Good or Bad.</p>
      <RmButton variant="primary" size="compact" class="text-xs" @click="startBisect">Start bisect</RmButton>
    </template>

    <p v-if="error" class="m-0 mt-2 text-xs text-rm-warning">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { RmButton, RmCardHeader, RmSelect } from '../../ui';
import { useAppStore } from '../../../stores/app';
import { useApi } from '../../../composables/useApi';
import { useModals } from '../../../composables/useModals';

const props = defineProps({ info: { type: Object, default: null } });
const emit = defineEmits(['refresh']);
const store = useAppStore();
const api = useApi();
const modals = useModals();
const status = ref({ active: false, current: '', remaining: '', good: '', bad: '' });
const error = ref('');
const showIntro = ref(true);
const projectType = computed(() => (props.info?.projectType || '').toLowerCase());
const canRunTests = computed(() => status.value.active && (projectType.value === 'npm' || projectType.value === 'php'));
const testScripts = ref([]);
const selectedBisectScript = ref('');
const bisectScriptOptions = computed(() => testScripts.value.map((s) => ({ value: s, label: s })));
const runTestsBusy = ref(false);
const bisectRunBusy = ref(false);
const lastTestResult = ref(null);

async function load() {
  const path = store.selectedPath;
  if (!path || !api.getBisectStatus) return;
  error.value = '';
  try {
    const r = await api.getBisectStatus(path);
    status.value = {
      active: !!r?.active,
      current: r?.current || '',
      remaining: r?.remaining ?? '',
      good: r?.good ?? '',
      bad: r?.bad ?? '',
    };
  } catch {
    status.value = { active: false, current: '', remaining: '', good: '', bad: '' };
  }
}

watch(() => store.selectedPath, load, { immediate: true });
watch([() => props.info?.projectType, () => status.value.active], loadTestScripts, { immediate: true });

async function loadTestScripts() {
  if (!status.value.active || !store.selectedPath || !api.getProjectTestScripts) {
    testScripts.value = [];
    selectedBisectScript.value = '';
    return;
  }
  const type = projectType.value;
  if (type !== 'npm' && type !== 'php') {
    testScripts.value = [];
    return;
  }
  try {
    const r = await api.getProjectTestScripts(store.selectedPath, type);
    const list = r?.ok && Array.isArray(r?.scripts) ? r.scripts : [];
    testScripts.value = list;
    if (list.length && !list.includes(selectedBisectScript.value)) selectedBisectScript.value = list[0];
  } catch {
    testScripts.value = [];
  }
}

function startBisect() {
  const path = store.selectedPath;
  if (!path) return;
  modals.openModal('bisectRefPicker', {
    dirPath: path,
    defaultBad: 'HEAD',
    defaultGood: '',
    onConfirm: async ({ badRef, goodRef }) => {
      if (!api.bisectStart) return;
      error.value = '';
      try {
        await api.bisectStart(path, badRef, goodRef);
        load();
        emit('refresh');
      } catch (e) {
        error.value = e?.message || 'Bisect start failed.';
      }
    },
  });
}

async function markGood() {
  const path = store.selectedPath;
  if (!path || !api.bisectGood) return;
  error.value = '';
  try {
    await api.bisectGood(path);
    load();
    emit('refresh');
  } catch (e) {
    error.value = e?.message || 'Failed.';
  }
}

async function markBad() {
  const path = store.selectedPath;
  if (!path || !api.bisectBad) return;
  error.value = '';
  try {
    await api.bisectBad(path);
    load();
    emit('refresh');
  } catch (e) {
    error.value = e?.message || 'Failed.';
  }
}

async function markSkip() {
  const path = store.selectedPath;
  if (!path || !api.bisectSkip) return;
  error.value = '';
  try {
    await api.bisectSkip(path);
    load();
    emit('refresh');
  } catch (e) {
    error.value = e?.message || 'Skip failed.';
  }
}

async function runTestsHere() {
  const path = store.selectedPath;
  const type = projectType.value;
  if (!path || !api.runProjectTests || (type !== 'npm' && type !== 'php')) return;
  const script = testScripts.value[0] || 'test';
  runTestsBusy.value = true;
  lastTestResult.value = null;
  try {
    const result = await api.runProjectTests(path, type, script);
    const ok = result?.exitCode === 0;
    lastTestResult.value = { ok };
  } catch {
    lastTestResult.value = { ok: false };
  } finally {
    runTestsBusy.value = false;
  }
}

async function runAutomatedBisect() {
  const path = store.selectedPath;
  const type = projectType.value;
  const script = selectedBisectScript.value || testScripts.value[0] || 'test';
  if (!path || !api.bisectRun) return;
  const commandArgs = type === 'php' ? ['composer', 'run', script, '--no-ansi'] : ['npm', 'run', script, '--no-color'];
  bisectRunBusy.value = true;
  error.value = '';
  try {
    await api.bisectRun(path, commandArgs);
    load();
    emit('refresh');
  } catch (e) {
    error.value = e?.message || 'Bisect run failed.';
  } finally {
    bisectRunBusy.value = false;
  }
}

async function resetBisect() {
  const path = store.selectedPath;
  if (!path || !api.bisectReset) return;
  error.value = '';
  try {
    await api.bisectReset(path);
    load();
    emit('refresh');
  } catch (e) {
    error.value = e?.message || 'Reset failed.';
  }
}
</script>
