# AGENTS.md

Concise guide for AI agents and contributors working in this repo.

## Commands

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Start Vite dev server |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint (full repo — see baselines below) |
| `pnpm design:check` | Styleguide manifest + design lint + accent hex + governance ESLint |
| `pnpm registry:build` | Build shadcn registry JSON to `public/r/` |

`typecheck` and `test` scripts are landing soon via plans 005/008.

## Known baselines

- **Lint:** `pnpm lint` fails with ~382 pre-existing errors repo-wide. Gate on scoped `npx eslint <files>` for files you touch instead of expecting a clean full run.
- **TypeScript:** tsc baseline tracked in `plans/README.md` (plan 005).

## Install gotcha

`CENTRAL_LICENSE_KEY` must be exported in your shell **before** `pnpm install` — required to fetch private `@central-icons-react/*` packages. See `.env.example`.

## Environment

- `VITE_CESIUM_ION_TOKEN` — required for the production Cesium map (default backend since Phase 8 cutover).
- Copy `.env.example` → `.env.local` and fill both `VITE_*` tokens.

## Conventions

- **Icons:** route through `@/lib/icons/central`; never import `lucide-react` or `@central-icons-react/*` directly. Prefer filled variants (see `.cursor/rules/prefer-filled-icons.mdc`).
- **Commits:** conventional style — `feat(scope): …`, `fix(scope): …`, `docs: …`.
- **Design tokens:** run `pnpm design:check` when changing tokens, palette, or styleguide manifest.

## Advisor plans

Queued improvement work lives in `plans/README.md`. Check there before large refactors.
