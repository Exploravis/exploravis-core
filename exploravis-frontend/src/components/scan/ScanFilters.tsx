import { Input, Button, Card, Space, Row, Col, Slider, Tooltip, Typography } from "antd";
import {
  SearchOutlined,
  SettingOutlined,
  FilterOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

export default function ScanFilters({
  query,
  onQueryChange,
  appliedFilters,
  showFilters,
  setShowFilters,
  advancedFilters,
  setAdvancedFilters,
}) {
  return (
    <Card style={{ marginBottom: 16 }} bordered={false}>
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        {/* Search Bar */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", width: "100%" }}>
          <Input
            placeholder='Search devices or banners (e.g. "Apache", "ip:1.1.1.1")'
            prefix={<SearchOutlined />}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            size="large"
            style={{ flex: 1 }}
            suffix={
              <Tooltip title="Advanced search syntax">
                <Button type="text" size="small" icon={<SettingOutlined />} />
              </Tooltip>
            }
          />
          <Button
            type="primary"
            icon={<FilterOutlined />}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters {appliedFilters.length > 0 && `(${appliedFilters.length})`}
          </Button>
        </div>

        {/* Expandable Filters */}
        {showFilters && (
          <Card size="small">
            <Row gutter={[24, 16]}>
              <Col xs={24} sm={8}>
                <Text strong>TLS</Text>
                <Space style={{ marginTop: 8 }}>
                  <Button
                    type={advancedFilters.hasTls ? "primary" : "default"}
                    size="small"
                    onClick={() => setAdvancedFilters({ ...advancedFilters, hasTls: true })}
                  >
                    With TLS
                  </Button>
                  <Button
                    type={advancedFilters.hasTls === false ? "primary" : "default"}
                    size="small"
                    onClick={() => setAdvancedFilters({ ...advancedFilters, hasTls: false })}
                  >
                    No TLS
                  </Button>
                </Space>
              </Col>

              <Col xs={24} sm={8}>
                <Text strong>HTTP</Text>
                <Space style={{ marginTop: 8 }}>
                  <Button
                    type={advancedFilters.hasHttp ? "primary" : "default"}
                    size="small"
                    onClick={() => setAdvancedFilters({ ...advancedFilters, hasHttp: true })}
                  >
                    HTTP
                  </Button>
                  <Button
                    type={advancedFilters.hasHttp === false ? "primary" : "default"}
                    size="small"
                    onClick={() => setAdvancedFilters({ ...advancedFilters, hasHttp: false })}
                  >
                    No HTTP
                  </Button>
                </Space>
              </Col>

              <Col xs={24} sm={8}>
                <Text strong>Port Range</Text>
                <Slider
                  range
                  min={1}
                  max={65535}
                  defaultValue={[1, 65535]}
                  style={{ marginTop: 8 }}
                />
              </Col>
            </Row>
          </Card>
        )}
      </Space>
    </Card>
  );
}
