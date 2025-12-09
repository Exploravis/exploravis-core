import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { submitScan } from "../api/scans"; // your existing scans.tsx function

export default function DispatchPage() {
  const [ipRange, setIpRange] = useState("");
  const [ports, setPorts] = useState("");
  const [note, setNote] = useState("");
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: ({ ip_range, ports, note }: { ip_range: string; ports: string; note?: string }) =>
      submitScan({ ip_range, ports, note }),
    onSuccess: (data) => {
      // redirect to scan page after queuing
      navigate(`/scans/${encodeURIComponent(data.scan_id)}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ ip_range: ipRange, ports, note });
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dispatch a Scan</h1>
        <p className="text-sm text-gray-600 mt-1">
          Submit a scan job to the orchestrator. After queuing you'll be redirected to the scan page.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">IP or CIDR</label>
          <input
            value={ipRange}
            onChange={(e) => setIpRange(e.target.value)}
            placeholder="e.g. 85.190.254.203/22 or 10.0.0.1"
            className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">Ports (comma separated)</label>
          <input
            value={ports}
            onChange={(e) => setPorts(e.target.value)}
            placeholder="e.g. 80,443,22 or 1-65535"
            className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <p className="text-xs text-gray-500 mt-1">
            You can supply commas or ranges. Leave empty to use default scan behavior.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">Scan description</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="scan name/desc"
            className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3">

          <button
            type="submi"
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-black ${mutation.status === "pending"
              ? "bg-blue-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
              } transition-all`}
            disabled={mutation.status === "pending"}
          >
            {mutation.status === "pending" ? "Queueing..." : "Queue Scan"}
            <ArrowRight size={16} />
          </button>

          <Link to="/scans" className="text-sm underline text-gray-900">
            View scans
          </Link>
        </div>

        {mutation.status === "error" && (
          <div className="text-sm text-red-600">
            Error submitting scan: {(mutation.error as Error)?.message ?? "unknown"}
          </div>
        )}

        {mutation.status === "success" && mutation.data && (
          <div className="rounded-md border px-4 py-3 bg-gray-50">
            <div className="text-sm text-gray-900">
              Scan queued — id <strong>{mutation.data.scan_id}</strong>
            </div>
            <div className="mt-2">
              <Link
                to={`/scans/${encodeURIComponent(mutation.data.scan_id)}`}
                className="text-sm text-blue-600 underline hover:text-blue-800"
              >
                Open scan results
              </Link>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
