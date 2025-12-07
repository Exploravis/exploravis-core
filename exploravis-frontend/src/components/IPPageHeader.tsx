import type { JSX } from "react";
import { Globe, Network, MapPin, ExternalLink, DownloadCloud, Download } from "lucide-react";
import { countryFlag } from "./IPPage.helper";

interface IPPageHeaderProps {
  ip: string;
  geoInfo?: any;
  asnInfo?: any;
  lastScanned?: number;
  stats: any;
  exportData: (format: "csv" | "json") => void;
}

export default function IPPageHeader({ ip, geoInfo, asnInfo, lastScanned, stats, exportData }: IPPageHeaderProps): JSX.Element {
  return (
    <div className="bg-white border-b border-gray-200 pt-6 pb-8 px-4 shadow-sm">
      <div className="max-w-[1800px] mx-auto flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-blue-100 to-blue-50 p-3 rounded-xl border border-blue-200">
            <Globe className="text-blue-600 w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold text-gray-900 font-mono tracking-tight">{ip}</h1>
              {geoInfo?.country && (
                <div className="flex items-center gap-2 text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg">
                  <span className="text-xl leading-none">{countryFlag(geoInfo.country)}</span>
                  <span className="text-sm font-medium">{geoInfo.country}</span>
                </div>
              )}
            </div>
            {asnInfo && <p className="text-gray-500 text-sm mt-1 flex items-center gap-2"><Network size={14} /> AS{asnInfo.number} • {asnInfo.org}</p>}
            {geoInfo?.city && <p className="text-gray-500 text-sm mt-0.5 flex items-center gap-2"><MapPin size={14} />{geoInfo.city}</p>}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button onClick={() => exportData("json")} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-white rounded-md transition-all shadow-sm border border-transparent hover:border-blue-200">
            <DownloadCloud size={16} /> Export JSON
          </button>
          <button onClick={() => exportData("csv")} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-white rounded-md transition-all shadow-sm border border-transparent hover:border-blue-200">
            <Download size={16} /> Export CSV
          </button>
          <button onClick={() => window.open(`https://www.shodan.io/host/${ip}`, "_blank")} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm hover:shadow-md">
            <ExternalLink size={16} /> View on Shodan
          </button>
        </div>
      </div>
    </div>
  );
}
