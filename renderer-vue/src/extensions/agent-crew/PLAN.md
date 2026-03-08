# Agent Crew – plan

**Purpose:** Run agents in projects, manage them, have them talk to each other, keep conversation history, program and keep them in check.

**Research:** See RESEARCH.md (Cursor, Devin, Sweep, v0; gaps we own: agent-to-agent conversation, history, rules/approval). ARCHITECTURE.md has the layout and data model.

---

## Done

- [x] Rename from Polyscope to **Agent Crew** (id: `agent-crew`, prefs: `ext.agentCrew.*`).
- [x] RESEARCH.md: competitor summary and how we build (conversation, history, rules).
- [x] ARCHITECTURE.md: capabilities, layout, data model, phased build.
- [x] Autopilot, Agents (slots), Linked workspaces, Opinions (existing behavior).
- [x] **Conversation:** Current thread (messages with role human/agent); input “Message to crew”; persist currentThread.
- [x] **Rules:** List rules, add/remove; persist rules array. (Enforcement when runner exists.)

---

## Next

- [ ] **Conversation history:** When a run ends, push current thread to `threads[]` (cap at N or by project); UI: list past threads, open to read.
- [ ] **Agent posts to thread:** When we have a runner, agent “speaks” by appending to currentThread.messages (role: agent, agentId: slot id).
- [ ] **Approval:** Runner emits “pending action”; UI shows Approve/Reject; result sent back.
- [ ] **Per-agent rules:** Scope rule to agent id; runner applies when that agent acts.
- [ ] **Real runner:** IPC or MCP to start/stop agent process per slot, stream log, post to thread, respect rules.

---

## Technical notes

- **Prefs:** ext.agentCrew.autopilotGoal, autopilotTasks, agentSlots, filter, sort, currentThread, rules.
- **Thread message:** `{ role: 'human'|'agent', agentId?: string, content: string, ts: number }`.
- **Rule:** `{ id, scope: 'global'|'agent', agentId?, rule: string }`.
