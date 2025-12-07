// src/components/WorldMapWithIPs.tsx
import React, { useMemo, useEffect, useState, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip,
  useMap,
  ZoomControl
} from "react-leaflet";
import L from "leaflet";
import { Link } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import type { Scan } from "../api/scans";

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface WorldMapWithIPsProps {
  scans: Scan[];
  width?: number;
  height?: number;
  realtime?: boolean;
}

// Helper component to auto-fit the map to markers
const FitBoundsToMarkers: React.FC<{
  scans: Scan[];
  key?: string | number;
  animate?: boolean;
}> = ({ scans, key, animate = true }) => {
  const map = useMap();

  useEffect(() => {
    if (scans.length === 0) return;

    const geoScans = scans.filter(
      (s) =>
        s.meta?.geo?.location &&
        typeof s.meta.geo.location.lat === "number" &&
        typeof s.meta.geo.location.lon === "number"
    );

    if (geoScans.length === 0) return;

    // Create bounds from all markers
    const bounds = L.latLngBounds(
      geoScans.map(s => [
        s.meta!.geo!.location!.lat,
        s.meta!.geo!.location!.lon
      ] as [number, number])
    );

    // Only fit bounds if we have valid bounds
    if (bounds.isValid()) {
      if (geoScans.length === 1) {
        // For single marker, center on it with default zoom
        map.setView(
          [geoScans[0].meta!.geo!.location!.lat, geoScans[0].meta!.geo!.location!.lon],
          5,
          { animate }
        );
      } else {
        // For multiple markers, fit to bounds with padding
        map.fitBounds(bounds, {
          padding: [50, 50],
          animate,
          maxZoom: 10 // Prevent zooming in too close
        });
      }
    }
  }, [scans, map, key, animate]);

  return null;
};

// Add this component to handle zoom reset
const ZoomControlCustom = () => {
  const map = useMap();

  const resetZoom = useCallback(() => {
    map.setView([20, 0], 2, { animate: true });
  }, [map]);

  return (
    <div className="leaflet-top leaflet-right">
      <div className="leaflet-control leaflet-bar">
        <button
          onClick={resetZoom}
          title="Reset zoom"
          style={{
            width: "30px",
            height: "30px",
            lineHeight: "30px",
            fontSize: "20px",
            fontWeight: "bold",
            cursor: "pointer",
            textDecoration: "none",
            textAlign: "center",
            backgroundColor: "white",
            border: "2px solid rgba(0,0,0,0.2)",
            borderRadius: "4px",
            display: "block"
          }}
        >
          ↺
        </button>
      </div>
    </div>
  );
};

// Helper function to get unique ports from scans
const getUniquePorts = (scans: Scan[]): number[] => {
  const ports = scans.flatMap(scan => scan.ports || []);
  return [...new Set(ports)].sort((a, b) => a - b);
};

// Helper function to get port summary
const getPortSummary = (ports: number[], maxToShow = 3): string => {
  if (ports.length === 0) return "No ports";
  if (ports.length <= maxToShow) return `Ports: ${ports.join(", ")}`;
  return `Ports: ${ports.slice(0, maxToShow).join(", ")} +${ports.length - maxToShow} more`;
};

