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
    router.tsx           # /login + protected shell hosting module routes
    shell/
      AppShell.tsx       # layout frame + ProtectedRoute
      Sidebar.tsx        # nav built automatically from registered modules
      Topbar.tsx         # user menu + theme toggle
      GlobalSearch.tsx   # signature: patient search, focus with "/" or Ctrl-K
  features/
    auth/                # LoginPage + AuthProvider (stub; wire to backend later)
    dashboard/           # sample module — the TEMPLATE for OPD, Lab, etc.
  modules/
    registerCore.ts      # register modules here (or via federation later)
  lib/
    api.ts               # fetch wrapper (proxied to backend /api)
    queryClient.ts       # TanStack Query (server state)
```

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
