# Implementation guide for AI coding agents

This bundle is a **design prototype** exported from Scale's ScaleUI3 prototyping
environment. It is a **visual + behavioral spec**, not production code. When you
implement these designs in the real application, follow the rules below.

## ✅ Respect — treat as the source of truth

- **Tailwind classes.** Preserve the exact Tailwind utility classes (and any
  inline `style` values) on every element. Spacing, sizing, color, typography,
  radii, borders, shadows, and layout _are_ the design — copy them verbatim. Do
  not "tidy up", restyle, or swap in your own classes or design tokens.
- **JSX structure.** Keep the element hierarchy, wrappers, ordering, and
  conditional-render structure as written. The nesting encodes the intended
  layout, alignment, and responsive behavior.
- **Visual states.** Hover / active / selected / empty / error / loading states
  and their styling are intentional — reproduce them.

## ❌ Ignore — prototyping scaffolding to replace with a real implementation

- **Hook functionality.** `useState` / `useEffect` / `useMemo` / `useRef` here
  drive a self-contained demo (local selection, open/close toggles, faked async,
  scroll, textarea auto-grow, etc.). Do **not** port this logic verbatim —
  re-wire it to the production app's real data layer, routing, and state
  management.
- **Hard-coded & mock values.** Sample data (agents, threads, messages, files,
  folders), fixed counts, canned copy, simulated timings/latencies, gradient
  "image" placeholders, and any magic trigger values exist only to make the
  prototype demoable. Replace them with real data and APIs.
- **The prototyping harness.** Tweakpane controls, the "Download .zip" handoff
  button, and any dev-only toggles are not part of the product — drop them.

## In short

**Match the markup and styling exactly; rebuild the behavior and data for real.**
If a value or interaction looks like demo scaffolding, it is — swap it.
