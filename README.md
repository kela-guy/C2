
# C2 Hub — Tactical Target Management Console

C2 Hub tactical target management console UI (Vite + React). Original design at [Figma](https://www.figma.com/design/5JVDDcHNNMjg6GWqsAkcTc/Compact-Card-Design).

## Running the code

1. Export your Central Icons license key **before** install (see [`.env.example`](.env.example) for details):

   ```bash
   export CENTRAL_LICENSE_KEY="your-key-here"
   ```

2. Copy env template and fill the two `VITE_*` tokens:

   ```bash
   cp .env.example .env.local
   ```

3. Install and start the dev server:

   ```bash
   pnpm i
   pnpm dev
   ```

Agents and new contributors should also read [`AGENTS.md`](AGENTS.md) for repo conventions and known baselines.

## Styleguide

In-app component documentation and tokens live at **`/styleguide`** when the app is running (see also `design-system.md` in the repo root).

## Component Registry

C2 Hub ships a shadcn-compatible registry. Install the default domain bundle:

```bash
npx shadcn@latest add @c2/domain-primitives
```

See [design-system.md — Component Registry](design-system.md#component-registry) for bundles (`map-kit`, `all`), consumer setup, local URLs, and the full inventory in [`registry.json`](registry.json). Maintainers: `pnpm registry:build` outputs `public/r/*.json` (run before deploy).
