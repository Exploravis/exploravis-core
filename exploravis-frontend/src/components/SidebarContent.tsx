// src/components/SidebarContent.tsx
import React from "react";
import {
  Globe2,
  Network,
  Navigation,
  Building,
  Hash,
  Layers,
  BarChart,
  Activity,
  ShieldCheck,
  Eye,
  FileText,
} from "lucide-react";
import WorldMapWithIPs from "./SideBarMap";
import { Card, countryFlag, Badge } from "./IPPage.helper";
import type { Scan } from "../api/scans";

interface SidebarContentProps {
  geoInfo?: {
    location?: { lat: number; lon: number };
    country?: string;
    city?: string;
  };
  asnInfo?: { number: string; org: string };
  ip: string;
  stats: any;
  timelineData: Array<{
    date: string;
    count: number;
    formattedDate: string;
  }>;
  topPorts: Array<{
    port: number;
    count: number;
    name: string;
    color: string;
  }>;
}

export const SidebarContent: React.FC<SidebarContentProps> = ({
  geoInfo,
  asnInfo,
  ip,
  stats,
  timelineData,
  topPorts,
}) => {
  return (
    <>
      {/* Geolocation Map */}
      <Card
        title={
          <div className="flex items-center gap-2 text-gray-800">
            <Globe2 className="text-blue-500 w-5 h-5" />
            <span>Geolocation</span>
          </div>
        }
      >
        {geoInfo?.location ? (
          <div className="space-y-4">
            <div className="h-48 rounded-lg overflow-hidden border border-gray-200">
              <WorldMapWithIPs
                scans={[
                  {
                    ip,
                    meta: { geo: { location: geoInfo.location } },
                    port: 0,
                    protocol: '',
                    timestamp: Date.now() / 1000,
                  } as Scan,
                ]}
                width="100%"
                height={192}
                realtime={false}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Coordinates</div>
                <div className="font-mono text-sm font-medium">
                  {geoInfo.location.lat.toFixed(4)}, {geoInfo.location.lon.toFixed(4)}
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Country</div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{countryFlag(geoInfo.country)}</span>
                  <span className="font-medium">{geoInfo.country}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() =>
                window.open(
                  `https://maps.google.com/?q=${geoInfo.location.lat},${geoInfo.location.lon}`,
                  '_blank'
                )
              }
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-medium transition"
            >
              <Navigation size={14} />
              Open in Google Maps
            </button>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <Globe2 className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <div>No geolocation data available</div>
          </div>
        )}
      </Card>

      {/* Network Information */}
      <Card
        title={
          <div className="flex items-center gap-2 text-gray-800">
            <Network className="text-purple-500 w-5 h-5" />
            <span>Network Information</span>
          </div>
        }
      >
        <div className="space-y-4">
          {asnInfo && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <Building size={18} className="text-purple-600" />
                </div>
                <div>
                  <div className="text-xs text-gray-500">Autonomous System</div>
                  <div className="font-bold text-gray-900">AS{asnInfo.number}</div>
                </div>
              </div>
              <div className="text-sm text-gray-600 truncate" title={asnInfo.org}>
                {asnInfo.org}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Hash size={14} className="text-gray-400" />
                <div className="text-xs text-gray-500">IP Version</div>
              </div>
              <div className="font-medium text-gray-900">
                {ip.includes(':') ? 'IPv6' : 'IPv4'}
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Layers size={14} className="text-gray-400" />
                <div className="text-xs text-gray-500">Protocols</div>
              </div>
              <div className="font-medium text-gray-900">
                {stats.uniqueProtocols?.length || 0}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Timeline (Last 7 Days)
            </div>
            <div className="space-y-2">
              {timelineData.map((day, index) => (
                <div key={day.date} className="flex items-center gap-3">
                  <div className="w-20 text-xs text-gray-500 shrink-0">
                    {day.formattedDate}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center">
                      <div
                        className="h-2 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full"
                        style={{
                          width: `${(day.count / Math.max(...timelineData.map(d => d.count), 1)) * 100
                            }%`,
                        }}
                      />
                      <div className="ml-2 text-xs font-medium text-gray-700 min-w-[30px] text-right">
                        {day.count}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Port Distribution */}
      <Card
        title={
          <div className="flex items-center gap-2 text-gray-800">
            <BarChart className="text-green-500 w-5 h-5" />
            <span>Port Distribution</span>
          </div>
        }
      >
        <div className="p-4 space-y-3">
          {topPorts.slice(0, 8).map((p: any) => (
            <div key={String(p.port)} className="flex items-center gap-3 group">
              <div className="flex items-center gap-2 w-28 shrink-0">
                <Badge count={p.port} color="bg-[#1890ff]" />
                <span className="text-xs font-medium text-gray-600 truncate group-hover:text-gray-900 transition">
                  {p.name}
                </span>
              </div>
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`${p.color} h-full rounded-full`}
                  style={{
                    width: `${(p.count / Math.max(...topPorts.map(p => p.count), 1)) * 100
                      }%`,
                  }}
                />
              </div>
              <div className="w-6 text-right text-xs font-bold text-gray-400 group-hover:text-gray-700 transition">
                {p.count}
              </div>
            </div>
          ))}
          {topPorts.length > 8 && (
            <div className="pt-2 border-t border-gray-100 text-center">
              <button
                onClick={() => { }}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                View all {topPorts.length} ports →
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* Quick Actions */}
      <Card
        title={
          <div className="flex items-center gap-2 text-gray-800">
            <Activity className="text-orange-500 w-5 h-5" />
            <span>Quick Actions</span>
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => window.open(`https://www.virustotal.com/gui/ip-address/${ip}`, '_blank')}
            className="flex flex-col items-center justify-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition group"
          >
            <ShieldCheck className="w-6 h-6 text-green-500 mb-1" />
            <span className="text-xs font-medium text-gray-700">VirusTotal</span>
            <span className="text-[10px] text-gray-400">Threat Intel</span>
          </button>
          <button
            onClick={() => window.open(`https://censys.io/ipv4/${ip}`, '_blank')}
            className="flex flex-col items-center justify-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition group"
          >
            <Eye className="w-6 h-6 text-blue-500 mb-1" />
            <span className="text-xs font-medium text-gray-700">Censys</span>
            <span className="text-[10px] text-gray-400">Network Intel</span>
          </button>
          <button
            onClick={() => window.open(`https://bgp.he.net/ip/${ip}`, '_blank')}
            className="flex flex-col items-center justify-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition group"
          >
            <Network className="w-6 h-6 text-purple-500 mb-1" />
            <span className="text-xs font-medium text-gray-700">BGP Toolkit</span>
            <span className="text-[10px] text-gray-400">Routing Info</span>
          </button>
          <button
            onClick={() => window.open(`https://whois.domaintools.com/${ip}`, '_blank')}
            className="flex flex-col items-center justify-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition group"
          >
            <FileText className="w-6 h-6 text-orange-500 mb-1" />
            <span className="text-xs font-medium text-gray-700">Whois</span>
            <span className="text-[10px] text-gray-400">Domain Info</span>
          </button>
        </div>
      </Card>
    </>
  );
};
