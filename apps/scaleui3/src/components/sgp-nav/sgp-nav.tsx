'use client';

import React, { useState, useRef, useEffect, createContext, useContext } from 'react';
import {
  Brain, Cpu, Plug,
  File, Wrench,
  LayoutDashboard, ChartGantt,
  ChevronDown, LayoutGrid, Search,
  KeyRound, BookOpen, Settings, LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Lightweight separator — replaces @radix-ui/react-separator (not a dep in ScaleUI3).
const Separator = {
  Root: ({ className }: { className?: string }) => <div role="separator" className={className} />,
};

// ─── Custom Icon Components ───────────────────────────────────────────────────

export const HexagonNodes = ({ size = 13, style }: { size?: number; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
    <path d="M8 2.75C8.40625 2.75 8.75 2.40625 8.75 2C8.75 1.59375 8.40625 1.25 8 1.25C7.59375 1.25 7.25 1.59375 7.25 2C7.25 2.40625 7.59375 2.75 8 2.75ZM10 2C10 2.84375 9.5 3.5625 8.75 3.84375V6.15625C9.5 6.4375 10 7.15625 10 8C10 8.09375 10 8.21875 9.96875 8.3125L11.7812 9.40625C11.9375 9.28125 12.0938 9.21875 12.25 9.15625V6.84375C12.0938 6.78125 11.9375 6.71875 11.7812 6.59375L10.875 7.15625C10.7188 6.65625 10.4688 6.21875 10.0938 5.875L11.0312 5.3125C10.9062 4.53125 11.25 3.6875 12 3.28125C12.9688 2.71875 14.1875 3.03125 14.7188 4C15.2812 4.96875 14.9688 6.1875 14 6.71875C13.9062 6.78125 13.8438 6.8125 13.75 6.84375V9.15625C13.8438 9.1875 13.9062 9.21875 14 9.28125C14.9688 9.8125 15.2812 11.0312 14.7188 12C14.1875 12.9688 12.9688 13.2812 12 12.7188C11.25 12.3125 10.9062 11.4688 11.0312 10.6875L9.21875 9.59375C9.0625 9.6875 8.90625 9.78125 8.75 9.84375V12.1562C9.5 12.4375 10 13.1562 10 14C10 15.0938 9.09375 16 8 16C6.90625 16 6 15.0938 6 14C6 13.1562 6.53125 12.4375 7.25 12.1562V9.84375C6.53125 9.5625 6 8.84375 6 8C6 7.90625 6 7.78125 6.03125 7.6875L4.21875 6.59375C4.0625 6.6875 3.90625 6.78125 3.75 6.84375V9.15625C3.90625 9.21875 4.0625 9.28125 4.21875 9.40625L5.125 8.84375C5.28125 9.34375 5.53125 9.78125 5.90625 10.125L4.96875 10.6875C5.09375 11.4688 4.75 12.3125 4 12.7188C3.03125 13.2812 1.8125 12.9688 1.28125 12C0.71875 11.0312 1.03125 9.8125 2 9.28125C2.09375 9.21875 2.15625 9.1875 2.25 9.15625V6.84375C2.15625 6.8125 2.09375 6.78125 2 6.75C1.03125 6.1875 0.71875 4.96875 1.28125 4C1.8125 3.03125 3.03125 2.71875 4 3.28125C4.75 3.6875 5.09375 4.53125 4.96875 5.3125L6.78125 6.40625C6.9375 6.3125 7.09375 6.21875 7.25 6.15625V3.84375C6.5 3.5625 6 2.84375 6 2C6 0.90625 6.90625 0 8 0C9.09375 0 10 0.90625 10 2ZM8 8.75C8.40625 8.75 8.75 8.40625 8.75 8C8.75 7.59375 8.40625 7.25 8 7.25C7.59375 7.25 7.25 7.59375 7.25 8C7.25 8.40625 7.59375 8.75 8 8.75ZM13.375 5.65625C13.7188 5.4375 13.8438 4.96875 13.6562 4.625C13.4375 4.28125 12.9688 4.15625 12.625 4.34375C12.2812 4.5625 12.1562 5.03125 12.3438 5.375C12.5625 5.71875 13.0312 5.84375 13.375 5.65625ZM3.65625 5.375C3.84375 5.03125 3.71875 4.5625 3.375 4.34375C3.03125 4.15625 2.5625 4.28125 2.34375 4.625C2.15625 4.96875 2.28125 5.4375 2.625 5.65625C2.96875 5.84375 3.4375 5.71875 3.65625 5.375ZM8.75 14C8.75 13.5938 8.40625 13.25 8 13.25C7.59375 13.25 7.25 13.5938 7.25 14C7.25 14.4062 7.59375 14.75 8 14.75C8.40625 14.75 8.75 14.4062 8.75 14ZM2.34375 11.375C2.5625 11.7188 3.03125 11.8438 3.375 11.6562C3.71875 11.4375 3.84375 10.9688 3.65625 10.625C3.4375 10.2812 2.96875 10.1562 2.625 10.3438C2.28125 10.5625 2.15625 11.0312 2.34375 11.375ZM13.375 10.3438C13.0312 10.1562 12.5625 10.2812 12.3438 10.625C12.1562 10.9688 12.2812 11.4375 12.625 11.6562C12.9688 11.8438 13.4375 11.7188 13.6562 11.375C13.8438 11.0312 13.7188 10.5625 13.375 10.3438Z" fill="currentColor" />
  </svg>
);

export const WorkflowIcon = ({ size = 13, style }: { size?: number; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
    <path d="M1.875 3.125V6.875H5.625V3.125H1.875ZM0 3.125C0 2.10938 0.859375 1.25 1.875 1.25H5.625C6.67969 1.25 7.5 2.10938 7.5 3.125V4.0625H12.5V3.125C12.5 2.10938 13.3594 1.25 14.375 1.25H18.125C19.1797 1.25 20 2.10938 20 3.125V6.875C20 7.92969 19.1797 8.75 18.125 8.75H14.375C13.3594 8.75 12.5 7.92969 12.5 6.875V5.9375H7.5V6.875C7.5 7.26562 7.38281 7.65625 7.14844 7.96875L9.60938 11.25H13.125C14.1797 11.25 15 12.1094 15 13.125V16.875C15 17.9297 14.1797 18.75 13.125 18.75H9.375C8.35938 18.75 7.5 17.9297 7.5 16.875V13.125C7.5 12.7344 7.61719 12.3438 7.85156 12.0312L5.39062 8.75H1.875C0.859375 8.75 0 7.92969 0 6.875V3.125ZM9.375 13.125V16.875H13.125V13.125H9.375ZM18.125 3.125H14.375V6.875H18.125V3.125Z" fill="currentColor" />
  </svg>
);

export const EvaluationsIcon = ({ size = 13, style }: { size?: number; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
    <path d="M7.5 6.83594L11.1328 3.24219L10 2.14844L6.40625 5.74219L7.5 6.83594ZM4.88281 6.83594C4.25781 6.25 4.25781 5.23438 4.88281 4.64844L8.90625 0.585938C9.53125 0 10.5078 0 11.1328 0.585938L12.6562 2.14844C13.0859 2.57812 13.2422 3.20312 13.0469 3.75L17.6172 8.35938C18.1641 8.16406 18.8281 8.28125 19.2578 8.71094L20.7812 10.2734C21.4062 10.8594 21.4062 11.875 20.7812 12.4609L16.7578 16.5234C16.1328 17.1094 15.1562 17.1094 14.5312 16.5234L13.0078 14.9609C12.5391 14.5312 12.4219 13.9062 12.6172 13.3594L10.9766 11.7188L1.91406 20.7812C1.5625 21.1328 0.976562 21.1328 0.585938 20.7812C0.234375 20.4297 0.234375 19.8047 0.585938 19.4531L9.64844 10.3906L8.04688 8.75C7.5 8.94531 6.83594 8.82812 6.40625 8.39844L4.88281 6.83594ZM16.2109 9.57031L11.8359 5.19531L9.45312 7.53906L13.8281 11.9141L16.2109 9.57031ZM19.2578 11.3672L18.1641 10.2734L14.5312 13.8672L15.6641 14.9609L19.2578 11.3672Z" fill="currentColor" />
  </svg>
);

// ─── Context ──────────────────────────────────────────────────────────────────

export const ShowIconsContext = createContext(true);
export const ShowDescriptionsContext = createContext(false);

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChildItem = { label: string; description?: string };
export type SubItem = { label: string; icon: React.ElementType; description?: string; children?: ChildItem[] };
export type Hub = { id: string; label: string; items: SubItem[] };

// ─── Navigation Data ──────────────────────────────────────────────────────────

export const HUBS: Hub[] = [
  {
    id: 'agents',
    label: 'Agents',
    items: [
      { label: 'Agents', icon: HexagonNodes, description: 'Deploy and manage AI agents' },
      { label: 'Models', icon: Cpu, description: 'Configure language models', children: [{ label: 'Model Training', description: 'Run and manage training jobs' }] },
    ],
  },
  {
    id: 'context',
    label: 'Context',
    items: [
      { label: 'Connectors', icon: Plug, description: 'Connect external data sources', children: [{ label: 'Semantic Ontology', description: 'Map database relationships' }] },
      { label: 'Knowledge Bases', icon: Brain as React.ElementType, description: 'Manage vector stores' },
      { label: 'Files', icon: File, description: 'Upload and manage documents', children: [{ label: 'Extractions', description: 'Parse and chunk file content' }] },
      { label: 'Tools', icon: Wrench, description: 'Define MCP servers' },
    ],
  },
  {
    id: 'oversight',
    label: 'Oversight',
    items: [
      { label: 'Evaluations', icon: EvaluationsIcon, description: 'Test and score agent output', children: [{ label: 'Datasets', description: 'Curate evaluation test cases' }, { label: 'Graders', description: 'Define scoring criteria' }] },
      { label: 'Traces', icon: ChartGantt, description: 'Monitor agent execution' },
      { label: 'Workflows', icon: WorkflowIcon, description: 'Build and schedule pipelines' },
      { label: 'Dashboards', icon: LayoutDashboard, description: 'Create custom graphs' },
    ],
  },
];

export const MICRO_APPS: { label: string; sublabel: string }[] = [
  { label: 'Conversational Analytics', sublabel: 'Text to SQL' },
  { label: 'Admin Console', sublabel: 'Document Extraction Admin' },
];

// ─── Shared Primitives ────────────────────────────────────────────────────────

export const BRAND = '#5B5CE6';
export const BRAND_LIGHT = '#EEEEFF';

export function useOutsideClick(ref: React.RefObject<HTMLElement | null>, cb: () => void) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) cb();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, cb]);
}

