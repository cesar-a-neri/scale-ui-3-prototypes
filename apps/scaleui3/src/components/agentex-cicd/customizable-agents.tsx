'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Save, X, Clock,
  Lock, Shield, Terminal, Zap, Bot,
  BookOpen, Cpu, Plug, RotateCcw, Send,
  Copy, MessagesSquare, SquarePen, MoreHorizontal, Search,
  PanelLeftClose, PanelLeftOpen, Pencil, Trash2, SlidersHorizontal, PanelLeft, ArrowUp, Box, ChevronDown,
  Heading1, Heading2, Heading3, Bold, Italic, List, ListOrdered, Code, Quote, Minus, Table, ChevronDown as ChevronDownSm,
  Maximize2, ArrowLeft, Check, CalendarClock, TriangleAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScheduledTasks, type ScheduledVariant, type ScheduleFormError } from './scheduled-tasks';

// ─── Design tokens ────────────────────────────────────────────────────────────

const ACCENT       = 'var(--proto-accent)';
const ACCENT_TINT  = 'var(--proto-accent-tint)';
const ACCENT_MUTED = 'var(--proto-accent-muted)';
const ACCENT_TEXT  = 'var(--proto-accent-text)';
const ACCENT_SOFT  = 'var(--proto-accent-soft)';

// ─── Shared data ──────────────────────────────────────────────────────────────

const THREADS = [
  { id: 't1', title: 'Enterprise AI trends 2025', preview: 'What are the top enterprise AI trends…', date: 'Today', messages: 3, active: true },
  { id: 'st1', title: 'Daily Granola summary', preview: 'Check today\'s Granola notes and send…', date: 'Today, 5:00 PM', messages: 4, active: false, scheduled: true },
  { id: 't2', title: 'Competitor analysis: OpenAI vs Anthropic', preview: 'Summarize the key differences between…', date: 'Yesterday', messages: 7, active: false },
  { id: 'st2', title: 'Morning PR status', preview: 'Summarize open pull requests that need…', date: 'Today, 9:00 AM', messages: 6, active: false, scheduled: true },
  { id: 't3', title: 'Market sizing for agentic platforms', preview: 'What\'s the estimated TAM for enterprise…', date: 'Jun 23', messages: 12, active: false },
  { id: 'st3', title: 'Hourly support triage', preview: 'Classify new support tickets by severity…', date: '22 min ago', messages: 3, active: false, scheduled: true },
  { id: 't4', title: 'Regulatory landscape for AI in EU', preview: 'What compliance requirements apply to…', date: 'Jun 21', messages: 5, active: false },
  { id: 't5', title: 'Integration options with Salesforce', preview: 'How can we connect to Salesforce CRM…', date: 'Jun 20', messages: 9, active: false },
];

interface MockAgent {
  id: string;
  name: string;
  description: string;
  status: 'deployed' | 'ready' | 'inactive';
  lastModified: string;
}

export const MOCK_AGENTS: MockAgent[] = [
  { id: 'research', name: 'Research Assistant', description: 'Surfaces accurate, well-sourced information for enterprise teams.', status: 'deployed', lastModified: 'Jun 20, 2025' },
  { id: 'code', name: 'Code Reviewer', description: 'Reviews pull requests and suggests improvements.', status: 'deployed', lastModified: 'Jun 15, 2025' },
  { id: 'sales', name: 'Sales Enablement', description: 'Prepares briefs and talking points for customer meetings.', status: 'ready', lastModified: 'Jun 10, 2025' },
  { id: 'data', name: 'Data Analyst', description: 'Queries datasets and surfaces trends in plain language.', status: 'ready', lastModified: 'May 28, 2025' },
  { id: 'support', name: 'Support Triage', description: 'Classifies and routes incoming support tickets.', status: 'inactive', lastModified: 'May 15, 2025' },
];

const INITIAL_AGENT_NAME = 'Research Assistant';
const INITIAL_AGENT_DESCRIPTION = 'Surfaces accurate, well-sourced information for enterprise teams.';

const INITIAL_INSTRUCTIONS = `## Role

You are a **research assistant** for enterprise teams. Your goal is to surface *accurate, well-sourced* information quickly.

## Behavior

1. Search for relevant, authoritative sources
2. Cite all primary sources inline
3. Ask clarifying questions when scope is ambiguous
4. Summarize findings in clear, non-technical language
5. Flag conflicting or uncertain information prominently

## Output Format

- Use **bold** for key terms and findings
- Use \`inline code\` for technical identifiers, model names, or API references
- Keep responses concise — lead with the answer, follow with supporting detail

## Constraints

> Do not speculate beyond available sources. If evidence is insufficient, say so explicitly.`;

const MODELS = [
  { id: 'claude-opus-4', label: 'Claude Opus 4.8', provider: 'Anthropic', badge: 'Most Capable' },
  { id: 'claude-sonnet-4', label: 'Claude Sonnet 4.6', provider: 'Anthropic', badge: 'Balanced' },
  { id: 'gpt-4o', label: 'GPT-4o', provider: 'OpenAI', badge: '' },
  { id: 'gemini-pro', label: 'Gemini 2.0 Pro', provider: 'Google', badge: '' },
];

