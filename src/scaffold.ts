import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAgentPrompt } from './agent';
import { runStep } from './progress';
import { selectedAgentSkills, selectedRepoSkills } from './skill-selection';
import type { AppSurface, RouteId, ScaffoldAnswers } from './types';

const UI_VERSION = '^0.6.0';
const DIST_DIR = path.dirname(fileURLToPath(import.meta.url));
const SKILL_POOL_DIR = path.resolve(DIST_DIR, '..', 'skills');

function titleCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function routeTitle(route: RouteId): string {
  return route === 'new-task' ? 'New Task' : titleCase(route);
}

type RouteMetric = {
  label: string;
  value: string;
  detail: string;
};

type RouteSignal = {
  title: string;
  detail: string;
};

type RouteBlueprint = {
  id: RouteId;
  label: string;
  eyebrow: string;
  summary: string;
  metrics: RouteMetric[];
  queue: string[];
  signals: RouteSignal[];
  alertTitle: string;
  alertDescription: string;
};

async function writeFile(root: string, filePath: string, content: string): Promise<void> {
  const absolute = path.join(root, filePath);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, content);
}

async function writeJson(root: string, filePath: string, value: unknown): Promise<void> {
  await writeFile(root, filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function compactText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function truncateText(value: string, limit: number): string {
  const compact = compactText(value);
  if (compact.length <= limit) return compact;
  return `${compact.slice(0, Math.max(0, limit - 1)).trimEnd()}...`;
}


function routeBlueprint(answers: ScaffoldAnswers, route: RouteId): RouteBlueprint {
  const scope = truncateText(answers.scope, 120);
  const sharedMetrics: RouteMetric[] = [
    {
      label: 'App surfaces',
      value: String(answers.apps.length).padStart(2, '0'),
      detail: answers.apps.map((app) => `apps/${app}`).join(', '),
    },
    {
      label: 'Default routes',
      value: String(answers.routes.length).padStart(2, '0'),
      detail: answers.routes.map((id) => `/${id}`).join(', '),
    },
    {
      label: 'Scaffold agent',
      value: answers.agent.toUpperCase(),
      detail: 'Prompt, skills, and memory are already mounted.',
    },
  ];

  switch (route) {
    case 'overview':
      return {
        id: route,
        label: routeTitle(route),
        eyebrow: 'Workspace health',
        summary: `${answers.projectName} already has a product shell, selected routes, and shared UI primitives mounted around ${scope}. Use this page as the operating snapshot before deeper agent edits.`,
        metrics: sharedMetrics,
        queue: [
          'Pin the operating metrics that define whether this product is working.',
          'Replace sample cards with live domain objects, owners, and timestamps.',
          'Decide which surface is the control plane and which ones stay lightweight.',
        ],
        signals: [
          {
            title: 'Shared shell is already wired',
            detail: 'Navigation, workspace chrome, and route framing ship before the agent starts writing domain-specific screens.',
          },
          {
            title: 'UI package is first-class',
            detail: '@shipshitdev/ui components carry the structure, spacing, and interaction affordances across the scaffold.',
          },
          {
            title: 'This page is meant to be reshaped',
            detail: 'Keep the layout, then swap the placeholder counters and lists with product-specific data.',
          },
        ],
        alertTitle: 'Start with what matters',
        alertDescription: 'Translate the brief into the three or four signals an operator needs to see immediately after opening the app.',
      };
    case 'new-task':
      return {
        id: route,
        label: routeTitle(route),
        eyebrow: 'Execution intake',
        summary: `Use this route to turn incoming work for ${answers.projectName} into scoped execution lanes. The form and checklist should protect the team from fuzzy requests while keeping shipping velocity high.`,
        metrics: [
          {
            label: 'Ready briefs',
            value: '03',
            detail: 'Three intake templates are enough to cover most product work.',
          },
          {
            label: 'Decision window',
            value: '24h',
            detail: 'Force a fast owner decision instead of letting new work drift.',
          },
          {
            label: 'Primary owner',
            value: '01',
            detail: 'Every task needs a single accountable owner before it leaves intake.',
          },
        ],
        queue: [
          'Capture the user problem, the decision deadline, and the expected outcome.',
          'Require links to context before a task can move into active execution.',
          'Separate requests that need agent automation from requests that need human review.',
        ],
        signals: [
          {
            title: 'The route should feel operational',
            detail: 'Favor structured controls, acceptance criteria, and explicit owners over free-form notes.',
          },
          {
            title: 'Protect the team from ambiguity',
            detail: 'The default page should make it hard to create a task without a problem statement and a clear success condition.',
          },
          {
            title: 'Keep the path short',
            detail: 'The best default is a compact intake flow that still captures the data needed to ship safely.',
          },
        ],
        alertTitle: 'Keep intake strict',
        alertDescription: 'Treat vague tasks as invalid input. The scaffold should make the required structure obvious on the first pass.',
      };
    case 'search':
      return {
        id: route,
        label: routeTitle(route),
        eyebrow: 'Knowledge retrieval',
        summary: `Search should collapse context fast: the right records, decisions, and project memory for ${answers.projectName} should be reachable without digging through multiple tools or tabs.`,
        metrics: [
          {
            label: 'Indexed sources',
            value: '04',
            detail: 'Blend docs, issues, conversations, and recent activity into one entry point.',
          },
          {
            label: 'Saved slices',
            value: '12',
            detail: 'Common filters should be one click away for repeat searches.',
          },
          {
            label: 'Answer quality',
            value: 'Tight',
            detail: 'Search should return a decisive answer or reveal exactly what is missing.',
          },
        ],
        queue: [
          'Prioritize exact matches for project entities before broad keyword search.',
          'Expose filters for status, owner, recency, and surface without burying them.',
          'Show the record, the reason it matched, and the next useful action together.',
        ],
        signals: [
          {
            title: 'Search is a work surface',
            detail: 'Treat it like an operator tool, not a decorative empty state with a large input.',
          },
          {
            title: 'Results need context',
            detail: 'A record title is not enough. Show status, owner, and recency in every row.',
          },
          {
            title: 'Bias toward speed',
            detail: 'Operators should understand whether the answer exists within seconds.',
          },
        ],
        alertTitle: 'Design for quick retrieval',
        alertDescription: 'Optimize for repeated lookups by people already inside the product, not for public-site style discovery.',
      };
    case 'inbox':
      return {
        id: route,
        label: routeTitle(route),
        eyebrow: 'Approvals and follow-up',
        summary: `Inbox is where follow-up happens: approvals, blockers, and handoffs that need attention to keep ${answers.projectName} moving. It should feel like a queue, not a dead-end list.`,
        metrics: [
          {
            label: 'Waiting items',
            value: '08',
            detail: 'Separate urgent approvals from low-priority notifications.',
          },
          {
            label: 'Blocking threads',
            value: '03',
            detail: 'Surface the work that is actively stopping delivery.',
          },
          {
            label: 'Response target',
            value: 'Today',
            detail: 'Make the operating expectation visible inside the route itself.',
          },
        ],
        queue: [
          'Group approvals, escalations, and updates by urgency instead of dumping them into one feed.',
          'Attach the owner, requested action, and due time to every item.',
          'Make it trivial to clear, snooze, or escalate work without leaving the page.',
        ],
        signals: [
          {
            title: 'Queues need hierarchy',
            detail: 'The top of the inbox should be unmistakably different from passive updates lower down.',
          },
          {
            title: 'Focus on actionability',
            detail: 'Users should know what decision they are making before they open a detail view.',
          },
          {
            title: 'Stay compact',
            detail: 'An inbox that wastes vertical space forces scanning work onto the operator.',
          },
        ],
        alertTitle: 'Make pending work obvious',
        alertDescription: 'Favor clear queue states, deadlines, and ownership instead of generic notification cards.',
      };
    case 'activities':
      return {
        id: route,
        label: routeTitle(route),
        eyebrow: 'Delivery pulse',
        summary: `Activities should answer a simple question: what moved recently in ${answers.projectName}, who moved it, and what needs a response next. This route is the shared delivery log.`,
        metrics: [
          {
            label: 'Moves today',
            value: '05',
            detail: 'Show meaningful changes, not every low-signal event.',
          },
          {
            label: 'Open loops',
            value: '02',
            detail: 'Highlight the threads that still need a reply or decision.',
          },
          {
            label: 'Operational state',
            value: 'Stable',
            detail: 'A quick pulse should tell the team if the system feels calm or chaotic.',
          },
        ],
        queue: [
          'Log state changes with enough context that someone can understand the move without opening a second screen.',
          'Keep people, systems, and agent actions in one readable event timeline.',
          'Separate audit-worthy actions from ambient chatter and background sync noise.',
        ],
        signals: [
          {
            title: 'A good activity feed explains itself',
            detail: 'Each row should communicate who acted, what changed, and why it matters.',
          },
          {
            title: 'Noise control matters',
            detail: 'If everything appears in the log, the important transitions disappear.',
          },
          {
            title: 'Recent work should be easy to scan',
            detail: 'Favor timestamp grouping and sharp labels over decorative timeline filler.',
          },
        ],
        alertTitle: 'Keep the feed high-signal',
        alertDescription: 'Only show events that help an operator reconstruct what changed or decide what to do next.',
      };
  }
}

function routePage(_surface: 'web' | 'app', answers: ScaffoldAnswers, route: RouteId): string {
  const blueprint = routeBlueprint(answers, route);
  const title = blueprint.label;
  return `'use client';

import {
  Card,
  CardContent,
  Separator,
} from '@shipshitdev/ui';

const metrics = ${JSON.stringify(blueprint.metrics, null, 2)} as const;
const queue = ${JSON.stringify(blueprint.queue, null, 2)} as const;
const signals = ${JSON.stringify(blueprint.signals, null, 2)} as const;

export default function ${title.replace(/\s+/g, '')}Page() {
  return (
    <>
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h1 className="text-base font-semibold text-primary">${title}</h1>
          <p className="text-xs text-muted">${blueprint.eyebrow} — ${truncateText(blueprint.summary, 80)}</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="flex flex-col gap-6 max-w-5xl">
          <div className="grid gap-4 sm:grid-cols-3">
            {metrics.map((metric) => (
              <Card key={metric.label} className="border-border bg-secondary">
                <CardContent className="p-5">
                  <div className="text-3xl font-semibold tracking-[-0.04em] text-primary">{metric.value}</div>
                  <div className="mt-1 text-[11px] font-medium tracking-[0.18em] text-muted uppercase">{metric.label}</div>
                  <div className="mt-2 text-[11px] leading-5 text-secondary">{metric.detail}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="rounded-lg border border-dashed border-border px-4 py-4">
            <p className="text-[12px] font-medium text-primary">${blueprint.alertTitle}</p>
            <p className="mt-0.5 text-[11px] text-secondary">${blueprint.alertDescription}</p>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <h2 className="mb-3 text-sm font-semibold text-primary">Route checklist</h2>
              <Card className="border-border bg-secondary">
                <CardContent className="divide-y divide-border p-0">
                  {queue.map((item, index) => (
                    <div key={item} className="flex items-start gap-3 px-4 py-3">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-border bg-tertiary font-mono text-[10px] tabular-nums text-muted">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <p className="text-[12px] leading-5 text-secondary">{item}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
            <div>
              <h2 className="mb-3 text-sm font-semibold text-primary">Signals</h2>
              <Card className="border-border bg-secondary">
                <CardContent className="divide-y divide-border p-0">
                  {signals.map((signal) => (
                    <div key={signal.title} className="px-4 py-3">
                      <p className="text-[12px] font-medium text-primary">{signal.title}</p>
                      <p className="mt-0.5 text-[11px] leading-5 text-secondary">{signal.detail}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
`;
}

function globalsCss(): string {
  return `@import "tailwindcss";
@source "../../../node_modules/@shipshitdev/ui/dist";

:root {
  --bg-primary: #050607;
  --bg-secondary: #0c0d10;
  --bg-tertiary: #131518;
  --bg-elevated: #1a1c21;
  --bg-hover: #20232a;
  --text-primary: #f4f4f5;
  --text-secondary: #b4b4bc;
  --text-muted: #6b6b78;
}

@theme {
  --color-border: rgba(255, 255, 255, 0.10);
  --color-border-strong: rgba(255, 255, 255, 0.18);
  --color-accent: #fafafa;
  --color-accent-hover: #e4e4e7;
  --color-accent-foreground: #050607;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
  --color-agent: #38bdf8;
  --color-done: #a855f7;
  --font-sans: "DM Sans", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", "SF Mono", monospace;
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 10px;
  --radius-xl: 16px;
}

@utility bg-primary { background-color: var(--bg-primary); }
@utility bg-secondary { background-color: var(--bg-secondary); }
@utility bg-tertiary { background-color: var(--bg-tertiary); }
@utility bg-elevated { background-color: var(--bg-elevated); }
@utility bg-hover { background-color: var(--bg-hover); }
@utility text-primary { color: var(--text-primary); }
@utility text-secondary { color: var(--text-secondary); }
@utility text-muted { color: var(--text-muted); }

* {
  box-sizing: border-box;
}

html {
  color-scheme: dark;
  background: var(--bg-primary);
}

body {
  min-height: 100vh;
  margin: 0;
  background:
    radial-gradient(circle at top, rgba(255, 255, 255, 0.04), transparent 40rem),
    var(--bg-primary);
  color: var(--text-primary);
}

a {
  color: inherit;
  text-decoration: none;
}

h1,
h2,
h3,
p {
  text-wrap: pretty;
}

::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--bg-hover); border-radius: 4px; }
`;
}

function appShell(_surface: 'web' | 'app', answers: ScaffoldAnswers): string {
  const navigation = answers.routes.map((route) => ({
    href: `/${route}`,
    label: routeTitle(route),
    caption: route,
  }));
  return `'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Button,
  Input,
} from '@shipshitdev/ui';
import { createPortal } from 'react-dom';

const navigation = ${JSON.stringify(navigation, null, 2)} as const;

function V0Logo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 6l5 12L15 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="20" cy="14" r="3.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [newTaskOpen, setNewTaskOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') { e.preventDefault(); setNewTaskOpen(true); }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      <div className="flex h-screen overflow-hidden">
        <aside className="flex w-[240px] shrink-0 flex-col border-r border-border bg-primary">
          <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <V0Logo />
            </div>
            <span className="text-sm font-semibold text-primary">${answers.projectName}</span>
          </div>

          <div className="px-2 space-y-0.5">
            <Button
              variant="ghost"
              onClick={() => setNewTaskOpen(true)}
              className="group h-auto w-full gap-2 py-2 text-[13px] font-normal"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              <span className="flex-1 text-left">New Task</span>
              <kbd className="hidden group-hover:inline font-mono text-[10px] text-muted">⌘N</kbd>
            </Button>
            <Button
              variant="ghost"
              onClick={() => setSearchOpen(true)}
              className="group h-auto w-full gap-2 py-2 text-[13px] font-normal"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
              <span className="flex-1 text-left">Search</span>
              <kbd className="hidden group-hover:inline font-mono text-[10px] text-muted">⌘K</kbd>
            </Button>
          </div>

          <div className="mt-3 px-2">
            <div className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted">Navigation</div>
            <nav className="mt-1.5 space-y-0.5">
              {navigation.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={[
                    'flex items-center justify-between rounded-md px-3 py-2 text-[13px] font-normal text-secondary transition hover:bg-hover hover:text-primary',
                    pathname === item.href ? 'bg-tertiary font-medium text-primary' : '',
                  ].join(' ')}
                >
                  <span>{item.label}</span>
                  <span className="font-mono text-[10px] text-muted">/{item.caption}</span>
                </a>
              ))}
            </nav>
          </div>

        </aside>

        <div className="flex flex-1 flex-col overflow-hidden bg-primary">
          {children}
        </div>
      </div>

      {searchOpen ? createPortal(
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]" onClick={() => setSearchOpen(false)}>
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg rounded-xl border border-border bg-primary shadow-2xl shadow-black/40" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-border p-3">
              <Input
                autoFocus
                placeholder="Search routes, actions, workspace..."
                className="border-0 bg-transparent text-sm text-primary placeholder:text-muted focus-visible:ring-0 focus-visible:outline-none"
              />
            </div>
            <div className="p-2">
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted">Routes</div>
              {navigation.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between rounded-md px-3 py-2 text-[13px] text-secondary transition hover:bg-hover hover:text-primary"
                  onClick={() => setSearchOpen(false)}
                >
                  <span>{item.label}</span>
                  <span className="font-mono text-[10px] text-muted">/{item.caption}</span>
                </a>
              ))}
            </div>
          </div>
        </div>,
        document.body,
      ) : null}

      {newTaskOpen ? createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setNewTaskOpen(false)}>
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-md rounded-xl border border-border bg-primary p-6 shadow-2xl shadow-black/40" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-primary">New Task</h2>
            <div className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">Title</label>
                <Input placeholder="What needs to be done?" className="border-border bg-secondary text-sm text-primary" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">Description</label>
                <textarea
                  placeholder="Context, acceptance criteria, links..."
                  rows={3}
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-border-strong"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setNewTaskOpen(false)}>Cancel</Button>
                <Button onClick={() => setNewTaskOpen(false)}>Create task</Button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
`;
}

function appLayout(_surface: 'web' | 'app', answers: ScaffoldAnswers): string {
  return `import type { Metadata } from 'next';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import './globals.css';
import { WorkspaceShell } from './workspace-shell';

export const metadata: Metadata = {
  title: '${titleCase(answers.projectName)}',
  description: 'Generated by @shipshitdev/v0',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <WorkspaceShell>{children}</WorkspaceShell>
      </body>
    </html>
  );
}
`;
}

function webLandingLayout(answers: ScaffoldAnswers): string {
  return `import type { Metadata } from 'next';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import './globals.css';

export const metadata: Metadata = {
  title: '${titleCase(answers.projectName)}',
  description: '${truncateText(answers.scope, 140)}',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`;
}

function webLandingPage(answers: ScaffoldAnswers): string {
  const appUrl = answers.apps.includes('app') ? 'http://localhost:3001' : '#waitlist';
  const surfaces = answers.apps.map((app) => ({
    label: `apps/${app}`,
    detail: app === 'web'
      ? 'Public landing page'
      : app === 'app'
        ? 'Product web app'
        : app === 'desktop'
          ? 'Desktop app wrapper'
          : app === 'mobile'
            ? 'Mobile app'
            : app === 'extension'
              ? 'Browser extension'
              : app === 'cli'
                ? 'Command line interface'
                : 'Documentation site',
  }));
  const routes = answers.routes.map((route) => ({
    label: routeTitle(route),
    href: `/${route}`,
  }));

  return `const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '${appUrl}';
const surfaces = ${JSON.stringify(surfaces, null, 2)} as const;
const routes = ${JSON.stringify(routes, null, 2)} as const;

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-primary text-primary">
      <section className="relative min-h-[92svh] px-6 py-6">
        <div className="absolute inset-0 opacity-60">
          <div className="h-full w-full bg-[linear-gradient(90deg,rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:44px_44px]" />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(0deg,var(--bg-primary),transparent)]" />

        <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between gap-4">
          <a href="/" className="flex min-h-10 items-center gap-2.5" aria-label="${answers.projectName} home">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-accent font-mono text-sm font-semibold text-accent-foreground">
              ${answers.projectName.slice(0, 2).toLowerCase()}
            </span>
            <span className="text-sm font-semibold text-secondary">${answers.projectName}</span>
          </a>
          <nav className="hidden items-center gap-2 sm:flex" aria-label="Landing navigation">
            <a className="rounded-md px-3 py-2 text-sm text-secondary transition hover:bg-hover hover:text-primary" href="#surfaces">Surfaces</a>
            <a className="rounded-md px-3 py-2 text-sm text-secondary transition hover:bg-hover hover:text-primary" href="#routes">Routes</a>
            <a className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover" href={appUrl}>Open app</a>
          </nav>
        </header>

        <div className="relative z-10 mx-auto grid max-w-6xl gap-10 pt-24 pb-16 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-end lg:pt-32">
          <div>
            <p className="font-mono text-xs font-semibold uppercase text-agent">Public launch surface</p>
            <h1 className="mt-5 max-w-3xl text-6xl font-semibold leading-none tracking-normal text-primary md:text-8xl">
              ${answers.projectName}
            </h1>
            <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-secondary md:text-xl">
              ${truncateText(answers.scope, 190)}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a className="rounded-md bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover" href={appUrl}>
                Open app
              </a>
              <a className="rounded-md border border-border px-4 py-3 text-sm font-semibold text-secondary transition hover:border-border-strong hover:bg-hover hover:text-primary" href="#surfaces">
                View surfaces
              </a>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-secondary p-4 shadow-2xl shadow-black/40 backdrop-blur">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-xs font-semibold uppercase text-muted">Product snapshot</span>
              <span className="rounded bg-tertiary px-2 py-1 font-mono text-[10px] text-agent">live scaffold</span>
            </div>
            <div className="grid grid-cols-2 gap-3 py-4">
              <div className="rounded-lg bg-tertiary p-4">
                <div className="text-3xl font-semibold">${String(answers.apps.length).padStart(2, '0')}</div>
                <div className="mt-1 text-xs text-muted">surfaces</div>
              </div>
              <div className="rounded-lg bg-tertiary p-4">
                <div className="text-3xl font-semibold">${String(answers.routes.length).padStart(2, '0')}</div>
                <div className="mt-1 text-xs text-muted">app routes</div>
              </div>
            </div>
            <div className="space-y-2">
              {surfaces.slice(0, 4).map((surface) => (
                <div key={surface.label} className="flex items-center justify-between rounded-md bg-primary px-3 py-2">
                  <span className="font-mono text-xs text-primary">{surface.label}</span>
                  <span className="text-xs text-muted">{surface.detail}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="surfaces" className="px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="font-mono text-xs font-semibold uppercase text-agent">Selected outputs</p>
            <h2 className="mt-3 text-3xl font-semibold text-primary md:text-4xl">Generated surfaces have separate jobs.</h2>
          </div>
          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {surfaces.map((surface) => (
              <article key={surface.label} className="rounded-lg border border-border bg-secondary p-5">
                <h3 className="font-mono text-sm text-primary">{surface.label}</h3>
                <p className="mt-2 text-sm leading-6 text-secondary">{surface.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="routes" className="px-6 py-16">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[320px_minmax(0,1fr)]">
          <div>
            <p className="font-mono text-xs font-semibold uppercase text-agent">App routes</p>
            <h2 className="mt-3 text-3xl font-semibold text-primary">The product app starts here.</h2>
            <p className="mt-4 text-sm leading-6 text-secondary">
              These routes are generated in apps/app. Wire this landing page to the deployed app URL with NEXT_PUBLIC_APP_URL.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {routes.map((route) => (
              <a key={route.href} href={appUrl} className="rounded-lg border border-border bg-secondary p-5 transition hover:border-border-strong hover:bg-hover">
                <span className="text-sm font-semibold text-primary">{route.label}</span>
                <span className="mt-2 block font-mono text-xs text-muted">apps/app{route.href}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <footer id="waitlist" className="border-t border-border px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>{new Date().getFullYear()} ${answers.projectName}</span>
          <span>Generated with @shipshitdev/v0</span>
        </div>
      </footer>
    </main>
  );
}
`;
}

async function writeNextApp(root: string, surface: 'web' | 'app', answers: ScaffoldAnswers): Promise<void> {
  const appRoot = `apps/${surface}`;
  const homeRoute = answers.routes[0] ?? 'overview';
  await writeJson(root, `${appRoot}/package.json`, {
    name: `@${answers.packageName}/${surface}`,
    version: '0.0.1',
    private: true,
    scripts: {
      dev: `next dev -p ${surface === 'web' ? 3000 : 3001}`,
      build: 'next build',
      typecheck: 'tsc --noEmit',
      lint: 'biome check app/',
      clean: 'rm -rf .next out',
    },
    dependencies: {
      '@fontsource/dm-sans': '5.2.8',
      '@shipshitdev/ui': UI_VERSION,
      next: '16.2.4',
      react: '19.2.5',
      'react-dom': '19.2.5',
    },
    devDependencies: {
      '@tailwindcss/postcss': '4.2.4',
      '@types/node': '25.6.0',
      '@types/react': '19.2.14',
      '@types/react-dom': '19.2.3',
      tailwindcss: '4.2.4',
      typescript: '6.0.3',
    },
  });
  await writeFile(root, `${appRoot}/next.config.ts`, `import type { NextConfig } from 'next';\n\nconst config: NextConfig = {};\n\nexport default config;\n`);
  await writeFile(root, `${appRoot}/next-env.d.ts`, `/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n\n// This file is generated by @shipshitdev/v0.\n`);
  await writeJson(root, `${appRoot}/tsconfig.json`, {
    extends: '../../tsconfig.json',
    compilerOptions: {
      plugins: [{ name: 'next' }],
      jsx: 'preserve',
      allowJs: true,
      incremental: true,
    },
    include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
    exclude: ['node_modules'],
  });
  await writeFile(root, `${appRoot}/postcss.config.mjs`, `export default {\n  plugins: {\n    '@tailwindcss/postcss': {},\n  },\n};\n`);
  await writeFile(root, `${appRoot}/app/globals.css`, globalsCss());

  if (surface === 'web') {
    await writeFile(root, `${appRoot}/app/layout.tsx`, webLandingLayout(answers));
    await writeFile(root, `${appRoot}/app/page.tsx`, webLandingPage(answers));
  } else {
    await writeFile(root, `${appRoot}/app/workspace-shell.tsx`, appShell(surface, answers));
    await writeFile(root, `${appRoot}/app/layout.tsx`, appLayout(surface, answers));
    await writeFile(root, `${appRoot}/app/page.tsx`, `import { redirect } from 'next/navigation';\n\nexport default function Home() {\n  redirect('/${homeRoute}');\n}\n`);
    for (const route of answers.routes) {
      await writeFile(root, `${appRoot}/app/${route}/page.tsx`, routePage(surface, answers, route));
    }
  }
}

function reactApp(_surface: AppSurface, answers: ScaffoldAnswers): string {
  const routes = answers.routes.map((route) => routeBlueprint(answers, route));
  return `import {
  Button,
  Card,
  CardContent,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@shipshitdev/ui';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const routes = ${JSON.stringify(routes, null, 2)} as const;

function V0Logo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 6l5 12L15 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="20" cy="14" r="3.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function App() {
  const [activeRoute, setActiveRoute] = useState<(typeof routes)[number]['id']>('${answers.routes[0] ?? 'overview'}');
  const active = routes.find((route) => route.id === activeRoute) ?? routes[0];
  const [searchOpen, setSearchOpen] = useState(false);
  const [newTaskOpen, setNewTaskOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') { e.preventDefault(); setNewTaskOpen(true); }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      <div className="flex h-screen overflow-hidden bg-primary text-primary">
        <aside className="flex w-[240px] shrink-0 flex-col border-r border-border bg-primary">
          <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <V0Logo />
            </div>
            <span className="text-sm font-semibold text-primary">${answers.projectName}</span>
          </div>

          <div className="px-2 space-y-0.5">
            <Button
              variant="ghost"
              onClick={() => setNewTaskOpen(true)}
              className="group h-auto w-full gap-2 py-2 text-[13px] font-normal"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              <span className="flex-1 text-left">New Task</span>
              <kbd className="hidden group-hover:inline font-mono text-[10px] text-muted">⌘N</kbd>
            </Button>
            <Button
              variant="ghost"
              onClick={() => setSearchOpen(true)}
              className="group h-auto w-full gap-2 py-2 text-[13px] font-normal"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
              <span className="flex-1 text-left">Search</span>
              <kbd className="hidden group-hover:inline font-mono text-[10px] text-muted">⌘K</kbd>
            </Button>
          </div>

          <div className="mt-3 px-2">
            <div className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted">Navigation</div>
            <nav className="mt-1.5 space-y-0.5">
              {routes.map((route) => (
                <Button
                  key={route.id}
                  variant="ghost"
                  onClick={() => setActiveRoute(route.id)}
                  className={[
                    'h-auto w-full justify-between py-2 text-[13px] font-normal',
                    activeRoute === route.id ? 'bg-tertiary font-medium text-primary' : '',
                  ].join(' ')}
                >
                  <span>{route.label}</span>
                  <span className="font-mono text-[10px] text-muted">/{route.id}</span>
                </Button>
              ))}
            </nav>
          </div>

        </aside>

        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div>
              <h1 className="text-base font-semibold text-primary">{active.label}</h1>
              <p className="text-xs text-muted">{active.eyebrow}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <Tabs value={activeRoute} onValueChange={(value) => setActiveRoute(value as (typeof routes)[number]['id'])}>
              <div className="border-b border-border px-6">
                <TabsList className="h-auto gap-0 rounded-none border-0 bg-transparent p-0">
                  {routes.map((route) => (
                    <TabsTrigger
                      key={route.id}
                      value={route.id}
                      className="rounded-none border-b-2 border-transparent px-3 py-2.5 text-[13px] font-medium text-muted data-[state=active]:border-accent data-[state=active]:text-primary"
                    >
                      {route.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              {routes.map((route) => (
                <TabsContent key={route.id} value={route.id} className="px-6 py-6">
                  <div className="flex flex-col gap-6 max-w-5xl">
                    <p className="text-sm leading-6 text-secondary max-w-2xl">{route.summary}</p>
                    <div className="grid gap-4 sm:grid-cols-3">
                      {route.metrics.map((metric) => (
                        <Card key={metric.label} className="border-border bg-secondary">
                          <CardContent className="p-5">
                            <div className="text-3xl font-semibold tracking-[-0.04em] text-primary">{metric.value}</div>
                            <div className="mt-1 text-[11px] font-medium tracking-[0.18em] text-muted uppercase">{metric.label}</div>
                            <div className="mt-2 text-[11px] leading-5 text-secondary">{metric.detail}</div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <div>
                        <h2 className="mb-3 text-sm font-semibold text-primary">Route checklist</h2>
                        <Card className="border-border bg-secondary">
                          <CardContent className="divide-y divide-border p-0">
                            {route.queue.map((item, index) => (
                              <div key={item} className="flex items-start gap-3 px-4 py-3">
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-border bg-tertiary font-mono text-[10px] tabular-nums text-muted">
                                  {String(index + 1).padStart(2, '0')}
                                </span>
                                <p className="text-[12px] leading-5 text-secondary">{item}</p>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      </div>
                      <div>
                        <h2 className="mb-3 text-sm font-semibold text-primary">Signals</h2>
                        <Card className="border-border bg-secondary">
                          <CardContent className="divide-y divide-border p-0">
                            {route.signals.map((signal) => (
                              <div key={signal.title} className="px-4 py-3">
                                <p className="text-[12px] font-medium text-primary">{signal.title}</p>
                                <p className="mt-0.5 text-[11px] leading-5 text-secondary">{signal.detail}</p>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </div>
      </div>

      {searchOpen ? createPortal(
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]" onClick={() => setSearchOpen(false)}>
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg rounded-xl border border-border bg-primary shadow-2xl shadow-black/40" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-border p-3">
              <Input
                autoFocus
                placeholder="Search routes, actions, workspace..."
                className="border-0 bg-transparent text-sm text-primary placeholder:text-muted focus-visible:ring-0 focus-visible:outline-none"
              />
            </div>
            <div className="p-2">
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted">Routes</div>
              {routes.map((route) => (
                <Button
                  key={route.id}
                  variant="ghost"
                  onClick={() => { setActiveRoute(route.id); setSearchOpen(false); }}
                  className="h-auto w-full justify-between py-2 text-[13px]"
                >
                  <span>{route.label}</span>
                  <span className="font-mono text-[10px] text-muted">/{route.id}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>,
        document.body,
      ) : null}

      {newTaskOpen ? createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setNewTaskOpen(false)}>
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-md rounded-xl border border-border bg-primary p-6 shadow-2xl shadow-black/40" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-primary">New Task</h2>
            <div className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">Title</label>
                <Input placeholder="What needs to be done?" className="border-border bg-secondary text-sm text-primary" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">Description</label>
                <textarea
                  placeholder="Context, acceptance criteria, links..."
                  rows={3}
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-border-strong"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setNewTaskOpen(false)}>Cancel</Button>
                <Button onClick={() => setNewTaskOpen(false)}>Create task</Button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
`;
}

async function writeElectronApp(root: string, answers: ScaffoldAnswers): Promise<void> {
  const appRoot = 'apps/desktop';
  await writeJson(root, `${appRoot}/package.json`, {
    name: `@${answers.packageName}/desktop`,
    version: '0.0.1',
    private: true,
    main: './out/main/index.js',
    scripts: {
      dev: 'electron-vite dev',
      build: 'electron-vite build',
      typecheck: 'tsc --noEmit',
      lint: 'biome check src/',
      clean: 'rm -rf out dist',
    },
    dependencies: {},
    devDependencies: {
      electron: '41.3.0',
      'electron-vite': '5.0.0',
      typescript: '6.0.3',
    },
  });

  await writeFile(root, `${appRoot}/electron-vite.config.ts`, `import { defineConfig, externalizeDepsPlugin } from 'electron-vite';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {},
});
`);

  await writeFile(root, `${appRoot}/src/main/index.ts`, `import { app, BrowserWindow } from 'electron';
import { join } from 'path';

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1080,
    height: 720,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#050607',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: app.isPackaged,
    },
  });

  const appUrl = process.env['APP_URL'] ?? process.env['ELECTRON_RENDERER_URL'] ?? 'http://localhost:3001';

  if (!app.isPackaged || process.env['APP_URL']) {
    win.loadURL(appUrl);
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
`);

  await writeFile(root, `${appRoot}/src/preload/index.ts`, `import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('api', {
  platform: process.platform,
});
`);

  await writeFile(root, `${appRoot}/src/renderer/index.html`, `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
    <title>${answers.projectName}</title>
  </head>
  <body style="margin:0;background:#050607;color:#f4f4f5;font-family:'DM Sans',system-ui,sans-serif;">
    <main style="display:grid;min-height:100vh;place-items:center;padding:32px;text-align:center;">
      <div>
        <p style="margin:0 0 12px;color:#38bdf8;font:600 12px monospace;text-transform:uppercase;">Desktop shell</p>
        <h1 style="margin:0;font-size:32px;">${answers.projectName}</h1>
        <p style="margin:12px auto 0;max-width:420px;color:#b4b4bc;line-height:1.6;">
          Start apps/app and set APP_URL to embed the deployed product app in this desktop shell.
        </p>
      </div>
    </main>
  </body>
</html>
`);

  await writeJson(root, `${appRoot}/tsconfig.json`, {
    compilerOptions: {
      target: 'ESNext',
      module: 'ESNext',
      moduleResolution: 'bundler',
      strict: true,
      skipLibCheck: true,
    },
    include: ['src/main/**/*.ts', 'src/preload/**/*.ts', 'electron-vite.config.ts'],
  });
}

async function writeExpoApp(root: string, answers: ScaffoldAnswers): Promise<void> {
  const appRoot = 'apps/mobile';
  await writeJson(root, `${appRoot}/package.json`, {
    name: `@${answers.packageName}/mobile`,
    version: '0.0.1',
    private: true,
    main: 'expo-router/entry',
    scripts: {
      dev: 'expo start',
      android: 'expo start --android',
      ios: 'expo start --ios',
      web: 'expo start --web',
      typecheck: 'tsc --noEmit',
      lint: 'biome check app/',
      clean: 'rm -rf .expo dist',
    },
    dependencies: {
      expo: '~55.0.17',
      'expo-router': '~55.0.13',
      'expo-status-bar': '~55.0.5',
      react: '19.2.0',
      'react-native': '0.83.6',
      'react-native-safe-area-context': '~5.6.2',
      'react-native-screens': '~4.23.0',
      'react-native-reanimated': '4.2.1',
      'react-native-css': '3.0.7',
      nativewind: '5.0.0-preview.3',
    },
    devDependencies: {
      '@tailwindcss/postcss': '4.2.4',
      '@types/react': '19.2.14',
      'babel-preset-expo': '~55.0.9',
      postcss: '8.5.5',
      tailwindcss: '4.2.4',
      typescript: '~5.9.2',
    },
  });

  await writeJson(root, `${appRoot}/app.json`, {
    expo: {
      name: answers.projectName,
      slug: answers.packageName,
      scheme: answers.packageName,
      version: '1.0.0',
      platforms: ['ios', 'android', 'web'],
      newArchEnabled: true,
    },
  });

  await writeFile(root, `${appRoot}/metro.config.js`, `const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativewind } = require('nativewind/metro');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);
config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

module.exports = withNativewind(config);
`);

  await writeFile(root, `${appRoot}/babel.config.js`, `module.exports = function (api) {
  api.cache(true);
  return { presets: ['babel-preset-expo'] };
};
`);

  await writeFile(root, `${appRoot}/global.css`, `@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/preflight.css" layer(base);
@import "tailwindcss/utilities.css";
@import "nativewind/theme";
`);

  await writeFile(root, `${appRoot}/nativewind-env.d.ts`, `/// <reference types="nativewind/types" />
`);

  await writeFile(root, `${appRoot}/app/_layout.tsx`, `import '../global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#050607' },
          headerTintColor: '#f4f4f5',
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: '#050607' },
        }}
      />
    </>
  );
}
`);

  await writeFile(root, `${appRoot}/app/index.tsx`, `import { Link } from 'expo-router';
import { View, Text, Pressable, ScrollView } from 'react-native';

const routes = ${JSON.stringify(answers.routes.map((r) => ({ id: r, label: routeTitle(r) })), null, 2)} as const;

export default function HomeScreen() {
  return (
    <ScrollView className="flex-1 bg-[#050607]">
      <View className="px-5 pt-12 pb-6">
        <Text className="text-2xl font-bold text-[#f4f4f5]">${answers.projectName}</Text>
        <Text className="mt-1 text-sm text-[#6b6b78]">${truncateText(answers.scope, 100)}</Text>
      </View>
      <View className="px-5 gap-2">
        {routes.map((route) => (
          <Link key={route.id} href={\`/\${route.id}\`} asChild>
            <Pressable className="flex-row items-center justify-between rounded-xl bg-[#0c0d10] px-4 py-4 active:bg-[#131518]">
              <Text className="text-[15px] font-medium text-[#f4f4f5]">{route.label}</Text>
              <Text className="text-xs font-mono text-[#6b6b78]">/{route.id}</Text>
            </Pressable>
          </Link>
        ))}
      </View>
    </ScrollView>
  );
}
`);

  for (const route of answers.routes) {
    const blueprint = routeBlueprint(answers, route);
    await writeFile(root, `${appRoot}/app/${route}.tsx`, `import { View, Text, ScrollView } from 'react-native';

export default function ${titleCase(route).replace(/\s/g, '')}Screen() {
  return (
    <ScrollView className="flex-1 bg-[#050607]">
      <View className="px-5 pt-6 pb-4">
        <Text className="text-xs font-semibold uppercase tracking-widest text-[#38bdf8]">${blueprint.eyebrow}</Text>
        <Text className="mt-2 text-xl font-bold text-[#f4f4f5]">${blueprint.label}</Text>
        <Text className="mt-1 text-sm text-[#b4b4bc]">${truncateText(blueprint.summary, 120)}</Text>
      </View>
      <View className="px-5 flex-row gap-3 mt-2">
${blueprint.metrics.map((m) => `        <View className="flex-1 rounded-xl bg-[#0c0d10] p-4">
          <Text className="text-lg font-bold text-[#f4f4f5]">${m.value}</Text>
          <Text className="mt-1 text-xs text-[#6b6b78]">${m.label}</Text>
        </View>`).join('\n')}
      </View>
      <View className="px-5 mt-6 gap-3">
${blueprint.signals.map((s) => `        <View className="rounded-xl border border-white/10 bg-[#0c0d10] p-4">
          <Text className="text-sm font-semibold text-[#f4f4f5]">${s.title}</Text>
          <Text className="mt-1 text-xs text-[#b4b4bc]">${s.detail}</Text>
        </View>`).join('\n')}
      </View>
    </ScrollView>
  );
}
`);
  }

  await writeJson(root, `${appRoot}/tsconfig.json`, {
    extends: 'expo/tsconfig.base',
    compilerOptions: {
      strict: true,
    },
    include: ['**/*.ts', '**/*.tsx', '.expo/types/**/*.ts', 'nativewind-env.d.ts'],
  });
}

async function writePlasmoApp(root: string, answers: ScaffoldAnswers): Promise<void> {
  const appRoot = 'apps/extension';
  await writeJson(root, `${appRoot}/package.json`, {
    name: `@${answers.packageName}/extension`,
    displayName: `${answers.projectName} Extension`,
    version: '0.0.1',
    private: true,
    scripts: {
      dev: 'plasmo dev',
      build: 'plasmo build',
      package: 'plasmo package',
      typecheck: 'tsc --noEmit',
      lint: 'biome check .',
      clean: 'rm -rf build .plasmo',
    },
    dependencies: {
      plasmo: '0.90.5',
      react: '19.2.5',
      'react-dom': '19.2.5',
    },
    devDependencies: {
      '@types/chrome': '0.1.40',
      '@types/react': '19.2.14',
      '@types/react-dom': '19.2.3',
      autoprefixer: '10.4.21',
      postcss: '8.5.5',
      tailwindcss: '3.4.19',
      typescript: '6.0.3',
    },
    manifest: {
      host_permissions: ['<all_urls>'],
      permissions: ['storage', 'tabs'],
    },
  });

  await writeFile(root, `${appRoot}/postcss.config.js`, `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`);

  await writeFile(root, `${appRoot}/tailwind.config.js`, `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./*.tsx', './src/**/*.tsx'],
  theme: {
    extend: {},
  },
  plugins: [],
};
`);

  await writeFile(root, `${appRoot}/style.css`, `@tailwind base;
@tailwind components;
@tailwind utilities;
`);

  await writeFile(root, `${appRoot}/popup.tsx`, `import './style.css';

const routes = ${JSON.stringify(answers.routes.map((r) => ({ id: r, label: routeTitle(r) })), null, 2)} as const;

function Popup() {
  return (
    <div className="w-80 bg-[#050607] p-4 font-sans text-[#f4f4f5]">
      <div className="flex items-center gap-2 pb-3 border-b border-white/10">
        <div className="grid h-7 w-7 place-items-center rounded-md bg-[#fafafa] text-[11px] font-semibold text-[#050607] font-mono">v0</div>
        <span className="text-sm font-semibold">${answers.projectName}</span>
      </div>
      <div className="mt-3 space-y-1">
        {routes.map((route) => (
          <button
            key={route.id}
            type="button"
            className="flex w-full items-center justify-between rounded-md px-3 py-2 text-[13px] text-[#b4b4bc] transition hover:bg-[#131518] hover:text-[#f4f4f5]"
          >
            <span>{route.label}</span>
            <span className="font-mono text-[10px] text-[#6b6b78]">/{route.id}</span>
          </button>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-white/10 text-[11px] text-[#6b6b78]">
        ${truncateText(answers.scope, 80)}
      </div>
    </div>
  );
}

export default Popup;
`);

  await writeFile(root, `${appRoot}/background.ts`, `export {};

chrome.runtime.onInstalled.addListener(() => {
  // Extension installed
});
`);

  await writeFile(root, `${appRoot}/global.d.ts`, `/// <reference types="chrome" />

declare module '*.css';
`);

  // Minimal 128x128 white square PNG — programmatically generated
  const iconBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAIAAABMXPacAAABKklEQVR4nO3RMQ0AAAjAMPybBhk9WBUs2Wyo0QHfNQBrANYArAFYA7AGYA3AGoA1AGsA1gCsAVgDsAZgDcAagDUAawDWAKwBWAOwBmANwBqANQBrANYArAFYA7AGYA3AGoA1AGsA1gCsAVgDsAZgDcAagDUAawDWAKwBWAOwBmANwBqANQBrANYArAFYA7AGYA3AGoA1AGsA1gCsAVgDsAZgDcAagDUAawDWAKwBWAOwBmANwBqANQBrANYArAFYA7AGYA3AGoA1AGsA1gCsAVgDsAZgDcAagDUAawDWAKwBWAOwBmANwBqANQBrANYArAFYA7AGYA3AGoA1AGsA1gCsAVgDsAZgDcAagDUAawDWAKwBWAOwBmANwBqANQBrANYArAFYA7AGYAeU6UsysMvN4wAAAABJRU5ErkJggg==';
  const iconBuffer = Buffer.from(iconBase64, 'base64');
  const iconPath = path.join(root, appRoot, 'assets', 'icon.png');
  await fs.mkdir(path.dirname(iconPath), { recursive: true });
  await fs.writeFile(iconPath, iconBuffer);

  await writeJson(root, `${appRoot}/tsconfig.json`, {
    extends: 'plasmo/templates/tsconfig.base',
    exclude: ['node_modules'],
    include: ['.plasmo/index.d.ts', './**/*.ts', './**/*.tsx'],
    compilerOptions: {
      ignoreDeprecations: '6.0',
      types: ['chrome'],
      paths: { '~*': ['./*'] },
    },
  });
}

async function writeCliApp(root: string, answers: ScaffoldAnswers): Promise<void> {
  const appRoot = 'apps/cli';
  await writeJson(root, `${appRoot}/package.json`, {
    name: `@${answers.packageName}/cli`,
    version: '0.0.1',
    private: true,
    type: 'module',
    bin: { [answers.packageName]: './dist/index.js' },
    scripts: {
      dev: 'tsx src/index.ts',
      build: 'tsup src/index.ts --format esm --dts',
      typecheck: 'tsc --noEmit',
      lint: 'biome check src/',
      clean: 'rm -rf dist',
    },
    dependencies: {
      commander: '14.0.3',
    },
    devDependencies: {
      tsup: '8.5.1',
      tsx: '4.21.0',
      typescript: '6.0.3',
    },
  });

  await writeFile(root, `${appRoot}/src/index.ts`, `#!/usr/bin/env node
import { Command } from 'commander';

const program = new Command()
  .name('${answers.packageName}')
  .description('${truncateText(answers.scope, 80)}')
  .version('0.0.1');

${answers.routes.map((route) => `program
  .command('${route}')
  .description('${routeTitle(route)}')
  .action(() => {
    process.stdout.write('${routeTitle(route)} — not yet implemented\\n');
  });
`).join('\n')}
program.parse();

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
`);

  await writeJson(root, `${appRoot}/tsconfig.json`, {
    extends: '../../tsconfig.json',
    compilerOptions: {
      module: 'ESNext',
      moduleResolution: 'bundler',
      outDir: 'dist',
    },
    include: ['src'],
  });
}

async function writeDocsApp(root: string, answers: ScaffoldAnswers): Promise<void> {
  const appRoot = 'apps/docs';
  await writeJson(root, `${appRoot}/package.json`, {
    name: `@${answers.packageName}/docs`,
    version: '0.0.1',
    private: true,
    type: 'module',
    scripts: {
      dev: 'next dev -p 3003',
      build: 'next build',
      typecheck: 'tsc --noEmit',
      lint: 'biome check app/ content/ mdx-components.tsx next.config.mjs',
      clean: 'rm -rf .next out',
    },
    dependencies: {
      next: '16.2.4',
      nextra: '4.6.1',
      'nextra-theme-docs': '4.6.1',
      react: '19.2.5',
      'react-dom': '19.2.5',
    },
    devDependencies: {
      '@types/mdx': '2.0.13',
      '@types/node': '25.6.0',
      '@types/react': '19.2.14',
      '@types/react-dom': '19.2.3',
      typescript: '6.0.3',
    },
  });

  await writeFile(root, `${appRoot}/next.config.mjs`, `import nextra from 'nextra';

const withNextra = nextra({});

export default withNextra({
  turbopack: {
    resolveAlias: {
      'next-mdx-import-source-file': './mdx-components.tsx',
    },
  },
});
`);

  await writeFile(root, `${appRoot}/next-env.d.ts`, `/// <reference types="next" />
/// <reference types="next/image-types/global" />

// This file is generated by @shipshitdev/v0.
`);

  await writeFile(root, `${appRoot}/mdx-components.tsx`, `import type { MDXComponents } from 'mdx/types';
import { useMDXComponents as getThemeComponents } from 'nextra-theme-docs';

const themeComponents = getThemeComponents();

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...themeComponents,
    ...components,
  };
}
`);

  await writeFile(root, `${appRoot}/app/layout.tsx`, `import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Banner, Head } from 'nextra/components';
import { getPageMap } from 'nextra/page-map';
import { Footer, Layout, Navbar } from 'nextra-theme-docs';
import 'nextra-theme-docs/style.css';

export const metadata: Metadata = {
  title: '${titleCase(answers.projectName)} Docs',
  description: '${truncateText(answers.scope, 140)}',
};

const banner = <Banner storageKey="${answers.packageName}-docs-banner">Documentation scaffold</Banner>;
const navbar = <Navbar logo={<b>${answers.projectName}</b>} projectLink="https://github.com/shipshitdev/v0" />;
const footer = <Footer>{new Date().getFullYear()} © ${answers.projectName}.</Footer>;

export default async function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head />
      <body>
        <Layout
          banner={banner}
          navbar={navbar}
          pageMap={await getPageMap()}
          docsRepositoryBase="https://github.com/shipshitdev/v0/tree/main/apps/docs"
          footer={footer}
        >
          {children}
        </Layout>
      </body>
    </html>
  );
}
`);

  await writeFile(root, `${appRoot}/app/[[...mdxPath]]/page.tsx`, `import type { ComponentType, ReactNode } from 'react';
import { generateStaticParamsFor, importPage } from 'nextra/pages';
import { useMDXComponents as getMDXComponents } from '../../mdx-components';

export const generateStaticParams = generateStaticParamsFor('mdxPath');

export async function generateMetadata(props: { params: Promise<{ mdxPath?: string[] }> }) {
  const params = await props.params;
  const { metadata } = await importPage(params.mdxPath);
  return metadata;
}

const Wrapper = getMDXComponents({}).wrapper as ComponentType<{
  toc: unknown;
  metadata: unknown;
  sourceCode: string;
  children: ReactNode;
}>;

export default async function Page(props: { params: Promise<{ mdxPath?: string[] }> }) {
  const params = await props.params;
  const { default: MDXContent, toc, metadata, sourceCode } = await importPage(params.mdxPath);
  return (
    <Wrapper toc={toc} metadata={metadata} sourceCode={sourceCode}>
      <MDXContent {...props} params={params} />
    </Wrapper>
  );
}
`);

  await writeFile(root, `${appRoot}/content/index.mdx`, `---
title: ${answers.projectName}
description: ${truncateText(answers.scope, 140)}
---

# ${answers.projectName}

${answers.scope}

## Surfaces

${answers.apps.map((app) => `- \`apps/${app}\``).join('\n')}

## Product Routes

${answers.routes.map((route) => `- \`/${route}\` - ${routeTitle(route)}`).join('\n')}
`);

  await writeFile(root, `${appRoot}/content/get-started.mdx`, `---
title: Get Started
description: Local development commands for ${answers.projectName}.
---

# Get Started

Install dependencies from the repo root:

\`\`\`bash
bun install
\`\`\`

Start the documentation site:

\`\`\`bash
bun run dev:docs
\`\`\`

Start the product app:

\`\`\`bash
bun run dev:app
\`\`\`
`);

  await writeFile(root, `${appRoot}/content/_meta.ts`, `export default {
  index: 'Introduction',
  'get-started': 'Get Started',
};
`);

  await writeJson(root, `${appRoot}/tsconfig.json`, {
    extends: '../../tsconfig.json',
    compilerOptions: {
      plugins: [{ name: 'next' }],
      jsx: 'preserve',
      allowJs: true,
      incremental: true,
    },
    include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '**/*.mdx', '.next/types/**/*.ts'],
    exclude: ['node_modules'],
  });
}

