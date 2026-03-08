# Agent Crew – architecture

**Name:** Agent Crew. Run agents in projects, manage them, have them talk to each other, keep history, program and keep them in check.

**Vision:** A crew of agents that work in your projects, converse with each other and with you, and follow rules and approval steps you define.

---

## Core capabilities

| Capability | Description | Build |
|------------|-------------|--------|
| **Run agents in projects** | Assign each agent a workspace (project path) and task; run/stop; view log. | Slots UI (done). Backend: IPC or MCP runner per slot. |
| **Agents talk to each other** | Shared conversation thread: Agent A posts, Agent B replies, human can chime in. | **Thread** = list of messages `{ role, agentId?, content, ts }`. One thread per run or per task. Post when agent “speaks” or human sends. |
| **Conversation history** | Persist and browse past threads. | Store threads in prefs or local: `ext.agentCrew.threads` (array or by project). UI: “History” list + open thread view. |
| **Program / keep in check** | Rules, approval steps, autonomy. | **Rules:** Global or per-agent text rules (e.g. “Only edit under src/”). **Approval:** Before dangerous or chosen actions, show “Pending action” → Approve/Reject. **Autonomy:** Slider or preset: ask-before-act vs full. |

---

## Layout (current + next)

```
┌─────────────────────────────────────────────────────────────────┐
│ Agent Crew (toolbar: refresh)                                    │
├─────────────────────────────────────────────────────────────────┤
│ Autopilot – Goal → stories; task list (reorder, status, retry)   │
├─────────────────────────────────────────────────────────────────┤
│ Agents – N slots (workspace, task, run/stop, status)             │
│         + [Conversation] per run: thread of agent↔agent↔human     │
├─────────────────────────────────────────────────────────────────┤
│ Conversation history – List past threads; open to read           │
├─────────────────────────────────────────────────────────────────┤
│ Rules & control – Global / per-agent rules; approval toggles     │
├─────────────────────────────────────────────────────────────────┤
│ Linked workspaces – Project table (filter, sort, focus)          │
├─────────────────────────────────────────────────────────────────┤
│ Opinions – Multi-model query (placeholder)                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data model

**Existing (prefs):**
- `ext.agentCrew.autopilotGoal`, `ext.agentCrew.autopilotTasks`, `ext.agentCrew.agentSlots`, `ext.agentCrew.filter`, `ext.agentCrew.sort`

**New:**
- **Threads:** `ext.agentCrew.threads` – array of `{ id, projectPath?, taskId?, title?, messages: [{ role, agentId?, content, ts }], createdAt }`. Cap at N threads or by project.
- **Rules:** `ext.agentCrew.rules` – array of `{ id, scope: 'global'|'agent', agentId?, rule: string }`.
- **Settings:** `ext.agentCrew.requireApproval` (boolean), `ext.agentCrew.autonomyLevel` ('ask' | 'auto').

---

## Phased build

1. **Rename & research** – Polyscope → Agent Crew; RESEARCH.md; ARCHITECTURE updated. ✓
2. **Conversation thread** – One thread per “run” or current session; UI to post human message and show agent messages (mock). Persist thread.
3. **History** – Save thread when run ends; list past threads; open thread to read.
4. **Rules** – UI: add/edit/remove rules (global + per-agent); store in prefs. Runner (when exists) reads rules.
5. **Approval** – When runner emits “pending action,” show in UI; Approve/Reject; send result back to runner.
6. **Agent-to-agent** – When we have a runner: agent A posts to thread “Need X from backend”; agent B (or orchestrator) sees it and posts reply. Orchestrator or shared thread passes messages.

---

## Files

- **index.js** – Register tab `agent-crew`, label “Agent Crew”, component DetailAgentCrewCard.
- **DetailAgentCrewCard.vue** – Autopilot, Agents, Workspaces, Opinions; later Conversation + History + Rules.
- **RESEARCH.md** – Competitor research and how we build (this repo).
- **ARCHITECTURE.md** – This file.
- **PLAN.md** – Execution checklist.
