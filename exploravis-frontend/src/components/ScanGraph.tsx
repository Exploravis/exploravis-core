// src/components/ScanGraph.tsx
import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import { Card } from "antd";

export type ScanRun = {
  scanId: string;
  timestamp: number; // in seconds
  scans: any[];
};

type GraphNode = {
  id: string;
  type: "scan" | "port";
  scanId?: string;
  port?: number;
  r: number;
  x?: number;
  y?: number;
};

type GraphLink = {
  source: string;
  target: string;
  type?: "timeline" | "port";
};

interface Props {
  runs: ScanRun[];
  selectedScanId: string | null;
  onSelectScan: (scanId: string | null) => void;
  width?: number;
  height?: number;
}

// helper: relative time
function formatRelativeTime(tsSeconds: number) {
  const diff = Date.now() / 1000 - tsSeconds;
  if (diff < 60) return `${Math.round(diff)} seconds`;
  if (diff < 3600) return `${Math.round(diff / 60)} minutes`;
  if (diff < 86400) return `${Math.round(diff / 3600)} hours`;
  if (diff < 2592000) return `${Math.round(diff / 86400)} days`;
  if (diff < 31536000) return `${Math.round(diff / 2592000)} months`;
  return `${Math.round(diff / 31536000)} years`;
}

