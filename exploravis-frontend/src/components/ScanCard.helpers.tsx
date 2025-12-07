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

export {
  HighlightedText,
  countryFlag,
  getServiceName,
  getServiceColor,
  getServiceInfo,
  SERVICE_COLORS,
  ScanCardProps
};
