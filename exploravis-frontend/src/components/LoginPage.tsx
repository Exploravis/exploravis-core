import React from "react";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../authConfig";
import {
  Button,
  Card,
  Typography,
  Alert,
  Space
} from "antd";
import {
  LoginOutlined,
  SecurityScanOutlined,
  MailOutlined
} from "@ant-design/icons";

const { Title, Text } = Typography;

const LoginPage: React.FC = () => {
  const { instance } = useMsal();

  const handleLogin = () => {
    instance.loginRedirect(loginRequest).catch((e) => {
      console.error("Login failed:", e);
    });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8fafc", // soft neutral
        padding: 24
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 10,
          border: "1px solid #e2e8f0", // very light border
          boxShadow: "none", // no shadow
          background: "#ffffff"
        }}
        bodyStyle={{ padding: 32 }}
      >
        <Space
          direction="vertical"
          size="large"
          style={{ width: "100%" }}
        >
          <div style={{ textAlign: "center" }}>
            <SecurityScanOutlined
              style={{
                fontSize: 52,
                color: "#2563eb", // Exploravis blue
                marginBottom: 12
              }}
            />
            <Title
              level={3}
              style={{
                marginBottom: 6,
                color: "#1e293b"
              }}
            >
              Exploravis Access Portal
            </Title>
            <Text style={{ color: "#64748b" }}>
              Secure sign-in required
            </Text>
          </div>

          <Alert
            message="Restricted Access"
            description={
              <>
                Only authorized Hightech accounts may sign in.
                <br />
                External Azure tenants are not permitted.
              </>
            }
            type="info"
            showIcon
            style={{
              borderRadius: 8,
              border: "1px solid #bfdbfe",
              background: "#f0f7ff"
            }}
          />

          <div
            style={{
              border: "1px solid #d1fadf",
              background: "#f6ffed",
              borderRadius: 8,
              padding: 14
            }}
          >
            <Space>
              <MailOutlined style={{ color: "#22c55e" }} />
              <Text strong>Authorized domain:</Text>
              <Text code>@Hightech.edu</Text>
            </Space>
          </div>

          <Button
            type="primary"
            size="large"
            icon={<LoginOutlined />}
            onClick={handleLogin}
            block
            style={{
              height: 46,
              fontSize: 16,
              borderRadius: 8,
              border: "1px solid #2563eb",
              background: "#2563eb"
            }}
          >
            Sign in with Azure AD
          </Button>

          <div style={{ textAlign: "center" }}>
            <Text style={{ color: "#94a3b8" }}>
              Redirecting to Microsoft login
            </Text>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default LoginPage;
