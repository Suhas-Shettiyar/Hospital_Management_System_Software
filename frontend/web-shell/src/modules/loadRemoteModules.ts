import { registerModule } from "../app/moduleRegistry";

// One literal, statically-analyzable dynamic import per remote. Building the
// specifier from a data table (e.g. `import(remoteName + "/module")`) would
// quietly break federation's build-time rewriting of these imports, so each
// remote gets its own tiny named loader function instead of a config-driven
// loop.
async function loadExampleHello() {
  const { exampleHelloModule } = await import("example_hello_remote/module");
  registerModule(exampleHelloModule);
}

async function loadOpd() {
  const { opdModule } = await import("opd_remote/module");
  registerModule(opdModule);
}

const REMOTE_LOADERS: Record<string, () => Promise<void>> = {
  example_hello: loadExampleHello,
  opd: loadOpd,
};

/** For each backend-enabled module id that has a known remote, dynamically
 * import and register it. A remote that's disabled, unreachable, or throws
 * is skipped - not present in the sidebar/router, never a startup crash. */
export async function loadRemoteModules(enabledModuleIds: Set<string>): Promise<void> {
  for (const [moduleId, load] of Object.entries(REMOTE_LOADERS)) {
    if (!enabledModuleIds.has(moduleId)) continue;
    try {
      await load();
    } catch (err) {
      console.error(`[loadRemoteModules] "${moduleId}" failed to load; continuing without it.`, err);
    }
  }
}
