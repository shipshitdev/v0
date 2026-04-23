---
name: v0_skills_split
description: Skill folder responsibilities for v0 and generated projects
type: project
status: active
last_verified: 2026-04-23
topics: [skills, agents, codex, claude, scaffolding]
---

# Skills Split

There are two different skill concepts in this repo.

## v0 Repo Skills

`v0/.agents/skills` contains skills for maintaining the v0 scaffolder itself. Codex and Claude discover these through:

- `.codex/skills -> ../.agents/skills`
- `.codex/memory -> ../.agents/memory`
- `.claude/skills -> ../.agents/skills`
- `.claude/memory -> ../.agents/memory`

These symlinks must stay relative and repo-local.

## Generated Project Skill Pool

`v0/skills` is the packaged skill pool copied into projects created by v0. It is included in `package.json` `files`, so npm consumers receive it.

The scaffolder does not copy every skill blindly. `src/skill-selection.ts` selects skills based on scaffold answers.

Generated output:

- Generated `.agents/skills`: selected dev workflow skills.
- Generated `.agents/memory`: project memory source of truth.
- Generated `skills`: selected repo workflow skills, such as PRD/planning/execution/review skills.
- Generated `.claude/*` and `.codex/*`: relative symlinks into generated `.agents`.

Examples:

- `--apps web --routes overview,search` includes `nextjs-validator` and `table-filters`, and excludes mobile/extension skills.
- `--apps mobile,extension --routes new-task` includes `expo-architect`, `react-native-components`, `plasmo-extension-architect`, `content-script-developer`, and `task-prd-creator`, and excludes `nextjs-validator`.

When adding a new generated-project skill:

1. Copy it into `v0/skills/<skill-name>`.
2. Add it to `src/skill-selection.ts`.
3. Add a smoke assertion if selection behavior is important.
