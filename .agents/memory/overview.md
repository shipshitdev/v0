---
name: v0_overview
description: v0 scaffolder project overview and current architecture
type: project
status: active
last_verified: 2026-04-24
topics: [v0, scaffolder, architecture, bun, codex]
---

# v0 Overview

`@shipshitdev/v0` is a Node/Bun CLI package for creating Shipshit.dev starter projects.

Published usage target:

```bash
npx @shipshitdev/v0
```

With no positional target directory, the CLI enters the interactive flow and asks for the project directory.

Generated projects are Bun/Turbo monorepos with selected app surfaces:

- `apps/web` - public Next.js landing page, port 3000.
- `apps/app` - Next.js product web app shell, port 3001.
- `apps/desktop` - Electron shell that embeds the product web app.
- `apps/mobile` - Expo mobile app.
- `apps/extension` - Plasmo browser extension.
- `apps/cli` - Commander-based CLI surface.
- `apps/docs` - Nextra documentation site, port 3003, available but deselected by default.

Generated defaults:

- Default selected apps: `web`, `app`, `desktop`, `mobile`, `extension`, `cli`.
- Available opt-in apps: `docs`.
- Routes: `/overview`, `/new-task`, `/search`, `/inbox`, `/activities`.
- UI package: `@shipshitdev/ui`.
- Package manager: Bun.
- Root workspace includes `apps/*` and `packages/*`.
- `packages/.gitkeep` is generated so `rg ... apps packages` does not fail.
- Generated repos include `.agents/skills` and `.agents/memory`.
- `.claude` and `.codex` are generated as repo-local symlink shims into `.agents`.

Generated root scripts include:

- `dev` - `turbo run dev`.
- `dev:<app>` - only for selected apps, using `bun run --cwd apps/<app> dev`.
- `build` - `turbo run build`.
- `typecheck` - `turbo run typecheck`.
- `lint` - `turbo run lint`.
- `deps:update` - `bun update --latest`.

The CLI defaults to running `bun install`, printing selected app scripts, and starting the `apps/web` landing page when selected.

## Landing Page

The repo includes a static landing page for `https://v0.shipshit.dev`.

- Source: `site/`
- Main page: `site/index.html`
- Styles: `site/styles.css`
- Hero asset: `site/assets/v0-hero.png`
- Vercel config: `vercel.json`
- Vercel build command: `bun run site:build`
- Vercel output directory: `site`

The npm `files` whitelist intentionally excludes `site/` so the landing page does not ship inside the npm package.
