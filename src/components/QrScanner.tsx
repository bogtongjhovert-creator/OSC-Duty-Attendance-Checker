import React, { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import confetti from 'canvas-confetti';
import {
  Camera,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Volume2,
  VolumeX,
  Clock,
  User,
  Building,
  Sparkles,
  Search,
} from 'lucide-react';
import { AttendanceSession, ScanResult, UserProfile } from '../types';
import { api } from '../lib/api';
import { playSuccessChime, playCheckoutChime, playWarningBuzzer } from '../lib/sound';

interface QrScannerProps {
  sessions: AttendanceSession[];
  activeSessionId?: string;
  operatorName: string;
  allUsers: UserProfile[];
  onScanComplete?: (result: ScanResult) => void;
}

export const QrScanner: React.FC<QrScannerProps> = ({
  sessions,
  activeSessionId,
  operatorName,
  allUsers,
  onScanComplete,
}) => {
  const [selectedSessionId, setSelectedSessionId] = useState<string>(activeSessionId || '');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null);
  const [manualToken, setManualToken] = useState<string>('');
  const [recentScans, setRecentScans] = useState<ScanResult[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastScannedTokenRef = useRef<string | null>(null);
  const lastScannedTimeRef = useRef<number>(0);

  // Set default session if not set
  useEffect(() => {
    if (!selectedSessionId && sessions.length > 0) {
      const active = sessions.find((s) => s.status === 'active') || sessions[0];
      setSelectedSessionId(active.id);
    }
  }, [sessions, selectedSessionId]);

  // Process a scanned token against the server
  const handleValidateToken = useCallback(
    async (token: string) => {
      // Cooldown prevention
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
          sessionId: selectedSessionId,
          operatorName: operatorName || 'QR Scanner Station',
        });

        setLastScanResult(result);
        setRecentScans((prev) => [result, ...prev.slice(0, 7)]);

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
              particleCount: 40,
              spread: 60,
              origin: { y: 0.7 },
            });
          }
        } else {
          if (soundEnabled) {
            playWarningBuzzer();
          }
        }

        if (onScanComplete) {
          onScanComplete(result);
        }
      } catch (err: any) {
        console.error('Scan validation error:', err);
        const errorResult: ScanResult = {
          success: false,
          reason: 'SERVER_ERROR',
          message: err.message || 'Network error while contacting attendance server',
        };
        setLastScanResult(errorResult);
        if (soundEnabled) playWarningBuzzer();
      } finally {
        setIsProcessing(false);
      }
    },
    [selectedSessionId, operatorName, soundEnabled, onScanComplete]
  );

  // Start Camera Stream
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
      console.warn('Camera access denied or unavailable:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission was denied. Please allow camera access in your browser.'
          : 'Could not access camera device. You can still test with the manual token simulator below.'
      );
      setCameraActive(false);
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Frame Analysis Loop with jsQR
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

          if (code && code.data && !isProcessing) {
            handleValidateToken(code.data);
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      isScanning = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [cameraActive, isProcessing, handleValidateToken]);

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
    if (cameraActive) {
      stopCamera();
      setTimeout(() => startCamera(), 200);
    }
  };

  const currentSession = sessions.find((s) => s.id === selectedSessionId);

  return (
    <div className="space-y-6">
      {/* Session Selector & Controls Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1 min-w-[240px]">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Active Attendance Session
          </label>
          <select
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg px-3 py-2 font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.session_name} ({s.attendance_date}) - [Late after {s.late_threshold}]
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-lg border transition-colors ${
              soundEnabled
                ? 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                : 'border-slate-200 bg-white text-slate-400 hover:bg-slate-50'
            }`}
            title={soundEnabled ? 'Mute Sound Feedback' : 'Unmute Sound Feedback'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          <button
            onClick={toggleFacingMode}
            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition-colors"
            title="Switch Front / Rear Camera"
          >
            <RefreshCw className="w-5 h-5" />
          </button>

          {!cameraActive ? (
            <button
              onClick={startCamera}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow transition-colors"
            >
              <Camera className="w-4 h-4" />
              Activate Camera
            </button>
          ) : (
            <button
              onClick={stopCamera}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-lg shadow transition-colors"
            >
              <Camera className="w-4 h-4" />
              Stop Camera
            </button>
          )}
        </div>
      </div>

      {/* Main Scanner Section: Camera Viewfinder & Result Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Viewfinder (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-md aspect-[4/3] flex items-center justify-center">
            {/* Hidden canvas used for pixel analysis */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Video Feed */}
            <video
              ref={videoRef}
              className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
              muted
              playsInline
            />

            {/* Inactive State Screen */}
            {!cameraActive && (
              <div className="text-center p-6 text-slate-400">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800">
                  <Camera className="w-8 h-8 text-slate-400" />
                </div>
                <h4 className="text-base font-semibold text-white mb-1">
                  Camera Currently Offline
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mb-4">
                  Click &ldquo;Activate Camera&rdquo; above to start real-time scanning with your webcam or mobile camera.
                </p>
                <button
                  onClick={startCamera}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow transition-colors"
                >
                  Start Camera Feed
                </button>
              </div>
            )}

            {/* Active Scanning Overlay (Reticle & Laser) */}
            {cameraActive && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {/* Aiming Reticle */}
                <div className="relative w-64 h-64 border-2 border-white/70 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                  {/* Corner accents */}
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-lg" />

                  {/* Animated scanning laser line */}
                  <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-pulse shadow-[0_0_8px_#38bdf8] top-1/2 -translate-y-1/2" />
                </div>

                {/* Subtext */}
                <div className="absolute bottom-4 left-0 right-0 text-center">
                  <span className="bg-black/60 backdrop-blur-md text-white text-xs font-medium px-3 py-1 rounded-full border border-white/20">
                    Align QR Credential inside frame
                  </span>
                </div>
              </div>
            )}

            {/* Processing Spinner Overlay */}
            {isProcessing && (
              <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center">
                <div className="bg-white text-slate-900 rounded-xl px-4 py-3 shadow-xl flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-bold">Verifying Credential...</span>
                </div>
              </div>
            )}
          </div>

          {/* Camera Error Alert */}
          {cameraError && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl p-3 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Notice</p>
                <p>{cameraError}</p>
              </div>
            </div>
          )}

          {/* Quick Manual Simulator / Demo Tester */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Quick Test Credential Simulator
              </h4>
              <span className="text-[11px] text-slate-400">One-click test</span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Click any sample credential below to simulate a live camera scan directly:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {allUsers.slice(0, 4).map((u) => {
                const token = u.qr_credential?.token_hash || '';
                return (
                  <button
                    key={u.id}
                    onClick={() => handleValidateToken(token)}
                    disabled={isProcessing}
                    className="p-2 text-left rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-colors text-xs"
                  >
                    <p className="font-bold text-slate-900 truncate">{u.full_name.split(' ')[0]}</p>
                    <p className="text-[10px] font-mono text-slate-500">{u.user_identifier}</p>
                    <span
                      className={`text-[9px] font-semibold ${
                        u.account_status === 'deactivated'
                          ? 'text-red-600'
                          : u.qr_credential?.credential_status === 'revoked'
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      {u.account_status === 'deactivated'
                        ? 'Deactivated'
                        : u.qr_credential?.credential_status === 'revoked'
                        ? 'Revoked'
                        : 'Active QR'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Test Revoked User and Deactivated User Buttons */}
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap gap-2">
              {allUsers.find((u) => u.account_status === 'deactivated') && (
                <button
                  onClick={() => {
                    const deact = allUsers.find((u) => u.account_status === 'deactivated');
                    if (deact?.qr_credential) handleValidateToken(deact.qr_credential.token_hash);
                  }}
                  className="px-2.5 py-1 text-[11px] font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
                >
                  Test Deactivated Account
                </button>
              )}

              {allUsers.find((u) => u.qr_credential?.credential_status === 'revoked') && (
                <button
                  onClick={() => {
                    const rev = allUsers.find((u) => u.qr_credential?.credential_status === 'revoked');
                    if (rev?.qr_credential) handleValidateToken(rev.qr_credential.token_hash);
                  }}
                  className="px-2.5 py-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 transition-colors"
                >
                  Test Revoked Credential
                </button>
              )}

              <button
                onClick={() => handleValidateToken('QRC-FAKE-TOKEN-999')}
                className="px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-md hover:bg-slate-200 transition-colors"
              >
                Test Invalid Token
              </button>
            </div>

            {/* Manual token input field */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (manualToken.trim()) {
                  handleValidateToken(manualToken.trim());
                  setManualToken('');
                }
              }}
              className="mt-3 flex gap-2"
            >
              <input
                type="text"
                placeholder="Or paste QR token manually (e.g. QRC-ABC123)..."
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors shrink-0"
              >
                Submit
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Scan Result & Live Attendance Feed (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Active Result Card */}
          {lastScanResult ? (
            <div
              className={`rounded-2xl border p-5 shadow-sm transition-all ${
                lastScanResult.success
                  ? lastScanResult.type === 'check_out'
                    ? 'bg-blue-50/70 border-blue-200'
                    : 'bg-emerald-50/70 border-emerald-200'
                  : 'bg-red-50/70 border-red-200'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                {lastScanResult.success ? (
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                    <XCircle className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <h3
                    className={`text-sm font-bold leading-tight ${
                      lastScanResult.success ? 'text-emerald-900' : 'text-red-900'
                    }`}
                  >
                    {lastScanResult.message}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {lastScanResult.timestamp
                      ? new Date(lastScanResult.timestamp).toLocaleTimeString()
                      : new Date().toLocaleTimeString()}{' '}
                    · {currentSession?.session_name || 'Active Session'}
                  </p>
                </div>
              </div>

              {/* User details if found */}
              {lastScanResult.user && (
                <div className="mt-3 pt-3 border-t border-slate-200/60 bg-white/80 backdrop-blur-xs rounded-xl p-3 shadow-xs">
                  <div className="flex items-center gap-3">
                    {lastScanResult.user.profile_photo_url ? (
                      <img
                        src={lastScanResult.user.profile_photo_url}
                        alt={lastScanResult.user.full_name}
                        className="w-12 h-12 rounded-full object-cover border border-slate-200"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-sm">
                        {lastScanResult.user.full_name
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {lastScanResult.user.full_name}
                      </p>
                      <p className="text-xs font-mono font-medium text-blue-700">
                        {lastScanResult.user.user_identifier}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {lastScanResult.user.department}
                      </p>
                    </div>
                  </div>

                  {/* Status Tag */}
                  {lastScanResult.record && (
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Recorded Status:</span>
                      <span
                        className={`font-bold uppercase tracking-wider text-[11px] px-2 py-0.5 rounded ${
                          lastScanResult.record.attendance_status === 'present'
                            ? 'bg-emerald-100 text-emerald-800'
                            : lastScanResult.record.attendance_status === 'late'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {lastScanResult.record.attendance_status === 'checked_out'
                          ? 'Checked Out'
                          : lastScanResult.record.attendance_status.toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Warning Reason Explanation */}
              {!lastScanResult.success && lastScanResult.reason && (
                <div className="mt-2 text-xs text-red-700 font-medium bg-red-100/50 p-2.5 rounded-lg">
                  Reason Code: <span className="font-mono font-bold">{lastScanResult.reason}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-400 bg-white">
              <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">Awaiting Next Scan</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Scan result, user credentials, and timestamp will render here instantly.
              </p>
            </div>
          )}

          {/* Recent Scans Feed */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center justify-between">
              <span>Station Scan Activity</span>
              <span className="font-mono text-[10px] text-slate-400">
                {recentScans.length} scans
              </span>
            </h4>

            {recentScans.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No scans during this session yet.</p>
            ) : (
              <div className="space-y-2">
                {recentScans.map((sc, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          sc.success ? 'bg-emerald-500' : 'bg-red-500'
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate">
                          {sc.user?.full_name || 'Unrecognized Credential'}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {sc.user?.user_identifier || sc.reason || 'Unknown'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                          sc.success ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {sc.success ? sc.record?.attendance_status || 'OK' : 'Rejected'}
                      </span>
                      <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                        {sc.timestamp ? new Date(sc.timestamp).toLocaleTimeString() : 'Just now'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
