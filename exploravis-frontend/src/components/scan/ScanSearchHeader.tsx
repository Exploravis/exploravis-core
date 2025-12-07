import { Typography, Space } from "antd";
import { GlobalOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

export default function ScanSearchHeader() {
  return (
    <Space direction="vertical" size="small" style={{ width: "100%", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <GlobalOutlined style={{ fontSize: 24, color: "#1890ff" }} />
        <Title level={2} style={{ margin: 0 }}>Network Intelligence</Title>
      </div>
      <Text type="secondary" style={{ fontSize: 14 }}>
        Explore internet-connected devices and services
      </Text>
    </Space>
  );
}
