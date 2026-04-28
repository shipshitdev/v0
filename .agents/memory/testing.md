---
name: v0_testing
description: Verification commands and known test patterns for v0
type: project
status: active
last_verified: 2026-04-23
topics: [testing, smoke-tests, bun, verification]
---

# Testing v0

Core checks:

```bash
bun run typecheck
bun run build
bun pm pack --dry-run
npm publish --dry-run --access public
```

Fast scaffold smoke:

```bash
rm -rf /tmp/v0-smoke
node dist/index.js /tmp/v0-smoke --yes --scope "Smoke" --agent codex --skip-agent --no-install --no-start
```

Generated project typecheck:

```bash
rm -rf /tmp/v0-generated
node dist/index.js /tmp/v0-generated --yes --scope "Generated smoke" --agent codex --skip-agent --no-start
cd /tmp/v0-generated
bun run typecheck
```

Packed npm/npx smoke:

```bash
npm pack
rm -rf /tmp/v0-npx-smoke
npx -y ./shipshitdev-v0-0.0.1.tgz /tmp/v0-npx-smoke --yes --scope "Npx smoke" --agent codex --skip-agent --no-start
cd /tmp/v0-npx-smoke
bun run typecheck
```

Package contents check:

```bash
npm pack --dry-run --json | rg '"path": "(site|vercel\.json)|"entryCount"|"filename"|"unpackedSize"'
```

Expected: no `site/` or `vercel.json` files in the npm package because package `files` only includes `dist`, `skills`, and `README.md`.

Landing page checks:

```bash
bun run site:build
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu --no-sandbox --allow-file-access-from-files --screenshot=/tmp/v0-site-desktop.png --window-size=1440,1100 file:///Users/decod3rs/www/shipshitdev/public/v0/site/index.html
```

For true mobile screenshot validation, Chrome headless direct `--window-size=390,900` may clamp the viewport wider than 390px. Use DevTools device metrics instead and verify `document.documentElement.scrollWidth === window.innerWidth`.

Dynamic skill checks:

```bash
rm -rf /tmp/v0-docs-default
node dist/index.js /tmp/v0-docs-default --yes --scope "Default docs off" --agent codex --skip-agent --no-install --no-start
test ! -d /tmp/v0-docs-default/apps/docs

rm -rf /tmp/v0-docs-explicit
node dist/index.js /tmp/v0-docs-explicit --yes --scope "Docs" --agent codex --skip-agent --no-install --no-start --apps web,app,docs --routes overview,search
test -d /tmp/v0-docs-explicit/apps/docs

rm -rf /tmp/v0-web-skills
node dist/index.js /tmp/v0-web-skills --yes --scope "Web" --agent codex --skip-agent --no-install --no-start --apps web --routes overview,search
test -d /tmp/v0-web-skills/.agents/skills/nextjs-validator
test -d /tmp/v0-web-skills/.agents/skills/table-filters
test ! -d /tmp/v0-web-skills/.agents/skills/expo-architect

rm -rf /tmp/v0-mobile-extension-skills
node dist/index.js /tmp/v0-mobile-extension-skills --yes --scope "Mobile extension" --agent codex --skip-agent --no-install --no-start --apps mobile,extension --routes new-task
test -d /tmp/v0-mobile-extension-skills/.agents/skills/expo-architect
test -d /tmp/v0-mobile-extension-skills/.agents/skills/plasmo-extension-architect
test ! -d /tmp/v0-mobile-extension-skills/.agents/skills/nextjs-validator
test -d /tmp/v0-mobile-extension-skills/skills/task-prd-creator
```

## API surface (NestJS + Prisma + Postgres)

The `api` surface is opt-in (not in `DEFAULT_APPS`). It scaffolds NestJS 11 + Prisma 7 (with `@prisma/adapter-pg` driver adapter, `moduleFormat = "cjs"` for NestJS) and a multi-stage Dockerfile.

Opt-in: api NOT in default scaffold:

```bash
rm -rf /tmp/v0-api-off
node dist/index.js /tmp/v0-api-off --yes --scope "Api off" --agent codex --skip-agent --no-install --no-start
test ! -d /tmp/v0-api-off/apps/api
```

Explicit `--apps ...,api` scaffolds:

```bash
rm -rf /tmp/v0-api
node dist/index.js /tmp/v0-api --yes --scope "Api" --agent codex --skip-agent --no-install --no-start --apps web,api --routes overview
test -d /tmp/v0-api/apps/api
test -f /tmp/v0-api/apps/api/package.json
test -f /tmp/v0-api/apps/api/nest-cli.json
test -f /tmp/v0-api/apps/api/tsconfig.json
test -f /tmp/v0-api/apps/api/tsconfig.build.json
test -f /tmp/v0-api/apps/api/prisma/schema.prisma
test -f /tmp/v0-api/apps/api/prisma.config.ts
test -f /tmp/v0-api/apps/api/Dockerfile
test -f /tmp/v0-api/apps/api/.dockerignore
test -f /tmp/v0-api/apps/api/.env.example
test -f /tmp/v0-api/apps/api/.gitignore
test -f /tmp/v0-api/apps/api/src/main.ts
test -f /tmp/v0-api/apps/api/src/app.module.ts
test -f /tmp/v0-api/apps/api/src/app.controller.ts
test -f /tmp/v0-api/apps/api/src/app.service.ts
test -f /tmp/v0-api/apps/api/src/prisma/prisma.module.ts
test -f /tmp/v0-api/apps/api/src/prisma/prisma.service.ts
```

Verify NestJS + Prisma deps present:

```bash
node -e "const p=require('/tmp/v0-api/apps/api/package.json'); for (const k of ['@nestjs/core','@nestjs/common','@nestjs/platform-express','@prisma/client']) if(!p.dependencies[k]) throw new Error('missing '+k); for (const k of ['@nestjs/cli','prisma']) if(!p.devDependencies[k]) throw new Error('missing dev '+k); console.log('deps ok')"
```

Generated app installs and Prisma schema validates:

```bash
rm -rf /tmp/v0-api-ts
node dist/index.js /tmp/v0-api-ts --yes --scope "Api ts" --agent codex --skip-agent --no-start --apps api --routes overview
cd /tmp/v0-api-ts && bun install
cd /tmp/v0-api-ts/apps/api && bunx prisma validate && bunx prisma generate
cd /tmp/v0-api-ts && bun run typecheck
```

Optional Docker build smoke (requires Docker daemon):

```bash
cd /tmp/v0-api-ts && docker build -f apps/api/Dockerfile -t v0-api-test . && docker image inspect v0-api-test >/dev/null
```

When testing auto-start:

1. Run the CLI without `--no-start`.
2. Check `.v0/web-dev.log` for Next ready output.
3. Kill the generated Next process after verification.
