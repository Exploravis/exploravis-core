import React from 'react'
import {
  Card,
  Badge,
  Progress,
  Tag,
  Tooltip,
  Collapse,
  Table,
  Space,
  Alert,
  List,
  Row,
  Col,
  Avatar,
  Statistic,
  Divider,
  Skeleton,
  Button,
  Typography,
  Grid
} from 'antd';
import {
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  QuestionCircleOutlined,
  DatabaseOutlined,
  ClusterOutlined,
  ApiOutlined,
  DesktopOutlined,
  LoadingOutlined,
  MessageOutlined,
  PartitionOutlined,
  TeamOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  LineChartOutlined,
  SaveOutlined,
  CloudOutlined
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { healthApi } from '../api/health.ts';
import type {
  HealthResponse,
  KafkaHealth,
  KubernetesHealth,
  ElasticsearchHealth,
  ConsumerGroup,
  Topic,
  KubernetesNode
} from '../types/health';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;
const { Panel } = Collapse;

/* ---------- helpers (unchanged API behavior) ---------- */
const toStatusString = (v: unknown): string => {
  if (typeof v === 'string') return v;
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  return 'unknown';
};
const toLower = (v: unknown): string => toStatusString(v).toLowerCase();

const getKafkaStatus = (k: KafkaHealth): 'up' | 'down' | 'unknown' => {
  if (k.error) return 'down';
  if (k.consumer_groups && k.consumer_groups.length > 0) return 'up';
  if (k.topics && k.topics.length > 0) return 'up';
  return 'unknown';
};

const StatusIcon = ({ status, size = 20 }: { status: unknown; size?: number }) => {
  const s = toLower(status);

  if (['up', 'green', 'ok', 'healthy', 'true'].includes(s))
    return <CheckCircleOutlined style={{ color: '#16a34a', fontSize: size }} />;

  if (['yellow', 'warning', 'degraded'].includes(s))
    return <WarningOutlined style={{ color: '#f59e0b', fontSize: size }} />;

  if (['down', 'red', 'error', 'false'].includes(s))
    return <CloseCircleOutlined style={{ color: '#dc2626', fontSize: size }} />;

  return <QuestionCircleOutlined style={{ color: '#9ca3af', fontSize: size }} />;
};

const StatusBadge = ({ status }: { status: unknown }) => {
  const str = toStatusString(status);
  const s = toLower(status);

  const colorMap: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
    up: 'success',
    green: 'success',
    ok: 'success',
    healthy: 'success',
    true: 'success',
    yellow: 'warning',
    warning: 'warning',
    degraded: 'warning',
    down: 'error',
    red: 'error',
    error: 'error',
    false: 'error'
  };

  return (
    <Badge
      status={colorMap[s] || 'default'}
      text={
        <Text strong style={{
          color: colorMap[s] === 'success' ? '#16a34a' :
            colorMap[s] === 'warning' ? '#f59e0b' :
              colorMap[s] === 'error' ? '#dc2626' : '#6b7280'
        }}>
          {str.toUpperCase()}
        </Text>
      }
    />
  );
};

