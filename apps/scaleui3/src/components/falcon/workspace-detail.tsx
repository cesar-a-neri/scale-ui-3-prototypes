'use client';

// Workspace Detail — the page you land on after clicking a row in the Fleet
// Health Overview. Header → incident banner → metadata grid → Packs / Feature
// flags tabs.

import * as React from 'react';
import { useMemo, useState } from 'react';
import { ChevronRight, ArrowUpRight, OctagonX, AlertTriangle, Search, Box, PackageOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
    SHAD_SEV,
    ShadSevBadge,
    ShadTierBars,
    ShadKV,
    ShadHealthPill,
    SlackLogo,
    fiClass,
    fiReason,
    fiSorted,
} from './lib';
import { falconData, fCustomer, fCloudName, fStaleness, fSgpChannel } from './data';
import { FalconLoading, FalconEmpty, FalconError, type ViewState } from './states';
import type { Deployment, HealthBucket, Workspace } from './types';

interface WorkspaceDetailProps {
    workspaceId: string;
    onBack: () => void;
    onSelectCustomer?: (id: string) => void;
    viewState?: ViewState;
}

const OBS_TOOLS = ['LGTM', 'Logs', 'Traces', 'Datadog'];

function shadAge(id: string) {
    let s = 0;
    for (let i = 0; i < id.length; i++) s = (s * 31 + id.charCodeAt(i)) >>> 0;
    return 40 + (s % 320);
}

interface PackGroup {
    pack: string;
    chart: string;
    rev: number;
    ns: string;
    health: 'Healthy' | 'Degraded' | 'Failed' | 'Unknown';
    wls: Array<{ workload: string; container: string; repo: string; tag: string }>;
}

const STATUS_TO_HEALTH: Record<string, PackGroup['health']> = {
    Deployed: 'Healthy',
    Progressing: 'Degraded',
    CrashLoopBackOff: 'Failed',
    Unknown: 'Unknown',
};

// Map pack health → severity bucket so rows/cards can pick up the same
// semantic tints used on the Fleet Health Overview. (mirrors ShadHealthPill)
const HEALTH_BUCKET: Record<PackGroup['health'], HealthBucket> = {
    Healthy: 'healthy',
    Degraded: 'degraded',
    Failed: 'failed',
    Unknown: 'stale',
};

function shadPackGroups(ds: Deployment[], wsId: string): PackGroup[] {
    return ds.map((d) => {
        let h = 0;
        const key = wsId + d.pack;
        for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
        const chartVer = (d.chart.match(/[0-9]+\.[0-9]+\.[0-9]+/) || ['1.0.0'])[0];
        const tag = (d.image.split(':')[1] || '').replace(/[^0-9.]/g, '') || chartVer;
        const repo = `egp/${d.pack}`;
        const wls = [
            { workload: `${d.pack}-api`, container: 'main', repo, tag },
            { workload: `${d.pack}-worker`, container: 'main', repo, tag },
        ];
        if (h % 2 === 0) {
            wls.push({
                workload: `${d.pack}-worker`,
                container: 'sidecar',
                repo: 'egp/logging',
                tag: 'sha-' + h.toString(16).slice(0, 6),
            });
        }
        return {
            pack: d.pack,
            chart: `${d.pack} ${chartVer}`,
            rev: 6 + (h % 18),
            ns: 'sgp-system',
            health: STATUS_TO_HEALTH[d.status] || 'Unknown',
            wls,
        };
    });
}

