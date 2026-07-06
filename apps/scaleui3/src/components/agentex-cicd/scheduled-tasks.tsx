'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Scheduled Tasks — Golden Agent
//
// Design exploration for AGX1-368 "Scheduled Agent Runs". Five distinct UI
// approaches to the same feature, toggled from Tweakpane so they can be
// compared side by side. Each schedule attaches a recurring cadence to the
// agent: on each fire a fresh agent run is created with a preset prompt.
//
// A schedule holds: name, prompt (initial message), cadence (cron or interval)
// with a timezone, next/last run, run count, and an Active/Paused state.
// Surfaced actions mirror the shipped v1 backend: Create / Edit / List /
// Pause · Resume / Run now / Delete / View runs.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import {
  Clock, Play, Pause, Plus, MoreHorizontal, Trash2, Pencil,
  Repeat, ArrowUp, Search, X, CalendarClock, Check, SkipForward, AlarmClockOff, TriangleAlert, ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { IntegrationLogo, INTEGRATIONS } from './customizable-agents';

// ─── Design tokens (shared with the Golden Agent prototype) ──────────────────

const ACCENT       = 'var(--proto-accent)';
const ACCENT_TINT  = 'var(--proto-accent-tint)';
const ACCENT_TEXT  = 'var(--proto-accent-text)';
const ACCENT_SOFT  = 'var(--proto-accent-soft)';

export type ScheduledVariant = 'list' | 'cards' | 'table' | 'detail' | 'timeline';

// ─── Data model ───────────────────────────────────────────────────────────────

interface RunRecord {
  id: string;
  when: string;          // "Today, 5:00 PM"
  status: 'success' | 'failed' | 'running';
  duration: string;      // "2m 14s"
  trigger: 'scheduled' | 'manual';
}

interface Schedule {
  id: string;
  name: string;
  prompt: string;
  cadenceLabel: string;  // human-readable, e.g. "Weekdays at 5:00 PM"
  cron: string;          // "0 17 * * MON-FRI"
  timezone: string;      // "America/New_York"
  nextRun: string;       // "Today, 5:00 PM"
  lastRun: string | null;
  runCount: number;
  status: 'active' | 'paused';
  tools: string[];       // integration ids
  runs: RunRecord[];
  cadence?: Cadence;     // structured cadence, so the editor can prefill the builder
  // Persisted "pause until a date" (Temporal activation time). While set, all
  // fires are suppressed until the label's moment — this is how snooze and the
  // approximate "skip next run" are backed. Holds a human phrase, e.g.
  // "until tomorrow" or "until after Today, 5:00 PM".
  snoozedUntil?: string;
}

const mkRuns = (base: [string, RunRecord['status']][]): RunRecord[] =>
  base.map(([when, status], i) => ({
    id: `r${i}`,
    when,
    status,
    duration: status === 'running' ? '—' : ['2m 14s', '1m 42s', '3m 05s', '0m 58s', '2m 31s'][i % 5],
    trigger: i === 0 && status === 'running' ? 'manual' : 'scheduled',
  }));

const INITIAL_SCHEDULES: Schedule[] = [
  {
    id: 's1',
    name: 'Daily Granola summary',
    prompt: "Check today's Granola notes, summarize key follow-ups, and send me a Slack DM.",
    cadenceLabel: 'Weekdays at 5:00 PM',
    cron: '0 17 * * MON-FRI',
    timezone: 'America/New_York',
    nextRun: 'Today, 5:00 PM',
    lastRun: 'Yesterday, 5:00 PM',
    runCount: 42,
    status: 'active',
    tools: ['slack', 'granola'],
    runs: mkRuns([['Yesterday, 5:00 PM', 'success'], ['Wed, 5:00 PM', 'success'], ['Tue, 5:00 PM', 'success'], ['Mon, 5:00 PM', 'failed']]),
    cadence: { mode: 'weekly', time: '5:00 PM', weekdays: [1, 2, 3, 4, 5], every: 8, unit: 'hours', monthDay: 1 },
  },
  {
    id: 's2',
    name: 'Morning PR status',
    prompt: 'Summarize open pull requests that need my review and post the digest to #eng-standup.',
    cadenceLabel: 'Every day at 9:00 AM',
    cron: '0 9 * * *',
    timezone: 'America/New_York',
    nextRun: 'Tomorrow, 9:00 AM',
    lastRun: 'Today, 9:00 AM',
    runCount: 118,
    status: 'active',
    tools: ['github', 'slack'],
    runs: mkRuns([['Today, 9:00 AM', 'success'], ['Yesterday, 9:00 AM', 'success'], ['Wed, 9:00 AM', 'success']]),
    cadence: { mode: 'daily', time: '9:00 AM', weekdays: [1, 2, 3, 4, 5], every: 8, unit: 'hours', monthDay: 1 },
  },
  {
    id: 's3',
    name: 'Weekly competitor digest',
    prompt: 'Research notable moves from OpenAI, Google, and Mistral this week and write a Notion brief.',
    cadenceLabel: 'Mondays at 8:00 AM',
    cron: '0 8 * * MON',
    timezone: 'America/New_York',
    nextRun: 'Mon, Jul 7, 8:00 AM',
    lastRun: 'Mon, Jun 30, 8:00 AM',
    runCount: 9,
    status: 'paused',
    tools: ['notion'],
    runs: mkRuns([['Mon, Jun 30, 8:00 AM', 'success'], ['Mon, Jun 23, 8:00 AM', 'success']]),
    cadence: { mode: 'weekly', time: '8:00 AM', weekdays: [1], every: 8, unit: 'hours', monthDay: 1 },
  },
  {
    id: 's4',
    name: 'Hourly support triage',
    prompt: 'Classify new support tickets by severity and create Linear issues for anything P0 or P1.',
    cadenceLabel: 'Every hour',
    cron: '@every 1h',
    timezone: 'UTC',
    nextRun: 'In 38 minutes',
    lastRun: '22 minutes ago',
    runCount: 512,
    status: 'active',
    tools: ['linear'],
    runs: mkRuns([['22 minutes ago', 'running'], ['1 hour ago', 'success'], ['2 hours ago', 'success'], ['3 hours ago', 'success']]),
    cadence: { mode: 'interval', time: '9:00 AM', weekdays: [1, 2, 3, 4, 5], every: 1, unit: 'hours', monthDay: 1 },
  },
  {
    id: 's5',
    name: 'Month-end metrics report',
    prompt: 'Compile the monthly usage metrics and publish the summary to the Confluence dashboard.',
    cadenceLabel: 'Monthly on the 28th',
    cron: '0 18 28 * *',
    timezone: 'America/Los_Angeles',
    nextRun: 'Jul 28, 6:00 PM',
    lastRun: 'Jun 28, 6:00 PM',
    runCount: 6,
    status: 'active',
    tools: ['confluence'],
    runs: mkRuns([['Jun 28, 6:00 PM', 'success'], ['May 28, 6:00 PM', 'success']]),
    cadence: { mode: 'monthly', time: '6:00 PM', weekdays: [1, 2, 3, 4, 5], every: 8, unit: 'hours', monthDay: 28 },
  },
];

const toolLabel = (id: string) => INTEGRATIONS.find(i => i.id === id)?.label ?? id;

// Backend schedule names are slug identifiers: lowercase letters/numbers/hyphens.
// A friendly display name is auto-slugified to derive it (uniqueness is per slug).
const slugify = (name: string) =>
  name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Magic values that force the (server-side-only) submit failures for the demo.
const FORCE_REJECT = 'force-error';   // → scheduling service rejected the schedule
const FORCE_OFFLINE = 'force-offline'; // → scheduling backend unreachable

const REJECT_MSG = 'The scheduling service rejected this schedule — the cron expression or timezone is invalid. Adjust the schedule and try again.';
const OFFLINE_MSG = 'Couldn’t reach the scheduling service. Check your connection and try again.';

// Error states selectable from Tweakpane while the schedule form is open.
export type ScheduleFormError = 'none' | 'invalidName' | 'duplicateName' | 'missingPrompt' | 'serverRejected' | 'backendUnreachable';

// ─── Shared atoms ─────────────────────────────────────────────────────────────

