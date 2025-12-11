export interface HealthResponse {
  elasticsearch: ElasticsearchHealth;
  kafka: KafkaHealth;
  kubernetes: KubernetesHealth;
  status: 'healthy' | 'degraded' | 'down';
}

export interface ElasticsearchHealth {
  active_primary_shards: number;
  active_shards: number;
  active_shards_percent_as_number: number;
  cluster_name: string;
  delayed_unassigned_shards: number;
  initializing_shards: number;
  number_of_data_nodes: number;
  number_of_in_flight_fetch: number;
  number_of_nodes: number;
  number_of_pending_tasks: number;
  relocating_shards: number;
  status: 'green' | 'yellow' | 'red';
  task_max_waiting_in_queue_millis: number;
  timed_out: boolean;
  unassigned_shards: number;
}

export interface KafkaHealth {
  consumer_groups?: ConsumerGroup[];
  topics?: Topic[];
  error?: string;
}

export interface ConsumerGroup {
  coordinator: number;
  group: string;
  protocol_type: string;
  state: string;
}

export interface Topic {
  name: string;
  partitions: number;
  replicas: number[];
}

export interface KubernetesHealth {
  message?: string;
  error?: string;
  nodes?: KubernetesNode[];
  status: 'ok' | 'down' | 'error';
}

export interface KubernetesNode {
  capacity_cpu: string;
  capacity_memory: string;
  external_ip: string;
  internal_ip: string;
  name: string;
  node: any;
  status: 'True' | 'False';
}