export const IntegrationLogo = ({ id, size = 20 }: { id: string; size?: number }) => {
  if (id === 'slack') return (
    <svg width={size} height={size} viewBox="0 0 127 127" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M27.2 80c0 7.3-5.9 13.2-13.2 13.2C6.7 93.2.8 87.3.8 80c0-7.3 5.9-13.2 13.2-13.2h13.2V80zm6.6 0c0-7.3 5.9-13.2 13.2-13.2 7.3 0 13.2 5.9 13.2 13.2v33c0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V80z" fill="#E01E5A"/>
      <path d="M47 27c-7.3 0-13.2-5.9-13.2-13.2C33.8 6.5 39.7.6 47 .6c7.3 0 13.2 5.9 13.2 13.2V27H47zm0 6.7c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H13.9C6.6 60.1.7 54.2.7 46.9c0-7.3 5.9-13.2 13.2-13.2H47z" fill="#36C5F0"/>
      <path d="M99.9 46.9c0-7.3 5.9-13.2 13.2-13.2 7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H99.9V46.9zm-6.6 0c0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V13.8C66.9 6.5 72.8.6 80.1.6c7.3 0 13.2 5.9 13.2 13.2v33.1z" fill="#2EB67D"/>
      <path d="M80.1 99.8c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V99.8h13.2zm0-6.6c-7.3 0-13.2-5.9-13.2-13.2 0-7.3 5.9-13.2 13.2-13.2h33.1c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H80.1z" fill="#ECB22E"/>
    </svg>
  );
  if (id === 'github') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style={{ color: '#24292f' }}>
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
    </svg>
  );
  if (id === 'notion') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style={{ color: '#000' }}>
      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.934zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z"/>
    </svg>
  );
  if (id === 'linear') return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1.22541 61.5228c-.2225-.9485.90748-1.5459 1.59638-.857L39.3342 97.1782c.6889.6889.0915 1.8189-.857 1.5964C20.0515 94.4522 5.54779 79.9485 1.22541 61.5228ZM.00189135 46.8891c-.01764375.2833.08887215.5599.28957165.7606L52.3503 99.7085c.2007.2007.4773.3075.7606.2896 2.3692-.1476 4.6938-.46 6.9624-.9259.7645-.157 1.0301-1.0963.4782-1.6481L2.57595 39.4485c-.55186-.5519-1.49117-.2863-1.648174.4782-.465915 2.2686-.77832 4.5932-.92588465 6.9624ZM4.21093 29.7054c-.16649.3738-.08169.8106.20765 1.1l64.77602 64.776c.2894.2894.7262.3742 1.1.2077 1.7861-.7956 3.5171-1.6927 5.1855-2.684.5521-.328.6373-1.0867.1832-1.5407L8.43566 24.3367c-.45409-.4541-1.21271-.3689-1.54074.1832-.99132 1.6684-1.88843 3.3994-2.68399 5.1855ZM12.6587 18.074c-.3701-.3701-.393-.9637-.0443-1.3541C21.7795 6.45931 35.1114 0 49.9519 0 77.5927 0 100 22.4073 100 50.0481c0 14.8405-6.4593 28.1724-16.7199 37.3375-.3903.3487-.984.3258-1.3542-.0443L12.6587 18.074Z" fill="#222326"/>
    </svg>
  );
  if (id === 'granola') return (
    <svg width={size} height={size} viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="1024" height="1024" fill="#B2C248"/>
      <path d="M507.994 878.011C583.909 878.011 663.473 861.194 695.521 837.872C715.987 823.276 726.141 824.704 744.386 807.252C749.463 802.175 751.684 800.668 753.112 799.24C822.443 742.284 862.582 668.59 862.582 573.002C862.582 417.523 752.398 311.701 594.777 311.701C456.115 311.701 350.294 399.991 350.294 513.111C350.294 615.997 430.572 689.691 545.119 689.691C551.703 689.691 554.638 686.042 561.936 686.042C589.7 686.042 612.308 678.03 626.904 662.72C634.202 654.708 648.084 638.605 649.512 637.891C656.096 632.021 657.524 623.295 659.031 619.646C660.459 615.997 663.394 613.776 664.901 608.699C666.329 602.829 664.187 595.531 664.187 589.026C664.187 577.365 669.264 565.704 669.264 554.757C669.264 524.137 632.774 493.438 599.933 493.438C596.284 493.438 596.284 490.503 594.063 490.503C591.842 490.503 589.7 492.724 587.479 492.724C585.258 492.724 582.402 489.075 579.467 489.075C576.532 489.075 575.104 492.01 570.741 492.01C561.222 492.01 560.508 493.438 553.21 493.438C550.989 493.438 547.34 494.152 545.912 494.866C542.977 496.293 542.977 498.515 540.042 498.515C536.128 498.515 534.172 499.255 534.172 500.736C534.172 508.748 534.886 507.32 531.237 507.32C527.323 507.32 524.891 507.558 523.939 508.034C521.004 509.462 523.225 513.111 520.29 515.332C517.355 516.76 516.641 518.981 515.927 523.344C515.213 527.707 510.85 529.214 510.85 533.577C510.85 535.798 511.564 537.226 511.564 538.654C511.564 543.017 502.838 541.589 502.838 545.952C502.838 548.887 505.059 551.029 505.059 553.964C505.059 556.185 503.631 557.613 503.631 559.834C503.631 562.055 505.059 563.483 505.059 564.911C505.059 568.56 499.982 569.274 499.982 572.209C499.982 575.144 502.917 577.286 502.917 579.507C502.917 580.935 500.696 581.728 500.696 583.87C500.696 586.011 499.982 582.442 504.345 588.946C507.28 593.309 507.28 595.531 504.345 599.18C501.41 602.829 495.619 605.05 488.321 605.05C457.701 605.05 454.052 573.637 437.235 568.56C432.158 567.132 431.365 566.339 431.365 564.197C431.365 562.055 431.365 562.769 434.3 559.834C437.235 556.899 437.949 554.757 437.949 552.536C437.949 550.315 437.949 549.601 436.521 548.173C430.651 538.654 427.795 526.993 427.795 513.904C427.795 446.794 509.501 390.552 586.924 390.552C610.246 390.552 606.597 396.422 620.479 396.422C624.128 396.422 622.7 396.422 627.777 395.708C640.945 393.487 664.981 398.643 683.94 408.083C736.453 434.34 770.802 496.373 770.802 568.639C770.802 691.991 661.332 781.709 515.371 781.709C435.807 781.709 381.072 756.88 327.051 696.354C321.181 689.77 329.986 697.782 320.467 681.044C308.806 660.578 310.234 673.746 310.234 673.746C306.585 669.383 300.001 656.929 296.352 652.566C291.989 647.489 286.119 648.203 283.977 645.268C281.042 641.619 285.405 635.035 283.977 631.386C282.549 625.516 270.095 616.79 268.667 612.427C267.239 608.064 262.083 580.3 262.083 575.223C262.083 569.353 266.446 568.639 266.446 564.99C266.446 559.913 259.862 558.406 256.213 551.108C252.564 543.81 250.343 526.993 250.343 508.748C250.343 499.229 250.343 495.58 253.278 473.686C253.992 466.387 264.939 466.387 264.939 458.376C264.939 455.44 263.511 451.791 263.511 449.65C263.511 446.715 263.511 446.001 264.225 443.78C294.845 315.35 432.079 219.762 584.623 219.762C637.137 219.762 677.276 229.282 739.309 255.539C759.775 264.264 789.681 248.954 789.681 232.931C791.109 227.854 788.253 226.346 787.46 223.411C786.746 220.476 783.811 216.827 780.876 216.113C779.448 215.399 778.655 213.178 777.227 211.037C775.006 207.388 772.864 205.96 766.994 204.452C764.059 203.739 762.631 203.025 761.124 201.517C758.903 198.582 757.475 197.154 754.54 195.647C751.605 194.219 749.463 195.647 747.956 194.933C746.528 194.219 745.735 192.712 744.307 191.998C743.593 191.284 742.086 191.284 739.944 191.284C666.329 151.859 618.178 145.989 554.003 145.989C415.341 145.989 291.275 205.88 214.646 310.194C208.062 318.92 211.711 333.516 202.271 342.321C184.026 359.139 161.418 451.078 161.418 509.462C161.418 558.327 173.079 623.295 188.389 659.071C218.295 729.116 205.206 699.924 209.569 706.508C218.295 720.39 225.593 721.818 229.242 726.181C229.242 726.181 231.463 730.544 231.463 734.907C231.463 737.842 231.463 738.556 232.177 739.984C234.398 744.346 244.552 751.644 247.487 754.58C254.071 761.164 259.148 775.046 270.095 785.993C286.912 802.81 310.948 815.899 387.577 851.675C414.548 864.05 399.238 857.545 402.173 858.259C408.757 860.48 417.483 860.48 422.639 864.129C425.574 866.35 421.925 865.557 429.937 865.557C431.365 865.557 431.365 866.271 432.872 866.985C434.3 867.699 435.807 869.92 437.949 869.92C439.377 869.92 440.17 868.492 442.312 869.206C444.454 869.92 449.61 873.569 453.973 875.79C457.622 878.011 458.336 878.011 459.843 876.504C464.206 873.569 467.141 877.218 471.504 877.218C472.932 877.218 475.153 876.504 479.516 876.504C485.386 876.504 485.386 877.932 507.994 877.932" fill="#1E1E1E"/>
    </svg>
  );
  if (id === 'confluence') return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2.24 22.91c-.28.44-.6.95-.85 1.32a.82.82 0 0 0 .27 1.14l5.24 3.16a.82.82 0 0 0 1.13-.28c.22-.37.52-.85.84-1.37 2.24-3.56 4.5-3.13 8.57-.98l5.17 2.54a.82.82 0 0 0 1.08-.4l2.41-5.56a.82.82 0 0 0-.4-1.08c-1.7-.83-5.1-2.5-7.18-3.55-6.52-3.28-11.83-2.77-16.28 4.06z" fill="#2684FF"/>
      <path d="M29.76 9.09c.28-.44.6-.95.85-1.32a.82.82 0 0 0-.27-1.14L25.1 4.47a.82.82 0 0 0-1.13.28c-.22.37-.52.85-.84 1.37-2.24 3.56-4.5 3.13-8.57.98L9.39 4.56a.82.82 0 0 0-1.08.4L5.9 10.52a.82.82 0 0 0 .4 1.08c1.7.83 5.1 2.5 7.18 3.55 6.55 3.3 11.86 2.79 16.28-4.06z" fill="#2684FF"/>
    </svg>
  );
  return <span className="text-[14px]">🔗</span>;
};

export const INTEGRATIONS = [
  { id: 'slack', label: 'Slack', desc: 'Send messages and monitor channels from your workspace' },
  { id: 'github', label: 'GitHub', desc: 'Read repos, create issues, and comment on pull requests' },
  { id: 'notion', label: 'Notion', desc: 'Read and write pages and databases in your workspace' },
  { id: 'linear', label: 'Linear', desc: 'Create, update, and assign issues across your teams' },
  { id: 'granola', label: 'Granola', desc: 'Summarize meetings and surface action items automatically' },
  { id: 'confluence', label: 'Confluence', desc: 'Read and contribute to pages in your wiki' },
];

const INTEGRATION_PERMISSION_LEVELS: Record<string, { id: string; label: string }[]> = {
  slack: [
    { id: 'read', label: 'Read messages only' },
    { id: 'write', label: 'Read + Post messages' },
    { id: 'manage', label: 'Read, post + manage channels' },
    { id: 'full', label: 'Full access' },
  ],
  github: [
    { id: 'read', label: 'Read repositories only' },
    { id: 'issues', label: 'Read + Create & comment on issues' },
    { id: 'write', label: 'Read, issues + push commits' },
    { id: 'full', label: 'Full access' },
  ],
  notion: [
    { id: 'read', label: 'Read pages only' },
    { id: 'write', label: 'Read + Create & edit pages' },
    { id: 'full', label: 'Full access (incl. databases)' },
  ],
  linear: [
    { id: 'read', label: 'Read issues only' },
    { id: 'comment', label: 'Read + Comment on issues' },
    { id: 'write', label: 'Read, comment + create & update' },
    { id: 'full', label: 'Full access' },
  ],
  granola: [
    { id: 'read', label: 'Read meeting notes only' },
    { id: 'write', label: 'Read + Create summaries' },
    { id: 'full', label: 'Full access' },
  ],
  confluence: [
    { id: 'read', label: 'Read pages only' },
    { id: 'comment', label: 'Read + Add comments' },
    { id: 'write', label: 'Read, comment + create & edit' },
    { id: 'full', label: 'Full access' },
  ],
};

const VERSIONS = [
  { id: 'v3', label: 'v3', date: 'Jun 20, 2025', author: 'Cesar N.', summary: 'Added web search integration', current: true },
  { id: 'v2', label: 'v2', date: 'Jun 15, 2025', author: 'Cesar N.', summary: 'Refined citation format', current: false },
  { id: 'v1', label: 'v1', date: 'Jun 10, 2025', author: 'Cesar N.', summary: 'Initial configuration', current: false },
];

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool' | 'error';
  content?: string;
  name?: string;
  query?: string;
  result?: string;
}

const MOCK_MESSAGES: ChatMessage[] = [
  { id: '1', role: 'user', content: 'What are the top enterprise AI trends for 2025?' },
  { id: '2', role: 'tool', name: 'Sandbox created', query: '15 tools', result: 'Worked for 2m 4s' },
  { id: '3', role: 'assistant', content: 'Based on my research across 8 sources, here are the dominant enterprise AI trends for 2025:\n\n**1. Agentic AI Systems** — Organizations are moving beyond chatbots to fully autonomous agents that complete multi-step tasks with minimal oversight.\n\n**2. AI Governance Frameworks** — Legal and compliance teams are establishing internal AI usage policies.\n\n**3. Domain-Specific Models** — Vertical AI tailored to healthcare, legal, and finance is outperforming general models in specialized tasks.\n\nWould you like me to expand on any of these?' },
];

const MOCK_MESSAGES_T2: ChatMessage[] = [
  { id: '1', role: 'user', content: 'Summarize the key differences between OpenAI and Anthropic as enterprise AI providers.' },
  { id: '2', role: 'tool', name: 'Sandbox created', query: '22 tools', result: 'Worked for 3m 17s' },
  { id: '3', role: 'assistant', content: 'Here\'s a comparative analysis of OpenAI and Anthropic for enterprise use:\n\n**Safety & Alignment**\n- **Anthropic** is founded on Constitutional AI principles, with a strong emphasis on safety research and interpretability. Claude models are designed to be helpful, harmless, and honest.\n- **OpenAI** has a broader product focus, with GPT-4o optimized heavily for capability and speed.\n\n**Enterprise Offerings**\n- **OpenAI** offers ChatGPT Enterprise, Azure OpenAI Service, and a broad API ecosystem with wide ISV adoption.\n- **Anthropic** provides Claude via API and AWS Bedrock, with growing enterprise traction particularly in regulated industries.\n\n**Context Window**\n- Both providers offer 200k+ token context windows in their flagship models as of 2025.\n\n**Pricing**\n- Anthropic\'s Claude Sonnet sits at a similar price point to GPT-4o for input/output tokens, with Haiku offering a cheaper tier for high-volume tasks.\n\nWant me to pull recent analyst reports comparing customer satisfaction scores?' },
  { id: '4', role: 'user', content: 'Yes, and include any publicly available retention or NPS data if you can find it.' },
  { id: '5', role: 'tool', name: 'Sandbox created', query: '9 tools', result: 'Worked for 1m 42s' },
  { id: '6', role: 'assistant', content: 'I found limited public NPS data, but here\'s what\'s available:\n\n- **G2 ratings (Q1 2025):** Claude scores 4.7/5 across 1,200+ reviews; ChatGPT Enterprise scores 4.5/5 across 3,400+ reviews.\n- **Redpoint Future of AI survey (2024):** 68% of enterprise buyers reported Anthropic as their "preferred safety-first vendor" vs. 41% for OpenAI in regulated sectors.\n- No verified public NPS figures from either company as of this research.\n\nI\'d recommend requesting analyst access to Forrester\'s 2025 AI Platform Wave for deeper retention benchmarks.' },
];

