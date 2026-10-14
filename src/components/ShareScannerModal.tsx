import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Share2,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  X,
  Smartphone,
  ShieldCheck,
  Radio,
} from 'lucide-react';
import { AttendanceSession, SystemSettings } from '../types';

interface ShareScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions?: AttendanceSession[];
  settings?: SystemSettings | null;
}

export const ShareScannerModal: React.FC<ShareScannerModalProps> = ({
  isOpen,
  onClose,
  sessions = [],
  settings,
}) => {
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const orgName = settings?.organization_name || 'OSC Scholar Duty Tracker';
  const orgLogo = settings?.organization_logo_url || '/src/assets/images/org_institutional_logo_1791949676528.jpg';

  // Construct the shareable URL
  const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}?view=scanner` : '';
  const shareableUrl = selectedSessionId ? `${baseUrl}&session=${encodeURIComponent(selectedSessionId)}` : baseUrl;

  // Generate QR code for the shareable URL
  useEffect(() => {
    if (!shareableUrl) return;

    QRCode.toDataURL(shareableUrl, {
      width: 260,
      margin: 1.5,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate scanner link QR:', err));
  }, [shareableUrl]);

  const handleCopy = () => {
    if (!shareableUrl) return;
    navigator.clipboard.writeText(shareableUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleOpenNewTab = () => {
    if (!shareableUrl) return;
    window.open(shareableUrl, '_blank', 'noopener,noreferrer');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 text-slate-900 overflow-hidden relative animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Shareable Public Scanner Link
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {orgName} · Dedicated Entrance Terminal
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="mb-5 p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-start gap-3 text-xs text-blue-900">
          <Smartphone className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold">Zero-login Public View:</span> Anyone with this link can use their phone or tablet camera to scan scholar QR codes and record duty attendance directly into the centralized database without admin access.
          </div>
        </div>

        {/* QR Code and Quick Launch */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-5 mb-5">
          {/* QR Code */}
          <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-xs shrink-0 flex flex-col items-center">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Scanner Link QR Code"
                className="w-32 h-32 object-contain"
              />
            ) : (
              <div className="w-32 h-32 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                <QrCode className="w-8 h-8" />
              </div>
            )}
            <span className="text-[10px] font-semibold text-slate-500 mt-1">Scan with Mobile</span>
          </div>

          {/* Details & Actions */}
          <div className="flex-1 w-full text-center sm:text-left space-y-3">
            <div>
              <p className="text-xs font-bold text-slate-800">Launch on Any Station</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Scan the QR code with an iPad, entrance tablet, or mobile phone to open the terminal immediately.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleOpenNewTab}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open Separate Tab
              </button>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied Link!' : 'Copy Link'}
              </button>
            </div>
          </div>
        </div>

        {/* Link Input Bar */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Shareable URL (Direct Link)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareableUrl}
              onFocus={(e) => e.target.select()}
              className="flex-1 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 select-all focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={handleCopy}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>

        {/* Optional Session Filter */}
        {sessions.length > 1 && (
          <div className="mb-5">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Target Attendance Session (Optional)
            </label>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Default (First Active Session)</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.session_name} ({s.attendance_date})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Public Scanner Role Only</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
