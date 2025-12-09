import axios from "axios";

// const API_URL = "http://orchestrator.exploravis.svc.cluster.local:8088";
const API_URL: string = import.meta.env.VITE_API_URL || "http://orchestrator.exploravis.svc.cluster.local:8088";

export type IPScansResponse = {
  ip: string;
  scans: Scan[];
  last_scanned?: number;
  aggs?: any;
  total?: number;
};

export async function submitScan(payload: { ip_range: string; ports: string;[k: string]: any }) {
  const res = await axios.post(`${API_URL}/scan`, payload, {
    headers: { "Content-Type": "application/json" },
  });
  return res.data;
}

export async function fetchScansByIP(ip: string): Promise<IPScansResponse> {
  const url = `${API_URL}/scans?ip=${encodeURIComponent(ip)}&size=100`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetchScansByIP failed: ${res.status} ${res.statusText}`);
  const j = await res.json();

  const scans: Scan[] = (j.results ?? j.scans ?? []) as Scan[];

  const last_scanned = scans.reduce((max: number, s: any) => {
    const ts = Number(s.timestamp ?? 0);
    return ts > max ? ts : max;
  }, 0);

  return {
    ip,
    scans,
    last_scanned: last_scanned || undefined,
    aggs: j.aggs,
    total: j.total ?? scans.length,
  };
}
export type Scan = {
  ip: string;
  port: number;
  protocol: string;
  timestamp: number;

  banner?: string;

  http?: {
    headers: Record<string, string>;
    status_code: number;
    status_line?: string;
    body_preview?: string;
  };
  tls?: {
    version?: string;
    cipher_suite?: string;
    alpn?: string;
    negotiated_protocol?: string;
    handshake_ok?: boolean;
    certificate?: {
      dns_names?: string[];
      issuer?: string;
      subject?: string;
      not_before?: string;
      not_after?: string;
      serial?: string;
      sig_alg?: string;
      public_key?: string;
    };
  };

  meta: {
    asn?: { number: number; org: string };
    geo?: { country?: string };
  };
};

export interface ScanResponse {
  results: Scan[];
  total: number;
}

export const fetchScans = async (
  query = "",
  page = 1,
  pageSize = 20,
  protocol?: string,
  port?: number
) => {
  const params: any = {
    q: query,
    size: pageSize,
    from: (page - 1) * pageSize,
  };
  if (protocol) params.protocol = protocol;
  if (port) params.port = port;

  const res = await axios.get(`${API_URL}/scans`, { params });

  return {
    results: res.data.results ?? [],
    total: res.data.total ?? 0,
    aggs: res.data.aggs ?? null,
  };
};


export const fetchScanResults = async (
  scanId: string,
  query = "",
  page = 1,
  pageSize = 20,
  protocol?: string,
  port?: number
) => {
  const params: any = {
    q: query,
    size: pageSize,
    from: (page - 1) * pageSize,
  };

  if (protocol) params.protocol = protocol;
  if (port) params.port = port;
  params.scan_id = scanId;

  const res = await axios.get(`${API_URL}/scans`, { params });

  return {
    results: res.data.results ?? [],
    total: res.data.total ?? 0,
    aggs: res.data.aggs ?? null,
  };
};