export const ScanGraph: React.FC<Props> = ({ runs, selectedScanId, onSelectScan, width, height = 280 }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const simRef = useRef<d3.Simulation<any, undefined> | null>(null);

  useEffect(() => {
    if (!wrapperRef.current || !svgRef.current || runs.length === 0) return;

    const containerRect = wrapperRef.current.getBoundingClientRect();
    const w = width ?? Math.max(800, containerRect.width || 900);
    const h = height;
    const centerY = h / 2;
    const margin = 60;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${w} ${h}`).style("width", "100%").style("height", `${h}px`);

    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];

    const spacing = (w - 2 * margin) / Math.max(runs.length - 1, 1);
    const orderedRuns = [...runs].reverse();

    orderedRuns.forEach((run, i) => {
      const scanNodeId = `scan-${run.scanId}`;
      const x = margin + i * spacing;

      nodes.push({ id: scanNodeId, type: "scan", scanId: run.scanId, r: 18, x, y: centerY });

      const uniquePorts = Array.from(new Map(run.scans.map((s) => [String(s.port), s])).values());
      uniquePorts.forEach((p) => {
        const portNodeId = `${scanNodeId}-port-${p.port}`;
        nodes.push({ id: portNodeId, type: "port", scanId: run.scanId, port: Number(p.port), r: 7 });
        links.push({ source: scanNodeId, target: portNodeId, type: "port" });
      });

      if (i > 0) {
        const prevId = `scan-${orderedRuns[i - 1].scanId}`;
        links.push({ source: prevId, target: scanNodeId, type: "timeline" });
      }
    });

    const gZoom = svg.append("g").attr("class", "zoom-layer");
    const linkG = gZoom.append("g").attr("class", "links");
    const nodeG = gZoom.append("g").attr("class", "nodes");

    const simNodes = nodes.map((d) => ({ ...d }));
    const simLinks = links.map((d) => ({ ...d }));

    // draw links
    linkG
      .selectAll("line")
      .data(simLinks, (d: any) => `${d.source}-${d.target}`)
      .enter()
      .append("line")
      .attr("stroke", (d: any) => (d.type === "timeline" ? "#0f172a" : "#94a3b8"))
      .attr("stroke-width", (d: any) => (d.type === "timeline" ? 2 : 1))
      .attr("opacity", 0.9);

    // nodes
    const nodeSel = nodeG
      .selectAll("g.node")
      .data(simNodes, (d: any) => d.id)
      .enter()
      .append("g")
      .attr("class", "node")
      .call(
        d3
          .drag<SVGGElement, any>()
          .on("start", (event: any, d: any) => {
            if (!event.active) simRef.current?.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event: any, d: any) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event: any, d: any) => {
            if (!event.active) simRef.current?.alphaTarget(0);
            if (d.type === "scan") {
              d.fx = d.x;
              d.fy = centerY;
            } else {
              d.fx = null;
              d.fy = null;
            }
          })
      );

    // circles
    nodeSel
      .append("circle")
      .attr("r", (d: any) => d.r)
      .attr("fill", (d: any) => (d.type === "scan" ? "#2563EB" : "#10B981"))
      .attr("stroke", "#fff")
      .attr("stroke-width", (d: any) => (d.type === "scan" && d.scanId === selectedScanId ? 3 : 1.5))
      .on("click", (_, d: any) => {
        if (d.type === "scan") onSelectScan(d.scanId ?? null);
      })
      .append("title")
      .text((d: any) => {
        if (d.type === "scan") {
          const run = runs.find((r) => r.scanId === d.scanId);
          return run ? `${formatRelativeTime(run.timestamp)} ago` : d.id;
        } else {
          return `Port ${d.port}`;
        }
      });


    // scan labels (human-readable time)
    nodeSel
      .filter((d: any) => d.type === "scan")
      .append("text")
      .attr("dy", d => d.r + 10)
      .attr("text-anchor", "middle")
      .style("font-size", 12)
      .style("font-weight", "bold")
      .style("fill", "red")
      .text((d: any) => {
        const run = runs.find((r) => r.scanId === d.scanId);
        return run ? `${formatRelativeTime(run.timestamp)} ago` : "";
      });

    // port labels
    nodeSel
      .filter((d: any) => d.type === "port")
      .append("text")
      .attr("dx", 10)
      .attr("dy", 4)
      .style("font-size", 9)
      .style("fill", "#475569")
      .text((d: any) => d.port);

    // simulation
    const simulation = d3
      .forceSimulation(simNodes)
      .force(
        "link",
        d3
          .forceLink(simLinks)
          .id((d: any) => d.id)
          .distance((d: any) => (d.type === "timeline" ? 80 : 30))
      )
      .force("charge", d3.forceManyBody().strength(-30))
      .force(
        "x",
        d3.forceX((d: any) => (d.type === "scan" ? d.x : simNodes.find((n) => n.id === `scan-${d.scanId}`)?.x)).strength(0.12)
      )
      .force("y", d3.forceY(centerY))
      .force("collide", d3.forceCollide((d: any) => d.r + 4))
      .alphaDecay(0.02)
      .on("tick", () => {
        nodeG.selectAll("g.node").attr("transform", (d: any) => `translate(${d.x},${d.y})`);
        linkG
          .selectAll("line")
          .attr("x1", (d: any) => d.source.x)
          .attr("y1", (d: any) => d.source.y)
          .attr("x2", (d: any) => d.target.x)
          .attr("y2", (d: any) => d.target.y);
      });

    simRef.current = simulation;

    const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.5, 3]).on("zoom", (event) => gZoom.attr("transform", event.transform));
    svg.call(zoom as any);

    return () => {
      simulation.stop();
      simRef.current = null;
      svg.selectAll("*").remove();
    };
  }, [runs, selectedScanId, onSelectScan, width, height]);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const nodeG = svg.select<SVGGElement>("g.nodes");

    if (!nodeG.empty()) {
      nodeG.selectAll<SVGCircleElement, any>("circle").attr("stroke-width", (d: any) =>
        d.type === "scan" && d.scanId === selectedScanId ? 5 : 1.5
      ).attr("stroke", (d: any) =>
        d.type === "scan" && d.scanId === selectedScanId ? "orange" : "#fff"
      );
    }
  }, [selectedScanId]);

  return (
    <Card className="p-4">
      <div ref={wrapperRef} style={{ width: "100%", overflow: "hidden" }}>
        <svg ref={svgRef} />
      </div>
    </Card>
  );
};

export default ScanGraph;
