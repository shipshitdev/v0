# AGENTS.md - v0

## Project

`@shipshitdev/v0` is the Shipshit.dev project scaffolder. It is a Node/Bun CLI that generates a Bun/Turbo monorepo with selected app surfaces, selected skills, `@shipshitdev/ui`, optional Claude/Codex execution, optional GitHub repo/issue setup, dependency install, and web app startup.

## Working Rules

- Use Bun for package management and scripts.
- Edit source in `src/`; rebuild with `bun run build` before testing `node dist/index.js`.
- Do not publish to npm or push to GitHub unless explicitly asked.
- Keep generated projects quiet by default: agent, install, GitHub, and server output should go to `.v0/*.log`, not the terminal.
- Keep the scaffold choice-driven. Apps, routes, skills, scripts, and startup behavior should respect the user selections.
- Keep symlinks relative and repo-local. Never point `.claude` or `.codex` symlinks outside the generated repo.

## Commands

```bash
bun install
bun run typecheck
bun run build
node dist/index.js /tmp/my-v0-test --yes --skip-agent --no-install --no-start
```

Use full smoke tests when touching scaffold output:

```bash
rm -rf /tmp/v0-smoke
node dist/index.js /tmp/v0-smoke --yes --scope "Smoke test" --agent codex --skip-agent --no-start
cd /tmp/v0-smoke
bun run typecheck
```

## Architecture

- `src/index.ts` owns CLI orchestration and step ordering.
- `src/prompts.ts` collects project choices and detects local `codex`, `claude`, `bun`, and `gh`.
- `src/parse.ts` handles non-interactive flags.
- `src/scaffold.ts` writes the generated monorepo, apps, agent folders, repo skills, and project README.
- `src/skill-selection.ts` decides which skills get copied into generated `.agents/skills` and generated `skills`.
- `src/agent.ts` builds and runs the Claude/Codex prompt with output captured to `.v0/agent-output.log`.
- `src/github.ts` optionally creates a GitHub repo and issue with `gh`, captured to `.v0/github-output.log`.
- `src/runtime.ts` installs dependencies, prints app scripts, and starts `apps/web` with logs in `.v0/web-dev.log`.
- `src/progress.ts` renders the progress task board.

## Skills Split

- `v0/.agents/skills`: skills for maintaining and extending this `v0` repo.
- `v0/skills`: packaged skill pool used by the scaffolder.
- Generated `.agents/skills`: selected dev workflow skills based on scaffold choices.
- Generated `skills`: selected repo workflow skills based on scaffold choices.
- Generated `.claude/*` and `.codex/*`: relative symlinks into generated `.agents`.

## Current Defaults

- Default apps: `web`, `app`, `desktop`, `mobile`, `extension`.
- Default routes: `/overview`, `/new-task`, `/search`, `/inbox`, `/activities`.
- Default agent: `codex` when installed, otherwise the first installed agent.
- GitHub repo creation defaults to no.
- Install defaults to yes.
- Starting `apps/web` defaults to yes when `web` is selected.

## Important Gotchas

- Bun script cwd must be `bun run --cwd apps/web dev`, not `bun --cwd apps/web run dev`.
- `packages/` must exist in generated repos because agents commonly run `rg ... apps packages`.
- Generated root app scripts must only include selected apps.
- `task` is accepted as a CLI alias but normalizes to `new-task`.
- If testing auto-start, kill the test Next server after verification.

## Memory

Read `.agents/memory/*.md` before making substantial changes. The latest session summary is in `.agents/memory/session-2026-04-23.md`.
