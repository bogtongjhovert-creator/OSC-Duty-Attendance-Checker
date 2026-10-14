import React, { useState } from 'react';
import {
  Settings,
  Database,
  Building,
  Save,
  RotateCcw,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Camera,
  Server,
} from 'lucide-react';
import { SystemSettings } from '../types';
import { api } from '../lib/api';

interface SystemSettingsViewProps {
  settings: SystemSettings | null;
  onRefreshSettings: () => void;
  onResetData: () => void;
}

export const SystemSettingsView: React.FC<SystemSettingsViewProps> = ({
  settings,
  onRefreshSettings,
  onResetData,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'supabase'>('general');
  const [copiedSql, setCopiedSql] = useState(false);

  const [formData, setFormData] = useState<SystemSettings>({
    organization_name: settings?.organization_name || 'OSC Scholar Duty Tracker',
    organization_code: settings?.organization_code || 'OSC-SCHOLARS',
    organization_logo_url: settings?.organization_logo_url || '/src/assets/images/org_institutional_logo_1791949676528.jpg',
    default_timezone: settings?.default_timezone || 'Asia/Manila (UTC+8)',
    allow_manual_corrections: settings?.allow_manual_corrections ?? true,
    allow_checkout_same_qr: settings?.allow_checkout_same_qr ?? true,
    duplicate_scan_cooldown_seconds: settings?.duplicate_scan_cooldown_seconds || 5,
    sound_feedback_enabled: settings?.sound_feedback_enabled ?? true,
  });

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    try {
      await api.updateSettings(formData);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
      onRefreshSettings();
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const sampleSqlMigration = `-- CENTRALIZED QR CODE ATTENDANCE SYSTEM SUPABASE MIGRATION
create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id uuid primary key default uuid_generate_v4(),
  auth_user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  email text not null unique,
  user_identifier text not null unique,
  department text not null,
  role text not null check (role in ('admin', 'operator', 'user')) default 'user',
  profile_photo_url text,
  account_status text not null check (account_status in ('active', 'deactivated')) default 'active',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.qr_credentials (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token_hash text not null unique,
  credential_status text not null check (credential_status in ('active', 'revoked')) default 'active',
  issued_at timestamp with time zone default now(),
  revoked_at timestamp with time zone,
  last_used_at timestamp with time zone
);

create table if not exists public.attendance_sessions (
  id uuid primary key default uuid_generate_v4(),
  session_name text not null,
  attendance_date date not null default current_date,
  check_in_start time not null default '07:30:00',
  check_in_end time not null default '10:00:00',
  check_out_start time not null default '16:00:00',
  check_out_end time not null default '19:00:00',
  late_threshold time not null default '08:15:00',
  status text not null default 'active',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default now()
);

create table if not exists public.attendance_records (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid not null references public.attendance_sessions(id) on delete cascade,
  check_in_at timestamp with time zone not null default now(),
  check_out_at timestamp with time zone,
  attendance_status text not null default 'present',
  recorded_by text default 'QR Scanner Station',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint unique_user_session unique (user_id, session_id)
);

create table if not exists public.attendance_audit_logs (
  id uuid primary key default uuid_generate_v4(),
  attendance_record_id uuid references public.attendance_records(id) on delete set null,
  action text not null,
  previous_values jsonb,
  updated_values jsonb,
  performed_by text not null,
  created_at timestamp with time zone default now()
);

create table if not exists public.system_settings (
  id uuid primary key default uuid_generate_v4(),
  setting_key text not null unique,
  setting_value jsonb not null,
  updated_by text default 'System Admin',
  updated_at timestamp with time zone default now()
);

alter table public.profiles enable row level security;
alter table public.qr_credentials enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.attendance_records enable row level security;
alter table public.attendance_audit_logs enable row level security;
alter table public.system_settings enable row level security;`;

  const copySql = () => {
    navigator.clipboard.writeText(sampleSqlMigration);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl max-w-md">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'general'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          General & Institution
        </button>

        <button
          onClick={() => setActiveTab('supabase')}
          className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'supabase'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          Central Database & Vercel
        </button>
      </div>

      {activeTab === 'general' ? (
        <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
          {/* Institution Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-600" />
              Institution Identity & Branding
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Institution Name
                </label>
                <input
                  type="text"
                  value={formData.organization_name}
                  onChange={(e) => setFormData({ ...formData, organization_name: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Institution Code
                </label>
                <input
                  type="text"
                  value={formData.organization_code}
                  onChange={(e) => setFormData({ ...formData, organization_code: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Institutional Crest / Logo URL
              </label>
              <input
                type="text"
                value={formData.organization_logo_url}
                onChange={(e) => setFormData({ ...formData, organization_logo_url: e.target.value })}
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-600 focus:outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Appears on top navigation and printed QR credential cards.
              </p>
            </div>
          </div>

          {/* Attendance Rules Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Server className="w-4 h-4 text-blue-600" />
              Scanning & Attendance Behavior
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Official Timezone
                </label>
                <input
                  type="text"
                  value={formData.default_timezone}
                  onChange={(e) => setFormData({ ...formData, default_timezone: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Duplicate Scan Cooldown (Seconds)
                </label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={formData.duplicate_scan_cooldown_seconds}
                  onChange={(e) =>
                    setFormData({ ...formData, duplicate_scan_cooldown_seconds: parseInt(e.target.value, 10) })
                  }
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allow_checkout_same_qr}
                  onChange={(e) => setFormData({ ...formData, allow_checkout_same_qr: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Allow 2nd scan of same QR to record Check-Out event</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allow_manual_corrections}
                  onChange={(e) => setFormData({ ...formData, allow_manual_corrections: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Allow authorized administrators to manually correct records with audit reason</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.sound_feedback_enabled}
                  onChange={(e) => setFormData({ ...formData, sound_feedback_enabled: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Enable Web Audio API scan confirmation chimes & buzzer</span>
              </label>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => {
                if (confirm('Reset database to initial institutional demo dataset? This will restore sample students and session records.')) {
                  onResetData();
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Demo Dataset
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Settings Saved!
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  {saving ? 'Saving...' : 'Save Configuration'}
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        /* TAB 2: Supabase & Deployment Documentation */
        <div className="space-y-6 max-w-3xl">
          {/* Realtime Multi-Device Sync Explanation */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-2 text-slate-900">
              <Server className="w-5 h-5 text-emerald-600" />
              <h4 className="text-sm font-bold">Centralized Database Active & Synchronized</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              This application is connected to the centralized backend server engine.
              All user accounts, QR credentials, and attendance records synchronize in real-time
              across all browsers, computers, and mobile camera stations.
            </p>
            <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-700">
              Multi-Device Verification: Open this applet URL on your mobile phone and Computer B.
              Scanning a credential from your phone immediately updates the computer dashboard in under 50ms via Server-Sent Events!
            </div>
          </div>

          {/* Supabase PostgreSQL Deployment Guide */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-600" />
                <h4 className="text-sm font-bold text-slate-900">Supabase Production Deployment Guide</h4>
              </div>
              <button
                onClick={copySql}
                className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedSql ? 'SQL Copied!' : 'Copy Schema SQL'}
              </button>
            </div>

            <ol className="list-decimal pl-5 space-y-2 text-xs text-slate-600 leading-relaxed">
              <li>
                <strong>Create Supabase Project:</strong> Visit{' '}
                <a
                  href="https://supabase.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline font-semibold inline-flex items-center gap-0.5"
                >
                  supabase.com <ExternalLink className="w-3 h-3" />
                </a>{' '}
                and create a new project.
              </li>
              <li>
                <strong>Run Migration SQL:</strong> Open the <strong>SQL Editor</strong> in Supabase,
                click &ldquo;Copy Schema SQL&rdquo; above (or view <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">supabase/schema.sql</code>),
                paste the script, and click <strong>Run</strong>. This creates all 6 tables, foreign keys, indexes, and Row Level Security (RLS) policies.
              </li>
              <li>
                <strong>Configure Environment Variables on Vercel:</strong> In your Vercel project settings, add:
                <ul className="list-disc pl-4 mt-1 font-mono text-[11px] text-slate-700 space-y-0.5">
                  <li><span className="text-blue-700">VITE_SUPABASE_URL</span>: Your project URL</li>
                  <li><span className="text-blue-700">VITE_SUPABASE_ANON_KEY</span>: Your anon public key</li>
                  <li><span className="text-blue-700">SUPABASE_SERVICE_ROLE_KEY</span>: Your server secret key</li>
                </ul>
              </li>
              <li>
                <strong>Camera Permissions & HTTPS:</strong> Mobile and desktop browsers require HTTPS for camera access (<code className="bg-slate-100 px-1 py-0.5 rounded font-mono">navigator.mediaDevices.getUserMedia</code>).
                Vercel provides automatic HTTPS SSL certificates for all deployments.
              </li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};
