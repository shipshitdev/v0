---
name: v0_overview
description: v0 scaffolder project overview and current architecture
type: project
status: active
last_verified: 2026-04-23
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

- `apps/web` - Next.js marketing surface, port 3000.
- `apps/app` - Next.js product app shell, port 3001.
- `apps/desktop` - Vite React shell, port 3010.
- `apps/mobile` - Vite React shell, port 3011.
- `apps/extension` - Vite React shell, port 3012.

Generated defaults:

- Apps: `web`, `app`, `desktop`, `mobile`, `extension`.
- Routes: `/overview`, `/new-task`, `/search`, `/inbox`, `/activities`.
- UI package: `@shipshitdev/ui`.
- Package manager: Bun.
- Root workspace includes `apps/*` and `packages/*`.
- `packages/.gitkeep` is generated so `rg ... apps packages` does not fail.

Generated root scripts include:

- `dev` - `turbo run dev`.
- `dev:<app>` - only for selected apps, using `bun run --cwd apps/<app> dev`.
- `build` - `turbo run build`.
- `typecheck` - `turbo run typecheck`.
- `lint` - `turbo run lint`.
- `deps:update` - `bun update --latest`.

The CLI defaults to running `bun install`, printing selected app scripts, and starting `apps/web` when selected.

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
