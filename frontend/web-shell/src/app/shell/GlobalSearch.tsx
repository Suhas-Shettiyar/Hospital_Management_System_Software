import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AutoComplete, Input, Typography } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { listPatients } from "../../features/patients/patientsApi";
import { useDebouncedValue } from "../../lib/useDebouncedValue";

/**
 * Signature element: the always-reachable patient search.
 * "Find the patient" is the #1 action in a clinic, so it lives in the header
 * and is focusable from anywhere with "/" or Ctrl/Cmd-K (keyboard-first).
 */
export default function GlobalSearch() {
  const ref = useRef<any>(null);
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const debouncedTerm = useDebouncedValue(term, 300);

  const { data } = useQuery({
    queryKey: ["patients", "quick-search", debouncedTerm],
    queryFn: () => listPatients({ q: debouncedTerm, limit: 8 }),
    enabled: debouncedTerm.trim().length >= 2,
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typingInField =
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement;
      if ((e.key === "/" && !typingInField) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const options = (data?.items ?? []).map((p) => ({
    value: String(p.patient_id),
    label: (
      <span>
        {p.name} <Typography.Text type="secondary">· {p.uhid} · {p.phone}</Typography.Text>
      </span>
    ),
  }));

  return (
    <AutoComplete
      style={{ width: "100%", maxWidth: 460 }}
      options={options}
      onSearch={setTerm}
      onSelect={(patientId: string) => {
        setTerm("");
        navigate(`/patients?patient=${patientId}`);
      }}
    >
      <Input
        ref={ref}
        allowClear
        size="middle"
        prefix={<SearchOutlined />}
        suffix={<kbd className="kbd-hint">/</kbd>}
        placeholder="Search patients by name, phone, or ID"
        aria-label="Search patients"
      />
    </AutoComplete>
  );
}
