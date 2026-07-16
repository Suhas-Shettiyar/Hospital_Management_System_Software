# Frontend (Vite + React + TypeScript + Ant Design)

Enterprise shell for the modular HMS. Custom warm identity (teal + marigold,
soft warm neutrals, rounded) but compact and keyboard-first. Light + dark.

```bat
cd frontend\web-shell
npm install
npm run dev
```

Open the URL Vite prints (http://localhost:5173, or 5174 if busy).
Sign in with any username/password (auth is a stub until the backend is wired).

## What's here
```
src/
  theme/
    tokens.ts            # DESIGN SYSTEM — all colors/type/radius/density. Edit here.
    ThemeProvider.tsx    # Ant Design theme + light/dark switch + CSS vars
  app/
    moduleRegistry.ts    # THE MODULE CONTRACT (how departments plug in)
    router.tsx           # createAppRouter() factory - called after modules load
    shell/
      AppShell.tsx       # layout frame + ProtectedRoute
      Sidebar.tsx        # nav built automatically from registered modules
      Topbar.tsx         # user menu + theme toggle
      GlobalSearch.tsx   # signature: patient search, focus with "/" or Ctrl-K
  features/
    auth/                # LoginPage + AuthProvider (stub; wire to backend later)
    dashboard/           # sample module — the TEMPLATE for OPD, Lab, etc.
  modules/
    registerCore.ts      # static (compile-time) modules registered here
    loadRemoteModules.ts # dynamic (runtime) modules loaded via Module Federation
  lib/
    api.ts               # fetch wrapper (proxied to backend /api)
    moduleRegistryApi.ts # fetches which modules are enabled (backend module_registry)
    queryClient.ts       # TanStack Query (server state)
  main.tsx               # trampoline: `import("./bootstrap")` (see below)
  bootstrap.tsx           # real startup: register modules -> load enabled
                          # remotes -> build router -> render. Async because
                          # remote modules load over the network.
```

## Running with a remote module (Module Federation)

Optional department packages can be loaded at runtime from a separate project
instead of being statically imported - `frontend/modules/example-hello/` is
the proof-of-concept (mirrors the backend's `example_hello` package). This
needs THREE things running at once for local dev:

```bat
:: Terminal 1 - backend (port 8000)
cd backend
.venv\Scripts\activate
uvicorn app.main:app --reload

:: Terminal 2 - the example remote module (port 5174)
cd frontend\modules\example-hello
npm install
npm run dev

:: Terminal 3 - this host shell (port 5173)
cd frontend\web-shell
npm install
npm run dev
```

Open http://localhost:5173. The "Example Hello" sidebar entry only appears
when its dev server (terminal 2) is running **and** `module_registry.enabled`
is true for `example_hello` in the database - toggle it with:
```sql
UPDATE module_registry SET enabled = true WHERE module_id = 'example_hello';
```
then just refresh the page - the frontend re-checks `/api/modules` on every
load, no restart needed. (This is separate from the backend's own `/api/hello`
route, which does need a backend restart to reflect an enabled-flag change -
see `backend/app/core/plugins/loader.py`.) If terminal 2 isn't running, the
app still boots fine - it just won't show that module (check the browser
console for a friendly "failed to load; continuing without it" message, not
a crash).

## Add a department (e.g. OPD)
1. Build pages under `src/features/opd/`.
2. Export an `HmsModule` (copy `features/dashboard/module.tsx`).
3. Register it in `src/modules/registerCore.ts`.
The sidebar + router pick it up automatically. No shell edits.

## Keyboard-first
- `/` or `Ctrl/Cmd-K` focuses the global patient search from anywhere.
- Forms submit on Enter; the first field autofocuses.

## Notes
- The custom typeface (Figtree/Nunito Sans) falls back to system fonts so it
  works offline. To use it, self-host the font or uncomment the import in
  `src/index.css`.
- The initial bundle includes all of Ant Design in one chunk. When you add
  several modules, lazy-load them (React.lazy / dynamic import) so each
  department is a separate chunk — this is also the path to runtime federation.