const MOCK_MESSAGES_T3: ChatMessage[] = [
  { id: '1', role: 'user', content: 'What\'s the estimated TAM for enterprise agentic AI platforms in 2025–2028?' },
  { id: '2', role: 'tool', name: 'Sandbox created', query: '18 tools', result: 'Worked for 2m 55s' },
  { id: '3', role: 'assistant', content: 'Here\'s the market sizing landscape for enterprise agentic AI platforms:\n\n**Total Addressable Market (TAM)**\n- IDC projects the agentic AI software market will reach **$47B by 2027**, growing at a CAGR of ~43%.\n- Gartner estimates that by 2028, **33% of enterprise software applications** will include agentic AI capabilities, up from less than 1% in 2024.\n\n**Key Segments**\n| Segment | 2025 Est. | 2028 Est. |\n|---|---|---|\n| AI agent platforms | $4.2B | $18.7B |\n| Orchestration & tooling | $1.8B | $9.1B |\n| Vertical agent apps | $2.9B | $19.2B |\n\n**Top Verticals by Spend**\n1. Financial services (compliance automation, research)\n2. Healthcare (clinical decision support, admin workflows)\n3. Legal & professional services\n\nShould I break down competitive landscape by platform vendor?' },
];

const MOCK_MESSAGES_T4: ChatMessage[] = [
  { id: '1', role: 'user', content: 'What compliance requirements apply to AI agents under the EU AI Act?' },
  { id: '2', role: 'tool', name: 'Sandbox created', query: '11 tools', result: 'Worked for 1m 58s' },
  { id: '3', role: 'assistant', content: 'The EU AI Act (effective August 2024, enforcement phased through 2026) creates several compliance obligations relevant to AI agents:\n\n**Risk Classification**\n- Autonomous agents performing consequential decisions (credit, hiring, benefits) are likely classified as **High-Risk** under Annex III.\n- General-purpose AI models (GPAIs) with >10^25 FLOPs training compute face additional systemic risk obligations.\n\n**Key Requirements for High-Risk Agents**\n- Human oversight mechanisms must be technically feasible at all times\n- Detailed logging of agent decisions for auditability\n- Conformity assessments before deployment\n- Registration in the EU AI database\n\n**Timeline**\n- **Feb 2025:** Prohibited AI practices banned\n- **Aug 2025:** GPAI model obligations apply\n- **Aug 2026:** Full high-risk system obligations enforced\n\n> This is a summary based on publicly available regulatory text. Consult legal counsel before making compliance decisions.\n\nWould you like a checklist template for internal AI Act readiness assessment?' },
  { id: '4', role: 'user', content: 'Yes, generate a readiness checklist we can use internally.' },
  { id: '5', role: 'tool', name: 'Sandbox created', query: '4 tools', result: 'Worked for 0m 38s' },
  { id: '6', role: 'assistant', content: '**EU AI Act Readiness Checklist — Agentic AI Systems**\n\n**1. Risk Classification**\n- [ ] Identify all AI systems in use and classify by risk tier\n- [ ] Document use cases that touch Annex III categories\n\n**2. Technical Controls**\n- [ ] Implement human-in-the-loop override for high-risk decisions\n- [ ] Enable full audit logging of agent actions and reasoning\n- [ ] Establish data governance for training and inference data\n\n**3. Documentation**\n- [ ] Maintain technical documentation per Article 11\n- [ ] Prepare conformity assessment for high-risk systems\n- [ ] Register systems in EU AI database before Aug 2026\n\n**4. Organizational**\n- [ ] Assign an AI compliance owner\n- [ ] Train relevant staff on AI Act obligations\n- [ ] Establish incident reporting procedures' },
];

const MOCK_MESSAGES_T5: ChatMessage[] = [
  { id: '1', role: 'user', content: 'How can we connect the research agent to Salesforce CRM to pull account context automatically?' },
  { id: '2', role: 'tool', name: 'Sandbox created', query: '8 tools', result: 'Worked for 1m 12s' },
  { id: '3', role: 'assistant', content: 'There are three viable integration paths for connecting the research agent to Salesforce:\n\n**Option 1: Salesforce MCP Server**\nThe most direct path. Anthropic\'s Model Context Protocol supports Salesforce as a connector. The agent can query Account, Opportunity, and Contact objects natively as tools.\n- Pros: No middleware, low latency, supports real-time queries\n- Cons: Requires Salesforce Connected App setup and OAuth configuration\n\n**Option 2: Agentex Salesforce Tool**\nIf running on the Agentex harness, there\'s a pre-built Salesforce tool that wraps the REST API with automatic credential management.\n- Pros: Fastest to deploy, built-in retry logic\n- Cons: Read-only by default; write operations require additional permissions\n\n**Option 3: Zapier / Make.com Middleware**\nFor lighter integrations, a webhook-triggered Zap can push Salesforce context into the agent\'s system prompt on session start.\n- Pros: No-code, easy to maintain\n- Cons: Latency, limited to pre-defined fields\n\n**Recommendation:** Start with Option 2 (Agentex tool) for fastest time-to-value, then migrate to Option 1 once your team is comfortable with MCP configuration.\n\nWant me to draft the setup instructions for the Agentex Salesforce connector?' },
];

// Scheduled-run threads — the "user" turn is the schedule's preset prompt,
// fired automatically rather than typed by a person.
const MOCK_MESSAGES_ST1: ChatMessage[] = [
  { id: '1', role: 'user', content: "Check today's Granola notes, summarize key follow-ups, and send me a Slack DM." },
  { id: '2', role: 'tool', name: 'Sandbox created', query: '6 tools', result: 'Worked for 1m 08s' },
  { id: '3', role: 'assistant', content: "Here's your daily follow-up summary from today's Granola notes (3 meetings):\n\n**Acme Corp — Renewal sync**\n- Send updated pricing proposal by Thursday\n- Loop in legal on the revised MSA terms\n\n**Weekly eng standup**\n- Unblock the data pipeline migration (owner: Priya)\n- Decision needed on Postgres vs. ClickHouse by Friday\n\n**1:1 with Jordan**\n- Share the Q3 roadmap draft for feedback\n\n✅ I've sent this summary to you as a Slack DM. Want me to create calendar reminders for the time-sensitive items?" },
];

const MOCK_MESSAGES_ST2: ChatMessage[] = [
  { id: '1', role: 'user', content: 'Summarize open pull requests that need my review and post the digest to #eng-standup.' },
  { id: '2', role: 'tool', name: 'Sandbox created', query: '5 tools', result: 'Worked for 0m 52s' },
  { id: '3', role: 'assistant', content: "You have **4 pull requests** awaiting your review:\n\n1. **#2841 — Add retry logic to schedule runner** _(feat/retries)_\n   +212 −38 · opened 6h ago by @priya · 2 approvals, waiting on you\n2. **#2839 — Fix timezone drift in cron parser** _(fix/tz-drift)_\n   +47 −12 · opened yesterday by @marcus · CI green\n3. **#2835 — Refactor tool registry** _(chore/registry)_\n   +530 −410 · opened 2d ago by @lena · 1 change requested\n4. **#2830 — Docs: scheduled tasks API** _(docs/scheduling)_\n   +88 −0 · opened 3d ago by @sam\n\n📣 Posted the digest to **#eng-standup**. #2841 has been waiting longest — want me to open it first?" },
];

// A scheduled run that fired and created this task, but the agent errored partway
// through — the only execution failure the user can actually see (it lives in the
// task/chat, same as any normal error).
const MOCK_MESSAGES_ST3: ChatMessage[] = [
  { id: '1', role: 'user', content: 'Classify new support tickets by severity and create Linear issues for anything P0 or P1.' },
  { id: '2', role: 'tool', name: 'Sandbox created', query: '4 tools', result: 'Ran for 0m 41s' },
  { id: '3', role: 'assistant', content: 'Pulled **9 new tickets** and classified them (1 P0, 2 P1, 4 P2, 2 P3). Creating Linear issues for the P0 and P1 items…' },
  { id: '4', role: 'error', content: "**Run failed — Linear returned 401 (Unauthorized).**\n\nThe agent classified the tickets but couldn't create issues: the Linear connection token was rejected, so nothing was written. Reconnect Linear under Configure Agent and the next scheduled run will pick these up." },
];

const ALL_THREAD_MESSAGES: Record<string, ChatMessage[]> = {
  t1: MOCK_MESSAGES,
  st1: MOCK_MESSAGES_ST1,
  t2: MOCK_MESSAGES_T2,
  st2: MOCK_MESSAGES_ST2,
  t3: MOCK_MESSAGES_T3,
  st3: MOCK_MESSAGES_ST3,
  t4: MOCK_MESSAGES_T4,
  t5: MOCK_MESSAGES_T5,
};

// ─── Shared UI atoms ──────────────────────────────────────────────────────────

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[11px] font-semibold tracking-[0.06em] uppercase text-[#818EA9]">{children}</span>
);

const FormLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="text-[13px] font-medium text-[#5B6579]">{children}</label>
);

const inputCls = 'w-full h-9 px-3 rounded-md border border-[#D1DAEB] text-[14px] text-[#19202F] bg-white outline-none focus:border-[#714DFF] focus:ring-2 focus:ring-[#714DFF]/20 transition-colors placeholder:text-[#9CA3AF]';

// ─── Shared config sections ───────────────────────────────────────────────────

