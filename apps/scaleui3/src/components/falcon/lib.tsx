'use client';

// Falcon-specific domain helpers + semantic badge wrappers. The base chrome
// (Button, Badge, Input, Table, etc.) comes from ScaleUI3; this file only adds
// the Falcon-specific health-severity / customer-tier colour vocabulary, which
// is NOT part of the ScaleUI3 token set. Those values reference `--falcon-*`
// CSS variables (defined in globals.css under `:root` and `.dark`), so they
// follow the active theme — same approach as the original prototype.

import * as React from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { HealthBucket, Tier, Workspace } from './types';
import { fStaleness, falconData } from './data';

// ── domain severity colours (theme-aware via --falcon-* CSS vars) ───────

export const SHAD_SEV: Record<HealthBucket, {
    label: string; dot: string; fg: string; bg: string; bd: string; tint: string; hover: string;
}> = {
    failed:   { label: 'Failed',   fg: 'var(--falcon-sev-failed-fg)',   bg: 'var(--falcon-sev-failed-bg)',   bd: 'var(--falcon-sev-failed-bd)',   dot: 'var(--falcon-sev-failed-dot)',   tint: 'var(--falcon-sev-failed-tint)',   hover: 'var(--falcon-sev-failed-hover)' },
    degraded: { label: 'Degraded', fg: 'var(--falcon-sev-degraded-fg)', bg: 'var(--falcon-sev-degraded-bg)', bd: 'var(--falcon-sev-degraded-bd)', dot: 'var(--falcon-sev-degraded-dot)', tint: 'var(--falcon-sev-degraded-tint)', hover: 'var(--falcon-sev-degraded-hover)' },
    stale:    { label: 'Stale',    fg: 'var(--falcon-sev-stale-fg)',    bg: 'var(--falcon-sev-stale-bg)',    bd: 'var(--falcon-sev-stale-bd)',    dot: 'var(--falcon-sev-stale-dot)',    tint: 'var(--falcon-sev-stale-tint)',    hover: 'var(--falcon-sev-stale-hover)' },
    healthy:  { label: 'Healthy',  fg: 'var(--falcon-sev-healthy-fg)',  bg: 'var(--falcon-sev-healthy-bg)',  bd: 'var(--falcon-sev-healthy-bd)',  dot: 'var(--falcon-sev-healthy-dot)',  tint: 'var(--falcon-sev-healthy-tint)',  hover: 'var(--falcon-sev-healthy-hover)' },
};

// Pack-deployment status pills (theme-aware via --falcon-* CSS vars).
export const SHAD_PACK = {
    Deployed:         { fg: 'var(--falcon-pack-deployed-fg)',    bg: 'var(--falcon-pack-deployed-bg)',    bd: 'var(--falcon-pack-deployed-bd)',    dot: 'var(--falcon-pack-deployed-dot)' },
    Progressing:      { fg: 'var(--falcon-pack-progressing-fg)', bg: 'var(--falcon-pack-progressing-bg)', bd: 'var(--falcon-pack-progressing-bd)', dot: 'var(--falcon-pack-progressing-dot)' },
    CrashLoopBackOff: { fg: 'var(--falcon-pack-crash-fg)',       bg: 'var(--falcon-pack-crash-bg)',       bd: 'var(--falcon-pack-crash-bd)',       dot: 'var(--falcon-pack-crash-dot)' },
    Unknown:          { fg: 'var(--falcon-pack-unknown-fg)',     bg: 'var(--falcon-pack-unknown-bg)',     bd: 'var(--falcon-pack-unknown-bd)',     dot: 'var(--falcon-pack-unknown-dot)' },
} as const;

// Customer-tier badge colours (theme-aware via --falcon-* CSS vars).
const TIER_COLORS: Record<Tier, { bg: string; fg: string }> = {
    P0: { bg: 'var(--falcon-tier-p0-bg)', fg: 'var(--falcon-tier-p0-fg)' },
    P1: { bg: 'var(--falcon-tier-p1-bg)', fg: 'var(--falcon-tier-p1-fg)' },
    P2: { bg: 'var(--falcon-tier-p2-bg)', fg: 'var(--falcon-tier-p2-fg)' },
};

