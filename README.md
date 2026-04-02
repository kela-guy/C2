
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

C2 Hub ships a **shadcn-compatible component registry** at `/r/*.json`. Developers in other Vite/React projects can install everything at once:

```bash
npx shadcn@latest add https://c2-hub-three.vercel.app/r/all.json
```

Or install individual components:

```bash
npx shadcn@latest add https://c2-hub-three.vercel.app/r/button.json
```

### Building the registry

```bash
pnpm registry:build
```

This runs `shadcn build` and a post-build transform, outputting JSON files to `public/r/`.

### Local development

When the dev server is running (`pnpm dev`), the registry is also served locally at `http://localhost:5173/r/`. Test installs with:

```bash
npx shadcn@latest add http://localhost:5173/r/button.json
```

### Consumer setup

In the consuming project, run `npx shadcn@latest init` to create a `components.json`, then install components from the registry URL. See `components.json` in this repo for a reference config (Tailwind v4, Vite aliases).

### Hosting

Deploy the `public/r/` directory to any static host:

- **Vercel / Netlify** — deploy the repo; `public/` is served automatically
- **GitHub Pages** — publish `public/r/` as a static site
- **S3 + CloudFront** — upload `public/r/` to a bucket

Run `pnpm registry:build` in CI before deploying to keep the JSON in sync with source.
