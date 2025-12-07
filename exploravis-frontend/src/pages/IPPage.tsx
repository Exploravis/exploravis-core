// src/pages/IPPage.tsx
import React, { useEffect, useState, useMemo, type JSX } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Globe, Clock, Database, MapPin, Lock, Search, Wifi, Shield, Cloud, Eye, Copy, Filter, BarChart,
  ChevronDown, ChevronUp, AlertCircle, Download, Server, Terminal, ExternalLink, Network, Cpu,
  Activity, ShieldAlert, Fingerprint, Globe2, Hash, FileText, ShieldCheck, ServerCog, Layers,
  Map, Navigation, Link as LinkIcon, Calendar, Users, Building, Radio, ShieldOff, DownloadCloud
} from "lucide-react";
import { fetchScansByIP, type IPScansResponse, type Scan } from "../api/scans";
import WorldMapWithIPs from "../components/SideBarMap.tsx";

import {
  HighlightedText,
  countryFlag,
  getServiceName,
  getServiceColor,
  StatItem,
  formatTimestamp,
  Card,
  Badge,
  ServiceTag,
  StatusTag,
  getServiceInfo,
  SERVICE_COLORS,
  ScanCardProps
} from "../components/IPPage.helper";
import { TlsDetails } from "../components/TLSDetails.tsx";

// New helper functions
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getRiskLevel = (port: number): { level: string; color: string; icon: JSX.Element } => {
  // Common risky ports
  const riskyPorts: { [key: number]: { level: string; color: string; icon: JSX.Element } } = {
    22: { level: 'SSH', color: 'text-orange-500', icon: <Terminal size={12} /> },
    23: { level: 'Telnet', color: 'text-red-500', icon: <ShieldAlert size={12} /> },
    21: { level: 'FTP', color: 'text-red-500', icon: <ShieldAlert size={12} /> },
    3389: { level: 'RDP', color: 'text-red-500', icon: <ShieldAlert size={12} /> },
    5900: { level: 'VNC', color: 'text-red-500', icon: <ShieldAlert size={12} /> },
    445: { level: 'SMB', color: 'text-red-500', icon: <ShieldAlert size={12} /> },
    1433: { level: 'MSSQL', color: 'text-red-500', icon: <ShieldAlert size={12} /> },
    3306: { level: 'MySQL', color: 'text-orange-500', icon: <ShieldAlert size={12} /> },
    5432: { level: 'Postgres', color: 'text-orange-500', icon: <ShieldAlert size={12} /> },
    6379: { level: 'Redis', color: 'text-orange-500', icon: <ShieldAlert size={12} /> },
    27017: { level: 'MongoDB', color: 'text-orange-500', icon: <ShieldAlert size={12} /> },
  };

  if (port in riskyPorts) return riskyPorts[port];

  if (port < 1024) return {
    level: 'System',
    color: 'text-blue-500',
    icon: <ServerCog size={12} />
  };

  return {
    level: 'Normal',
    color: 'text-green-500',
    icon: <ShieldCheck size={12} />
  };
};

