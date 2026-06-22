// Public surface of the Falcon data layer. Consumers import from here (or the
// './data' directory, which resolves to this index). Raw fixtures are NOT
// re-exported — go through `falconData` for entity data.

import type { Customer } from '../types';
import { falconData } from './source';

export * from './source';
export * from './util';

// Back-compat lookup helper. Preserves the exact fallback shape the original
// data.ts returned for an unknown customer id, so behavior is unchanged.
export function fCustomer(id: string): Customer {
    return falconData.getCustomer(id) ?? {
        id, name: id, tier: 'P2', fde: '', slack: '', sla: '', region: 'NA', accountMgr: '',
    };
}