const ScaleLogo = () => (
  <img src="/images/logo.png" width={24} height={24} alt="Scale GenAI Platform" aria-hidden />
);

// ─── Shared Nav Shell ─────────────────────────────────────────────────────────

interface NavShellProps {
  children: React.ReactNode;
  rightSlot: React.ReactNode;
  brandPicker?: {
    isOpen: boolean;
    onToggle: () => void;
    dropdownContent: React.ReactNode;
  };
}

export const NavShell = ({ children, rightSlot, brandPicker }: NavShellProps) => (
  <header className="bg-white border-b border-[#c5cfe4] px-4 h-[55px] flex items-center justify-between relative z-40 shrink-0">
    <div className="flex items-center gap-5">
      <div className="relative shrink-0">
        {brandPicker ? (
          <>
            <button
              onClick={brandPicker.onToggle}
              className={cn(
                'flex items-center gap-2 px-1.5 py-1 rounded transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#5B5CE6]',
                brandPicker.isOpen ? 'bg-[#0011FF0F]' : 'hover:bg-[#0011FF0F]',
              )}
            >
              <ScaleLogo />
              <span className={cn('text-[14px] font-medium tracking-tight whitespace-nowrap transition-colors', brandPicker.isOpen ? 'text-[#2E1E71]' : 'text-gray-12')}>
                Scale GenAI Platform
              </span>
              <ChevronDown size={13} className={cn('transition-transform duration-200 opacity-50', brandPicker.isOpen && 'rotate-180')} />
            </button>
            {brandPicker.isOpen && brandPicker.dropdownContent}
          </>
        ) : (
          <div className="flex items-center gap-2">
            <ScaleLogo />
            <span className="text-[14px] font-normal text-gray-12 tracking-tight whitespace-nowrap">Scale GenAI Platform</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-0.5">{children}</div>
    </div>
    <div className="flex items-center gap-2">{rightSlot}</div>
  </header>
);

// ─── Hub Trigger Button ───────────────────────────────────────────────────────

interface HubTriggerProps {
  label: string;
  isOpen: boolean;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
}

export const HubTrigger = ({ label, isOpen, onClick, variant = 'primary' }: HubTriggerProps) => (
  <button
    onClick={onClick}
    className={cn(
      'flex items-center gap-1 px-2.5 py-1.5 rounded text-[14px] font-normal transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[#5B5CE6]',
      isOpen && variant === 'primary' && 'bg-[#0011FF0F] text-[#2E1E71]',
      !isOpen && variant === 'primary' && 'text-gray-11 hover:bg-[#0011FF0F] hover:text-[#2E1E71]',
      variant === 'secondary' && (isOpen ? 'bg-gray-12 text-white' : 'text-gray-11 hover:bg-[#0011FF0F] hover:text-[#2E1E71]'),
      variant === 'ghost' && (isOpen ? 'bg-gray-3 text-gray-12' : 'text-gray-10 hover:bg-[#0011FF0F] hover:text-[#2E1E71]'),
    )}
  >
    {label}
    <ChevronDown
      size={13}
      className={cn('transition-transform duration-200 opacity-60', isOpen && 'rotate-180')}
    />
  </button>
);

// ─── Mega Menu Panel ──────────────────────────────────────────────────────────

interface MegaMenuPanelProps {
  hub: Hub;
  isOpen: boolean;
  onClose: () => void;
}

export const MegaMenuPanel = ({ hub, isOpen, onClose }: MegaMenuPanelProps) => {
  const [hovered, setHovered] = useState<string | null>(null);
  const showIcons = useContext(ShowIconsContext);
  const showDescriptions = useContext(ShowDescriptionsContext);

  if (!isOpen) return null;

  return (
    <div className={cn('absolute top-full left-0 mt-1.5 bg-white rounded-lg shadow-xl border border-gray-5 z-50 py-2 animate-in fade-in slide-in-from-top-1 duration-150', showIcons && showDescriptions ? 'w-[260px]' : (showIcons || showDescriptions) ? 'w-[240px]' : 'w-[200px]')}>
      <div className="flex flex-col gap-0.5 px-2">
        {hub.items.map((item) => {
          const Icon = item.icon;
          const isHov = hovered === item.label;
          return (
            <div key={item.label}>
              <button
                className={cn(
                  'flex items-center px-2 py-2 text-left transition-colors w-full rounded',
                  showIcons ? 'gap-2.5' : 'gap-0',
                  isHov ? 'bg-[#0011FF0F]' : 'hover:bg-[#0011FF0F]',
                )}
                onMouseEnter={() => setHovered(item.label)}
                onMouseLeave={() => setHovered(null)}
                onClick={onClose}
              >
                {showIcons && (
                  <div
                    className={cn(
                      'flex-shrink-0 rounded-md flex items-center justify-center transition-colors',
                      showDescriptions ? 'w-8 h-8' : 'w-6 h-6',
                      isHov ? 'bg-[#0011FF0F] text-[#2E1E71]' : 'bg-gray-3 text-gray-10',
                    )}
                  >
                    <Icon size={showDescriptions ? 15 : 13} />
                  </div>
                )}
                <div className="flex flex-col min-w-0">
                  <span className={cn('text-[13px] font-medium', isHov ? 'text-[#2E1E71]' : 'text-gray-12')}>
                    {item.label}
                  </span>
                  {showDescriptions && item.description && (
                    <span className={cn('text-[11px] leading-tight', isHov ? 'text-[#5B67A8]' : 'text-gray-9')}>
                      {item.description}
                    </span>
                  )}
                </div>
              </button>
              {item.children && (
                <div className={cn('flex mt-0.5 mb-1', showIcons && showDescriptions ? 'ml-[26px] gap-[15px]' : 'ml-[22px] gap-[11px]')}>
                  <div className="w-px bg-gray-4 rounded-full shrink-0" />
                  <div className="flex flex-col gap-0.5 flex-1 pr-1">
                    {item.children.map((child) => {
                      const isChildHov = hovered === child.label;
                      return (
                        <button
                          key={child.label}
                          className={cn(
                            'px-2 py-1.5 text-left text-[13px] transition-colors w-full rounded',
                            isChildHov ? 'bg-[#0011FF0F] text-[#2E1E71]' : 'text-[#5B6579] hover:bg-[#0011FF0F] hover:text-[#2E1E71]',
                          )}
                          onMouseEnter={() => setHovered(child.label)}
                          onMouseLeave={() => setHovered(null)}
                          onClick={onClose}
                        >
                          <div className="flex flex-col min-w-0">
                            <span className={cn('text-[13px]', isChildHov ? 'text-[#2E1E71]' : 'text-[#5B6579]')}>
                              {child.label}
                            </span>
                            {showDescriptions && child.description && (
                              <span className={cn('text-[11px] leading-tight', isChildHov ? 'text-[#5B67A8]' : 'text-gray-9')}>
                                {child.description}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Account Picker ───────────────────────────────────────────────────────────

const ACCOUNTS = [
  { name: 'Acme Corp', role: 'admin' },
  { name: 'Meridian Labs', role: 'manager' },
  { name: 'Sandbox Dev', role: 'manager' },
  { name: 'Vertex AI Team', role: 'member' },
  { name: 'Staging', role: 'member' },
];

interface AccountPickerProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  defaultName?: string;
}

export const AccountPicker = ({ isOpen, onToggle, onClose, defaultName = 'Acme Corp' }: AccountPickerProps) => {
  const [query, setQuery] = useState('');
  const filtered = ACCOUNTS.filter((a) => a.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={cn(
          'flex items-center gap-1 px-2.5 py-1.5 rounded text-[14px] font-normal transition-colors',
          isOpen ? 'bg-[#0011FF0F] text-[#2E1E71]' : 'text-gray-11 hover:bg-[#0011FF0F] hover:text-[#2E1E71]',
        )}
      >
        {defaultName}
        <ChevronDown size={12} className={cn('transition-transform duration-200', isOpen && 'rotate-180')} />
      </button>
      {isOpen && (
        <div className="absolute top-full right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-gray-5 z-50 w-[220px] animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="p-2">
            <div className="flex items-center gap-2 px-2.5 h-8 rounded-lg border border-[#c5cfe4] bg-white">
              <Search size={13} className="text-[#8a9bb8] shrink-0" />
              <input
                autoFocus
                type="text"
                placeholder="Search accounts..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent text-[13px] text-gray-12 placeholder:text-[#8a9bb8] outline-none"
              />
            </div>
          </div>
          <div className="flex flex-col px-2 pb-2">
            {filtered.map((account) => (
              <button
                key={account.name}
                className="flex items-center justify-between px-2 py-2 text-left hover:bg-[#0011FF0F] hover:text-[#2E1E71] transition-colors group w-full rounded"
                onClick={onClose}
              >
                <span className="text-[13px] font-medium text-gray-12 group-hover:text-[#2E1E71]">{account.name}</span>
                <span className="text-[12px] text-gray-9 group-hover:text-[#5B67A8]">{account.role}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-2 py-2 text-[13px] text-gray-9">No accounts found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Hub Trigger Group ────────────────────────────────────────────────────────

interface HubGroupProps {
  openMenu: string | null;
  toggle: (id: string) => void;
  close: () => void;
  hubs?: Hub[];
}

export const HubGroup = ({ openMenu, toggle, close, hubs: hubList = HUBS }: HubGroupProps) => (
  <>
    {hubList.map((hub) => (
      <div key={hub.id} className="relative">
        <HubTrigger label={hub.label} isOpen={openMenu === hub.id} onClick={() => toggle(hub.id)} />
        <MegaMenuPanel hub={hub} isOpen={openMenu === hub.id} onClose={close} />
      </div>
    ))}
  </>
);

// ─── App Switcher ─────────────────────────────────────────────────────────────

const AppSwitcherMenu = ({ onClose }: { onClose: () => void }) => (
  <div className="flex flex-col px-2 pb-2">
    {MICRO_APPS.map((app) => (
      <button
        key={app.label}
        className="px-2 py-2 text-left text-[13px] font-medium text-gray-12 hover:bg-[#0011FF0F] hover:text-[#2E1E71] transition-colors w-full rounded"
        onClick={onClose}
      >
        {app.sublabel}
      </button>
    ))}
  </div>
);

// ─── User Avatar Dropdown ─────────────────────────────────────────────────────

const UserAvatarDropdown = ({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) => (
  <div className="relative">
    <button
      onClick={onToggle}
      className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center text-[16px] font-medium transition-all ring-2',
        isOpen ? 'ring-[#5B5CE6]' : 'ring-transparent hover:ring-gray-6',
      )}
      style={{ background: BRAND_LIGHT, color: BRAND }}
    >
      C
    </button>
    {isOpen && (
      <div className="absolute top-full right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-gray-5 z-50 w-[240px] py-1 animate-in fade-in slide-in-from-top-1 duration-150">
        <div className="px-3 py-2.5">
          <p className="text-[13px] font-medium text-gray-12">Cesar Neri</p>
          <p className="text-[12px] text-gray-9">cesar.neri@acme.com</p>
        </div>
        <Separator.Root className="h-px bg-gray-4 mx-2" />
        <div className="py-1 px-1">
          <button className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-left hover:bg-gray-2 transition-colors">
            <div className="w-7 h-7 rounded-md bg-gray-3 flex items-center justify-center text-gray-10">
              <KeyRound size={14} />
            </div>
            <span className="text-[13px] text-gray-11">Access Management</span>
          </button>
          <button className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-left hover:bg-gray-2 transition-colors">
            <div className="w-7 h-7 rounded-md bg-gray-3 flex items-center justify-center text-gray-10">
              <BookOpen size={14} />
            </div>
            <span className="text-[13px] text-gray-11">Documentation</span>
          </button>
          <button className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-left hover:bg-gray-2 transition-colors">
            <div className="w-7 h-7 rounded-md bg-gray-3 flex items-center justify-center text-gray-10">
              <Settings size={14} />
            </div>
            <span className="text-[13px] text-gray-11">Account Settings</span>
          </button>
        </div>
        <Separator.Root className="h-px bg-gray-4 mx-2" />
        <div className="py-1 px-1">
          <button className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-left hover:bg-gray-2 transition-colors">
            <div className="w-7 h-7 rounded-md bg-gray-3 flex items-center justify-center text-gray-10">
              <LogOut size={14} />
            </div>
            <span className="text-[13px] text-gray-11">Sign Out</span>
          </button>
        </div>
      </div>
    )}
  </div>
);

// ─── NavV3 — main exported nav component ─────────────────────────────────────

interface NavV3Props {
  appPickerInBranding?: boolean;
  hubs?: Hub[];
  accountName?: string;
}

export const NavV3 = ({ appPickerInBranding = false, hubs, accountName }: NavV3Props) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClick(ref, () => setOpenMenu(null));
  const toggle = (id: string) => setOpenMenu((p) => (p === id ? null : id));

  const appSwitcherDropdownContent = (
    <div className="absolute top-full left-0 mt-1.5 bg-white rounded-xl shadow-xl border border-gray-5 z-50 py-2 w-[220px] animate-in fade-in slide-in-from-top-1 duration-150">
      <div className="flex items-center justify-between px-3 pb-1.5">
        <span className="text-[13px] font-medium text-gray-11">Applications</span>
        <span className="text-[11px] text-gray-9">2 available</span>
      </div>
      <AppSwitcherMenu onClose={() => setOpenMenu(null)} />
    </div>
  );

  return (
    <div ref={ref} className="relative">
      <NavShell
        brandPicker={appPickerInBranding ? {
          isOpen: openMenu === 'appswitcher',
          onToggle: () => toggle('appswitcher'),
          dropdownContent: appSwitcherDropdownContent,
        } : undefined}
        rightSlot={
          <>
            {!appPickerInBranding && (
              <div className="relative">
                <button
                  onClick={() => toggle('appswitcher')}
                  title="App Switcher"
                  className={cn(
                    'w-8 h-8 flex items-center justify-center rounded transition-colors',
                    openMenu === 'appswitcher'
                      ? 'bg-[#0011FF0F] text-[#2E1E71]'
                      : 'text-gray-9 hover:bg-[#0011FF0F] hover:text-[#2E1E71]',
                  )}
                >
                  <LayoutGrid size={15} />
                </button>
                {openMenu === 'appswitcher' && (
                  <div className="absolute top-full right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-gray-5 z-50 py-2 w-[220px] animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="flex items-center justify-between px-3 pb-1.5">
                      <span className="text-[13px] font-medium text-gray-11">Applications</span>
                      <span className="text-[11px] text-gray-9">2 available</span>
                    </div>
                    <AppSwitcherMenu onClose={() => setOpenMenu(null)} />
                  </div>
                )}
              </div>
            )}
            <AccountPicker
              isOpen={openMenu === 'account'}
              onToggle={() => toggle('account')}
              onClose={() => setOpenMenu(null)}
              defaultName={accountName}
            />
            <UserAvatarDropdown
              isOpen={openMenu === 'avatar'}
              onToggle={() => toggle('avatar')}
            />
          </>
        }
      >
        <HubGroup openMenu={openMenu} toggle={toggle} close={() => setOpenMenu(null)} hubs={hubs} />
      </NavShell>
    </div>
  );
};
