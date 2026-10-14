import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { Download, Printer, Copy, Check, ShieldCheck, ShieldAlert } from 'lucide-react';
import { UserProfile, SystemSettings } from '../types';

interface QrCodeCardProps {
  user: UserProfile;
  settings?: SystemSettings | null;
  onRegenerate?: () => void;
  onRevoke?: () => void;
  showAdminActions?: boolean;
}

export const QrCodeCard: React.FC<QrCodeCardProps> = ({
  user,
  settings,
  onRegenerate,
  onRevoke,
  showAdminActions = false,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const cred = user.qr_credential;
  const isRevoked = cred?.credential_status === 'revoked';
  const isDeactivated = user.account_status === 'deactivated';

  // The QR code contains a structured verifiable token
  const tokenValue = cred ? cred.token_hash : '';
  const qrPayload = JSON.stringify({
    type: 'QRC_ATTENDANCE',
    v: 1,
    token: tokenValue,
    uid: user.user_identifier,
  });

  useEffect(() => {
    if (!tokenValue) return;

    QRCode.toDataURL(qrPayload, {
      width: 320,
      margin: 1.5,
      color: {
        dark: isRevoked ? '#94a3b8' : '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate QR:', err));
  }, [qrPayload, tokenValue, isRevoked]);

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `QR-${user.user_identifier}-${user.full_name.replace(/\s+/g, '_')}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyToken = () => {
    if (!tokenValue) return;
    navigator.clipboard.writeText(tokenValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const orgName = settings?.organization_name || 'OSC Scholar Duty Tracker';
  const orgLogo = settings?.organization_logo_url || '/src/assets/images/org_institutional_logo_1791949676528.jpg';

  return (
    <div className="flex flex-col items-center">
      {/* Printable ID Card Container */}
      <div
        ref={cardRef}
        className={`credential-card-print w-full max-w-sm rounded-2xl border bg-white shadow-sm overflow-hidden text-slate-900 transition-all ${
          isRevoked || isDeactivated
            ? 'border-red-200 bg-red-50/20'
            : 'border-slate-200 hover:shadow-md'
        }`}
      >
        {/* Card Header with Institutional Crest */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={orgLogo}
              alt="Institution Crest"
              className="w-8 h-8 rounded-full bg-white p-0.5 object-cover shrink-0"
              referrerPolicy="no-referrer"
            />
            <div>
              <h4 className="text-xs font-bold tracking-tight uppercase leading-none text-slate-100">
                {orgName}
              </h4>
              <p className="text-[10px] text-slate-400 font-medium tracking-wide mt-0.5">
                Official Credential Pass
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
            {user.role.toUpperCase()}
          </span>
        </div>

        {/* Card Body */}
        <div className="p-5 flex flex-col items-center text-center">
          {/* User Photo / Avatar */}
          <div className="relative mb-3">
            {user.profile_photo_url ? (
              <img
                src={user.profile_photo_url}
                alt={user.full_name}
                className="w-20 h-20 rounded-full object-cover border-2 border-white shadow-sm ring-1 ring-slate-200"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-slate-100 border-2 border-white shadow-sm ring-1 ring-slate-200 flex items-center justify-center text-slate-600 font-bold text-xl">
                {user.full_name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')}
              </div>
            )}

            {/* Status indicator badge */}
            <div
              className={`absolute bottom-0 right-0 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white ${
                isDeactivated || isRevoked ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
              }`}
              title={isDeactivated ? 'Account Deactivated' : isRevoked ? 'QR Revoked' : 'Active Credential'}
            >
              {isDeactivated || isRevoked ? (
                <ShieldAlert className="w-3 h-3" />
              ) : (
                <ShieldCheck className="w-3 h-3" />
              )}
            </div>
          </div>

          {/* User Details */}
          <h3 className="text-base font-bold text-slate-900 leading-tight">
            {user.full_name}
          </h3>
          <p className="font-mono text-xs font-semibold text-blue-700 tracking-wider mt-0.5">
            {user.user_identifier}
          </p>
          <p className="text-xs text-slate-500 mt-0.5 max-w-[240px] truncate">
            {user.department}
          </p>

          {/* QR Code Frame */}
          <div className="relative mt-4 p-2 bg-white rounded-xl border border-slate-200 shadow-inner inline-block">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR code for ${user.user_identifier}`}
                className={`w-44 h-44 object-contain ${
                  isRevoked || isDeactivated ? 'opacity-40 grayscale' : ''
                }`}
              />
            ) : (
              <div className="w-44 h-44 flex items-center justify-center text-xs text-slate-400">
                Generating QR...
              </div>
            )}

            {(isRevoked || isDeactivated) && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-xl">
                <span className="bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded shadow">
                  {isDeactivated ? 'ACCOUNT DEACTIVATED' : 'CREDENTIAL REVOKED'}
                </span>
              </div>
            )}
          </div>

          {/* Card Footer Info */}
          <div className="w-full mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Ref: {tokenValue.slice(0, 10)}...</span>
            <span className="font-mono">
              {isRevoked ? 'REVOKED' : isDeactivated ? 'INACTIVE' : 'VALIDATED'}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons (Hidden when printing) */}
      <div className="no-print mt-4 flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={handleDownload}
          disabled={!qrDataUrl || isRevoked}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 transition-colors shadow-sm"
        >
          <Download className="w-3.5 h-3.5" />
          Download PNG
        </button>

        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <Printer className="w-3.5 h-3.5" />
          Print ID Card
        </button>

        <button
          onClick={handleCopyToken}
          title="Copy Token Hash"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Copy Token'}
        </button>
      </div>

      {/* Admin Quick Revoke / Regenerate Controls */}
      {showAdminActions && (
        <div className="no-print mt-3 pt-3 border-t border-slate-200 w-full flex items-center justify-center gap-2">
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
            >
              Regenerate Token
            </button>
          )}
          {onRevoke && !isRevoked && (
            <button
              onClick={onRevoke}
              className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
            >
              Revoke Token
            </button>
          )}
        </div>
      )}
    </div>
  );
};
