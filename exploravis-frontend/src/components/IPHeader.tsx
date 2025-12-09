import React from "react";
import { Globe, Network, MapPin, DownloadCloud, Download, ExternalLink } from "lucide-react";
import { countryFlag } from "./IPPage.helper";

interface IPHeaderProps {
  ip: string;
  countryCode?: string;
  asnInfo?: { number: string; org: string };
  geoInfo?: { city?: string; country?: string };
  onExportJSON: () => void;
  onExportCSV: () => void;
}

export const IPHeader: React.FC<IPHeaderProps> = ({
  ip,
  countryCode,
  asnInfo,
  geoInfo,
  onExportJSON,
  onExportCSV,
}) => {
  return (
    <div className="bg-white border-b border-gray-200 pt-6 pb-8 px-4 shadow-sm">
      <div className="max-w-[1800px] mx-auto">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-blue-100 to-blue-50 p-3 rounded-xl border border-blue-200">
              <Globe className="text-blue-600 w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-bold text-gray-900 font-mono tracking-tight">{ip}</h1>
                {countryCode && (
                  <div className="flex items-center gap-2 text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg">
                    <span className="text-xl leading-none">{countryFlag(countryCode)}</span>
                    <span className="text-sm font-medium">{countryCode}</span>
                  </div>
                )}
              </div>
              {asnInfo && (
                <p className="text-gray-500 text-sm mt-1 flex items-center gap-2">
                  <Network size={14} />
                  AS{asnInfo.number} • {asnInfo.org}
                </p>
              )}
              {geoInfo?.city && (
                <p className="text-gray-500 text-sm mt-0.5 flex items-center gap-2">
                  <MapPin size={14} />
                  {geoInfo.city}, {geoInfo.country}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="flex gap-2 bg-gray-50 rounded-lg p-1">
              <button
                onClick={onExportJSON}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-white rounded-md transition-all hover:shadow-sm border border-transparent hover:border-blue-200"
              >
                <DownloadCloud size={16} />
                Export JSON
              </button>
              <button
                onClick={onExportCSV}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-white rounded-md transition-all hover:shadow-sm border border-transparent hover:border-blue-200"
              >
                <Download size={16} />
                Export CSV
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
