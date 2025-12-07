import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import React from "react";
import type { Scan } from "../api/scans";
import { Typography } from "antd";

dayjs.extend(relativeTime);
const { Text, Paragraph, Title } = Typography;

/* ---------------- Helpers ---------------- */
function HighlightedText({ text, query }: { text: string; query?: string }) {
  if (!text) return null;
  if (!query) return <>{text}</>;
  try {
    const q = query.trim();
    if (!q) return <>{text}</>;
    const parts = text.split(new RegExp(`(${q})`, "i"));
    return (
      <>
        {parts.map((p, i) =>
          p.toLowerCase() === q.toLowerCase() ? (
            <mark key={i} className="bg-yellow-200/50">{p}</mark>
          ) : (
            <React.Fragment key={i}>{p}</React.Fragment>
          )
        )}
      </>
    );
  } catch {
    return <>{text}</>;
  }
}

function countryFlag(code?: string) {
  if (!code) return "🏳️";
  const c = code.trim().toUpperCase();
  if (c.length !== 2) return "🏳️";
  return c
    .split("")
    .map((ch) => String.fromCodePoint(127397 + ch.charCodeAt(0)))
    .join("");
}

const SERVICE_COLORS: Record<string, string> = {
  HTTP: "#1890ff",
  HTTPS: "#52c41a",
  SSH: "#fa541c",
  FTP: "#fa8c16",
  SMTP: "#13c2c2",
  DNS: "#2f54eb",
  RDP: "#722ed1",
  MySQL: "#eb2f96",
  PostgreSQL: "#f5222d",
  Redis: "#faad14",
  MongoDB: "#a0d911",
  TCP: "#8c8c8c",
};

function getServiceName(port?: number): string {
  const portMap: Record<number, string> = {
    21: "FTP",
    22: "SSH",
    23: "Telnet",
    25: "SMTP",
    53: "DNS",
    80: "HTTP",
    443: "HTTPS",
    3306: "MySQL",
    3389: "RDP",
    5432: "PostgreSQL",
    6379: "Redis",
    27017: "MongoDB",
  };
  return port ? portMap[port] || `Port ${port}` : "unknown";
}

function getServiceColor(service: string): string {
  return SERVICE_COLORS[service] || "#8c8c8c";
}

/* Props interface for ScanCard */
interface ScanCardProps {
  scan: Scan;
  highlightQuery?: string;
  viewMode?: "grid" | "list";
}
function getServiceInfo(port: number) {
  throw new Error("Function not implemented.");
}
import type { JSX } from "react";
import { Terminal, ShieldAlert, ServerCog, ShieldCheck } from "lucide-react";

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export const getRiskLevel = (port: number): { level: string; color: string; icon: JSX.Element } => {
  const riskyPorts: Record<number, { level: string; color: string; icon: JSX.Element }> = {
    22: { level: "SSH", color: "text-orange-500", icon: <Terminal size={12} /> },
    23: { level: "Telnet", color: "text-red-500", icon: <ShieldAlert size={12} /> },
    21: { level: "FTP", color: "text-red-500", icon: <ShieldAlert size={12} /> },
    3389: { level: "RDP", color: "text-red-500", icon: <ShieldAlert size={12} /> },
    5900: { level: "VNC", color: "text-red-500", icon: <ShieldAlert size={12} /> },
    445: { level: "SMB", color: "text-red-500", icon: <ShieldAlert size={12} /> },
    1433: { level: "MSSQL", color: "text-red-500", icon: <ShieldAlert size={12} /> },
    3306: { level: "MySQL", color: "text-orange-500", icon: <ShieldAlert size={12} /> },
    5432: { level: "Postgres", color: "text-orange-500", icon: <ShieldAlert size={12} /> },
    6379: { level: "Redis", color: "text-orange-500", icon: <ShieldAlert size={12} /> },
    27017: { level: "MongoDB", color: "text-orange-500", icon: <ShieldAlert size={12} /> },
  };

  if (port in riskyPorts) return riskyPorts[port];

  if (port < 1024) return { level: "System", color: "text-blue-500", icon: <ServerCog size={12} /> };

  return { level: "Normal", color: "text-green-500", icon: <ShieldCheck size={12} /> };
};

export {
  HighlightedText,
  countryFlag,
  getServiceName,
  getServiceColor,
  getServiceInfo,
  SERVICE_COLORS,
  ScanCardProps
};