export const DEP_STATUS_HEALTH: Record<string, HealthBucket> = {
    CrashLoopBackOff: 'failed',
    Progressing:      'degraded',
    Unknown:          'stale',
    Deployed:         'healthy',
};

const FI_RANK: Record<HealthBucket, number> = { failed: 0, degraded: 1, stale: 2, healthy: 3 };

export interface WsClass {
    k: HealthBucket;
    stale: boolean;
    silent?: boolean;
}

export function fiClass(w: Workspace): WsClass {
    const stale = fStaleness(w.lastHeartbeat).stale;
    if (w.health === 'failed')   return { k: 'failed',   stale };
    if (w.health === 'degraded') return { k: 'degraded', stale };
    if (w.health === 'unknown')  return { k: 'stale',    stale: true, silent: true };
    if (stale)                   return { k: 'stale',    stale: true };
    return { k: 'healthy', stale: false };
}

export function fiReason(w: Workspace, k: HealthBucket): string {
    const d = falconData.listDeploymentsByWorkspace(w.id);
    if (k === 'failed') {
        const n = d.filter(x => x.status === 'CrashLoopBackOff').length || 3;
        return `${n} pods CrashLoopBackOff`;
    }
    if (k === 'degraded') return '1 pack Progressing > 6m';
    if (k === 'stale')    return w.health === 'unknown' ? 'no heartbeat received' : 'heartbeat delayed';
    return 'all packs Deployed';
}

export function fiSorted(list?: Workspace[]): Workspace[] {
    const base = list ?? falconData.listWorkspaces();
    return [...base].sort((a, b) => {
        const ca = fiClass(a), cb = fiClass(b);
        if (FI_RANK[ca.k] !== FI_RANK[cb.k]) return FI_RANK[ca.k] - FI_RANK[cb.k];
        return fStaleness(b.lastHeartbeat).mins - fStaleness(a.lastHeartbeat).mins;
    });
}

// ── semantic Badge wrappers ────────────────────────────────────────────

export const ShadSevBadge: React.FC<{ k: HealthBucket; soft?: boolean }> = ({ k, soft }) => {
    const m = SHAD_SEV[k];
    return (
        <Badge
            variant="outline"
            className="h-[22px] gap-1.5 rounded-md px-2.5 text-[11.5px]"
            style={{
                background: soft ? m.bg : 'transparent',
                color: m.fg,
                borderColor: m.bd,
            }}
        >
            <span aria-hidden="true" className="size-[7px] rounded-full" style={{ background: m.dot }} />
            {m.label}
        </Badge>
    );
};

export const ShadTierBadge: React.FC<{ t: Tier; className?: string }> = ({ t, className }) => {
    const m = TIER_COLORS[t];
    return (
        <Badge
            variant="outline"
            className={cn('h-5 rounded-md border-transparent px-1.5 text-[10.5px] font-semibold tracking-wider', className)}
            style={{ background: m.bg, color: m.fg }}
        >
            {t}
        </Badge>
    );
};

// Customer-tier rendered as priority "signal" bars (P0=High/3 bars,
// P1=Medium/2 bars, P2=Low/1 bar). `showLabel` adds the textual priority
// next to the bars (used in the filters side panel).
export const TIER_PRIORITY: Record<Tier, { label: string; active: number }> = {
    P0: { label: 'High', active: 3 },
    P1: { label: 'Medium', active: 2 },
    P2: { label: 'Low', active: 1 },
};

export const ShadTierBars: React.FC<{
    t: Tier;
    showLabel?: boolean;
    className?: string;
    labelClassName?: string;
}> = ({ t, showLabel = false, className, labelClassName }) => {
    const { active } = TIER_PRIORITY[t];
    const heights = [5, 8, 11];
    return (
        <span className={cn('text-foreground inline-flex items-center gap-2', className)}>
            <svg
                width="14"
                height="12"
                viewBox="0 0 14 12"
                fill="none"
                aria-hidden="true"
                className="shrink-0"
            >
                {heights.map((h, i) => (
                    <rect
                        key={i}
                        x={i * 5}
                        y={12 - h}
                        width="3"
                        height={h}
                        rx="1"
                        fill="currentColor"
                        opacity={i < active ? 1 : 0.3}
                    />
                ))}
            </svg>
            {showLabel && <span className={cn('text-foreground text-[12.5px]', labelClassName)}>{t}</span>}
        </span>
    );
};

