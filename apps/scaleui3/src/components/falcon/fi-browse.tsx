'use client';

// Faceted browse — powers both the Fleet Health Overview (workspaces mode) and
// the Deployment Search (deployments mode). One layout, two data sources.
// ScaleUI3 has no SegmentedControl, so the mode toggle + chart range use small
// Button groups instead.

import * as React from 'react';
import { useMemo, useState } from 'react';
import {
    Search,
    X,
    FilterX,
    ChevronRight,
    AlertTriangle,
    WifiOff,
    OctagonX,
    Check,
    PanelLeftClose,
    PanelLeftOpen,
    SearchX,
} from 'lucide-react';
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip as RechartsTooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
    SHAD_SEV,
    DEP_STATUS_HEALTH,
    ShadSevBadge,
    ShadTierBars,
    ShadChip,
    hatchStyle,
    fiClass,
    fiReason,
    fiSorted,
} from './lib';
import { falconData, fCustomer, fCloudName, fStaleness } from './data';
import { FalconLoading, FalconEmpty, FalconError, type ViewState } from './states';
import type { Deployment, HealthBucket, Tier, Workspace } from './types';

type Mode = 'workspaces' | 'deployments';

interface BrowseFacet<X> {
    dim: string;
    label: string;
    opts: string[];
    get: (x: X) => string;
    render: (v: string) => React.ReactNode;
    health?: boolean;
    priority?: boolean;
    env?: boolean;
    mono?: boolean;
    scroll?: boolean;
}

interface FIBrowseProps {
    mode0?: Mode;
    showToggle?: boolean;
    onSelectWorkspace?: (id: string) => void;
    viewState?: ViewState;
}

const DEP_RANK: Record<string, number> = {
    CrashLoopBackOff: 0,
    Progressing: 1,
    Unknown: 2,
    Deployed: 3,
};
const TIER_RANK: Record<Tier, number> = { P0: 0, P1: 1, P2: 2 };

