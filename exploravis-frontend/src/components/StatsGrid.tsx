import React from "react";
import {
  Wifi,
  Lock,
  Server,
  ShieldAlert,
  Calendar,
  Cpu,
} from "lucide-react";
import { formatTimestamp } from "./IPPage.helper";

interface StatsGridProps {
  stats: {
    totalPorts: number;
    tlsPorts: number;
    httpPorts: number;
    riskyPorts: number;
    riskPercentage: number;
    mostCommonService: { name: string; count: number };
  };
  lastScanned?: number;
}

export const StatsGrid: React.FC<StatsGridProps> = ({ stats, lastScanned }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center gap-2 text-blue-700 mb-1">
          <Wifi size={16} />
          <span className="text-xs font-semibold uppercase tracking-wide">OPEN PORTS</span>
        </div>
        <div className="text-2xl font-bold text-gray-900">{stats.totalPorts}</div>
        <div className="text-xs text-gray-500 mt-1">Total scanned ports</div>
      </div>

      <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
        <div className="flex items-center gap-2 text-green-700 mb-1">
          <Lock size={16} />
          <span className="text-xs font-semibold uppercase tracking-wide">TLS PORTS</span>
        </div>
        <div className="text-2xl font-bold text-gray-900">{stats.tlsPorts}</div>
        <div className="text-xs text-gray-500 mt-1">{Math.round((stats.tlsPorts / stats.totalPorts) * 100)}% secured</div>
      </div>

      <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4">
        <div className="flex items-center gap-2 text-purple-700 mb-1">
          <Server size={16} />
          <span className="text-xs font-semibold uppercase tracking-wide">HTTP PORTS</span>
        </div>
        <div className="text-2xl font-bold text-gray-900">{stats.httpPorts}</div>
        <div className="text-xs text-gray-500 mt-1">Web services detected</div>
      </div>

      <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-4">
        <div className="flex items-center gap-2 text-amber-700 mb-1">
          <ShieldAlert size={16} />
          <span className="text-xs font-semibold uppercase tracking-wide">RISK PORTS</span>
        </div>
        <div className="text-2xl font-bold text-gray-900">{stats.riskyPorts}</div>
        <div className="text-xs text-gray-500 mt-1">{stats.riskPercentage}% of total</div>
      </div>

      <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-xl p-4">
        <div className="flex items-center gap-2 text-indigo-700 mb-1">
          <Calendar size={16} />
          <span className="text-xs font-semibold uppercase tracking-wide">LAST SCAN</span>
        </div>
        <div className="text-2xl font-bold text-gray-900">
          {lastScanned ? formatTimestamp(lastScanned).split(" ")[0] : "N/A"}
        </div>
        <div className="text-xs text-gray-500 mt-1">{formatTimestamp(lastScanned || Date.now() / 1000)}</div>
      </div>

      <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 border border-cyan-200 rounded-xl p-4">
        <div className="flex items-center gap-2 text-cyan-700 mb-1">
          <Cpu size={16} />
          <span className="text-xs font-semibold uppercase tracking-wide">TOP SERVICE</span>
        </div>
        <div className="text-2xl font-bold text-gray-900">{stats.mostCommonService.name}</div>
        <div className="text-xs text-gray-500 mt-1">{stats.mostCommonService.count} ports</div>
      </div>
    </div>
  );
};
