# Modules (department packages)

Each department is a module that registers itself via the contract in
`src/app/moduleRegistry.ts`. Copy `src/features/dashboard/module.tsx` as your
template:

1. Build your pages under `src/features/<name>/`.
2. Export an `HmsModule` (id, title, icon, routes, menu).
3. Register it in `src/modules/registerCore.ts`.

The sidebar and router pick it up automatically — no shell code to change.
This is the frontend contract that runtime module federation will plug into
later, so the shape you build against now is stable.
