// Pure presentation helpers — keep as-is when wiring the backend.

import { NOW } from './fixtures';

export interface Staleness {
    mins: number;
    label: string;
    stale: boolean;
}

export function fStaleness(iso: string): Staleness {
    const mins = Math.round((NOW - new Date(iso).getTime()) / 60000);
    if (mins < 1) return { mins, label: 'just now', stale: false };
    if (mins < 60) return { mins, label: `${mins}m ago`, stale: mins > 5 };
    const hr = Math.floor(mins / 60);
    return { mins, label: `${hr}h ${mins % 60}m ago`, stale: true };
}

export function fCloudName(c: string): string {
    return ({ aws: 'AWS', gcp: 'GCP', azure: 'Azure', onprem: 'On-prem' } as Record<string, string>)[c] ?? c;
}

export function fSgpChannel(v: string): string {
    return v.includes('rc') ? 'preview' : 'stable';
}

export function shadPersonName(email: string): string {
    if (!email) return '';
    return email.split('@')[0].split(/[._]/)
        .map(p => p.length === 1 ? p.toUpperCase() + '.' : p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ');
}
