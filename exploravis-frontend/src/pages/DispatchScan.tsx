import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Zap, Info, AlertCircle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { submitScan } from "../api/scans";

// Common port presets
const PORT_PRESETS = {
  "top20": "21,22,23,25,53,80,110,111,135,139,143,443,445,993,995,1723,3306,3389,5900,8080",
  "web": "80,443,8080,8443,3000,3001,8000,8008,8081,8888",
  "database": "1433,1521,3306,5432,27017,6379,9200,9300",
  "windows": "135,139,445,3389,5985,5986",
  "full": "1-65535"
} as const;

type PortPreset = keyof typeof PORT_PRESETS;

// IPv4 or IPv4/CIDR validation
const cidrRegex = /^(?:(?:25[0-5]|2[0-4]\d|1?\d{1,2})(?:\.(?!$)|$)){4}(?:\/([0-9]|[1-2][0-9]|3[0-2]))?$/;
const portRegex = /^(\d+(-\d+)?)(,\s*\d+(-\d+)?)*$/;

export default function DispatchPage() {
  const navigate = useNavigate();

  const [ipRange, setIpRange] = useState("");
  const [ports, setPorts] = useState("");
  const [note, setNote] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<PortPreset>("top20");
  const [errors, setErrors] = useState<{
    ipRange?: string;
    ports?: string;
  }>({});

  const mutation = useMutation({
    mutationFn: ({ ip_range, ports, note }: { ip_range: string; ports: string; note?: string }) =>
      submitScan({ ip_range, ports, note }),
    onSuccess: (data) => navigate(`/scans/${encodeURIComponent(data.scan_id)}`),
    onError: () => {
      // Clear form on error if needed, or keep data
    },
  });

  const validateForm = () => {
    const newErrors: typeof errors = {};


    // Validate ports (if provided)
    if (ports.trim() && !portRegex.test(ports.trim())) {
      newErrors.ports = "Invalid port format. Use comma-separated values or ranges (e.g., 80,443 or 1-1000)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    mutation.mutate({
      ip_range: ipRange.trim(),
      ports: ports.trim() || PORT_PRESETS[selectedPreset],
      note: note.trim() || undefined
    });
  };

  const handlePresetSelect = (preset: PortPreset) => {
    setSelectedPreset(preset);
    setPorts(PORT_PRESETS[preset]);
    // Clear port error when selecting a preset
    if (errors.ports) {
      setErrors(prev => ({ ...prev, ports: undefined }));
    }
  };

  const handleCustomPorts = (value: string) => {
    setPorts(value);
    setSelectedPreset("custom");

    // Auto-validate as user types
    if (value.trim() && !portRegex.test(value.trim())) {
      setErrors(prev => ({
        ...prev,
        ports: "Invalid port format. Use comma-separated values or ranges"
      }));
    } else if (errors.ports) {
      setErrors(prev => ({ ...prev, ports: undefined }));
    }
  };

  const handleIPRangeChange = (value: string) => {
    setIpRange(value);

  };

  const exampleIPs = [
    "192.168.1.1",
    "10.0.0.0/24",
    "172.16.0.0/16",
    "85.190.254.203/22"
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">New Scan</h1>
          </div>
          <p className="text-gray-600">
            Configure and dispatch a network scan to the orchestrator.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* IP / CIDR Range */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-gray-900">
                Target IP/CIDR Range
                <span className="text-red-500 ml-1">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIpRange("")}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear
              </button>
            </div>

            <div className="relative">
              <input
                value={ipRange}
                onChange={(e) => handleIPRangeChange(e.target.value)}
                placeholder="e.g., 192.168.1.1 or 10.0.0.0/24"
                className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${errors.ipRange
                  ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                  : "border-gray-300"
                  }`}
                required
                aria-invalid={!!errors.ipRange}
                aria-describedby={errors.ipRange ? "ip-error" : undefined}
              />

              {errors.ipRange && (
                <div className="flex items-center gap-1 mt-1">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <p id="ip-error" className="text-sm text-red-600">{errors.ipRange}</p>
                </div>
              )}
            </div>

            {/* Example IPs */}
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                <Info className="w-3 h-3" />
                Quick examples:
              </p>
              <div className="flex flex-wrap gap-2">
                {exampleIPs.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => handleIPRangeChange(example)}
                    className="px-3 py-1.5 text-xs rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Port Configuration */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-900">
              Ports to Scan
            </label>

            {/* Port Presets */}
            <div className="space-y-2">
              <p className="text-xs text-gray-500">Common presets:</p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {Object.entries(PORT_PRESETS).map(([key, _]) => {
                  const preset = key as PortPreset;
                  if (preset === "full") return null; // Handle full separately

                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handlePresetSelect(preset)}
                      className={`px-3 py-2 text-sm rounded-md transition-all ${selectedPreset === preset
                        ? "bg-blue-100 text-blue-700 border border-blue-300"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
                        }`}
                    >
                      {preset.charAt(0).toUpperCase() + preset.slice(1)}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => {
                    setSelectedPreset("full");
                    setPorts(PORT_PRESETS.full);
                  }}
                  className={`px-3 py-2 text-sm rounded-md transition-all ${selectedPreset === "full"
                    ? "bg-red-100 text-red-700 border border-red-300"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
                    }`}
                >
                  Full Range
                </button>
              </div>
            </div>

            {/* Custom Port Input */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">Or specify custom ports:</p>
                <button
                  type="button"
                  onClick={() => {
                    setPorts("");
                    setSelectedPreset("custom");
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Clear custom
                </button>
              </div>

              <input
                value={ports}
                onChange={(e) => handleCustomPorts(e.target.value)}
                placeholder="e.g., 80,443,8080 or 1-1000"
                className={`w-full border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${errors.ports
                  ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                  : "border-gray-300"
                  }`}
                aria-invalid={!!errors.ports}
                aria-describedby={errors.ports ? "port-error" : undefined}
              />

              {errors.ports && (
                <div className="flex items-center gap-1">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <p id="port-error" className="text-sm text-red-600">{errors.ports}</p>
                </div>
              )}

              <p className="text-xs text-gray-500 mt-1">
                Leave empty to use the selected preset. Format: comma-separated (80,443) or ranges (1-1000)
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900">
              Scan Description <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Production web servers, Customer network assessment"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              maxLength={100}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Helps identify the scan in history</span>
              <span>{note.length}/100</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
              <div className="flex items-center gap-4">
                <button
                  type="submit"
                  disabled={mutation.isPending || !!errors.ipRange || !!errors.ports}
                  className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all min-w-[140px] ${mutation.isPending || errors.ipRange || errors.ports
                    ? "bg-blue-400 cursor-not-allowed text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow"
                    }`}
                >
                  {mutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Queueing Scan...
                    </>
                  ) : (
                    <>
                      Queue Scan
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>

                {mutation.isError && (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    Error: {(mutation.error as Error)?.message || "Failed to queue scan"}
                  </div>
                )}
              </div>

              <Link
                to="/scans"
                className="text-sm text-gray-600 hover:text-gray-900 underline transition-colors"
              >
                View all scans →
              </Link>
            </div>

            {/* Scan Status Info */}
            {mutation.isSuccess && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700">
                  Scan queued successfully! Redirecting to results...
                </p>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