export const ShadHealthPill: React.FC<{ h: 'Healthy' | 'Degraded' | 'Failed' | 'Unknown' }> = ({ h }) => {
    const map: Record<string, HealthBucket> = { Healthy: 'healthy', Degraded: 'degraded', Failed: 'failed', Unknown: 'stale' };
    const m = SHAD_SEV[map[h]];
    return (
        <Badge
            variant="outline"
            className="h-[22px] gap-1.5 rounded-md px-2.5 text-[11.5px]"
            style={{ background: m.bg, color: m.fg, borderColor: m.bd }}
        >
            <span aria-hidden="true" className="size-[7px] rounded-full" style={{ background: m.dot }} />
            {h}
        </Badge>
    );
};

export const ShadSummaryPill: React.FC<{ k: HealthBucket; label: string }> = ({ k, label }) => {
    const m = SHAD_SEV[k];
    return (
        <Badge
            variant="outline"
            className="h-[22px] gap-1.5 rounded-md px-2.5 text-[11.5px]"
            style={{ background: m.bg, color: m.fg, borderColor: m.bd }}
        >
            <span aria-hidden="true" className="size-[7px] rounded-full" style={{ background: m.dot }} />
            {label}
        </Badge>
    );
};

export const ShadKV: React.FC<{
    k: string; v: React.ReactNode; mono?: boolean; color?: string;
}> = ({ k, v, mono, color }) => (
    <div className="border-border border-r border-b px-3.5 py-2.5">
        <div className="text-muted-foreground mb-1 text-[11px]">{k}</div>
        <div
            className={cn('text-sm font-medium', mono ? 'font-mono' : 'font-sans')}
            style={color ? { color } : undefined}
        >
            {v}
        </div>
    </div>
);

export const ShadChip: React.FC<{ label: string; onClear: () => void }> = ({ label, onClear }) => (
    <span className="bg-secondary text-foreground inline-flex h-6 items-center gap-1.5 rounded-lg pl-2.5 pr-1.5 text-xs">
        {label}
        <Button
            variant="ghost"
            size="icon-xs"
            onClick={onClear}
            aria-label={`Remove filter: ${label}`}
            className="text-muted-foreground hover:text-foreground hover:bg-muted size-5 rounded [&_svg]:size-3"
        >
            <X strokeWidth={2.25} />
        </Button>
    </span>
);

// Diagonal-hatch fill for the image-tag distribution bars. Theme-aware: both
// the fill colour and the hatch pattern come from --falcon-hatch-* CSS vars
// (defined per-theme in globals.css), so the bars stay legible in dark mode.
export function hatchStyle(): React.CSSProperties {
    return {
        backgroundColor: 'var(--falcon-hatch-bg)',
        backgroundImage: 'var(--falcon-hatch-pattern)',
        backgroundSize: '5.657px 5.657px',
    };
}

// Full-color Slack mark.
export const SlackLogo: React.FC<{ className?: string; size?: number }> = ({ className, size }) => (
    <svg
        viewBox="0 0 127 127"
        width={size}
        height={size}
        className={cn('inline-block shrink-0 align-middle', className)}
        aria-hidden="true"
    >
        <path fill="#E01E5A" d="M27.2 80a13.2 13.2 0 1 1-13.2-13.2h13.2V80zm6.6 0a13.2 13.2 0 0 1 26.4 0v33a13.2 13.2 0 1 1-26.4 0V80z" />
        <path fill="#36C5F0" d="M47 27.2A13.2 13.2 0 1 1 60.2 14v13.2H47zm0 6.7a13.2 13.2 0 0 1 0 26.4H14a13.2 13.2 0 1 1 0-26.4h33z" />
        <path fill="#2EB67D" d="M99.8 47A13.2 13.2 0 1 1 113 60.2H99.8V47zm-6.6 0a13.2 13.2 0 0 1-26.4 0V14a13.2 13.2 0 1 1 26.4 0v33z" />
        <path fill="#ECB22E" d="M80 99.8A13.2 13.2 0 1 1 66.8 113V99.8H80zm0-6.6a13.2 13.2 0 0 1 0-26.4h33a13.2 13.2 0 1 1 0 26.4H80z" />
    </svg>
);