const StatusBadge = ({ status, size = 'md' }: { status: Schedule['status']; size?: 'sm' | 'md' }) => {
  const active = status === 'active';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-[12px]',
      )}
      style={active
        ? { backgroundColor: 'rgba(0,151,0,0.0863)', color: '#2A7E3B' }
        : { backgroundColor: '#F3F4F6', color: '#6B7280' }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: active ? '#46A758' : '#9CA3AF' }} />
      {active ? 'Active' : 'Paused'}
    </span>
  );
};

const RunStatusDot = ({ status }: { status: RunRecord['status'] }) => {
  const color = status === 'success' ? '#46A758' : status === 'failed' ? '#EF4444' : '#F59E0B';
  return (
    <span className="relative flex w-2 h-2 shrink-0">
      {status === 'running' && (
        <span className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping" style={{ backgroundColor: color }} />
      )}
      <span className="relative inline-flex rounded-full w-2 h-2" style={{ backgroundColor: color }} />
    </span>
  );
};

const CadenceChip = ({ label }: { label: string }) => (
  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[12px] font-medium"
    style={{ backgroundColor: ACCENT_TINT, color: ACCENT_TEXT }}>
    <Repeat size={11} className="shrink-0" />
    {label}
  </span>
);

const ToolChips = ({ ids, size = 16 }: { ids: string[]; size?: number }) => (
  <div className="flex items-center gap-1.5">
    {ids.map(id => (
      <span key={id} title={toolLabel(id)}
        className="w-6 h-6 rounded-md border border-[#E8ECF2] bg-white flex items-center justify-center shrink-0">
        <IntegrationLogo id={id} size={size - 2} />
      </span>
    ))}
  </div>
);

