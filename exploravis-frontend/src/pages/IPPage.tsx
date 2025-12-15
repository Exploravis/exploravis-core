// src/pages/IPPage.tsx
import React, { useEffect, useState, useMemo, type JSX } from "react";
import { useParams } from "react-router-dom";
import { fetchScansByIP, type IPScansResponse, type Scan } from "../api/scans";
import { getServiceInfo } from "../components/IPPage.helper";
import { IPHeader } from "../components/IPHeader";
import { StatsGrid } from "../components/StatsGrid";
import { PortsTable } from "../components/PortsTable";
import { SidebarContent } from "../components/SidebarContent";
import { Card } from "../components/IPPage.helper";
import { getRiskLevel } from "../components/ScanCard.helpers";
import ScanGraph, { type ScanRun } from "../components/ScanGraph";

export default function IPPage(): JSX.Element {
  const { ip } = useParams<{ ip?: string }>();
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<number | undefined>(undefined);
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);
  const [activeTabMap, setActiveTabMap] = useState<Record<string, "http" | "tls" | "banner">>({});

  const handleSetActiveTab = (scanId: string, tab: "http" | "tls" | "banner") => {
    setActiveTabMap((prev) => ({ ...prev, [scanId]: tab }));
  };
  // fetch scans
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

  // group runs in order
  const scanRuns = useMemo<ScanRun[]>(() => {
    const map = new Map<string, ScanRun>();
    for (const s of scans) {
      const id = s.scan_id ?? `scan-${s.timestamp}`;
      const ts = Number(s.timestamp ?? 0);
      if (!map.has(id)) map.set(id, { scanId: id, timestamp: ts, scans: [] });
      map.get(id)!.scans.push(s);
    }
    return Array.from(map.values()); // preserve insertion order
  }, [scans]);

  const latestRun = useMemo(() => scanRuns[scanRuns.length - 1], [scanRuns]);
  const displayedRun = useMemo(() => {
    if (!scanRuns.length) return undefined;
    if (!selectedScanId) return latestRun;
    return scanRuns.find((r) => r.scanId === selectedScanId) ?? latestRun;
  }, [scanRuns, selectedScanId, latestRun]);

  const displayedPorts = useMemo(() => {
    if (!displayedRun) return [];
    const byPort = new Map<number, Scan>();
    displayedRun.scans.forEach((s) => byPort.set(Number(s.port), s));
    return Array.from(byPort.values()).sort((a, b) => Number(a.port) - Number(b.port));
  }, [displayedRun]);

  const filteredDisplayedScans = useMemo(() => displayedPorts, [displayedPorts]);

  const stats = useMemo(() => {
    const totalPorts = displayedPorts.length;
    const tlsPorts = displayedPorts.filter((s) => s.tls).length;
    const httpPorts = displayedPorts.filter((s) => s.http).length;
    const riskyPorts = displayedPorts.filter((s) => getRiskLevel(s.port).level !== "Normal").length;
    const serviceCounts: Record<string, number> = {};
    displayedPorts.forEach((scan) => {
      const name = getServiceInfo(scan.port).name;
      serviceCounts[name] = (serviceCounts[name] || 0) + 1;
    });
    const mostCommonService = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0] ?? ["Unknown", 0];
    return {
      totalPorts,
      tlsPorts,
      httpPorts,
      riskyPorts,
      riskPercentage: totalPorts ? Math.round((riskyPorts / totalPorts) * 100) : 0,
      mostCommonService: { name: mostCommonService[0], count: mostCommonService[1] },
    };
  }, [displayedPorts]);


  const [expandedRows, setExpandedRows] = useState<string[]>([]);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    );
  };

  if (!ip) return <div className="p-8 text-center">No IP specified</div>;
  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!scans.length)
    return (
      <div className="p-8 text-center">
        No scans found for <code>{ip}</code>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#f8f9fa] font-sans pb-12">
      <IPHeader
        ip={ip}
        countryCode={scans[0]?.meta?.geo?.country}
        asnInfo={scans[0]?.meta?.asn}
        geoInfo={scans[0]?.meta?.geo}
        onExportJSON={() => { }}
        onExportCSV={() => { }}
      />

      <div className="max-w-[1800px] mx-auto px-4 mt-6">
        <div className="mb-6">
          <StatsGrid stats={stats} lastScanned={lastScanned ?? latestRun?.timestamp} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {scanRuns.length > 2 && (
              <ScanGraph
                runs={scanRuns}
                selectedScanId={selectedScanId}
                onSelectScan={setSelectedScanId}
                height={180}
              />
            )}


            <Card className="min-h-[300px] p-6">
              <PortsTable
                scans={displayedPorts}
                filteredScans={filteredDisplayedScans}
                expandedRows={expandedRows}
                toggleRow={toggleRow}
                viewMode="table"
                setViewMode={() => { }}
                searchPort=""
                setSearchPort={() => { }}
                selectedService={null}
                serviceCategories={[]}
                setSelectedService={() => { }}
                activeTabMap={activeTabMap}          // <-- pass state
                setActiveTab={handleSetActiveTab}
                showAllPorts={false}
                setShowAllPorts={() => { }}
              />
            </Card>
          </div>

          <div className="space-y-6">
            <SidebarContent
              geoInfo={scans[0]?.meta?.geo}
              asnInfo={scans[0]?.meta?.asn}
              ip={ip}
              stats={stats}
              timelineData={[]}
              topPorts={[]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
