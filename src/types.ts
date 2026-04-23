export const DEFAULT_APPS = ['web', 'app', 'desktop', 'mobile', 'extension'] as const;
export const DEFAULT_ROUTES = ['overview', 'new-task', 'search', 'inbox', 'activities'] as const;
export const AGENTS = ['claude', 'codex'] as const;
export const GITHUB_VISIBILITIES = ['private', 'public'] as const;

export type AppSurface = (typeof DEFAULT_APPS)[number];
export type RouteId = (typeof DEFAULT_ROUTES)[number];
export type Agent = (typeof AGENTS)[number];
export type GithubVisibility = (typeof GITHUB_VISIBILITIES)[number];

export type CliOptions = {
  targetDir?: string;
  scope?: string;
  agent?: Agent;
  apps?: AppSurface[];
  routes?: RouteId[];
  github?: boolean;
  githubIssue?: boolean;
  githubRepo?: string;
  githubVisibility?: GithubVisibility;
  yes: boolean;
  skipAgent: boolean;
  install: boolean;
  start: boolean;
};

export type GithubSettings = {
  enabled: boolean;
  createIssue: boolean;
  repo: string;
  visibility: GithubVisibility;
};

export type ScaffoldAnswers = {
  projectName: string;
  packageName: string;
  targetDir: string;
  scope: string;
  agent: Agent;
  apps: AppSurface[];
  routes: RouteId[];
  skipAgent: boolean;
  install: boolean;
  start: boolean;
  github: GithubSettings;
};
