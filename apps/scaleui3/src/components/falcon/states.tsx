'use client';

// Shared Loading / Empty / Error states for the Falcon prototype. These are
// toggled via the Tweakpane "View state" control so the states can be reviewed
// on any page without needing to reproduce the underlying data condition.

import * as React from 'react';
import { Inbox, TriangleAlert, RefreshCw, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type ViewState = 'default' | 'loading' | 'empty' | 'error';

// ── primitive ───────────────────────────────────────────────────────────

export function Skeleton({ className }: { className?: string }) {
    return <div className={cn('bg-muted animate-pulse rounded-md', className)} aria-hidden="true" />;
}

// ── empty / error (centered messaging) ──────────────────────────────────

function CenteredState({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-[320px] flex-1 items-center justify-center p-8" role="status" aria-live="polite">
            <div className="flex max-w-sm flex-col items-center text-center">{children}</div>
        </div>
    );
}

export function FalconEmpty({
    icon: Icon = Inbox,
    title,
    description,
    actionLabel,
    onAction,
}: {
    icon?: LucideIcon;
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
}) {
    return (
        <CenteredState>
            <div className="bg-muted text-muted-foreground mb-4 flex size-12 items-center justify-center rounded-full">
                <Icon className="size-6" strokeWidth={2} aria-hidden />
            </div>
            <h3 className="m-0 text-sm font-semibold">{title}</h3>
            {description && <p className="text-muted-foreground m-0 mt-1.5 text-[13px]">{description}</p>}
            {actionLabel && (
                <Button variant="outline" size="sm" className="mt-4" onClick={onAction}>
                    {actionLabel}
                </Button>
            )}
        </CenteredState>
    );
}

export function FalconError({
    title = 'Something went wrong',
    description = 'We couldn’t load this data. Check your connection and try again.',
    onRetry,
}: {
    title?: string;
    description?: string;
    onRetry?: () => void;
}) {
    return (
        <CenteredState>
            <div className="text-destructive mb-4 flex size-12 items-center justify-center rounded-full bg-[var(--falcon-sev-failed-bg)]">
                <TriangleAlert
                    className="size-6"
                    strokeWidth={2}
                    aria-hidden
                    style={{ color: 'var(--falcon-sev-failed-fg)' }}
                />
            </div>
            <h3 className="m-0 text-sm font-semibold">{title}</h3>
            <p className="text-muted-foreground m-0 mt-1.5 text-[13px]">{description}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
                <RefreshCw className="size-3.5" strokeWidth={2} aria-hidden /> Retry
            </Button>
        </CenteredState>
    );
}

// ── loading skeletons (per view shape) ──────────────────────────────────

export function FalconLoading({ variant }: { variant: 'results' | 'detail' | 'catalog' }) {
    if (variant === 'catalog') return <CatalogSkeleton />;
    if (variant === 'detail') return <DetailSkeleton />;
    return <ResultsSkeleton />;
}

function ResultsSkeleton() {
    return (
        <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading results">
            <Skeleton className="h-[120px] w-full" />
            <Card className="gap-0 overflow-hidden p-0">
                <div className="bg-muted/60 flex h-10 items-center gap-4 px-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-3 flex-1" />
                    ))}
                </div>
                {Array.from({ length: 8 }).map((_, r) => (
                    <div key={r} className="border-border flex items-center gap-4 border-t px-4 py-3.5">
                        {Array.from({ length: 5 }).map((_, c) => (
                            <Skeleton key={c} className={cn('h-3.5', c === 0 ? 'w-32' : 'flex-1')} />
                        ))}
                    </div>
                ))}
            </Card>
        </div>
    );
}

function DetailSkeleton() {
    return (
        <div className="flex flex-col gap-6 p-6" aria-busy="true" aria-label="Loading">
            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-7 w-7 rounded-md" />
                    <Skeleton className="h-7 w-52" />
                    <Skeleton className="h-5 w-16 rounded-md" />
                </div>
                <Skeleton className="h-4 w-80" />
            </div>
            <div className="grid grid-cols-4 gap-px overflow-hidden rounded-xl border">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="bg-card flex flex-col gap-2 p-4">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-4 w-16" />
                    </div>
                ))}
            </div>
            <div className="flex flex-col gap-3">
                <Skeleton className="h-5 w-40" />
                <Card className="gap-0 overflow-hidden p-0">
                    {Array.from({ length: 6 }).map((_, r) => (
                        <div key={r} className="border-border flex items-center gap-4 border-t px-4 py-3.5 first:border-t-0">
                            <Skeleton className="h-3.5 w-40" />
                            <Skeleton className="h-3.5 flex-1" />
                            <Skeleton className="h-5 w-20 rounded-md" />
                        </div>
                    ))}
                </Card>
            </div>
        </div>
    );
}

function CatalogSkeleton() {
    return (
        <div className="grid grid-cols-2 gap-[18px] p-6 lg:grid-cols-3 xl:grid-cols-4" aria-busy="true" aria-label="Loading">
            {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="h-[164px] w-full rounded-[4px]" />
            ))}
        </div>
    );
}
