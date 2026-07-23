interface Props {
    patientId: number;
    activeVisitId?: number;
    onSelectVisit: (visitId: number) => void;
}
/** Past visits for the current patient, shown alongside the active
 * consultation so the doctor has context without leaving the workspace. */
export default function VisitHistoryList({ patientId, activeVisitId, onSelectVisit }: Props): import("react").JSX.Element;
export {};
