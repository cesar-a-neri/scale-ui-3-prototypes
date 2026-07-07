'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Agent Builder — a conversational assistant that proposes changes to an agent's
// configuration. A sparkle CTA (config header + main-pane toolbar) opens a right
// chat drawer: you describe a goal (optionally referencing conversation threads),
// and the builder replies with a field-level diff card (per-field Accept / Dismiss
// + Accept all). Changes only land when you accept — a manual review gate even
// though the agent could self-apply. "Apply" mutates the real config state, so
// accepted changes are reflected in the Configure Agent form.
//
// Mobbin lineage (web): OpenAI Platform sparkle entry beside "System instructions"
// + Remote "Revise with AI ✦" right drawer + GitHub accept/request-changes review.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useRef, useState } from 'react';
import {
  Check, X, ChevronRight, ArrowUp, Plus, Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { IntegrationLogo } from './customizable-agents';

const ACCENT      = 'var(--proto-accent)';
const ACCENT_TINT = 'var(--proto-accent-tint)';
const ACCENT_TEXT = 'var(--proto-accent-text)';

// Diff palette (GitHub-ish, kept neutral so it reads on a light surface).
const ADD_BG = '#F1FBF5', ADD_TEXT = '#1A7F37', ADD_BORDER = '#B7E3C4';
const DEL_BG = '#FEF7F4', DEL_TEXT = '#B35900', DEL_BORDER = '#F3C9AE';


// ─── Proposal model ──────────────────────────────────────────────────────────────

export interface AgentConfigState {
  instructions: string; setInstructions: (v: string) => void;
  model: string; setModel: (v: string) => void;
  capability: string; setCapability: (v: string) => void;
  connected: string[]; setConnected: (v: string[]) => void;
}

interface FieldChange {
  key: string;
  section: string;
  label: string;
  kind: 'value' | 'block' | 'integration';
  before: string;
  after: string;
  note: string;
  addedLines?: string[];   // for block (instructions) diffs
  integrationId?: string;
  integrationName?: string;
  apply: () => void;
}

const MODEL_LABELS: Record<string, string> = {
  'claude-opus-4': 'Claude Opus 4.8',
  'claude-sonnet-4': 'Claude Sonnet 4.6',
  'gpt-4o': 'GPT-4o',
  'gemini-pro': 'Gemini 2.0 Pro',
};
const CAP_LABELS: Record<string, string> = {
  readonly: 'Read-Only',
  readwrite: 'Read + Write',
  unlimited: 'Unlimited',
};

const TARGET_MODEL = 'claude-opus-4';
const TARGET_CAP = 'readwrite';
const TARGET_INTEGRATION = 'notion';
const CITATION_BLOCK = `## Source Citations
- Cite every factual claim inline with [n] markers, and list full references at the end.
- Prefer primary sources; include publication dates for time-sensitive claims.`;

function withCitationBlock(instructions: string): string {
  if (instructions.includes('## Source Citations')) return instructions;
  return `${instructions.trimEnd()}\n\n${CITATION_BLOCK}`;
}

// The demo goal the builder is "responding to". Framed as arising from the
// referenced threads (see REFERENCE_THREADS) — "these threads show issue Z,
// let's fix it" — so the thread-reference affordance reads as load-bearing.
export const BUILDER_GOAL = 'These threads keep stating claims without citing anything, and they surface bugs the agent can’t file. Make it cite its sources, and let it open a Linear ticket when it spots a bug.';

// Rebuilt from live state every render, so accepted changes drop off the list.
function buildProposal(cfg: AgentConfigState): FieldChange[] {
  const changes: FieldChange[] = [];

  const nextInstructions = withCitationBlock(cfg.instructions);
  if (nextInstructions !== cfg.instructions) {
    changes.push({
      key: 'instructions',
      section: 'System Instructions',
      label: 'System Instructions',
      kind: 'block',
      before: cfg.instructions,
      after: nextInstructions,
      addedLines: CITATION_BLOCK.split('\n'),
      note: 'Adds a citation guideline so answers are traceable to sources.',
      apply: () => cfg.setInstructions(nextInstructions),
    });
  }

  if (cfg.capability !== TARGET_CAP) {
    changes.push({
      key: 'capability',
      section: 'Capabilities',
      label: 'Capability level',
      kind: 'value',
      before: CAP_LABELS[cfg.capability] ?? cfg.capability,
      after: CAP_LABELS[TARGET_CAP],
      note: 'Filing Linear tickets is a write action — Read-Only would block it.',
      apply: () => cfg.setCapability(TARGET_CAP),
    });
  }

  if (cfg.model !== TARGET_MODEL) {
    changes.push({
      key: 'model',
      section: 'Model & Harness',
      label: 'Model',
      kind: 'value',
      before: MODEL_LABELS[cfg.model] ?? cfg.model,
      after: MODEL_LABELS[TARGET_MODEL],
      note: 'Stronger synthesis and multi-step reasoning for triaging bugs.',
      apply: () => cfg.setModel(TARGET_MODEL),
    });
  }

  if (!cfg.connected.includes(TARGET_INTEGRATION)) {
    changes.push({
      key: 'integration-notion',
      section: 'Integrations',
      label: 'Connect integration',
      kind: 'integration',
      integrationId: TARGET_INTEGRATION,
      integrationName: 'Notion',
      before: 'Not connected',
      after: 'Connected',
      note: 'So the agent can post its research summaries alongside filed tickets.',
      apply: () => cfg.setConnected([...cfg.connected, TARGET_INTEGRATION]),
    });
  }

  return changes;
}

// ─── Shared primitives ──────────────────────────────────────────────────────────

// Three-sparkle "refine" glyph (from the Trace 03 icon set). Uses currentColor so
// it inherits the button's text color.
function RefineIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M12.25 2.65625L14 2L14.6562 0.21875C14.7188 0.09375 14.8438 0 15 0C15.1562 0 15.2812 0.09375 15.3438 0.21875L16 2L17.7812 2.65625C17.9062 2.71875 18 2.84375 18 3C18 3.15625 17.9062 3.28125 17.7812 3.34375L16 4L15.3438 5.78125C15.2812 5.90625 15.1562 6 15 6C14.8438 6 14.7188 5.90625 14.6562 5.78125L14 4L12.25 3.34375C12.0938 3.28125 12 3.15625 12 3C12 2.84375 12.0938 2.71875 12.25 2.65625ZM5.25 7.53125V7.5C5.09375 7.84375 4.84375 8.09375 4.53125 8.25L2.875 9L4.5 9.75C4.84375 9.90625 5.09375 10.1562 5.25 10.5L6 12.125L6.75 10.5C6.90625 10.1562 7.15625 9.90625 7.5 9.75L9.125 9L7.5 8.25C7.15625 8.09375 6.90625 7.84375 6.75 7.53125L6 5.875L5.25 7.53125ZM5.1875 4.09375C5.1875 4.0625 5.125 4.21875 5.5625 3.28125C5.625 3.125 5.8125 3 6 3C6.1875 3 6.375 3.125 6.46875 3.28125C6.65625 3.6875 6.75 3.96875 6.8125 4.09375H6.84375L8.125 6.90625C10.6875 8.09375 10.75 8.09375 11.7188 8.5625C11.875 8.625 12 8.8125 12 9C12 9.1875 11.875 9.375 11.7188 9.46875C11.3125 9.65625 11.0312 9.75 10.9375 9.8125L10.9062 9.84375L8.125 11.125C6.9375 13.6875 6.90625 13.75 6.46875 14.7188C6.375 14.875 6.1875 15 6 15C5.8125 15 5.625 14.875 5.5625 14.7188C5.375 14.3125 5.25 14.0312 5.1875 13.9375V13.9062L3.875 11.125L1.09375 9.8125C0.96875 9.75 0.6875 9.625 0.28125 9.46875C0.125 9.375 0 9.1875 0 9C0 8.8125 0.125 8.625 0.28125 8.5625C0.6875 8.375 0.96875 8.25 1.09375 8.1875L3.875 6.875L5.1875 4.09375ZM13 14L13.6562 12.25C13.7188 12.0938 13.8438 12 14 12C14.1562 12 14.2812 12.0938 14.3438 12.25L15 14L16.7812 14.6562C16.9062 14.7188 17 14.8438 17 15C17 15.1562 16.9062 15.2812 16.7812 15.3438L15 16L14.3438 17.7812C14.2812 17.9062 14.1562 18 14 18C13.8438 18 13.7188 17.9062 13.6562 17.7812L13 16L11.25 15.3438C11.0938 15.2812 11 15.1562 11 15C11 14.8438 11.0938 14.7188 11.25 14.6562L13 14Z" fill="currentColor" />
    </svg>
  );
}

