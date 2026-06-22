// Type definitions for the Falcon fleet control plane.

export type Tier = 'P0' | 'P1' | 'P2';
export type Cloud = 'aws' | 'gcp' | 'azure' | 'onprem';
export type Env = 'prod' | 'staging' | 'dev';
export type RawHealth = 'healthy' | 'degraded' | 'failed' | 'unknown';
export type HealthBucket = 'failed' | 'degraded' | 'stale' | 'healthy';
export type DeploymentStatus = 'Deployed' | 'Progressing' | 'CrashLoopBackOff' | 'Unknown';
export type FlagType = 'bool' | 'number' | 'string';

export interface Customer {
    id: string;
    name: string;
    tier: Tier;
    fde: string;
    slack: string;
    sla: string;
    region: 'NA' | 'EU' | 'APAC';
    accountMgr: string;
}

export interface Workspace {
    id: string;
    customer: string;
    env: Env;
    cloud: Cloud;
    region: string;
    sgp: string;
    health: RawHealth;
    packs: number;
    nodes: number;
    lastHeartbeat: string;
}

export interface Deployment {
    workspace: string;
    customer: string;
    env: Env;
    cloud: Cloud;
    pack: string;
    chart: string;
    image: string;
    status: DeploymentStatus;
    replicas: number;
}

export interface FeatureFlag {
    key: string;
    type: FlagType;
    value: string;
    owner: string;
}

export interface PackMeta {
    name: string;
    desc: string;
}