const WorldMapWithIPs: React.FC<WorldMapWithIPsProps> = ({
  scans,
  width = 280,
  height = 170,
  realtime = false,
}) => {
  const [mapKey, setMapKey] = useState(0);

  // Filter only scans with valid geo coordinates
  const geoScans = useMemo(() =>
    scans.filter(
      (s) =>
        s.meta?.geo?.location &&
        typeof s.meta.geo.location.lat === "number" &&
        typeof s.meta.geo.location.lon === "number"
    ),
    [scans]
  );

  // Generate unique key for FitBounds component when scans update
  useEffect(() => {
    if (realtime) {
      setMapKey(prev => prev + 1);
    }
  }, [scans, realtime]);

  // Group scans by location to handle duplicates
  const groupedScans = useMemo(() => {
    const groups: {
      [key: string]: {
        location: [number, number],
        ips: string[],
        scans: Scan[],
        count: number,
        portsByIp: Map<string, number[]> // Map of IP to its ports
      }
    } = {};

    geoScans.forEach((s) => {
      const lat = s.meta!.geo!.location!.lat;
      const lon = s.meta!.geo!.location!.lon;
      // Use more precise grouping for better accuracy
      const key = `${lat.toFixed(6)},${lon.toFixed(6)}`;

      if (!groups[key]) {
        groups[key] = {
          location: [lat, lon],
          ips: [],
          scans: [],
          count: 0,
          portsByIp: new Map()
        };
      }

      if (!groups[key].ips.includes(s.ip)) {
        groups[key].ips.push(s.ip);
      }
      groups[key].scans.push(s);
      groups[key].count++;

      // Store ports for this IP
      if (s.ports && s.ports.length > 0) {
        groups[key].portsByIp.set(s.ip, s.ports);
      }
    });

    return Object.values(groups);
  }, [geoScans]);

  // Calculate initial center based on scans
  const initialCenter = useMemo(() => {
    if (geoScans.length === 0) return [20, 0] as [number, number];

    const avgLat = geoScans.reduce((sum, s) => sum + s.meta!.geo!.location!.lat, 0) / geoScans.length;
    const avgLon = geoScans.reduce((sum, s) => sum + s.meta!.geo!.location!.lon, 0) / geoScans.length;

    return [avgLat, avgLon] as [number, number];
  }, [geoScans]);

  // Calculate initial zoom based on number of scans
  const initialZoom = useMemo(() => {
    if (geoScans.length === 0) return 2;
    if (geoScans.length === 1) return 5;
    if (geoScans.length <= 5) return 3;
    return 2;
  }, [geoScans.length]);

  // Function to render IP with clickable link and port info
  const renderIpWithPorts = (ip: string, ports: number[], index: number, totalIps: number) => {
    const isLatest = realtime && index === totalIps - 1;
    const portSummary = ports.length > 0 ? ` (${ports.length} port${ports.length > 1 ? 's' : ''})` : '';

    return (
      <div key={ip} style={{ marginBottom: "6px", paddingBottom: "6px", borderBottom: index < totalIps - 1 ? "1px solid #f0f0f0" : "none" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "4px" }}>
          <div style={{ minWidth: "20px" }}>
            {isLatest ? "🔵" : "•"}
          </div>
          <div style={{ flex: 1 }}>
            <Link
              to={`/ip/${ip}`}
              style={{
                fontSize: "10px",
                fontFamily: "monospace",
                color: "#1890ff",
                textDecoration: "none",
                fontWeight: "bold"
              }}
              onClick={(e) => e.stopPropagation()}
              title={`View details for ${ip}`}
            >
              {ip}
              {portSummary && <span style={{ color: "#52c41a", marginLeft: "4px" }}>{portSummary}</span>}
            </Link>

            {/* Show port details if available */}
            {ports.length > 0 && (
              <div style={{
                marginTop: "2px",
                paddingLeft: "4px",
                fontSize: "9px",
                color: "#666",
                display: "flex",
                flexWrap: "wrap",
                gap: "4px"
              }}>
                {ports.slice(0, 5).map(port => (
                  <span
                    key={port}
                    style={{
                      padding: "1px 4px",
                      backgroundColor: "#f0f0f0",
                      borderRadius: "3px",
                      fontFamily: "monospace"
                    }}
                    title={`Port ${port}`}
                  >
                    {port}
                  </span>
                ))}
                {ports.length > 5 && (
                  <span style={{ color: "#999", fontStyle: "italic" }}>
                    +{ports.length - 5} more
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        width,
        height,
        borderRadius: 8,
        overflow: "hidden",
        minHeight: 130,
        position: "relative",
        border: "1px solid #e8e8e8"
      }}
    >
      <MapContainer
        key={`map-${mapKey}`}
        center={initialCenter}
        zoom={initialZoom}
        style={{ width: "100%", height: "100%" }}
        scrollWheelZoom={true}
        zoomControl={false} // We'll use custom controls
        minZoom={1}
        maxZoom={15}
        bounceAtZoomLimits={true}
        worldCopyJump={true}
        attributionControl={false}
      >
        {/* Using CartoDB Voyager tiles - much cleaner and modern */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>'
          maxZoom={20}
          noWrap={true}
        />

        <FitBoundsToMarkers
          scans={geoScans}
          key={realtime ? mapKey : 'static'}
          animate={realtime}
        />

        {/* Custom zoom controls */}
        <ZoomControl position="bottomright" />
        <ZoomControlCustom />

        {/* Pulse animation for realtime updates */}
        {realtime && geoScans.length > 0 && (
          <style>{`
            @keyframes pulse {
              0% { r: 4; opacity: 0.8; }
              50% { r: 8; opacity: 0.4; }
              100% { r: 4; opacity: 0.8; }
            }
            .realtime-marker {
              animation: pulse 2s infinite;
            }
            
            /* Custom scrollbar for tooltip */
            .leaflet-tooltip-content::-webkit-scrollbar {
              width: 4px;
            }
            .leaflet-tooltip-content::-webkit-scrollbar-thumb {
              background: #ccc;
              border-radius: 2px;
            }
          `}</style>
        )}

        {/* Render grouped markers */}
        {groupedScans.map((group, idx) => {
          const radius = Math.min(5 + Math.log2(group.count + 1) * 1.5, 12);
          const opacity = Math.min(0.6 + (group.count / 20), 0.9);

          // Get all unique ports from this location
          const allPorts = getUniquePorts(group.scans);
          const portSummary = getPortSummary(allPorts);

          return (
            <React.Fragment key={idx}>
              <CircleMarker
                center={group.location}
                radius={radius}
                pathOptions={{
                  color: group.count > 1 ? "#ff4d4f" : "#1890ff",
                  fillColor: group.count > 1 ? "#ff7875" : "#1890ff",
                  fillOpacity: opacity,
                  weight: 1.5
                }}
                className={realtime ? "realtime-marker" : ""}
              >
                <Tooltip
                  direction="top"
                  offset={[0, -radius * 2]}
                  permanent={groupedScans.length <= 3}
                  opacity={0.95}
                  className="custom-tooltip"
                >
                  <div style={{
                    minWidth: "200px",
                    maxWidth: "300px",
                    maxHeight: "300px",
                    overflowY: "auto",
                    paddingRight: "4px"
                  }}>
                    {/* Header */}
                    <div style={{
                      fontSize: "11px",
                      fontWeight: "bold",
                      marginBottom: "8px",
                      color: "#1890ff",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}>
                      <span>📍</span>
                      <span>Location Details</span>
                    </div>

                    {/* Location coordinates */}
                    <div style={{
                      fontSize: "10px",
                      marginBottom: "8px",
                      padding: "4px 6px",
                      backgroundColor: "#f6ffed",
                      borderRadius: "4px",
                      border: "1px solid #b7eb8f"
                    }}>
                      <div style={{ fontWeight: "bold", marginBottom: "2px" }}>Coordinates:</div>
                      <div style={{ fontFamily: "monospace" }}>
                        {group.location[0].toFixed(4)}, {group.location[1].toFixed(4)}
                      </div>
                    </div>

                    {/* Stats */}
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "10px",
                      fontSize: "10px"
                    }}>
                      <div>
                        <div style={{ fontWeight: "bold", color: "#1890ff" }}>
                          {group.count}
                        </div>
                        <div style={{ color: "#666" }}>scans</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: "bold", color: "#52c41a" }}>
                          {group.ips.length}
                        </div>
                        <div style={{ color: "#666" }}>IPs</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: "bold", color: "#fa8c16" }}>
                          {allPorts.length}
                        </div>
                        <div style={{ color: "#666" }}>ports</div>
                      </div>
                    </div>

                    {/* Ports summary */}
                    {allPorts.length > 0 && (
                      <div style={{
                        marginBottom: "10px",
                        fontSize: "10px"
                      }}>
                        <div style={{ fontWeight: "bold", marginBottom: "4px", color: "#fa8c16" }}>
                          📍 Ports found:
                        </div>
                        <div style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "4px",
                          maxHeight: "60px",
                          overflowY: "auto",
                          padding: "4px"
                        }}>
                          {allPorts.slice(0, 10).map(port => (
                            <span
                              key={port}
                              style={{
                                padding: "2px 6px",
                                backgroundColor: "#fff7e6",
                                border: "1px solid #ffd591",
                                borderRadius: "3px",
                                fontFamily: "monospace",
                                fontSize: "9px"
                              }}
                            >
                              {port}
                            </span>
                          ))}
                          {allPorts.length > 10 && (
                            <span style={{
                              color: "#999",
                              fontStyle: "italic",
                              alignSelf: "center"
                            }}>
                              +{allPorts.length - 10} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* IP List */}
                    <div style={{
                      marginTop: "12px",
                      borderTop: "1px solid #f0f0f0",
                      paddingTop: "8px"
                    }}>
                      <div style={{
                        fontSize: "10px",
                        fontWeight: "bold",
                        marginBottom: "6px",
                        color: "#1890ff"
                      }}>
                        🔗 IP Addresses:
                      </div>
                      <div style={{ maxHeight: "150px", overflowY: "auto" }}>
                        {group.ips.map((ip, index) => {
                          const ports = group.portsByIp.get(ip) || [];
                          return renderIpWithPorts(ip, ports, index, group.ips.length);
                        })}
                      </div>
                    </div>

                    {/* View all link if many IPs */}
                    {group.ips.length > 5 && (
                      <div style={{
                        marginTop: "8px",
                        textAlign: "center",
                        paddingTop: "8px",
                        borderTop: "1px solid #f0f0f0"
                      }}>
                        <Link
                          to={`/location/${group.location[0].toFixed(4)},${group.location[1].toFixed(4)}`}
                          style={{
                            fontSize: "10px",
                            color: "#666",
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span>View all {group.ips.length} IPs</span>
                          <span>→</span>
                        </Link>
                      </div>
                    )}
                  </div>
                </Tooltip>
              </CircleMarker>

              {/* Optional: Add a subtle pulse effect for latest scan in realtime mode */}
              {realtime && group.scans[group.scans.length - 1] && (
                <CircleMarker
                  center={group.location}
                  radius={radius * 1.5}
                  pathOptions={{
                    color: group.count > 1 ? "#ff4d4f" : "#1890ff",
                    fillColor: "transparent",
                    weight: 1,
                    dashArray: "5, 5",
                    opacity: 0.6
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </MapContainer>

      {/* Stats overlay */}
      <div style={{
        position: "absolute",
        top: 8,
        right: 8,
        background: "rgba(255, 255, 255, 0.95)",
        padding: "6px 10px",
        borderRadius: 6,
        fontSize: "10px",
        zIndex: 1000,
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        display: "flex",
        gap: "12px",
        alignItems: "center"
      }}>
        <div>
          <div style={{ fontWeight: "bold", color: "#1890ff" }}>
            {geoScans.length}
          </div>
          <div style={{ color: "#666", fontSize: "9px" }}>
            Scans
          </div>
        </div>
        <div>
          <div style={{ fontWeight: "bold", color: "#52c41a" }}>
            {groupedScans.length}
          </div>
          <div style={{ color: "#666", fontSize: "9px" }}>
            Locations
          </div>
        </div>
        <div>
          <div style={{ fontWeight: "bold", color: "#fa8c16" }}>
            {new Set(geoScans.flatMap(s => s.ports || [])).size}
          </div>
          <div style={{ color: "#666", fontSize: "9px" }}>
            Ports
          </div>
        </div>
        {realtime && (
          <div style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: "#ff4d4f",
            animation: "pulse 1.5s infinite"
          }} title="Live mode active" />
        )}
      </div>

      {/* Legend - only show if we have data */}
      {geoScans.length > 0 && (
        <div style={{
          position: "absolute",
          bottom: 8,
          left: 8,
          background: "rgba(255, 255, 255, 0.95)",
          padding: "6px 10px",
          borderRadius: 6,
          fontSize: "10px",
          zIndex: 1000,
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <div style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#1890ff",
              }} />
              <span>Single IP</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <div style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                backgroundColor: "#ff7875",
              }} />
              <span>Multiple IPs</span>
            </div>
            {realtime && (
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <div style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: "#ff4d4f",
                  animation: "pulse 1.5s infinite"
                }} />
                <span>Live</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading/empty state */}
      {geoScans.length === 0 && (
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center",
          color: "#999",
          fontSize: "12px",
          zIndex: 1000
        }}>
          <div>🌎</div>
          <div>No location data available</div>
        </div>
      )}
    </div>
  );
};

export default WorldMapWithIPs;