// Entry-point button. Deliberately a secondary affordance (outlined, not a filled
// primary) — refining an agent is optional assistance, not the main action.
export function BuilderCTA({ onClick, variant = 'outline', label = 'Refine' }: {
  onClick: () => void; variant?: 'outline' | 'ghost' | 'icon'; label?: string;
}) {
  if (variant === 'icon') {
    return (
      <button type="button" onClick={onClick} title={label}
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
        style={{ color: ACCENT_TEXT }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--proto-accent-tint)')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
        <RefineIcon size={16} />
      </button>
    );
  }
  if (variant === 'ghost') {
    return (
      <button type="button" onClick={onClick}
        className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[13px] font-medium transition-colors"
        style={{ color: ACCENT_TEXT }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--proto-accent-tint)')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
        <RefineIcon size={15} /> {label}
      </button>
    );
  }
  // Default: a secondary, outlined button — not a primary/filled CTA.
  return (
    <button type="button" onClick={onClick}
      className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[13px] font-medium transition-colors"
      style={{ color: ACCENT_TEXT, border: '1px solid var(--proto-accent-muted)' }}
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--proto-accent-tint)')}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
      <RefineIcon size={15} /> {label}
    </button>
  );
}

// A single field's before→after. `compact` drops the note for dense contexts.
function DiffField({ change, compact = false }: { change: FieldChange; compact?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12px] font-semibold text-[#19202F]">{change.label}</span>
      {change.kind === 'block' ? (
        <div className="rounded-md overflow-hidden" style={{ border: '1px solid #EDEFF3' }}>
          <div className="px-2.5 py-1 text-[11px] text-[#818EA9] bg-[#FAFBFC]">Appended to instructions</div>
          {(change.addedLines ?? []).map((ln, i) => (
            <div key={i} className="px-2.5 py-0.5 text-[12px] font-mono leading-[1.6] whitespace-pre-wrap"
              style={{ backgroundColor: ADD_BG, color: ADD_TEXT }}>
              <span className="opacity-60 select-none mr-1.5">+</span>{ln || ' '}
            </div>
          ))}
        </div>
      ) : change.kind === 'integration' ? (
        <div className="flex items-center gap-2 px-2.5 py-2 rounded-md" style={{ backgroundColor: ADD_BG, border: `1px solid ${ADD_BORDER}` }}>
          {change.integrationId && <IntegrationLogo id={change.integrationId} size={16} />}
          <span className="text-[12px] font-medium" style={{ color: ADD_TEXT }}>{change.integrationName ?? change.after}</span>
          <span className="text-[11px] font-medium ml-auto" style={{ color: ADD_TEXT }}>{change.after}</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 flex-wrap text-[12px]">
          <span className="px-1.5 py-0.5 rounded font-medium line-through" style={{ backgroundColor: DEL_BG, color: DEL_TEXT, border: `1px solid ${DEL_BORDER}` }}>{change.before}</span>
          <ChevronRight size={13} className="text-[#818EA9]" />
          <span className="px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: ADD_BG, color: ADD_TEXT, border: `1px solid ${ADD_BORDER}` }}>{change.after}</span>
        </div>
      )}
      {!compact && <p className="text-[11px] leading-[1.5] text-[#818EA9]">{change.note}</p>}
    </div>
  );
}

