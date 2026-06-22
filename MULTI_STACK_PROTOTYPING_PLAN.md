# Multi-stack prototyping platform — plan

## Goal

Let every prototype share one set of tools — **⌘K command palette, Tweakpane, and the
Agentation annotation toolbar** — while each prototype keeps **its own tech stack and
design system**:

- **ScaleUI3** prototypes — Next.js App Router + Tailwind v4 + Base UI
- **Legacy** prototypes — the current Vite + Tailwind v3 + Radix template
- **Client / forward-deploy** prototypes — whatever stack the client uses

Optimize for **engineering handoff**: each prototype is already in its target stack +
design system, so handoff is "lift the app," and the shared tools are a dev-only layer
that's trivially excluded from the build.

## Core principle

> **Isolate by app. Share by package.**

Conflicting stacks can't share a build (Tailwind v3 and v4 can't coexist; React 18 vs 19,
different bundlers, etc.). So each prototype family stays an independently-built app, and
the shared tools come from a **stack-agnostic devtools package** plus a **shared registry**
that makes the menu identical everywhere.

---

## Monorepo layout

pnpm workspaces + Turborepo:

```
proto-platform/
├── apps/
│   ├── scaleui3/            # Next + TW4 + Base UI — consumes ScaleUI3 from its registry
│   ├── legacy/              # the current Vite + TW3 + Radix template (moved in as-is)
│   └── acme-client/         # example forward-deploy app on a client's stack
├── packages/
│   ├── devtools/            # ⌘K palette + Tweakpane wrapper + annotation toolbar
│   └── registry/            # the prototype manifest + URL resolution
├── pnpm-workspace.yaml
└── turbo.json
```

Each app builds and deploys independently. Apps depend on `@proto/devtools` and
`@proto/registry`; the packages never depend on an app.

---

## `@proto/devtools` — the shared toolset

The linchpin: it must be **visually and technically self-contained** so it doesn't rely on
or fight any host app's Tailwind config / design system.

### Distribution: web components (with thin React wrappers)

Ship the palette and toolbar as **custom elements (web components) using Shadow DOM**, so
they mount in *any* stack — React (any version), Vue, Svelte, plain HTML — and their styles
are fully encapsulated (no leakage in or out). Provide thin React wrappers for ergonomics.

- **Tweakpane** is already vanilla JS → drops into any stack; bring its own CSS.
- **Agentation** is a DOM toolbar widget → mountable anywhere.
- The **⌘K palette** is the only piece we build; as a Shadow-DOM custom element it stays
  stack-neutral.

This is what makes "external client stacks" work — the tools don't assume React or Tailwind.

### What it exports

```ts
// React ergonomic API (wraps the web components)
import { DevTools, useTweakpane } from '@proto/devtools/react';

// 1) Mount the shared layer once at an app's root:
<DevTools
  appId="scaleui3"            // which app this is (for the registry)
  registry={registry}         // imported from @proto/registry
/>
//   → renders the ⌘K palette (Shadow DOM), the annotation toolbar,
//     and reads shared debug/annotation/theme state from localStorage.

// 2) Per-prototype Tweakpane (same API as today's useTweakpane):
const { params } = useTweakpane(
  { theme: 'light' },
  { theme: { label: 'Theme', options: { Light: 'light', Dark: 'dark' } } },
  { alwaysVisible: false, buttons: [{ title: 'Download .zip', onClick }] },
);
```

```html
<!-- Vanilla / non-React apps -->
<script type="module" src="https://devtools.internal/proto-devtools.js"></script>
<proto-devtools app-id="acme-client" registry-url="https://registry.internal/registry.json">
</proto-devtools>
```

### Shared state

Debug-mode on/off, annotation on/off, and theme live in `localStorage` (e.g.
`proto:debug=1`) so a toggle persists as you move between apps. The package reads it on
mount; Tweakpane visibility is gated on `proto:debug` (unless `alwaysVisible`).

### Lift-and-share from what exists

Most of this already exists and just moves into the package:

- `apps/legacy/src/lib/tweakpane/useTweakpane.ts` + `DebugModeContext` → `@proto/devtools`
  (already framework-agnostic in spirit; Tweakpane is vanilla).
- `apps/legacy/src/components/CommandPalette.tsx` → becomes the palette web component,
  fed by the registry instead of `import.meta.glob`.
- `agentation` (already a dep in the ScaleUI3 app) → wrapped as the annotation toolbar.

---

## `@proto/registry` — one source of truth for the menu

Every prototype is described once; the ⌘K palette in *every* app reads this, so the menu is
complete and identical everywhere.

