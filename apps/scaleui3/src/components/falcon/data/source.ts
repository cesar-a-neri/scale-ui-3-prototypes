// The Falcon data-source seam. Consumers read all entity data through the
// `falconData` object exported here — never from the raw fixtures.

import type { Customer, Workspace, Deployment, FeatureFlag } from '../types';
import { customers, workspaces, deployments, featureFlags } from './fixtures';

export interface FalconDataSource {
    listCustomers(): Customer[];
    getCustomer(id: string): Customer | undefined;
    listWorkspaces(): Workspace[];
    listWorkspacesByCustomer(customerId: string): Workspace[];
    getWorkspace(id: string): Workspace | undefined;
    listDeployments(): Deployment[];
    listDeploymentsByWorkspace(workspaceId: string): Deployment[];
    listFeatureFlags(): FeatureFlag[];
}

const mockSource: FalconDataSource = {
    listCustomers: () => customers,
    getCustomer: (id) => customers.find((c) => c.id === id),
    listWorkspaces: () => workspaces,
    listWorkspacesByCustomer: (customerId) => workspaces.filter((w) => w.customer === customerId),
    getWorkspace: (id) => workspaces.find((w) => w.id === id),
    listDeployments: () => deployments,
    listDeploymentsByWorkspace: (workspaceId) => deployments.filter((d) => d.workspace === workspaceId),
    listFeatureFlags: () => featureFlags,
};

// ⬇️ THE DATA SEAM. This is the ONLY file to change to wire a real backend:
// replace `mockSource` with an implementation that calls your API. See HANDOFF.md.
export const falconData: FalconDataSource = mockSource;
