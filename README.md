# @shipshitdev/v0

Opinionated Shipshit.dev project scaffolder.

`v0` creates a Bun/Turbo monorepo with the default Shipshit.dev app surfaces, Next.js by default, `@shipshitdev/ui`, and the standard product routes:

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

## Defaults

Generated app surfaces:

- `apps/web` - public Next.js surface
- `apps/app` - authenticated Next.js app shell
- `apps/desktop` - desktop-oriented React shell
- `apps/mobile` - mobile-oriented React shell
- `apps/extension` - browser extension-oriented React shell

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
  --apps web,app,desktop \
  --routes overview,new-task,search,inbox,activities \
  --github \
  --github-repo shipshitdev/my-product \
  --github-issue \
  --no-start
```

Use `--skip-agent` to write the scaffold without launching Claude or Codex.
Use `--no-github` to skip GitHub setup in interactive runs.
Use `--no-install --no-start` for CI or smoke tests that should exit immediately.
