import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { submitScan } from "../api/scans";

// Nmap-style top 20 common ports
const TOP_20_PORTS =
  "21,22,23,25,53,80,110,111,135,139,143,443,445,993,995,1723,3306,3389,5900,8080";

// IPv4 or IPv4/CIDR validation
const cidrRegex =
  /^(?:(?:25[0-5]|2[0-4]\d|1?\d{1,2})(?:\.(?!$)|$)){4}(?:\/([0-9]|[1-2][0-9]|3[0-2]))?$/;

export default function DispatchPage() {
  const navigate = useNavigate();

  const [ipRange, setIpRange] = useState("");
  const [ports, setPorts] = useState("");
  const [note, setNote] = useState("");
  const [cidrValid, setCidrValid] = useState(true);

  const mutation = useMutation({
    mutationFn: ({ ip_range, ports, note }: { ip_range: string; ports: string; note?: string }) =>
      submitScan({ ip_range, ports, note }),
    onSuccess: (data) => navigate(`/scans/${encodeURIComponent(data.scan_id)}`),
  });

  const handleCIDRChange = (v: string) => {
    setIpRange(v);
    setCidrValid(cidrRegex.test(v.trim()));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cidrValid) return;
    mutation.mutate({ ip_range: ipRange, ports, note });
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dispatch a Scan</h1>
        <p className="text-sm text-gray-600 mt-1">
          Submit a scan job to the orchestrator.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* IP / CIDR */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">IP or CIDR</label>
          <input
            value={ipRange}
            onChange={(e) => handleCIDRChange(e.target.value)}
            placeholder="85.190.254.203/22 or 10.0.0.1"
            className={`w-full border rounded-md px-3 py-2 focus:ring-2 ${cidrValid ? "focus:ring-blue-500" : "border-red-500 focus:ring-red-500"
              }`}
            required
          />
          {!cidrValid && (
            <p className="text-xs text-red-600 mt-1">Invalid IPv4 or CIDR notation.</p>
          )}
        </div>

        {/* Ports */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            Ports
          </label>

          <div className="flex gap-3 mb-2">
            <button
              type="button"
              className="px-3 py-1 text-sm rounded-md bg-gray-200 hover:bg-gray-300"
              onClick={() => setPorts(TOP_20_PORTS)}
            >
              Use Top 20 Ports
            </button>
          </div>

          <input
            value={ports}
            onChange={(e) => setPorts(e.target.value)}
            placeholder="80,443,22 or 1-65535"
            className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
          />

          <p className="text-xs text-gray-500 mt-1">Comma-separated or ranges. Empty = default.</p>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">Scan description</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="scan name/desc"
            className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={mutation.status === "pending" || !cidrValid}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-white ${mutation.status === "pending" || !cidrValid
                ? "bg-blue-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
              }`}
          >
            {mutation.status === "pending" ? "Queueing..." : "Queue Scan"}
            <ArrowRight size={16} />
          </button>

          <Link to="/scans" className="text-sm underline text-gray-900">
            View scans
          </Link>
        </div>

        {/* Error */}
        {mutation.status === "error" && (
          <div className="text-sm text-red-600">
            Error: {(mutation.error as Error)?.message ?? "unknown"}
          </div>
        )}
      </form>
    </div>
  );
}
