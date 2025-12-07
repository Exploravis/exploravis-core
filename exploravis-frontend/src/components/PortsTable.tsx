import React from "react";
import { Shield, Search } from "lucide-react";
import type { Scan } from "../api/scans";
import { getServiceInfo, ServiceTag, StatusTag, formatTimestamp } from "./IPPage.helper";
import { getRiskLevel } from "./ScanCard.helpers";
import { ExpandedRow } from "./ExpandedRow";
import { PortGridItem } from "./PortGridItem";

interface PortsTableProps {
  scans: Scan[];
  filteredScans: Scan[];
  viewMode: "table" | "grid";
  setViewMode: (mode: "table" | "grid") => void;
  searchPort: string;
  setSearchPort: (port: string) => void;
  selectedService: string | null;
  serviceCategories: string[];
  setSelectedService: (service: string | null) => void;
  expandedRows: string[];
  toggleRow: (id: string) => void;
  activeTabMap: Record<string, "http" | "tls" | "banner">;
  setActiveTab: (scanId: string, tab: "http" | "tls" | "banner") => void;
  showAllPorts: boolean;
  setShowAllPorts: (show: boolean) => void;
}

export const PortsTable: React.FC<PortsTableProps> = ({
  scans,
  filteredScans,
  viewMode,
  setViewMode,
  searchPort,
  setSearchPort,
  selectedService,
  serviceCategories,
  setSelectedService,
  expandedRows,
  toggleRow,
  activeTabMap,
  setActiveTab,
  showAllPorts,
  setShowAllPorts,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-800">
          <Shield className="text-blue-600 w-5 h-5" />
          <span>Open Ports ({scans.length})</span>
          <span className="text-xs text-gray-500 font-normal">• Filtered: {filteredScans.length}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg">
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition ${viewMode === "table" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
            >
              Table
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition ${viewMode === "grid" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
            >
              Grid
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative group">
          <Search className="absolute left-2.5 top-1.5 text-gray-400 w-4 h-4 group-focus-within:text-blue-500" />
          <input
            type="text"
            placeholder="Filter by port..."
            className="pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none w-40 transition"
            value={searchPort}
            onChange={(e) => setSearchPort(e.target.value)}
          />
        </div>
        <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg">
          <button
            onClick={() => setSelectedService(null)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${!selectedService ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
          >
            All
          </button>
          {serviceCategories.slice(0, 4).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedService(cat)}
              className={`hidden sm:block px-3 py-1.5 text-xs font-medium rounded-md transition ${selectedService === cat ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid View */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredScans.map((scan) => (
            <PortGridItem
              key={(scan as any).id || `${scan.port}-${scan.timestamp}`}
              scan={scan}
              isExpanded={expandedRows.includes((scan as any).id || `${scan.port}-${scan.timestamp}`)}
              toggleRow={() => toggleRow((scan as any).id || `${scan.port}-${scan.timestamp}`)}
            />
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase tracking-wider border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 w-10"></th>
                <th className="px-4 py-3">Port</th>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Risk</th>
                <th className="px-4 py-3">Protocol</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">TLS</th>
                <th className="px-4 py-3">Last Seen</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredScans.map((scan) => {
                const service = getServiceInfo(scan.port);
                const risk = getRiskLevel(scan.port);
                const scanId = (scan as any).id || `${scan.port}-${scan.timestamp}`;
                const isExpanded = expandedRows.includes(scanId);
                const activeTab = activeTabMap[scanId] || (scan.http ? "http" : scan.tls ? "tls" : "banner");

                return (
                  <React.Fragment key={scanId}>
                    <tr className={`hover:bg-blue-50/30 transition duration-150 group ${isExpanded ? "bg-blue-50/40" : "bg-white"}`}>
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => toggleRow(scanId)}
                          className="text-gray-400 hover:text-blue-600 p-1 rounded hover:bg-white"
                        >
                          {isExpanded ? "▲" : "▼"}
                        </button>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="inline-flex items-center justify-center min-w-[48px] px-3 py-1 text-sm font-bold text-white rounded-lg bg-[#1890ff]">
                          {scan.port}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <ServiceTag name={service.name} colorClass={service.color} />
                      </td>
                      <td className="px-4 py-2.5">
                        <div className={`flex items-center gap-1 ${risk.color}`}>
                          {risk.icon}
                          <span className="text-xs font-medium">{risk.level}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="font-mono text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded border border-gray-200">
                          {scan.protocol}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {scan.http ? <StatusTag status={scan.http.status_code} /> : <span className="text-gray-300">-</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        {scan.tls ? (
                          <span className="flex items-center text-green-600 text-xs font-medium bg-green-50 px-2 py-1 rounded border border-green-100 w-fit">
                            🔒 TLS
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">{formatTimestamp(scan.timestamp)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex gap-2 justify-end opacity-100 group-hover:opacity-100 transition-opacity">
                          <button
                            className="text-gray-400 hover:text-blue-600 p-1.5 rounded hover:bg-white shadow-sm border border-transparent hover:border-gray-100"
                            onClick={() => navigator.clipboard.writeText(scan.banner || "")}
                          >
                            📋
                          </button>
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="bg-gray-50/50">
                        <td colSpan={9} className="px-4 py-0 border-b border-gray-100">
                          <ExpandedRow scan={scan} activeTab={activeTab} setActiveTab={(tab) => setActiveTab(scanId, tab)} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!showAllPorts && scans.length > 20 && (
        <div className="mt-6 text-center">
          <button
            onClick={() => setShowAllPorts(true)}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition"
          >
            Show All {scans.length} Ports
          </button>
        </div>
      )}
    </div>
  );
};
