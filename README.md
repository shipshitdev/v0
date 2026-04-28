# @shipshitdev/v0

Opinionated Shipshit.dev project scaffolder.

`v0` creates a Bun/Turbo monorepo with the default Shipshit.dev app surfaces, a public landing page, a product web app, `@shipshitdev/ui`, and the standard product routes:

- `/overview`
- `/new-task`
- `/search`
- `/inbox`
- `/activities`

The CLI checks your local `PATH` first and only offers installed agents.
It asks for the agent before the project scope, then hands the repo to that agent to generate scoped page content.
App surfaces and default routes use checkbox selectors during interactive setup.
Claude/Codex output is captured to `.v0/agent-output.log`; the terminal only shows scaffold steps.
If `gh` is installed, interactive setup can also create a GitHub repo and a scope issue. GitHub setup defaults to no.
After generation, the CLI runs `bun install`, prints the generated app scripts, and starts `apps/web`.

Codex/Claude repo context for maintaining this package lives in `AGENTS.md` and `.agents/memory/`.

## Run

```bash
npx @shipshitdev/v0
```

Or pass the project directory up front:

```bash
npx @shipshitdev/v0 my-product
```

## Local Development

Inside this source repo, npm resolves `npx @shipshitdev/v0` to the local package before the public registry package. Run the normal build and local bin link when working from the repo root:

```bash
bun run build
bun run prepare
npx @shipshitdev/v0 /tmp/v0-smoke --yes --skip-agent --no-install --no-start
```

## Defaults

Generated app surfaces:

- `apps/web` - public Next.js landing page
- `apps/app` - product Next.js web app with the selected routes
- `apps/desktop` - Electron shell that embeds the product web app
- `apps/mobile` - Expo mobile app
- `apps/extension` - Plasmo browser extension
- `apps/cli` - Commander CLI
- `apps/docs` - Nextra documentation site, available but deselected by default
- `apps/api` - NestJS 11 + Prisma 7 API server, available but deselected by default

Generated package baseline:

- Bun workspaces
- Turbo tasks
- reserved `packages/` workspace for shared project packages
- `deps:update` script powered by Bun
- `.agents/skills` and `.agents/memory` as generated-project source-of-truth directories
- `.claude/skills`, `.claude/memory`, `.codex/skills`, and `.codex/memory` as relative symlinks into `.agents`
- selected dev workflow skills copied into generated `.agents/skills`
- selected repo workflow skills copied into generated `skills`
- v0's own `skills/` directory is the packaged skill pool used by the scaffolder
- TypeScript strict mode
- `@shipshitdev/ui`
- Tailwind v4 token setup for UI components
- `.v0/scope.md`
- `.v0/agent-prompt.md`

## Non-Interactive

```bash
npx @shipshitdev/v0 my-product \
  --scope "AI inbox for founder-led sales" \
  --agent codex \
  --apps web,app,desktop,docs \
  --routes overview,new-task,search,inbox,activities \
  --github \
  --github-repo shipshitdev/my-product \
  --github-issue \
  --no-start
```

Use `--skip-agent` to write the scaffold without launching Claude or Codex.
Use `--no-github` to skip GitHub setup in interactive runs.
Use `--no-install --no-start` for CI or smoke tests that should exit immediately.