export function WorkspaceDetail({ workspaceId, onSelectCustomer, viewState = 'default' }: WorkspaceDetailProps) {
    const ordered = useMemo(() => fiSorted(), []);
    const [id] = useState<string>(workspaceId);
    const [tab, setTab] = useState<'packs' | 'flags'>('packs');
    const [packQuery, setPackQuery] = useState('');

    if (viewState === 'loading') return <FalconLoading variant="detail" />;
    if (viewState === 'error')
        return <FalconError description="We couldn’t load this workspace. Check your connection and try again." />;
    if (viewState === 'empty')
        return (
            <FalconEmpty
                icon={PackageOpen}
                title="Workspace not found"
                description="This workspace may have been deleted or is no longer available."
            />
        );

    const w: Workspace = falconData.getWorkspace(id) ?? ordered[0];
    const cust = fCustomer(w.customer);
    const cl = fiClass(w);
    const stale = fStaleness(w.lastHeartbeat);
    const sev = SHAD_SEV[cl.k];
    const ds = falconData.listDeploymentsByWorkspace(w.id);

    const tabs: Array<['packs' | 'flags', string, number]> = [
        ['packs', 'Packs', ds.length],
        ['flags', 'Feature flags', falconData.listFeatureFlags().length],
    ];

    return (
        <div className="flex h-full w-full flex-col">

            <div className="flex-1 overflow-auto">
                {/* header */}
                <header className="px-6 pt-5 pb-6">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-6">
                            <div className="flex min-w-0 items-center gap-2.5">
                                <ShadTierBars
                                    t={cust.tier}
                                    showLabel
                                    className="gap-1"
                                    labelClassName="text-muted-foreground"
                                />
                                <h1 className="m-0 text-2xl font-semibold tracking-tight">
                                    {onSelectCustomer ? (
                                        <button
                                            type="button"
                                            onClick={() => onSelectCustomer(w.customer)}
                                            className="focus-visible:ring-ring m-0 cursor-pointer appearance-none rounded-sm border-0 bg-transparent p-0 text-left text-2xl font-semibold tracking-tight transition-colors hover:underline focus-visible:ring-2 focus-visible:outline-none"
                                        >
                                            {cust.name}
                                        </button>
                                    ) : (
                                        cust.name
                                    )}
                                </h1>
                                <Badge
                                    variant="secondary"
                                    className="rounded-md text-[10.5px] tracking-wider uppercase"
                                >
                                    {w.env}
                                </Badge>
                                <ShadSevBadge k={cl.k} soft />
                            </div>
                            <div className="flex shrink-0 gap-1.5" role="group" aria-label="Observability tools">
                                {OBS_TOOLS.map((t) => (
                                    <Button key={t} variant="outline" size="sm" aria-label={`Open ${t}`}>
                                        {t}{' '}
                                        <ArrowUpRight
                                            aria-hidden="true"
                                            className="text-muted-foreground size-3"
                                            strokeWidth={2}
                                        />
                                    </Button>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center justify-between gap-6">
                            <p className="text-muted-foreground m-0 min-w-0 text-[13px]">
                                <span className="font-mono">{w.id}</span> · {fCloudName(w.cloud)} · {w.region} · SGP{' '}
                                {w.sgp} ({fSgpChannel(w.sgp)})
                            </p>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-primary shrink-0"
                                aria-label={`Open ${cust.slack} in Slack`}
                            >
                                <SlackLogo className="size-3" /> {cust.slack}{' '}
                                <ArrowUpRight
                                    aria-hidden="true"
                                    className="text-muted-foreground size-3"
                                    strokeWidth={2}
                                />
                            </Button>
                        </div>
                    </div>
                </header>

                {/* incident banner */}
                {(cl.k === 'failed' || cl.k === 'degraded') && (
                    <div
                        role="alert"
                        className="mx-6 mb-4 flex items-center gap-2.5 rounded-xl p-3"
                        style={{ background: sev.bg }}
                    >
                        {cl.k === 'failed' ? (
                            <OctagonX aria-hidden="true" className="size-4" style={{ color: sev.dot }} strokeWidth={2} />
                        ) : (
                            <AlertTriangle
                                aria-hidden="true"
                                className="size-4"
                                style={{ color: sev.dot }}
                                strokeWidth={2}
                            />
                        )}
                        <span className="text-xs font-semibold" style={{ color: sev.fg }}>
                            {fiReason(w, cl.k)}
                        </span>
                        <span className="text-muted-foreground text-xs">
                            {cl.k === 'failed'
                                ? `agentex · compass · gateway affected — paged ${cust.fde.split('@')[0]} ${stale.label}`
                                : 'rolling restart on agentex'}
                        </span>
                        <div className="flex-1" />
                    </div>
                )}

                {/* metadata grid */}
                <Card className="mx-6 mb-5 gap-0 overflow-hidden p-0 shadow-none">
                    <div className="grid grid-cols-4">
                        <ShadKV k="Customer tier" v={cust.tier} mono />
                        <ShadKV k="Cloud" v={fCloudName(w.cloud)} />
                        <ShadKV k="Region" v={w.region} mono />
                        <ShadKV k="SGP version" v={`${w.sgp} · ${fSgpChannel(w.sgp)}`} mono />
                        <ShadKV k="Nodes" v={w.nodes} mono />
                        <ShadKV k="Packs installed" v={w.packs} mono />
                        <ShadKV k="Last heartbeat" v={stale.label} mono color={stale.stale ? sev.fg : undefined} />
                        <ShadKV k="Workspace age" v={`${shadAge(w.id)} d`} mono />
                    </div>
                </Card>

                {/* tabs */}
                <Tabs value={tab} onValueChange={(v) => setTab(v as 'packs' | 'flags')}>
                    <div className="border-border mx-6 border-b">
                        <TabsList variant="line" className="flex" aria-label="Workspace sections">
                            {tabs.map(([k, l, count]) => (
                                <TabsTrigger key={k} value={k}>
                                    {l}
                                    <Badge
                                        variant="outline"
                                        className="text-muted-foreground h-[17px] rounded-md px-1.5 font-mono text-[10px]"
                                    >
                                        {count}
                                    </Badge>
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>
                    <TabsContent value="packs" className="mt-0 px-6 pt-4 pb-7">
                        <PacksTab ds={ds} wsId={w.id} packQuery={packQuery} setPackQuery={setPackQuery} />
                    </TabsContent>
                    <TabsContent value="flags" className="mt-0 px-6 pt-4 pb-7">
                        <FlagsTab />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

// ── packs tab ──────────────────────────────────────────────────────────

const PACK_COLS = ['Pack', 'Chart Version', 'Rev', 'Namespace', 'Health', 'Workloads'];

type Workload = PackGroup['wls'][number];

function PacksTab({
    ds,
    wsId,
    packQuery,
    setPackQuery,
}: {
    ds: Deployment[];
    wsId: string;
    packQuery: string;
    setPackQuery: (s: string) => void;
}) {
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [hoveredPack, setHoveredPack] = useState<string | null>(null);
    const groups = shadPackGroups(ds, wsId).filter(
        (g) =>
            !packQuery ||
            g.pack.includes(packQuery.toLowerCase()) ||
            g.wls.some((x) => x.workload.includes(packQuery.toLowerCase()) || x.repo.includes(packQuery.toLowerCase())),
    );

    const toggle = (pack: string) =>
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(pack)) next.delete(pack);
            else next.add(pack);
            return next;
        });

    return (
        <div>
            <div className="mb-3 flex items-center justify-between gap-4">
                <h2 className="m-0 text-base font-semibold">Installed Packs</h2>
                <div className="relative w-72">
                    <Label htmlFor="packs-search" className="sr-only">
                        Search installed packs
                    </Label>
                    <Search
                        aria-hidden="true"
                        className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 z-10 size-3.5 -translate-y-1/2"
                        strokeWidth={2}
                    />
                    <Input
                        id="packs-search"
                        type="search"
                        value={packQuery}
                        onChange={(e) => setPackQuery(e.target.value)}
                        placeholder="Search"
                        className="pl-8"
                    />
                </div>
            </div>
            <Card className="gap-0 overflow-hidden p-0">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted">
                            {PACK_COLS.map((h) => (
                                <TableHead key={h}>{h}</TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {groups.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={PACK_COLS.length}
                                    className="text-muted-foreground p-6 text-center text-sm"
                                    aria-live="polite"
                                >
                                    No packs match &ldquo;{packQuery}&rdquo;.
                                </TableCell>
                            </TableRow>
                        )}
                        {groups.map((g) => {
                            const isOpen = expanded.has(g.pack) || !!packQuery;
                            const cellBase = 'py-3 h-[42px] box-border';
                            const bucket = HEALTH_BUCKET[g.health];
                            const isHovered = hoveredPack === g.pack;
                            return (
                                <React.Fragment key={g.pack}>
                                    <TableRow
                                        className="cursor-pointer"
                                        onClick={() => toggle(g.pack)}
                                        aria-expanded={isOpen}
                                        onMouseEnter={() => setHoveredPack(g.pack)}
                                        onMouseLeave={() => setHoveredPack(null)}
                                        style={{
                                            background: isHovered ? SHAD_SEV[bucket].hover : SHAD_SEV[bucket].tint,
                                            transition: 'background 0.1s',
                                        }}
                                    >
                                        <TableCell className={cn(cellBase, 'font-mono font-medium')}>
                                            <span className="flex items-center gap-1.5">
                                                <ChevronRight
                                                    aria-hidden="true"
                                                    className={cn(
                                                        'text-muted-foreground size-3.5 transition-transform',
                                                        isOpen && 'rotate-90',
                                                    )}
                                                    strokeWidth={2}
                                                />
                                                {g.pack}
                                            </span>
                                        </TableCell>
                                        <TableCell className={cn(cellBase, 'text-muted-foreground font-mono text-xs')}>
                                            {g.chart}
                                        </TableCell>
                                        <TableCell className={cn(cellBase, 'font-mono text-xs')}>{g.rev}</TableCell>
                                        <TableCell className={cn(cellBase, 'font-mono text-xs')}>{g.ns}</TableCell>
                                        <TableCell className={cellBase}>
                                            <ShadHealthPill h={g.health} />
                                        </TableCell>
                                        <TableCell className={cn(cellBase, 'text-muted-foreground text-xs')}>
                                            {g.wls.length} workload{g.wls.length === 1 ? '' : 's'}
                                        </TableCell>
                                    </TableRow>
                                    {isOpen && (
                                        <TableRow className="hover:bg-transparent">
                                            <TableCell colSpan={PACK_COLS.length} className="bg-muted/30 p-0">
                                                <div className="w-full px-4 py-3">
                                                    <WorkloadsCards wls={g.wls} health={g.health} />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}

// ── pack workload detail — 3 toggleable non-table layouts ───────────────

type WlHealth = 'Failed' | 'Degraded';

// A pack's health is derived from its workloads, so when a pack is unhealthy we
// surface that on at least one nested workload. Healthy/Unknown packs get no
// marker. (No per-workload data exists, so we mark the first workload.)
function wlMark(health: PackGroup['health'], j: number): WlHealth | null {
    if (j !== 0) return null;
    if (health === 'Failed') return 'Failed';
    if (health === 'Degraded') return 'Degraded';
    return null;
}

function WorkloadHealthMarker({ h, className }: { h: WlHealth; className?: string }) {
    const m = SHAD_SEV[h === 'Failed' ? 'failed' : 'degraded'];
    return (
        <Badge
            variant="outline"
            className={cn('h-[18px] gap-1 rounded-md px-1.5 text-[10px]', className)}
            style={{ background: m.bg, color: m.fg, borderColor: m.bd }}
        >
            <span aria-hidden="true" className="size-[6px] rounded-full" style={{ background: m.dot }} />
            {m.label}
        </Badge>
    );
}

// Card grid. Each workload is a self-contained card with its container as a
// header badge and repo/tag as labelled metadata.
function WorkloadsCards({ wls, health }: { wls: Workload[]; health: PackGroup['health'] }) {
    return (
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-4">
            {wls.map((wl, j) => {
                const mark = wlMark(health, j);
                const markSev = mark ? SHAD_SEV[mark === 'Failed' ? 'failed' : 'degraded'] : null;
                return (
                <div
                    key={wl.workload + j}
                    className={cn(
                        'flex flex-col gap-2.5 rounded-lg border p-3 shadow-sm',
                        !markSev && 'border-border bg-card',
                    )}
                    style={markSev ? { background: markSev.tint, borderColor: markSev.bd } : undefined}
                >
                    <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 font-mono text-xs font-medium">
                            <Box aria-hidden="true" className="text-muted-foreground size-3.5" strokeWidth={2} />
                            {wl.workload}
                        </span>
                        <span className="flex items-center gap-1.5">
                            {mark && <WorkloadHealthMarker h={mark} />}
                            <Badge variant="secondary" className="h-[18px] rounded-md px-1.5 text-[10px]">
                                {wl.container}
                            </Badge>
                        </span>
                    </div>
                    <div className="flex flex-col gap-1 border-t pt-2">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground text-[11px]">Repository</span>
                            <span className="truncate font-mono text-[11px]">{wl.repo}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground text-[11px]">Tag</span>
                            <Badge
                                variant="outline"
                                className="h-[18px] rounded-md px-1.5 font-mono text-[10px]"
                            >
                                {wl.tag}
                            </Badge>
                        </div>
                    </div>
                </div>
                );
            })}
        </div>
    );
}

// ── flags tab ──────────────────────────────────────────────────────────

function FlagsTab() {
    const featureFlags = falconData.listFeatureFlags();
    return (
        <div className="grid grid-cols-2 gap-2.5">
            {featureFlags.map((f) => {
                const on = f.type === 'bool' && f.value === 'true';
                return (
                    <div
                        key={f.key}
                        className="border-border bg-card flex flex-row items-center justify-between gap-2.5 rounded-xl border px-3.5 py-3 shadow-sm"
                    >
                        <div className="min-w-0">
                            <div className="overflow-hidden font-mono text-[12.5px] text-ellipsis whitespace-nowrap">
                                {f.key}
                            </div>
                            <p className="text-muted-foreground m-0 mt-0.5 text-[11px]">
                                {f.type} · owned by {f.owner}
                            </p>
                        </div>
                        {f.type === 'bool' ? (
                            <Switch
                                checked={on}
                                readOnly
                                aria-label={`${f.key} is ${on ? 'enabled' : 'disabled'}`}
                            />
                        ) : (
                            <span className="font-mono text-[12.5px] font-semibold">{f.value}</span>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