// Row-action kebab menu shared across variants.
const ActionsMenu = ({ schedule, onTogglePause, onRunNow, onRemove, onOpenSnooze, onResume, onEdit, onSkipNext }: {
  schedule: Schedule;
  onTogglePause: (id: string) => void;
  onRunNow: (id: string) => void;
  onRemove: (id: string) => void;
  onOpenSnooze?: (schedule: Schedule) => void;
  onResume?: (id: string) => void;
  onEdit?: (schedule: Schedule) => void;
  onSkipNext?: (id: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const paused = schedule.status === 'paused';
  const snoozed = !!schedule.snoozedUntil;
  const itemCls = 'flex items-center gap-2.5 w-full px-3 py-1.5 text-left text-[13px] text-[#19202F] hover:bg-[#F9F9FB] transition-colors';
  return (
    <div className="relative">
      <button type="button"
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        className={cn('w-7 h-7 rounded-md flex items-center justify-center transition-colors shrink-0',
          open ? 'bg-[#F0F0F3] text-[#19202F]' : 'text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#6B7280]')}
        aria-label="Task actions">
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={e => { e.stopPropagation(); setOpen(false); }} />
          <div className="absolute right-0 top-full mt-1 z-50 py-1 rounded-lg bg-white min-w-[188px]"
            style={{ border: '1px solid #e9e9eb', boxShadow: '0px 8px 24px rgba(0,0,0,0.12)' }}
            onClick={e => e.stopPropagation()}>
            <button type="button" onClick={() => { onRunNow(schedule.id); setOpen(false); }} className={itemCls}>
              <span className="text-[#5b6579] shrink-0"><Play size={14} /></span>Run now
            </button>

            {snoozed ? (
              onResume && (
                <button type="button" onClick={() => { onResume(schedule.id); setOpen(false); }} className={itemCls}>
                  <span className="text-[#5b6579] shrink-0"><AlarmClockOff size={14} /></span>Cancel snooze
                </button>
              )
            ) : (
              <>
                {onSkipNext && (
                  <button type="button" onClick={() => { onSkipNext(schedule.id); setOpen(false); }} className={itemCls}>
                    <span className="text-[#5b6579] shrink-0"><SkipForward size={14} /></span>Skip next run
                  </button>
                )}
                {onOpenSnooze && (
                  <button type="button" onClick={() => { onOpenSnooze(schedule); setOpen(false); }} className={itemCls}>
                    <span className="text-[#5b6579] shrink-0"><Clock size={14} /></span>Snooze
                  </button>
                )}
              </>
            )}

            <button type="button" onClick={() => { onTogglePause(schedule.id); setOpen(false); }} className={itemCls}>
              <span className="text-[#5b6579] shrink-0">{paused ? <Play size={14} /> : <Pause size={14} />}</span>{paused ? 'Resume' : 'Pause'}
            </button>
            {onEdit && (
              <button type="button" onClick={() => { onEdit(schedule); setOpen(false); }} className={itemCls}>
                <span className="text-[#5b6579] shrink-0"><Pencil size={14} /></span>Edit
              </button>
            )}
            <div className="my-1 h-px bg-[#F0F0F3]" />
            <button type="button"
              onClick={() => { onRemove(schedule.id); setOpen(false); }}
              className="flex items-center gap-2.5 w-full px-3 py-1.5 text-left text-[13px] text-[#e5484d] hover:bg-[#FEF2F2] transition-colors">
              <Trash2 size={14} className="shrink-0" />Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const PauseToggle = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
  <button type="button" onClick={e => { e.stopPropagation(); onToggle(); }}
    className="relative flex items-center shrink-0 rounded-full transition-colors"
    style={{ width: 32, height: 18, background: on ? ACCENT : '#D1D5DB' }}
    aria-label={on ? 'Pause schedule' : 'Resume schedule'}>
    <div className="rounded-full bg-white shadow-sm absolute transition-transform"
      style={{ width: 14, height: 14, transform: on ? 'translateX(15px)' : 'translateX(2px)' }} />
  </button>
);

const NewTaskButton = ({ onClick, size = 'md' }: { onClick: () => void; size?: 'sm' | 'md' }) => (
  <button type="button" onClick={onClick}
    className={cn('inline-flex items-center gap-1.5 rounded-md font-medium text-white transition-opacity hover:opacity-90 shrink-0',
      size === 'sm' ? 'h-8 px-3 text-[13px]' : 'h-9 px-3.5 text-[14px]')}
    style={{ background: ACCENT }}>
    <Plus size={size === 'sm' ? 15 : 16} />
    New task
  </button>
);

const PageHeader = ({ count, onCreate, children }: { count: number; onCreate: () => void; children?: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-4">
    <div className="flex flex-col gap-1">
      <h1 className="text-[22px] font-semibold text-[#19202F] tracking-[-0.2px]">Scheduled Tasks</h1>
      <p className="text-[14px] text-[#818EA9]">
        {count} {count === 1 ? 'task runs' : 'tasks run'} automatically on a schedule.
      </p>
    </div>
    <div className="flex items-center gap-2">{children}<NewTaskButton onClick={onCreate} /></div>
  </div>
);

const EmptyState = ({ onCreate }: { onCreate: () => void }) => (
  <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: ACCENT_TINT }}>
      <CalendarClock size={22} style={{ color: ACCENT }} />
    </div>
    <div className="flex flex-col gap-1">
      <p className="text-[15px] font-medium text-[#19202F]">No scheduled tasks yet</p>
      <p className="text-[13px] text-[#818EA9] max-w-[320px]">
        Schedule this agent to run automatically on a recurring cadence with a preset prompt.
      </p>
    </div>
    <div className="mt-1"><NewTaskButton onClick={onCreate} size="sm" /></div>
  </div>
);

// ─── Variant 1: List (minimal, ChatGPT / Gemini) ─────────────────────────────

const ListVariant = ({ schedules, onTogglePause, onRunNow, onRemove, onCreate }: VariantProps) => {
  const active = schedules.filter(s => s.status === 'active');
  const paused = schedules.filter(s => s.status === 'paused');

  const Row = (s: Schedule) => (
    <div key={s.id} className="group flex items-center gap-4 py-3.5 px-3 -mx-3 rounded-lg hover:bg-[#FAFAFB] transition-colors">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: ACCENT_TINT }}>
        <Clock size={17} style={{ color: ACCENT }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-medium text-[#19202F] truncate">{s.name}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 text-[12.5px] text-[#818EA9]">
          <Repeat size={12} className="shrink-0" />
          <span className="truncate">{s.cadenceLabel}</span>
          <span className="text-[#D1D5DB]">·</span>
          <span className="truncate">Next {s.nextRun}</span>
        </div>
      </div>
      <ToolChips ids={s.tools} />
      <StatusBadge status={s.status} size="sm" />
      <ActionsMenu schedule={s} onTogglePause={onTogglePause} onRunNow={onRunNow} onRemove={onRemove} />
    </div>
  );

  return (
    <div className="max-w-[720px] mx-auto px-8 pt-12 pb-16 flex flex-col gap-8">
      <PageHeader count={schedules.length} onCreate={onCreate} />
      {schedules.length === 0 ? <EmptyState onCreate={onCreate} /> : (
        <div className="flex flex-col gap-8">
          <section className="flex flex-col">
            <span className="text-[11px] font-semibold tracking-[0.06em] uppercase text-[#818EA9] mb-1">Active</span>
            <div className="flex flex-col divide-y divide-[#F0F0F3]">
              {active.length ? active.map(Row) : <p className="text-[13px] text-[#818EA9] py-4">No active tasks.</p>}
            </div>
          </section>
          {paused.length > 0 && (
            <section className="flex flex-col">
              <span className="text-[11px] font-semibold tracking-[0.06em] uppercase text-[#818EA9] mb-1">Paused</span>
              <div className="flex flex-col divide-y divide-[#F0F0F3] opacity-75">
                {paused.map(Row)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Variant 2: Cards (rich grid) ────────────────────────────────────────────

const CardsVariant = ({ schedules, onTogglePause, onRunNow, onRemove, onCreate }: VariantProps) => (
  <div className="max-w-[900px] mx-auto px-8 pt-12 pb-16 flex flex-col gap-8">
    <PageHeader count={schedules.length} onCreate={onCreate} />
    {schedules.length === 0 ? <EmptyState onCreate={onCreate} /> : (
      <div className="grid grid-cols-2 gap-4">
        {schedules.map(s => (
          <div key={s.id}
            className="flex flex-col gap-3 p-5 rounded-xl border border-[#E8ECF2] bg-white hover:border-[#C5CFE4] hover:shadow-sm transition-all">
            <div className="flex items-start justify-between gap-2">
              <StatusBadge status={s.status} size="sm" />
              <ActionsMenu schedule={s} onTogglePause={onTogglePause} onRunNow={onRunNow} onRemove={onRemove} />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[15px] font-medium text-[#19202F] leading-snug">{s.name}</span>
              <p className="text-[13px] text-[#5B6579] leading-relaxed line-clamp-2">{s.prompt}</p>
            </div>
            <div className="pt-1"><CadenceChip label={s.cadenceLabel} /></div>
            <div className="mt-auto pt-3 border-t border-[#F3F4F6] flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] text-[#818EA9]">Next run</span>
                <span className="text-[13px] font-medium text-[#19202F]">{s.nextRun}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-0.5 items-end">
                  <span className="text-[11px] text-[#818EA9]">Runs</span>
                  <span className="text-[13px] font-medium text-[#19202F]">{s.runCount}</span>
                </div>
                <ToolChips ids={s.tools} />
              </div>
            </div>
          </div>
        ))}
        {/* Add card */}
        <button type="button" onClick={onCreate}
          className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border border-dashed border-[#D1DAEB] text-[#818EA9] hover:border-[#714DFF] hover:text-[#714DFF] hover:bg-[#FAFAFB] transition-colors min-h-[180px]">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: ACCENT_TINT }}>
            <Plus size={20} style={{ color: ACCENT }} />
          </div>
          <span className="text-[13px] font-medium">New scheduled task</span>
        </button>
      </div>
    )}
  </div>
);

// ─── Variant 3: Table (data-dense, power user) ───────────────────────────────

const TableVariant = ({ schedules, onTogglePause, onRunNow, onRemove, onCreate }: VariantProps) => {
  const [query, setQuery] = useState('');
  const filtered = schedules.filter(s => s.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="max-w-[1040px] mx-auto px-8 pt-12 pb-16 flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-[22px] font-semibold text-[#19202F] tracking-[-0.2px]">Scheduled Tasks</h1>
          <p className="text-[14px] text-[#818EA9]">Manage every recurring run for this agent.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-[#D1DAEB] bg-white w-[220px]">
            <Search size={15} className="text-[#9CA3AF] shrink-0" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search tasks…"
              className="flex-1 min-w-0 text-[13px] text-[#19202F] bg-transparent outline-none placeholder:text-[#9CA3AF]" />
            {query && <button onClick={() => setQuery('')} className="text-[#9CA3AF] hover:text-[#6B7280]"><X size={13} /></button>}
          </div>
          <NewTaskButton onClick={onCreate} />
        </div>
      </div>

      <div className="rounded-xl border border-[#E8ECF2] overflow-hidden bg-white">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#F8FAFC] border-b border-[#E8ECF2]">
              {['Task', 'Schedule', 'Next run', 'Last run', 'Runs', 'Status', ''].map((h, i) => (
                <th key={i} className={cn('text-[11px] font-semibold tracking-[0.04em] uppercase text-[#818EA9] px-4 py-2.5 text-left',
                  h === 'Runs' && 'text-right', h === '' && 'w-10')}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id} className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFBFF] transition-colors group">
                <td className="px-4 py-3 align-top">
                  <div className="flex flex-col gap-0.5 max-w-[280px]">
                    <span className="text-[13.5px] font-medium text-[#19202F]">{s.name}</span>
                    <span className="text-[12px] text-[#818EA9] line-clamp-1">{s.prompt}</span>
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="flex flex-col gap-1">
                    <span className="text-[13px] text-[#19202F]">{s.cadenceLabel}</span>
                    <span className="text-[11px] font-mono text-[#818EA9] bg-[#F5F7FA] px-1.5 py-0.5 rounded w-fit">{s.cron}</span>
                  </div>
                </td>
                <td className="px-4 py-3 align-top text-[13px] text-[#19202F] whitespace-nowrap">{s.nextRun}</td>
                <td className="px-4 py-3 align-top text-[13px] text-[#818EA9] whitespace-nowrap">{s.lastRun ?? '—'}</td>
                <td className="px-4 py-3 align-top text-[13px] text-[#19202F] text-right tabular-nums">{s.runCount}</td>
                <td className="px-4 py-3 align-top"><StatusBadge status={s.status} size="sm" /></td>
                <td className="px-4 py-3 align-top">
                  <ActionsMenu schedule={s} onTogglePause={onTogglePause} onRunNow={onRunNow} onRemove={onRemove} />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-[13px] text-[#818EA9]">No tasks match "{query}".</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[12px] text-[#818EA9]">{filtered.length} of {schedules.length} tasks</p>
    </div>
  );
};

// ─── Variant 4: Master–detail (split, run history) ───────────────────────────

const DetailVariant = ({ schedules, onTogglePause, onRunNow, onRemove, onCreate }: VariantProps) => {
  const [selectedId, setSelectedId] = useState<string | null>(schedules[0]?.id ?? null);
  const selected = schedules.find(s => s.id === selectedId) ?? schedules[0] ?? null;

  return (
    <div className="flex h-full min-h-0">
      {/* List rail */}
      <div className="w-[300px] shrink-0 border-r border-[#E8ECF2] flex flex-col bg-[#FCFCFD]">
        <div className="flex items-center justify-between px-4 h-14 border-b border-[#E8ECF2] shrink-0">
          <span className="text-[15px] font-semibold text-[#19202F]">Scheduled Tasks</span>
          <button type="button" onClick={onCreate}
            className="w-7 h-7 rounded-md flex items-center justify-center text-white transition-opacity hover:opacity-90"
            style={{ background: ACCENT }} aria-label="New task">
            <Plus size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {schedules.map(s => {
            const on = selected?.id === s.id;
            return (
              <button key={s.id} type="button" onClick={() => setSelectedId(s.id)}
                className="w-full flex flex-col gap-1.5 px-3 py-2.5 rounded-lg text-left transition-colors mb-0.5"
                style={on ? { backgroundColor: ACCENT_TINT } : {}}
                onMouseEnter={e => { if (!on) e.currentTarget.style.backgroundColor = '#F3F4F6'; }}
                onMouseLeave={e => { if (!on) e.currentTarget.style.backgroundColor = 'transparent'; }}>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: s.status === 'active' ? '#46A758' : '#9CA3AF' }} />
                  <span className="text-[13.5px] font-medium text-[#19202F] truncate flex-1">{s.name}</span>
                </div>
                <span className="text-[12px] text-[#818EA9] truncate pl-3.5">{s.cadenceLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        {!selected ? (
          <div className="h-full"><EmptyState onCreate={onCreate} /></div>
        ) : (
          <div className="max-w-[640px] mx-auto px-8 pt-10 pb-16 flex flex-col gap-7">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-2">
                <h1 className="text-[20px] font-semibold text-[#19202F]">{selected.name}</h1>
                <div className="flex items-center gap-2">
                  <StatusBadge status={selected.status} />
                  <CadenceChip label={selected.cadenceLabel} />
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button type="button" onClick={() => onRunNow(selected.id)}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-[13px] font-medium border border-[#D1DAEB] text-[#19202F] bg-white hover:bg-[#F5F5F8] transition-colors">
                  <Play size={14} />Run now
                </button>
                <button type="button" onClick={() => onTogglePause(selected.id)}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-[13px] font-medium border border-[#D1DAEB] text-[#19202F] bg-white hover:bg-[#F5F5F8] transition-colors">
                  {selected.status === 'active' ? <><Pause size={14} />Pause</> : <><Play size={14} />Resume</>}
                </button>
                <ActionsMenu schedule={selected} onTogglePause={onTogglePause} onRunNow={onRunNow} onRemove={onRemove} />
              </div>
            </div>

            {/* Prompt */}
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-semibold tracking-[0.06em] uppercase text-[#818EA9]">Initial prompt</span>
              <div className="p-4 rounded-lg border border-[#E8ECF2] bg-[#FCFCFD] text-[13.5px] text-[#19202F] leading-relaxed">
                {selected.prompt}
              </div>
            </div>

            {/* Meta grid */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              {[
                { label: 'Cadence (cron)', value: <span className="font-mono text-[12.5px]">{selected.cron}</span> },
                { label: 'Timezone', value: selected.timezone },
                { label: 'Next run', value: selected.nextRun },
                { label: 'Last run', value: selected.lastRun ?? '—' },
              ].map(m => (
                <div key={m.label} className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold tracking-[0.06em] uppercase text-[#818EA9]">{m.label}</span>
                  <span className="text-[13.5px] text-[#19202F]">{m.value}</span>
                </div>
              ))}
              <div className="flex flex-col gap-1.5 col-span-2">
                <span className="text-[11px] font-semibold tracking-[0.06em] uppercase text-[#818EA9]">Tools</span>
                <div className="flex items-center gap-2">
                  <ToolChips ids={selected.tools} />
                  <span className="text-[13px] text-[#818EA9]">{selected.tools.map(toolLabel).join(', ')}</span>
                </div>
              </div>
            </div>

            {/* Run history */}
            <div className="flex flex-col gap-2 border-t border-[#F3F4F6] pt-6">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-[#19202F]">Recent runs</span>
                <span className="text-[12px] text-[#818EA9]">{selected.runCount} total</span>
              </div>
              <div className="flex flex-col rounded-lg border border-[#E8ECF2] overflow-hidden divide-y divide-[#F3F4F6]">
                {selected.runs.map(r => (
                  <div key={r.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[#FAFBFF] transition-colors">
                    <RunStatusDot status={r.status} />
                    <span className="text-[13px] text-[#19202F] flex-1">{r.when}</span>
                    {r.trigger === 'manual' && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280]">Manual</span>
                    )}
                    <span className="text-[12px] text-[#818EA9] w-16 text-right tabular-nums">{r.duration}</span>
                    <button className="text-[12px] font-medium hover:underline" style={{ color: ACCENT_TEXT }}>View</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Variant 5: Agenda / timeline (temporal, composer-first) ─────────────────

const AgendaVariant = ({ schedules, onTogglePause, onRunNow, onRemove, onComposeCreate, onSnooze, onResume, onEdit, connectedTools, onConfigureTools, emptyState, reservedSlugs, embedded }: VariantProps) => {
  const [draft, setDraft] = useState('');
  const [runFor, setRunFor] = useState<Schedule | null>(null);
  const [snoozeFor, setSnoozeFor] = useState<Schedule | null>(null);
  const [cadence, setCadence] = useState<Cadence>(DEFAULT_CADENCE);
  const [tz] = useState('America/New_York');
  // Default to the tools the agent already has connected.
  const [tools, setTools] = useState<string[]>(connectedTools);
  const [pop, setPop] = useState<null | 'cadence' | 'tools'>(null);
  const [composeError, setComposeError] = useState<string | null>(null);

  const { cron, cadenceLabel } = describeCadence(cadence);
  const canSend = draft.trim().length > 0;

  const toggleTool = (id: string) => setTools(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const handleSend = () => {
    if (!canSend) return;
    const text = draft.trim();
    const name = text.length > 52 ? `${text.slice(0, 52).trimEnd()}…` : text;
    const slug = slugify(name);
    if (slug === FORCE_OFFLINE) { setComposeError('Couldn’t reach the scheduling service. Try again.'); return; }
    if (slug === FORCE_REJECT) { setComposeError('The scheduling service rejected this schedule. Open the full form to adjust it.'); return; }
    if (reservedSlugs.includes(slug)) {
      setComposeError(`A schedule named “${slug}” already exists (including deleted ones). Rename it in the full form.`);
      return;
    }
    onComposeCreate({ name, prompt: text, cadenceLabel, cron, timezone: tz, tools });
    setDraft(''); setTools(connectedTools); setCadence(DEFAULT_CADENCE); setPop(null); setComposeError(null);
  };

  // Group upcoming fires into buckets for the agenda column.
  const buckets: { label: string; match: (s: Schedule) => boolean }[] = [
    { label: 'Today', match: s => s.status === 'active' && (s.nextRun.startsWith('Today') || s.nextRun.startsWith('In ')) },
    { label: 'Tomorrow', match: s => s.status === 'active' && s.nextRun.startsWith('Tomorrow') },
    { label: 'Scheduled', match: s => s.status === 'active' && s.nextRun === 'Scheduled' },
    { label: 'Later', match: s => s.status === 'active' && !s.nextRun.startsWith('Today') && !s.nextRun.startsWith('In ') && !s.nextRun.startsWith('Tomorrow') && s.nextRun !== 'Scheduled' },
  ];

  const composerChip = (active: boolean) =>
    cn('inline-flex items-center gap-1 px-2 py-1 rounded-md text-[12px] font-medium transition-colors',
      active ? '' : 'bg-[#F5F7FA] text-[#818EA9] hover:bg-[#EEF1F6]');

  return (
    <div className={cn('mx-auto pb-16 flex flex-col gap-8', embedded ? 'w-full pt-8' : 'max-w-[640px] px-8 pt-12')}>
      <div className="flex flex-col gap-1">
        {!embedded && <h1 className="text-[22px] font-semibold text-[#19202F] tracking-[-0.2px]">Scheduled Tasks</h1>}
        <p className="text-[14px] text-[#818EA9]">Describe a task and when it should run. The agent handles the rest.</p>
      </div>

      {/* Composer */}
      <div className="rounded-2xl bg-white p-2" style={{ border: '1px solid #e9e9eb', boxShadow: '0px 3px 15px 0px rgba(0,0,0,0.08)' }}>
        <textarea value={draft} onChange={e => { setDraft(e.target.value); if (composeError) setComposeError(null); }} rows={2}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSend(); } }}
          placeholder="e.g. Summarize my Granola notes and Slack me the follow-ups…"
          className="w-full resize-none bg-transparent text-[14px] leading-6 text-[#19202F] outline-none px-3 pt-2.5 placeholder:text-[#9CA3AF]" />
        <div className="flex items-center justify-between px-2 pb-1 pt-1">
          <div className="flex items-center gap-1.5">
            {/* Set cadence */}
            <div className="relative">
              <button type="button" onClick={() => setPop(p => p === 'cadence' ? null : 'cadence')}
                className={composerChip(pop === 'cadence')}
                style={pop === 'cadence' ? { backgroundColor: ACCENT_TINT, color: ACCENT_TEXT } : {}}>
                <Clock size={12} />{cadenceLabel}
              </button>
              {pop === 'cadence' && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setPop(null)} />
                  <div className="absolute left-0 bottom-full mb-2 z-50 w-[300px] p-3 rounded-xl bg-white flex flex-col gap-3"
                    style={{ border: '1px solid #e9e9eb', boxShadow: '0px 8px 24px rgba(0,0,0,0.12)' }}>
                    <span className="text-[11px] font-semibold tracking-[0.06em] uppercase text-[#818EA9]">Cadence</span>
                    <CadencePicker value={cadence} onChange={setCadence} />
                    <p className="text-[12px] text-[#818EA9] pt-1 border-t border-[#F0F0F3]">
                      Runs <span className="font-medium text-[#5B6579]">{cadenceLabel.toLowerCase()}</span>
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Add tools — hidden in the embedded agent details view */}
            {!embedded && (
            <div className="relative">
              <button type="button" onClick={() => setPop(p => p === 'tools' ? null : 'tools')}
                className={composerChip(pop === 'tools')}
                style={pop === 'tools' || tools.length ? { backgroundColor: ACCENT_TINT, color: ACCENT_TEXT } : {}}>
                {tools.length ? `${tools.length} tool${tools.length === 1 ? '' : 's'}` : 'Add tools'}
              </button>
              {pop === 'tools' && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setPop(null)} />
                  <div className="absolute left-0 bottom-full mb-2 z-50 w-[300px] p-3 rounded-xl bg-white flex flex-col gap-2.5"
                    style={{ border: '1px solid #e9e9eb', boxShadow: '0px 8px 24px rgba(0,0,0,0.12)' }}>
                    <span className="text-[11px] font-semibold tracking-[0.06em] uppercase text-[#818EA9]">Tools</span>
                    <ToolPicker connectedTools={connectedTools} selected={tools} onToggle={toggleTool} onConfigure={onConfigureTools} />
                  </div>
                </>
              )}
            </div>
            )}
          </div>
          <button type="button" onClick={handleSend} disabled={!canSend}
            className="flex items-center justify-center w-8 h-8 rounded-full transition-opacity hover:opacity-90"
            style={{ background: canSend ? ACCENT : '#E5E7EB', color: canSend ? '#fff' : '#9CA3AF' }}>
            <ArrowUp size={16} />
          </button>
        </div>
      </div>

      {embedded && (
        <p className="text-[14px] text-[#818EA9]">
          Each executed task appears as a thread in this agent&rsquo;s chat.{' '}
          <a href="/golden-agent" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium hover:underline" style={{ color: ACCENT_TEXT }}>
            Open chat<ExternalLink size={13} className="shrink-0" />
          </a>
        </p>
      )}

      {composeError && (
        <p className="-mt-6 flex items-start gap-1.5 text-[12.5px]" style={{ color: '#DC2626' }}>
          <TriangleAlert size={13} className="shrink-0 mt-0.5" />{composeError}
        </p>
      )}

      {!emptyState && (
        <>
      {/* Upcoming agenda — single continuous timeline rail */}
      <section className="flex flex-col gap-4">
        <span className="text-[13px] font-medium text-[#5B6579]">Upcoming</span>
        <div className="relative flex flex-col gap-5">
          {/* one unbroken vertical rail behind every node */}
          <span aria-hidden className="absolute top-3 bottom-3 w-px bg-[#E8ECF2]" style={{ left: 76 }} />
          {buckets.map(b => {
            // Upcoming is a live projection of future fire times only. Snoozed
            // schedules have their fires suppressed, so they simply drop out —
            // rows never transition to a "skipped" state in place.
            const items = schedules.filter(s => !s.snoozedUntil && b.match(s));
            if (!items.length) return null;
            return (
              <div key={b.label} className="flex flex-col gap-1">
                {items.map((s, i) => (
                  <div key={s.id} className="relative flex items-start gap-3 py-1.5 pl-[104px]">
                    {/* day label — aligned to the first node's title line */}
                    {i === 0 && (
                      <span className="absolute left-0 top-4 -translate-y-1/2 w-16 text-[12px] font-semibold text-[#5B6579]">
                        {b.label}
                      </span>
                    )}
                    {/* node on the rail — aligned to the title line */}
                    <span className="absolute top-4 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-white"
                      style={{ left: 71, backgroundColor: ACCENT }} />
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-[13.5px] font-medium leading-5 text-[#19202F] truncate">{s.name}</span>
                      <span className="text-[12px] text-[#818EA9]">{s.nextRun}</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button type="button" onClick={() => setRunFor(s)}
                        className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[12px] font-medium border border-[#D1DAEB] text-[#19202F] bg-white hover:bg-[#F5F5F8] transition-colors">
                        <Play size={12} />Run now
                      </button>
                      <ActionsMenu schedule={s} onTogglePause={onTogglePause} onRunNow={() => setRunFor(s)} onRemove={onRemove} onOpenSnooze={setSnoozeFor} onResume={onResume} onEdit={onEdit} onSkipNext={id => onSnooze(id, 'until after the next run')} />
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </section>

      {/* All schedules with quick pause toggles */}
      <section className="flex flex-col gap-3 border-t border-[#F3F4F6] pt-6">
        <span className="text-[13px] font-medium text-[#5B6579]">All Schedules</span>
        <div className="flex flex-col rounded-xl border border-[#E8ECF2] divide-y divide-[#F3F4F6] bg-white">
          {schedules.map(s => (
            <div key={s.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[#FAFBFF] transition-colors first:rounded-t-xl last:rounded-b-xl">
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[13.5px] font-medium text-[#19202F] truncate">{s.name}</span>
                {s.snoozedUntil ? (
                  <span className="text-[12px] truncate">
                    <span className="text-[#818EA9]">{s.cadenceLabel} · </span>
                    <span className="text-[#B45309]">Snoozed {s.snoozedUntil}</span>
                  </span>
                ) : (
                  <span className="text-[12px] text-[#818EA9] truncate">{s.cadenceLabel} · {s.runCount} runs</span>
                )}
              </div>
              <div className="flex items-center gap-0.5">
                <PauseToggle
                  on={s.status === 'active' && !s.snoozedUntil}
                  onToggle={() => (s.snoozedUntil ? onResume(s.id) : onTogglePause(s.id))} />
                <ActionsMenu schedule={s} onTogglePause={onTogglePause} onRunNow={() => setRunFor(s)} onRemove={onRemove} onOpenSnooze={setSnoozeFor} onResume={onResume} onEdit={onEdit} onSkipNext={id => onSnooze(id, 'until after the next run')} />
              </div>
            </div>
          ))}
        </div>
      </section>
        </>
      )}

      <RunNowModal
        schedule={runFor}
        onClose={() => setRunFor(null)}
        onRunNow={onRunNow}
        onRunAndSkip={(id) => {
          // Approximate a per-occurrence skip by pausing until just after the
          // next fire (no true per-occurrence skip without backend work).
          onRunNow(id);
          onSnooze(id, 'until after the next run');
        }}
      />

      <SnoozeModal schedule={snoozeFor} onClose={() => setSnoozeFor(null)} onSnooze={onSnooze} />
    </div>
  );
};

// ─── Create modal (shared, ChatGPT "Task" pattern) ───────────────────────────

// ─── Cadence model — flexible frequency builder ──────────────────────────────
// Follows the segmented-mode + day-pills + interval-stepper pattern common to
// calendar / reminder apps (Apple, Habitify, Ahead). One state shape covers
// "Every Mon & Tue at 4:00 PM" (weekly) and "Every 8 hours" (interval).

type CadenceMode = 'daily' | 'weekly' | 'interval' | 'monthly';

interface Cadence {
  mode: CadenceMode;
  time: string;               // "5:00 PM" — used by daily / weekly / monthly
  weekdays: number[];         // 0=Sun … 6=Sat (weekly)
  every: number;              // interval count
  unit: 'hours' | 'days';     // interval unit
  monthDay: number;           // 1–28 (monthly)
}

const DEFAULT_CADENCE: Cadence = {
  mode: 'weekly', time: '5:00 PM', weekdays: [1, 2, 3, 4, 5], every: 8, unit: 'hours', monthDay: 1,
};

const DOW = [
  { i: 0, letter: 'S', full: 'Sun', cron: 'SUN' },
  { i: 1, letter: 'M', full: 'Mon', cron: 'MON' },
  { i: 2, letter: 'T', full: 'Tue', cron: 'TUE' },
  { i: 3, letter: 'W', full: 'Wed', cron: 'WED' },
  { i: 4, letter: 'T', full: 'Thu', cron: 'THU' },
  { i: 5, letter: 'F', full: 'Fri', cron: 'FRI' },
  { i: 6, letter: 'S', full: 'Sat', cron: 'SAT' },
];

const parseTime = (t: string): { h: number; m: number } => {
  const match = t.trim().match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
  if (!match) return { h: 9, m: 0 };
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const ap = match[3]?.toLowerCase();
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  return { h: Math.min(23, h), m: Math.min(59, m) };
};

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
};

const weekdayLabel = (days: number[]): string => {
  const set = [...new Set(days)].sort((a, b) => a - b);
  const key = set.join(',');
  if (set.length === 0) return 'No days';
  if (set.length === 7) return 'Every day';
  if (key === '1,2,3,4,5') return 'Weekdays';
  if (key === '0,6') return 'Weekends';
  const names = set.map(d => DOW[d].full);
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
};

// Derive a cron expression + human-readable label from a cadence.
const describeCadence = (c: Cadence): { cron: string; cadenceLabel: string } => {
  const { h, m } = parseTime(c.time);
  switch (c.mode) {
    case 'daily':
      return { cron: `${m} ${h} * * *`, cadenceLabel: `Every day at ${c.time}` };
    case 'weekly': {
      const set = [...new Set(c.weekdays)].sort((a, b) => a - b);
      const key = set.join(',');
      const token = set.length === 7 || set.length === 0 ? '*'
        : key === '1,2,3,4,5' ? 'MON-FRI'
        : key === '0,6' ? 'SUN,SAT'
        : set.map(d => DOW[d].cron).join(',');
      return { cron: `${m} ${h} * * ${token}`, cadenceLabel: `${weekdayLabel(set)} at ${c.time}` };
    }
    case 'interval': {
      const n = Math.max(1, c.every);
      const short = c.unit === 'hours' ? 'h' : 'd';
      const noun = n === 1 ? c.unit.slice(0, -1) : c.unit;
      return { cron: `@every ${n}${short}`, cadenceLabel: n === 1 ? `Every ${noun}` : `Every ${n} ${noun}` };
    }
    case 'monthly':
    default:
      return { cron: `${m} ${h} ${c.monthDay} * *`, cadenceLabel: `Monthly on the ${ordinal(c.monthDay)} at ${c.time}` };
  }
};

const SELECT_CHEVRON: React.CSSProperties = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23818EA9' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
};

const CADENCE_SEGMENTS: { id: CadenceMode; label: string }[] = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'interval', label: 'Interval' },
];

const smallFieldCls = 'h-8 px-2.5 rounded-md border border-[#D1DAEB] text-[13px] text-[#19202F] bg-white outline-none focus:border-[#714DFF] focus:ring-2 focus:ring-[#714DFF]/20';

// Reusable frequency/cadence builder used by the composer popover and the modal.
const CadencePicker = ({ value, onChange }: { value: Cadence; onChange: (c: Cadence) => void }) => {
  const patch = (p: Partial<Cadence>) => onChange({ ...value, ...p });
  const toggleDay = (i: number) =>
    patch({ weekdays: value.weekdays.includes(i) ? value.weekdays.filter(d => d !== i) : [...value.weekdays, i] });

  return (
    <div className="flex flex-col gap-3">
      {/* Segmented frequency control */}
      <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-[#F0F0F3]">
        {CADENCE_SEGMENTS.map(s => {
          const on = value.mode === s.id;
          return (
            <button key={s.id} type="button" onClick={() => patch({ mode: s.id })}
              className="flex-1 h-7 rounded-md text-[12px] font-medium transition-colors"
              style={on
                ? { backgroundColor: '#fff', color: ACCENT_TEXT, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }
                : { color: '#5B6579' }}>
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Weekly — day-of-week pills */}
      {value.mode === 'weekly' && (
        <div className="flex items-center justify-between gap-1">
          {DOW.map(d => {
            const on = value.weekdays.includes(d.i);
            return (
              <button key={d.i} type="button" onClick={() => toggleDay(d.i)}
                className="w-8 h-8 rounded-full text-[12px] font-semibold border transition-colors"
                style={on
                  ? { backgroundColor: ACCENT, borderColor: ACCENT, color: '#fff' }
                  : { backgroundColor: '#fff', borderColor: '#D1DAEB', color: '#5B6579' }}
                aria-pressed={on} title={d.full}>
                {d.letter}
              </button>
            );
          })}
        </div>
      )}

      {/* Interval — "Every N hours/days" */}
      {value.mode === 'interval' && (
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-[#5B6579]">Every</span>
          <input type="number" min={1} value={value.every}
            onChange={e => patch({ every: Math.max(1, parseInt(e.target.value || '1', 10)) })}
            className={cn(smallFieldCls, 'w-16 text-center')} />
          <select value={value.unit} onChange={e => patch({ unit: e.target.value as Cadence['unit'] })}
            className={cn(smallFieldCls, 'flex-1 pr-7 appearance-none cursor-pointer')} style={SELECT_CHEVRON}>
            <option value="hours">hours</option>
            <option value="days">days</option>
          </select>
        </div>
      )}

      {/* Monthly — day of month */}
      {value.mode === 'monthly' && (
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-[#5B6579]">On day</span>
          <input type="number" min={1} max={28} value={value.monthDay}
            onChange={e => patch({ monthDay: Math.min(28, Math.max(1, parseInt(e.target.value || '1', 10))) })}
            className={cn(smallFieldCls, 'w-16 text-center')} />
          <span className="text-[12px] text-[#818EA9]">of each month</span>
        </div>
      )}

      {/* Time — every mode except interval anchors to a time of day */}
      {value.mode !== 'interval' && (
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-[#5B6579] w-10 shrink-0">Time</span>
          <select value={value.time} onChange={e => patch({ time: e.target.value })}
            className={cn(smallFieldCls, 'flex-1 pr-7 appearance-none cursor-pointer')} style={SELECT_CHEVRON}>
            {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      )}
    </div>
  );
};

// Reusable tool selector — surfaces only the integrations this agent has
// connected. Unconnected tools are hidden; a footer link routes to the
// Configure Agent page to connect more (Writer / Manus connector pattern).
const ToolPicker = ({ connectedTools, selected, onToggle, onConfigure }: {
  connectedTools: string[];
  selected: string[];
  onToggle: (id: string) => void;
  onConfigure?: () => void;
}) => {
  const available = INTEGRATIONS.filter(i => connectedTools.includes(i.id));
  return (
    <div className="flex flex-col gap-2.5">
      {available.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {available.map(intg => {
            const on = selected.includes(intg.id);
            return (
              <button key={intg.id} type="button" onClick={() => onToggle(intg.id)}
                className="inline-flex items-center gap-1.5 h-8 pl-2 pr-2.5 rounded-full border text-[12.5px] font-medium transition-colors"
                style={on
                  ? { borderColor: 'var(--proto-accent)', backgroundColor: ACCENT_TINT, color: ACCENT_TEXT }
                  : { borderColor: '#D1DAEB', backgroundColor: '#fff', color: '#5B6579' }}
                aria-pressed={on}>
                <IntegrationLogo id={intg.id} size={14} />
                {intg.label}
                {on && <Check size={13} className="shrink-0" />}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-[12.5px] text-[#818EA9] leading-relaxed">
          This agent has no connected tools yet.
        </p>
      )}
      {onConfigure && (
        <button type="button" onClick={onConfigure}
          className="inline-flex items-center text-[12px] font-medium self-start hover:underline"
          style={{ color: ACCENT_TEXT }}>
          Connect more tools in Configure Agent
        </button>
      )}
    </div>
  );
};

const inputCls = 'w-full h-9 px-3 rounded-md border border-[#D1DAEB] text-[14px] text-[#19202F] bg-white outline-none focus:border-[#714DFF] focus:ring-2 focus:ring-[#714DFF]/20 transition-colors placeholder:text-[#9CA3AF]';

// Shared create / edit form. Mount only when open; pass a `key` so state
// re-initializes from `schedule` each time a different target is opened.
const ScheduleFormModal = ({ schedule, onClose, onSubmit, connectedTools, onConfigureTools, reservedSlugs, forcedError = 'none' }: {
  schedule: Schedule | null;   // null = create, otherwise edit this schedule
  onClose: () => void;
  onSubmit: (s: ComposePayload) => void;
  connectedTools: string[];
  onConfigureTools?: () => void;
  reservedSlugs: string[];
  forcedError?: ScheduleFormError;   // Tweakpane-driven preview of an error state
}) => {
  const isEdit = !!schedule;
  const [name, setName] = useState(schedule?.name ?? '');
  const [prompt, setPrompt] = useState(schedule?.prompt ?? '');
  const [cadence, setCadence] = useState<Cadence>(schedule?.cadence ?? DEFAULT_CADENCE);
  const tz = schedule?.timezone ?? 'America/New_York';
  // New schedules default to every tool the agent already has connected.
  const [tools, setTools] = useState<string[]>(schedule?.tools ?? connectedTools);
  // Errors surface only once the user tries to submit, then update live.
  const [attempted, setAttempted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { cron, cadenceLabel } = describeCadence(cadence);

  const slug = slugify(name);
  const ownSlug = schedule ? slugify(schedule.name) : '';
  const nameError =
    !name.trim() ? 'Add a name.'
    : !slug ? 'Use at least one letter or number.'
    : slug.length > 64 ? 'Name is too long (max 64 characters).'
    : slug !== ownSlug && reservedSlugs.includes(slug) ? `The name “${slug}” is already taken (including deleted schedules). Choose another.`
    : null;
  const promptError = !prompt.trim() ? 'Add a prompt for the agent to run.' : null;

  // Tweakpane can force a preview of any error state (shows immediately, no submit).
  const shownNameError =
    forcedError === 'invalidName' ? 'Use lowercase letters, numbers, and hyphens only.'
    : forcedError === 'duplicateName' ? `The name “${slug || 'daily-granola-summary'}” is already taken (including deleted schedules). Choose another.`
    : attempted ? nameError : null;
  const shownPromptError =
    forcedError === 'missingPrompt' ? 'Add a prompt for the agent to run.'
    : attempted ? promptError : null;
  const shownBanner =
    forcedError === 'serverRejected' ? REJECT_MSG
    : forcedError === 'backendUnreachable' ? OFFLINE_MSG
    : serverError;

  const toggleTool = (id: string) => setTools(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const handleSubmit = () => {
    setAttempted(true);
    setServerError(null);
    if (nameError || promptError) return;
    // Cron/timezone are validated server-side only, and the backend can be
    // unreachable — faked here via magic names so the states are demoable.
    if (slug === FORCE_REJECT) { setServerError(REJECT_MSG); return; }
    if (slug === FORCE_OFFLINE) { setServerError(OFFLINE_MSG); return; }
    onSubmit({ name: name.trim(), prompt: prompt.trim(), cadenceLabel, cron, timezone: tz, tools, cadence });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-[540px] max-w-full rounded-xl bg-white p-6 flex flex-col gap-5"
        style={{ boxShadow: '0px 12px 32px -16px rgba(0,0,0,0.3), 0px 12px 60px 0px rgba(0,0,0,0.15)' }}>
        <div className="flex items-start justify-between">
          <h2 className="text-[18px] font-semibold text-[#19202F]">{isEdit ? 'Edit scheduled task' : 'New scheduled task'}</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#6B7280]">
            <X size={16} />
          </button>
        </div>

        {shownBanner && (
          <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-md" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FADCDC' }}>
            <TriangleAlert size={15} className="shrink-0 mt-0.5" style={{ color: '#DC2626' }} />
            <span className="text-[12.5px] leading-snug" style={{ color: '#7F1D1D' }}>{shownBanner}</span>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-[#5B6579]">Name</label>
          <input className={inputCls} style={shownNameError ? { borderColor: '#DC2626' } : undefined}
            value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Daily Granola summary" autoFocus />
          {shownNameError ? (
            <span className="text-[12px]" style={{ color: '#DC2626' }}>{shownNameError}</span>
          ) : slug && slug !== name.trim() ? (
            <span className="text-[12px] text-[#818EA9]">Saved as <span className="font-mono text-[#5B6579]">{slug}</span></span>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-[#5B6579]">Prompt</label>
          <textarea className="w-full px-3 py-2.5 rounded-md border border-[#D1DAEB] text-[14px] text-[#19202F] bg-white outline-none focus:border-[#714DFF] focus:ring-2 focus:ring-[#714DFF]/20 transition-colors placeholder:text-[#9CA3AF] resize-none leading-[1.5]"
            style={shownPromptError ? { borderColor: '#DC2626' } : undefined}
            rows={3} value={prompt} onChange={e => setPrompt(e.target.value)}
            placeholder="The message sent to the agent each time it runs…" />
          {shownPromptError && (
            <span className="text-[12px]" style={{ color: '#DC2626' }}>{shownPromptError}</span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[13px] font-medium text-[#5B6579]">Schedule</label>
            <span className="text-[12px] text-[#818EA9]">{cadenceLabel}</span>
          </div>
          <div className="p-3 rounded-md border border-[#E8ECF2] bg-[#FCFCFD]">
            <CadencePicker value={cadence} onChange={setCadence} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-[#5B6579]">Tools</label>
          <ToolPicker connectedTools={connectedTools} selected={tools} onToggle={toggleTool} onConfigure={onConfigureTools} />
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button type="button" onClick={onClose}
            className="inline-flex items-center h-9 px-3.5 rounded-md text-[14px] font-medium border border-[#D1DAEB] text-[#19202F] bg-white hover:bg-[#F5F5F8] transition-colors">
            Cancel
          </button>
          <button type="button" onClick={handleSubmit}
            className="inline-flex items-center h-9 px-3.5 rounded-md text-[14px] font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: ACCENT }}>
            {isEdit ? 'Save changes' : 'Create task'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Snooze — pause all runs until a chosen moment (Slack / Atoms pattern) ────

// `phrase` slots after the word "Snoozed", so it must read naturally there
// (e.g. "Snoozed for 1 hour", "Snoozed until tomorrow").
const SNOOZE_OPTIONS: { id: string; label: string; sublabel: string; phrase: string }[] = [
  { id: '1h',       label: 'For 1 hour',      sublabel: 'Resumes in about an hour', phrase: 'for 1 hour' },
  { id: '3h',       label: 'For 3 hours',     sublabel: 'Resumes later today',      phrase: 'for 3 hours' },
  { id: 'tomorrow', label: 'Until tomorrow',  sublabel: 'Resumes tomorrow morning', phrase: 'until tomorrow' },
  { id: 'nextweek', label: 'Until next week', sublabel: 'Resumes Monday morning',   phrase: 'until next week' },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Fixed 30-minute time slots so only valid times are selectable (Luma pattern).
const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const min = i % 2 === 0 ? '00' : '30';
  const ap = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${min} ${ap}`;
});

// "2026-07-05" → "Jul 5, 2026"
const formatSnoozeDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return y && m && d ? `${MONTHS[m - 1]} ${d}, ${y}` : iso;
};

const SnoozeModal = ({ schedule, onClose, onSnooze }: {
  schedule: Schedule | null;
  onClose: () => void;
  onSnooze: (id: string, until: string) => void;
}) => {
  const [sel, setSel] = useState('tomorrow');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('9:00 AM');
  if (!schedule) return null;

  const isCustom = sel === 'custom';
  const canConfirm = !isCustom || date.trim().length > 0;

  const confirm = () => {
    if (!canConfirm) return;
    const phrase = isCustom
      ? `until ${formatSnoozeDate(date)} at ${time}`
      : SNOOZE_OPTIONS.find(o => o.id === sel)!.phrase;
    onSnooze(schedule.id, phrase);
    onClose();
  };

  const Row = ({ id, label, sublabel }: { id: string; label: string; sublabel?: string }) => {
    const on = sel === id;
    return (
      <button type="button" onClick={() => setSel(id)} className="flex items-start gap-3 w-full py-1.5 text-left">
        <span className="mt-0.5 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 transition-colors"
          style={{ borderColor: on ? 'var(--proto-accent)' : '#CBD5E1' }}>
          {on && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ACCENT }} />}
        </span>
        <span className="flex flex-col">
          <span className="text-[14px] text-[#19202F]">{label}</span>
          {sublabel && <span className="text-[12px] text-[#818EA9]">{sublabel}</span>}
        </span>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-6" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-[440px] max-w-full rounded-xl bg-white p-6 flex flex-col gap-4"
        style={{ boxShadow: '0px 12px 32px -16px rgba(0,0,0,0.3), 0px 12px 60px 0px rgba(0,0,0,0.15)' }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-[17px] font-semibold text-[#19202F]">Snooze schedule</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 -mt-1 -mr-1 rounded-md text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#6B7280] shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col">
          {SNOOZE_OPTIONS.map(o => <Row key={o.id} id={o.id} label={o.label} sublabel={o.sublabel} />)}
          <Row id="custom" label="Custom date & time" />
          {isCustom && (
            <div className="flex items-center gap-2 pl-[30px] pt-2">
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className={cn(inputCls, 'flex-1')} />
              <select value={time} onChange={e => setTime(e.target.value)}
                className="h-9 w-28 px-3 pr-7 rounded-md border border-[#D1DAEB] text-[14px] text-[#19202F] bg-white outline-none focus:border-[#714DFF] focus:ring-2 focus:ring-[#714DFF]/20 appearance-none cursor-pointer"
                style={SELECT_CHEVRON}>
                {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button type="button" onClick={onClose}
            className="inline-flex items-center h-9 px-3.5 rounded-md text-[14px] font-medium border border-[#D1DAEB] text-[#19202F] bg-white hover:bg-[#F5F5F8] transition-colors">
            Cancel
          </button>
          <button type="button" onClick={confirm} disabled={!canConfirm}
            className="inline-flex items-center h-9 px-3.5 rounded-md text-[14px] font-medium text-white transition-opacity"
            style={{ background: ACCENT, opacity: canConfirm ? 1 : 0.5 }}>
            Snooze
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Run-now confirmation — run once, optionally skipping the next scheduled run ─

const RunNowModal = ({ schedule, onClose, onRunNow, onRunAndSkip }: {
  schedule: Schedule | null;
  onClose: () => void;
  onRunNow: (id: string) => void;
  onRunAndSkip: (id: string) => void;
}) => {
  if (!schedule) return null;
  const optionCls = 'flex items-start gap-3 w-full p-3.5 rounded-lg border border-[#E8ECF2] text-left transition-colors';
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-[460px] max-w-full rounded-xl bg-white p-6 flex flex-col gap-4"
        style={{ boxShadow: '0px 12px 32px -16px rgba(0,0,0,0.3), 0px 12px 60px 0px rgba(0,0,0,0.15)' }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-[17px] font-semibold text-[#19202F]">Run task now</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 -mt-1 -mr-1 rounded-md text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#6B7280] shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <button type="button" onClick={() => { onRunNow(schedule.id); onClose(); }} className={optionCls}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#FAFAFB')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
            <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: ACCENT_TINT, color: ACCENT }}>
              <Play size={15} />
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-[14px] font-medium text-[#19202F]">Run now</span>
              <span className="text-[12.5px] text-[#818EA9] leading-snug">Runs once right now. The next scheduled run still happens as planned.</span>
            </span>
          </button>

          <button type="button" onClick={() => { onRunAndSkip(schedule.id); onClose(); }} className={optionCls}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#FAFAFB')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
            <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: ACCENT_TINT, color: ACCENT }}>
              <SkipForward size={15} />
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-[14px] font-medium text-[#19202F]">Run now &amp; skip next</span>
              <span className="text-[12.5px] text-[#818EA9] leading-snug">Runs once now and skips the next scheduled run. Useful when you&rsquo;re running early and don&rsquo;t need the automatic one.</span>
            </span>
          </button>
        </div>

        <div className="flex justify-end">
          <button type="button" onClick={onClose}
            className="inline-flex items-center h-9 px-3.5 rounded-md text-[14px] font-medium border border-[#D1DAEB] text-[#19202F] bg-white hover:bg-[#F5F5F8] transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Wrapper — owns state, dispatches to the active variant ──────────────────

type ComposePayload = Omit<Schedule, 'id' | 'runs' | 'lastRun' | 'runCount' | 'nextRun' | 'status'>;

interface VariantProps {
  schedules: Schedule[];
  onTogglePause: (id: string) => void;
  onRunNow: (id: string) => void;
  onRemove: (id: string) => void;
  onCreate: () => void;
  onComposeCreate: (s: ComposePayload) => void;
  onSnooze: (id: string, until: string) => void;
  onResume: (id: string) => void;
  onEdit: (schedule: Schedule) => void;
  connectedTools: string[];
  onConfigureTools?: () => void;
  emptyState?: boolean;
  reservedSlugs: string[];
  embedded?: boolean;
}

export function ScheduledTasks({ variant, connectedTools = [], onConfigureTools, emptyState = false, formError = 'none', onFormOpenChange, embedded = false }: {
  variant: ScheduledVariant;
  connectedTools?: string[];
  onConfigureTools?: () => void;
  emptyState?: boolean;
  formError?: ScheduleFormError;
  onFormOpenChange?: (open: boolean) => void;
  embedded?: boolean;
}) {
  const [schedules, setSchedules] = useState<Schedule[]>(INITIAL_SCHEDULES);
  const [createOpen, setCreateOpen] = useState(false);
  const [editFor, setEditFor] = useState<Schedule | null>(null);

  // Let the page scope the Tweakpane "Form error" selector to when the modal is open.
  const formOpen = createOpen || !!editFor;
  useEffect(() => { onFormOpenChange?.(formOpen); }, [formOpen, onFormOpenChange]);
  // Names stay reserved even after a schedule is deleted, so this only ever grows.
  const [reservedSlugs, setReservedSlugs] = useState<string[]>(() => INITIAL_SCHEDULES.map(s => slugify(s.name)));

  const onTogglePause = (id: string) =>
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, status: s.status === 'active' ? 'paused' : 'active' } : s));

  const onRemove = (id: string) => setSchedules(prev => prev.filter(s => s.id !== id));

  // Snooze = set a future activation time (suppresses fires until then).
  const onSnooze = (id: string, until: string) =>
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, snoozedUntil: until } : s));

  const onResume = (id: string) =>
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, snoozedUntil: undefined } : s));

  const onRunNow = (id: string) =>
    setSchedules(prev => prev.map(s => s.id === id ? {
      ...s,
      lastRun: 'Just now',
      runCount: s.runCount + 1,
      runs: [{ id: `r${Date.now()}`, when: 'Just now', status: 'running', duration: '—', trigger: 'manual' as const }, ...s.runs],
    } : s));

  const reserve = (name: string) =>
    setReservedSlugs(prev => prev.includes(slugify(name)) ? prev : [...prev, slugify(name)]);

  const onCreateSchedule = (partial: ComposePayload) => {
    setSchedules(prev => [{
      ...partial,
      id: `s${Date.now()}`,
      nextRun: 'Scheduled',
      lastRun: null,
      runCount: 0,
      status: 'active',
      runs: [],
    }, ...prev]);
    reserve(partial.name);
  };

  // Edit merges the form payload into the existing schedule, preserving run
  // history, counts, status, and any active snooze.
  const onUpdateSchedule = (id: string, partial: ComposePayload) => {
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, ...partial } : s));
    reserve(partial.name);
  };

  const shared: VariantProps = { schedules, onTogglePause, onRunNow, onRemove, onCreate: () => setCreateOpen(true), onComposeCreate: onCreateSchedule, onSnooze, onResume, onEdit: setEditFor, connectedTools, onConfigureTools, emptyState, reservedSlugs, embedded };

  const body = (() => {
    switch (variant) {
      case 'cards': return <CardsVariant {...shared} />;
      case 'table': return <TableVariant {...shared} />;
      case 'detail': return <DetailVariant {...shared} />;
      case 'timeline': return <AgendaVariant {...shared} />;
      case 'list':
      default: return <ListVariant {...shared} />;
    }
  })();

  return (
    <div className={cn('relative', embedded ? '' : 'flex-1 flex flex-col min-h-0 overflow-hidden')}>
      {/* Embedded (agent details) flows with the page; standalone owns its own scroll. */}
      <div className={embedded ? '' : 'flex-1 min-h-0 overflow-y-auto'}>{body}</div>
      {(createOpen || editFor) && (
        <ScheduleFormModal
          key={editFor ? editFor.id : 'create'}
          schedule={editFor}
          onClose={() => { setCreateOpen(false); setEditFor(null); }}
          onSubmit={payload => (editFor ? onUpdateSchedule(editFor.id, payload) : onCreateSchedule(payload))}
          connectedTools={connectedTools}
          onConfigureTools={onConfigureTools}
          reservedSlugs={reservedSlugs}
          forcedError={formError}
        />
      )}
    </div>
  );
}
