import { Card, Tag, Typography } from "antd";
import { ExperimentOutlined } from "@ant-design/icons";

/**
 * Proves the module-federation pattern end to end: this component is built
 * and served by an entirely separate Vite project (port 5174), then loaded
 * at runtime by the web-shell host - only when this module is both running
 * AND enabled in the backend's module_registry table.
 */
export default function ExampleHelloPage() {
  return (
    <div className="page">
      <div className="page-head">
        <Typography.Title level={4} style={{ margin: 0 }}>Example Hello</Typography.Title>
        <Typography.Text type="secondary">Loaded at runtime from a separate remote (port 5174)</Typography.Text>
      </div>

      <Card>
        <Tag icon={<ExperimentOutlined />} color="processing">
          This page's antd Button/Tag/Card styling should match the host's theme exactly
        </Tag>
        <p style={{ marginTop: 16 }}>
          If you can see this page and its colors match the rest of the app, React,
          antd, and react-router-dom are all being shared correctly as singletons
          between the host and this remote.
        </p>
      </Card>
    </div>
  );
}
