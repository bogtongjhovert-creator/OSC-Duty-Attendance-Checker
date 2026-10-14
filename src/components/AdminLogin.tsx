import React, { useState } from 'react';
import {
  Lock,
  Shield,
  Eye,
  EyeOff,
  AlertCircle,
  KeyRound,
  ArrowRight,
  ArrowLeft,
  Building,
  CheckCircle2,
} from 'lucide-react';
import { SystemSettings, UserProfile } from '../types';
import { api } from '../lib/api';

interface AdminLoginProps {
  settings: SystemSettings | null;
  onLoginSuccess: (user: UserProfile, token: string) => void;
  onCancel: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  settings,
  onLoginSuccess,
  onCancel,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const orgName = settings?.organization_name || 'OSC Scholar Duty Tracker';
  const orgLogo = settings?.organization_logo_url || '/src/assets/images/org_institutional_logo_1791949676528.jpg';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setError('Please provide your admin email/ID and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.loginAdmin({
        identifier: identifier.trim(),
        password: password.trim(),
      });

      if (res.success && res.token && res.user) {
        onLoginSuccess(res.user, res.token);
      } else {
        setError('Authentication was not granted.');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid credentials or access denied.');
    } finally {
      setLoading(false);
    }
  };

  const autofillAdmin = () => {
    setIdentifier('bogtong.jhovert@panpacificu.edu.ph');
    setPassword('admin2026!');
    setError(null);
  };

  const autofillOperator = () => {
    setIdentifier('elena.santos@panpacificu.edu.ph');
    setPassword('operator2026!');
    setError(null);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden text-slate-900">
        {/* Header Ribbon */}
        <div className="bg-slate-900 text-white p-6 text-center relative">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-white p-1 ring-4 ring-slate-800 shadow-md">
            <img
              src={orgLogo}
              alt="Institutional Crest"
              className="w-full h-full object-cover rounded-full"
              referrerPolicy="no-referrer"
            />
          </div>

          <h2 className="text-base font-bold tracking-tight text-white">{orgName}</h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Scholar Duty Administration Gateway
          </p>

          <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-slate-800/90 text-blue-300 text-[11px] font-mono border border-slate-700">
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            Restricted Security Access
          </div>
        </div>

        {/* Login Form Body */}
        <div className="p-6 sm:p-8">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Authentication Failed</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Admin Email or Employee ID
              </label>
              <input
                type="text"
                required
                placeholder="e.g. bogtong.jhovert@panpacificu.edu.ph"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Security Password
                </label>
                <span className="text-[10px] text-slate-400 font-mono">Case-sensitive</span>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter administrator password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-xl pl-3.5 pr-10 py-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Verifying Security Clearance...
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  Authenticate &amp; Access Admin
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Autofill */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[11px] text-slate-500 font-semibold mb-2">
              Demonstration &amp; Evaluation Credentials:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={autofillAdmin}
                className="p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50/70 hover:border-blue-300 text-left transition-colors"
              >
                <p className="font-bold text-slate-900 text-[11px]">Root Administrator</p>
                <p className="text-[10px] font-mono text-slate-500 truncate">Password: admin2026!</p>
              </button>

              <button
                type="button"
                onClick={autofillOperator}
                className="p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50/70 hover:border-blue-300 text-left transition-colors"
              >
                <p className="font-bold text-slate-900 text-[11px]">Scanner Operator</p>
                <p className="text-[10px] font-mono text-slate-500 truncate">Password: operator2026!</p>
              </button>
            </div>
          </div>

          {/* Back button */}
          <div className="mt-5 text-center">
            <button
              onClick={onCancel}
              className="text-xs text-slate-500 hover:text-slate-800 font-semibold inline-flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Return to Passholder Portal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
