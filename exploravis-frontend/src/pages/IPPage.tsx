// src/pages/IPPage.tsx
import React, { useEffect, useState, useMemo, type JSX } from "react";
import { useParams } from "react-router-dom";
import { AlertCircle, Database } from "lucide-react";
import { fetchScansByIP, type IPScansResponse, type Scan } from "../api/scans";
import { getServiceInfo } from "../components/IPPage.helper";
import { IPHeader } from "../components/IPHeader";
import { StatsGrid } from "../components/StatsGrid";
import { PortsTable } from "../components/PortsTable";
import { SidebarContent } from "../components/SidebarContent";
import { Card } from "../components/IPPage.helper";
import { getRiskLevel } from "../components/ScanCard.helpers";

export default function IPPage(): JSX.Element {
  const { ip } = useParams<{ ip?: string }>();
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aggs, setAggs] = useState<any>(null);
  const [lastScanned, setLastScanned] = useState<number | undefined>(undefined);
  const [searchPort, setSearchPort] = useState<string>("");
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [activeTabMap, setActiveTabMap] = useState<Record<string, "http" | "tls" | "banner">>({});
  const [showAllPorts, setShowAllPorts] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  const setActiveTab = (scanId: string, tab: "http" | "tls" | "banner") => {
    setActiveTabMap((prev) => ({ ...prev, [scanId]: tab }));
  };

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
      } catch (e: any) {
        if (mounted) {
          setError(e?.message || "Failed to load scan data");
          setScans([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [ip]);

  const filteredScans = useMemo(() => {
    let filtered = scans;
    if (searchPort) filtered = filtered.filter((s) => s.port.toString().includes(searchPort));
    if (selectedService) filtered = filtered.filter((s) => getServiceInfo(s.port).category === selectedService);
    return showAllPorts ? filtered : filtered.slice(0, 20);
  }, [scans, searchPort, selectedService, showAllPorts]);

  const serviceCategories = useMemo(() => {
    const set = new Set<string>();
    scans.forEach((scan) => set.add(getServiceInfo(scan.port).category));
    return Array.from(set);
  }, [scans]);

  // In IPPage.tsx, add these useMemo calculations:

  // Get top ports from aggregations
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
      formattedDate: new Date(date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      })
    }));
  }, [scans]);

  const countryCode = useMemo(
    () => aggs?.by_country?.buckets?.[0]?.key ?? scans[0]?.meta?.geo?.country,
    [aggs, scans]
  );

  const ipMetadata = useMemo(() => {
    if (!scans || scans.length === 0) return null;
    return { geo: scans[0]?.meta?.geo ?? null, asn: scans[0]?.meta?.asn ?? null };
  }, [scans]);

  const geoInfo = ipMetadata?.geo;
  const asnInfo = ipMetadata?.asn;

  const toggleRow = (id: string) =>
    setExpandedRows((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));

  // Calculate statistics
  const stats = useMemo(() => {
    const totalPorts = scans.length;
    const tlsPorts = scans.filter((s) => s.tls).length;
    const httpPorts = scans.filter((s) => s.http).length;
    const riskyPorts = scans.filter((s) => getRiskLevel(s.port).level !== "Normal").length;

    const serviceCounts: { [key: string]: number } = {};
    scans.forEach((scan) => {
      const service = getServiceInfo(scan.port).name;
      serviceCounts[service] = (serviceCounts[service] || 0) + 1;
    });
    const mostCommonService = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0] || ["Unknown", 0];

    return {
      totalPorts,
      tlsPorts,
      httpPorts,
      riskyPorts,
      riskPercentage: Math.round((riskyPorts / totalPorts) * 100),
      mostCommonService: {
        name: mostCommonService[0],
        count: mostCommonService[1],
      },
    };
  }, [scans]);

  // Export data function
  const exportData = (format: "csv" | "json") => {
    // ... keep the same export logic
  };

  if (!ip)
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <AlertCircle className="w-10 h-10 text-gray-300 mb-3" />
          <span className="text-gray-500 font-medium">No IP specified</span>
        </div>
      </div>
    );

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-gray-50 m-4 rounded-lg">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-4"></div>
        <span className="text-gray-500 font-medium">Scanning {ip}...</span>
      </div>
    );

  if (error)
    return (
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

  if (scans.length === 0)
    return (
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
      <IPHeader
        ip={ip}
        countryCode={countryCode}
        asnInfo={asnInfo}
        geoInfo={geoInfo}
        onExportJSON={() => exportData("json")}
        onExportCSV={() => exportData("csv")}
      />

      <div className="max-w-[1800px] mx-auto px-4 mt-6">
        <div className="mb-6">
          <StatsGrid stats={stats} lastScanned={lastScanned} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area - 2/3 width */}
          <div className="lg:col-span-2">
            <Card className="min-h-[500px] p-6">
              <PortsTable
                scans={scans}
                filteredScans={filteredScans}
                viewMode={viewMode}
                setViewMode={setViewMode}
                searchPort={searchPort}
                setSearchPort={setSearchPort}
                selectedService={selectedService}
                serviceCategories={serviceCategories}
                setSelectedService={setSelectedService}
                expandedRows={expandedRows}
                toggleRow={toggleRow}
                activeTabMap={activeTabMap}
                setActiveTab={setActiveTab}
                showAllPorts={showAllPorts}
                setShowAllPorts={setShowAllPorts}
              />
            </Card>
          </div>

          {/* Sidebar - 1/3 width */}
          <div className="space-y-6">
            <SidebarContent
              geoInfo={geoInfo}
              asnInfo={asnInfo}
              ip={ip}
              stats={stats}
              timelineData={timelineData}
              topPorts={topPorts}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
