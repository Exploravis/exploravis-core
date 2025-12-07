import { Card, Divider, Typography } from "antd";
import WorldMapWithIPs from "../SideBarMap";

const { Text } = Typography;

export default function ScanSidebar({ scans, aggs, total, screens }) {
  return (
    <Card
      size="small"
      style={{
        position: screens.md ? "sticky" : "static",
        top: 16,
        padding: 16,
      }}
      bodyStyle={{ padding: 0 }}
    >
      {/* ---- METRICS ---- */}
      <div className="space-y-3 mb-4">
        {[
          { label: "Total Results", value: total.toLocaleString() },
          { label: "Active Scans", value: scans.filter((s) => s.meta?.alive).length },
          {/* { label: "Unique IPs", value: new Set(scans.map((s) => s.ip)).size }, */ }
        ].map((m) => (
          <div key={m.label} className="flex justify-between">
            <Text type="secondary">{m.label}</Text>
            <Text strong>{m.value}</Text>
          </div>
        ))}
      </div>

      <Divider />

      {/* ---- WORLD MAP ---- */}
      <WorldMapWithIPs scans={scans} width={400} height={300} />

      <Divider />

      {/* ---- AGGREGATIONS ---- */}
      {aggs && (
        <div className="space-y-3">
          {[
            { title: "Top Countries", buckets: aggs.by_country?.buckets },
            { title: "Top Ports", buckets: aggs.top_ports?.buckets },
            { title: "Top Organizations", buckets: aggs.top_orgs?.buckets },
            { title: "Top Products", buckets: aggs.top_products?.buckets },
            { title: "Top OS", buckets: aggs.top_os?.buckets },
          ].map(
            ({ title, buckets }) =>
              buckets?.length > 0 && (
                <div key={title}>
                  <Text strong style={{ display: "block", marginBottom: 4 }}>
                    {title}
                  </Text>

                  {buckets.slice(0, 5).map((b: any) => {
                    const widthPercent = Math.min(
                      100,
                      (b.doc_count / buckets[0].doc_count) * 100
                    );

                    return (
                      <div key={b.key} style={{ marginBottom: 4 }}>
                        <div className="flex justify-between text-gray-800">
                          <Text>{b.key}</Text>
                          <Text>{b.doc_count.toLocaleString()}</Text>
                        </div>
                        <div className="h-1 bg-gray-200 rounded mt-1">
                          <div
                            className="h-1 bg-blue-500 rounded"
                            style={{ width: `${widthPercent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}

                  {buckets.length > 5 && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      More...
                    </Text>
                  )}
                </div>
              )
          )}
        </div>
      )}
    </Card>
  );
}
