// MOCK FIXTURES — delete once the backend is wired (see data/source.ts).
//
// Deterministic fixtures for Project Falcon — Scale's fleet control plane for
// SGP deployments. These arrays are internal to the data layer: consumers must
// NOT import from this file directly — they go through data/source.ts.

import type {
    Customer,
    Workspace,
    Deployment,
    FeatureFlag,
    PackMeta,
    DeploymentStatus,
} from '../types';

export const NOW = new Date('2026-05-20T15:42:00Z').getTime();

const ago = (m: number) => new Date(NOW - m * 60_000).toISOString();

export const customers: Customer[] = [
    { id: 'acme',      name: 'Acme Corp',           tier: 'P0', fde: 'm.alvarez@scale.com',         slack: '#cust-acme',     sla: '99.9%',  region: 'NA',   accountMgr: 'J. Park'   },
    { id: 'gamma',     name: 'Gamma Solutions',     tier: 'P0', fde: 'k.tan@scale.com',             slack: '#cust-gamma',    sla: '99.9%',  region: 'NA',   accountMgr: 'L. Singh'  },
    { id: 'helios',    name: 'Helios Defense',      tier: 'P0', fde: 'r.cho@scale.com',             slack: '#cust-helios',   sla: '99.95%', region: 'NA',   accountMgr: 'J. Park'   },
    { id: 'northwind', name: 'Northwind Logistics', tier: 'P1', fde: 's.patel@scale.com',           slack: '#cust-nwl',      sla: '99.5%',  region: 'EU',   accountMgr: 'A. Müller' },
    { id: 'orbital',   name: 'Orbital Foundry',     tier: 'P1', fde: 'd.iwu@scale.com',             slack: '#cust-orbital',  sla: '99.5%',  region: 'NA',   accountMgr: 'L. Singh'  },
    { id: 'kestrel',   name: 'Kestrel BioMed',      tier: 'P1', fde: 'y.ng@scale.com',              slack: '#cust-kestrel',  sla: '99.5%',  region: 'APAC', accountMgr: 'H. Sato'   },
    { id: 'meridian',  name: 'Meridian Bank',       tier: 'P0', fde: 'a.muller@meridianbank.com',   slack: '#cust-mrdn',     sla: '99.99%', region: 'EU',   accountMgr: 'A. Müller' },
    { id: 'lumen',     name: 'Lumen Retail',        tier: 'P2', fde: 'p.haley@scale.com',           slack: '#cust-lumen',    sla: '99.0%',  region: 'NA',   accountMgr: 'L. Singh'  },
    { id: 'castellum', name: 'Castellum Group',     tier: 'P2', fde: 'p.haley@scale.com',           slack: '#cust-ctl',      sla: '99.0%',  region: 'EU',   accountMgr: 'A. Müller' },
    { id: 'parkside',  name: 'Parkside Health',     tier: 'P1', fde: 'r.cho@scale.com',             slack: '#cust-parkside', sla: '99.5%',  region: 'NA',   accountMgr: 'J. Park'   },
];

