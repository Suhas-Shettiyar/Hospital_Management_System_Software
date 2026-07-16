// A trampoline: this makes the host's real entry point load via a dynamic
// import, which module federation's shared-scope negotiation requires (an
// eagerly-imported host entry can trigger "shared module not available for
// eager consumption" errors). All real startup logic lives in bootstrap.tsx.
import("./bootstrap");