```ts
export interface PrototypeEntry {
  id: string;            // 'falcon-scaleui3'
  title: string;         // 'Project Falcon (ScaleUI3)'
  appId: string;         // 'scaleui3' — which app hosts it
  path: string;          // '/falcon' — route within that app
  stack: 'next-tw4' | 'vite-tw3' | string;
  designSystem: 'scaleui3' | 'legacy' | 'client:acme' | string;
  tags?: string[];
}

// URLs are resolved per environment (dev vs deployed) from a base map:
export const APP_BASE_URLS: Record<string, string> = {
  scaleui3: process.env.NEXT_PUBLIC_SCALEUI3_URL ?? 'http://localhost:3000',
  legacy:   'http://localhost:5173',
  'acme-client': 'http://localhost:4000',
};
// resolveUrl(entry) => `${APP_BASE_URLS[entry.appId]}${entry.path}`
```

Selecting an entry sets `window.location` to the resolved URL → cross-app navigation with no
build coupling. The manifest can be hand-authored to start, then auto-generated by scanning
each app's routes (Next file-routing / a Vite glob) in a build step.

---

## Composition: how switching works

**Phase-1 (recommended): URL navigation.** No central shell. Each app mounts `<DevTools>`;
⌘K navigates between deployed app URLs (full page load). Zero build coupling, each app
bundles its own React — no version conflicts ever. Simplest, and handoff stays per-app.

**Phase-2 (optional): iframe shell.** A thin `apps/shell` hosts the palette + an iframe;
selecting a prototype swaps the frame in place for a single unified URL. Debug/annotation
toggles bridge into the iframe via `postMessage`. Slicker UX, at the cost of an iframe
coordination layer. The per-app `<DevTools>` integration is unchanged.

---

## Per-app integration (what each prototype app does)

1. `pnpm add @proto/devtools @proto/registry`
2. Mount once at the root:
   - **Next (`apps/scaleui3`)**: in `app/layout.tsx`, render `<DevTools appId="scaleui3" .../>`
     inside the body (client component).
   - **Vite (`apps/legacy`)**: render `<DevTools appId="legacy" .../>` at the app root;
     delete the local `CommandPalette` / `DebugModeContext` (now provided by the package).
3. Use `useTweakpane(...)` inside any prototype exactly as today.
4. Add the prototype to `@proto/registry` (or let the route-scan generate it).

That's it — the prototype now appears in the shared ⌘K, supports debug on/off, shows
Tweakpane, and has the annotation toolbar, while using its own stack + design system.

---

## Handoff story

- Each prototype is already production-shaped code in the right stack + DS (ScaleUI3
  prototypes consume real ScaleUI3 from its shadcn registry; client prototypes use the
  client's stack).
- `@proto/devtools` is a **dev-only import** — exclude it from the production build (env flag
  / tree-shaken mount), so the handoff artifact has no harness code.
- Handoff = hand over the app (or the route) — no forked components, no stack translation.

---

## Deployment (Vercel)

- Each app is its own Vercel project (independent builds/domains), or one project with path
  rewrites per app. Either way the registry's `APP_BASE_URLS` points at the right origins.
- Static-export apps (the ScaleUI3 stack uses `output: 'export'`) and SSR apps both deploy
  fine. The devtools web-component bundle is published once and referenced by all apps.
- If apps are on different origins, the iframe-shell option needs CORS/`postMessage` origin
  allow-listing (Phase-2 only; URL navigation has no cross-origin concern).

---

## Phased rollout

- **Phase 0 — Monorepo & residents.** Stand up pnpm/Turbo. Move the current Vite template in
  as `apps/legacy` (unchanged). Move the ScaleUI3 Falcon into `apps/scaleui3` consuming
  ScaleUI3 from its registry (not vendored inside the design-system repo).
- **Phase 1 — Registry + palette.** Build `@proto/registry` and the ⌘K palette web component;
  wire both apps to it. Cross-app navigation working; menu identical everywhere.
- **Phase 2 — Tweakpane + debug.** Lift `useTweakpane` + debug context into `@proto/devtools`;
  shared `localStorage` signal; gate visibility. Both apps use it.
- **Phase 3 — Annotation.** Wrap Agentation in the package; mount per app.
- **Phase 4 — Client template.** Add `apps/_template-client` (a minimal app pre-wired with
  `@proto/devtools`) to clone for each forward-deploy engagement on the client's stack.
- **Phase 5 — (optional) iframe shell** for unified-URL in-place switching.

---

## Open decisions / risks

- **Styling isolation:** Shadow DOM (recommended) vs scoped/prefixed CSS for the palette. Shadow
  DOM is the safest for arbitrary client stacks but slightly limits global theming of the tool
  chrome itself.
- **Non-React client stacks:** covered by the web-component build; React wrappers are sugar.
- **React version independence:** guaranteed by URL navigation (each app loads fresh). Avoid
  Module Federation with shared React unless you accept version-lock.
- **Registry generation:** start hand-authored; add per-app route scanning later to avoid drift.
- **Auth/origins for client projects:** forward-deploy apps may live on client infra; the
  registry base-URL map + URL navigation handle this without coupling builds.
```