export const workspaces: Workspace[] = [
    { id: 'ws-7c3a9f', customer: 'acme',      env: 'prod',    cloud: 'aws',    region: 'us-east-1',   sgp: '4.12.3',     health: 'healthy',  packs: 18, nodes: 42, lastHeartbeat: ago(0.4)  },
    { id: 'ws-2e10b8', customer: 'acme',      env: 'staging', cloud: 'aws',    region: 'us-east-1',   sgp: '4.13.0-rc.2',health: 'healthy',  packs: 18, nodes: 6,  lastHeartbeat: ago(1.2)  },
    { id: 'ws-91d4c2', customer: 'acme',      env: 'dev',     cloud: 'aws',    region: 'us-west-2',   sgp: '4.13.0-rc.2',health: 'degraded', packs: 17, nodes: 4,  lastHeartbeat: ago(2.1)  },
    { id: 'ws-44a6e1', customer: 'gamma',     env: 'prod',    cloud: 'gcp',    region: 'us-central1', sgp: '4.12.3',     health: 'healthy',  packs: 21, nodes: 60, lastHeartbeat: ago(0.6)  },
    { id: 'ws-aa20bd', customer: 'gamma',     env: 'staging', cloud: 'gcp',    region: 'us-central1', sgp: '4.12.3',     health: 'healthy',  packs: 21, nodes: 8,  lastHeartbeat: ago(0.8)  },
    { id: 'ws-58fa07', customer: 'helios',    env: 'prod',    cloud: 'onprem', region: 'iad-air-1',   sgp: '4.11.7',     health: 'degraded', packs: 14, nodes: 24, lastHeartbeat: ago(3.5)  },
    { id: 'ws-b13e5c', customer: 'helios',    env: 'prod',    cloud: 'onprem', region: 'sfo-air-2',   sgp: '4.11.7',     health: 'healthy',  packs: 14, nodes: 24, lastHeartbeat: ago(1.1)  },
    { id: 'ws-d72fa0', customer: 'northwind', env: 'prod',    cloud: 'azure',  region: 'westeurope',  sgp: '4.12.2',     health: 'healthy',  packs: 16, nodes: 18, lastHeartbeat: ago(0.9)  },
    { id: 'ws-9912cb', customer: 'northwind', env: 'staging', cloud: 'azure',  region: 'westeurope',  sgp: '4.12.3',     health: 'healthy',  packs: 16, nodes: 4,  lastHeartbeat: ago(2.4)  },
    { id: 'ws-0a6dd4', customer: 'orbital',   env: 'prod',    cloud: 'aws',    region: 'us-east-2',   sgp: '4.12.3',     health: 'failed',   packs: 19, nodes: 12, lastHeartbeat: ago(11.3) },
    { id: 'ws-3b8e72', customer: 'orbital',   env: 'dev',     cloud: 'aws',    region: 'us-east-2',   sgp: '4.13.0-rc.2',health: 'healthy',  packs: 19, nodes: 3,  lastHeartbeat: ago(0.3)  },
    { id: 'ws-5c0d1a', customer: 'kestrel',   env: 'prod',    cloud: 'gcp',    region: 'asia-east1',  sgp: '4.12.2',     health: 'healthy',  packs: 15, nodes: 14, lastHeartbeat: ago(1.6)  },
    { id: 'ws-8e2f44', customer: 'kestrel',   env: 'staging', cloud: 'gcp',    region: 'asia-east1',  sgp: '4.12.3',     health: 'unknown',  packs: 15, nodes: 3,  lastHeartbeat: ago(42)   },
    { id: 'ws-ff90ee', customer: 'meridian',  env: 'prod',    cloud: 'onprem', region: 'fra-fin-1',   sgp: '4.12.3',     health: 'healthy',  packs: 22, nodes: 48, lastHeartbeat: ago(0.5)  },
    { id: 'ws-1700cd', customer: 'meridian',  env: 'prod',    cloud: 'onprem', region: 'lon-fin-1',   sgp: '4.12.3',     health: 'healthy',  packs: 22, nodes: 48, lastHeartbeat: ago(1.4)  },
    { id: 'ws-26ab90', customer: 'meridian',  env: 'staging', cloud: 'onprem', region: 'fra-fin-1',   sgp: '4.13.0-rc.2',health: 'degraded', packs: 22, nodes: 8,  lastHeartbeat: ago(6.7)  },
    { id: 'ws-7711a3', customer: 'lumen',     env: 'prod',    cloud: 'aws',    region: 'us-west-2',   sgp: '4.11.7',     health: 'healthy',  packs: 11, nodes: 8,  lastHeartbeat: ago(2.8)  },
    { id: 'ws-cc0fa2', customer: 'lumen',     env: 'dev',     cloud: 'aws',    region: 'us-west-2',   sgp: '4.12.3',     health: 'healthy',  packs: 12, nodes: 2,  lastHeartbeat: ago(0.7)  },
    { id: 'ws-aa11d5', customer: 'castellum', env: 'prod',    cloud: 'azure',  region: 'germanywc',   sgp: '4.12.2',     health: 'healthy',  packs: 13, nodes: 10, lastHeartbeat: ago(1.9)  },
    { id: 'ws-3f88e1', customer: 'parkside',  env: 'prod',    cloud: 'aws',    region: 'us-east-1',   sgp: '4.12.3',     health: 'healthy',  packs: 17, nodes: 16, lastHeartbeat: ago(0.2)  },
    { id: 'ws-bd2240', customer: 'parkside',  env: 'staging', cloud: 'aws',    region: 'us-east-1',   sgp: '4.12.3',     health: 'healthy',  packs: 17, nodes: 4,  lastHeartbeat: ago(1.0)  },
    { id: 'ws-501efa', customer: 'parkside',  env: 'dev',     cloud: 'aws',    region: 'us-east-1',   sgp: '4.13.0-rc.2',health: 'healthy',  packs: 17, nodes: 2,  lastHeartbeat: ago(0.9)  },
];

