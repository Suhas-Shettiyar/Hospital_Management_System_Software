import { type PatientOut } from "./api";
interface Props {
    open: boolean;
    initialName?: string;
    onClose: () => void;
    onRegistered: (patient: PatientOut) => void;
}
/**
 * A drawer, not a full page: registering a new patient happens mid-search,
 * so the search results stay visible/reachable behind it rather than
 * navigating away and losing context.
 */
export default function PatientRegisterDrawer({ open, initialName, onClose, onRegistered }: Props): import("react").JSX.Element;
export {};
