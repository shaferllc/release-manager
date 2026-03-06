import { ref, computed, watch, nextTick, onMounted } from 'vue';
import { useApi } from './useApi';
import { truncatePath } from '../utils';

const HISTORY_MAX = 50;

/**
 * Composable for the inline terminal: command input, output blocks, history,
 * script list (npm/composer), copy/clear. Call with (getDirPath, getShowScripts).
 * Returns refs and methods for InlineTerminal.vue; expose clear() from the component.
 */
export function useInlineTerminal(getDirPath, getShowScripts) {
  const api = useApi();

  const input = ref('');
  const inputEl = ref(null);
  const outputEl = ref(null);
  const blocks = ref([]);
  const running = ref(false);
  const scripts = ref([]);
  const scriptsOpen = ref(false);
  const projectType = ref('npm');
  const history = ref([]);
  const historyIndex = ref(-1);
  const historyTemp = ref('');

  const displayPath = computed(() => truncatePath(getDirPath?.() || '', 39));

  function promptLine(cwd) {
    const p = (cwd || '').replace(/\\/g, '/').replace(/^.*\//, '') || '~';
    return `$ ${p} $`;
  }

  function clear() {
    blocks.value = [];
  }

  function copyOutput() {
    const text = blocks.value
      .map((b) => {
        let s = promptLine(b.cwd) + '\n';
        if (b.command) s += b.command + '\n';
        if (b.stdout) s += b.stdout;
        if (b.stderr) s += b.stderr;
        if (b.exitCode != null && b.exitCode !== 0) s += `(exit ${b.exitCode})`;
        return s;
      })
      .join('\n');
    if (text && api.copyToClipboard) api.copyToClipboard(text);
  }

  function historyUp(e) {
    if (history.value.length === 0) return;
    e.preventDefault();
    if (historyIndex.value < 0) historyTemp.value = input.value;
    historyIndex.value = Math.min(historyIndex.value + 1, history.value.length - 1);
    input.value = history.value[history.value.length - 1 - historyIndex.value];
  }

  function historyDown(e) {
    if (history.value.length === 0) return;
    e.preventDefault();
    historyIndex.value -= 1;
    if (historyIndex.value < 0) {
      input.value = historyTemp.value;
      historyIndex.value = -1;
      return;
    }
    input.value = history.value[history.value.length - 1 - historyIndex.value];
  }

  async function loadScripts() {
    const dirPath = getDirPath?.();
    if (!dirPath || !api.getProjectInfo || !api.getProjectTestScripts) return;
    try {
      const info = await api.getProjectInfo(dirPath);
      const type = info?.projectType || info?.type || 'npm';
      projectType.value = type;
      const res = await api.getProjectTestScripts(dirPath, type);
      scripts.value = Array.isArray(res?.scripts) ? res.scripts : [];
    } catch {
      scripts.value = [];
      projectType.value = 'npm';
    }
  }

  async function runScript(name) {
    const dirPath = getDirPath?.();
    if (!name || !dirPath) return;
    const cmd = projectType.value === 'php' ? `composer run-script ${name}` : `npm run ${name}`;
    input.value = cmd.replace(/\s+/g, ' ').trim();
    nextTick(() => runCommand());
  }

  async function runCommand() {
    const cmd = input.value?.trim();
    input.value = '';
    if (cmd) runCommandText(cmd);
  }

  async function runCommandText(cmd) {
    const trimmed = typeof cmd === 'string' ? cmd.trim() : '';
    historyIndex.value = -1;
    const dirPath = getDirPath?.();
    if (!trimmed || !dirPath) return;
    if (history.value[history.value.length - 1] !== trimmed) {
      history.value.push(trimmed);
      if (history.value.length > HISTORY_MAX) history.value.shift();
    }
    const block = { cwd: dirPath, command: trimmed, running: true };
    blocks.value.push(block);
    running.value = true;
    nextTick(scrollToBottom);
    try {
      const result = await api.runShellCommand?.(dirPath, trimmed);
      block.running = false;
      block.stdout = result?.stdout ?? '';
      block.stderr = result?.stderr ?? '';
      block.exitCode = result?.exitCode ?? -1;
    } catch (e) {
      block.running = false;
      block.stderr = e?.message || String(e);
      block.exitCode = -1;
    }
    running.value = false;
    nextTick(scrollToBottom);
  }

  function scrollToBottom() {
    if (outputEl.value) outputEl.value.scrollTop = outputEl.value.scrollHeight;
  }

  function focusInput() {
    (inputEl.value?.$el ?? inputEl.value)?.focus();
  }

  watch(
    () => getDirPath?.(),
    () => {
      nextTick(focusInput);
      if (getShowScripts?.()) loadScripts();
    },
    { immediate: true }
  );

  onMounted(() => {
    nextTick(focusInput);
    if (getShowScripts?.() && getDirPath?.()) loadScripts();
  });

  return {
    input,
    inputEl,
    outputEl,
    blocks,
    running,
    scripts,
    scriptsOpen,
    displayPath,
    promptLine,
    clear,
    copyOutput,
    historyUp,
    historyDown,
    runScript,
    runCommand,
    runCommandText,
    focusInput,
  };
}