export const packCatalog: PackMeta[] = [
    { name: 'agentex',         desc: 'Agent execution runtime' },
    { name: 'compass',         desc: 'Trace + eval routing' },
    { name: 'gateway',         desc: 'API gateway / authz' },
    { name: 'vault-bridge',    desc: 'Secrets propagation' },
    { name: 'ingest-pipeline', desc: 'Data labeling intake' },
    { name: 'tempo-shim',      desc: 'OTEL → Tempo adapter' },
    { name: 'observatory',     desc: 'In-cluster Prom/Loki' },
    { name: 'forge-builder',   desc: 'Pack build/sign daemon' },
    { name: 'ledger',          desc: 'Per-workspace audit log' },
    { name: 'oasis-router',    desc: 'Multi-tenant router' },
];

function tagsFor(sgp: string) {
    const base = sgp.split('-')[0];
    return {
        agentex:           `agentex:${base}-${sgp.includes('rc') ? 'rc.2' : 'ga'}`,
        compass:           `compass:1.8.${sgp.endsWith('rc.2') ? 9 : 4}`,
        gateway:           `gateway:2.4.${base === '4.11.7' ? 1 : 3}`,
        'vault-bridge':    `vault-bridge:0.6.2`,
        'ingest-pipeline': `ingest-pipeline:3.2.0`,
        'tempo-shim':      `tempo-shim:0.4.${sgp === '4.13.0-rc.2' ? 9 : 7}`,
        observatory:       `observatory:2.1.4`,
        'forge-builder':   `forge-builder:0.9.1`,
        ledger:            `ledger:1.0.${base === '4.11.7' ? 2 : 5}`,
        'oasis-router':    `oasis-router:0.7.${sgp.endsWith('rc.2') ? 1 : 0}`,
    } as Record<string, string>;
}

function generateDeployments(): Deployment[] {
    const out: Deployment[] = [];
    workspaces.forEach(ws => {
        const tags = tagsFor(ws.sgp);
        packCatalog.forEach((p, i) => {
            // Skip a couple per workspace so counts vary.
            if ((i + ws.id.charCodeAt(3)) % 7 === 0 && i > 3) return;
            const image = tags[p.name];
            const chart = `${p.name}-chart-${image.split(':')[1].replace(/[^0-9.]/g, '') || '0.0.0'}`;
            const status: DeploymentStatus =
                ws.health === 'failed' && i < 3 ? 'CrashLoopBackOff' :
                ws.health === 'degraded' && i === 0 ? 'Progressing' :
                ws.health === 'unknown' ? 'Unknown' :
                'Deployed';
            out.push({
                workspace: ws.id,
                customer:  ws.customer,
                env:       ws.env,
                cloud:     ws.cloud,
                pack:      p.name,
                chart,
                image,
                status,
                replicas:  ws.env === 'prod' ? (3 + (i % 3)) : 1,
            });
        });
    });
    return out;
}

export const deployments: Deployment[] = generateDeployments();

export const featureFlags: FeatureFlag[] = [
    { key: 'sgp.agent.streaming_responses',    type: 'bool',   value: 'true',   owner: 'agent-platform' },
    { key: 'sgp.compass.trace_sampling_rate',  type: 'number', value: '0.25',   owner: 'observability'  },
    { key: 'sgp.gateway.rate_limit_per_min',   type: 'number', value: '1200',   owner: 'gateway-team'   },
    { key: 'sgp.experiments.tool_cache_v2',    type: 'bool',   value: 'true',   owner: 'agent-platform' },
    { key: 'sgp.experiments.eval_v3_pipeline', type: 'bool',   value: 'false',  owner: 'eval-team'      },
    { key: 'sgp.ingest.async_upload',          type: 'bool',   value: 'true',   owner: 'ingest-team'    },
    { key: 'sgp.gateway.allowlist_mode',       type: 'string', value: 'strict', owner: 'gateway-team'   },
    { key: 'sgp.ui.workspace_v2',              type: 'bool',   value: 'false',  owner: 'frontend'       },
    { key: 'sgp.cost.per_token_log',           type: 'bool',   value: 'true',   owner: 'finops'         },
];