function scopeMarkdown(answers: ScaffoldAnswers): string {
  return `# ${answers.projectName}

## Scope

${answers.scope}

## App Surfaces

${answers.apps.map((app) => `- apps/${app}`).join('\n')}

## Default Routes

${answers.routes.map((route) => `- /${route} - ${routeTitle(route)}`).join('\n')}

## Scaffold Agent

${answers.agent}
`;
}

async function prepareTarget(root: string): Promise<void> {
  await fs.mkdir(root, { recursive: true });
  const existing = (await fs.readdir(root)).filter((entry) => entry !== '.git');
  if (existing.length > 0) {
    throw new Error(`Target directory is not empty: ${root}`);
  }
}

function surfaceFramework(app: AppSurface): string {
  if (app === 'web') return 'landing page';
  if (app === 'app') return 'Next.js app';
  if (app === 'desktop') return 'Electron embedded web app';
  if (app === 'mobile') return 'Expo';
  if (app === 'extension') return 'Plasmo';
  if (app === 'cli') return 'CLI';
  if (app === 'docs') return 'Nextra docs';
  return 'React';
}

function appDevScripts(apps: readonly AppSurface[]): Record<string, string> {
  return Object.fromEntries(apps.map((app) => [`dev:${app}`, `bun run --cwd apps/${app} dev`]));
}

