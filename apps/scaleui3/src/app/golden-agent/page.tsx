'use client';

import { useEffect, useState } from 'react';
import { useTweakpane } from '@proto/devtools/react';
import AgentexCICD, { AgentDetailView, type Agent } from '@/components/agentex-cicd/agentex-cicd';
import { CustomizableAgents } from '@/components/agentex-cicd/customizable-agents';
import { DEFAULT_REFINE_WAIT, type RefineWaitConfig, type RefineWaitStyle } from '@/components/agentex-cicd/agent-builder';
import type { ScheduleFormError } from '@/components/agentex-cicd/scheduled-tasks';

type AgentPage = 'chat' | 'details';

// The agent shown on both surfaces of the command center (chat + details).
const COMMAND_AGENT: Agent = {
  id: 'golden-research',
  source: 'Agentex',
  name: 'Research Assistant',
  status: 'deployed',
  hosting: 'scale',
  description: 'Surfaces accurate, well-sourced information for enterprise teams.',
  lastModified: 'Jun 1, 2025',
};
import { downloadGoldenAgentHandoff } from '@/components/agentex-cicd/handoff/downloadHandoff';
import { NavV3, ShowIconsContext, ShowDescriptionsContext } from '@/components/sgp-nav/sgp-nav';
import { Toaster } from '@/components/ui/sonner';
import { ActiveDirectionProvider } from '@/components/active-direction';

const PURPLE = { accent: '#714DFF', tint: '#F5F3FF', muted: '#EDE9FE', text: '#4C3AE3', soft: '#5746d4' };

const AGENT_PAGE_OPTS = {
  agentPage: {
    label: 'Agent page',
    options: { 'Chat interface': 'chat', 'Agent details': 'details' },
  },
};

const FORM_ERROR_OPTS = {
  formError: {
    label: 'Form error',
    options: {
      'None': 'none',
      'Invalid name': 'invalidName',
      'Duplicate name': 'duplicateName',
      'Missing prompt': 'missingPrompt',
      'Server rejected': 'serverRejected',
      'Backend unreachable': 'backendUnreachable',
    },
  },
};

// Refine-wait design variants — shown only while the Agent Builder panel is open.
const REFINE_OPTS = {
  refineWaitStyle: { label: 'Wait style', options: { 'Reasoning steps': 'steps', 'Minimal spinner': 'minimal' } },
  refineLatencyMs: { label: 'Latency (ms)', min: 3000, max: 45000, step: 1000 },
  refineShowElapsed: { label: 'Show elapsed' },
  refineAllowStop: { label: 'Allow stop' },
};

// Prototyping harness. `alwaysVisible` keeps the panel (and the handoff
// "Download .zip" button) shown regardless of dev mode — same pattern as Falcon.
// Params are scoped to the UI that's showing: `emptyState` only while the
// Scheduled Tasks surface is up, `formError` only while the schedule modal is
// open. Keying by both flags recreates the pane so its binding list can change.
function GoldenAgentDevPane({ agentPage, onAgentPageChange, showEmptyState, emptyState, onEmptyStateChange, showFormError, formError, onFormErrorChange, showRefine, refineWait, onRefineWaitChange }: {
  agentPage: AgentPage;
  onAgentPageChange: (v: AgentPage) => void;
  showEmptyState: boolean;
  emptyState: boolean;
  onEmptyStateChange: (v: boolean) => void;
  showFormError: boolean;
  formError: ScheduleFormError;
  onFormErrorChange: (v: ScheduleFormError) => void;
  showRefine: boolean;
  refineWait: RefineWaitConfig;
  onRefineWaitChange: (v: RefineWaitConfig) => void;
}) {
  const { params } = useTweakpane(
    {
      agentPage,
      ...(showEmptyState ? { emptyState } : {}),
      ...(showFormError ? { formError } : {}),
      ...(showRefine ? {
        refineWaitStyle: refineWait.style,
        refineLatencyMs: refineWait.latencyMs,
        refineShowElapsed: refineWait.showElapsed,
        refineAllowStop: refineWait.allowStop,
      } : {}),
    } as Record<string, boolean | string | number>,
    {
      ...AGENT_PAGE_OPTS,
      ...(showEmptyState ? { emptyState: { label: 'Empty state' } } : {}),
      ...(showFormError ? FORM_ERROR_OPTS : {}),
      ...(showRefine ? REFINE_OPTS : {}),
    },
    {
      alwaysVisible: true,
      buttons: [
        { title: 'Download .zip', label: 'Handoff', onClick: downloadGoldenAgentHandoff },
      ],
    },
  );
  const page = (params as { agentPage?: AgentPage }).agentPage;
  const empty = (params as { emptyState?: boolean }).emptyState;
  const err = (params as { formError?: ScheduleFormError }).formError;
  const rStyle = (params as { refineWaitStyle?: RefineWaitStyle }).refineWaitStyle;
  const rLatency = (params as { refineLatencyMs?: number }).refineLatencyMs;
  const rElapsed = (params as { refineShowElapsed?: boolean }).refineShowElapsed;
  const rStop = (params as { refineAllowStop?: boolean }).refineAllowStop;
  useEffect(() => {
    if (page) onAgentPageChange(page);
  }, [page, onAgentPageChange]);
  useEffect(() => {
    if (showEmptyState && typeof empty === 'boolean') onEmptyStateChange(empty);
  }, [empty, showEmptyState, onEmptyStateChange]);
  useEffect(() => {
    if (showFormError && err) onFormErrorChange(err);
  }, [err, showFormError, onFormErrorChange]);
  useEffect(() => {
    if (!showRefine) return;
    onRefineWaitChange({
      style: rStyle ?? DEFAULT_REFINE_WAIT.style,
      latencyMs: typeof rLatency === 'number' ? rLatency : DEFAULT_REFINE_WAIT.latencyMs,
      showElapsed: typeof rElapsed === 'boolean' ? rElapsed : DEFAULT_REFINE_WAIT.showElapsed,
      allowStop: typeof rStop === 'boolean' ? rStop : DEFAULT_REFINE_WAIT.allowStop,
    });
  }, [showRefine, rStyle, rLatency, rElapsed, rStop, onRefineWaitChange]);
  return null;
}

