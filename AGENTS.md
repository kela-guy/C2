## Cursor Cloud specific instructions

**C1Flow** is a pure frontend React SPA (no backend, no database). All data is mock/simulated in-browser.

### Running the dev server

```
npm run dev -- --host 0.0.0.0 --port 5173
```

The app uses Vite with HMR. No `.env` files or secrets are required; the Mapbox access token is hardcoded in `src/app/components/TacticalMap.tsx`.

### Build

```
npm run build
```

### Notes

- There is no `tsconfig.json` in the repository; Vite/esbuild handles TypeScript transpilation without it.
- There is no linter or test runner configured in `package.json`. Only `dev` and `build` scripts exist.
- `react` and `react-dom` are listed as `peerDependencies`; npm auto-installs them.
- The UI is RTL (Hebrew). The HTML `lang` is `he` and `dir` is `rtl`.
