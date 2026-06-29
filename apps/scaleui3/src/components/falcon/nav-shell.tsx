'use client';

// Falcon global navigation — top nav (Fleet · Deployments · Customers) + avatar.
// Brand colour / logo style knobs from the source Tweakpane config are dropped;
// sensible ScaleUI3 defaults are hardcoded.

import * as React from 'react';
import { cn } from '@/lib/utils';

export type FalconSection = 'fleet' | 'deployments' | 'customers';

export interface NavItem {
    id: FalconSection;
    label: string;
}

export const FALCON_NAV_ITEMS: NavItem[] = [
    { id: 'fleet', label: 'Fleet' },
    { id: 'deployments', label: 'Deployments' },
    { id: 'customers', label: 'Customers' },
];

function Avatar() {
    return (
        <span
            role="img"
            aria-label="Signed in as Jamie Stone"
            className="bg-primary text-primary-foreground inline-flex size-7 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold tracking-wide"
        >
            JS
        </span>
    );
}

export interface NavShellProps {
    section: FalconSection;
    items?: NavItem[];
    onNavigate: (id: FalconSection) => void;
    children: React.ReactNode;
}

export function NavShell({ section, items = FALCON_NAV_ITEMS, onNavigate, children }: NavShellProps) {
    return (
        <div className="flex h-full w-full flex-col">
            <header className="bg-card border-border flex h-14 shrink-0 items-stretch border-b pr-6">
                <button
                    type="button"
                    onClick={() => onNavigate('fleet')}
                    aria-label="Falcon — go to Fleet"
                    className="focus-visible:ring-ring mr-2 flex cursor-pointer items-center border-0 bg-transparent pr-4 pl-8 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
                >
                    <img
                        src="/falcon-logo.svg"
                        alt=""
                        aria-hidden="true"
                        className="size-6 select-none dark:invert"
                        draggable={false}
                    />
                </button>

                <nav aria-label="Primary" className="flex items-center gap-1">
                    {items.map((it) => {
                        const on = it.id === section;
                        return (
                            <button
                                key={it.id}
                                type="button"
                                onClick={() => onNavigate(it.id)}
                                aria-current={on ? 'page' : undefined}
                                className={cn(
                                    'flex items-center rounded-lg px-3 py-1.5 text-sm transition-colors',
                                    'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                                    on
                                        ? 'bg-muted text-foreground font-semibold'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60 font-normal',
                                )}
                            >
                                {it.label}
                            </button>
                        );
                    })}
                </nav>

                <div className="ml-auto flex items-center gap-2 pl-4">
                    <Avatar />
                </div>
            </header>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
        </div>
    );
}
