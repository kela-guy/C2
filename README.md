
# C1Flow — Tactical Target Management Console

[![Storybook](https://cdn.jsdelivr.net/gh/storybookjs/brand@main/badge/badge-storybook.svg)](https://main--69b81d2c2b313942c613995e.chromatic.com/)

C1Flow tactical target management console UI (Vite + React). Original design at [Figma](https://www.figma.com/design/5JVDDcHNNMjg6GWqsAkcTc/Compact-Card-Design).

## Running the code

Run `npm i` to install the dependencies.

Run `npm run dev` to start the development server.

Run `npm run storybook` to start Storybook locally on port 6006.

## Storybook

- **Local (always matches your code)**: http://localhost:6006 — run `npm run storybook` in a separate terminal (not started by `npm run dev`).
- **Hosted (Chromatic)**: https://main--69b81d2c2b313942c613995e.chromatic.com/ — this only updates when a **Chromatic publish** completes successfully.

### If the hosted Storybook looks out of date

1. **GitHub Actions** — Workflow [`.github/workflows/chromatic.yml`](.github/workflows/chromatic.yml) runs on pushes to `main` (and can be run manually: *Actions → Chromatic → Run workflow*). It needs the repository secret **`CHROMATIC_PROJECT_TOKEN`**. If that secret is missing or the workflow fails, Chromatic will not get a new build.
2. **Publish from your machine** — With the token from Chromatic → your project → **Manage**:
   ```bash
   export CHROMATIC_PROJECT_TOKEN=…   # or pass --project-token
   npm run chromatic
   ```
