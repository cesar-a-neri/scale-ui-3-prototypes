'use client';

// Customer Catalog — card grid + search + sort toggle. ScaleUI3 has no
// SegmentedControl, so the Priority/Alphabetical sort uses a small Button group.

import * as React from 'react';
import { useMemo, useState } from 'react';
import { Search, User, Mail, FilterX, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ShadTierBars, ShadSummaryPill, SlackLogo, fiClass } from './lib';
import { falconData, shadPersonName } from './data';
import { FalconLoading, FalconEmpty, FalconError, type ViewState } from './states';
import type { Tier } from './types';

interface CustomerCatalogProps {
    onSelectCustomer: (id: string) => void;
    viewState?: ViewState;
}

type SortKey = 'priority' | 'alphabetical';

const TIER_RANK: Record<Tier, number> = { P0: 0, P1: 1, P2: 2 };

export function CustomerCatalog({ onSelectCustomer, viewState = 'default' }: CustomerCatalogProps) {
    const [query, setQuery] = useState('');
    const [sort, setSort] = useState<SortKey>('priority');

    const customers = falconData.listCustomers();

    const decorated = useMemo(
        () =>
            customers.map((c) => {
                const ws = falconData.listWorkspacesByCustomer(c.id);
                const fail = ws.filter((w) => fiClass(w).k === 'failed').length;
                const deg = ws.filter((w) => fiClass(w).k === 'degraded').length;
                const stl = ws.filter((w) => fiClass(w).k === 'stale').length;
                return { ...c, person: shadPersonName(c.fde), wsCount: ws.length, fail, deg, stl };
            }),
        [customers],
    );

    const filtered = useMemo(() => {
        let list = decorated;
        if (query) {
            const q = query.toLowerCase();
            list = list.filter((c) =>
                `${c.name} ${c.person} ${c.fde} ${c.slack} ${c.tier}`.toLowerCase().includes(q),
            );
        }
        list = [...list].sort((a, b) =>
            sort === 'priority'
                ? TIER_RANK[a.tier] - TIER_RANK[b.tier] || a.name.localeCompare(b.name)
                : a.name.localeCompare(b.name),
        );
        return list;
    }, [decorated, query, sort]);

    return (
        <div className="flex h-full w-full flex-col">
            {/* header */}
            <header className="border-border shrink-0 border-b px-6 pt-4 pb-4">
                <div className="mb-3.5 flex items-end justify-between gap-4">
                    <h1 className="m-0 text-2xl font-semibold tracking-tight">Customer Catalog</h1>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <div className="relative w-80">
                        <Label htmlFor="catalog-search" className="sr-only">
                            Search customers
                        </Label>
                        <Search
                            aria-hidden="true"
                            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 z-10 size-3.5 -translate-y-1/2"
                            strokeWidth={2}
                        />
                        <Input
                            id="catalog-search"
                            type="search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search"
                            className="pl-8"
                        />
                    </div>
                    <div className="flex items-center gap-2.5">
                        <span id="sort-label" className="text-muted-foreground text-sm">
                            Sort by
                        </span>
                        <div
                            role="group"
                            aria-label="Sort customers"
                            className="bg-muted flex items-center gap-1 rounded-md p-0.5"
                        >
                            {(
                                [
                                    ['priority', 'Priority'],
                                    ['alphabetical', 'Alphabetical'],
                                ] as const
                            ).map(([v, label]) => (
                                <Button
                                    key={v}
                                    variant={sort === v ? 'secondary' : 'ghost'}
                                    size="xs"
                                    aria-pressed={sort === v}
                                    onClick={() => setSort(v)}
                                    className={cn(sort === v && 'bg-background shadow-sm')}
                                >
                                    {label}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>
            </header>

            {/* grid */}
            {viewState === 'loading' ? (
                <FalconLoading variant="catalog" />
            ) : viewState === 'error' ? (
                <FalconError description="We couldn’t load the customer catalog. Check your connection and try again." />
            ) : viewState === 'empty' ? (
                <FalconEmpty
                    icon={Users}
                    title="No customers yet"
                    description="Customers will appear here once they're onboarded."
                />
            ) : (
            <div className="flex-1 overflow-auto px-6 pt-5 pb-7">
                {filtered.length === 0 && (
                    <div
                        role="status"
                        aria-live="polite"
                        className="text-muted-foreground py-12 text-center"
                    >
                        <FilterX
                            aria-hidden="true"
                            className="mx-auto mb-2.5 block size-5"
                            strokeWidth={1.6}
                        />
                        <p className="m-0 text-[13px]">No customers match &ldquo;{query}&rdquo;.</p>
                    </div>
                )}
                <div className="grid grid-cols-4 gap-[18px]">
                    {filtered.map((c) => {
                        const allHealthy = c.fail + c.deg + c.stl === 0;
                        return (
                            <div
                                key={c.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => onSelectCustomer(c.id)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        onSelectCustomer(c.id);
                                    }
                                }}
                                aria-label={`Open ${c.name}, ${c.tier}, ${c.wsCount} workspaces`}
                                className="border-border bg-card text-card-foreground focus-visible:ring-ring focus-visible:ring-offset-background flex cursor-pointer flex-col rounded-[4px] border p-4 pb-0 text-left shadow-sm transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                            >
                                <div className="mb-3 flex items-start justify-between gap-2.5">
                                    <div className="text-base font-semibold tracking-tight">{c.name}</div>
                                    <ShadTierBars t={c.tier} showLabel className="gap-1" labelClassName="text-muted-foreground" />
                                </div>
                                <div className="mb-3.5 flex flex-col gap-2">
                                    <div className="text-muted-foreground flex items-center gap-2.5 text-[13px]">
                                        <User aria-hidden="true" className="size-3.5" strokeWidth={2} />
                                        {c.person}
                                    </div>
                                    <div className="text-muted-foreground flex items-center gap-2.5 text-[13px]">
                                        <Mail aria-hidden="true" className="size-3.5" strokeWidth={2} />
                                        {c.fde}
                                    </div>
                                    <div className="flex items-center gap-2.5 text-[13px]">
                                        <SlackLogo className="size-3.5" />
                                        <span className="text-foreground">{c.slack}</span>
                                    </div>
                                </div>
                                <div className="border-border -mx-4 flex items-center justify-between gap-2 border-t px-4 py-3">
                                    <span className="text-muted-foreground text-[13px]">
                                        <span className="text-foreground font-medium">{c.wsCount}</span>{' '}
                                        {c.wsCount === 1 ? 'Workspace' : 'Workspaces'}
                                    </span>
                                    <div className="flex flex-wrap justify-end gap-1.5">
                                        {allHealthy && <ShadSummaryPill k="healthy" label="All healthy" />}
                                        {c.deg > 0 && <ShadSummaryPill k="degraded" label={`${c.deg} degraded`} />}
                                        {c.fail > 0 && <ShadSummaryPill k="failed" label={`${c.fail} failed`} />}
                                        {c.stl > 0 && <ShadSummaryPill k="stale" label={`${c.stl} stale`} />}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            )}
        </div>
    );
}
