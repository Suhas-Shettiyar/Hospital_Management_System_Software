import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Typography, Input, Button, Table, Tag, Drawer, Descriptions, Space, Card } from "antd";
import { PlusOutlined, EditOutlined, MedicineBoxOutlined, ExperimentOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { listPatients, getPatient, type PatientListItem } from "./patientsApi";
import PatientFormModal from "./PatientFormModal";
import { useDebouncedValue } from "../../lib/useDebouncedValue";
import { getModules } from "../../app/moduleRegistry";

const CONSENT_COLOR: Record<string, string> = {
  granted: "success",
  pending: "warning",
  denied: "error",
  withdrawn: "default",
};

function age(dob: string): number {
  return dayjs().diff(dayjs(dob), "year");
}

export default function PatientsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  // OPD is an optional department package - only show the action if it's
  // actually registered (enabled + its remote is reachable), so a
  // deployment with OPD disabled doesn't show a dead button.
  const opdEnabled = getModules().some((m) => m.id === "opd");
  // Same reasoning as opdEnabled - Lab is also an optional department package.
  const labEnabled = getModules().some((m) => m.id === "lab");
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 300);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPatientId, setEditingPatientId] = useState<number | null>(null);
  const canWrite = useCan("patients:write");

  const { data, isLoading } = useQuery({
    queryKey: ["patients", debouncedQ, page],
    queryFn: () => listPatients({ q: debouncedQ || undefined, limit: pageSize, offset: (page - 1) * pageSize }),
  });

  // Selecting a result in the header's GlobalSearch lands here via ?patient=<id>.
  const detailPatientId = searchParams.get("patient");
  const { data: detailPatient } = useQuery({
    queryKey: ["patients", "detail", detailPatientId],
    queryFn: () => getPatient(Number(detailPatientId)),
    enabled: !!detailPatientId,
  });

  const { data: editPatient } = useQuery({
    queryKey: ["patients", "detail", editingPatientId],
    queryFn: () => getPatient(editingPatientId as number),
    enabled: editingPatientId !== null,
  });

  const closeDrawer = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("patient");
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="page">
      <div className="page-head">
        <Typography.Title level={4} style={{ margin: 0 }}>Patients</Typography.Title>
        <Typography.Text type="secondary">Register and search patient records</Typography.Text>
      </div>

      <Card className="hoverable-lift" styles={{ body: { padding: 20 } }}>
        <Space style={{ marginBottom: 16, width: "100%", justifyContent: "space-between" }}>
          <Input.Search
            allowClear
            placeholder="Search by name, phone, or UHID"
            style={{ maxWidth: 360 }}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)} disabled={!canWrite}>
            New Patient
          </Button>
        </Space>

          <Table<PatientListItem>
            rowKey="patient_id"
            loading={isLoading}
            dataSource={data?.items ?? []}
            pagination={{
              current: page,
              pageSize,
              total: data?.total ?? 0,
              onChange: setPage,
              showSizeChanger: false,
            }}
            columns={[
              { title: "UHID", dataIndex: "uhid" },
              { title: "Name", dataIndex: "name" },
              { title: "Gender", dataIndex: "gender" },
              { title: "Age", render: (_, p) => age(p.dob) },
              { title: "Phone", dataIndex: "phone" },
              {
                title: "Consent",
                dataIndex: "consent_status",
                render: (status: string) => <Tag color={CONSENT_COLOR[status] ?? "default"}>{status}</Tag>,
              },
              {
                title: "",
                width: 48 + (opdEnabled ? 40 : 0) + (labEnabled ? 40 : 0),
                render: (_, p) => (
                  <Space size={4}>
                    <Button type="text" icon={<EditOutlined />} onClick={() => setEditingPatientId(p.patient_id)} />
                    {opdEnabled && (
                      <Button
                        type="text"
                        icon={<MedicineBoxOutlined />}
                        title="Start Consultation"
                        onClick={() => navigate(`/opd/new?patient=${p.patient_id}`)}
                      />
                    )}
                    {labEnabled && (
                      <Button
                        type="text"
                        icon={<ExperimentOutlined />}
                        title="Order Lab Test"
                        onClick={() => navigate(`/lab/new?patient=${p.patient_id}`)}
                      />
                    )}
                  </Space>
                ),
              },
            ]}
          />
      </Card>

      <PatientFormModal open={modalOpen} onClose={() => setModalOpen(false)} />
      <PatientFormModal
        open={editingPatientId !== null}
        patient={editPatient}
        onClose={() => setEditingPatientId(null)}
      />

      <Drawer title="Patient Details" open={!!detailPatientId} onClose={closeDrawer} width={420}>
        {detailPatient && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="UHID">{detailPatient.uhid}</Descriptions.Item>
            <Descriptions.Item label="Name">{detailPatient.name}</Descriptions.Item>
            <Descriptions.Item label="Age / DOB">
              {age(detailPatient.dob)} yrs ({dayjs(detailPatient.dob).format("DD MMM YYYY")})
            </Descriptions.Item>
            <Descriptions.Item label="Gender">{detailPatient.gender}</Descriptions.Item>
            <Descriptions.Item label="Phone">{detailPatient.phone}</Descriptions.Item>
            <Descriptions.Item label="Address">{detailPatient.address ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="Blood group">{detailPatient.blood_group ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="Consent">
              <Tag color={CONSENT_COLOR[detailPatient.consent_status] ?? "default"}>
                {detailPatient.consent_status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="ABHA number">{detailPatient.abha_number ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="ABHA address">{detailPatient.abha_address ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="Registered on">
              {dayjs(detailPatient.created_at).format("DD MMM YYYY, HH:mm")}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
}
