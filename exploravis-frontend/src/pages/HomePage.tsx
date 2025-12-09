import { useQuery } from "@tanstack/react-query";
import { fetchScans } from "../api/scans";
import { useState } from "react";
import { BarChart2 } from "lucide-react";

function HomePage() {
  const [count, setCount] = useState(0);

  const { data, isLoading, error } = useQuery({
    queryKey: ["homeStats"],
    queryFn: () => fetchScans("", 1, 1000), // fetch enough for stats
  });

  if (isLoading) return <div>Loading stats...</div>;
  if (error) return <div>Error loading stats</div>;

  const scans = data?.results ?? [];
  const aggs = data?.aggs ?? {};

  const topN = (buckets: any[], n = 5) =>
    buckets?.slice(0, n).map((b) => ({ key: b.key, count: b.doc_count })) ?? [];

  const totalScans = data?.total ?? 0;
  const uniqueIPs = new Set(scans.map((s) => s.ip)).size;
  const protocols = Array.from(new Set(scans.map((s) => s.protocol)));

  const topOrgs = topN(aggs.top_orgs?.buckets);
  const topPorts = topN(aggs.top_ports?.buckets);
  const topCountries = topN(aggs.by_country?.buckets);

  const cardClass =
    "bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md hover:shadow-xl transition-transform transform hover:-translate-y-1";

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 text-gray-900 dark:text-white">
      {/* Hero */}
      <section className="text-center mb-16">
        <h1 className="text-5xl font-bold mb-4">
          Explore Your{" "}
          <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
            Security Data
          </span>
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Powerful visualization of security scans, IP analysis, and network intelligence.
        </p>
      </section>

      {/* Key Metrics */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <div className={cardClass}>
          <div className="text-3xl font-bold text-blue-500">{totalScans}</div>
          <div className="mt-2 text-gray-600 dark:text-gray-300">Total Scans</div>
        </div>
        <div className={cardClass}>
          <div className="text-3xl font-bold text-green-500">{uniqueIPs}</div>
          <div className="mt-2 text-gray-600 dark:text-gray-300">Unique IPs</div>
        </div>
        <div className={cardClass}>
          <div className="text-3xl font-bold text-purple-500">{protocols.join(", ")}</div>
          <div className="mt-2 text-gray-600 dark:text-gray-300">Protocols</div>
        </div>
      </section>

      {/* Top Aggregations */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        {/* Top Organizations */}
        <div className={cardClass}>
          <div className="flex items-center mb-4">
            <BarChart2 className="mr-2 text-blue-500" />
            <h3 className="font-semibold text-lg">Top Organizations</h3>
          </div>
          {topOrgs.map((o, i) => (
            <div key={i} className="mb-2">
              <div className="flex justify-between mb-1">
                <span>{o.key}</span>
                <span>{o.count}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${(o.count / totalScans) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>

        {/* Top Ports */}
        <div className={cardClass}>
          <div className="flex items-center mb-4">
            <BarChart2 className="mr-2 text-green-500" />
            <h3 className="font-semibold text-lg">Top Ports</h3>
          </div>
          {topPorts.map((p, i) => (
            <div key={i} className="mb-2">
              <div className="flex justify-between mb-1">
                <span>{p.key}</span>
                <span>{p.count}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${(p.count / totalScans) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>

        {/* Top Countries */}
        <div className={cardClass}>
          <div className="flex items-center mb-4">
            <BarChart2 className="mr-2 text-purple-500" />
            <h3 className="font-semibold text-lg">Top Countries</h3>
          </div>
          {topCountries.map((c, i) => (
            <div key={i} className="mb-2">
              <div className="flex justify-between mb-1">
                <span>{c.key}</span>
                <span>{c.count}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full">
                <div
                  className="bg-purple-500 h-2 rounded-full"
                  style={{ width: `${(c.count / totalScans) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Development Demo */}
      <section className={cardClass}>
        <h3 className="text-2xl font-bold mb-4">Development Demo</h3>
        <div className="flex flex-col md:flex-row gap-6 items-center">
          <div>
            <h4 className="font-semibold mb-2">Interactive Counter</h4>
            <p className="text-gray-600 dark:text-gray-300 mb-2">
              This demo shows React's state management in action.
            </p>
            <button
              onClick={() => setCount((c) => c + 1)}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-600 transition-all"
            >
              Count is: {count}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
