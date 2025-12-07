import React from "react";
import { Server, Lock, Terminal } from "lucide-react";
import type { Scan } from "../api/scans";
import { StatusTag } from "./IPPage.helper";
import { TlsDetails } from "./TLSDetails";

interface ExpandedRowProps {
  scan: Scan;
  activeTab: "http" | "tls" | "banner";
  setActiveTab: (tab: "http" | "tls" | "banner") => void;
}

export const ExpandedRow: React.FC<ExpandedRowProps> = ({ scan, activeTab, setActiveTab }) => {
  return (
    <div className="py-4 pl-12 pr-4">
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100 bg-gray-50/50">
          {scan.http && (
            <div
              onClick={() => setActiveTab("http")}
              className={`px-4 py-2 text-xs font-medium flex items-center gap-2 cursor-pointer ${activeTab === "http" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600 hover:text-gray-800"
                }`}
            >
              <Server size={14} /> HTTP Response
            </div>
          )}
          {scan.tls && (
            <div
              onClick={() => setActiveTab("tls")}
              className={`px-4 py-2 text-xs font-medium flex items-center gap-2 cursor-pointer ${activeTab === "tls" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600 hover:text-gray-800"
                }`}
            >
              <Lock size={14} /> TLS Certificate
            </div>
          )}
          {scan.banner && (
            <div
              onClick={() => setActiveTab("banner")}
              className={`px-4 py-2 text-xs font-medium flex items-center gap-2 cursor-pointer ${activeTab === "banner" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600 hover:text-gray-800"
                }`}
            >
              <Terminal size={14} /> Banner
            </div>
          )}
        </div>

        <div className="p-4 space-y-4">
          {activeTab === "http" && scan.http && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-500 text-xs">Status</span>
                  <StatusTag status={scan.http.status_code} />
                </div>
                {scan.http.title && (
                  <div className="flex justify-between border-b border-gray-100 pb-1">
                    <span className="text-gray-500 text-xs">Title</span>
                    <span className="text-gray-800 text-sm font-medium">{scan.http.title}</span>
                  </div>
                )}
              </div>
              {scan.http.headers && (
                <div className="bg-gray-900 rounded-md p-3 overflow-x-auto">
                  <div className="text-[10px] text-gray-500 uppercase font-semibold mb-1">Headers</div>
                  <pre className="text-gray-300 text-xs font-mono whitespace-pre-wrap">
                    {Object.entries(scan.http.headers)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join("\n")}
                  </pre>
                </div>
              )}
            </div>
          )}

          {activeTab === "tls" && scan.tls && <TlsDetails tls={scan.tls} />}
          {activeTab === "banner" && scan.banner && (
            <div className="bg-gray-900 rounded-md p-3 overflow-x-auto">
              <pre className="text-gray-300 text-xs font-mono whitespace-pre-wrap break-all">{scan.banner}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