function appScriptDescription(app: AppSurface): string {
  if (app === 'web') return 'starts the public landing page at http://localhost:3000';
  if (app === 'app') return 'starts the product web app at http://localhost:3001';
  if (app === 'desktop') return 'starts the Electron shell that embeds apps/app';
  if (app === 'mobile') return 'starts the Expo dev server';
  if (app === 'extension') return 'starts the Plasmo extension dev server';
  if (app === 'cli') return 'runs the CLI in dev mode';
  if (app === 'docs') return 'starts the Nextra docs site at http://localhost:3003';
  return `starts apps/${app}`;
}

function appScriptLines(apps: readonly AppSurface[]): string {
  return apps.map((app) => `- \`bun run dev:${app}\` - ${appScriptDescription(app)}`).join('\n');
}

function startCommand(apps: readonly AppSurface[]): string {
  return apps.includes('web') ? 'bun run dev:web' : `bun run dev:${apps[0] ?? 'web'}`;
}

async function writeWorkspaceFiles(root: string, answers: ScaffoldAnswers): Promise<void> {
  await writeJson(root, 'package.json', {
    name: `@${answers.packageName}/monorepo`,
    private: true,
    packageManager: 'bun@1.3.13',
    workspaces: ['apps/*', 'packages/*'],
    scripts: {
      build: 'turbo run build',
      dev: 'turbo run dev',
      ...appDevScripts(answers.apps),
      typecheck: 'turbo run typecheck',
      lint: 'turbo run lint',
      'lint:fix': 'bunx biome check --write .',
      'format:check': 'bunx biome check . --linter-enabled=false --assist-enabled=false --files-ignore-unknown=true',
      postinstall: 'test -d node_modules/@shipshitdev/ui || (src=$(ls -d node_modules/.bun/@shipshitdev+ui@*/node_modules/@shipshitdev/ui 2>/dev/null | head -1) && [ -n "$src" ] && mkdir -p node_modules/@shipshitdev && ln -s "$(cd "$src" && pwd)" node_modules/@shipshitdev/ui) || true',
      'deps:update': 'bun update --latest',
      clean: 'turbo run clean',
    },
    devDependencies: {
      '@biomejs/biome': '2.4.12',
      '@types/node': '25.6.0',
      turbo: '2.9.6',
      typescript: '6.0.3',
    },
  });
  await writeJson(root, 'turbo.json', {
    $schema: 'https://turbo.build/schema.json',
    tasks: {
      build: {
        dependsOn: ['^build'],
        outputs: ['dist/**', '.next/**', 'out/**'],
      },
      dev: {
        cache: false,
        persistent: true,
      },
      typecheck: {
        dependsOn: ['^build'],
      },
      lint: {},
      'deps:update': {
        cache: false,
      },
      clean: {
        cache: false,
      },
    },
  });
  await writeJson(root, 'tsconfig.json', {
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'bundler',
      jsx: 'react-jsx',
      strict: true,
      esModuleInterop: true,
      forceConsistentCasingInFileNames: true,
      skipLibCheck: true,
      noEmit: true,
      isolatedModules: true,
      types: ['node'],
      ignoreDeprecations: '5.0',
    },
    exclude: ['node_modules', 'dist', '.next', 'out'],
  });
  await writeFile(root, '.gitignore', `node_modules\n.turbo\n.next\ndist\nout\n.env\n.env.*\n!.env.example\n`);
  await writeFile(root, '.editorconfig', `# Editor configuration, see https://editorconfig.org
root = true

[*]
charset = utf-8
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true
quote_type = single

[*.md]
max_line_length = off
trim_trailing_whitespace = false
`);
  await writeJson(root, 'biome.json', {
    $schema: 'https://biomejs.dev/schemas/2.4.12/schema.json',
    assist: { actions: { source: { organizeImports: 'on' } } },
    css: { parser: { cssModules: true, tailwindDirectives: true } },
    files: {
      includes: [
        '**',
        '!**/node_modules',
        '!**/.next',
        '!**/.turbo',
        '!**/dist',
        '!**/build',
        '!**/out',
        '!**/coverage',
        '!**/*.snap',
        '!**/bun.lock',
        '!**/.env',
        '!**/.env.*',
        '!.agents',
      ],
    },
    formatter: { enabled: true, indentStyle: 'space', indentWidth: 2, lineWidth: 100 },
    javascript: {
      formatter: { quoteStyle: 'single', semicolons: 'always', trailingCommas: 'all' },
      parser: { unsafeParameterDecoratorsEnabled: true },
    },
    linter: { enabled: true, rules: { a11y: { noLabelWithoutControl: 'off' }, recommended: true } },
  });
  await writeFile(root, 'README.md', `# ${answers.projectName}\n\nGenerated with \`@shipshitdev/v0\`.\n\n## Start\n\n\`\`\`bash\nbun install\n${startCommand(answers.apps)}\n\`\`\`\n\n## App Scripts\n\n${appScriptLines(answers.apps)}\n\n## Update Dependencies\n\n\`\`\`bash\nbun run deps:update\n\`\`\`\n\n## Agent Workspace\n\n- \`.agents/skills\` - source of truth for selected dev workflow skills\n- \`.agents/memory\` - source of truth for project memory\n- \`.claude/skills\` and \`.claude/memory\` - relative symlinks into \`.agents\`\n- \`.codex/skills\` and \`.codex/memory\` - relative symlinks into \`.agents\`\n- \`skills\` - selected repo workflow skills for PRDs, planning, execution, review, and verification\n\n## Scope\n\n${answers.scope}\n`);
}