export default function GoldenAgentPage() {
  const [view, setView] = useState<'command-center' | 'agents'>('command-center');
  const [commandAgentName, setCommandAgentName] = useState<string | null>(null);
  const [scheduledOpen, setScheduledOpen] = useState(false);
  const [scheduledEmptyState, setScheduledEmptyState] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<ScheduleFormError>('none');
  const [agentPage, setAgentPage] = useState<AgentPage>('chat');
  const [builderOpen, setBuilderOpen] = useState(false);
  const [refineWait, setRefineWait] = useState<RefineWaitConfig>(DEFAULT_REFINE_WAIT);
  const onChat = agentPage === 'chat';

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

  return (
    <ActiveDirectionProvider>
      <Toaster />
      <GoldenAgentDevPane
        key={`${onChat && scheduledOpen ? 's' : '_'}${onChat && formOpen ? 'f' : '_'}${onChat && builderOpen ? 'b' : '_'}`}
        agentPage={agentPage}
        onAgentPageChange={setAgentPage}
        showEmptyState={onChat && scheduledOpen}
        emptyState={scheduledEmptyState}
        onEmptyStateChange={setScheduledEmptyState}
        showFormError={onChat && formOpen}
        formError={formError}
        onFormErrorChange={setFormError}
        showRefine={onChat && builderOpen}
        refineWait={refineWait}
        onRefineWaitChange={setRefineWait}
      />
      {view === 'command-center' ? (
        <ShowIconsContext.Provider value={true}>
          <ShowDescriptionsContext.Provider value={true}>
            <div className="h-screen flex flex-col overflow-hidden bg-white">
              <div className="shadow-sm shrink-0">
                <NavV3 appPickerInBranding={false} />
              </div>
              {onChat ? (
                <CustomizableAgents
                  configMode="fullpage" sidebarBg="muted" onBack={handleBack}
                  initialAgentName={commandAgentName} scheduledVariant="timeline"
                  scheduledEmptyState={scheduledEmptyState}
                  onScheduledOpenChange={setScheduledOpen}
                  scheduleFormError={formError}
                  onScheduleFormOpenChange={(open) => { setFormOpen(open); if (!open) setFormError('none'); }}
                  refineWait={refineWait}
                  onBuilderOpenChange={setBuilderOpen}
                />
              ) : (
                /* Agent details — body capped at 1256px wide, centered, with 24px padding */
                <div className="flex-1 min-h-0 overflow-y-auto flex justify-center p-6">
                  <main className="w-full max-w-[1256px] flex flex-col gap-4">
                    <AgentDetailView agent={COMMAND_AGENT} hosting="scale" onBack={() => setView('agents')} />
                  </main>
                </div>
              )}
            </div>
          </ShowDescriptionsContext.Provider>
        </ShowIconsContext.Provider>
      ) : (
        <AgentexCICD onAgentSelect={handleAgentSelect} />
      )}
    </ActiveDirectionProvider>
  );
}
