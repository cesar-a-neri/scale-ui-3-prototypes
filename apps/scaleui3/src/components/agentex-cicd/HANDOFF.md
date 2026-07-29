# Golden Agent — engineering handoff

Golden Agent is Scale's agent command-center prototype: an agent catalog
(`agentex-cicd.tsx`) that opens into a chat-first **Command Center**
(`customizable-agents.tsx`) where users test an agent, switch threads, pick the
active agent, and configure it (system instructions, model/harness, capability
boundaries, integrations, version history). It's built on the **production
stack** — Next.js App Router + Tailwind v4, consuming the shared **SGP top nav**
(`sgp-nav.tsx`) — so implementing it is mostly **wiring data**, not rebuilding UI.

- **Live prototype:** _<your Vercel preview URL>_ — this is the behavioral spec. Implement until the real app matches it.
- **Source:** `apps/scaleui3/src/components/agentex-cicd/` + the route at `apps/scaleui3/src/app/golden-agent/page.tsx`.

---

## 1. Files in this bundle

| File | Role |
|---|---|
| `CLAUDE.md` | **Read first if you're an AI coding agent.** How to consume this bundle — respect Tailwind classes + JSX structure, ignore prototyping hooks and hard-coded/mock values. |
| `src/app/golden-agent/page.tsx` | Route. Wires the catalog ↔ command-center views, sets the purple accent CSS vars, mounts the Tweakpane harness (incl. this handoff button). |
| `src/components/agentex-cicd/agentex-cicd.tsx` | Agent **catalog** — grid/table of agents, search, status chips. Entry point. |
| `src/components/agentex-cicd/customizable-agents.tsx` | The **Command Center** — sidebar (threads + agent picker + config), chat playground, and the config surfaces (instructions editor, model/harness, capabilities, integrations, versions). |
| `src/components/agentex-cicd/chat-files.tsx` | **Unified file rendering & management** — inline file chips/thumbnails in messages, the agent-wide Files manager (grouped-folder tree, multiselect + bulk actions), drag-and-drop upload modal, and full-screen lightbox. |
| `src/components/sgp-nav/sgp-nav.tsx` | Shared SGP top navigation (`NavV3`) + icon/description density contexts. |

ScaleUI3 components (buttons, inputs, etc.) are **not** bundled — in production
they resolve from the ScaleUI3 registry.

---

## 2. The data seam — where to wire the backend

All content in the prototype is **mock data declared at the top of the component
files**; there is no data layer yet. To go live, replace these in-file constants
with real fetches:

| Constant (file) | Represents | Replace with |
|---|---|---|
| `MOCK_AGENTS` (`customizable-agents.tsx`) | agents shown in the picker | `GET /agents` |
| `THREADS` / `ALL_THREAD_MESSAGES` (`customizable-agents.tsx`) | a thread list + each thread's messages | `GET /agents/:id/threads`, `GET /threads/:id/messages` |
| `MODELS` (`customizable-agents.tsx`) | model dropdown options | model catalog endpoint |
| `INTEGRATIONS` / `INTEGRATION_PERMISSION_LEVELS` | available integrations + scopes | integrations endpoint |
| `VERSIONS` (`customizable-agents.tsx`) | version history rows | `GET /agents/:id/versions` |
| the agent list in `agentex-cicd.tsx` | catalog cards/rows | `GET /agents` |

The agent config (name, description, system instructions, model, harness,
capability, connected integrations) is held in React state in `CommandCenter`.
Wire **Save Changes** to a `PUT /agents/:id` and seed the initial state from the
fetched agent.

---

## 3. Behavior the mock hides (work to add)

- **Send / streaming** — the chat input is display-only; there's no send action
  or streaming response. Wire it to your agent run/stream API.
- **Thread CRUD** — create/rename/delete operate on local state only. "New
  Thread" is intentionally **idempotent** (reuses an existing empty thread rather
  than stacking duplicates) — preserve that behavior against the real API.
- **Auth / permissions** — none modeled. The capability boundaries (Read-Only /
  Read+Write) are UI state, not enforced.
- **Markdown** — chat + the instructions preview render GitHub-flavored markdown
  via `react-markdown` + `remark-gfm` (tables included). Keep the plugin when
  porting or tables/strikethrough will render as raw text.

---

## 4. Strip the prototype-only bits

- **`useTweakpane`** in `app/golden-agent/page.tsx` (and the `@proto/devtools`
  import) is the prototyping harness — including this **"Download .zip"** handoff
  button. Remove it for production.
- The `--proto-accent-*` CSS vars set in the route's `useEffect` are the purple
  theming; fold them into your real theme system or keep as product styling.

---

## 5. Implementation checklist

1. Drop `components/agentex-cicd/*` + `components/sgp-nav/sgp-nav.tsx` + the route
   into the real app (ScaleUI3 components resolve from the registry).
2. Replace the mock constants (§2) with real fetches; seed config state from the
   fetched agent and wire **Save Changes**.
3. Wire chat send + streaming and thread CRUD to the agent API (§3), keeping the
   idempotent "New Thread" behavior.
4. Add auth and enforce capability boundaries.
5. Remove the dev-only harness (§4).
6. Compare against the live prototype URL until they match.