async function writeV0Metadata(root: string, answers: ScaffoldAnswers): Promise<void> {
  await writeFile(root, '.v0/scope.md', scopeMarkdown(answers));
  await writeFile(root, '.v0/agent-prompt.md', buildAgentPrompt(answers));
}

async function writePackagesWorkspace(root: string): Promise<void> {
  await writeFile(root, 'packages/.gitkeep', '');
}

async function writeAgentWorkspace(root: string, answers: ScaffoldAnswers): Promise<void> {
  await copySelectedSkills(selectedAgentSkills, answers, path.join(root, '.agents', 'skills'));
  await writeFile(root, '.agents/memory/.gitkeep', '');
  await fs.mkdir(path.join(root, '.claude'), { recursive: true });
  await fs.mkdir(path.join(root, '.codex'), { recursive: true });

  await symlinkOrSkip('../.agents/skills', path.join(root, '.claude', 'skills'));
  await symlinkOrSkip('../.agents/memory', path.join(root, '.claude', 'memory'));
  await symlinkOrSkip('../.agents/skills', path.join(root, '.codex', 'skills'));
  await symlinkOrSkip('../.agents/memory', path.join(root, '.codex', 'memory'));
}

async function writeRepoSkills(root: string, answers: ScaffoldAnswers): Promise<void> {
  await copySelectedSkills(selectedRepoSkills, answers, path.join(root, 'skills'));
}

