import React from "react";
import { Server, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "react-router-dom";
import type { Scan } from "../api/scans";
import { getServiceInfo, formatTimestamp } from "./IPPage.helper";
import { getRiskLevel } from "./ScanCard.helpers";
import { StatusTag } from "./IPPage.helper";

interface PortGridItemProps {
  scan: Scan;
  isExpanded: boolean;
  toggleRow: () => void;
}

export const PortGridItem: React.FC<PortGridItemProps> = ({ scan, isExpanded, toggleRow }) => {
  const service = getServiceInfo(scan.port);
  const risk = getRiskLevel(scan.port);
  const scanId = (scan as any).id || `${scan.port}-${scan.timestamp}`;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-shadow group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-100 to-blue-50 p-2 rounded-lg">
            <Server size={18} className="text-blue-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-gray-900">{scan.port}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${risk.color} bg-opacity-20`}>
                {risk.icon} {risk.level}
              </span>
            </div>
            <span className="text-xs text-gray-500">{service.name}</span>
          </div>
        </div>
        <button onClick={toggleRow} className="text-gray-400 hover:text-blue-600">
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Protocol:</span>
          <span className="font-medium font-mono">{scan.protocol}</span>
        </div>
        {scan.http && (
          <div className="flex items-center justify-between">
            <span className="text-gray-500">HTTP:</span>
            <StatusTag status={scan.http.status_code} />
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Last Seen:</span>
          <span className="text-gray-600 text-xs">{formatTimestamp(scan.timestamp)}</span>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          {scan.banner && (
            <div className="mb-3">
              <div className="text-xs text-gray-500 font-medium mb-1">Banner:</div>
              <div className="bg-gray-50 p-2 rounded text-xs font-mono break-all">{scan.banner}</div>
            </div>
          )}
          <div className="flex gap-2">
            <button
              className="flex-1 text-xs py-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition"
              onClick={() => navigator.clipboard.writeText(scan.banner || "")}
            >
              Copy Banner
            </button>
            <Link
              to={`/port/${scan.port}`}
              className="flex-1 text-xs py-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition text-center"
            >
              View Port
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
