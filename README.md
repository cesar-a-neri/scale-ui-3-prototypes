# Scale UI 3 Prototypes

Prototypes built on **ScaleUI3** (Next.js App Router + Tailwind v4 + Base UI),
wired into a shared set of dev tools — a **⌘K command palette**, **debug mode +
Tweakpane**, and the **Agentation annotation toolbar** — that ship as versioned
workspace packages.

> The repo is a Turborepo so new prototype families (e.g. a client design system
> on a different stack) can be added as their own app without forking the shared
> tools. Today there is one app: `scaleui3`. The companion Vite/Radix prototypes
> live in a separate repo ("Radix Prototypes").

## Layout

```
.
├── apps/
│   └── scaleui3/     Next.js App Router + Tailwind v4 + Base UI   → :3000
├── packages/
│   ├── registry/     @proto/registry  — the prototype manifest (⌘K menu)
│   └── devtools/     @proto/devtools  — ⌘K palette + Tweakpane + Agentation
├── pnpm-workspace.yaml
└── turbo.json
```

## Running it

Uses **pnpm** + **Turborepo**.

```bash
pnpm install          # once
pnpm dev              # runs the app via turbo
```

Or just the app:

```bash
pnpm --filter @proto/scaleui3-app dev   # → http://localhost:3000
```

Open **http://localhost:3000**:
- **⌘K** — open the prototype switcher (lists prototypes from `@proto/registry`).
- **⌘.** — toggle **dev mode** → shows each prototype's Tweakpane panel and the
  Agentation annotation toolbar (bottom-right). Off by default.

## The shared packages

### `@proto/registry`
The single source of truth for the ⌘K menu.

```ts
export interface PrototypeEntry {
  id: string;            // 'falcon'
  title: string;         // 'Project Falcon (ScaleUI3)'
  appId: string;         // which app hosts it — key into APP_BASE_URLS
  path: string;          // route within that app, e.g. '/falcon'
  stack: string;         // 'next-tw4' | …  (shown in the palette)
  designSystem: string;  // 'scaleui3' | 'client:acme'  (group label)
  tags?: string[];
}
export const APP_BASE_URLS: Record<string,string>;
export const prototypes: PrototypeEntry[];
export function resolveUrl(e: PrototypeEntry): string;
```

### `@proto/devtools` (`@proto/devtools/react`)
Framework-agnostic tools with self-contained styling. Exports:

- **`DevTools`** — top-level mount: `<DevTools appId="…">{children}</DevTools>`.
- **`CommandPalette`** / **`AnnotationToolbar`** — standalone mounts.
- **`useTweakpane(initialParams, bindingOptions?, hookOptions?)`** — per-prototype
  controls, dev-mode-gated by default.
- **`DevModeProvider` / `useDevMode`** — the shared dev-mode context (toggled by ⌘.).

## Add a new prototype

1. **Build it** as an App Router route, e.g. `apps/scaleui3/src/app/<name>/page.tsx`.
2. **Register it** in `packages/registry/src/index.ts` — append a `PrototypeEntry`:
   ```ts
   { id: 'my-proto', title: 'My Prototype', appId: 'scaleui3',
     path: '/my-proto', stack: 'next-tw4', designSystem: 'scaleui3', tags: ['…'] }
   ```
3. **(Optional) add controls** with `useTweakpane` (shown when dev mode ⌘. is on).

## Add a new app (new stack / client design system)

1. **Scaffold** under `apps/<name>/` with a unique `package.json` name.
2. Add `"@proto/devtools": "workspace:*"` + `"@proto/registry": "workspace:*"`.
3. Mount `<DevTools appId="<name>">…</DevTools>` at the app root.
4. Register the app + prototypes in `@proto/registry` (add an `APP_BASE_URLS` entry).
5. Wire the bundler for the workspace TS packages (Next:
   `transpilePackages: ['@proto/devtools','@proto/registry']`).

## Deployment

Deployed on Vercel with **Root Directory = `apps/scaleui3`** (Next.js auto-detected;
Vercel installs the pnpm workspace from the repo root). The Agentation toolbar is
gated to `NODE_ENV === 'development'`, so production builds ship none of the dev UI.

## Notes

- **React 19**: the app and the workspace are pinned to a single React 19 (via a
  root `pnpm.overrides`) so the shared devtools deps (agentation/tweakpane) can't
  pull a second React copy into the Next build.
