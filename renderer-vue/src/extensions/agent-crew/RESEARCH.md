# Research: Apps for running and managing coding agents

**Goal:** Run agents in projects, manage them, have them talk to each other, keep conversation history, program/constrain agents. How do others do it, and how should we build?

---

## Competitors (summary)

### Cursor
- **Agents:** Hand off tasks to Cursor; agents run on their own (cloud) computers; build, test, demo; human reviews. Parallel execution.
- **Autonomy:** “Autonomy slider” – Tab completion (low), Cmd+K targeted edits (medium), full agentic (high). *Keep agents in check = control independence.*
- **Context:** Codebase indexing, semantic search; “learns how your codebase works.”
- **Surfaces:** PR review in GitHub, Slack, terminal. Composer for plan/build.
- **Takeaway:** Parallel agents + human-in-loop + configurable autonomy. No explicit “agents talk to each other” in marketing; conversation is human↔agent.

### Devin (Cognition)
- **Flow:** Ticket (Linear/Jira/Slack) → Plan (human reviews) → Devin executes → Test (Devin runs tests) → PR (human reviews).
- **Learning:** “Learns your codebase & tribal knowledge”; fine-tuning on your tasks (e.g. migration patterns) for 2x completion, 4x speed.
- **Tools:** MCP, GitHub, Linear, Slack, Teams; editor, shell, browser. “Hundreds of tools.”
- **Collaboration:** Human can “take over” (run commands, edit, browse). Updates in Slack/Teams.
- **Takeaway:** Ticket-driven; plan approval; strong tooling and integrations; conversation = status updates to human, not agent-to-agent.

### Sweep
- **Focus:** JetBrains IDE plugin; AI agent + autocomplete; codebase indexing.
- **Agent:** “Built for JetBrains”; resolves definitions, code search; privacy-first (zero retention).
- **Takeaway:** Single-agent, IDE-centric; no multi-agent or conversation history in the open description.

### v0 (Vercel)
- **Flow:** Prompt → plan → build (DB, API, deploy); “Agentic by default”; templates.
- **Takeaway:** One-shot or short flow; not framed as multi-agent or persistent conversation.

---

## Gaps we can own

1. **Agents talking to each other**  
   Most products are human↔agent. We can add a **shared conversation room** or **thread per task/session**: Agent A posts “I need the API contract from the backend repo,” Agent B (on backend) posts “Here’s the OpenAPI snippet,” Agent A continues. Persist as **conversation history** (messages with role: agent-1, agent-2, human, system).

2. **Conversation history**  
   Store messages (role, content, timestamp, maybe ref to task/slot). Allow **per-session** or **per-project** threads; browse/scroll back. Enables “what did the agents decide?” and human review.

3. **Program / keep agents in check**  
   - **Rules or constraints:** Per-agent or global: “Never push to main,” “Only edit under `src/`,” “Require approval for file delete.”  
   - **Approval steps:** Pause before executing a tool (e.g. run command, write file); human approves or rejects.  
   - **Scripted workflows:** “First run tests, then only if green run deploy.”  
   - **Autonomy level:** Like Cursor’s slider: ask-before-act vs full autonomy per agent or per task.

4. **Project-scoped agents**  
   Agents tied to **projects (workspaces)** in the app; each agent has a workspace; “linked workspaces” so agent in repo A can read repo B. We already have project list and workspace selection; extend to “this agent can see these projects.”

---

## How we should build it

| Capability | Build approach |
|------------|----------------|
| **Agent-to-agent conversation** | **Shared thread (room):** One thread per “run” or per task; agents and human post messages. Store `conversationHistory[]` with `{ role, agentId?, content, ts }`. UI: timeline or chat view. |
| **Conversation history** | Persist threads in prefs or local (e.g. `ext.agentCrew.threads` or by project path). List past threads; open one to see full history. Optional: export. |
| **Program / keep in check** | **Rules:** Text or structured rules per agent or global (e.g. “Only modify files in src/”). **Approval:** Before tool use, emit “pending action”; human approves/rejects; then agent continues. **Workflow:** Task DAG or steps with “run only if previous succeeded”; optional human checkpoint steps. |
| **Run agents in projects** | Already: workspace + task per slot. Add: real runner (IPC or MCP) that executes in that project path; stream output into agent log and/or into conversation. |
| **Manage agents** | Slots UI (we have it). Add: name agent, assign role (“frontend”, “backend”), enable/disable, view log + conversation. |

---

## Suggested data model additions

- **Thread / conversation:** `{ id, projectPath?, taskId?, messages: [{ role, agentId?, content, ts }], createdAt }`. Persist last N threads or by project.
- **Rules:** `{ id, scope: 'global'|'agent', agentId?, rule: string }` (e.g. “Never run rm -rf”).
- **Pending actions:** Runtime only: `{ agentId, action, payload }`; UI shows Approve/Reject; on approve, runner executes; on reject, agent gets “rejected” and can retry or stop.

---

## Naming

**Agent Crew** – A “crew” runs together, talks, and can be managed. Fits: running agents in projects, managing them, conversation, keeping them in check.
