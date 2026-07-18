import { useState } from "react";
import { Button, Card, Col, Row, Typography } from "antd";
import {
  LoginOutlined,
  TeamOutlined,
  MedicineBoxOutlined,
  SafetyCertificateOutlined,
  AppstoreAddOutlined,
} from "@ant-design/icons";
import LoginModal from "../auth/LoginModal";

const FEATURES = [
  {
    icon: <TeamOutlined />,
    tint: "var(--brand-accent-soft)",
    color: "var(--brand-accent)",
    title: "Unified patient records",
    description:
      "Every patient's demographics, contact details, and consent status live in one searchable record, shared across every department instead of siloed paper files.",
  },
  {
    icon: <MedicineBoxOutlined />,
    tint: "var(--success-bg)",
    color: "var(--brand-primary)",
    title: "Guided OPD consultations",
    description:
      "A step-by-step workflow — chief complaint, diagnosis, prescription, complete — keeps outpatient visits consistent and nothing gets skipped under pressure.",
  },
  {
    icon: <SafetyCertificateOutlined />,
    tint: "var(--warning-bg)",
    color: "var(--brand-primary)",
    title: "Consent and audit built in",
    description:
      "Patient consent is tracked through its full lifecycle, and every sensitive action is written to an append-only audit log — compliance isn't bolted on afterward.",
  },
  {
    icon: <AppstoreAddOutlined />,
    tint: "var(--brand-accent-soft)",
    color: "var(--brand-accent)",
    title: "Grows department by department",
    description:
      "Outpatient is live today; Lab, Pharmacy, and IPD plug into the same module architecture without disrupting what's already running.",
  },
];

function scrollToFeatures() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.getElementById("features")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
}

export default function LandingPage() {
  // Sign in is click-only — the modal never opens itself, including on a
  // ProtectedRoute bounce (state.from is still read by LoginModal once the
  // user clicks Sign in, it's just not used to auto-trigger the modal).
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="landing-nav-brand">
          <span className="login-logo landing-nav-logo">M</span>
          <span className="landing-nav-name">MedCore HMS</span>
        </div>
        <Button type="primary" icon={<LoginOutlined />} onClick={() => setLoginOpen(true)}>
          Sign in
        </Button>
      </nav>

      <section className="landing-hero surface-brand">
        <div className="landing-hero-content">
          <span className="landing-kicker">Hospital Management, Simplified</span>
          <Typography.Title level={1} style={{ color: "#fff", margin: "12px 0 0" }}>
            Run your hospital with clarity.
          </Typography.Title>
          <Typography.Paragraph style={{ color: "rgba(255,255,255,0.85)", fontSize: 18, maxWidth: 560 }}>
            One connected system for patient records, outpatient consultations, and department
            workflows — built for the pace of a real clinic, not a boardroom demo.
          </Typography.Paragraph>
          <div className="landing-hero-cta">
            <Button type="primary" size="large" icon={<LoginOutlined />} onClick={() => setLoginOpen(true)}>
              Sign in
            </Button>
            <Button size="large" ghost onClick={scrollToFeatures}>
              See what's inside
            </Button>
          </div>
        </div>
      </section>

      <section className="landing-features surface-tint" id="features">
        <Typography.Title level={2} style={{ textAlign: "center", marginBottom: 40 }}>
          Everything your front office and clinicians need, in one place.
        </Typography.Title>
        <Row gutter={[24, 24]}>
          {FEATURES.map((f) => (
            <Col xs={24} sm={12} lg={6} key={f.title}>
              <Card className="hoverable-lift" styles={{ body: { padding: 24 } }} style={{ height: "100%" }}>
                <div className="landing-feature-icon" style={{ background: f.tint, color: f.color }}>
                  {f.icon}
                </div>
                <Typography.Title level={5} style={{ marginTop: 16, marginBottom: 8 }}>
                  {f.title}
                </Typography.Title>
                <Typography.Text type="secondary">{f.description}</Typography.Text>
              </Card>
            </Col>
          ))}
        </Row>
      </section>

      <section className="landing-closing surface-brand">
        <Typography.Title level={2} style={{ color: "#fff", margin: 0 }}>
          See it running in your clinic.
        </Typography.Title>
        <Typography.Paragraph style={{ color: "rgba(255,255,255,0.85)", fontSize: 16, maxWidth: 520 }}>
          No procurement cycle, no vendor lock-in — it's already built for how outpatient
          departments actually work.
        </Typography.Paragraph>
        <Button type="primary" size="large" icon={<LoginOutlined />} onClick={() => setLoginOpen(true)}>
          Sign in to get started
        </Button>
      </section>

      <footer className="landing-footer">
        <Typography.Text type="secondary">© 2026 MedCore HMS</Typography.Text>
      </footer>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}
