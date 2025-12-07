// src/pages/ScanIdSearch.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Row, Col, Grid } from "antd";
import debounce from "just-debounce-it";

import ScanSearchHeader from "../components/scan/ScanSearchHeader";
import ScanFilters from "../components/scan/ScanFilters";
import ScanSidebar from "../components/scan/ScanSidebar";
import ScanResults from "../components/scan/ScanResults";

import { fetchScanResults } from "../api/scans";

const PAGE_SIZE = 24;
const { useBreakpoint } = Grid;

export default function ScanIdSearch() {
  const { scan_id } = useParams();

  const [scans, setScans] = useState([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [aggs, setAggs] = useState(null);
  const [loading, setLoading] = useState(false);

  const [protocolFilter, setProtocolFilter] = useState();
  const [portFilter, setPortFilter] = useState();
  const [sortBy, setSortBy] = useState("-timestamp");
  const [showFilters, setShowFilters] = useState(false);

  const [advancedFilters, setAdvancedFilters] = useState({
    hasTls: null,
    hasHttp: null,
  });

  const screens = useBreakpoint();

  const doFetch = useMemo(
    () =>
      debounce(
        async (
          scanId: string,
          q: string | undefined,
          p: number | undefined,
          proto: string | undefined,
          port: number | undefined,
          sort: any,
          advanced: any
        ) => {
          if (!scanId) return;
          setLoading(true);

          try {
            const res = await fetchScanResults(
              scanId,
              q,
              p,
              PAGE_SIZE,
              proto,
              port,
              sort,
              advanced
            );

            setScans(res.results ?? []);
            setAggs(res.aggs ?? null);
            setTotal(res.total ?? 0);
          } finally {
            setLoading(false);
          }
        },
        350
      ),
    []
  );

  useEffect(() => setPage(1), [scan_id]);

  useEffect(() => {
    if (!scan_id) return;

    doFetch(
      scan_id,
      query,
      page,
      protocolFilter,
      portFilter,
      sortBy,
      advancedFilters
    );
  }, [
    scan_id,
    query,
    page,
    protocolFilter,
    portFilter,
    sortBy,
    advancedFilters,
    doFetch,
  ]);

  const clearAllFilters = () => {
    setQuery("");
    setPage(1);
    setProtocolFilter(undefined);
    setPortFilter(undefined);
    setSortBy("-timestamp");
    setAdvancedFilters({ hasTls: null, hasHttp: null });
  };

  return (
    <div style={{ padding: 16 }}>
      <Row gutter={16}>
        {/* SIDEBAR */}
        <Col xs={24} md={6}>
          <ScanSidebar scans={scans} aggs={aggs} total={total} screens={screens} />
        </Col>

        {/* MAIN */}
        <Col xs={24} md={18}>
          <ScanSearchHeader title={`Scan ${scan_id}`} />

          <ScanFilters
            query={query}
            onQueryChange={setQuery}
            appliedFilters={[
              protocolFilter && `proto:${protocolFilter}`,
              portFilter && `port:${portFilter}`,
              sortBy && `sort:${sortBy}`,
            ].filter(Boolean)}
            showFilters={showFilters}
            setShowFilters={setShowFilters}
            protocolFilter={protocolFilter}
            setProtocolFilter={setProtocolFilter}
            portFilter={portFilter}
            setPortFilter={setPortFilter}
            sortBy={sortBy}
            setSortBy={setSortBy}
            advancedFilters={advancedFilters}
            setAdvancedFilters={setAdvancedFilters}
          />

          <ScanResults
            scans={scans}
            loading={loading}
            total={total}
            PAGE_SIZE={PAGE_SIZE}
            page={page}
            setPage={setPage}
            screens={screens}
            clearAllFilters={clearAllFilters}
            renderSkeletons={() => <div>Loading…</div>}
            query={query}
            viewMode="grid"
            scanId={scan_id}
          />
        </Col>
      </Row>
    </div>
  );
}