export default function IPPage(): JSX.Element {
  const { ip } = useParams<{ ip?: string }>();
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aggs, setAggs] = useState<any>(null);
  const [lastScanned, setLastScanned] = useState<number | undefined>(undefined);
  const [total, setTotal] = useState<number | undefined>(undefined);
  const [searchPort, setSearchPort] = useState<string>("");
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [isLg, setIsLg] = useState<boolean>(typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);
  const [activeTabMap, setActiveTabMap] = useState<Record<string, "http" | "tls" | "banner">>({});
  const [showAllPorts, setShowAllPorts] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Function to change the active tab for a specific scan row
  const setActiveTab = (scanId: string, tab: "http" | "tls" | "banner") => {
    setActiveTabMap((prev) => ({
      ...prev,
      [scanId]: tab,
    }));
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setIsLg(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!ip) return;
    let mounted = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res: IPScansResponse = await fetchScansByIP(ip);
        if (!mounted) return;
        setScans(res.scans ?? []);
        setAggs(res.aggs ?? null);
        setLastScanned(res.last_scanned);
        setTotal(res.total);
      } catch (e: any) {
        if (mounted) {
          setError(e?.message || "Failed to load scan data");
          setScans([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [ip]);

  const filteredScans = useMemo(() => {
    let filtered = scans;
    if (searchPort) filtered = filtered.filter(s => s.port.toString().includes(searchPort));
    if (selectedService) filtered = filtered.filter(s => getServiceInfo(s.port).category === selectedService);
    return showAllPorts ? filtered : filtered.slice(0, 20);
  }, [scans, searchPort, selectedService, showAllPorts]);

  const serviceCategories = useMemo(() => {
    const set = new Set<string>();
    scans.forEach(scan => set.add(getServiceInfo(scan.port).category));
    return Array.from(set);
  }, [scans]);

  const topPorts = useMemo(() => {
    const buckets = aggs?.top_ports?.buckets ?? [];
    if (!Array.isArray(buckets)) return [];
    return buckets.map((b: any) => {
      const portNum = Number(b.key);
      return {
        port: Number.isNaN(portNum) ? b.key : portNum,
        count: Number(b.doc_count ?? 0),
        ...getServiceInfo(Number(b.key)),
      };
    });
  }, [aggs]);

  const topPortsMaxCount = topPorts.length ? Math.max(...topPorts.map(p => p.count)) : 1;

  const countryCode = useMemo(() => aggs?.by_country?.buckets?.[0]?.key ?? scans[0]?.meta?.geo?.country, [aggs, scans]);

  const ipMetadata = useMemo(() => {
    if (!scans || scans.length === 0) return null;
    return { geo: scans[0]?.meta?.geo ?? null, asn: scans[0]?.meta?.asn ?? null };
  }, [scans]);

  const geoInfo = ipMetadata?.geo;
  const asnInfo = ipMetadata?.asn;

  const toggleRow = (id: string) => setExpandedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalPorts = scans.length;
    const tlsPorts = scans.filter(s => s.tls).length;
    const httpPorts = scans.filter(s => s.http).length;
    const bannerPorts = scans.filter(s => s.banner).length;

    // Get unique protocols
    const uniqueProtocols = [...new Set(scans.map(s => s.protocol))];

    // Calculate risk assessment
    const riskyPorts = scans.filter(s => getRiskLevel(s.port).level !== 'Normal').length;

    // Get most common service
    const serviceCounts: { [key: string]: number } = {};
    scans.forEach(scan => {
      const service = getServiceInfo(scan.port).name;
      serviceCounts[service] = (serviceCounts[service] || 0) + 1;
    });
    const mostCommonService = Object.entries(serviceCounts)
      .sort((a, b) => b[1] - a[1])[0] || ['Unknown', 0];

    return {
      totalPorts,
      tlsPorts,
      httpPorts,
      bannerPorts,
      uniqueProtocols,
      riskyPorts,
      riskPercentage: Math.round((riskyPorts / totalPorts) * 100),
      mostCommonService: {
        name: mostCommonService[0],
        count: mostCommonService[1]
      }
    };
  }, [scans]);

  // Get timeline data for last 7 days
  const timelineData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const dailyCounts: { [key: string]: number } = {};
    scans.forEach(scan => {
      const date = new Date(scan.timestamp * 1000).toISOString().split('T')[0];
      if (last7Days.includes(date)) {
        dailyCounts[date] = (dailyCounts[date] || 0) + 1;
      }
    });

    return last7Days.map(date => ({
      date,
      count: dailyCounts[date] || 0,
      formattedDate: new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', 'day': 'numeric' })
    }));
  }, [scans]);

  // Export data function
  const exportData = (format: 'csv' | 'json') => {
    const data = {
      ip,
      metadata: ipMetadata,
      statistics: stats,
      scans: scans.map(scan => ({
        port: scan.port,
        protocol: scan.protocol,
        service: getServiceInfo(scan.port).name,
        banner: scan.banner,
        http: scan.http,
        tls: scan.tls,
        timestamp: new Date(scan.timestamp * 1000).toISOString()
      }))
    };

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${ip}-scan-data.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // Simplified CSV export
      const headers = ['Port', 'Protocol', 'Service', 'Banner', 'HTTP Status', 'TLS', 'Timestamp'];
      const csvRows = [
        headers.join(','),
        ...scans.map(scan => [
          scan.port,
          scan.protocol,
          getServiceInfo(scan.port).name,
          `"${(scan.banner || '').replace(/"/g, '""')}"`,
          scan.http?.status_code || '',
          scan.tls ? 'Yes' : 'No',
          new Date(scan.timestamp * 1000).toISOString()
        ].join(','))
      ];

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${ip}-scan-data.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (!ip) return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
        <AlertCircle className="w-10 h-10 text-gray-300 mb-3" />
        <span className="text-gray-500 font-medium">No IP specified</span>
      </div>
    </div>
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] bg-gray-50 m-4 rounded-lg">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-4"></div>
      <span className="text-gray-500 font-medium">Scanning {ip}...</span>
    </div>
  );

  if (error) return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-red-800">Error Loading Data</h4>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="bg-white border border-red-200 text-red-700 px-3 py-1 rounded text-sm font-medium hover:bg-red-50"
        >
          Retry
        </button>
      </div>
    </div>
  );

  if (scans.length === 0) return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
        <Database className="w-10 h-10 text-gray-300 mb-3" />
        <span className="text-gray-500 font-medium">
          No scans found for <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">{ip}</code>
        </span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8f9fa] font-sans pb-12">
      {/* Clean Header */}
      <div className="bg-white border-b border-gray-200 pt-6 pb-8 px-4 shadow-sm">
        <div className="max-w-[1800px] mx-auto">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-blue-100 to-blue-50 p-3 rounded-xl border border-blue-200">
                <Globe className="text-blue-600 w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-3xl font-bold text-gray-900 font-mono tracking-tight">{ip}</h1>
                  {countryCode && (
                    <div className="flex items-center gap-2 text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg">
                      <span className="text-xl leading-none">{countryFlag(countryCode)}</span>
                      <span className="text-sm font-medium">{countryCode}</span>
                    </div>
                  )}
                </div>
                {asnInfo && (
                  <p className="text-gray-500 text-sm mt-1 flex items-center gap-2">
                    <Network size={14} />
                    AS{asnInfo.number} • {asnInfo.org}
                  </p>
                )}
                {geoInfo?.city && (
                  <p className="text-gray-500 text-sm mt-0.5 flex items-center gap-2">
                    <MapPin size={14} />
                    {geoInfo.city}, {geoInfo.country}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="flex gap-2 bg-gray-50 rounded-lg p-1">
                <button
                  onClick={() => exportData('json')}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-white rounded-md transition-all hover:shadow-sm border border-transparent hover:border-blue-200"
                >
                  <DownloadCloud size={16} />
                  Export JSON
                </button>
                <button
                  onClick={() => exportData('csv')}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-white rounded-md transition-all hover:shadow-sm border border-transparent hover:border-blue-200"
                >
                  <Download size={16} />
                  Export CSV
                </button>
              </div>
              <button
                onClick={() => window.open(`https://www.shodan.io/host/${ip}`, '_blank')}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm hover:shadow-md"
              >
                <ExternalLink size={16} />
                View on Shodan
              </button>
            </div>
          </div>

          {/* Stats Grid */}
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
                {lastScanned ? formatTimestamp(lastScanned).split(' ')[0] : 'N/A'}
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
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-4 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            {/* Ports Table Card */}
            <Card
              className="min-h-[500px]"
              title={
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-800">
                    <Shield className="text-blue-600 w-5 h-5" />
                    <span>Open Ports ({scans.length})</span>
                    <span className="text-xs text-gray-500 font-normal">
                      • Filtered: {filteredScans.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg">
                      <button
                        onClick={() => setViewMode('table')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition ${viewMode === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        Table
                      </button>
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        Grid
                      </button>
                    </div>
                  </div>
                </div>
              }
              extra={
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
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${!selectedService ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      All
                    </button>
                    {serviceCategories.slice(0, 4).map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedService(cat)}
                        className={`hidden sm:block px-3 py-1.5 text-xs font-medium rounded-md transition ${selectedService === cat ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              }
            >
              {/* Grid View */}
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredScans.map((scan) => {
                    const service = getServiceInfo(scan.port);
                    const risk = getRiskLevel(scan.port);
                    const scanId = (scan as any).id || `${scan.port}-${scan.timestamp}`;

                    return (
                      <div key={scanId} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-shadow group">
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
                          <button
                            onClick={() => toggleRow(scanId)}
                            className="text-gray-400 hover:text-blue-600"
                          >
                            {expandedRows.includes(scanId) ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
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

                        {expandedRows.includes(scanId) && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            {scan.banner && (
                              <div className="mb-3">
                                <div className="text-xs text-gray-500 font-medium mb-1">Banner:</div>
                                <div className="bg-gray-50 p-2 rounded text-xs font-mono break-all">
                                  {scan.banner}
                                </div>
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
                  })}
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
                                <button onClick={() => toggleRow(scanId)} className="text-gray-400 hover:text-blue-600 p-1 rounded hover:bg-white">
                                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                              </td>
                              <td className="px-4 py-2.5">
                                <Badge count={scan.port} color="bg-[#1890ff]" />
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
                                    <Lock size={12} className="mr-1" /> TLS
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
                                    <Copy size={14} />
                                  </button>
                                  <Link
                                    to={`/port/${scan.port}`}
                                    className="text-gray-400 hover:text-blue-600 p-1.5 rounded hover:bg-white shadow-sm border border-transparent hover:border-gray-100"
                                  >
                                    <ExternalLink size={14} />
                                  </Link>
                                </div>
                              </td>
                            </tr>

                            {isExpanded && (
                              <tr className="bg-gray-50/50">
                                <td colSpan={9} className="px-4 py-0 border-b border-gray-100">
                                  <div className="py-4 pl-12 pr-4">
                                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                                      <div className="flex border-b border-gray-100 bg-gray-50/50">
                                        {scan.http && (
                                          <div onClick={() => setActiveTab(scanId, "http")} className={`px-4 py-2 text-xs font-medium flex items-center gap-2 cursor-pointer ${activeTab === "http" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600 hover:text-gray-800"}`}>
                                            <Server size={14} /> HTTP Response
                                          </div>
                                        )}
                                        {scan.tls && (
                                          <div onClick={() => setActiveTab(scanId, "tls")} className={`px-4 py-2 text-xs font-medium flex items-center gap-2 cursor-pointer ${activeTab === "tls" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600 hover:text-gray-800"}`}>
                                            <Lock size={14} /> TLS Certificate
                                          </div>
                                        )}
                                        {scan.banner && (
                                          <div onClick={() => setActiveTab(scanId, "banner")} className={`px-4 py-2 text-xs font-medium flex items-center gap-2 cursor-pointer ${activeTab === "banner" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600 hover:text-gray-800"}`}>
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
                                                  {Object.entries(scan.http.headers).map(([k, v]) => `${k}: ${v}`).join("\n")}
                                                </pre>
                                              </div>
                                            )}
                                          </div>
                                        )}

                                        {activeTab === "tls" && scan.tls && (
                                          <TlsDetails tls={scan.tls} />
                                        )}
                                        {activeTab === "banner" && scan.banner && (
                                          <div className="bg-gray-900 rounded-md p-3 overflow-x-auto">
                                            <pre className="text-gray-300 text-xs font-mono whitespace-pre-wrap break-all">{scan.banner}</pre>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
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
            </Card>
          </div>

          {/* Sidebar - 1/3 width */}
          <div className="space-y-6">
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
                      scans={[{
                        ip,
                        meta: { geo: { location: geoInfo.location } },
                        port: 0,
                        protocol: '',
                        timestamp: Date.now() / 1000
                      } as Scan]}
                      width="100%"
                      height={192}
                      realtime={false}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-500 mb-1">Coordinates</div>
                      <div className="font-mono text-sm font-medium">{geoInfo.location.lat.toFixed(4)}, {geoInfo.location.lon.toFixed(4)}</div>
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
                    onClick={() => window.open(`https://maps.google.com/?q=${geoInfo.location.lat},${geoInfo.location.lon}`, '_blank')}
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
                      {stats.uniqueProtocols.length}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Timeline (Last 7 Days)</div>
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
                              style={{ width: `${(day.count / Math.max(...timelineData.map(d => d.count))) * 100}%` }}
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
                      <span className="text-xs font-medium text-gray-600 truncate group-hover:text-gray-900 transition">{p.name}</span>
                    </div>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`${p.color} h-full rounded-full`} style={{ width: `${(p.count / topPortsMaxCount) * 100}%` }} />
                    </div>
                    <div className="w-6 text-right text-xs font-bold text-gray-400 group-hover:text-gray-700 transition">{p.count}</div>
                  </div>
                ))}
                {topPorts.length > 8 && (
                  <div className="pt-2 border-t border-gray-100 text-center">
                    <button
                      onClick={() => setSelectedService(null)}
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
          </div>
        </div>
      </div>
    </div>
  );
}
