import type { AppSurface, RouteId, ScaffoldAnswers } from './types';

const BASE_AGENT_SKILLS = [
  'accessibility',
  'audit',
  'biome-validator',
  'bun-validator',
  'code-review',
  'git-safety',
  'package-architect',
  'performance-expert',
  'prompt-engineering',
  'scaffold',
  'security-expert',
  'testing-expert',
  'turborepo',
  'typescript-expert',
  'typescript-refactor',
] as const;

const REACT_SURFACE_SKILLS = [
  'component-library',
  'error-handling-expert',
  'frontend-design',
  'layout',
  'polish',
  'react-component-performance',
  'react-hook-form',
  'react-patterns',
  'react-refactor',
  'react-testing-library',
  'shadcn',
  'shadcn-setup',
  'tailwind',
  'tailwind-validator',
] as const;

const NEXT_SURFACE_SKILLS = ['nextjs-validator'] as const;

const APP_AGENT_SKILLS: Record<AppSurface, readonly string[]> = {
  web: [...REACT_SURFACE_SKILLS, ...NEXT_SURFACE_SKILLS],
  app: [...REACT_SURFACE_SKILLS, ...NEXT_SURFACE_SKILLS],
  desktop: REACT_SURFACE_SKILLS,
  mobile: [...REACT_SURFACE_SKILLS, 'expo-architect', 'react-native-components'],
  extension: [...REACT_SURFACE_SKILLS, 'content-script-developer', 'plasmo-extension-architect'],
};

const ROUTE_AGENT_SKILLS: Partial<Record<RouteId, readonly string[]>> = {
  overview: ['analytics-expert'],
  'new-task': ['task-prd-creator', 'shape'],
  search: ['table-filters'],
  inbox: ['table-filters'],
  activities: ['analytics-expert', 'table-filters'],
};

const BASE_REPO_SKILLS = [
  'context-engineering',
  'execution-debugging',
  'plan-generation',
  'plan-revision',
  'plan-execution',
  'plan-execution-tdd',
  'plan-verification',
  'prd-quality-gate',
  'pr-generation',
  'writing-prds',
] as const;

const ROUTE_REPO_SKILLS: Partial<Record<RouteId, readonly string[]>> = {
  'new-task': ['task-prd-creator'],
};

function unique(values: readonly string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

export function selectedAgentSkills(answers: ScaffoldAnswers): string[] {
  return unique([
    ...BASE_AGENT_SKILLS,
    ...answers.apps.flatMap((app) => APP_AGENT_SKILLS[app]),
    ...answers.routes.flatMap((route) => ROUTE_AGENT_SKILLS[route] ?? []),
  ]);
}

export function selectedRepoSkills(answers: ScaffoldAnswers): string[] {
  return unique([
    ...BASE_REPO_SKILLS,
    ...answers.routes.flatMap((route) => ROUTE_REPO_SKILLS[route] ?? []),
    ...(answers.github.enabled ? ['adversarial-review'] : []),
  ]);
}
