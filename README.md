
# C2 Hub — Tactical Target Management Console

C2 Hub tactical target management console UI (Vite + React). Original design at [Figma](https://www.figma.com/design/5JVDDcHNNMjg6GWqsAkcTc/Compact-Card-Design).

## Running the code

```bash
pnpm i
pnpm dev
```

## Styleguide

In-app component documentation and tokens live at **`/styleguide`** when the app is running (see also `design-system.md` in the repo root).

## Component Registry

C2 Hub ships a shadcn-compatible registry. Install the default domain bundle:

```bash
npx shadcn@latest add @c2/domain-primitives
```

See [design-system.md — Component Registry](design-system.md#component-registry) for bundles (`map-kit`, `all`), consumer setup, local URLs, and the full inventory in [`registry.json`](registry.json). Maintainers: `pnpm registry:build` outputs `public/r/*.json` (run before deploy).
