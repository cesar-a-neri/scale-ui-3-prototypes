'use client';

import { useEffect, useState } from 'react';
import { useTweakpane } from '@proto/devtools/react';
import AgentexCICD from '@/components/agentex-cicd/agentex-cicd';
import { CustomizableAgents } from '@/components/agentex-cicd/customizable-agents';
import { downloadGoldenAgentHandoff } from '@/components/agentex-cicd/handoff/downloadHandoff';
import { NavV3, ShowIconsContext, ShowDescriptionsContext } from '@/components/sgp-nav/sgp-nav';

const PURPLE = { accent: '#714DFF', tint: '#F5F3FF', muted: '#EDE9FE', text: '#4C3AE3', soft: '#5746d4' };

export default function GoldenAgentPage() {
  const [view, setView] = useState<'command-center' | 'agents'>('command-center');
  const [commandAgentName, setCommandAgentName] = useState<string | null>(null);

  // Prototyping harness. `alwaysVisible` keeps the panel (and the handoff
  // "Download .zip" button) shown regardless of dev mode — same pattern as Falcon.
  useTweakpane(
    {},
    {},
    {
      alwaysVisible: true,
      buttons: [
        { title: 'Download .zip', label: 'Handoff', onClick: downloadGoldenAgentHandoff },
      ],
    },
  );

  const handleAgentSelect = (name: string) => { setCommandAgentName(name); setView('command-center'); };
  const handleBack = () => setView('agents');

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--proto-accent', PURPLE.accent);
    root.style.setProperty('--proto-accent-tint', PURPLE.tint);
    root.style.setProperty('--proto-accent-muted', PURPLE.muted);
    root.style.setProperty('--proto-accent-text', PURPLE.text);
    root.style.setProperty('--proto-accent-soft', PURPLE.soft);
  }, []);

  if (view === 'command-center') {
    return (
      <ShowIconsContext.Provider value={true}>
        <ShowDescriptionsContext.Provider value={true}>
          <div className="h-screen flex flex-col overflow-hidden bg-white">
            <div className="shadow-sm shrink-0">
              <NavV3 appPickerInBranding={false} />
            </div>
            <CustomizableAgents configMode="fullpage" sidebarBg="muted" onBack={handleBack} initialAgentName={commandAgentName} />
          </div>
        </ShowDescriptionsContext.Provider>
      </ShowIconsContext.Provider>
    );
  }

  return <AgentexCICD onAgentSelect={handleAgentSelect} />;
}
