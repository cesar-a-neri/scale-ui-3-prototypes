'use client';

// Customer Detail — hero header, metrics grid, then the customer's workspaces
// table. prev/next navigation lives in tooltipped icon buttons.

import * as React from 'react';
import { useState } from 'react';
import { ArrowUpRight, UserX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { SHAD_SEV, ShadSevBadge, ShadTierBars, ShadKV, ShadSummaryPill, SlackLogo, fiClass } from './lib';
import { falconData, fCustomer, fCloudName, fStaleness } from './data';
import { FalconLoading, FalconEmpty, FalconError, type ViewState } from './states';
import type { Workspace } from './types';

interface CustomerDetailProps {
    customerId: string;
    onBack: () => void;
    onSelectWorkspace: (id: string) => void;
    onSelectCustomer: (id: string) => void;
    viewState?: ViewState;
}

export function CustomerDetail({ customerId, onSelectWorkspace, viewState = 'default' }: CustomerDetailProps) {
    if (viewState === 'loading') return <FalconLoading variant="detail" />;
    if (viewState === 'error')
        return <FalconError description="We couldn’t load this customer. Check your connection and try again." />;
    if (viewState === 'empty')
        return (
            <FalconEmpty
                icon={UserX}
                title="Customer not found"
                description="This customer may have been removed or is no longer available."
            />
        );

    const c = fCustomer(customerId);
    const ws = falconData.listWorkspacesByCustomer(customerId);
    const counts = { healthy: 0, degraded: 0, failed: 0, stale: 0 } as Record<string, number>;
    ws.forEach((w) => {
        counts[fiClass(w).k]++;
    });
    const packs = ws.reduce((s, w) => s + (w.packs || 0), 0);
    const nodes = ws.reduce((s, w) => s + (w.nodes || 0), 0);
    const allHealthy = counts.failed + counts.degraded + counts.stale === 0;

    return (
        <div className="flex h-full w-full flex-col">
            {/* hero */}
            <header className="border-border shrink-0 border-b px-6 pt-5 pb-5">
                <div className="mb-2.5 flex items-center gap-2.5">
                    <ShadTierBars t={c.tier} showLabel className="gap-1" labelClassName="text-muted-foreground" />
                    <h1 className="m-0 text-2xl font-semibold tracking-tight">{c.name}</h1>
                    <span className="ml-1 inline-flex gap-1.5">
                        {allHealthy ? (
                            <ShadSummaryPill k="healthy" label="All healthy" />
                        ) : (
                            <>
                                {counts.failed > 0 && <ShadSummaryPill k="failed" label={`${counts.failed} failed`} />}
                                {counts.degraded > 0 && (
                                    <ShadSummaryPill k="degraded" label={`${counts.degraded} degraded`} />
                                )}
                                {counts.stale > 0 && <ShadSummaryPill k="stale" label={`${counts.stale} stale`} />}
                            </>
                        )}
                    </span>
                </div>
                <div className="text-muted-foreground flex items-center gap-3.5 text-[13px]">
                    <span>
                        <span className="text-foreground font-semibold">{ws.length}</span> workspaces
                    </span>
                    <span className="text-border" aria-hidden="true">
                        ·
                    </span>
                    <span>
                        Contact <span className="text-foreground">{c.accountMgr}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className="text-muted-foreground">Email:</span>
                        <a
                            href={`mailto:${c.fde}`}
                            className="text-foreground focus-visible:ring-ring inline-flex items-center gap-0.5 rounded-sm text-[13px] no-underline hover:underline focus-visible:ring-2 focus-visible:outline-none"
                        >
                            {c.fde}
                            <ArrowUpRight aria-hidden="true" className="text-muted-foreground size-3" strokeWidth={2} />
                        </a>
                    </span>
                    <div className="ml-auto flex items-center gap-3.5">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-primary"
                            aria-label={`Open ${c.slack} in Slack`}
                        >
                            <SlackLogo className="size-[13px]" /> {c.slack}
                            <ArrowUpRight aria-hidden="true" className="size-3" strokeWidth={2} />
                        </Button>
                    </div>
                </div>
            </header>

            {/* body */}
            <div className="flex flex-1 flex-col gap-5 overflow-auto px-6 pt-5 pb-7">
                <Card className="gap-0 overflow-hidden p-0 shadow-none">
                    <div className="grid grid-cols-4">
                        <ShadKV k="Customer priority" v={c.tier} mono />
                        <ShadKV k="Workspaces" v={ws.length} mono />
                        <ShadKV k="Packs installed" v={packs} mono />
                        <ShadKV k="Nodes" v={nodes} mono />
                    </div>
                </Card>

                <div>
                    <div className="mb-2.5 flex items-baseline justify-between">
                        <div className="flex items-baseline gap-2">
                            <h2 className="m-0 text-[15px] font-semibold">Workspaces</h2>
                            <Badge variant="secondary" className="font-mono">
                                {ws.length}
                            </Badge>
                        </div>
                        <span className="text-muted-foreground font-mono text-[11.5px]">sorted by env · prod first</span>
                    </div>
                    <WorkspaceTable rows={ws} onSelectWorkspace={onSelectWorkspace} />
                </div>
            </div>
        </div>
    );
}

function WorkspaceTable({
    rows,
    onSelectWorkspace,
}: {
    rows: Workspace[];
    onSelectWorkspace: (id: string) => void;
}) {
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    return (
        <Card className="gap-0 overflow-hidden p-0">
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted">
                        {['Workspace', 'Env', 'Cloud · Region', 'SGP', 'Packs', 'Nodes', 'Heartbeat', 'Status'].map(
                            (h) => (
                                <TableHead key={h}>{h}</TableHead>
                            ),
                        )}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map((w) => {
                        const cl = fiClass(w);
                        const stale = fStaleness(w.lastHeartbeat);
                        const isHovered = hoveredId === w.id;
                        return (
                            <TableRow
                                key={w.id}
                                role="link"
                                tabIndex={0}
                                aria-label={`Open workspace ${w.id}`}
                                onClick={() => onSelectWorkspace(w.id)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        onSelectWorkspace(w.id);
                                    }
                                }}
                                onMouseEnter={() => setHoveredId(w.id)}
                                onMouseLeave={() => setHoveredId(null)}
                                className="focus-visible:ring-ring cursor-pointer focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
                                style={{ background: isHovered ? SHAD_SEV[cl.k].hover : SHAD_SEV[cl.k].tint }}
                            >
                                <TableCell className="font-mono text-[12.5px]">{w.id}</TableCell>
                                <TableCell>
                                    <Badge
                                        variant="secondary"
                                        className="h-[18px] rounded-md px-1.5 text-[10px] tracking-wider uppercase"
                                    >
                                        {w.env}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-[12.5px]">
                                    {fCloudName(w.cloud)}{' '}
                                    <span className="text-border" aria-hidden="true">
                                        ·
                                    </span>{' '}
                                    <span className="text-muted-foreground font-mono">{w.region}</span>
                                </TableCell>
                                <TableCell className="font-mono text-xs">{w.sgp}</TableCell>
                                <TableCell className="font-mono text-xs">{w.packs}</TableCell>
                                <TableCell className="font-mono text-xs">{w.nodes}</TableCell>
                                <TableCell
                                    className="font-mono text-xs"
                                    style={{ color: cl.stale ? SHAD_SEV[cl.k].fg : undefined }}
                                >
                                    {stale.label}
                                </TableCell>
                                <TableCell>
                                    <ShadSevBadge k={cl.k} soft />
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </Card>
    );
}
