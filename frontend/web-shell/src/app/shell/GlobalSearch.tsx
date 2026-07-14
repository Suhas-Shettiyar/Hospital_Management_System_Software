import { useEffect, useRef } from "react";
import { AutoComplete, Input } from "antd";
import { SearchOutlined } from "@ant-design/icons";

/**
 * Signature element: the always-reachable patient search.
 * "Find the patient" is the #1 action in a clinic, so it lives in the header
 * and is focusable from anywhere with "/" or Ctrl/Cmd-K (keyboard-first).
 * Wiring to the real patient API comes with the OPD module.
 */
export default function GlobalSearch() {
  const ref = useRef<any>(null);

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

  return (
    <AutoComplete style={{ width: "100%", maxWidth: 460 }} options={[]}>
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
