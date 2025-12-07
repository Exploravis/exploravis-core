// src/pages/ScanSearch.tsx
import React, { useEffect, useMemo, useState, type JSX } from "react";
import SidebarMap from "../components/SideBarMap";
import {
  Input,
  Row,
  Col,
  Pagination,
  Empty,
  Select,
  Space,
  Button,
  Typography,
  Card,
  Divider,
  Tooltip,
  Grid,
  Slider,
  Dropdown,
  Menu,
} from "antd";
import debounce from "just-debounce-it";
import ScanCard from "../components/ScanCard";
import { fetchScans } from "../api/scans";
import type { Scan } from "../api/scans";
import {
  SearchOutlined,
  FilterOutlined,
  DownloadOutlined,
  SettingOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  GlobalOutlined,
} from "@ant-design/icons";
import SegmentedMap from "../components/SideBarMap";
import WorldMapWithIPs from "../components/SideBarMap";

const { Option } = Select;
const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const PAGE_SIZE = 24;

const SORT_OPTIONS = [
  { label: "Latest First", value: "-timestamp" },
  { label: "Oldest First", value: "timestamp" },
  { label: "Port Ascending", value: "port" },
  { label: "Port Descending", value: "-port" },
  { label: "Most Popular", value: "-popularity" },
];

const PORT_OPTIONS = [
  { label: "HTTP (80)", value: 80 },
  { label: "HTTPS (443)", value: 443 },
  { label: "SSH (22)", value: 22 },
  { label: "FTP (21)", value: 21 },
  { label: "Telnet (23)", value: 23 },
  { label: "SMTP (25)", value: 25 },
  { label: "DNS (53)", value: 53 },
  { label: "RDP (3389)", value: 3389 },
  { label: "MySQL (3306)", value: 3306 },
  { label: "Redis (6379)", value: 6379 },
  { label: "PostgreSQL (5432)", value: 5432 },
  { label: "MongoDB (27017)", value: 27017 },
];

