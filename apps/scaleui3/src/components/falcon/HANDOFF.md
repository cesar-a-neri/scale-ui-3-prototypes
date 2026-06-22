# Project Falcon — engineering handoff

Falcon is Scale's fleet control plane prototype (Fleet · Deployments · Customers,
plus Workspace and Customer detail views). It's built on the **production stack**
— Next.js App Router + Tailwind v4 + Base UI, consuming real **ScaleUI3**
components — so implementing it is mostly **wiring data**, not rebuilding UI.

- **Live prototype:** _<your Vercel preview URL>_ — this is the behavioral spec. Implement until the real app matches it.
- **Source:** `apps/scaleui3/src/components/falcon/` + the route at `apps/scaleui3/src/app/falcon/page.tsx`.

---

## 1. The data seam — the one place to wire the backend

All data flows through a single typed source: **`data/source.ts`**. To go live,
replace `mockSource` with an implementation that calls your API. Nothing else in
the UI imports mock data.

```ts
export interface FalconDataSource {
  listCustomers(): Customer[];
  getCustomer(id: string): Customer | undefined;
  listWorkspaces(): Workspace[];
  listWorkspacesByCustomer(customerId: string): Workspace[];
  getWorkspace(id: string): Workspace | undefined;
  listDeployments(): Deployment[];
  listDeploymentsByWorkspace(workspaceId: string): Deployment[];
  listFeatureFlags(): FeatureFlag[];
}
```

The entity shapes (`Customer`, `Workspace`, `Deployment`, `FeatureFlag`) are the
contract — see **`types.ts`**.

**Data layer files:**
| File | Role | At handoff |
|---|---|---|
| `data/source.ts` | the seam (`FalconDataSource` + `falconData`) | **reimplement against your API** |
| `data/fixtures.ts` | mock arrays | **delete** once the source is real |
| `data/util.ts` | pure formatters (`fStaleness`, `fCloudName`, `fSgpChannel`, `shadPersonName`) | keep |
| `data/index.ts` | re-exports + `fCustomer(id)` convenience | keep |
| `types.ts` | entity contract | keep |

---

## 2. Per-view data contract (implied endpoints)

The methods are synchronous in the prototype; map each to a real endpoint.

| View (file) | Data it reads | Suggested endpoints |
|---|---|---|
| **Customer Catalog** (`customer-catalog.tsx`) | `listCustomers()`, `listWorkspacesByCustomer(id)` (for health counts) | `GET /customers`, `GET /customers/:id/workspaces` |
| **Customer Detail** (`customer-detail.tsx`) | `getCustomer(id)`, `listWorkspacesByCustomer(id)`, `listCustomers()` (prev/next nav) | `GET /customers/:id`, `GET /customers/:id/workspaces`, `GET /customers` |
| **Fleet Health Overview** (`fi-browse.tsx`, workspaces) | `listWorkspaces()`, `listCustomers()` (tier/name lookups) | `GET /workspaces`, `GET /customers` |
| **Deployment Search** (`fi-browse.tsx`, deployments) | `listDeployments()`, `listCustomers()` | `GET /deployments`, `GET /customers` |
| **Workspace Detail** (`workspace-detail.tsx`) | `getWorkspace(id)`, `listDeploymentsByWorkspace(id)`, `listFeatureFlags()`, `getCustomer()`, `listWorkspaces()` (prev/next nav) | `GET /workspaces/:id`, `GET /workspaces/:id/deployments`, `GET /workspaces/:id/feature-flags`, `GET /workspaces` |

---

## 3. Mock vs. real vs. derived — what to replace, keep, or rebuild

**Replace (real data):** everything behind `FalconDataSource` — customers,
workspaces, deployments, feature flags.

**Keep as-is (pure logic / presentation — do NOT fetch these):**
- **Health severity** — `fiClass()` derives `failed/degraded/stale/healthy` from a
  workspace's `health` + heartbeat staleness. It's a pure function; don't expect a
  "severity" field from the API.
- `fiReason()`, `fiSorted()` — derived cause text + sort order.
- `fStaleness()` (heartbeat → "11m ago" + stale flag), `fCloudName()`,
  `fSgpChannel()`, `shadPersonName()` — pure formatters.
- `SHAD_SEV` / `SHAD_PACK` / tier colors (`lib.tsx`) — presentation tokens
  (the `--falcon-*` CSS vars in `globals.css`).

**Synthesized in the prototype — needs a real source if you want it live:**
- **"Errors over time" chart** (`fi-browse.tsx` → `shadSeries`) — currently random
  mock series. Back it with a metrics endpoint, e.g. `GET /metrics/errors?range=24h`.
- **Packs table workload rows** (`workspace-detail.tsx` → `shadPackGroups`) — expands
  each deployment into synthetic workload/container/tag rows. Real pod/workload data
  will differ; map to your actual deployment topology.
- **Workspace age** (`shadAge`) and **image-tag distribution** — derived/synthesized.

---

## 4. Gaps the mock hides (work to add)

- **Loading / empty / error states** — these now exist per view (see
  `components/falcon/states.tsx`: `FalconLoading` with `results` / `detail` /
  `catalog` skeleton variants, plus `FalconEmpty` and `FalconError`). Because the
  fixtures resolve instantly there's no real condition that triggers them, so
  they're driven by the **"View state"** Tweakpane control for review. When wiring
  the real backend, drive these from actual fetch status (loading / no-results /
  error) and drop the Tweakpane override.
- **Auth / permissions** — none modeled.
- **Pagination / limits** — Deployment Search caps lists client-side (first 30
  problems / 40 healthy). Replace with real pagination.
- **Refresh / real-time** — heartbeats and statuses are static snapshots.

---

## 5. Going async (real backend)

`FalconDataSource` is synchronous so the prototype stays simple. For the real app:

1. Make the methods **async** (`Promise<Customer[]>`, …) and implement `fetch`/RPC.
2. In **Next App Router**, the idiomatic path is to **fetch in server components**
   (e.g., the route/segment loads data and passes it to these client components),
   or use your app's client data layer (React Query, etc.) — your call; the seam
   doesn't dictate it.
3. Add **Suspense / loading** and **error boundaries** around the fetches.
4. The method-to-endpoint mapping in §2 is your fetch list.

---

## 6. Strip the prototype-only bits

- **`useTweakpane`** in `app/falcon/page.tsx` (the Light/Dark theme control and the
  "View state" loading/empty/error override) and the `@proto/devtools` /
  `@proto/registry` imports are **prototyping harness**, not product. Remove them
  (and the `viewState` props threaded into the views); keep theme handling only if
  it's a real product feature. The state components in `states.tsx` are product —
  keep them and drive them from real fetch status instead.
- The `--falcon-*` design tokens in `globals.css` ARE product styling — keep them
  (or fold into your theme system).

---

## 7. Implementation checklist

1. Drop `components/falcon/*` + the route into the real app (ScaleUI3 components
   resolve from the registry rather than local copies).
2. Implement `FalconDataSource` against the backend (§1–§2); delete `fixtures.ts`.
3. Wire the existing loading / error / empty states (`states.tsx`) to real fetch
   status, and add auth (§4).
4. Decide on the metrics source for the error chart, or hide it (§3).
5. Remove the dev-only harness (§6).
6. Compare against the live prototype URL until they match.