const PREVIEW_COMPONENTS = {
  h1: ({ children }: { children?: React.ReactNode }) => <h1 className="text-[17px] font-semibold text-[#19202F] mt-4 mb-1 first:mt-0">{children}</h1>,
  h2: ({ children }: { children?: React.ReactNode }) => <h2 className="text-[15px] font-semibold text-[#19202F] mt-3 mb-1 first:mt-0">{children}</h2>,
  h3: ({ children }: { children?: React.ReactNode }) => <h3 className="text-[13px] font-semibold text-[#19202F] mt-2 mb-0.5 first:mt-0">{children}</h3>,
  p: ({ children }: { children?: React.ReactNode }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }: { children?: React.ReactNode }) => <em className="italic">{children}</em>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc pl-5 mb-2 flex flex-col gap-0.5">{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal pl-5 mb-2 flex flex-col gap-0.5">{children}</ol>,
  li: ({ children }: { children?: React.ReactNode }) => <li>{children}</li>,
  code: ({ children }: { children?: React.ReactNode }) => <code className="px-1 py-0.5 rounded text-[12px] font-mono bg-[#f0f0f3]">{children}</code>,
  pre: ({ children }: { children?: React.ReactNode }) => <pre className="px-3 py-2 rounded-md bg-[#f0f0f3] text-[12px] font-mono overflow-x-auto mb-2">{children}</pre>,
  blockquote: ({ children }: { children?: React.ReactNode }) => <blockquote className="border-l-2 border-[#D1DAEB] pl-3 text-[#818EA9] italic mb-2">{children}</blockquote>,
  hr: () => <hr className="border-[#D1DAEB] my-3" />,
  table: ({ children }: { children?: React.ReactNode }) => <table className="w-full text-[13px] border-collapse mb-2">{children}</table>,
  th: ({ children }: { children?: React.ReactNode }) => <th className="border border-[#D1DAEB] px-2 py-1 text-left font-semibold bg-[#f5f7fa]">{children}</th>,
  td: ({ children }: { children?: React.ReactNode }) => <td className="border border-[#D1DAEB] px-2 py-1">{children}</td>,
};

