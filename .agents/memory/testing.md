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

When testing auto-start:

1. Run the CLI without `--no-start`.
2. Check `.v0/web-dev.log` for Next ready output.
3. Kill the generated Next process after verification.
