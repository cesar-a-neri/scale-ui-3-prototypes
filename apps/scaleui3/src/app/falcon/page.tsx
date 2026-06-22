'use client';

// Project Falcon — Scale's fleet control plane for SGP deployments.
// View router: Fleet · Deployments · Customers plus two detail subpages
// (Workspace, Customer). Ported to ScaleUI3 (Base UI + Tailwind v4).

import { useEffect, useState } from 'react';
import { useTweakpane } from '@proto/devtools/react';
import { downloadFalconHandoff } from '@/components/falcon/handoff/downloadHandoff';
import { TooltipProvider } from '@/components/ui/tooltip';
import { NavShell, type FalconSection } from '@/components/falcon/nav-shell';
import { FIBrowse } from '@/components/falcon/fi-browse';
import { WorkspaceDetail } from '@/components/falcon/workspace-detail';
import type { ViewState } from '@/components/falcon/states';
import { CustomerCatalog } from '@/components/falcon/customer-catalog';
import { CustomerDetail } from '@/components/falcon/customer-detail';

export default function FalconPage() {
    // Tweakpane controls for this prototype. `alwaysVisible` keeps the panel
    // shown regardless of dev mode (Falcon-specific). The Theme control drives
    // ScaleUI3's dark mode by toggling the `.dark` class on <html>.
    const { params } = useTweakpane(
        { theme: 'light', viewState: 'default' },
        {
            theme: { label: 'Theme', options: { Light: 'light', Dark: 'dark' } },
            viewState: {
                label: 'View state',
                options: { Default: 'default', Loading: 'loading', Empty: 'empty', Error: 'error' },
            },
        },
        {
            alwaysVisible: true,
            buttons: [
                { title: 'Download .zip', label: 'Handoff', onClick: downloadFalconHandoff },
            ],
        },
    );
    const mode: 'light' | 'dark' = params.theme === 'dark' ? 'dark' : 'light';
    const viewState = params.viewState as ViewState;
    useEffect(() => {
        const root = document.documentElement;
        root.classList.toggle('dark', mode === 'dark');
        return () => root.classList.remove('dark');
    }, [mode]);

    const [section, setSection] = useState<FalconSection>('fleet');
    const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

    const handleNavigate = (next: FalconSection) => {
        setSection(next);
        setSelectedWorkspaceId(null);
        setSelectedCustomerId(null);
    };

    const handleSelectWorkspace = (id: string) => setSelectedWorkspaceId(id);
    const handleSelectCustomer = (id: string) => setSelectedCustomerId(id);

    // Jump straight to a customer's detail page (e.g. from a workspace header).
    // Clears the workspace drill-down and switches the active section so the
    // customer detail isn't intercepted.
    const handleNavigateToCustomer = (id: string) => {
        setSelectedWorkspaceId(null);
        setSection('customers');
        setSelectedCustomerId(id);
    };

    const handleBackFromWorkspace = () => setSelectedWorkspaceId(null);
    const handleBackFromCustomer = () => setSelectedCustomerId(null);

    const renderBody = () => {
        if (selectedWorkspaceId) {
            return (
                <WorkspaceDetail
                    workspaceId={selectedWorkspaceId}
                    onBack={handleBackFromWorkspace}
                    onSelectCustomer={handleNavigateToCustomer}
                    viewState={viewState}
                />
            );
        }
        switch (section) {
            // Distinct keys so React remounts FIBrowse when switching sections —
            // its `mode0` is only an initial state value, mirroring the original's
            // separate FleetOverview / DeploymentSearch wrappers.
            case 'fleet':
                return (
                    <FIBrowse
                        key="fleet"
                        mode0="workspaces"
                        onSelectWorkspace={handleSelectWorkspace}
                        viewState={viewState}
                    />
                );
            case 'deployments':
                return (
                    <FIBrowse
                        key="deployments"
                        mode0="deployments"
                        onSelectWorkspace={handleSelectWorkspace}
                        viewState={viewState}
                    />
                );
            case 'customers':
                if (selectedCustomerId) {
                    return (
                        <CustomerDetail
                            customerId={selectedCustomerId}
                            onBack={handleBackFromCustomer}
                            onSelectWorkspace={handleSelectWorkspace}
                            onSelectCustomer={handleSelectCustomer}
                            viewState={viewState}
                        />
                    );
                }
                return <CustomerCatalog onSelectCustomer={handleSelectCustomer} viewState={viewState} />;
        }
    };

    return (
        <div className="bg-background text-foreground flex h-screen">
            <TooltipProvider delay={300}>
                <NavShell section={section} onNavigate={handleNavigate}>
                    {renderBody()}
                </NavShell>
            </TooltipProvider>
        </div>
    );
}