// Composer — mirrors the ChatPlayground input: adaptive pill (rounded-full when a
// single line, rounded-lg when it wraps), 14px text, layered drop + inset shadow,
// and a circular send button that disables when empty.
function Composer({ placeholder = 'Ask the builder to change something…', onSend }: { placeholder?: string; onSend?: () => void }) {
  const [v, setV] = useState('');
  const [singleLine, setSingleLine] = useState(true);
  const ref = useRef<HTMLTextAreaElement>(null);
  const canSend = v.trim().length > 0;
  const grow = () => {
    const el = ref.current; if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
    setSingleLine(el.scrollHeight <= 30);
  };
  const send = () => { if (!canSend) return; onSend?.(); setV(''); requestAnimationFrame(grow); };
  return (
    <div className={cn('relative bg-white transition-[border-radius]', singleLine ? 'rounded-full' : 'rounded-lg')}
      style={{ border: '1px solid #e9e9eb', boxShadow: '0px 3px 15px 0px rgba(0,0,0,0.15)' }}>
      <div className="flex items-end gap-2 pt-3 pb-3 pl-4 pr-3">
        <textarea ref={ref} rows={1} value={v}
          onChange={e => { setV(e.target.value); grow(); }}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={placeholder}
          className="flex-1 min-w-0 resize-none bg-transparent text-[14px] font-normal leading-6 outline-none block"
          style={{ color: '#19202f', caretColor: '#19202f', maxHeight: '160px' }} />
        <button type="button" onClick={send} disabled={!canSend}
          className="flex items-center justify-center w-6 h-6 rounded-full transition-all flex-shrink-0"
          style={canSend ? { backgroundColor: ACCENT, color: '#fff' } : { backgroundColor: '#f0f0f3', color: '#818ea9' }}>
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className={cn('absolute inset-0 pointer-events-none', singleLine ? 'rounded-full' : 'rounded-lg')}
        style={{ boxShadow: 'inset 0px 0px 2px 0px rgba(0,0,0,0.1), inset 0px 0px 2px 0px rgba(0,96,255,0.03)' }} />
    </div>
  );
}

