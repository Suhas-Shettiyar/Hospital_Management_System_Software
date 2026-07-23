# Example Hello (Module Federation remote)

The frontend proof-of-concept for the plugin architecture - mirrors the
backend's `backend/app/modules/example_hello/` package. Not a real
department; it exists to prove that a separately-built, separately-run
project can contribute a page + sidebar entry to the web-shell host at
runtime.

```bat
npm install
npm run dev
```

Runs standalone at http://localhost:5174 (its own `index.html`/`main.tsx`
preview harness) - you can work on this in complete isolation, no host
required. To see it actually plugged into the real app, also run the host
(`frontend/web-shell`) and the backend - see
`frontend/web-shell/README.md`'s "Running with a remote module" section.

## What's here
- `src/module.tsx` - the ONE thing exposed via federation (`exposes: {
  "./module": "./src/module.tsx" }` in `vite.config.ts`). Exports an
  `HmsModule`-shaped object the host dynamically imports and registers.
- `src/moduleContract.ts` - a local copy of the host's `HmsModule` interface
  (see its own comment for why this is duplicated, not imported).
- `src/ExampleHelloPage.tsx` - the actual page component.

## Adding a real remote later
Copy this whole folder's structure for a real department (opd, lab, ...):
same `vite.config.ts` federation config shape (new `name`/port/`exposes`),
same `module.tsx` pattern. Then add its dotted specifier to the host's
`frontend/web-shell/src/modules/loadRemoteModules.ts` and its remote entry
to the host's `vite.config.ts` `remotes` config.