async function copySelectedSkills(
  selectSkills: (answers: ScaffoldAnswers) => string[],
  answers: ScaffoldAnswers,
  targetRoot: string,
): Promise<void> {
  await fs.mkdir(targetRoot, { recursive: true });
  for (const skill of selectSkills(answers)) {
    await copySkill(skill, targetRoot);
  }
}

async function copySkill(skill: string, targetRoot: string): Promise<void> {
  const source = path.join(SKILL_POOL_DIR, skill);
  const target = path.join(targetRoot, skill);
  await fs.cp(source, target, {
    recursive: true,
    force: true,
    errorOnExist: false,
  });
}

async function symlinkOrSkip(target: string, linkPath: string): Promise<void> {
  try {
    await fs.symlink(target, linkPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
  }
}

export function scaffoldStepLabels(answers: ScaffoldAnswers): string[] {
  return [
    'Check target directory',
    'Create Bun/Turbo workspace',
    'Write v0 scope and agent prompt',
    'Reserve packages workspace',
    'Create agent skills and memory workspace',
    'Create repo workflow skills',
    ...answers.apps.map((app) => `Create apps/${app} ${surfaceFramework(app)} surface`),
  ];
}

export async function scaffoldProject(answers: ScaffoldAnswers): Promise<void> {
  const root = answers.targetDir;
  await runStep('Check target directory', () => prepareTarget(root));
  await runStep('Create Bun/Turbo workspace', () => writeWorkspaceFiles(root, answers));
  await runStep('Write v0 scope and agent prompt', () => writeV0Metadata(root, answers));
  await runStep('Reserve packages workspace', () => writePackagesWorkspace(root));
  await runStep('Create agent skills and memory workspace', () => writeAgentWorkspace(root, answers));
  await runStep('Create repo workflow skills', () => writeRepoSkills(root, answers));

  for (const app of answers.apps) {
    const label = `Create apps/${app} ${surfaceFramework(app)} surface`;
    if (app === 'web' || app === 'app') {
      await runStep(label, () => writeNextApp(root, app, answers));
    } else if (app === 'desktop') {
      await runStep(label, () => writeElectronApp(root, answers));
    } else if (app === 'mobile') {
      await runStep(label, () => writeExpoApp(root, answers));
    } else if (app === 'extension') {
      await runStep(label, () => writePlasmoApp(root, answers));
    } else if (app === 'cli') {
      await runStep(label, () => writeCliApp(root, answers));
    } else if (app === 'docs') {
      await runStep(label, () => writeDocsApp(root, answers));
    }
  }
}
