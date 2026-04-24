import { AGENTS, AVAILABLE_APPS, DEFAULT_ROUTES, GITHUB_VISIBILITIES, type Agent, type AppSurface, type CliOptions, type GithubVisibility, type RouteId } from './types';

function splitList(value: string | undefined): string[] {
  return value
    ? value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
    : [];
}

function parseApps(value: string | undefined): AppSurface[] | undefined {
  const entries = splitList(value);
  if (entries.length === 0) return undefined;
  const valid = new Set<string>(AVAILABLE_APPS);
  const invalid = entries.filter((entry) => !valid.has(entry));
  if (invalid.length > 0) {
    throw new Error(`Unknown app surface: ${invalid.join(', ')}`);
  }
  return entries as AppSurface[];
}

function parseRoutes(value: string | undefined): RouteId[] | undefined {
  const entries = splitList(value).map((entry) => (entry === 'task' ? 'new-task' : entry));
  if (entries.length === 0) return undefined;
  const valid = new Set<string>(DEFAULT_ROUTES);
  const invalid = entries.filter((entry) => !valid.has(entry));
  if (invalid.length > 0) {
    throw new Error(`Unknown route: ${invalid.join(', ')}`);
  }
  return entries as RouteId[];
}

function parseAgent(value: string | undefined): Agent | undefined {
  if (!value) return undefined;
  if ((AGENTS as readonly string[]).includes(value)) return value as Agent;
  throw new Error(`Unknown agent: ${value}. Use claude or codex.`);
}

function parseGithubVisibility(value: string | undefined): GithubVisibility | undefined {
  if (!value) return undefined;
  if ((GITHUB_VISIBILITIES as readonly string[]).includes(value)) return value as GithubVisibility;
  throw new Error(`Unknown GitHub visibility: ${value}. Use private or public.`);
}

export function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    yes: false,
    skipAgent: false,
    install: true,
    start: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error(`Missing value for ${arg}`);
      }
      index += 1;
      return value;
    };

    if (arg === '--yes' || arg === '-y') {
      options.yes = true;
      continue;
    }
    if (arg === '--skip-agent') {
      options.skipAgent = true;
      continue;
    }
    if (arg === '--no-install') {
      options.install = false;
      continue;
    }
    if (arg === '--no-start') {
      options.start = false;
      continue;
    }
    if (arg === '--github') {
      options.github = true;
      continue;
    }
    if (arg === '--no-github') {
      options.github = false;
      continue;
    }
    if (arg === '--github-issue') {
      options.github = true;
      options.githubIssue = true;
      continue;
    }
    if (arg === '--no-github-issue') {
      options.githubIssue = false;
      continue;
    }
    if (arg === '--github-repo') {
      options.github = true;
      options.githubRepo = next();
      continue;
    }
    if (arg === '--github-visibility') {
      options.github = true;
      options.githubVisibility = parseGithubVisibility(next());
      continue;
    }
    if (arg === '--scope') {
      options.scope = next();
      continue;
    }
    if (arg === '--agent') {
      options.agent = parseAgent(next());
      continue;
    }
    if (arg === '--apps') {
      options.apps = parseApps(next());
      continue;
    }
    if (arg === '--routes') {
      options.routes = parseRoutes(next());
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      throw new Error('__HELP__');
    }
    if (arg.startsWith('--')) {
      throw new Error(`Unknown option: ${arg}`);
    }
    if (!options.targetDir) {
      options.targetDir = arg;
      continue;
    }
    throw new Error(`Unexpected argument: ${arg}`);
  }

  return options;
}
