/**
 * Shared state for Agent Crew slots so the sidebar can show running agents per project.
 * DetailAgentCrewCard loads/saves slots and calls setSlots; Sidebar reads slots and runningByPath.
 */
import { ref, computed } from 'vue';
import { useApi } from './useApi';

const PREF = 'ext.agentCrew.agentSlots';

const agentSlots = ref([]);

export function useAgentCrewSlots() {
  const api = useApi();

  const runningByPath = computed(() => {
    const byPath = new Map();
    for (const slot of agentSlots.value) {
      if (slot.status === 'running' && slot.workspacePath) {
        const path = slot.workspacePath;
        if (!byPath.has(path)) byPath.set(path, []);
        byPath.get(path).push(slot);
      }
    }
    return byPath;
  });

  async function loadSlots() {
    if (!api.getPreference) return;
    try {
      const raw = await api.getPreference(PREF);
      const parsed = typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : raw;
      if (Array.isArray(parsed) && parsed.length) agentSlots.value = parsed;
    } catch (_) {}
  }

  function setSlots(slots) {
    if (Array.isArray(slots)) agentSlots.value = slots;
  }

  return { agentSlots, runningByPath, loadSlots, setSlots };
}