// Assistant message — borderless 14px/1.8 text, matching the playground.
function AssistantBubble({ children }: { children: React.ReactNode }) {
  return <div className="text-[14px] font-normal leading-[1.8]" style={{ color: '#19202f' }}>{children}</div>;
}

// User message — the playground bubble (14px/1.8, asymmetric 24px radius,
// #fcfcfc fill), right-aligned.
function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <div className="px-3 py-2.5 text-[14px] font-normal leading-[1.8]"
        style={{ backgroundColor: '#fcfcfc', border: '1px solid #e9e9eb', borderRadius: '24px 24px 2px 24px', color: '#19202f', maxWidth: '85%' }}>
        {children}
      </div>
    </div>
  );
}

// Side panel that mirrors the left CombinedSidebar's design language (muted
// ground, soft shadow, #e9e9eb hairlines) and sits in the flex row so it PUSHES
// the content rather than overlaying it.
function SidePanelShell({ title, subtitle, badge, onClose, children }: { title: string; subtitle?: string; badge?: React.ReactNode; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="relative flex flex-col shrink-0 overflow-hidden shadow-md z-10 h-full w-[380px]" style={{ backgroundColor: '#FAFAFA', borderLeft: '1px solid #e9e9eb' }}>
      <div className="flex items-center gap-2 h-14 px-3 shrink-0">
        <div className="flex flex-col leading-tight min-w-0">
          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[#19202F]">{title} {badge}</span>
          {subtitle && <span className="text-[11px] text-[#818EA9] truncate">{subtitle}</span>}
        </div>
        <button type="button" onClick={onClose} className="ml-auto w-8 h-8 rounded-md flex items-center justify-center shrink-0 text-[#5b6579] hover:bg-[#EBEBEE] transition-colors">
          <X size={15} />
        </button>
      </div>
      {children}
    </div>
  );
}

// ─── Thread references ───────────────────────────────────────────────────────
// Every builder direction lets you point the improvement at specific conversation
// threads ("Threads X and Y show issue Z — fix it"), so the agent's changes are
// grounded in real transcripts rather than an abstract prompt. Mirrors the
// command center's THREADS; kept local to avoid a circular import.

export interface RefThread { id: string; title: string; messages: number; date: string; }

const REFERENCE_THREADS: RefThread[] = [
  { id: 't1', title: 'Enterprise AI trends 2025', messages: 3, date: 'Today' },
  { id: 't2', title: 'Competitor analysis: OpenAI vs Anthropic', messages: 7, date: 'Yesterday' },
  { id: 't3', title: 'Market sizing for agentic platforms', messages: 12, date: 'Jun 23' },
  { id: 't4', title: 'Regulatory landscape for AI in EU', messages: 5, date: 'Jun 21' },
  { id: 't5', title: 'Integration options with Salesforce', messages: 9, date: 'Jun 20' },
];
// Two research threads pre-selected so the demo opens mid-scenario.
const DEFAULT_REF_IDS = ['t2', 't3'];
// Frozen snapshot of what the sent user message referenced — the read-only pill
// in the message must NOT change when you edit the live selection at the bottom.
const INITIAL_REF_THREADS = REFERENCE_THREADS.filter(t => DEFAULT_REF_IDS.includes(t.id));

interface ThreadRefs {
  ids: Set<string>;
  threads: RefThread[];              // selected, in list order
  toggle: (id: string) => void;
  remove: (id: string) => void;
}

function useThreadRefs(initial: string[] = DEFAULT_REF_IDS): ThreadRefs {
  const [ids, setIds] = useState<Set<string>>(new Set(initial));
  return {
    ids,
    threads: REFERENCE_THREADS.filter(t => ids.has(t.id)),
    toggle: (id) => setIds(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }),
    remove: (id) => setIds(p => { const n = new Set(p); n.delete(id); return n; }),
  };
}

