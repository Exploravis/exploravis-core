import React from 'react';
import { Badge, Tooltip } from 'antd';
import {
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  DatabaseOutlined,
  ApiOutlined,
  ClusterOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { healthApi } from '../api/health.ts';
import type { KafkaHealth } from '../types/health';

// Helper functions
const getSafeStatus = (status: any): string => {
  if (typeof status === 'string') return status;
  if (status === true) return 'true';
  if (status === false) return 'false';
  return 'unknown';
};

const getSafeLowerCase = (value: any): string => {
  if (typeof value === 'string') return value.toLowerCase();
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return 'unknown';
};

// Helper to determine Kafka status
const getKafkaStatusFromData = (kafka: KafkaHealth): string => {
  if (kafka.error) return 'down';
  if (kafka.consumer_groups && kafka.consumer_groups.length > 0) return 'up';
  if (kafka.topics && kafka.topics.length > 0) return 'up';
  return 'unknown';
};

const HealthStatusBadge: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['health-badge'],
    queryFn: healthApi.getHealth,
    refetchInterval: 30000,
  });

  const getOverallStatus = () => {
    if (isLoading) return 'loading';
    if (error) return 'error';
    if (!data) return 'unknown';

    const esStatus = getSafeLowerCase(data.elasticsearch?.status);
    const kafkaStatus = getSafeLowerCase(getKafkaStatusFromData(data.kafka || {}));
    const k8sStatus = getSafeLowerCase(data.kubernetes?.status);

    const isHealthy = (status: string) =>
      ['green', 'up', 'ok', 'healthy', 'true'].includes(status);
    const isDegraded = (status: string) =>
      ['yellow', 'warning', 'degraded'].includes(status);

    if ([esStatus, kafkaStatus, k8sStatus].every(isHealthy)) return 'healthy';
    if ([esStatus, kafkaStatus, k8sStatus].some(s => s === 'red' || s === 'down' || s === 'error')) return 'degraded';
    if ([esStatus, kafkaStatus, k8sStatus].some(isDegraded)) return 'warning';

    return 'unknown';
  };

  const status = getOverallStatus();

  const statusConfig = {
    healthy: {
      color: 'success' as const,
      icon: <CheckCircleOutlined className="text-green-500" />,
      text: 'Healthy'
    },
    warning: {
      color: 'warning' as const,
      icon: <WarningOutlined className="text-yellow-500" />,
      text: 'Degraded'
    },
    degraded: {
      color: 'error' as const,
      icon: <CloseCircleOutlined className="text-red-500" />,
      text: 'Issues'
    },
    error: {
      color: 'error' as const,
      icon: <CloseCircleOutlined className="text-red-500" />,
      text: 'Error'
    },
    loading: {
      color: 'processing' as const,
      icon: <LoadingOutlined className="text-blue-500" />,
      text: 'Loading...'
    },
    unknown: {
      color: 'default' as const,
      icon: <WarningOutlined className="text-gray-500" />,
      text: 'Unknown'
    }
  }[status];

  const content = data && (
    <div className="min-w-64">
      <div className="font-semibold mb-2">System Status</div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="flex items-center">
            <DatabaseOutlined className="mr-2" />
            Elasticsearch
          </span>
          <Badge
            status={
              getSafeLowerCase(data.elasticsearch?.status) === 'green' ? 'success' :
                getSafeLowerCase(data.elasticsearch?.status) === 'yellow' ? 'warning' : 'error'
            }
            text={getSafeStatus(data.elasticsearch?.status)}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center">
            <ApiOutlined className="mr-2" />
            Kafka
          </span>
          <Badge
            status={getKafkaStatusFromData(data.kafka || {}) === 'up' ? 'success' : 'error'}
            text={getKafkaStatusFromData(data.kafka || {})}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center">
            <ClusterOutlined className="mr-2" />
            Kubernetes
          </span>
          <Badge
            status={getSafeLowerCase(data.kubernetes?.status) === 'ok' ? 'success' : 'error'}
            text={getSafeStatus(data.kubernetes?.status)}
          />
        </div>
      </div>
      <div className="mt-3 text-xs text-gray-500">
        {data.kafka?.consumer_groups?.length || 0} consumer groups, {data.kafka?.topics?.length || 0} topics
      </div>
    </div>
  );

  return (
    <Tooltip title={content}>
      <div className="flex items-center cursor-pointer hover:opacity-80">
        <span className="mr-1">{statusConfig.icon}</span>
        <Badge
          status={statusConfig.color}
          text={statusConfig.text}
        />
      </div>
    </Tooltip>
  );
};

export default HealthStatusBadge;
