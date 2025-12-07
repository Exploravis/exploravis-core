import React from "react";
import { fetchScansByIP, type IPScansResponse, type Scan } from "../api/scans";
// Port-service mapping
export const PORT_SERVICES: Record<number, { name: string; category: string; color: string }> = {
  21: { name: "FTP", category: "File Transfer", color: "bg-blue-500" },
  22: { name: "SSH", category: "Remote Access", color: "bg-orange-600" },
  23: { name: "Telnet", category: "Remote Access", color: "bg-orange-500" },
  25: { name: "SMTP", category: "Email", color: "bg-cyan-500" },
  53: { name: "DNS", category: "Network", color: "bg-indigo-600" },
  80: { name: "HTTP", category: "Web", color: "bg-emerald-500" },
  110: { name: "POP3", category: "Email", color: "bg-cyan-500" },
  143: { name: "IMAP", category: "Email", color: "bg-cyan-500" },
  443: { name: "HTTPS", category: "Web", color: "bg-emerald-500" },
  445: { name: "SMB", category: "File Sharing", color: "bg-purple-600" },
  3306: { name: "MySQL", category: "Database", color: "bg-pink-600" },
  3389: { name: "RDP", category: "Remote Access", color: "bg-orange-500" },
  5432: { name: "PostgreSQL", category: "Database", color: "bg-pink-600" },
  5900: { name: "VNC", category: "Remote Access", color: "bg-orange-500" },
  6379: { name: "Redis", category: "Database", color: "bg-pink-600" },
  8000: { name: "HTTP-Alt", category: "Web", color: "bg-emerald-500" },
  8080: { name: "HTTP-Proxy", category: "Web", color: "bg-emerald-500" },
  8086: { name: "InfluxDB", category: "Database", color: "bg-pink-600" },
  8443: { name: "HTTPS-Alt", category: "Web", color: "bg-emerald-500" },
  9200: { name: "Elasticsearch", category: "Database", color: "bg-pink-600" },
  27017: { name: "MongoDB", category: "Database", color: "bg-pink-600" },
};

export function getServiceInfo(port: number) {
  return PORT_SERVICES[port] || { name: `Port ${port}`, category: "Unknown", color: "bg-gray-400" };
}

export function countryFlag(code?: string) {
  if (!code) return "";
  const c = code.trim().toUpperCase();
  if (c.length !== 2) return "";
  return Array.from(c).map(ch => String.fromCodePoint(127397 + ch.charCodeAt(0))).join("");
}

export function formatTimestamp(ts?: number): string {
  if (!ts) return "N/A";
  const date = new Date(ts * 1000);
  const diffHours = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Reusable UI components
export const Card: React.FC<{ title?: React.ReactNode; extra?: React.ReactNode; className?: string }> = ({ title, extra, children, className }) => (
  <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`}>
    {(title || extra) && (
      <div className="bg-gray-50/80 px-4 py-3 border-b border-gray-100 flex justify-between items-center backdrop-blur-sm">
        {title && <div className="font-semibold text-gray-700 flex items-center gap-2">{title}</div>}
        {extra && <div>{extra}</div>}
      </div>
    )}
    <div className="p-0">{children}</div>
  </div>
);

export const Badge: React.FC<{ count: number | string; color?: string; className?: string }> = ({ count, color = "bg-blue-500", className }) => (
  <span className={`${color} text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[24px] text-center inline-block ${className || ''}`}>
    {count}
  </span>
);

export const StatusTag: React.FC<{ status: number }> = ({ status }) => {
  let colorClass = 'bg-gray-100 text-gray-600 border-gray-200';
  if (status >= 200 && status < 300) colorClass = 'bg-green-50 text-green-700 border-green-200';
  else if (status >= 400 && status < 500) colorClass = 'bg-amber-50 text-amber-700 border-amber-200';
  else if (status >= 500) colorClass = 'bg-red-50 text-red-700 border-red-200';
  return <span className={`px-2 py-0.5 rounded text-xs font-medium border ${colorClass}`}>HTTP {status}</span>;
};

export const ServiceTag: React.FC<{ name: string; colorClass: string }> = ({ name, colorClass }) => (
  <span className={`${colorClass} text-white text-xs font-medium px-2 py-0.5 rounded`}>{name}</span>
);

export const StatItem: React.FC<{ label: string; value: string | number; icon?: React.FC<any>; color?: string }> = ({ label, value, icon: Icon, color }) => (
  <div className="flex flex-col min-w-[100px]">
    <span className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-1">{label}</span>
    <div className="flex items-center gap-2">
      {Icon && <Icon className={`w-5 h-5 ${color || 'text-blue-500'}`} />}
      <span className="text-xl font-bold text-gray-800 font-mono">{value}</span>
    </div>
  </div>
);