// Read-only summary pill shown inside a user message: "N Threads Selected".
function ReferencedThreads({ threads }: { threads: RefThread[] }) {
  if (threads.length === 0) return null;
  return (
    <div className="mt-2">
      <Badge variant="outline" className="h-7 text-[11px] font-normal text-muted-foreground bg-white">{threads.length} Thread{threads.length === 1 ? '' : 's'} Selected</Badge>
    </div>
  );
}

// Editable reference bar — a single "N Threads Selected" pill (✕ clears all;
// clicking it opens the picker modal), or a dashed trigger when none are selected.
function ThreadRefBar({ refs }: { refs: ThreadRefs }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const count = refs.threads.length;
  const clearAll = () => refs.threads.forEach(t => refs.remove(t.id));
  const openModal = () => { setQuery(''); setOpen(true); };
  const q = query.trim().toLowerCase();
  const filtered = q ? REFERENCE_THREADS.filter(t => t.title.toLowerCase().includes(q)) : REFERENCE_THREADS;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {count > 0 ? (
        <Badge variant="outline" className="h-7 gap-1 pr-1 text-[11px] font-normal text-muted-foreground bg-white">
          <button type="button" onClick={openModal} className="hover:opacity-70">
            {count} Thread{count === 1 ? '' : 's'} Selected
          </button>
          <button type="button" onClick={clearAll} title="Clear"
            className="rounded-full flex items-center justify-center hover:bg-muted"><X className="size-3" /></button>
        </Badge>
      ) : (
        <button type="button" onClick={openModal}
          className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-[12px] font-medium transition-colors hover:bg-[#F5F5F8]"
          style={{ color: '#5b6579' }}>
          <Plus size={12} /> Reference Threads
        </button>
      )}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ backgroundColor: 'rgba(15,18,30,0.45)' }} onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-[420px] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 px-4 h-12 shrink-0" style={{ borderBottom: '1px solid #F0F0F3' }}>
              <span className="text-[13px] font-semibold text-[#19202F]">Reference threads</span>
              <button type="button" onClick={() => setOpen(false)} className="ml-auto w-7 h-7 rounded-md flex items-center justify-center text-[#818EA9] hover:bg-[#F3F4F6]"><X size={15} /></button>
            </div>
            <div className="px-4 py-2.5 shrink-0">
              <div className="flex items-center gap-2 h-8 px-2.5 rounded-md" style={{ border: '1px solid #E5E7EB' }}>
                <Search size={14} className="text-[#818EA9] shrink-0" />
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search threads…" autoFocus
                  className="flex-1 min-w-0 bg-transparent text-[13px] outline-none placeholder:text-[#9CA3AF]" style={{ color: '#19202f' }} />
              </div>
            </div>
            <div className="max-h-[320px] overflow-y-auto py-1.5">
              {filtered.length === 0 ? (
                <div className="px-4 py-6 text-[12px] text-center text-[#818EA9]">No threads match “{query}”.</div>
              ) : filtered.map(t => {
                const on = refs.ids.has(t.id);
                return (
                  <button key={t.id} type="button" onClick={() => refs.toggle(t.id)}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-left hover:bg-[#F5F5F8]">
                    <span className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                      style={{ border: on ? 'none' : '1px solid #D1D5DB', backgroundColor: on ? ACCENT : 'transparent', color: '#fff' }}>
                      {on && <Check size={11} />}
                    </span>
                    <span className="flex flex-col min-w-0">
                      <span className="text-[13px] text-[#19202F] truncate">{t.title}</span>
                      <span className="text-[11px] text-[#818EA9]">{t.messages} messages · {t.date}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-end px-4 py-3 shrink-0" style={{ borderTop: '1px solid #F0F0F3' }}>
              <button type="button" onClick={() => setOpen(false)}
                className="h-8 px-3 rounded-md text-[12px] font-medium text-white hover:opacity-90" style={{ backgroundColor: ACCENT }}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
      <span className="text-[16px] font-medium text-[#19202f]">Refine this agent</span>
      <span className="text-[13px] text-[#818ea9] mt-1.5 leading-[1.5] max-w-[260px]">Describe a change below to get a set of proposed updates to review.</span>
    </div>
  );
}

// ─── Chat + diff review drawer ───────────────────────────────────────────────

function ChatDiffDrawer({ cfg, onClose }: { cfg: AgentConfigState; onClose: () => void }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  // The panel opens empty; sending any message switches to the mocked conversation.
  const [submitted, setSubmitted] = useState(false);
  const refs = useThreadRefs([]);
  const changes = buildProposal(cfg).filter(c => !dismissed.has(c.key));
  const dismiss = (k: string) => setDismissed(p => new Set(p).add(k));
  const acceptAll = () => changes.forEach(c => c.apply());
  const dismissAll = () => setDismissed(p => { const n = new Set(p); changes.forEach(c => n.add(c.key)); return n; });
  const isEmpty = !submitted;

  // Right-aligned per-change actions: ghost Dismiss + a plain outlined Accept.
  const actions = (c: FieldChange) => (
    <div className="flex items-center justify-end gap-2">
      <button type="button" onClick={() => dismiss(c.key)}
        className="px-1 text-[12px] font-medium text-[#818EA9] hover:text-[#5b6579]">Dismiss</button>
      <button type="button" onClick={c.apply}
        className="h-7 px-3 rounded-md text-[12px] font-medium text-[#19202F] bg-white border border-[#E5E7EB] hover:bg-[#F5F5F8]">Accept</button>
    </div>
  );

  return (
    <SidePanelShell title="Agent Builder" onClose={onClose}>
      {isEmpty ? (
        <EmptyState />
      ) : (
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-5">
        <UserBubble>{BUILDER_GOAL}<ReferencedThreads threads={INITIAL_REF_THREADS} /></UserBubble>
        <AssistantBubble>
          <p className="mb-3">Here&apos;s what I&apos;d change to do that. I can apply these myself, but I&apos;ll wait for you to review:</p>
          {changes.length === 0 ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px]" style={{ backgroundColor: ADD_BG, color: ADD_TEXT }}>
              <Check size={14} /> All proposed changes applied.
            </div>
          ) : (
            <div className="flex flex-col mt-1" style={{ borderTop: '1px solid #F0F0F3' }}>
              {changes.map(c => (
                <div key={c.key} className="py-3 flex flex-col gap-2" style={{ borderBottom: '1px solid #F0F0F3' }}>
                  <DiffField change={c} compact />
                  {actions(c)}
                </div>
              ))}
            </div>
          )}
        </AssistantBubble>
      </div>
      )}
      <div className="px-4 py-3 shrink-0 flex flex-col gap-2.5">
        {!isEmpty && changes.length > 0 && (
          <div className="flex items-center justify-between gap-2 rounded-xl px-3 py-2" style={{ backgroundColor: '#F1F0F5' }}>
            <span className="text-[13px] font-medium text-[#5b6579]">{changes.length} Suggestion{changes.length === 1 ? '' : 's'}</span>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={dismissAll}
                className="h-8 px-2.5 rounded-lg text-[13px] font-medium text-[#818EA9] hover:text-[#5b6579] hover:bg-black/5 transition-colors">Dismiss</button>
              <button type="button" onClick={acceptAll}
                className="h-8 px-3 rounded-lg text-[13px] font-medium text-[#19202F] bg-white border border-[#E5E7EB] hover:bg-[#F5F5F8] transition-colors">Accept All</button>
            </div>
          </div>
        )}
        <Composer onSend={() => setSubmitted(true)} />
        <ThreadRefBar refs={refs} />
      </div>
    </SidePanelShell>
  );
}

// ─── Mount ───────────────────────────────────────────────────────────────────

// Docked side panel — rendered as a flex sibling in the command-center row so it
// pushes the content left rather than overlaying it.
export function BuilderSidePanel({ open, onClose, cfg }: {
  open: boolean; onClose: () => void; cfg: AgentConfigState;
}) {
  if (!open) return null;
  return <ChatDiffDrawer cfg={cfg} onClose={onClose} />;
}