export function FIBrowse({ mode0 = 'workspaces', showToggle = false, onSelectWorkspace, viewState = 'default' }: FIBrowseProps) {
    const [mode, setMode] = useState<Mode>(mode0);
    const [query, setQuery] = useState('');
    const [sel, setSel] = useState<Record<string, Set<string>>>({});
    const [facetQ, setFacetQ] = useState<Record<string, string>>({});
    const [filtersOpen, setFiltersOpen] = useState(true);

    const customers = falconData.listCustomers();
    const workspaces = falconData.listWorkspaces();
    const deployments = falconData.listDeployments();

    const switchMode = (m: Mode) => {
        setMode(m);
        setQuery('');
        setSel({});
    };
    const toggle = (dim: string, val: string) =>
        setSel((prev) => {
            const next = { ...prev };
            const s = new Set(next[dim] ?? []);
            if (s.has(val)) s.delete(val);
            else s.add(val);
            next[dim] = s;
            return next;
        });
    const clearAll = () => {
        setQuery('');
        setSel({});
    };

    const wsFacets: BrowseFacet<Workspace>[] = [
        { dim: 'health', label: 'Health', opts: ['failed', 'degraded', 'stale', 'healthy'], get: (w) => fiClass(w).k, render: (v) => SHAD_SEV[v as HealthBucket].label, health: true },
        { dim: 'priority', label: 'Customer Priority', opts: ['P0', 'P1', 'P2'], get: (w) => fCustomer(w.customer).tier, render: (v) => v, priority: true },
        { dim: 'env', label: 'Environment', opts: ['prod', 'staging', 'dev'], get: (w) => w.env, render: (v) => v.toUpperCase(), env: true },
        { dim: 'cloud', label: 'Cloud', opts: ['aws', 'gcp', 'azure', 'onprem'], get: (w) => w.cloud, render: (v) => fCloudName(v) },
        { dim: 'sgp', label: 'SGP version', opts: Array.from(new Set(workspaces.map((w) => w.sgp))).sort().reverse(), get: (w) => w.sgp, render: (v) => v, mono: true },
        { dim: 'customer', label: 'Customer', opts: customers.map((c) => c.id), get: (w) => w.customer, render: (v) => fCustomer(v).name, scroll: true },
    ];

    const depFacets: BrowseFacet<Deployment>[] = [
        { dim: 'status', label: 'Status', opts: ['failed', 'degraded', 'stale', 'healthy'], get: (d) => DEP_STATUS_HEALTH[d.status], render: (v) => SHAD_SEV[v as HealthBucket].label, health: true },
        { dim: 'priority', label: 'Customer Priority', opts: ['P0', 'P1', 'P2'], get: (d) => fCustomer(d.customer).tier, render: (v) => v, priority: true },
        { dim: 'pack', label: 'Pack', opts: Array.from(new Set(deployments.map((d) => d.pack))).sort(), get: (d) => d.pack, render: (v) => v, mono: true, scroll: true },
        { dim: 'cloud', label: 'Cloud', opts: ['aws', 'gcp', 'azure', 'onprem'], get: (d) => d.cloud, render: (v) => fCloudName(v) },
        { dim: 'env', label: 'Environment', opts: ['prod', 'staging', 'dev'], get: (d) => d.env, render: (v) => v.toUpperCase(), env: true },
        { dim: 'customer', label: 'Customer', opts: customers.map((c) => c.id), get: (d) => d.customer, render: (v) => fCustomer(v).name, scroll: true },
    ];

    const facets = mode === 'workspaces' ? wsFacets : depFacets;
    const source: (Workspace | Deployment)[] = mode === 'workspaces' ? workspaces : deployments;
    const countFor = <X,>(f: BrowseFacet<X>, opt: string) =>
        (source as unknown as X[]).filter((x) => f.get(x) === opt).length;

    const passFacets = <X,>(x: X) =>
        facets.every((f) => {
            const s = sel[f.dim];
            if (!s || !s.size) return true;
            return s.has((f as BrowseFacet<X>).get(x));
        });

    const wsRows = useMemo(
        () =>
            fiSorted().filter(
                (w) =>
                    passFacets(w) &&
                    (!query ||
                        `${w.id} ${fCustomer(w.customer).name} ${w.region} ${w.cloud} ${w.sgp} ${w.env} ${fiClass(w).k}`
                            .toLowerCase()
                            .includes(query.toLowerCase())),
            ),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [query, sel, mode],
    );

    const depRows = useMemo(
        () =>
            [...deployments]
                .filter(
                    (d) =>
                        passFacets(d) &&
                        (!query ||
                            `${d.pack} ${d.image} ${d.chart} ${d.workspace} ${fCustomer(d.customer).name} ${d.cloud} ${d.env} ${d.status}`
                                .toLowerCase()
                                .includes(query.toLowerCase())),
                )
                .sort(
                    (a, b) =>
                        DEP_RANK[a.status] - DEP_RANK[b.status] ||
                        fCustomer(a.customer).name.localeCompare(fCustomer(b.customer).name),
                ),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [query, sel, mode],
    );

    const problems = wsRows.filter((w) => fiClass(w).k !== 'healthy');
    const healthy = wsRows
        .filter((w) => fiClass(w).k === 'healthy')
        .sort((a, b) => {
            const ra = TIER_RANK[fCustomer(a.customer).tier] ?? 9;
            const rb = TIER_RANK[fCustomer(b.customer).tier] ?? 9;
            if (ra !== rb) return ra - rb;
            return fCustomer(a.customer).name.localeCompare(fCustomer(b.customer).name);
        });

    const activeCount = Object.values(sel).reduce((s, x) => s + (x ? x.size : 0), 0) + (query ? 1 : 0);

    const title = mode === 'workspaces' ? 'Fleet Health Overview' : 'Deployment Search';

    return (
        <div className="flex h-full w-full flex-col">
            <div className="flex min-h-0 flex-1">
                {/* faceted rail */}
                {filtersOpen ? (
                    <aside className="border-border bg-card flex min-h-0 w-[252px] shrink-0 flex-col border-r">
                        <div className="border-border flex items-center justify-between border-b px-4 pt-[18px] pb-3.5">
                            <div className="text-muted-foreground text-sm font-medium">Filters</div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground size-6"
                                aria-label="Collapse filters"
                                onClick={() => setFiltersOpen(false)}
                            >
                                <PanelLeftClose className="size-4" />
                            </Button>
                        </div>
                        <div className="flex-1 overflow-auto pt-1.5 pb-4">
                            {facets.map((f) => (
                                <FacetGroup
                                    key={f.dim}
                                    facet={f as BrowseFacet<unknown>}
                                    selected={sel[f.dim] ?? new Set()}
                                    onToggle={(v) => toggle(f.dim, v)}
                                    count={(opt: string) => countFor(f as BrowseFacet<unknown>, opt)}
                                    filterText={facetQ[f.dim] ?? ''}
                                    onFilterText={(s) => setFacetQ((p) => ({ ...p, [f.dim]: s }))}
                                />
                            ))}
                        </div>
                    </aside>
                ) : (
                    <aside className="border-border bg-card flex min-h-0 shrink-0 flex-col border-r px-2 pt-[14px]">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground size-6"
                            aria-label="Expand filters"
                            onClick={() => setFiltersOpen(true)}
                        >
                            <PanelLeftOpen className="size-4" />
                        </Button>
                    </aside>
                )}

                {/* main */}
                <div className="flex min-w-0 flex-1 flex-col">
                    <div className="px-6 pt-5">
                        <div className="flex items-center justify-between gap-5">
                            <div className="flex items-center gap-3.5">
                                <h1 className="m-0 text-2xl font-semibold tracking-tight">{title}</h1>
                                {showToggle && (
                                    <div
                                        role="group"
                                        aria-label="View"
                                        className="bg-muted flex items-center gap-1 rounded-md p-0.5"
                                    >
                                        {(
                                            [
                                                ['workspaces', 'Workspaces'],
                                                ['deployments', 'Deployments'],
                                            ] as const
                                        ).map(([v, label]) => (
                                            <Button
                                                key={v}
                                                variant={mode === v ? 'secondary' : 'ghost'}
                                                size="xs"
                                                aria-pressed={mode === v}
                                                onClick={() => switchMode(v)}
                                                className={cn(mode === v && 'bg-background shadow-sm')}
                                            >
                                                {label}
                                            </Button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* central token search */}
                        <div className="border-border bg-card mt-4 mb-5 flex min-h-[34px] flex-wrap items-center gap-1.5 rounded-md border px-2.5 py-1 shadow-sm">
                            <Search
                                aria-hidden="true"
                                className="text-muted-foreground size-[15px] shrink-0"
                                strokeWidth={2}
                            />
                            {facets.flatMap((f) =>
                                [...(sel[f.dim] ?? [])].map((v) => (
                                    <ShadChip
                                        key={f.dim + v}
                                        label={`${f.label}: ${stringify(f.render(v))}`}
                                        onClear={() => toggle(f.dim, v)}
                                    />
                                )),
                            )}
                            <Label htmlFor="browse-search" className="sr-only">
                                {mode === 'workspaces' ? 'Search workspaces' : 'Search deployments'}
                            </Label>
                            <Input
                                id="browse-search"
                                type="search"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder={
                                    Object.values(sel).every((s) => !s || !s.size)
                                        ? mode === 'workspaces'
                                            ? 'Search workspaces, or pick filters on the left…'
                                            : 'Search packs, images, or pick filters on the left…'
                                        : 'Add a search term…'
                                }
                                className="h-7 min-w-40 flex-1 border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
                            />
                            {activeCount > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearAll}
                                    aria-label="Clear all filters and search"
                                    className="text-muted-foreground hover:text-foreground h-7 px-2 text-xs"
                                >
                                    <X aria-hidden="true" className="size-3" strokeWidth={2} /> Clear all
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto px-6 pt-px pb-7">
                        {viewState === 'loading' ? (
                            <div className="pt-4">
                                <FalconLoading variant="results" />
                            </div>
                        ) : viewState === 'error' ? (
                            <FalconError
                                description={`We couldn’t load ${mode === 'workspaces' ? 'fleet health' : 'deployments'}. Check your connection and try again.`}
                            />
                        ) : viewState === 'empty' ? (
                            <FalconEmpty
                                icon={SearchX}
                                title={mode === 'workspaces' ? 'No workspaces found' : 'No deployments found'}
                                description="Try adjusting your search or clearing some filters."
                                actionLabel={activeCount > 0 ? 'Clear all filters' : undefined}
                                onAction={clearAll}
                            />
                        ) : mode === 'workspaces' ? (
                            <WsBody problems={problems} healthy={healthy} onSelectWorkspace={onSelectWorkspace} />
                        ) : (
                            <DepBody rows={depRows} onSelectWorkspace={onSelectWorkspace} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── facet group ────────────────────────────────────────────────────────

function FacetGroup({
    facet: f,
    selected,
    onToggle,
    count,
    filterText,
    onFilterText,
}: {
    facet: BrowseFacet<unknown>;
    selected: Set<string>;
    onToggle: (v: string) => void;
    count: (opt: string) => number;
    filterText: string;
    onFilterText: (s: string) => void;
}) {
    const opts = f.scroll
        ? f.opts.filter((o) => String(stringify(f.render(o))).toLowerCase().includes(filterText.toLowerCase()))
        : f.opts;
    return (
        <div className="border-border border-b px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
                <span className="text-[12.5px] font-semibold">{f.label}</span>
                {selected.size > 0 && <span className="text-primary text-[11px] font-medium">{selected.size}</span>}
            </div>
            {f.scroll && (
                <div className="relative mb-2">
                    <Label htmlFor={`facet-filter-${f.dim}`} className="sr-only">
                        Filter {f.label.toLowerCase()} options
                    </Label>
                    <Search
                        aria-hidden="true"
                        className="text-muted-foreground absolute top-1/2 left-2 size-3 -translate-y-1/2"
                        strokeWidth={2}
                    />
                    <Input
                        id={`facet-filter-${f.dim}`}
                        type="search"
                        value={filterText}
                        onChange={(e) => onFilterText(e.target.value)}
                        placeholder={`Filter ${f.label.toLowerCase()}…`}
                        className={cn('h-7 pr-2 pl-[26px] text-[11.5px] shadow-none', f.mono && 'font-mono')}
                    />
                </div>
            )}
            <div
                className="flex flex-col gap-0.5"
                style={{ maxHeight: f.scroll ? 156 : 'none', overflow: f.scroll ? 'auto' : 'visible' }}
            >
                {opts.map((opt) => {
                    const on = selected.has(opt);
                    return (
                        <label
                            key={opt}
                            className={cn(
                                'flex cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-1',
                                'focus-within:ring-ring focus-within:ring-offset-background focus-within:ring-2 focus-within:ring-offset-1',
                                on ? 'bg-accent' : 'hover:bg-muted',
                            )}
                        >
                            <Checkbox
                                checked={on}
                                onCheckedChange={() => onToggle(opt)}
                                aria-label={`${f.label}: ${stringify(f.render(opt))}`}
                            />
                            {f.health ? (
                                <span className="flex flex-1">
                                    <ShadSevBadge k={opt as HealthBucket} soft />
                                </span>
                            ) : f.priority ? (
                                <span className="flex flex-1">
                                    <ShadTierBars t={opt as Tier} showLabel />
                                </span>
                            ) : f.env ? (
                                <span className="flex flex-1">
                                    <Badge
                                        variant="secondary"
                                        className="h-[18px] rounded-md px-1.5 text-[10px] tracking-wider uppercase"
                                    >
                                        {opt}
                                    </Badge>
                                </span>
                            ) : (
                                <span
                                    className={cn(
                                        'text-foreground flex-1 overflow-hidden text-[12.5px] text-ellipsis whitespace-nowrap',
                                        f.mono && 'font-mono',
                                    )}
                                >
                                    {f.render(opt)}
                                </span>
                            )}
                            <span className="text-muted-foreground font-mono text-[11px]">{count(opt)}</span>
                        </label>
                    );
                })}
            </div>
        </div>
    );
}

// ── workspaces body ────────────────────────────────────────────────────

function WsBody({
    problems,
    healthy,
    onSelectWorkspace,
}: {
    problems: Workspace[];
    healthy: Workspace[];
    onSelectWorkspace?: (id: string) => void;
}) {
    const Head = () => (
        <TableHeader>
            <TableRow className="bg-muted">
                {['Severity', 'Workspace', 'Cause', 'Last seen'].map((h, i) => (
                    <TableHead key={h} style={{ width: [150, undefined, 230, 130][i] }}>
                        {h}
                    </TableHead>
                ))}
            </TableRow>
        </TableHeader>
    );

    const Rows = ({ list, neutral }: { list: Workspace[]; neutral?: boolean }) => {
        const [hoveredId, setHoveredId] = useState<string | null>(null);
        return (
            <>
                {list.map((w, i) => {
                    const cust = fCustomer(w.customer);
                    const cl = fiClass(w);
                    const stale = fStaleness(w.lastHeartbeat);
                    const Icon = neutral
                        ? Check
                        : cl.k === 'failed'
                          ? OctagonX
                          : cl.k === 'degraded'
                            ? AlertTriangle
                            : WifiOff;
                    const isHovered = hoveredId === w.id;
                    const clickable = !!onSelectWorkspace;
                    return (
                        <TableRow
                            key={w.id}
                            role={clickable ? 'link' : undefined}
                            tabIndex={clickable ? 0 : undefined}
                            aria-label={clickable ? `Open workspace ${w.id}` : undefined}
                            onClick={clickable ? () => onSelectWorkspace!(w.id) : undefined}
                            onKeyDown={
                                clickable
                                    ? (e) => {
                                          if (e.key === 'Enter' || e.key === ' ') {
                                              e.preventDefault();
                                              onSelectWorkspace!(w.id);
                                          }
                                      }
                                    : undefined
                            }
                            onMouseEnter={() => setHoveredId(w.id)}
                            onMouseLeave={() => setHoveredId(null)}
                            className={
                                clickable
                                    ? 'focus-visible:ring-ring cursor-pointer focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset'
                                    : ''
                            }
                            style={{
                                borderBottom: i < list.length - 1 ? '1px solid var(--border)' : 'none',
                                background: isHovered ? SHAD_SEV[cl.k].hover : SHAD_SEV[cl.k].tint,
                                transition: 'background 0.1s',
                            }}
                        >
                            <TableCell style={{ padding: '11px 14px' }}>
                                <ShadSevBadge k={cl.k} soft={!neutral} />
                            </TableCell>
                            <TableCell style={{ padding: '11px 14px' }}>
                                <div className="flex items-center gap-2">
                                    <ShadTierBars t={cust.tier} />
                                    <span className="text-[13.5px] font-semibold">{cust.name}</span>
                                    <Badge
                                        variant="secondary"
                                        className="h-[18px] rounded-md px-1.5 text-[10px] tracking-wider uppercase"
                                    >
                                        {w.env}
                                    </Badge>
                                </div>
                                <div className="text-muted-foreground mt-0.5 font-mono text-[11px]">
                                    {w.id} · {fCloudName(w.cloud)} · {w.region} · sgp {w.sgp}
                                </div>
                            </TableCell>
                            <TableCell style={{ padding: '11px 14px' }}>
                                <div className="flex items-center gap-[7px]">
                                    <Icon
                                        style={{
                                            width: 14,
                                            height: 14,
                                            color: neutral ? 'var(--muted-foreground)' : SHAD_SEV[cl.k].dot,
                                        }}
                                        strokeWidth={2}
                                    />
                                    <span
                                        className="text-xs"
                                        style={{ color: neutral ? 'var(--muted-foreground)' : 'var(--foreground)' }}
                                    >
                                        {fiReason(w, cl.k)}
                                    </span>
                                </div>
                            </TableCell>
                            <TableCell
                                style={{
                                    padding: '11px 14px',
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: 12,
                                    color: cl.stale && !neutral ? SHAD_SEV[cl.k].fg : 'var(--muted-foreground)',
                                }}
                            >
                                {stale.label}
                            </TableCell>
                        </TableRow>
                    );
                })}
            </>
        );
    };

    if (!problems.length && !healthy.length) return <EmptyState />;

    return (
        <>
            <ErrorChart />
            {problems.length > 0 && (
                <div className="mb-[22px]">
                    <div className="mb-2.5 flex items-center gap-2">
                        <h2 className="m-0 text-[15px] font-semibold">Needs attention</h2>
                        <Badge variant="secondary" className="font-mono">
                            {problems.length}
                        </Badge>
                    </div>
                    <Card className="gap-0 overflow-hidden p-0">
                        <Table>
                            <Head />
                            <TableBody>
                                <Rows list={problems} />
                            </TableBody>
                        </Table>
                    </Card>
                </div>
            )}
            {healthy.length > 0 && (
                <div>
                    <div className="mb-2.5 flex items-center gap-2">
                        <h2 className="text-muted-foreground m-0 text-[15px] font-semibold">Healthy</h2>
                        <Badge variant="outline" className="text-muted-foreground font-mono">
                            {healthy.length}
                        </Badge>
                    </div>
                    <Card className="gap-0 overflow-hidden p-0">
                        <Table>
                            <Head />
                            <TableBody>
                                <Rows list={healthy} neutral />
                            </TableBody>
                        </Table>
                    </Card>
                </div>
            )}
        </>
    );
}

// ── deployments body ───────────────────────────────────────────────────

function DepBody({ rows, onSelectWorkspace }: { rows: Deployment[]; onSelectWorkspace?: (id: string) => void }) {
    const byTag: Record<string, number> = {};
    rows.forEach((d) => {
        byTag[d.image] = (byTag[d.image] ?? 0) + 1;
    });
    const tags = Object.entries(byTag)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);
    const tagMax = tags.length ? tags[0][1] : 1;

    const problems = rows.filter((d) => d.status !== 'Deployed');
    const healthy = rows.filter((d) => d.status === 'Deployed');
    const pShown = problems.slice(0, 30);
    const hShown = healthy.slice(0, 40);

    if (rows.length === 0) return <EmptyState />;

    const DepTable = ({ list }: { list: Deployment[] }) => {
        const [hoveredKey, setHoveredKey] = useState<string | null>(null);
        return (
            <Card className="gap-0 overflow-hidden rounded-none p-0">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted">
                            {['Customer', 'Workspace', 'Env', 'Cloud', 'Pack', 'Image tag', 'Reps', 'Status'].map(
                                (h) => (
                                    <TableHead key={h}>{h}</TableHead>
                                ),
                            )}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {list.map((d, i) => {
                            const cust = fCustomer(d.customer);
                            const rowKey = `${d.workspace}-${d.pack}`;
                            const isHovered = hoveredKey === rowKey;
                            const health = DEP_STATUS_HEALTH[d.status];
                            const clickable = !!onSelectWorkspace;
                            return (
                                <TableRow
                                    key={rowKey}
                                    role={clickable ? 'link' : undefined}
                                    tabIndex={clickable ? 0 : undefined}
                                    aria-label={clickable ? `Open workspace ${d.workspace}` : undefined}
                                    onClick={clickable ? () => onSelectWorkspace!(d.workspace) : undefined}
                                    onKeyDown={
                                        clickable
                                            ? (e) => {
                                                  if (e.key === 'Enter' || e.key === ' ') {
                                                      e.preventDefault();
                                                      onSelectWorkspace!(d.workspace);
                                                  }
                                              }
                                            : undefined
                                    }
                                    onMouseEnter={() => setHoveredKey(rowKey)}
                                    onMouseLeave={() => setHoveredKey(null)}
                                    className={
                                        clickable
                                            ? 'focus-visible:ring-ring cursor-pointer focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset'
                                            : ''
                                    }
                                    style={{
                                        borderBottom: i < list.length - 1 ? '1px solid var(--border)' : 'none',
                                        background: isHovered ? SHAD_SEV[health].hover : SHAD_SEV[health].tint,
                                        transition: 'background 0.1s',
                                    }}
                                >
                                    <TableCell style={{ padding: '10px 14px' }}>
                                        <div className="flex items-center gap-[7px]">
                                            <ShadTierBars t={cust.tier} />
                                            <span className="text-[12px] font-medium">{cust.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground px-3.5 py-2.5 font-mono text-[11.5px]">
                                        {d.workspace}
                                    </TableCell>
                                    <TableCell className="px-3.5 py-2.5">
                                        <Badge
                                            variant="secondary"
                                            className="h-[18px] rounded-md px-1.5 text-[10px] tracking-wider uppercase"
                                        >
                                            {d.env}
                                        </Badge>
                                    </TableCell>
                                    <TableCell style={{ padding: '10px 14px', fontSize: 12 }}>
                                        {fCloudName(d.cloud)}
                                    </TableCell>
                                    <TableCell
                                        style={{
                                            padding: '10px 14px',
                                            fontFamily: 'var(--font-mono)',
                                            fontSize: 12,
                                            fontWeight: 500,
                                        }}
                                    >
                                        {d.pack}
                                    </TableCell>
                                    <TableCell
                                        style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: 12 }}
                                    >
                                        {d.image}
                                    </TableCell>
                                    <TableCell
                                        style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: 12 }}
                                    >
                                        {d.replicas}
                                    </TableCell>
                                    <TableCell style={{ padding: '10px 14px' }}>
                                        <ShadSevBadge k={DEP_STATUS_HEALTH[d.status]} soft />
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </Card>
        );
    };

    return (
        <>
            <div
                aria-label="Image tag distribution"
                className="border-border bg-card rounded-card mb-5 border px-4 py-4 shadow-sm"
            >
                <h3 className="m-0 mb-0.5 text-sm font-semibold">Image tag distribution</h3>
                <p className="text-muted-foreground m-0 mb-4 text-xs">
                    How many deployments run each image across the filtered set.
                </p>
                <div className="flex flex-col gap-3.5">
                    {tags.map(([img, n]) => (
                        <div
                            key={img}
                            className="grid items-center gap-3.5"
                            style={{ gridTemplateColumns: '230px 70px 1fr' }}
                        >
                            <Tooltip>
                                <TooltipTrigger
                                    render={
                                        <span className="cursor-default overflow-hidden font-mono text-xs text-ellipsis whitespace-nowrap">
                                            {img}
                                        </span>
                                    }
                                />
                                <TooltipContent className="font-mono">{img}</TooltipContent>
                            </Tooltip>
                            <span className="text-muted-foreground font-mono text-xs">{n} ws</span>
                            <div className="bg-muted h-2.5 overflow-hidden">
                                <div className="h-full" style={{ width: `${(n / tagMax) * 100}%`, ...hatchStyle() }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {problems.length > 0 && (
                <div className="mb-6">
                    <div className="mb-2.5 flex items-center gap-2">
                        <h2 className="m-0 text-[15px] font-semibold">Needs attention</h2>
                        <Badge variant="secondary" className="font-mono">
                            {problems.length}
                        </Badge>
                    </div>
                    <DepTable list={pShown} />
                    {problems.length > pShown.length && (
                        <p className="text-muted-foreground pt-3 text-center text-xs" aria-live="polite">
                            Showing first {pShown.length} of {problems.length} — refine filters to narrow.
                        </p>
                    )}
                </div>
            )}

            {healthy.length > 0 && (
                <div>
                    <div className="mb-2.5 flex items-center gap-2">
                        <h2 className="text-muted-foreground m-0 text-[15px] font-semibold">Healthy</h2>
                        <Badge variant="outline" className="text-muted-foreground font-mono">
                            {healthy.length}
                        </Badge>
                    </div>
                    <DepTable list={hShown} />
                    {healthy.length > hShown.length && (
                        <p className="text-muted-foreground pt-3 text-center text-xs" aria-live="polite">
                            Showing first {hShown.length} of {healthy.length} — refine filters to narrow.
                        </p>
                    )}
                </div>
            )}
        </>
    );
}

// ── error timeseries (solid bands, baked in) ──────────────────────────

const SHAD_EC = { failed: '#ef4444', degraded: '#f59e0b', stale: '#94a3b8' };

function shadSeries(range: '6h' | '24h' | '7d') {
    const n = range === '6h' ? 24 : range === '24h' ? 24 : 28;
    let s = (range === '6h' ? 613 : range === '24h' ? 244 : 707) >>> 0;
    const r = () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 0xffffffff;
    };
    const scale = range === '7d' ? 4 : 1;
    const out: { failed: number; degraded: number; stale: number }[] = [];
    for (let i = 0; i < n; i++) {
        const tn = i / (n - 1);
        let failed = r() < 0.16 ? Math.round(r() * 2) : 0;
        if (tn > 0.8) failed += Math.round(((tn - 0.8) / 0.2) * 7 + r());
        if (Math.abs(tn - 0.42) < 0.05) failed += Math.round(2 + r() * 2);
        const degraded = Math.max(0, Math.round(1.4 + Math.sin(i * 0.5) * 1.2 + r() * 1.3 + (tn > 0.7 ? 1.5 : 0)));
        let stale = r() < 0.22 ? Math.round(r() * 2) : 0;
        if (range === '7d' && Math.abs(tn - 0.3) < 0.06) stale += 3;
        if (tn > 0.86) stale += Math.round(r() * 1.5);
        out.push({ failed: failed * scale, degraded: degraded * scale, stale: stale * scale });
    }
    return out;
}

function shadLabel(range: '6h' | '24h' | '7d', i: number, n: number) {
    if (range === '6h') {
        const m = (n - 1 - i) * 15;
        return m === 0 ? 'now' : `−${Math.round((m / 60) * 10) / 10}h`;
    }
    if (range === '24h') {
        const h = n - 1 - i;
        return h === 0 ? 'now' : `−${h}h`;
    }
    const d = n - 1 - i;
    return d === 0 ? 'now' : `−${d}d`;
}

// Empty Tooltip content — the chart drives its readout into the header.
const EmptyTooltip = () => null;

function ErrorChart() {
    const [range, setRange] = useState<'6h' | '24h' | '7d'>('24h');
    const [hover, setHover] = useState<number | null>(null);
    const series = useMemo(() => shadSeries(range), [range]);
    const n = series.length;
    const errTotal = series.reduce((a, d) => a + d.failed + d.degraded + d.stale, 0);

    const data = useMemo(
        () =>
            series.map((d, i) => ({
                idx: i,
                label: shadLabel(range, i, n),
                ...d,
            })),
        [series, range, n],
    );

    const hi = hover ?? n - 1;
    const hd = series[hi];

    // Render an X-axis label only every Nth tick (matches the original).
    const xStep = Math.max(1, Math.ceil(n / 6));

    return (
        <Card aria-label="Errors over time" className="mb-5 gap-0 p-0">
            <header className="flex items-center gap-3.5 px-4 pt-3.5 pb-2">
                <div className="flex flex-col gap-0.5">
                    <h3 className="m-0 text-sm font-semibold">Errors over time</h3>
                    <p className="text-muted-foreground m-0 text-xs" aria-live="polite">
                        {hover != null ? `at ${shadLabel(range, hover, n)}` : `${errTotal} events · last ${range}`}
                        <span className="ml-2 font-mono" style={{ color: SHAD_EC.failed }}>
                            {hd.failed}
                        </span>
                        <span className="ml-1.5 font-mono" style={{ color: SHAD_EC.degraded }}>
                            {hd.degraded}
                        </span>
                        <span className="ml-1.5 font-mono" style={{ color: '#64748b' }}>
                            {hd.stale}
                        </span>
                    </p>
                </div>
                <div className="flex-1" />
                <div className="text-muted-foreground flex gap-3.5 text-xs" aria-hidden="true">
                    {(
                        [
                            ['failed', 'Failed'],
                            ['degraded', 'Degraded'],
                            ['stale', 'Stale'],
                        ] as const
                    ).map(([k, l]) => (
                        <span key={k} className="inline-flex items-center gap-1.5">
                            <span className="size-2 rounded-sm" style={{ background: SHAD_EC[k] }} />
                            {l}
                        </span>
                    ))}
                </div>
                <div
                    role="group"
                    aria-label="Chart time range"
                    className="bg-muted flex items-center gap-1 rounded-md p-0.5"
                >
                    {(['6h', '24h', '7d'] as const).map((v) => (
                        <Button
                            key={v}
                            variant={range === v ? 'secondary' : 'ghost'}
                            size="xs"
                            aria-pressed={range === v}
                            onClick={() => {
                                setRange(v);
                                setHover(null);
                            }}
                            className={cn(range === v && 'bg-background shadow-sm')}
                        >
                            {v}
                        </Button>
                    ))}
                </div>
            </header>
            <div className="h-[180px] px-2 pb-2">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={data}
                        margin={{ top: 8, right: 10, left: 0, bottom: 0 }}
                        onMouseMove={(state) => {
                            const idx = (state as { activeTooltipIndex?: number } | undefined)?.activeTooltipIndex;
                            if (typeof idx === 'number') setHover(idx);
                        }}
                        onMouseLeave={() => setHover(null)}
                    >
                        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                        <XAxis
                            dataKey="label"
                            tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                            tickLine={false}
                            axisLine={{ stroke: 'var(--border)' }}
                            interval={xStep - 1}
                        />
                        <YAxis
                            tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                            tickLine={false}
                            axisLine={false}
                            width={28}
                        />
                        <RechartsTooltip
                            cursor={{ stroke: 'var(--foreground)', strokeOpacity: 0.4 }}
                            content={<EmptyTooltip />}
                        />
                        <Area
                            type="linear"
                            dataKey="failed"
                            stackId="1"
                            stroke="none"
                            fill={SHAD_EC.failed}
                            fillOpacity={0.82}
                            isAnimationActive={false}
                        />
                        <Area
                            type="linear"
                            dataKey="degraded"
                            stackId="1"
                            stroke="none"
                            fill={SHAD_EC.degraded}
                            fillOpacity={0.78}
                            isAnimationActive={false}
                        />
                        <Area
                            type="linear"
                            dataKey="stale"
                            stackId="1"
                            stroke="none"
                            fill={SHAD_EC.stale}
                            fillOpacity={0.6}
                            isAnimationActive={false}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
}

// ── misc ───────────────────────────────────────────────────────────────

function EmptyState() {
    return (
        <div role="status" aria-live="polite" className="text-muted-foreground py-12 text-center">
            <FilterX aria-hidden="true" className="mx-auto mb-2.5 block size-5" strokeWidth={1.6} />
            <p className="m-0 text-[13px]">Nothing matches these filters.</p>
        </div>
    );
}

function stringify(node: React.ReactNode): string {
    if (typeof node === 'string') return node;
    if (typeof node === 'number') return String(node);
    return '';
}
