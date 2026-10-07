# Skill Registry — dash-senso

## User Skills (relevant triggers)
| Skill | Trigger |
|-------|---------|
| ux-polish | Loading/disabled/success/error states, optimistic UI |
| neon-postgres / neon | Postgres, DATABASE_URL, Neon |
| domain-modeling | Domain terminology, ADRs |
| codebase-design / design-an-interface | Module interface design |
| diagnosing-bugs | Debug / broken / slow |
| review / judgment-day | Code review, adversarial review |
| branch-pr / issue-creation | PR / issue workflows |
| skill-creator / skill-registry | Skill authoring / registry |
| graphify | /graphify |
| tdd, go-testing, migrate-to-shoehorn | NOT applicable (project uses no tests) |

## Compact Rules
- Next.js 16: read node_modules/next/dist/docs/ before coding; `proxy` replaces middleware; heed deprecations.
- TS strict, path alias `@/*` -> repo root. Tailwind v4. pnpm 10.20.0.
- NO tests, NO TDD, NO test runner; do not install test frameworks.
- Quality gates: `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build` + manual workflow walkthroughs.
- Never use cat/grep/find/sed/ls; use bat/rg/fd/sd/eza.

## Project Conventions
- /Users/frank/Workspace/next-js/dash-senso/CLAUDE.md (-> @AGENTS.md)
- /Users/frank/Workspace/next-js/dash-senso/AGENTS.md
- Plan doc: docs/padron-puebla-codex-plan.md