/* ---------- component (improved UI with enterprise styling) ---------- */
const HealthCard: React.FC = () => {
  const { data, isLoading, error, refetch } = useQuery<HealthResponse>({
    queryKey: ['health'],
    queryFn: healthApi.getHealth,
    refetchInterval: 30000
  });

  const screens = useBreakpoint();

  const shellCard = (children: React.ReactNode) => (
    <div className="w-full px-4 mt-6">
      <Card
        bodyStyle={{ padding: 24 }}
        style={{
          width: '100%',
          maxWidth: 3400,
          margin: '0 auto',
          borderRadius: 12,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          border: '1px solid #e5e7eb'
        }}
      >
        {children}
      </Card>
    </div>
  );

  if (isLoading) {
    return shellCard(
      <div style={{ minHeight: 400 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center mb-1">
              <div style={{
                width: 40,
                height: 40,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12
              }}>
                <ClusterOutlined style={{ color: 'white', fontSize: 20 }} />
              </div>
              <Title level={4} style={{ margin: 0 }}>System Health Dashboard</Title>
            </div>
            <Text type="secondary">Loading health status...</Text>
          </div>
        </div>

        <Divider />

        <Row gutter={[24, 24]}>
          <Col span={24} md={16}>
            <Skeleton active paragraph={{ rows: 8 }} />
          </Col>
          <Col span={24} md={8}>
            <Skeleton active paragraph={{ rows: 6 }} />
          </Col>
        </Row>
      </div>
    );
  }

  if (error || !data) {
    return shellCard(
      <div>
        <div className="flex items-center justifybetween ">
          <div>
            <div className="flex items-center mb-1">
              <div style={{
                width: 40,
                height: 40,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12
              }}>
                <ClusterOutlined style={{ color: 'white', fontSize: 20 }} />
              </div>
              <Title level={4} style={{ margin: 0 }}>System Health Dashboard</Title>
            </div>
            <Text type="secondary">Failed to load health data</Text>
          </div>

          <Button
            icon={<ReloadOutlined />}
            onClick={() => refetch()}
            type="primary"
            size="large"
          >
            Retry
          </Button>
        </div>

        <Divider />

        <Alert
          message="Connection Error"
          description="Unable to fetch health data from the API. Please check your network connection and ensure the API server is running."
          type="error"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <Card>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Title level={5}>Troubleshooting Steps:</Title>
            <List>
              <List.Item>1. Verify API server is running</List.Item>
              <List.Item>2. Check network connectivity</List.Item>
              <List.Item>3. Verify authentication credentials</List.Item>
              <List.Item>4. Check browser console for errors</List.Item>
            </List>
          </Space>
        </Card>
      </div>
    );
  }

  const elasticsearch: ElasticsearchHealth = data.elasticsearch;
  const kafka: KafkaHealth = data.kafka || {};
  const kubernetes: KubernetesHealth = data.kubernetes || {};

  const kafkaStatus = getKafkaStatus(kafka);

  const kubernetesColumns = [
    {
      title: 'Node',
      dataIndex: 'name',
      key: 'name',
      fixed: 'left' as const,
      width: 180,
      render: (text: string) => (
        <Space>
          <Avatar
            size="small"
            icon={<DesktopOutlined />}
            style={{ background: '#3b82f6' }}
          />
          <Text strong>{text}</Text>
        </Space>
      )
    },
    {
      title: 'IP Address',
      key: 'ip',
      width: 200,
      render: (_: unknown, r: KubernetesNode) => (
        <div style={{ lineHeight: 1.4 }}>
          <div className="flex items-center">
            <CloudOutlined style={{ fontSize: 12, marginRight: 4, color: '#6b7280' }} />
            <Text type="secondary" style={{ fontSize: 12 }}>Internal</Text>
          </div>
          <Text code style={{ fontSize: 13 }}>{r.internal_ip}</Text>

          <div className="flex items-center mt-2">
            <CloudOutlined style={{ fontSize: 12, marginRight: 4, color: '#6b7280' }} />
            <Text type="secondary" style={{ fontSize: 12 }}>External</Text>
          </div>
          <Text code style={{ fontSize: 13 }}>{r.external_ip}</Text>
        </div>
      )
    },
    {
      title: 'Capacity',
      key: 'resources',
      width: 180,
      render: (_: unknown, r: KubernetesNode) => (
        <div style={{ lineHeight: 1.4 }}>
          <div className="flex items-center">
            <LineChartOutlined style={{ fontSize: 12, marginRight: 6, color: '#10b981' }} />
            <Text>CPU: <Text strong>{r.capacity_cpu}</Text></Text>
          </div>
          <div className="flex items-center mt-1">
            <SaveOutlined style={{ fontSize: 12, marginRight: 6, color: '#8b5cf6' }} />
            <Text>Memory: <Text strong>{r.capacity_memory}</Text></Text>
          </div>
        </div>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (s: KubernetesNode['status']) => (
        <Space>
          <StatusIcon status={s === 'True' ? 'up' : 'down'} />
          <Tag
            color={s === 'True' ? 'green' : 'red'}
            style={{
              fontWeight: 600,
              borderRadius: 4
            }}
          >
            {s === 'True' ? 'HEALTHY' : 'UNHEALTHY'}
          </Tag>
        </Space>
      )
    }
  ];

  const servicesUpCount = [
    elasticsearch.status === 'green' ? 1 : 0,
    kafkaStatus === 'up' ? 1 : 0,
    kubernetes.status === 'ok' ? 1 : 0
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="w-full px-4 mt-6">
      <Card
        bodyStyle={{ padding: 24 }}
        style={{
          width: '100%',
          margin: '0 auto',
          borderRadius: 12,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          border: '1px solid #e5e7eb'
        }}
      >
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div className="mb-4 md:mb-0">
            <div className="flex items-center mb-1">
              <div style={{
                width: 40,
                height: 40,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12
              }}>
                <ClusterOutlined style={{ color: 'white', fontSize: 20 }} />
              </div>
              <div>
                <Title level={4} style={{ margin: 0 }}>System Health Dashboard</Title>
                <Text type="secondary">
                  Last updated: {new Date().toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </Text>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: '#f8fafc',
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ marginRight: 12 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 8,
                  background: '#f1f5f9'
                }}>
                  <StatusIcon status={data.status} size={24} />
                </div>
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>Overall Status</Text>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <StatusBadge status={data.status} />
                </div>
              </div>
            </div>

            <Button
              icon={<ReloadOutlined />}
              onClick={() => refetch()}
              type="primary"
              size="large"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none'
              }}
            >
              Refresh
            </Button>
          </div>
        </div>

        <Divider style={{ margin: '16px 0' }} />

        <Row gutter={[24, 24]}>
          <Col xs={24} lg={16}>
            {/* Elasticsearch Card */}
            <Card
              className="mb-6"
              style={{
                borderRadius: 10,
                border: '1px solid #e5e7eb',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div style={{
                    width: 36,
                    height: 36,
                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12
                  }}>
                    <DatabaseOutlined style={{ color: 'white', fontSize: 18 }} />
                  </div>
                  <div>
                    <Title level={5} style={{ margin: 0 }}>Elasticsearch</Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Cluster: {elasticsearch.cluster_name}
                    </Text>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <StatusIcon status={elasticsearch.status} size={24} />
                  <StatusBadge status={elasticsearch.status} />
                </div>
              </div>

              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} lg={6}>
                  <Card
                    size="small"
                    className="text-center"
                    style={{ border: '1px solid #e5e7eb' }}
                    bodyStyle={{ padding: 16 }}
                  >
                    <Statistic
                      title="Shard Health"
                      value={`${elasticsearch.active_shards_percent_as_number.toFixed(1)}%`}
                      prefix={<InfoCircleOutlined style={{ color: '#3b82f6' }} />}
                    />
                    <Progress
                      percent={elasticsearch.active_shards_percent_as_number}
                      size="small"
                      strokeColor={
                        elasticsearch.active_shards_percent_as_number >= 95
                          ? '#10b981'
                          : elasticsearch.active_shards_percent_as_number >= 80
                            ? '#f59e0b'
                            : '#ef4444'
                      }
                      style={{ marginTop: 8 }}
                    />
                  </Card>
                </Col>

                <Col xs={12} sm={6} lg={6}>
                  <Card
                    size="small"
                    className="text-center"
                    style={{ border: '1px solid #e5e7eb' }}
                    bodyStyle={{ padding: 16 }}
                  >
                    <Statistic
                      title="Nodes"
                      value={elasticsearch.number_of_nodes}
                      prefix={<DesktopOutlined style={{ color: '#8b5cf6' }} />}
                    />
                  </Card>
                </Col>

                <Col xs={12} sm={6} lg={6}>
                  <Card
                    size="small"
                    className="text-center"
                    style={{ border: '1px solid #e5e7eb' }}
                    bodyStyle={{ padding: 16 }}
                  >
                    <Statistic
                      title="Active Shards"
                      value={elasticsearch.active_shards}
                      prefix={<CheckCircleOutlined style={{ color: '#10b981' }} />}
                    />
                  </Card>
                </Col>

                <Col xs={12} sm={6} lg={6}>
                  <Card
                    size="small"
                    className="text-center"
                    style={{ border: '1px solid #e5e7eb' }}
                    bodyStyle={{ padding: 16 }}
                  >
                    <Statistic
                      title="Unassigned"
                      value={elasticsearch.unassigned_shards}
                      prefix={<WarningOutlined style={{ color: '#f59e0b' }} />}
                      valueStyle={{
                        color: elasticsearch.unassigned_shards > 0 ? '#f59e0b' : '#6b7280'
                      }}
                    />
                  </Card>
                </Col>
              </Row>
            </Card>

            {/* Kafka Card */}
            <Card
              className="mb-6"
              style={{
                borderRadius: 10,
                border: '1px solid #e5e7eb',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div style={{
                    width: 36,
                    height: 36,
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12
                  }}>
                    <ApiOutlined style={{ color: 'white', fontSize: 18 }} />
                  </div>
                  <Title level={5} style={{ margin: 0 }}>Apache Kafka</Title>
                </div>

                <div className="flex items-center space-x-2">
                  <StatusIcon status={kafkaStatus} size={24} />
                  <StatusBadge status={kafkaStatus} />
                </div>
              </div>

              {kafka.error ? (
                <Alert
                  message="Kafka Connection Error"
                  description={kafka.error}
                  type="error"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              ) : (
                <>
                  <Collapse
                    ghost
                    expandIconPosition="end"
                    style={{ background: '#f8fafc', borderRadius: 6 }}
                  >
                    <Panel
                      header={
                        <div className="flex items-center">
                          <TeamOutlined style={{ marginRight: 8, color: '#3b82f6' }} />
                          <Text strong>Consumer Groups ({kafka.consumer_groups?.length || 0})</Text>
                        </div>
                      }
                      key="cg"
                    >
                      {kafka.consumer_groups?.length ? (
                        <List
                          dataSource={kafka.consumer_groups}
                          renderItem={(g: ConsumerGroup) => (
                            <List.Item
                              style={{
                                padding: '12px 16px',
                                borderBottom: '1px solid #f1f5f9',
                                background: 'white',
                                borderRadius: 6,
                                marginBottom: 8
                              }}
                            >
                              <List.Item.Meta
                                avatar={
                                  <Avatar
                                    icon={<TeamOutlined />}
                                    style={{ background: '#dbeafe' }}
                                  />
                                }
                                title={<Text strong>{g.group}</Text>}
                                description={
                                  <Space size={[4, 4]} wrap style={{ marginTop: 4 }}>
                                    <Tag color="blue" style={{ margin: 0 }}>Coordinator: {g.coordinator}</Tag>
                                    <Tag color={g.state === 'Stable' ? 'green' : 'orange'} style={{ margin: 0 }}>
                                      State: {g.state}
                                    </Tag>
                                    <Tag color="purple" style={{ margin: 0 }}>Protocol: {g.protocol_type}</Tag>
                                  </Space>
                                }
                              />
                            </List.Item>
                          )}
                        />
                      ) : (
                        <div className="text-center py-6 text-gray-500 bg-gray-50 rounded">
                          No consumer groups found
                        </div>
                      )}
                    </Panel>

                    <Panel
                      header={
                        <div className="flex items-center">
                          <PartitionOutlined style={{ marginRight: 8, color: '#8b5cf6' }} />
                          <Text strong>Topics ({kafka.topics?.length || 0})</Text>
                        </div>
                      }
                      key="topics"
                    >
                      {kafka.topics?.length ? (
                        <List
                          dataSource={kafka.topics}
                          renderItem={(t: Topic) => (
                            <List.Item
                              style={{
                                padding: '12px 16px',
                                borderBottom: '1px solid #f1f5f9',
                                background: 'white',
                                borderRadius: 6,
                                marginBottom: 8
                              }}
                            >
                              <List.Item.Meta
                                avatar={
                                  <Avatar
                                    icon={<PartitionOutlined />}
                                    style={{ background: '#f3e8ff' }}
                                  />
                                }
                                title={<Text strong>{t.name}</Text>}
                                description={
                                  <Space size={[4, 4]} wrap style={{ marginTop: 4 }}>
                                    <Tag color="blue" style={{ margin: 0 }}>Partitions: {t.partitions}</Tag>
                                    <Tag color="purple" style={{ margin: 0 }}>
                                      Replicas: {t.replicas.join(', ')}
                                    </Tag>
                                  </Space>
                                }
                              />
                            </List.Item>
                          )}
                        />
                      ) : (
                        <div className="text-center py-6 text-gray-500 bg-gray-50 rounded">
                          No topics found
                        </div>
                      )}
                    </Panel>
                  </Collapse>
                </>
              )}
            </Card>

            {/* Kubernetes Card */}
            <Card
              style={{
                borderRadius: 10,
                border: '1px solid #e5e7eb',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div style={{
                    width: 36,
                    height: 36,
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12
                  }}>
                    <ClusterOutlined style={{ color: 'white', fontSize: 18 }} />
                  </div>
                  <Title level={5} style={{ margin: 0 }}>Kubernetes Cluster</Title>
                </div>

                <div className="flex items-center space-x-2">
                  <StatusIcon status={kubernetes.status} size={24} />
                  <StatusBadge status={kubernetes.status} />
                </div>
              </div>

              {kubernetes.error ? (
                <Alert
                  message="Kubernetes Error"
                  description={kubernetes.error}
                  type="error"
                  showIcon
                />
              ) : (
                <>
                  {kubernetes.nodes?.length ? (
                    <Collapse
                      defaultActiveKey={['nodes']}
                      style={{ background: '#f8fafc', borderRadius: 6 }}
                    >
                      <Panel
                        header={
                          <div className="flex items-center">
                            <DesktopOutlined style={{ marginRight: 8, color: '#10b981' }} />
                            <Text strong>Nodes ({kubernetes.nodes.length})</Text>
                          </div>
                        }
                        key="nodes"
                      >
                        <Table<KubernetesNode>
                          dataSource={kubernetes.nodes}
                          columns={kubernetesColumns}
                          rowKey="name"
                          pagination={false}
                          size="middle"
                          scroll={{ x: screens.md ? undefined : 600 }}
                          style={{
                            borderRadius: 6,
                            overflow: 'hidden'
                          }}
                        />
                      </Panel>
                    </Collapse>
                  ) : (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded border">
                      <CloudOutlined style={{ fontSize: 32, color: '#9ca3af', marginBottom: 12 }} />
                      <div>No Kubernetes node data available</div>
                    </div>
                  )}

                  {kubernetes.message && (
                    <Alert
                      message="Cluster Status"
                      description={kubernetes.message}
                      type="info"
                      showIcon
                      style={{ marginTop: 16 }}
                    />
                  )}
                </>
              )}
            </Card>
          </Col>

          {/* Right Column - Summary & Actions */}
          <Col xs={24} lg={8}>
            {/* Health Summary Card */}
            <Card
              className="mb-6"
              style={{
                borderRadius: 10,
                border: '1px solid #e5e7eb',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
              }}
            >
              <div className="flex items-center mb-4">
                <LineChartOutlined style={{ color: '#667eea', fontSize: 20, marginRight: 12 }} />
                <Title level={5} style={{ margin: 0 }}>Health Summary</Title>
              </div>

              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <Card size="small" style={{ background: '#f8fafc' }}>
                  <Statistic
                    title="Services Status"
                    value={`${servicesUpCount}/3`}
                    suffix="active"
                    prefix={
                      <Avatar
                        size="small"
                        icon={<CheckCircleOutlined />}
                        style={{
                          background: servicesUpCount === 3 ? '#10b981' :
                            servicesUpCount >= 2 ? '#f59e0b' : '#ef4444'
                        }}
                      />
                    }
                    valueStyle={{
                      color: servicesUpCount === 3 ? '#10b981' :
                        servicesUpCount >= 2 ? '#f59e0b' : '#ef4444'
                    }}
                  />
                </Card>

                <Row gutter={[12, 12]}>
                  <Col span={12}>
                    <Card size="small" style={{ textAlign: 'center' }}>
                      <Statistic
                        title="K8s Nodes"
                        value={kubernetes.nodes?.length || 0}
                        prefix={<Avatar size="small" icon={<DesktopOutlined />} />}
                      />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card size="small" style={{ textAlign: 'center' }}>
                      <Statistic
                        title="ES Shards"
                        value={elasticsearch.active_shards}
                        prefix={<Avatar size="small" icon={<DatabaseOutlined />} />}
                      />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card size="small" style={{ textAlign: 'center' }}>
                      <Statistic
                        title="Kafka Groups"
                        value={kafka.consumer_groups?.length || 0}
                        prefix={<Avatar size="small" icon={<TeamOutlined />} />}
                      />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card size="small" style={{ textAlign: 'center' }}>
                      <Statistic
                        title="Topics"
                        value={kafka.topics?.length || 0}
                        prefix={<Avatar size="small" icon={<PartitionOutlined />} />}
                      />
                    </Card>
                  </Col>
                </Row>

                <div style={{ background: '#fefce8', padding: 16, borderRadius: 6, border: '1px solid #fef08a' }}>
                  <div className="flex items-center mb-2">
                    <InfoCircleOutlined style={{ color: '#f59e0b', marginRight: 8 }} />
                    <Text strong>System Health</Text>
                  </div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    All systems operational. Monitoring interval: 30 seconds
                  </Text>
                </div>
              </Space>
            </Card>

            {/* Quick Actions Card */}
            <Card
              style={{
                borderRadius: 10,
                border: '1px solid #e5e7eb',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
              }}
            >
              <div className="flex items-center mb-4">
                <ClusterOutlined style={{ color: '#667eea', fontSize: 20, marginRight: 12 }} />
                <Title level={5} style={{ margin: 0 }}>Quick Actions</Title>
              </div>

              <Space direction="vertical" style={{ width: '100%' }}>
                <Button
                  block
                  onClick={() => refetch()}
                  icon={<ReloadOutlined />}
                  size="large"
                  type="primary"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none'
                  }}
                >
                  Refresh Health Data
                </Button>
                <Button
                  block
                  type="default"
                  onClick={() => window.location.reload()}
                  size="large"
                >
                  Hard Reload Page
                </Button>
                <Button
                  block
                  type="dashed"
                  onClick={() => window.open('http://grafana.dev-exploravis.mywire.org/', '_blank')}
                  size="large"
                >
                  Access System Logs
                </Button>
              </Space>
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default HealthCard;
