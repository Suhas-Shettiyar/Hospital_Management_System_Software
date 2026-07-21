import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Form, Input, Button, Typography, App as AntApp, Modal } from "antd";
import { MailOutlined, LockOutlined } from "@ant-design/icons";
import { useAuth } from "./AuthProvider";

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  defaultRedirectTo?: string;
}

/** Login is modal-only, opened only on click — from the landing page's
 * nav/hero/closing CTAs. `state.from` (set when ProtectedRoute bounces an
 * anonymous visitor here) is still honored for the post-login redirect if
 * present, it just doesn't auto-open the modal anymore. */
export default function LoginModal({ open, onClose, defaultRedirectTo = "/dashboard" }: LoginModalProps) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { message } = AntApp.useApp();
  const [loading, setLoading] = useState(false);

  const bounceBackFrom = (location.state as { from?: string })?.from;

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      await login(values.email, values.password);
      onClose();
      // A genuine bounce-back target (ProtectedRoute sent them here from a
      // specific page) always wins; otherwise everyone lands on the default
      // staff destination - the sidebar's own permission filter decides
      // what a given role (patients included) actually sees from there.
      navigate(bounceBackFrom ?? defaultRedirectTo, { replace: true });
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Could not sign in. Check your details and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width={420}
      destroyOnHidden
      title={null}
      className="login-modal"
    >
      <div className="login-brand">
        <span className="login-logo">M</span>
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>MedCore HMS</Typography.Title>
          <Typography.Text type="secondary">Sign in to continue</Typography.Text>
        </div>
      </div>

      <Form layout="vertical" onFinish={onFinish} requiredMark={false} autoComplete="off">
        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: "Enter your email" },
            { type: "email", message: "Enter a valid email address" },
          ]}
        >
          {/* autoFocus = keyboard-first: cursor lands here on load */}
          <Input prefix={<MailOutlined />} placeholder="e.g. frontdesk1@clinic.example" autoFocus size="large" />
        </Form.Item>

        <Form.Item
          name="password"
          label="Password"
          rules={[{ required: true, message: "Enter your password" }]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
        </Form.Item>

        <Button type="primary" htmlType="submit" loading={loading} size="large" block>
          Sign in
        </Button>
      </Form>
    </Modal>
  );
}
