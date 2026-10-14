import React, { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import confetti from 'canvas-confetti';
import {
  Camera,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Volume2,
  VolumeX,
  Clock,
  Building,
  UserCheck,
  ShieldAlert,
  ArrowLeft,
  Maximize2,
  Minimize2,
  Sparkles,
  Share2,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { AttendanceSession, ScanResult, UserProfile, SystemSettings } from '../types';
import { api } from '../lib/api';
import { playSuccessChime, playCheckoutChime, playWarningBuzzer } from '../lib/sound';
import { ShareScannerModal } from './ShareScannerModal';

interface PublicScannerKioskProps {
  sessions: AttendanceSession[];
  settings: SystemSettings | null;
  allUsers: UserProfile[];
  onExitKiosk: () => void;
}

export const PublicScannerKiosk: React.FC<PublicScannerKioskProps> = ({
  sessions,
  settings,
  allUsers,
  onExitKiosk,
}) => {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeResult, setActiveResult] = useState<ScanResult | null>(null);
  const [recentPasses, setRecentPasses] = useState<ScanResult[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(0);
  const [manualTokenInput, setManualTokenInput] = useState('');
  const [showSimulatorDrawer, setShowSimulatorDrawer] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Initialize selected session from URL query parameter (e.g. ?session=...)
  const [selectedSessionId, setSelectedSessionId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('session') || '';
    }
    return '';
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastScannedTokenRef = useRef<string | null>(null);
  const lastScannedTimeRef = useRef<number>(0);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Live Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const currentSession =
    sessions.find((s) => s.id === selectedSessionId) ||
    sessions.find((s) => s.status === 'active') ||
    sessions[0];
  const orgName = settings?.organization_name || 'OSC Scholar Duty Tracker';
  const orgLogo = settings?.organization_logo_url || '/src/assets/images/org_institutional_logo_1791949676528.jpg';

  const handleQuickCopyLink = () => {
    const link = typeof window !== 'undefined' ? `${window.location.origin}?view=scanner` : '';
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Process Scanned Token
  const handleValidateToken = useCallback(
    async (token: string) => {
      const now = Date.now();
      if (token === lastScannedTokenRef.current && now - lastScannedTimeRef.current < 4000) {
        return;
      }
      lastScannedTokenRef.current = token;
      lastScannedTimeRef.current = now;

      setIsProcessing(true);
      try {
        const result = await api.scanAttendance({
          qrToken: token,
          sessionId: currentSession?.id,
          operatorName: 'Public Entrance Terminal',
        });

        setActiveResult(result);
        setRecentPasses((prev) => [result, ...prev.slice(0, 9)]);

        if (result.success) {
          if (soundEnabled) {
            if (result.type === 'check_out') {
              playCheckoutChime();
            } else {
              playSuccessChime();
            }
          }
          if (result.type !== 'check_out') {
            confetti({
              particleCount: 50,
              spread: 70,
              origin: { y: 0.6 },
            });
          }
        } else {
          if (soundEnabled) {
            playWarningBuzzer();
          }
        }

        // Auto-reset countdown
        setCountdownSeconds(4);
        if (resetTimerRef.current) clearInterval(resetTimerRef.current);
        let remaining = 4;
        resetTimerRef.current = setInterval(() => {
          remaining -= 1;
          setCountdownSeconds(remaining);
          if (remaining <= 0) {
            if (resetTimerRef.current) clearInterval(resetTimerRef.current);
            setActiveResult(null);
          }
        }, 1000);
      } catch (err: any) {
        console.error('Kiosk scan error:', err);
        const errorResult: ScanResult = {
          success: false,
          reason: 'SERVER_ERROR',
          message: err.message || 'Verification server could not be reached.',
        };
        setActiveResult(errorResult);
        if (soundEnabled) playWarningBuzzer();
      } finally {
        setIsProcessing(false);
      }
    },
    [currentSession, soundEnabled]
  );

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: any) {
      console.warn('Camera error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera access permission denied. Please allow camera in browser settings.'
          : 'Could not access camera. You can use the Quick Test Simulator below.'
      );
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Frame Analysis Loop
  useEffect(() => {
    if (!cameraActive) return;
    let isScanning = true;

    const tick = () => {
      if (!isScanning) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          canvas.height = video.videoHeight;
          canvas.width = video.videoWidth;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code && code.data && !isProcessing && !activeResult) {
            handleValidateToken(code.data);
          }
        }
      }
      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);
    return () => {
      isScanning = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [cameraActive, isProcessing, activeResult, handleValidateToken]);

  // Attempt auto camera start on mount
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      if (resetTimerRef.current) clearInterval(resetTimerRef.current);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col overflow-hidden select-none">
      {/* Top Kiosk Header */}
      <header className="bg-slate-900/90 border-b border-slate-800 px-6 py-3.5 flex items-center justify-between gap-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <img
            src={orgLogo}
            alt="University Emblem"
            className="w-10 h-10 rounded-full bg-white p-0.5 object-cover ring-2 ring-blue-500/40 shrink-0"
            referrerPolicy="no-referrer"
          />
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              {orgName}
              <span className="text-[10px] font-mono uppercase bg-blue-600/30 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30">
                Public Kiosk
              </span>
            </h1>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium mt-0.5">
              <span>Terminal Station:</span>
              {sessions.length > 1 ? (
                <select
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded px-2 py-0.5 font-semibold focus:outline-none focus:border-blue-500"
                >
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.session_name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-blue-400 font-semibold">{currentSession?.session_name || 'Active Duty Session'}</span>
              )}
            </div>
          </div>
        </div>

        {/* Live Clock & Timing Indicators */}
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="text-right hidden sm:block">
            <div className="font-mono text-xl font-bold text-white tracking-wider tabular-nums">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-[11px] text-slate-400">
              {currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/90 hover:bg-blue-600 text-white text-xs font-bold transition-colors shadow-xs"
              title="Share or pair this public scanner via link or QR code"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Share Link &amp; QR</span>
            </button>

            <button
              onClick={handleQuickCopyLink}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title={copiedLink ? 'Copied link!' : 'Copy direct link'}
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title={soundEnabled ? 'Mute' : 'Unmute'}
            >
              {soundEnabled ? <Volume2 className="w-5 h-5 text-blue-400" /> : <VolumeX className="w-5 h-5 text-slate-500" />}
            </button>

            <button
              onClick={() => {
                setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
                stopCamera();
                setTimeout(() => startCamera(), 200);
              }}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Switch Camera"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors hidden md:block"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onExitKiosk}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors ml-1"
              title="Return to main portal"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Portal
            </button>
          </div>
        </div>
      </header>

      {/* Main Kiosk Viewport */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 items-center overflow-hidden">
        {/* Left: Camera Scanner Viewfinder (7 cols) */}
        <div className="lg:col-span-7 h-full flex flex-col justify-center">
          <div className="relative w-full max-w-2xl mx-auto aspect-[4/3] rounded-3xl bg-slate-900 border-2 border-slate-800 shadow-2xl overflow-hidden flex items-center justify-center">
            <canvas ref={canvasRef} className="hidden" />

            <video
              ref={videoRef}
              className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
              muted
              playsInline
            />

            {!cameraActive && (
              <div className="text-center p-8 text-slate-400">
                <Camera className="w-16 h-16 mx-auto mb-3 text-slate-600" />
                <h3 className="text-lg font-bold text-white mb-1">Terminal Camera Offline</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                  {cameraError || 'Activate the device camera to begin scanning attendee credentials.'}
                </p>
                <button
                  onClick={startCamera}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-colors text-sm"
                >
                  Enable Camera
                </button>
              </div>
            )}

            {/* Target Reticle with Laser */}
            {cameraActive && !activeResult && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="relative w-72 h-72 border-2 border-white/60 rounded-3xl shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
                  <div className="absolute -top-1.5 -left-1.5 w-8 h-8 border-t-4 border-l-4 border-blue-400 rounded-tl-xl" />
                  <div className="absolute -top-1.5 -right-1.5 w-8 h-8 border-t-4 border-r-4 border-blue-400 rounded-tr-xl" />
                  <div className="absolute -bottom-1.5 -left-1.5 w-8 h-8 border-b-4 border-l-4 border-blue-400 rounded-bl-xl" />
                  <div className="absolute -bottom-1.5 -right-1.5 w-8 h-8 border-b-4 border-r-4 border-blue-400 rounded-br-xl" />

                  {/* Horizontal animated scanning beam */}
                  <div className="absolute left-3 right-3 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#38bdf8] top-1/2 -translate-y-1/2 animate-pulse" />
                </div>

                <div className="absolute bottom-6 left-0 right-0 text-center">
                  <span className="bg-slate-900/80 backdrop-blur-md text-white text-xs font-semibold px-4 py-1.5 rounded-full border border-slate-700 shadow-lg">
                    Hold QR code facing camera
                  </span>
                </div>
              </div>
            )}

            {/* Processing Spinner */}
            {isProcessing && (
              <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center">
                <div className="bg-white text-slate-900 rounded-2xl px-6 py-4 shadow-2xl flex items-center gap-3">
                  <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-bold">Verifying Cloud Database...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Big Scan Result Billboard & Recent Stream (5 cols) */}
        <div className="lg:col-span-5 h-full flex flex-col justify-center space-y-4">
          {activeResult ? (
            /* HUGE RESULT CARD */
            <div
              className={`rounded-3xl border p-6 shadow-2xl transition-all ${
                activeResult.success
                  ? activeResult.type === 'check_out'
                    ? 'bg-blue-950/80 border-blue-500/60 shadow-blue-900/30'
                    : 'bg-emerald-950/80 border-emerald-500/60 shadow-emerald-900/30'
                  : 'bg-red-950/80 border-red-500/60 shadow-red-900/30'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {activeResult.success ? (
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30">
                      <XCircle className="w-8 h-8" />
                    </div>
                  )}
                  <div>
                    <h2
                      className={`text-lg font-bold leading-tight ${
                        activeResult.success ? 'text-emerald-300' : 'text-red-300'
                      }`}
                    >
                      {activeResult.message}
                    </h2>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      {activeResult.timestamp
                        ? new Date(activeResult.timestamp).toLocaleTimeString()
                        : new Date().toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                {countdownSeconds > 0 && (
                  <span className="text-xs font-mono font-bold bg-white/10 px-2.5 py-1 rounded-full text-slate-300">
                    Next in {countdownSeconds}s
                  </span>
                )}
              </div>

              {/* User details display */}
              {activeResult.user ? (
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
                  {activeResult.user.profile_photo_url ? (
                    <img
                      src={activeResult.user.profile_photo_url}
                      alt={activeResult.user.full_name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-white/20 shadow-md shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-white/20 flex items-center justify-center font-bold text-xl text-slate-200 shrink-0">
                      {activeResult.user.full_name
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-bold text-white truncate">
                      {activeResult.user.full_name}
                    </h3>
                    <p className="font-mono text-xs font-bold text-blue-400 mt-0.5">
                      {activeResult.user.user_identifier}
                    </p>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {activeResult.user.department}
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Status Banner */}
              {activeResult.record && (
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Attendance Status:</span>
                  <span
                    className={`font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-lg text-xs ${
                      activeResult.record.attendance_status === 'present'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : activeResult.record.attendance_status === 'late'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                    }`}
                  >
                    {activeResult.record.attendance_status === 'checked_out'
                      ? 'CHECKED OUT'
                      : activeResult.record.attendance_status.toUpperCase()}
                  </span>
                </div>
              )}

              {/* Warning Reason */}
              {!activeResult.success && activeResult.reason && (
                <div className="mt-3 bg-red-950/60 border border-red-800/60 p-3 rounded-xl text-xs text-red-200">
                  <span className="font-mono font-bold text-red-400">{activeResult.reason}</span>:{' '}
                  {activeResult.message}
                </div>
              )}
            </div>
          ) : (
            /* Standby Billboard */
            <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-10 text-center text-slate-500">
              <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-slate-800/60 flex items-center justify-center text-blue-400 border border-slate-700/50">
                <Clock className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">Terminal Ready</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Present your institutional QR ID card in front of the camera to record attendance.
              </p>
            </div>
          )}

          {/* Recent Terminal Activity Ticker */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                Recent Terminal Activity
              </h4>
              <span className="font-mono text-[10px] text-slate-500">{recentPasses.length} scans</span>
            </div>

            {recentPasses.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-3">No scans recorded on this terminal yet.</p>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {recentPasses.map((p, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-800/40 border border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          p.success ? 'bg-emerald-400' : 'bg-red-400'
                        }`}
                      />
                      <span className="font-bold text-slate-200 truncate">
                        {p.user?.full_name || 'Unrecognized ID'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                          p.success ? 'bg-emerald-950 text-emerald-300' : 'bg-red-950 text-red-300'
                        }`}
                      >
                        {p.success ? p.record?.attendance_status || 'OK' : 'REJECTED'}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {p.timestamp ? new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Testing Drawer / Simulator Bar */}
      <footer className="bg-slate-900 border-t border-slate-800 px-6 py-2.5 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSimulatorDrawer(!showSimulatorDrawer)}
            className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {showSimulatorDrawer ? 'Hide Quick Simulator' : 'Test Without Camera'}
          </button>
          <span>·</span>
          <span className="text-[11px] text-slate-400">
            Realtime Cloud Sync Active (Port 3000)
          </span>
        </div>

        {/* Manual Token Quick Paste Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (manualTokenInput.trim()) {
              handleValidateToken(manualTokenInput.trim());
              setManualTokenInput('');
            }
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Paste Token (e.g. QRC-XXX)..."
            value={manualTokenInput}
            onChange={(e) => setManualTokenInput(e.target.value)}
            className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 font-mono focus:outline-none focus:border-blue-500 w-48"
          />
          <button
            type="submit"
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition-colors"
          >
            Scan
          </button>
        </form>
      </footer>

      {/* Expandable Testing Simulator Bar */}
      {showSimulatorDrawer && (
        <div className="bg-slate-900/95 border-t border-slate-800 p-4 max-h-48 overflow-y-auto">
          <div className="max-w-5xl mx-auto">
            <p className="text-xs text-slate-400 mb-2 font-semibold">
              Click any sample registered credential below to simulate a live physical scan at this terminal:
            </p>
            <div className="flex flex-wrap gap-2">
              {allUsers.map((u) => {
                const token = u.qr_credential?.token_hash || '';
                return (
                  <button
                    key={u.id}
                    onClick={() => handleValidateToken(token)}
                    disabled={isProcessing}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs text-left transition-colors"
                  >
                    <span className="font-bold text-white block">{u.full_name}</span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {u.user_identifier} ({u.account_status === 'deactivated' ? 'Deactivated' : u.qr_credential?.credential_status === 'revoked' ? 'Revoked' : 'Active'})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Share Scanner Link & QR Pairing Modal */}
      <ShareScannerModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        sessions={sessions}
        settings={settings}
      />
    </div>
  );
};
