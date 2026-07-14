import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Form, Input, Button, Typography, App as AntApp } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { useAuth } from "./AuthProvider";
import { brand } from "../../theme/tokens";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { message } = AntApp.useApp();
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: string })?.from ?? "/dashboard";

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      await login(values.username, values.password);
      navigate(from, { replace: true });
    } catch {
      message.error("Could not sign in. Check your details and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-brand">
          <span className="login-logo" style={{ background: brand.primary }}>M</span>
          <div>
            <Typography.Title level={3} style={{ margin: 0 }}>MedCore HMS</Typography.Title>
            <Typography.Text type="secondary">Sign in to continue</Typography.Text>
          </div>
        </div>

        <Form layout="vertical" onFinish={onFinish} requiredMark={false} autoComplete="off">
          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: "Enter your username" }]}
          >
            {/* autoFocus = keyboard-first: cursor lands here on load */}
            <Input prefix={<UserOutlined />} placeholder="e.g. frontdesk1" autoFocus size="large" />
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

        <Typography.Text type="secondary" className="login-hint">
          Demo: any username and password works until backend auth is connected.
        </Typography.Text>
      </div>
      <div className="login-side" aria-hidden />
    </div>
  );
}
