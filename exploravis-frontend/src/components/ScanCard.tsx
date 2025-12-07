import React, { useState } from "react";
import {
  Typography,
  Tag,
  Space,
  Button,
  Tooltip,
  Divider,
} from "antd";
import {
  CopyOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  GlobalOutlined,
  DatabaseOutlined,
  PartitionOutlined,
  ApiOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import type { Scan } from "../api/scans";
import { Link } from "react-router-dom";
import { HighlightedText, countryFlag, getServiceName, getServiceColor, ScanCardProps, Text, Paragraph, Title } from "./ScanCard.helpers";

dayjs.extend(relativeTime);
const { Text, Paragraph, Title } = Typography;

export default function ScanCard({
  scan,
  highlightQuery,
  viewMode = "grid",
}: ScanCardProps) {
  const [showRaw, setShowRaw] = useState(false);

  const ip = scan.ip || "—";
  const port = scan.port;
  const protocol = (scan.protocol ?? "TCP").toUpperCase();
  const service = getServiceName(port);
  const banner = scan.banner || scan.http?.body_preview || "";
  const timestamp = scan.timestamp ? Number(scan.timestamp) : undefined;
  const timeAgo = timestamp ? dayjs.unix(timestamp).fromNow() : null;
  const exactTime = timestamp
    ? dayjs.unix(timestamp).format("YYYY-MM-DD HH:mm")
    : "Unknown";
  const serverHeader =
    scan.http?.headers?.server || scan.tls?.certificate?.issuer || "";
  const pageTitle = scan.http?.title || "";
  const statusCode = scan.http?.status_code;
  const contentLength = scan.http?.content_length;
  const geo = scan.meta?.geo;
  const asn = scan.meta?.asn;
  const isAlive = scan.meta?.alive !== false;

  const copyToClipboard = async (text?: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch { }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col md:flex-row border border-gray-200">
      {/* LEFT column */}
      <div className="flex-shrink-0 w-full md:w-80 p-4 md:p-6 border-b md:border-b-0 md:border-r border-gray-200 bg-gray-50 flex flex-col gap-4">
        {/* IP + Flag */}
        <div>
          <div className="flex items-center gap-2">
            <div
              className="font-mono font-bold text-blue-600 truncate"
              title={`${ip}${port ? `:${port}` : ""}`}
            >

              <Link to={`/ip/${ip}`} className="flex-1">
                {ip}
                {port && <span className="text-gray-500">:{port}</span>}

              </Link>
            </div>
            <div className="text-lg">{countryFlag(geo?.country)}</div>
          </div>
          <div className="mt-1 text-gray-500 text-xs">
            <div>{geo?.country || "Unknown country"}</div>
            {geo?.city && <div>{geo.city}</div>}
          </div>
        </div>

        {/* ASN */}
        {asn && (
          <div className="p-2 rounded border border-gray-200 bg-white">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              ASN
            </div>
            <div className="mt-1 font-mono font-bold">AS{asn.number}</div>
            <div className="mt-1 text-gray-500 text-sm truncate" title={asn.org}>
              {asn.org}
            </div>
          </div>
        )}

        {/* Tags / status */}
        <div className="flex flex-col gap-2">
          <Space wrap>
            <Tag color={getServiceColor(service)} className="font-bold">{service}</Tag>
            <Tag color={protocol === "HTTPS" ? "green" : "blue"}>{protocol}</Tag>
            <Tag
              className={`font-bold border`}
              style={{
                background:
                  scan.meta?.risk?.toLowerCase() === "high"
                    ? "#fff1f0"
                    : scan.meta?.risk?.toLowerCase() === "medium"
                      ? "#fffbe6"
                      : "#f6ffed",
                color:
                  scan.meta?.risk?.toLowerCase() === "high"
                    ? "#cf1322"
                    : scan.meta?.risk?.toLowerCase() === "medium"
                      ? "#d48806"
                      : "#237804",
                borderColor: "rgba(0,0,0,0.04)",
              }}
            >
              {scan.meta?.risk?.toUpperCase() || "LOW"}
            </Tag>
          </Space>

          <div className="flex items-center gap-2 mt-2">
            <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-full border ${isAlive
              ? "bg-green-50 border-green-200"
              : "bg-gray-100 border-gray-200"
              }`}>
              <div className={`w-2.5 h-2.5 rounded-full ${isAlive ? "bg-green-600" : "bg-gray-400"}`} />
              <div className={`font-semibold ${isAlive ? "text-green-800" : "text-gray-500"}`}>
                {isAlive ? "Alive" : "Offline"}
              </div>
            </div>
            {timeAgo && <div className="text-gray-500 text-xs">{timeAgo}</div>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 mt-2">
          <div className="flex gap-2">
            <Tooltip title="Copy IP">
              <Button size="small" icon={<CopyOutlined />} onClick={() => copyToClipboard(ip)} />
            </Tooltip>
            <Tooltip title={showRaw ? "Hide technical details" : "Show technical details"}>
              <Button size="small" icon={showRaw ? <EyeInvisibleOutlined /> : <EyeOutlined />} onClick={() => setShowRaw(!showRaw)}>
                {showRaw ? "Hide Raw" : "Raw"}
              </Button>
            </Tooltip>
            <Tooltip title="Details">
              <Link to={`/ip/${ip}`} className="flex-1">
                <Button size="small" icon={<GlobalOutlined />}>Details</Button>
              </Link>
            </Tooltip>
          </div>
          <div className="flex gap-2">
            <Tooltip title="Network info">
              <Button size="small" icon={<PartitionOutlined />}>Network</Button>
            </Tooltip>
            <Tooltip title="API / scan">
              <Button size="small" icon={<ApiOutlined />}>API</Button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* RIGHT column */}
      <div className="flex-1 p-4 md:p-6 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <Title level={4} className="m-0 truncate">
              {pageTitle || `${service} on ${ip}`}
            </Title>
            {serverHeader && (
              <div className="flex items-center gap-2 text-gray-500 text-sm mt-1">
                <DatabaseOutlined />
                <div className="font-mono bg-gray-100 px-2 py-1 rounded">{serverHeader}</div>
              </div>
            )}
          </div>
          {statusCode && (
            <Tag color={statusCode >= 200 && statusCode < 300 ? "success" : statusCode >= 400 ? "error" : "warning"}>
              HTTP {statusCode}
            </Tag>
          )}
        </div>

        <Divider className="my-2" />

        {/* Banner */}
        {/* Banner / Response */}
        <div className="mb-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Banner / Response
          </div>

          {banner ? (
            <div className="bg-gray-50 border border-gray-200 rounded p-3 overflow-x-auto">
              <pre className="font-mono text-sm text-left m-0 whitespace-pre-wrap">
                <HighlightedText text={banner} query={highlightQuery} />
              </pre>
            </div>
          ) : (
            <div className="text-gray-500 italic text-sm">No banner information available</div>
          )}
        </div>

        {/* Additional details */}
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Additional details
          </div>
          <div className="flex flex-wrap gap-2">
            {scan.tls?.version && (
              <div className="bg-blue-50 text-blue-800 px-2 py-1 rounded text-sm">
                <strong className="mr-1">TLS:</strong>
                <span className="font-mono">{scan.tls.version}</span>
              </div>
            )}
            {scan.meta?.bytes_read !== undefined && (
              <div className="bg-purple-50 text-purple-800 px-2 py-1 rounded text-sm">
                <strong className="mr-1">Bytes read:</strong>
                <span className="font-mono">{scan.meta.bytes_read.toLocaleString()} B</span>
              </div>
            )}
            {contentLength !== undefined && (
              <div className="bg-green-50 text-green-800 px-2 py-1 rounded text-sm">
                <strong className="mr-1">Content:</strong>
                <span className="font-mono">{contentLength.toLocaleString()} B</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center border-t border-gray-200 pt-2">
          <Space>
            <Tooltip title="Network info"><Button size="small" icon={<PartitionOutlined />} /></Tooltip>
            <Tooltip title="API / scan details"><Button size="small" icon={<ApiOutlined />} /></Tooltip>
          </Space>
          <div className="flex items-center gap-2 text-gray-500 text-xs">
            <div>Last scanned</div>
            <div className="font-mono text-gray-800">{exactTime}</div>
            <div>|</div>
            <div>{timeAgo}</div>
          </div>
        </div>

        {/* Raw details */}
        {showRaw && (
          <div className="max-h-72 overflow-auto">
            {scan.http && (
              <>
                <div className="font-bold mb-1">HTTP response</div>
                {scan.http.status_line && <div className="font-mono mb-1">{scan.http.status_line}</div>}
                {scan.http.headers && (
                  <div className="bg-gray-50 border border-gray-200 rounded p-2">
                    {Object.entries(scan.http.headers).map(([k, v]) => (
                      <div key={k} className="mb-1 flex">
                        <Text type="secondary" className="min-w-[120px]">{k}:</Text>
                        <span className="ml-2 font-mono">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            {scan.tls && (
              <div className="mt-2">
                <div className="font-bold mb-1">TLS / Certificate</div>
                {scan.tls.certificate?.subject && <div className="font-mono">{scan.tls.certificate.subject}</div>}
                {scan.tls.certificate?.issuer && <div className="font-mono mt-1">{scan.tls.certificate.issuer}</div>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
