
import React from "react";

export type TlsCertificate = {
  dns_names?: string[];
  issuer?: string;
  subject?: string;
  not_before?: string;
  not_after?: string;
  serial?: string;
  sig_alg?: string;
  public_key?: string;
};

export type TlsInfo = {
  version?: string;
  cipher_suite?: string;
  alpn?: string;
  negotiated_protocol?: string;
  handshake_ok?: boolean;
  certificate?: TlsCertificate;
};

interface Props {
  tls: TlsInfo;
}

export const TlsDetails: React.FC<Props> = ({ tls }) => {
  const cert = tls.certificate;

  return (
    <div className="space-y-6 text-xs">

      {/* ===== TLS Overview ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <DetailRow label="Version" value={tls.version} />
        <DetailRow label="Cipher Suite" value={tls.cipher_suite} />
        <DetailRow label="ALPN" value={tls.alpn} />
        <DetailRow label="Negotiated Protocol" value={tls.negotiated_protocol} />
        <DetailRow label="Handshake OK" value={tls.handshake_ok ? "Yes" : "No"} />

      </div>

      {/* ===== Certificate Section ===== */}
      {cert && (
        <div className="space-y-4">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DetailRow label="Issuer" value={cert.issuer} truncate />
            <DetailRow label="Subject" value={cert.subject} truncate />
            <DetailRow
              label="Valid From"
              value={
                cert.not_before
                  ? new Date(cert.not_before).toLocaleDateString()
                  : "—"
              }
            />
            <DetailRow
              label="Valid To"
              value={
                cert.not_after
                  ? new Date(cert.not_after).toLocaleDateString()
                  : "—"
              }
            />
            <DetailRow label="Serial" value={cert.serial} truncate />
            <DetailRow label="Signature Algorithm" value={cert.sig_alg} truncate />
            <DetailRow label="Public Key" value={cert.public_key} truncate />
          </div>

          {/* DNS Names */}
          {cert.dns_names?.length > 0 && (
            <div>
              <span className="text-gray-500">DNS Names</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {cert.dns_names.map((d) => (
                  <span
                    key={d}
                    className="px-2 py-0.5 bg-gray-50 border border-gray-200 rounded text-[10px] text-gray-700"
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface DetailProps {
  label: string;
  value?: string | number | null;
  truncate?: boolean;
}

const DetailRow: React.FC<DetailProps> = ({ label, value, truncate }) => (
  <div className="flex justify-between border-b border-gray-100 pb-1">
    <span className="text-gray-500">{label}</span>
    <span
      className={`text-gray-800 text-sm font-medium ${truncate ? "truncate max-w-[240px]" : ""
        }`}
    >
      {value || "—"}
    </span>
  </div>
);