export default function ScanSearch(): JSX.Element {
  const [scans, setScans] = useState<Scan[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [protocolFilter, setProtocolFilter] = useState<string | undefined>();
  const [portFilter, setPortFilter] = useState<number | undefined>();
  const [sortBy, setSortBy] = useState("-timestamp");
  const [showFilters, setShowFilters] = useState(false);
  const [aggs, setAggs] = useState<any>(null);
  const [advancedFilters, setAdvancedFilters] = useState({
    hasTls: null as boolean | null,
    hasHttp: null as boolean | null,
    minPort: 1,
    maxPort: 65535,
  });
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const screens = useBreakpoint();

  const doFetch = useMemo(
    () =>
      debounce(async (q: string, p: number, proto?: string, port?: number, sort?: string) => {
        setLoading(true);
        try {
          const res = await fetchScans(q, p, PAGE_SIZE, proto, port, sort);
          setScans(res.results ?? []);
          setAggs(res.aggs ?? null);
          setTotal(res.total ?? 0);
        } finally {
          setLoading(false);
        }
      }, 500),
    []
  );

  useEffect(() => {
    doFetch(query, page, protocolFilter, portFilter, sortBy);
  }, [query, page, protocolFilter, portFilter, sortBy, doFetch]);

  useEffect(() => setPage(1), [protocolFilter, portFilter, sortBy]);

  const clearAllFilters = () => {
    setProtocolFilter(undefined);
    setPortFilter(undefined);
    setQuery("");
    setSortBy("-timestamp");
    setAdvancedFilters({ hasTls: null, hasHttp: null, minPort: 1, maxPort: 65535 });
    setPage(1);
  };

  const appliedFilters = [
    ...(protocolFilter ? [{ key: "protocol", label: `Protocol: ${protocolFilter.toUpperCase()}` }] : []),
    ...(portFilter ? [{ key: "port", label: `Port: ${portFilter}` }] : []),
    ...(query ? [{ key: "query", label: `Search: "${query}"` }] : []),
  ];

  const handleSearchChange = (value: string) => {
    setPage(1);
    setQuery(value);
  };

  const exportMenu = (
    <Menu
      items={[
        { key: "json", label: "Export as JSON", icon: <DownloadOutlined /> },
        { key: "csv", label: "Export as CSV", icon: <DownloadOutlined /> },
        { key: "pdf", label: "Export as PDF", icon: <DownloadOutlined /> },
      ]}
    />
  );

  const renderSkeletons = () => (
    <Row gutter={[16, 16]}>
      {Array.from({ length: PAGE_SIZE }).map((_, idx) => (
        <Col key={idx} xs={24}>
          <ScanCard scan={scans[idx] ?? ({} as Scan)} highlightQuery={query} viewMode="grid" />
        </Col>
      ))}
    </Row>
  );

  return (
    <div style={{ padding: 16, fontFamily: "'Inter', sans-serif" }}>
      <Row gutter={16}>
        {/* Sidebar */}
        <Col xs={24} md={6}>
          <Card
            size="small"
            style={{
              position: screens.md ? "sticky" : "static",
              top: 16,
              padding: 16,
              fontSize: 14,
              lineHeight: 1.6,
            }}
            bodyStyle={{ padding: 0 }}
          >
            {/* Scan Metrics */}
            <div className="space-y-3 mb-4">
              {[
                { label: "Total Results", value: total.toLocaleString() },
                { label: "Active Scans", value: scans.filter((s) => s.meta?.alive).length },
                { label: "Last Updated", value: scans[0]?.timestamp ? new Date(scans[0].timestamp * 1000).toLocaleDateString() : "N/A" },
                { label: "Unique IPs", value: new Set(scans.map((s) => s.ip)).size },
                { label: "TLS Coverage", value: scans.length > 0 ? `${Math.round((scans.filter((s) => s.tls).length / scans.length) * 100)}%` : "0%" },
                { label: "HTTP Coverage", value: scans.length > 0 ? `${Math.round((scans.filter((s) => s.http).length / scans.length) * 100)}%` : "0%" },
              ].map((metric) => (
                <div key={metric.label} className="flex justify-between items-center">
                  <Text type="secondary">{metric.label}</Text>
                  <Text strong>{metric.value}</Text>
                </div>
              ))}
            </div>


            <Divider style={{ margin: "8px 0" }} />

// inside your sidebar card
            <Divider style={{ margin: "8px 0" }} />
            <WorldMapWithIPs scans={scans} width={400} height={300} />
            <Divider style={{ margin: "8px 0" }} />

            {/* Aggregations */}
            {aggs && (
              <div className="space-y-3">
                {[
                  { title: "Top Countries", buckets: aggs.by_country?.buckets },
                  { title: "Top Ports", buckets: aggs.top_ports?.buckets },
                  { title: "Top Organizations", buckets: aggs.top_orgs?.buckets },
                  { title: "Top Products", buckets: aggs.top_products?.buckets },
                  { title: "Top OS", buckets: aggs.top_os?.buckets },
                ].map(
                  ({ title, buckets }) =>
                    buckets?.length > 0 && (
                      <div key={title}>
                        <Text strong style={{ display: "block", marginBottom: 4 }}>
                          {title}
                        </Text>
                        {buckets.slice(0, 5).map((b: any) => {
                          const widthPercent = Math.min(100, (b.doc_count / buckets[0].doc_count) * 100);
                          return (
                            <div key={b.key} className="mb-1">
                              <div className="flex justify-between text-gray-800">
                                <Text>{b.key}</Text>
                                <Text>{b.doc_count.toLocaleString()}</Text>
                              </div>
                              <div className="h-1 bg-gray-200 rounded mt-1">
                                <div className="h-1 bg-blue-500 rounded" style={{ width: `${widthPercent}%` }} />
                              </div>
                            </div>
                          );
                        })}
                        {buckets.length > 5 && <Text type="secondary" style={{ fontSize: 12 }}>More...</Text>}
                      </div>
                    )
                )}
              </div>
            )}
          </Card>
        </Col>

        {/* Main Content */}
        <Col xs={24} md={18}>
          {/* Header */}
          <div style={{ marginBottom: 16 }}>
            <Space direction="vertical" size="small" style={{ width: "100%" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <GlobalOutlined style={{ fontSize: 24, color: "#1890ff" }} />
                <Title level={2} style={{ margin: 0 }}>Network Intelligence</Title>
              </div>
              <Text type="secondary" style={{ fontSize: 14 }}>Explore internet-connected devices and services</Text>
            </Space>
          </div>

          {/* Search & Filters */}
          <Card style={{ marginBottom: 16 }} bordered={false}>
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", width: "100%" }}>
                <Input
                  placeholder='Search devices, services, banners... (e.g. "Apache 2.4", "ip:192.168.1.1")'
                  prefix={<SearchOutlined />}
                  value={query}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  size="large"
                  style={{ flex: 1 }}
                  suffix={
                    <Tooltip title="Search syntax examples">
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

              {showFilters && (
                <Card size="small">
                  <Row gutter={[24, 16]}>
                    <Col xs={24} sm={8}>
                      <Text strong>TLS/SSL</Text>
                      <Space style={{ marginTop: 8 }}>
                        <Button type={advancedFilters.hasTls === true ? "primary" : "default"} size="small" onClick={() => setAdvancedFilters({ ...advancedFilters, hasTls: true })}>With TLS</Button>
                        <Button type={advancedFilters.hasTls === false ? "primary" : "default"} size="small" onClick={() => setAdvancedFilters({ ...advancedFilters, hasTls: false })}>Without TLS</Button>
                      </Space>
                    </Col>

                    <Col xs={24} sm={8}>
                      <Text strong>HTTP Service</Text>
                      <Space style={{ marginTop: 8 }}>
                        <Button type={advancedFilters.hasHttp === true ? "primary" : "default"} size="small" onClick={() => setAdvancedFilters({ ...advancedFilters, hasHttp: true })}>With HTTP</Button>
                        <Button type={advancedFilters.hasHttp === false ? "primary" : "default"} size="small" onClick={() => setAdvancedFilters({ ...advancedFilters, hasHttp: false })}>Without HTTP</Button>
                      </Space>
                    </Col>

                    <Col xs={24} sm={8}>
                      <Text strong>Port Range</Text>
                      <Slider range min={1} max={65535} defaultValue={[1, 65535]} tooltip={{ formatter: (v) => `${v}` }} style={{ marginTop: 8 }} />
                    </Col>
                  </Row>
                </Card>
              )}
            </Space>
          </Card>

          {/* Results */}
          {loading ? renderSkeletons() : scans.length === 0 ? (
            <Card>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <>
                    <Text>No scan results found</Text>
                    <Text type="secondary" style={{ fontSize: 14, display: "block", marginTop: 4 }}>Try adjusting your search criteria or filters</Text>
                  </>
                }
              >
                <Button type="primary" onClick={clearAllFilters}>Clear All Filters</Button>
              </Empty>
            </Card>
          ) : (
            <>
              <Row gutter={[16, 16]}>
                {scans.map((scan) => (
                  <Col key={scan.id} xs={24}>
                    <ScanCard scan={scan} highlightQuery={query} viewMode={viewMode} />
                  </Col>
                ))}
              </Row>
              <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
                <Pagination
                  current={page}
                  total={total}
                  pageSize={PAGE_SIZE}
                  onChange={setPage}
                  showSizeChanger
                  showQuickJumper
                  showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} items`}
                  size={screens.xs ? "small" : "default"}
                />
              </div>
            </>
          )}
        </Col>
      </Row>
    </div>
  );
}
