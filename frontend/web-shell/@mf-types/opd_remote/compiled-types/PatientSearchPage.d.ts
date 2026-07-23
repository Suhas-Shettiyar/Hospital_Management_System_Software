/**
 * Entry point of the guided OPD workflow: find (or register) a patient,
 * then hand off to the consultation workspace. Search is debounced and
 * skipped below 2 characters to avoid hammering the backend on every
 * keystroke - mirrors the backend's own `len(q) < 2` short-circuit.
 */
export default function PatientSearchPage(): import("react").JSX.Element;
