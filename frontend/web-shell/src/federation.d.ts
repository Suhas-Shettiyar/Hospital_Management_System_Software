// Ambient type declarations for federation remote import specifiers - these
// modules don't exist as real files in this project, they're resolved at
// runtime by the federation plugin against the remote's remoteEntry.js.
declare module "example_hello_remote/module" {
  import type { HmsModule } from "./app/moduleRegistry";
  export const exampleHelloModule: HmsModule;
}

declare module "opd_remote/module" {
  import type { HmsModule } from "./app/moduleRegistry";
  export const opdModule: HmsModule;
}

declare module "lab_remote/module" {
  import type { HmsModule } from "./app/moduleRegistry";
  export const labModule: HmsModule;
}

declare module "pharmacy_remote/module" {
  import type { HmsModule } from "./app/moduleRegistry";
  export const pharmacyModule: HmsModule;
}

declare module "appointments_remote/module" {
  import type { HmsModule } from "./app/moduleRegistry";
  export const appointmentsModule: HmsModule;
}

declare module "ipd_remote/module" {
  import type { HmsModule } from "./app/moduleRegistry";
  export const ipdModule: HmsModule;
}
