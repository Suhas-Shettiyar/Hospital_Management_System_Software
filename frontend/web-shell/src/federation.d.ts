// Ambient type declarations for federation remote import specifiers - these
// modules don't exist as real files in this project, they're resolved at
// runtime by the federation plugin against the remote's remoteEntry.js.
declare module "example_hello_remote/module" {
  import type { HmsModule } from "./app/moduleRegistry";
  export const exampleHelloModule: HmsModule;
}
