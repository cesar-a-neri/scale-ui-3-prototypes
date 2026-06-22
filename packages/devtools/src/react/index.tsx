'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pane } from 'tweakpane';
import { Agentation } from 'agentation';
import { prototypes, resolveUrl, type PrototypeEntry } from '@proto/registry';

// ─────────────────────────────────────────────────────────────────────────────
// Dev mode context
// ─────────────────────────────────────────────────────────────────────────────

const DEV_KEY = 'proto:dev';

interface DevModeContextValue {
  devMode: boolean;
  setDevMode: (value: boolean) => void;
  toggleDevMode: () => void;
}

const DevModeContext = createContext<DevModeContextValue | null>(null);

function readInitialDev(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(DEV_KEY) === 'true';
  } catch {
    return false;
  }
}

export function DevModeProvider({ children }: { children: React.ReactNode }) {
  const [devMode, setDevModeState] = useState<boolean>(readInitialDev);

  const setDevMode = (value: boolean) => {
    setDevModeState(value);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(DEV_KEY, value ? 'true' : 'false');
      } catch {
        /* ignore */
      }
    }
  };

  const toggleDevMode = () => setDevMode(!devMode);

  const value = useMemo<DevModeContextValue>(
    () => ({ devMode, setDevMode, toggleDevMode }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [devMode],
  );

  return <DevModeContext.Provider value={value}>{children}</DevModeContext.Provider>;
}

export function useDevMode(): DevModeContextValue {
  const ctx = useContext(DevModeContext);
  if (!ctx) {
    // SSR-safe / outside-provider fallback so dependent hooks never throw.
    return {
      devMode: false,
      setDevMode: () => {},
      toggleDevMode: () => {},
    };
  }
  return ctx;
}

// Back-compat: the feature is now "dev mode", but existing imports still use the
// old names (apps/legacy re-exports these, and some prototypes destructure
// `debugMode`). These preserve the old surface + shape.
export const DebugModeProvider = DevModeProvider;
export function useDebugMode() {
  const { devMode, setDevMode, toggleDevMode } = useDevMode();
  return { debugMode: devMode, setDebugMode: setDevMode, toggleDebugMode: toggleDevMode };
}

// ─────────────────────────────────────────────────────────────────────────────
// CommandPalette — styled with injected <style> + inline styles (no Tailwind)
// ─────────────────────────────────────────────────────────────────────────────

const PALETTE_STYLE_ID = 'protocp-styles';
const PALETTE_CSS = `
.protocp-overlay {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 12vh;
  background: rgba(15, 18, 25, 0.45);
  backdrop-filter: blur(2px);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
.protocp-panel {
  width: 100%;
  max-width: 560px;
  max-height: 64vh;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  color: #1a1d24;
  border-radius: 12px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.28), 0 2px 8px rgba(0, 0, 0, 0.16);
  overflow: hidden;
}
.protocp-search {
  width: 100%;
  box-sizing: border-box;
  border: none;
  outline: none;
  padding: 16px 18px;
  font-size: 15px;
  color: #1a1d24;
  background: #ffffff;
  border-bottom: 1px solid #ebedf0;
}
.protocp-search::placeholder { color: #9aa0a8; }
.protocp-list {
  overflow-y: auto;
  padding: 6px 0;
}
.protocp-group-label {
  padding: 8px 18px 4px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #9aa0a8;
}
.protocp-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 9px 18px;
  cursor: pointer;
  user-select: none;
}
.protocp-item[data-active="true"] { background: #eef2ff; }
.protocp-item-title { font-size: 14px; font-weight: 500; color: #1a1d24; }
.protocp-item-meta { font-size: 12px; color: #8b919a; }
.protocp-empty { padding: 18px; font-size: 13px; color: #9aa0a8; text-align: center; }
.protocp-footer {
  border-top: 1px solid #ebedf0;
  padding: 8px 18px;
  font-size: 11px;
  color: #9aa0a8;
  display: flex;
  gap: 14px;
}
`;

function ensurePaletteStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(PALETTE_STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = PALETTE_STYLE_ID;
  el.textContent = PALETTE_CSS;
  document.head.appendChild(el);
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    ensurePaletteStyles();
  }, []);

  // Global keyboard shortcut: ⌘K / Ctrl+K to toggle, Esc to close.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      // Focus input after render.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Flat filtered list (used for keyboard nav) + grouped view (used for render).
  const filtered = useMemo<PrototypeEntry[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return prototypes;
    return prototypes.filter((p) => {
      const haystack = [p.title, p.id, p.appId, p.stack, p.designSystem, ...(p.tags ?? [])]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [query]);

  const grouped = useMemo(() => {
    const map = new Map<string, PrototypeEntry[]>();
    for (const p of filtered) {
      const arr = map.get(p.designSystem) ?? [];
      arr.push(p);
      map.set(p.designSystem, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  useEffect(() => {
    if (activeIndex > filtered.length - 1) setActiveIndex(0);
  }, [filtered, activeIndex]);

  const select = (entry: PrototypeEntry) => {
    setOpen(false);
    if (typeof window !== 'undefined') {
      window.location.href = resolveUrl(entry);
    }
  };

  const onListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const entry = filtered[activeIndex];
      if (entry) select(entry);
    }
  };

  if (!open) return null;

  // Track a running flat index so grouped rendering can highlight the active row.
  let flatIndex = -1;

  return (
    <div
      className="protocp-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="protocp-panel" role="dialog" aria-modal="true" onKeyDown={onListKeyDown}>
        <input
          ref={inputRef}
          className="protocp-search"
          placeholder="Search prototypes…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="protocp-list">
          {filtered.length === 0 ? (
            <div className="protocp-empty">No prototypes found</div>
          ) : (
            grouped.map(([designSystem, entries]) => (
              <div key={designSystem}>
                <div className="protocp-group-label">{designSystem}</div>
                {entries.map((entry) => {
                  flatIndex += 1;
                  const isActive = flatIndex === activeIndex;
                  return (
                    <div
                      key={entry.id}
                      className="protocp-item"
                      data-active={isActive}
                      onMouseEnter={() => setActiveIndex(filtered.indexOf(entry))}
                      onClick={() => select(entry)}
                    >
                      <span className="protocp-item-title">{entry.title}</span>
                      <span className="protocp-item-meta">
                        {entry.stack} · {entry.path}
                        {entry.tags && entry.tags.length > 0 ? ` · ${entry.tags.join(', ')}` : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <div className="protocp-footer">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
          <span style={{ marginLeft: 'auto' }}>⌘. dev mode</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// useTweakpane — lifted verbatim from the legacy hook (useDevMode swapped to
// this package's implementation; tweakpane kept as a vanilla dependency).
// ─────────────────────────────────────────────────────────────────────────────

type TweakpaneParams = Record<string, number | boolean | string>;
type BindingOptions = Record<string, Record<string, unknown>>;

/**
 * Creates a Tweakpane panel scoped to the calling prototype.
 *
 * - By default, the panel is shown/hidden based on global dev mode (toggled via ⌘.).
 * - Pass `alwaysVisible: true` to show the panel regardless of dev mode.
 * - Pass `debugParams` + `debugBindingOptions` to add extra bindings that only appear
 *   in debug mode. The pane is recreated (not just shown/hidden) when debug mode
 *   toggles so the binding list can change. Values are preserved across recreations.
 *
 * @param initialParams       - Always-visible parameter values.
 * @param bindingOptions      - Optional per-key Tweakpane binding options.
 * @param hookOptions         - Optional hook-level options.
 */
export function useTweakpane<
  T extends TweakpaneParams,
  D extends TweakpaneParams = Record<string, never>,
>(
  initialParams: T,
  bindingOptions?: BindingOptions,
  hookOptions?: {
    alwaysVisible?: boolean;
    debugParams?: D;
    debugBindingOptions?: BindingOptions;
    /**
     * Action buttons appended below the bindings. Handlers should be stable
     * (the pane captures them at creation); avoid closing over changing
     * state. Useful for one-shot actions like exporting/downloading.
     */
    buttons?: Array<{ title: string; label?: string; onClick: () => void }>;
  },
): { params: T & D } {
  const alwaysVisible = hookOptions?.alwaysVisible ?? false;
  const hasDebugParams = !!hookOptions?.debugParams;

  // Stable refs for the initial shape (never updated)
  const initialParamsRef = useRef<T>(initialParams);
  const initialDebugParamsRef = useRef<D>((hookOptions?.debugParams ?? {}) as D);

  // Mutable value stores that survive pane recreation
  const baseValuesRef = useRef<T>({ ...initialParams });
  const debugValuesRef = useRef<D>({ ...(hookOptions?.debugParams ?? {}) } as D);

  const [params, setParams] = useState<T & D>(() => ({
    ...initialParams,
    ...(hookOptions?.debugParams ?? {}),
  } as T & D));

  const paneRef = useRef<Pane | null>(null);
  const { devMode } = useDevMode();

  // Extract drag-attach logic so it can be reused across both effects
  function attachDrag(pane: Pane): () => void {
    const container = pane.element.parentElement;
    if (container) container.style.zIndex = '9999';

    const titleBar = pane.element.querySelector<HTMLElement>('.tp-rotv_b');
    if (!titleBar || !container) return () => {};

    titleBar.style.cursor = 'grab';

    const onMouseDown = (e: MouseEvent) => {
      if (!container.style.left) {
        const rect = container.getBoundingClientRect();
        container.style.right = 'auto';
        container.style.left = `${rect.left}px`;
        container.style.top = `${rect.top}px`;
      }

      const originX = e.clientX;
      const originY = e.clientY;
      const startX = e.clientX - container.getBoundingClientRect().left;
      const startY = e.clientY - container.getBoundingClientRect().top;
      let didDrag = false;
      titleBar.style.cursor = 'grabbing';

      const onMouseMove = (mv: MouseEvent) => {
        if (!didDrag && Math.hypot(mv.clientX - originX, mv.clientY - originY) < 4) return;
        didDrag = true;
        const x = Math.max(0, Math.min(mv.clientX - startX, window.innerWidth - container.offsetWidth));
        const y = Math.max(0, Math.min(mv.clientY - startY, window.innerHeight - container.offsetHeight));
        container.style.left = `${x}px`;
        container.style.top = `${y}px`;
      };

      const onMouseUp = () => {
        titleBar.style.cursor = 'grab';
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        if (didDrag) {
          const suppressClick = (ce: MouseEvent) => {
            ce.stopPropagation();
            titleBar.removeEventListener('click', suppressClick, true);
          };
          titleBar.addEventListener('click', suppressClick, true);
        }
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    titleBar.addEventListener('mousedown', onMouseDown);
    return () => titleBar.removeEventListener('mousedown', onMouseDown);
  }

  // ── Case A: no debugParams — create once, show/hide on debug mode ──────────
  useEffect(() => {
    if (hasDebugParams) return;

    const pane = new Pane({ title: 'Parameters', expanded: true });
    paneRef.current = pane;

    for (const key of Object.keys(initialParamsRef.current)) {
      const opts = bindingOptions?.[key] ?? {};
      const binding = pane.addBinding(baseValuesRef.current, key as keyof T & string, opts);
      binding.on('change', (ev: { value: T[keyof T] }) => {
        baseValuesRef.current = { ...baseValuesRef.current, [key]: ev.value };
        setParams({ ...baseValuesRef.current } as T & D);
      });
    }

    for (const btn of hookOptions?.buttons ?? []) {
      pane.addButton({ title: btn.title, label: btn.label ?? '' }).on('click', () => btn.onClick());
    }

    pane.element.style.display = (alwaysVisible || devMode) ? '' : 'none';
    const cleanupDrag = attachDrag(pane);

    return () => {
      cleanupDrag();
      pane.dispose();
      paneRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show/hide without recreation (Case A only)
  useEffect(() => {
    if (hasDebugParams || !paneRef.current) return;
    if (!alwaysVisible) {
      paneRef.current.element.style.display = devMode ? '' : 'none';
    }
  }, [devMode, alwaysVisible, hasDebugParams]);

  // ── Case B: debugParams present — recreate pane when debug mode changes ────
  useEffect(() => {
    if (!hasDebugParams) return;

    if (paneRef.current) {
      paneRef.current.dispose();
      paneRef.current = null;
    }

    const pane = new Pane({ title: 'Parameters', expanded: true });
    paneRef.current = pane;

    // Always-visible base bindings
    for (const key of Object.keys(initialParamsRef.current)) {
      const opts = bindingOptions?.[key] ?? {};
      const binding = pane.addBinding(baseValuesRef.current, key as keyof T & string, opts);
      binding.on('change', (ev: { value: unknown }) => {
        baseValuesRef.current = { ...baseValuesRef.current, [key]: ev.value as T[keyof T] };
        setParams({ ...baseValuesRef.current, ...debugValuesRef.current } as T & D);
      });
    }

    // Debug-only bindings
    if (devMode) {
      for (const key of Object.keys(initialDebugParamsRef.current)) {
        const opts = hookOptions?.debugBindingOptions?.[key] ?? {};
        const binding = pane.addBinding(debugValuesRef.current, key as keyof D & string, opts);
        binding.on('change', (ev: { value: unknown }) => {
          debugValuesRef.current = { ...debugValuesRef.current, [key]: ev.value as D[keyof D] };
          setParams({ ...baseValuesRef.current, ...debugValuesRef.current } as T & D);
        });
      }
    }

    for (const btn of hookOptions?.buttons ?? []) {
      pane.addButton({ title: btn.title, label: btn.label ?? '' }).on('click', () => btn.onClick());
    }

    pane.element.style.display = (alwaysVisible || devMode) ? '' : 'none';
    const cleanupDrag = attachDrag(pane);

    return () => {
      cleanupDrag();
      pane.dispose();
      paneRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devMode]);

  return { params };
}

// ─────────────────────────────────────────────────────────────────────────────
// DevModeControls — global ⌘. toggle for dev mode. Renders nothing itself.
// Lives inside DevModeProvider so it (and the wrapped prototype) share state.
// ─────────────────────────────────────────────────────────────────────────────

function DevModeControls() {
  const { toggleDevMode } = useDevMode();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '.') {
        e.preventDefault();
        toggleDevMode();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggleDevMode]);

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// AnnotationToolbar — the Agentation visual-feedback toolbar. Shown only when
// dev mode is on (and never in production). Reads the shared dev-mode context,
// so it must be mounted inside DevTools / DevModeProvider.
// ─────────────────────────────────────────────────────────────────────────────

export function AnnotationToolbar() {
  const { devMode } = useDevMode();
  if (process.env.NODE_ENV !== 'development') return null;
  if (!devMode) return null;
  return <Agentation />;
}

// ─────────────────────────────────────────────────────────────────────────────
// DevTools — top-level mount: wraps the whole app in DevModeProvider so
// prototypes' useTweakpane shares dev-mode state, plus the palette, the ⌘.
// toggle, and the dev-mode-gated annotation toolbar.
// ─────────────────────────────────────────────────────────────────────────────

export function DevTools({
  children,
}: {
  children?: React.ReactNode;
  appId?: string;
  registry?: unknown;
}) {
  return (
    <DevModeProvider>
      {children}
      <CommandPalette />
      <DevModeControls />
      <AnnotationToolbar />
    </DevModeProvider>
  );
}