const SystemInstructions = ({ value, onChange, rows = 9 }: { value: string; onChange: (v: string) => void; rows?: number }) => {
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [headingOpen, setHeadingOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const taExpandedRef = useRef<HTMLTextAreaElement>(null);

  const wrap = (before: string, after: string, placeholder: string) => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = value.slice(start, end) || placeholder;
    const next = value.slice(0, start) + before + sel + after + value.slice(end);
    onChange(next);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, start + before.length + sel.length);
    }, 0);
  };

  const prependLine = (prefix: string) => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const alreadyHas = value.slice(lineStart).startsWith(prefix);
    const next = alreadyHas
      ? value.slice(0, lineStart) + value.slice(lineStart + prefix.length)
      : value.slice(0, lineStart) + prefix + value.slice(lineStart);
    onChange(next);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + (alreadyHas ? -prefix.length : prefix.length), start + (alreadyHas ? -prefix.length : prefix.length)); }, 0);
  };

  const insertBlock = (text: string) => {
    const ta = taRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const before = value.slice(0, pos);
    const after = value.slice(pos);
    const pad = before.length > 0 && !before.endsWith('\n\n') ? (before.endsWith('\n') ? '\n' : '\n\n') : '';
    const next = before + pad + text + (after.startsWith('\n') ? '' : '\n');
    onChange(next);
    setTimeout(() => { ta.focus(); }, 0);
  };

  const headings = [
    { label: 'Heading 1', icon: <Heading1 size={13} />, prefix: '# ' },
    { label: 'Heading 2', icon: <Heading2 size={13} />, prefix: '## ' },
    { label: 'Heading 3', icon: <Heading3 size={13} />, prefix: '### ' },
  ];

  const inlineTools: { icon: React.ReactNode; title: string; action: () => void }[] = [
    { icon: <Bold size={13} />, title: 'Bold', action: () => wrap('**', '**', 'bold text') },
    { icon: <Italic size={13} />, title: 'Italic', action: () => wrap('*', '*', 'italic text') },
  ];

  const blockTools: { icon: React.ReactNode; title: string; action: () => void }[] = [
    { icon: <List size={13} />, title: 'Bullet list', action: () => prependLine('- ') },
    { icon: <ListOrdered size={13} />, title: 'Numbered list', action: () => prependLine('1. ') },
  ];

  const codeTools: { icon: React.ReactNode; title: string; action: () => void }[] = [
    { icon: <Code size={13} />, title: 'Inline code', action: () => wrap('`', '`', 'code') },
    { icon: <Terminal size={13} />, title: 'Code block', action: () => insertBlock('```\ncode here\n```') },
  ];

  const miscTools: { icon: React.ReactNode; title: string; action: () => void }[] = [
    { icon: <Quote size={13} />, title: 'Blockquote', action: () => prependLine('> ') },
    { icon: <Table size={13} />, title: 'Table', action: () => insertBlock('| Column 1 | Column 2 | Column 3 |\n|----------|----------|----------|\n| Cell     | Cell     | Cell     |') },
    { icon: <Minus size={13} />, title: 'Divider', action: () => insertBlock('---') },
  ];

  const toolBtn = (t: { icon: React.ReactNode; title: string; action: () => void }) => (
    <button
      key={t.title}
      type="button"
      title={t.title}
      onMouseDown={e => { e.preventDefault(); t.action(); }}
      className="flex items-center justify-center w-6 h-6 rounded text-[#818EA9] hover:text-[#19202F] hover:bg-[#F0F0F3] transition-colors"
    >
      {t.icon}
    </button>
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <FormLabel>System Instructions</FormLabel>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center p-[2px] rounded-md text-[11px]"
            style={{ border: '1px solid #e9e9eb', background: '#f5f7fa' }}>
            {(['edit', 'preview'] as const).map(m => (
              <button key={m} type="button" onClick={() => setMode(m)}
                className="px-2 h-[20px] rounded transition-all capitalize"
                style={mode === m
                  ? { background: ACCENT_MUTED, color: ACCENT_SOFT, fontWeight: 600 }
                  : { background: 'transparent', color: '#78839c', fontWeight: 400 }}>
                {m}
              </button>
            ))}
          </div>
          <button
            type="button"
            title="Expand editor"
            onMouseDown={e => { e.preventDefault(); setExpanded(true); }}
            className="flex items-center justify-center w-6 h-6 rounded text-[#818EA9] hover:text-[#19202F] hover:bg-[#F0F0F3] transition-colors"
          >
            <Maximize2 size={12} />
          </button>
        </div>
      </div>
      {mode === 'edit' ? (
        <div className="flex flex-col rounded-md border border-[#D1DAEB] overflow-hidden focus-within:border-[#714DFF] focus-within:ring-2 focus-within:ring-[#714DFF]/20 transition-colors">
          {/* Toolbar */}
          <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-[#D1DAEB] bg-[#fafbfc]" style={{ justifyContent: 'space-between' }}>
          <div className="flex items-center gap-0.5">
            {/* Heading dropdown */}
            <div className="relative">
              <button
                type="button"
                title="Heading"
                onMouseDown={e => { e.preventDefault(); setHeadingOpen(o => !o); }}
                className="flex items-center gap-0.5 h-6 px-1.5 rounded text-[#818EA9] hover:text-[#19202F] hover:bg-[#F0F0F3] transition-colors text-[11px] font-medium"
              >
                <Heading2 size={13} />
                <ChevronDownSm size={10} />
              </button>
              {headingOpen && (
                <div className="absolute top-full left-0 mt-1 z-50 rounded-md border border-[#D1DAEB] bg-white shadow-md py-0.5 min-w-[120px]"
                  onMouseLeave={() => setHeadingOpen(false)}>
                  {headings.map(h => (
                    <button
                      key={h.label}
                      type="button"
                      onMouseDown={e => { e.preventDefault(); prependLine(h.prefix); setHeadingOpen(false); }}
                      className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-[#19202F] hover:bg-[#F0F0F3] transition-colors"
                    >
                      {h.icon}
                      {h.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="w-px h-4 mx-1 bg-[#D1DAEB]" />
            {inlineTools.map(toolBtn)}
            <div className="w-px h-4 mx-1 bg-[#D1DAEB]" />
            {blockTools.map(toolBtn)}
            <div className="w-px h-4 mx-1 bg-[#D1DAEB]" />
            {codeTools.map(toolBtn)}
            <div className="w-px h-4 mx-1 bg-[#D1DAEB]" />
            {miscTools.map(toolBtn)}
          </div>
          </div>
          <textarea
            ref={taRef}
            value={value}
            onChange={e => onChange(e.target.value)}
            rows={rows}
            className="w-full px-3 py-2.5 text-[13px] font-mono leading-[1.7] text-[#19202F] bg-white outline-none resize-none"
            placeholder="e.g., You are a research assistant. Cite primary sources and ask clarifying questions when scope is ambiguous."
            spellCheck={false}
          />
        </div>
      ) : (
        <div
          className="w-full px-3 py-2.5 rounded-md border border-[#D1DAEB] text-[13px] leading-[1.7] text-[#19202F] bg-white overflow-y-auto"
          style={{ minHeight: `${rows * 1.7 * 13 + 20}px`, maxHeight: `${(rows * 1.7 * 13 + 20) * 1.3}px` }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={PREVIEW_COMPONENTS as never}>{value || '*No instructions yet.*'}</ReactMarkdown>
        </div>
      )}

      {/* Expanded dialog */}
      {expanded && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-8"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onMouseDown={e => { if (e.target === e.currentTarget) setExpanded(false); }}>
          <div className="flex flex-col bg-white rounded-xl shadow-2xl overflow-hidden"
            style={{ width: '100%', maxWidth: 780, height: '80vh' }}>
            {/* Dialog header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#E8ECF2] shrink-0">
              <span className="text-[14px] font-semibold text-[#19202F]">System Instructions</span>
              <div className="flex items-center gap-2">
                <div className="flex items-center p-[2px] rounded-md text-[11px]"
                  style={{ border: '1px solid #e9e9eb', background: '#f5f7fa' }}>
                  {(['edit', 'preview'] as const).map(m => (
                    <button key={m} type="button" onClick={() => setMode(m)}
                      className="px-2 h-[20px] rounded transition-all capitalize"
                      style={mode === m
                        ? { background: ACCENT_MUTED, color: ACCENT_SOFT, fontWeight: 600 }
                        : { background: 'transparent', color: '#78839c', fontWeight: 400 }}>
                      {m}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => setExpanded(false)}
                  className="flex items-center justify-center w-7 h-7 rounded-md text-[#818EA9] hover:text-[#19202F] hover:bg-[#F0F0F3] transition-colors">
                  <X size={15} />
                </button>
              </div>
            </div>
            {/* Dialog toolbar (edit mode only) */}
            {mode === 'edit' && (
              <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-[#D1DAEB] bg-[#fafbfc] shrink-0">
                <div className="relative">
                  <button type="button" title="Heading"
                    onMouseDown={e => { e.preventDefault(); setHeadingOpen(o => !o); }}
                    className="flex items-center gap-0.5 h-6 px-1.5 rounded text-[#818EA9] hover:text-[#19202F] hover:bg-[#F0F0F3] transition-colors text-[11px] font-medium">
                    <Heading2 size={13} /><ChevronDownSm size={10} />
                  </button>
                  {headingOpen && (
                    <div className="absolute top-full left-0 mt-1 z-50 rounded-md border border-[#D1DAEB] bg-white shadow-md py-0.5 min-w-[120px]"
                      onMouseLeave={() => setHeadingOpen(false)}>
                      {headings.map(h => (
                        <button key={h.label} type="button"
                          onMouseDown={e => { e.preventDefault(); prependLine(h.prefix); setHeadingOpen(false); }}
                          className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-[#19202F] hover:bg-[#F0F0F3] transition-colors">
                          {h.icon}{h.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="w-px h-4 mx-1 bg-[#D1DAEB]" />
                {inlineTools.map(toolBtn)}
                <div className="w-px h-4 mx-1 bg-[#D1DAEB]" />
                {blockTools.map(toolBtn)}
                <div className="w-px h-4 mx-1 bg-[#D1DAEB]" />
                {codeTools.map(toolBtn)}
                <div className="w-px h-4 mx-1 bg-[#D1DAEB]" />
                {miscTools.map(toolBtn)}
              </div>
            )}
            {/* Dialog content */}
            <div className="flex-1 overflow-hidden">
              {mode === 'edit' ? (
                <textarea
                  ref={taExpandedRef}
                  value={value}
                  onChange={e => onChange(e.target.value)}
                  className="w-full h-full px-5 py-4 text-[13px] font-mono leading-[1.7] text-[#19202F] bg-white outline-none resize-none"
                  placeholder="e.g., You are a research assistant…"
                  spellCheck={false}
                  autoFocus
                />
              ) : (
                <div className="h-full overflow-y-auto px-5 py-4 text-[13px] leading-[1.7] text-[#19202F]">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={PREVIEW_COMPONENTS as never}>{value || '*No instructions yet.*'}</ReactMarkdown>
                </div>
              )}
            </div>
            {/* Dialog footer */}
            <div className="px-5 py-3 border-t border-[#E8ECF2] shrink-0 flex justify-end">
              <button type="button" onClick={() => setExpanded(false)}
                className="text-[13px] font-medium px-4 py-1.5 rounded-md text-white transition-opacity hover:opacity-90"
                style={{ background: ACCENT }}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ModelEngine = ({ model, onModel, harness, onHarness }: {
  model: string; onModel: (v: string) => void;
  harness: string; onHarness: (v: string) => void;
}) => (
  <div className="flex flex-col gap-5">
    <div className="flex flex-col gap-2.5">
      <FormLabel>Harness Strategy</FormLabel>
      <div className="flex flex-col gap-3">
        {[
          { id: 'agentex', label: 'Model Agnostic', desc: 'Use any provider. Tools run in a sandbox.' },
          { id: 'claude-code', label: 'Claude Code', desc: 'Anthropic models in a Claude Code sandbox.' },
        ].map(h => (
          <button key={h.id} type="button" onClick={() => onHarness(h.id)}
            className="flex items-start gap-3 text-left">
            <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5"
              style={{ borderColor: harness === h.id ? ACCENT : '#D1DAEB' }}>
              {harness === h.id && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ACCENT }} />}
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[13px] font-medium text-[#19202F]">{h.label}</span>
              <span className="text-[11px] text-[#818EA9]">{h.desc}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
    <div className="flex flex-col gap-2.5">
      <FormLabel>Model</FormLabel>
      <select value={model} onChange={e => onModel(e.target.value)}
        className="w-full h-9 px-3 rounded-md border border-[#D1DAEB] text-[13px] text-[#19202F] bg-white outline-none focus:border-[#714DFF] focus:ring-2 focus:ring-[#714DFF]/20 transition-colors appearance-none cursor-pointer"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23818EA9' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}>
        {MODELS.map(m => (
          <option key={m.id} value={m.id}>{m.label} — {m.provider}</option>
        ))}
      </select>
    </div>
  </div>
);

const Capabilities = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const caps = [
    { id: 'readonly', label: 'Read-Only', desc: 'Can read data and generate text. No writes or API mutations.', Icon: Lock },
    { id: 'readwrite', label: 'Read + Write', desc: 'Can read and write to connected integrations and data sources.', Icon: Shield },
    { id: 'unlimited', label: 'Unlimited', desc: 'Full access including terminal/bash execution. Use with caution.', Icon: Terminal },
  ];
  return (
    <div className="flex flex-col gap-2.5">
      <FormLabel>Capability Boundaries</FormLabel>
      <div className="flex flex-col gap-3">
        {caps.map(({ id, label, desc }) => {
          const active = value === id;
          return (
            <button key={id} type="button" onClick={() => onChange(id)}
              className="flex items-start gap-3 text-left">
              <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5"
                style={{ borderColor: active ? ACCENT : '#D1DAEB' }}>
                {active && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ACCENT }} />}
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[13px] font-medium text-[#19202F]">{label}</span>
                <span className="text-[12px] text-[#818EA9]">{desc}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const Toggle = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
  <button type="button" onClick={onToggle}
    className={cn('relative flex items-center shrink-0 rounded-full transition-colors')}
    style={{ width: 32, height: 18, background: on ? ACCENT : '#D1DAEB' }}>
    <div className={cn('w-3.5 h-3.5 rounded-full bg-white shadow-sm absolute transition-transform')}
      style={{ width: 14, height: 14, transform: on ? 'translateX(15px)' : 'translateX(2px)' }} />
  </button>
);

const Integrations = ({ connected, onToggle }: { connected: string[]; onToggle: (id: string) => void }) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2.5">
      <FormLabel>Integrations</FormLabel>
      <div className="flex flex-col gap-2">
        {INTEGRATIONS.map(intg => {
          const on = connected.includes(intg.id);
          return (
            <div key={intg.id}
              className="flex items-center gap-3 px-4 py-3 rounded-md border transition-all"
              style={{ borderColor: on ? '#D1DAEB' : '#EAECF2', backgroundColor: '#fff' }}>
              <div className="w-8 h-8 rounded-lg border border-[#E8ECF2] bg-white flex items-center justify-center shrink-0"
                style={{ opacity: on ? 1 : 0.4 }}>
                <IntegrationLogo id={intg.id} size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium leading-tight"
                  style={{ color: on ? '#19202F' : '#9CA3AF' }}>{intg.label}</div>
                <div className="text-[12px] leading-tight mt-0.5"
                  style={{ color: on ? '#818EA9' : '#C4CAD4' }}>{intg.desc}</div>
              </div>
              {on ? (
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[12px] font-medium" style={{ color: ACCENT }}>Connected</span>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenMenu(openMenu === intg.id ? null : intg.id)}
                      className="w-6 h-6 rounded-md flex items-center justify-center text-[#9CA3AF] hover:text-[#19202F] hover:bg-[#F3F4F6] transition-colors">
                      <MoreHorizontal size={14} />
                    </button>
                    {openMenu === intg.id && (
                      <div
                        className="absolute right-0 top-full mt-1 z-50 bg-white rounded-lg border border-[#D1DAEB] shadow-lg py-1 min-w-[120px]"
                        onMouseLeave={() => setOpenMenu(null)}>
                        <button
                          type="button"
                          onClick={() => { onToggle(intg.id); setOpenMenu(null); }}
                          className="flex items-center w-full px-3 py-2 text-left text-[13px] text-[#DC2626] hover:bg-[#FEF2F2] transition-colors">
                          Disconnect
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onToggle(intg.id)}
                  className="text-[12px] font-medium px-3 py-1.5 rounded-md border transition-colors shrink-0"
                  style={{ borderColor: '#D1DAEB', color: '#19202F', backgroundColor: '#fff' }}>
                  Connect
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const VersionHistory = () => {
  return (
    <div className="flex flex-col gap-2.5">
      <FormLabel>Version History</FormLabel>
      <div className="flex flex-col divide-y divide-[#D1DAEB] border border-[#D1DAEB] rounded-lg overflow-hidden">
        {VERSIONS.map(v => (
          <div key={v.id} className="flex items-center justify-between px-4 py-3"
            style={{ backgroundColor: v.current ? ACCENT_TINT : '#fff' }}>
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-[13px] font-mono font-semibold shrink-0" style={{ color: v.current ? ACCENT : '#19202F' }}>{v.label}</span>
              {v.current && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0" style={{ backgroundColor: ACCENT_MUTED, color: ACCENT_TEXT }}>Current</span>}
              <div className="flex flex-col min-w-0">
                <span className="text-[12px] text-[#5B6579] truncate">{v.summary}</span>
                <span className="text-[11px] text-[#818EA9]">{v.date} · {v.author}</span>
              </div>
            </div>
            {!v.current && (
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button type="button" className="text-[12px] px-2 py-1 rounded text-[#818EA9] hover:bg-[#F3F4F6] transition-colors">Restore</button>
                <button type="button" className="text-[12px] px-2 py-1 rounded text-[#818EA9] hover:bg-[#F3F4F6] transition-colors">Clone</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Chat Playground ──────────────────────────────────────────────────────────

const ChatPlayground = ({ messages = MOCK_MESSAGES }: { messages?: ChatMessage[] }) => {
  const [input, setInput] = useState('');
  const [singleLine, setSingleLine] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView(); }, [messages]);

  // Auto-grow the input from a single line up to a max height as content wraps.
  useEffect(() => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
    // leading-6 == 24px line height; one row stays within ~30px.
    setSingleLine(ta.scrollHeight <= 30);
  }, [input]);

  const canSend = input.trim().length > 0;

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[640px] mx-auto px-8 py-6 flex flex-col gap-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 gap-2">
              <p className="text-[14px] text-[#818ea9]">Send a message to start the conversation.</p>
            </div>
          )}
          {messages.map(msg => {
            if (msg.role === 'user') return (
              <div key={msg.id} className="flex flex-col items-end gap-2">
                <span className="text-[13px] font-normal" style={{ color: '#818ea9' }}>You</span>
                <div className="px-3 py-2.5 text-[14px] font-normal leading-[1.8]"
                  style={{
                    backgroundColor: '#fcfcfc',
                    border: '1px solid #e9e9eb',
                    borderRadius: '24px 24px 2px 24px',
                    color: '#19202f',
                    maxWidth: '75%',
                  }}>
                  {msg.content}
                </div>
              </div>
            );
            if (msg.role === 'tool') {
              const isFirstTool = messages.findIndex(m => m.role === 'tool') === messages.indexOf(msg);
              return (
                <div key={msg.id} className="flex flex-col gap-2 w-full">
                  {/* Sandbox Created — only on first tool call */}
                  {isFirstTool && (
                    <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white w-full"
                      style={{ border: '1px solid #e2e8f0' }}>
                      <Box size={15} className="shrink-0" style={{ color: '#3d9a4f' }} />
                      <span className="text-[13px] font-normal" style={{ color: '#19202f' }}>Sandbox Created</span>
                    </div>
                  )}
                  {/* Result summary card */}
                  <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white w-full"
                    style={{ border: '1px solid #e2e8f0' }}>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#3d9a4f' }} />
                    <span className="text-[13px] font-semibold" style={{ color: '#19202f' }}>{msg.result}</span>
                    <span className="text-[13px]" style={{ color: '#818ea9' }}>· {msg.query}</span>
                    <ChevronDown size={14} className="ml-auto shrink-0" style={{ color: '#818ea9' }} />
                  </div>
                </div>
              );
            }
            if (msg.role === 'error') {
              return (
                <div key={msg.id} className="flex items-start gap-2.5 px-4 py-3 rounded-xl w-full"
                  style={{ backgroundColor: '#FEF2F2', border: '1px solid #FADCDC' }}>
                  <TriangleAlert size={15} className="shrink-0 mt-0.5" style={{ color: '#DC2626' }} />
                  <div className="text-[13px] leading-[1.7]" style={{ color: '#7F1D1D' }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                      p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    }}>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              );
            }
            return (
              <div key={msg.id} className="flex flex-col items-start gap-2">
                <div className="text-[14px] font-normal leading-[1.8] max-w-none" style={{ color: '#19202f' }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                    p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                    ul: ({ children }) => <ul className="list-disc pl-5 mb-3 flex flex-col gap-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 flex flex-col gap-1">{children}</ol>,
                    li: ({ children }) => <li>{children}</li>,
                    h1: ({ children }) => <h1 className="text-[16px] font-semibold mb-2">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-[15px] font-semibold mb-2">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-[14px] font-semibold mb-1">{children}</h3>,
                    code: ({ children }) => <code className="px-1 py-0.5 rounded text-[13px] font-mono" style={{ backgroundColor: '#f0f0f3' }}>{children}</code>,
                    pre: ({ children }) => <pre className="px-3 py-2 rounded-md bg-[#f0f0f3] text-[13px] font-mono overflow-x-auto mb-3">{children}</pre>,
                    blockquote: ({ children }) => <blockquote className="border-l-2 border-[#D1DAEB] pl-3 text-[#818EA9] italic mb-3">{children}</blockquote>,
                    hr: () => <hr className="border-[#D1DAEB] my-3" />,
                    table: ({ children }) => <table className="w-full text-[13px] border-collapse mb-3">{children}</table>,
                    th: ({ children }) => <th className="border border-[#D1DAEB] px-2 py-1 text-left font-semibold bg-[#f5f7fa]">{children}</th>,
                    td: ({ children }) => <td className="border border-[#D1DAEB] px-2 py-1">{children}</td>,
                  }}>{msg.content}</ReactMarkdown>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="py-5 max-w-[640px] mx-auto w-full px-8">
        <div className={cn('relative bg-white transition-[border-radius]', singleLine ? 'rounded-full' : 'rounded-lg')} style={{ border: '1px solid #e9e9eb', boxShadow: '0px 3px 15px 0px rgba(0,0,0,0.15)' }}>
          <div className="flex items-end gap-2 pt-3 pb-3 pl-4 pr-3">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Send a message to test your agent…"
              className="flex-1 min-w-0 resize-none bg-transparent text-[14px] font-normal leading-6 outline-none placeholder:font-normal block"
              style={{ color: '#19202f', caretColor: '#19202f', maxHeight: '160px' }}
            />
            <button type="button" disabled={!canSend}
              className="flex items-center justify-center w-6 h-6 rounded-full transition-all flex-shrink-0"
              style={canSend ? { backgroundColor: ACCENT, color: '#fff' } : { backgroundColor: '#f0f0f3', color: '#818ea9' }}>
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>
          {/* Inset shadow overlay */}
          <div className={cn('absolute inset-0 pointer-events-none', singleLine ? 'rounded-full' : 'rounded-lg')}
            style={{ boxShadow: 'inset 0px 0px 2px 0px rgba(0,0,0,0.1), inset 0px 0px 2px 0px rgba(0,96,255,0.03)' }} />
        </div>
      </div>
    </div>
  );
};

// ─── Save button ──────────────────────────────────────────────────────────────

const SaveButton = ({ onClick }: { onClick?: () => void }) => (
  <button type="button" onClick={onClick}
    className="flex items-center justify-center h-8 px-4 text-[13px] font-medium rounded text-white transition-opacity hover:opacity-90"
    style={{ background: ACCENT }}>
    Save Changes
  </button>
);

// ─────────────────────────────────────────────────────────────────────────────
// Command Center — chat-first, config as slide-over panels
//
// Philosophy: The agent's output is the product. Center the playground as the
// primary surface — users interact, observe behavior, and only reach for
// config when something needs changing. Icon-triggered slide-over panels keep
// configuration accessible without visually dominating the workspace, making
// the interface feel more like a conversation than a form.
// ─────────────────────────────────────────────────────────────────────────────

type Panel = null | 'sidebar';

const SIDEBAR_MIN = 180;
const SIDEBAR_MAX = 420;
const SIDEBAR_DEFAULT = 336;

const CombinedSidebar = ({
  activeThread, onSelect, onClose,
  agentName, onAgentName, agentDescription, onAgentDescription,
  instructions, onInstructions,
  model, onModel, harness, onHarness,
  capability, onCapability,
  connected, onToggle,
  selectedAgentId, onSelectAgent,
  onConfigOpen, onConfigClose, configOpen,
  onScheduledOpen, scheduledOpen,
  hasChanges, onSave,
  sidebarBg = 'muted',
  onBack,
  navSpacing = 20,
}: {
  activeThread: string; onSelect: (id: string) => void; onClose: () => void;
  agentName: string; onAgentName: (v: string) => void;
  agentDescription: string; onAgentDescription: (v: string) => void;
  instructions: string; onInstructions: (v: string) => void;
  model: string; onModel: (v: string) => void;
  harness: string; onHarness: (v: string) => void;
  capability: string; onCapability: (v: string) => void;
  connected: string[]; onToggle: (id: string) => void;
  selectedAgentId: string; onSelectAgent: (id: string) => void;
  onConfigOpen?: () => void;
  onConfigClose?: () => void;
  configOpen?: boolean;
  onScheduledOpen?: () => void;
  scheduledOpen?: boolean;
  hasChanges?: boolean;
  onSave?: () => void;
  sidebarBg?: 'muted' | 'white';
  onBack?: () => void;
  navSpacing?: number;
}) => {
  const [tab, setTab] = useState<'threads' | 'config'>('threads');
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false);
  const [width, setWidth] = useState(SIDEBAR_DEFAULT);
  const [threads, setThreads] = useState(THREADS.map(t => ({ ...t })));
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartW = useRef(SIDEBAR_DEFAULT);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const agentPickerRef = useRef<HTMLDivElement>(null);

  const filtered = threads.filter(t =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleResizeDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartW.current = width;
    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const next = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, dragStartW.current + ev.clientX - dragStartX.current));
      setWidth(next);
    };
    const onUp = () => { isDragging.current = false; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  useEffect(() => {
    if (!openMenuId) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openMenuId]);

  useEffect(() => {
    if (!agentDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (agentPickerRef.current && !agentPickerRef.current.contains(e.target as Node)) setAgentDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [agentDropdownOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); } };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [searchOpen]);

  const openMenu = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, left: rect.left });
    setOpenMenuId(id);
  };

  const startRename = (id: string) => {
    const t = threads.find(t => t.id === id);
    if (!t) return;
    setOpenMenuId(null);
    setRenamingId(id);
    setRenameValue(t.title);
    setTimeout(() => renameInputRef.current?.focus(), 50);
  };

  const commitRename = () => {
    if (!renamingId) return;
    const trimmed = renameValue.trim();
    if (trimmed) setThreads(prev => prev.map(t => t.id === renamingId ? { ...t, title: trimmed } : t));
    setRenamingId(null);
  };

  const deleteThread = (id: string) => {
    setOpenMenuId(null);
    setThreads(prev => prev.filter(t => t.id !== id));
    if (activeThread === id) onSelect('');
  };

  const createThread = () => {
    // Idempotent: reuse an existing empty "New Thread" instead of stacking duplicates.
    const existing = threads.find(t => t.title === 'New Thread' && t.messages === 0);
    if (existing) {
      onSelect(existing.id);
      onConfigClose?.();
      return;
    }
    const t = { id: Date.now().toString(), title: 'New Thread', preview: '', date: 'Now', messages: 0, active: false };
    setThreads(prev => [t, ...prev]);
    onSelect(t.id);
    onConfigClose?.();
  };

  return (
    <>
      <div
        className="relative flex flex-col shrink-0 overflow-hidden shadow-md z-10"
        style={{ width, backgroundColor: sidebarBg === 'white' ? '#ffffff' : '#FAFAFA', transition: isDragging.current ? 'none' : 'width 0.2s' }}
      >

        <div className="flex flex-col flex-1 overflow-hidden p-2">
          {/* Top bar */}
          <div className={cn('flex items-center h-10 px-1 gap-2 shrink-0', onConfigOpen ? 'mt-2 mb-4' : 'mb-1')}>
            {onConfigOpen ? (
              <>
                <button type="button" title="Back to agents"
                  onClick={onBack}
                  className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 text-[#818EA9] hover:text-[#19202F] hover:bg-[#EBEBEE] transition-colors">
                  <ArrowLeft size={15} />
                </button>
                <div ref={agentPickerRef} className="flex-1 flex justify-center relative">
                  <button
                    type="button"
                    onClick={() => setAgentDropdownOpen(o => !o)}
                    className="flex items-center gap-1.5 max-w-full pl-4 pr-3 h-10 rounded-full bg-white transition-colors hover:bg-[#FAFAFB]"
                    style={{ border: '1px solid #e9e9eb', boxShadow: '0px 1px 2px 0px rgba(0,0,0,0.05)' }}
                  >
                    <span className="min-w-0 truncate text-left text-[14px] font-medium text-[#19202F]">{agentName}</span>
                    <ChevronDown size={16} className="shrink-0 text-[#818EA9]" />
                  </button>
                  {agentDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white rounded-xl border border-[#e9e9eb] py-2"
                      style={{ boxShadow: '0px 8px 24px 0px rgba(0,0,0,0.12)' }}>
                      {MOCK_AGENTS.map(agent => (
                        <button key={agent.id} type="button"
                          onClick={() => { onSelectAgent(agent.id); setAgentDropdownOpen(false); }}
                          className="flex flex-col items-start w-full px-3 py-2 text-left transition-colors hover:bg-[#F5F5F8]"
                          style={selectedAgentId === agent.id ? { backgroundColor: ACCENT_TINT } : {}}>
                          <span className="flex items-center gap-2">
                            <span className="truncate text-[14px] font-medium text-[#19202F]">{agent.name}</span>
                            {selectedAgentId === agent.id && <Check size={16} className="shrink-0" style={{ color: ACCENT_SOFT }} />}
                          </span>
                          <span className="text-[11px] text-[#818EA9] leading-snug mt-0.5">{agent.description}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="w-8 shrink-0" />
                <div className="flex-1 flex items-center p-[2px] rounded-md text-[12px]"
                  style={{ border: '1px solid #e9e9eb', background: '#f5f7fa' }}>
                  {(['threads', 'config'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setTab(t)}
                      className="flex-1 h-[22px] rounded transition-all"
                      style={tab === t
                        ? { background: ACCENT_MUTED, color: ACCENT_SOFT, fontWeight: 600 }
                        : { background: 'transparent', color: '#78839c', fontWeight: 400 }}>
                      {t === 'threads' ? 'Threads' : 'Configure'}
                    </button>
                  ))}
                </div>
              </>
            )}
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-md transition-colors shrink-0"
              style={{ color: '#5b6579' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F0F0F3')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          {/* ── Threads content ── */}
          {tab === 'threads' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* New Thread */}
              <button
                onClick={createThread}
                className="flex items-center gap-2 h-10 px-2 rounded-md transition-colors text-sm shrink-0"
                style={{ color: '#19202f', marginTop: navSpacing }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F0F0F3')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <SquarePen className="w-4 h-4 shrink-0" />
                <span>New Thread</span>
              </button>

              {/* Scheduled Tasks (fullpage mode) */}
              {onScheduledOpen && (
                <button type="button" onClick={onScheduledOpen}
                  className="flex items-center gap-2 h-10 px-2 rounded-md transition-colors text-sm shrink-0"
                  style={{ color: '#19202f', backgroundColor: scheduledOpen ? ACCENT_TINT : 'transparent' }}
                  onMouseEnter={e => { if (!scheduledOpen) e.currentTarget.style.backgroundColor = '#F0F0F3'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = scheduledOpen ? ACCENT_TINT : 'transparent'; }}>
                  <CalendarClock className="w-4 h-4 shrink-0" />
                  Scheduled Tasks
                </button>
              )}

              {/* Expandable search */}
              <div className="flex items-center h-10 px-2 shrink-0 overflow-hidden" style={{ marginTop: navSpacing }}>
                {!searchOpen ? (
                  <>
                    <span className="flex-1 truncate font-normal leading-6 text-[14px]" style={{ color: '#818EA9' }}>Threads</span>
                    <button
                      onClick={() => { setSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 50); }}
                      className="flex items-center justify-center w-6 h-6 rounded-md transition-colors shrink-0"
                      style={{ color: '#818EA9' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F0F0F3')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <Search className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-1.5 w-full">
                    <Search className="w-3.5 h-3.5 shrink-0" style={{ color: '#818ea9' }} />
                    <input ref={searchInputRef} type="text" value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search..." autoFocus
                      className="flex-1 min-w-0 text-[13px] bg-transparent outline-none"
                      style={{ color: '#19202f' }} />
                    <button onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                      className="flex items-center justify-center w-5 h-5 rounded-full transition-colors shrink-0"
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F0F0F3')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                      <X className="w-3 h-3" style={{ color: '#818ea9' }} />
                    </button>
                  </div>
                )}
              </div>

              {/* Thread list */}
              <div className="overflow-y-auto flex flex-col flex-1">
                {filtered.length === 0 && (
                  <p className="text-center text-[13px] py-4" style={{ color: '#818ea9' }}>No threads found</p>
                )}
                {filtered.map(t => {
                  const scheduled = !!(t as { scheduled?: boolean }).scheduled;
                  const isRenaming = renamingId === t.id;
                  const isActive = activeThread === t.id && !configOpen && !scheduledOpen;
                  const rowStyle: React.CSSProperties = isRenaming
                    ? { backgroundColor: ACCENT_MUTED }
                    : isActive
                      ? { backgroundColor: ACCENT_TINT }
                      : {};
                  return (
                  <div key={t.id}
                    onClick={() => { if (!isRenaming) { onSelect(t.id); onConfigClose?.(); } }}
                    className={cn('group relative flex items-center h-10 px-2 rounded-md text-sm shrink-0',
                      isRenaming ? 'cursor-default' : 'cursor-pointer hover:bg-[#F0F0F3]')}
                    style={rowStyle}
                  >
                    {isRenaming ? (
                      <input ref={renameInputRef} value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenamingId(null); }}
                        onBlur={commitRename} onClick={e => e.stopPropagation()}
                        className="flex-1 min-w-0 font-normal text-[14px] leading-6 bg-transparent outline-none"
                        style={{ color: '#19202f' }} />
                    ) : (
                      <>
                        <span className="flex-1 min-w-0 truncate font-normal text-[14px] leading-6" style={{ color: '#45464F' }}>
                          {t.title}
                        </span>
                        <button onClick={e => openMenu(e, t.id)}
                          className={cn('flex items-center justify-center w-6 h-6 rounded transition-all shrink-0 ml-1',
                            openMenuId === t.id ? 'opacity-100 bg-[#E8E8EC]' : 'opacity-0 group-hover:opacity-100 hover:bg-[#E8E8EC]')}
                          style={{ color: '#818ea9' }}>
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                        {/* Scheduled-run marker: muted trailing icon pinned to the far end (x-aligned
                            with the Threads-row search icon); the actions button sits to its left on hover. */}
                        {scheduled && (
                          <span className="w-6 h-6 flex items-center justify-center shrink-0 ml-1">
                            <CalendarClock className="w-3.5 h-3.5" style={{ color: '#9CA3AF' }} aria-label="Scheduled task" />
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Footer nav: Configure Agent (fullpage mode) ── */}
          {onConfigOpen && (
            <div className="shrink-0 pt-2 pb-1 border-t border-[#F3F4F6] flex flex-col gap-0.5">
              <button type="button" onClick={onConfigOpen}
                className="flex items-center gap-2 h-10 px-2 rounded-md transition-colors text-sm w-full shrink-0"
                style={{ color: '#19202f', backgroundColor: configOpen ? ACCENT_TINT : 'transparent' }}
                onMouseEnter={e => { if (!configOpen) e.currentTarget.style.backgroundColor = '#F0F0F3'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = configOpen ? ACCENT_TINT : 'transparent'; }}>
                <SlidersHorizontal className="w-4 h-4 shrink-0" />
                Configure Agent
              </button>
            </div>
          )}

          {/* ── Configure content ── */}
          {!onConfigOpen && tab === 'config' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto -mx-2 px-2">
                <div className="px-2 pt-3 pb-4 border-b border-[#F3F4F6] flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <FormLabel>Name</FormLabel>
                    <input className={inputCls} value={agentName} onChange={e => onAgentName(e.target.value)} placeholder="Agent name" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <FormLabel>Description</FormLabel>
                    <textarea className="w-full px-3 py-2.5 rounded-md border border-[#D1DAEB] text-[14px] text-[#19202F] bg-white outline-none focus:border-[#714DFF] focus:ring-2 focus:ring-[#714DFF]/20 transition-colors placeholder:text-[#9CA3AF] resize-none leading-[1.5]" rows={3} value={agentDescription} onChange={e => onAgentDescription(e.target.value)} placeholder="Short description" />
                  </div>
                </div>
                <div className="px-2 pt-3 pb-4 border-b border-[#F3F4F6]">
                  <SystemInstructions value={instructions} onChange={onInstructions} rows={7} />
                </div>
                <div className="px-2 pt-4 pb-4 border-b border-[#F3F4F6]">
                  <ModelEngine model={model} onModel={onModel} harness={harness} onHarness={onHarness} />
                </div>
                <div className="px-2 pt-4 pb-4 border-b border-[#F3F4F6]">
                  <Capabilities value={capability} onChange={onCapability} />
                </div>
                <div className="px-2 pt-4 pb-4">
                  <Integrations connected={connected} onToggle={onToggle} />
                </div>
              </div>
              {hasChanges && (
                <div className="pt-2 pb-1 shrink-0 flex justify-end">
                  <SaveButton onClick={onSave} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Resize handle — sibling outside overflow-hidden container so it isn't clipped */}
      <div onMouseDown={handleResizeDown} className="w-1 shrink-0 cursor-col-resize z-20 hover:bg-[#714DFF] transition-colors" style={{ marginLeft: '-1px' }} />

      {/* Context menu */}
      {openMenuId && menuPos && (
        <div ref={menuRef} className="fixed z-[1000] py-1 rounded-lg overflow-hidden"
          style={{ top: menuPos.top, left: menuPos.left, backgroundColor: '#ffffff', border: '1px solid #e9e9eb', boxShadow: '0px 4px 16px rgba(0,0,0,0.12)', minWidth: '144px' }}>
          <button onClick={() => startRename(openMenuId)}
            className="flex items-center gap-2.5 w-full px-3 py-1.5 text-left text-[13px] transition-colors"
            style={{ color: '#19202f' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F9F9FB')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
            <Pencil className="w-3.5 h-3.5 shrink-0" style={{ color: '#5b6579' }} />Rename
          </button>
          <button onClick={() => deleteThread(openMenuId)}
            className="flex items-center gap-2.5 w-full px-3 py-1.5 text-left text-[13px] transition-colors"
            style={{ color: '#e5484d' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F9F9FB')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
            <Trash2 className="w-3.5 h-3.5 shrink-0" style={{ color: '#e5484d' }} />Delete
          </button>
        </div>
      )}
    </>
  );
};

const CommandCenter = ({ configMode = 'fullpage', sidebarBg = 'muted', onBack, initialAgentName, scheduledVariant = 'list', scheduledEmptyState = false, onScheduledOpenChange, navSpacing = 20, scheduleFormError = 'none', onScheduleFormOpenChange }: { configMode?: 'sidebar' | 'fullpage'; sidebarBg?: 'muted' | 'white'; onBack?: () => void; initialAgentName?: string | null; scheduledVariant?: ScheduledVariant; scheduledEmptyState?: boolean; onScheduledOpenChange?: (open: boolean) => void; navSpacing?: number; scheduleFormError?: ScheduleFormError; onScheduleFormOpenChange?: (open: boolean) => void }) => {
  const [panel, setPanel] = useState<Panel>('sidebar');
  const [configOpen, setConfigOpen] = useState(false);
  const [scheduledOpen, setScheduledOpen] = useState(false);

  // Let the page know when the Scheduled Tasks surface is showing so it can
  // scope Tweakpane params (e.g. the empty-state toggle) to this page.
  useEffect(() => { onScheduledOpenChange?.(scheduledOpen); }, [scheduledOpen, onScheduledOpenChange]);
  const [activeThread, setActiveThread] = useState('t1');
  const [threadMessages] = useState<Record<string, ChatMessage[]>>(ALL_THREAD_MESSAGES);
  const [selectedAgentId, setSelectedAgentId] = useState(MOCK_AGENTS[0].id);
  const handleSelectAgent = (id: string) => {
    const agent = MOCK_AGENTS.find(a => a.id === id);
    if (!agent) return;
    setSelectedAgentId(id);
    setAgentName(agent.name);
    setAgentDescription(agent.description);
  };

  useEffect(() => {
    if (!initialAgentName) return;
    const agent = MOCK_AGENTS.find(a => a.name === initialAgentName);
    if (agent) handleSelectAgent(agent.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAgentName]);
  const [agentName, setAgentName] = useState(INITIAL_AGENT_NAME);
  const [agentDescription, setAgentDescription] = useState(INITIAL_AGENT_DESCRIPTION);
  const [instructions, setInstructions] = useState(INITIAL_INSTRUCTIONS);
  const [model, setModel] = useState('claude-sonnet-4');
  const [harness, setHarness] = useState('agentex');
  const [capability, setCapability] = useState('readonly');
  const [connected, setConnected] = useState(['slack', 'github', 'linear']);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const toggle = (id: string) => setConnected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const [permissions, setPermissions] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(INTEGRATION_PERMISSION_LEVELS).map(([id, levels]) => [id, levels[0]?.id ?? 'read']))
  );
  const togglePermission = (integId: string, level: string) =>
    setPermissions(prev => ({ ...prev, [integId]: level }));

  const savedConfig = useRef({ agentName: INITIAL_AGENT_NAME, agentDescription: INITIAL_AGENT_DESCRIPTION, instructions: INITIAL_INSTRUCTIONS, model: 'claude-sonnet-4', harness: 'agentex', capability: 'readonly', connected: ['slack', 'github', 'linear'] });
  const hasChanges =
    agentName !== savedConfig.current.agentName ||
    agentDescription !== savedConfig.current.agentDescription ||
    instructions !== savedConfig.current.instructions ||
    model !== savedConfig.current.model ||
    harness !== savedConfig.current.harness ||
    capability !== savedConfig.current.capability ||
    JSON.stringify(connected) !== JSON.stringify(savedConfig.current.connected);
  const handleSave = () => { savedConfig.current = { agentName, agentDescription, instructions, model, harness, capability, connected }; };

  const configProps = { agentName, onAgentName: setAgentName, agentDescription, onAgentDescription: setAgentDescription, instructions, onInstructions: setInstructions, model, onModel: setModel, harness, onHarness: setHarness, capability, onCapability: setCapability, connected, onToggle: toggle };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Combined sidebar */}
      {panel === 'sidebar' && (
        <CombinedSidebar
          activeThread={activeThread} onSelect={setActiveThread} onClose={() => setPanel(null)}
          {...configProps}
          onConfigOpen={configMode === 'fullpage' ? () => { setConfigOpen(true); setScheduledOpen(false); } : undefined}
          onConfigClose={configMode === 'fullpage' ? () => { setConfigOpen(false); setScheduledOpen(false); } : undefined}
          configOpen={configOpen}
          onScheduledOpen={configMode === 'fullpage' ? () => { setScheduledOpen(true); setConfigOpen(false); } : undefined}
          scheduledOpen={scheduledOpen}
          hasChanges={hasChanges}
          onSave={handleSave}
          selectedAgentId={selectedAgentId}
          onSelectAgent={handleSelectAgent}
          sidebarBg={sidebarBg}
          onBack={onBack}
          navSpacing={navSpacing}
        />
      )}

      {/* Chat — Primary Surface */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {!panel && (
          <div className="px-3 h-10 flex items-center shrink-0 mb-1 mt-4">
            <button type="button" title="Panel"
              onClick={() => setPanel('sidebar')}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0 text-[#818EA9] hover:bg-[#F3F4F6]">
              <PanelLeftOpen size={16} />
            </button>
          </div>
        )}

        {/* Scheduled Tasks surface (fullpage mode only) */}
        {scheduledOpen ? (
          <ScheduledTasks
            variant={scheduledVariant}
            emptyState={scheduledEmptyState}
            formError={scheduleFormError}
            onFormOpenChange={onScheduleFormOpenChange}
            connectedTools={connected}
            onConfigureTools={() => { setConfigOpen(true); setScheduledOpen(false); }}
          />
        ) : configMode === 'fullpage' && configOpen ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-[640px] mx-auto px-8 pt-12 pb-6 flex flex-col gap-6">
                <h1 className="text-[20px] font-semibold text-[#19202F]">Configure Agent</h1>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <FormLabel>Name</FormLabel>
                    <input className={inputCls} value={agentName} onChange={e => setAgentName(e.target.value)} placeholder="Agent name" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <FormLabel>Description</FormLabel>
                    <textarea className="w-full px-3 py-2.5 rounded-md border border-[#D1DAEB] text-[14px] text-[#19202F] bg-white outline-none focus:border-[#714DFF] focus:ring-2 focus:ring-[#714DFF]/20 transition-colors placeholder:text-[#9CA3AF] resize-none leading-[1.5]" rows={3} value={agentDescription} onChange={e => setAgentDescription(e.target.value)} placeholder="Short description" />
                  </div>
                </div>
                <div className="border-t border-[#F3F4F6] pt-6">
                  <SystemInstructions value={instructions} onChange={setInstructions} rows={8} />
                </div>
                <div className="border-t border-[#F3F4F6] pt-6"><ModelEngine model={model} onModel={setModel} harness={harness} onHarness={setHarness} /></div>
                <div className="border-t border-[#F3F4F6] pt-6"><Capabilities value={capability} onChange={setCapability} /></div>
                <div className="border-t border-[#F3F4F6] pt-6"><Integrations connected={connected} onToggle={toggle} /></div>
                <div className="border-t border-[#F3F4F6] pt-6 flex items-center justify-between gap-6">
                  <div className="flex flex-col gap-1">
                    <FormLabel>Delete Agent</FormLabel>
                    <div className="text-[13px] leading-relaxed" style={{ color: '#818EA9' }}>
                      Permanently delete this agent and all its configuration. This action cannot be undone.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmOpen(true)}
                    className="shrink-0 text-[13px] font-medium px-4 py-2 rounded-md transition-colors"
                    style={{ color: '#fff', backgroundColor: '#DC2626' }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#B91C1C'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#DC2626'; }}>
                    Delete Agent
                  </button>
                </div>
              </div>
            </div>
            {hasChanges && (
              <div className="px-8 py-4 border-t border-[#D1DAEB] shrink-0 flex justify-end">
                <SaveButton onClick={handleSave} />
              </div>
            )}
            {deleteConfirmOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
                onClick={() => setDeleteConfirmOpen(false)}>
                <div className="bg-white rounded-xl shadow-xl p-6 flex flex-col gap-4 w-[400px]"
                  onClick={e => e.stopPropagation()}>
                  <div className="flex flex-col gap-1.5">
                    <h2 className="text-[16px] font-semibold text-[#19202F]">Delete "{agentName}"?</h2>
                    <p className="text-[13px] text-[#818EA9] leading-relaxed">This will permanently delete the agent and all of its configuration. This action cannot be undone.</p>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmOpen(false)}
                      className="px-4 py-2 rounded-md text-[13px] font-medium border border-[#D1DAEB] text-[#19202F] bg-white hover:bg-[#F5F5F8] transition-colors">
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmOpen(false)}
                      className="px-4 py-2 rounded-md text-[13px] font-medium text-white transition-colors"
                      style={{ backgroundColor: '#DC2626' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#B91C1C')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#DC2626')}>
                      Delete Agent
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <ChatPlayground messages={threadMessages[activeThread] ?? []} />
        )}
      </div>
    </div>
  );
};

// ─── Main Export ──────────────────────────────────────────────────────────────

export function CustomizableAgents({ configMode = 'fullpage', sidebarBg = 'muted', onBack, initialAgentName, scheduledVariant = 'list', scheduledEmptyState = false, onScheduledOpenChange, navSpacing = 20, scheduleFormError = 'none', onScheduleFormOpenChange }: { configMode?: 'sidebar' | 'fullpage'; sidebarBg?: 'muted' | 'white'; onBack?: () => void; initialAgentName?: string | null; scheduledVariant?: ScheduledVariant; scheduledEmptyState?: boolean; onScheduledOpenChange?: (open: boolean) => void; navSpacing?: number; scheduleFormError?: ScheduleFormError; onScheduleFormOpenChange?: (open: boolean) => void }) {
  return <CommandCenter configMode={configMode} sidebarBg={sidebarBg} onBack={onBack} initialAgentName={initialAgentName} scheduledVariant={scheduledVariant} scheduledEmptyState={scheduledEmptyState} onScheduledOpenChange={onScheduledOpenChange} navSpacing={navSpacing} scheduleFormError={scheduleFormError} onScheduleFormOpenChange={onScheduleFormOpenChange} />;
}
