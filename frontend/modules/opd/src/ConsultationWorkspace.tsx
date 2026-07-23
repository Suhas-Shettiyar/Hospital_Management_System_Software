import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Empty,
  Input,
  Popconfirm,
  Row,
  Skeleton,
  Space,
  Steps,
  Tag,
  Typography,
  App as AntApp,
} from "antd";
import {
  CheckCircleOutlined,
  FileTextOutlined,
  MedicineBoxOutlined,
  PhoneOutlined,
  PlusOutlined,
  PrinterOutlined,
  SolutionOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { opdApi, type PatientOut, type PrescriptionItemIn, type VisitOut } from "./api";
import VisitHistoryList from "./VisitHistoryList";
import { useCan } from "./useCan";

const COMMON_DIAGNOSES = [
  "Acute upper respiratory infection",
  "Viral fever",
  "Hypertension",
  "Type 2 diabetes mellitus",
  "Gastritis",
  "Migraine",
];

type PrescriptionRow = PrescriptionItemIn & { key: string };

function emptyRow(): PrescriptionRow {
  return { key: crypto.randomUUID(), medicine_name: "", dose: "", frequency: "", duration: "" };
}

/** Derives the guided-workflow step purely from what's already loaded on
 * the visit - no extra fetching, just makes the existing progression
 * (complaint -> diagnosis -> prescription -> complete) visible. */
function currentStep(visit: VisitOut): number {
  if (visit.status === "completed") return 3;
  if (visit.prescriptions.length > 0) return 2;
  if (visit.diagnoses.length > 0) return 1;
  return 0;
}

/**
 * The guided consultation workspace: patient banner -> chief complaint ->
 * diagnosis -> prescription builder -> save/complete. One visit is either
 * created fresh (no ?visit= param) or resumed (existing open visit).
 */
export default function ConsultationWorkspace() {
  const { patientId: patientIdParam } = useParams();
  const patientId = Number(patientIdParam);
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = AntApp.useApp();
  const canUpdateQueue = useCan("queue:write");
  const canWriteConsultation = useCan("consultation:write");

  const routerStatePatient = (location.state as { patient?: PatientOut } | null)?.patient;

  const [visit, setVisit] = useState<VisitOut | null>(null);
  const [complaint, setComplaint] = useState("");
  const [complaintSaved, setComplaintSaved] = useState(true);
  const [diagnosisText, setDiagnosisText] = useState("");
  const [icd10, setIcd10] = useState("");
  const [rows, setRows] = useState<PrescriptionRow[]>([emptyRow()]);
  const [justSaved, setJustSaved] = useState(false);

  const flashSaved = () => {
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 900);
  };

  // Patient banner: use the object handed over by search when available,
  // otherwise (e.g. a page refresh) re-fetch it directly.
  const { data: fetchedPatient, isLoading: patientLoading, isError: patientError } = useQuery({
    queryKey: ["opd", "patient", patientId],
    queryFn: () => opdApi.getPatient(patientId),
    enabled: !routerStatePatient && Number.isFinite(patientId),
  });
  const patient = routerStatePatient ?? fetchedPatient;

  // Find (or start) today's open visit for this patient.
  const { data: visitHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["opd", "visits", "by-patient", patientId],
    queryFn: () => opdApi.listVisitsForPatient(patientId),
    enabled: Number.isFinite(patientId),
  });

  const createVisitMutation = useMutation({
    mutationFn: () => opdApi.createVisit(patientId),
    onSuccess: (created) => {
      setVisit(created);
      setComplaint(created.chief_complaint ?? "");
      queryClient.invalidateQueries({ queryKey: ["opd", "visits", "by-patient", patientId] });
    },
    onError: (err) => message.error(err instanceof Error ? err.message : "Could not start visit."),
  });

  useEffect(() => {
    if (visit || historyLoading || !visitHistory) return;
    const openVisit = visitHistory.find((v) => v.status === "open");
    if (openVisit) {
      opdApi
        .getVisit(openVisit.visit_id)
        .then((full) => {
          setVisit(full);
          setComplaint(full.chief_complaint ?? "");
        })
        .catch(() => message.error("Could not load the open visit."));
    } else {
      createVisitMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyLoading, visitHistory, visit]);

  const saveComplaintMutation = useMutation({
    mutationFn: (text: string) => opdApi.updateVisit(visit!.visit_id, { chief_complaint: text }),
    onSuccess: () => {
      setComplaintSaved(true);
      flashSaved();
    },
    onError: () => message.error("Could not save the chief complaint."),
  });

  const addDiagnosisMutation = useMutation({
    mutationFn: () => opdApi.addDiagnosis(visit!.visit_id, icd10.trim() || null, diagnosisText.trim()),
    onSuccess: (diagnosis) => {
      setVisit((v) => (v ? { ...v, diagnoses: [...v.diagnoses, diagnosis] } : v));
      setDiagnosisText("");
      setIcd10("");
      message.success("Diagnosis added");
      flashSaved();
    },
    onError: (err) => message.error(err instanceof Error ? err.message : "Could not save diagnosis."),
  });

  const savePrescriptionMutation = useMutation({
    mutationFn: () =>
      opdApi.addPrescription(
        visit!.visit_id,
        rows
          .filter((r) => r.medicine_name.trim())
          .map(({ medicine_name, dose, frequency, duration }) => ({ medicine_name, dose, frequency, duration }))
      ),
    onSuccess: (prescription) => {
      setVisit((v) => (v ? { ...v, prescriptions: [...v.prescriptions, prescription] } : v));
      setRows([emptyRow()]);
      message.success("Prescription saved");
      flashSaved();
    },
    onError: (err) => message.error(err instanceof Error ? err.message : "Could not save prescription."),
  });

  const completeVisitMutation = useMutation({
    mutationFn: () => opdApi.completeVisit(visit!.visit_id),
    onSuccess: (completed) => {
      setVisit(completed);
      message.success("Visit marked complete");
      flashSaved();
      queryClient.invalidateQueries({ queryKey: ["opd", "visits", "by-patient", patientId] });
    },
    onError: (err) => message.error(err instanceof Error ? err.message : "Could not complete visit."),
  });

  const updateRow = (key: string, patch: Partial<PrescriptionRow>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const removeRow = (key: string) => setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));
  const addRow = () => setRows((prev) => [...prev, emptyRow()]);

  if (!Number.isFinite(patientId)) {
    return <Empty description="No patient selected" />;
  }

  if (patientLoading) {
    return <Skeleton active paragraph={{ rows: 4 }} />;
  }

  if (patientError || !patient) {
    return (
      <Alert
        type="error"
        showIcon
        message="Could not load this patient"
        description={<Button onClick={() => navigate("/opd")}>Back to search</Button>}
      />
    );
  }

  const isCompleted = visit?.status === "completed";

  return (
    <div className="page opd-workspace">
      {/* --- Patient banner --- */}
      <Card className={`opd-patient-banner ${justSaved ? "pulse-success" : ""}`} size="small">
        <Space size="middle" align="center" wrap>
          <Avatar size={48} icon={<UserOutlined />} style={{ background: "var(--brand-glow)" }} />
          <div>
            <Typography.Title level={5} style={{ margin: 0 }}>{patient.name}</Typography.Title>
            <Space size="middle" wrap>
              <Tag>{patient.uhid}</Tag>
              <span>{dayjs().diff(dayjs(patient.dob), "year")} yrs, {patient.gender}</span>
              <span><PhoneOutlined /> {patient.phone}</span>
              {patient.blood_group && <Tag color="red">{patient.blood_group}</Tag>}
            </Space>
          </div>
          <div style={{ flex: 1 }} />
          {visit && (
            <Tag color={isCompleted ? "green" : "gold"} icon={isCompleted ? <CheckCircleOutlined /> : undefined}>
              {isCompleted ? "Completed" : "In progress"}
            </Tag>
          )}
        </Space>
      </Card>

      {visit && (
        <Card size="small" style={{ marginTop: 16 }}>
          <Steps
            size="small"
            current={currentStep(visit)}
            items={[
              { title: "Complaint", icon: <FileTextOutlined /> },
              { title: "Diagnosis", icon: <SolutionOutlined /> },
              { title: "Prescription", icon: <MedicineBoxOutlined /> },
              { title: "Complete", icon: <CheckCircleOutlined /> },
            ]}
          />
        </Card>
      )}

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col xs={24} lg={17}>
          {!visit && createVisitMutation.isPending && <Skeleton active paragraph={{ rows: 6 }} />}

          {visit && (
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              {/* --- Chief complaint --- */}
              <Card
                size="small"
                title="Chief complaint"
                extra={
                  complaintSaved ? (
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>Saved</Typography.Text>
                  ) : (
                    <Typography.Text type="warning" style={{ fontSize: 12 }}>Unsaved</Typography.Text>
                  )
                }
              >
                <Input.TextArea
                  rows={3}
                  disabled={isCompleted || !canUpdateQueue}
                  placeholder="What is the patient presenting with today?"
                  value={complaint}
                  onChange={(e) => {
                    setComplaint(e.target.value);
                    setComplaintSaved(false);
                  }}
                  onBlur={() => {
                    if (!complaintSaved) saveComplaintMutation.mutate(complaint);
                  }}
                />
              </Card>

              {/* --- Diagnosis --- */}
              <Card size="small" title="Diagnosis">
                <Space direction="vertical" style={{ width: "100%" }} size={8}>
                  {visit.diagnoses.length > 0 && (
                    <Space direction="vertical" size={4} style={{ width: "100%" }}>
                      {visit.diagnoses.map((d) => (
                        <div key={d.diagnosis_id}>
                          {d.icd10_code && <Tag color="blue">{d.icd10_code}</Tag>}
                          {d.description}
                        </div>
                      ))}
                    </Space>
                  )}

                  {!isCompleted && canWriteConsultation && (
                    <>
                      <Space wrap>
                        {COMMON_DIAGNOSES.map((d) => (
                          <Tag key={d} className="opd-quick-pick" onClick={() => setDiagnosisText(d)}>
                            {d}
                          </Tag>
                        ))}
                      </Space>
                      <Space.Compact style={{ width: "100%" }}>
                        <Input
                          style={{ width: 110 }}
                          placeholder="ICD-10"
                          value={icd10}
                          onChange={(e) => setIcd10(e.target.value)}
                        />
                        <Input
                          placeholder="Diagnosis description"
                          value={diagnosisText}
                          onChange={(e) => setDiagnosisText(e.target.value)}
                          onPressEnter={() => diagnosisText.trim() && addDiagnosisMutation.mutate()}
                        />
                        <Button
                          type="primary"
                          loading={addDiagnosisMutation.isPending}
                          disabled={!diagnosisText.trim()}
                          onClick={() => addDiagnosisMutation.mutate()}
                        >
                          Add
                        </Button>
                      </Space.Compact>
                    </>
                  )}
                </Space>
              </Card>

              {/* --- Prescription builder --- */}
              <Card size="small" title={<span><MedicineBoxOutlined /> Prescription</span>}>
                <Space direction="vertical" style={{ width: "100%" }} size={12}>
                  {visit.prescriptions.map((rx) => (
                    <Card key={rx.prescription_id} size="small" type="inner" title={dayjs(rx.created_at).format("DD MMM, HH:mm")}>
                      {rx.items.map((item) => (
                        <div key={item.item_id} className="opd-rx-line">
                          <b>{item.medicine_name}</b>
                          {item.dose && <span> — {item.dose}</span>}
                          {item.frequency && <span>, {item.frequency}</span>}
                          {item.duration && <span>, {item.duration}</span>}
                        </div>
                      ))}
                    </Card>
                  ))}

                  {!isCompleted && canWriteConsultation && (
                    <>
                      {rows.map((row) => (
                        <Space.Compact key={row.key} style={{ width: "100%" }}>
                          <Input
                            placeholder="Medicine"
                            value={row.medicine_name}
                            onChange={(e) => updateRow(row.key, { medicine_name: e.target.value })}
                          />
                          <Input
                            style={{ width: 110 }}
                            placeholder="Dose"
                            value={row.dose ?? ""}
                            onChange={(e) => updateRow(row.key, { dose: e.target.value })}
                          />
                          <Input
                            style={{ width: 110 }}
                            placeholder="Frequency"
                            value={row.frequency ?? ""}
                            onChange={(e) => updateRow(row.key, { frequency: e.target.value })}
                          />
                          <Input
                            style={{ width: 110 }}
                            placeholder="Duration"
                            value={row.duration ?? ""}
                            onChange={(e) => updateRow(row.key, { duration: e.target.value })}
                          />
                          <Button danger onClick={() => removeRow(row.key)} disabled={rows.length === 1}>
                            Remove
                          </Button>
                        </Space.Compact>
                      ))}
                      <Space>
                        <Button icon={<PlusOutlined />} onClick={addRow}>Add medicine</Button>
                        <Button
                          type="primary"
                          loading={savePrescriptionMutation.isPending}
                          disabled={!rows.some((r) => r.medicine_name.trim())}
                          onClick={() => savePrescriptionMutation.mutate()}
                        >
                          Save prescription
                        </Button>
                      </Space>
                    </>
                  )}
                </Space>
              </Card>
            </Space>
          )}
        </Col>

        <Col xs={24} lg={7}>
          <VisitHistoryList
            patientId={patientId}
            activeVisitId={visit?.visit_id}
            onSelectVisit={(visitId) => navigate(`/opd/visits/${visitId}`)}
          />
        </Col>
      </Row>

      {/* --- Sticky footer actions --- */}
      {visit && (
        <div className="opd-footer-bar">
          <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
            Print
          </Button>
          <Button onClick={() => navigate("/opd")}>Back to search</Button>
          <div style={{ flex: 1 }} />
          {!isCompleted && canWriteConsultation && (
            <Popconfirm
              title="Complete this visit?"
              description="This locks the visit for further edits."
              okText="Complete"
              cancelText="Not yet"
              onConfirm={() => completeVisitMutation.mutate()}
            >
              <Button type="primary" icon={<CheckCircleOutlined />} loading={completeVisitMutation.isPending}>
                Complete visit
              </Button>
            </Popconfirm>
          )}
        </div>
      )}
    </div>
  );
}
