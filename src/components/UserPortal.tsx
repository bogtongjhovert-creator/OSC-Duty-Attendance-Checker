import React, { useState, useMemo } from 'react';
import {
  User,
  QrCode,
  Calendar,
  Clock,
  Download,
  Printer,
  ShieldCheck,
  CheckCircle,
  Building,
  Mail,
  ChevronDown,
} from 'lucide-react';
import { UserProfile, AttendanceRecord, SystemSettings } from '../types';
import { QrCodeCard } from './QrCodeCard';

interface UserPortalProps {
  currentUser: UserProfile;
  allUsers: UserProfile[];
  records: AttendanceRecord[];
  settings: SystemSettings | null;
  onSwitchUser: (user: UserProfile) => void;
}

export const UserPortal: React.FC<UserPortalProps> = ({
  currentUser,
  allUsers,
  records,
  settings,
  onSwitchUser,
}) => {
  const [activeTab, setActiveTab] = useState<'pass' | 'history'>('pass');

  // Filter records to ONLY current user
  const personalRecords = useMemo(() => {
    return records.filter((r) => r.user_id === currentUser.id);
  }, [records, currentUser.id]);

  const regularUsers = allUsers.filter((u) => u.role === 'user');

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Profile Strip */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {currentUser.profile_photo_url ? (
            <img
              src={currentUser.profile_photo_url}
              alt={currentUser.full_name}
              className="w-14 h-14 rounded-full object-cover border-2 border-slate-100 shadow-xs"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 font-bold text-lg flex items-center justify-center border-2 border-slate-100 shadow-xs">
              {currentUser.full_name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">{currentUser.full_name}</h2>
              <span className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                {currentUser.role}
              </span>
            </div>
            <p className="font-mono text-xs font-semibold text-blue-700 mt-0.5">
              {currentUser.user_identifier}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {currentUser.department} · {currentUser.email}
            </p>
          </div>
        </div>

        {/* Demo User Switcher Dropdown */}
        <div className="shrink-0 flex items-center gap-2 bg-slate-50 border border-slate-200 p-2 rounded-xl text-xs">
          <span className="text-slate-500 font-medium">Switch Passholder:</span>
          <select
            value={currentUser.id}
            onChange={(e) => {
              const target = allUsers.find((u) => u.id === e.target.value);
              if (target) onSwitchUser(target);
            }}
            className="bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-1 font-semibold focus:outline-none"
          >
            {allUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name} ({u.user_identifier}) - {u.role}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveTab('pass')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'pass'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <QrCode className="w-4 h-4" />
          My QR Credential Pass
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'history'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4" />
          My Attendance History ({personalRecords.length})
        </button>
      </div>

      {/* Tab 1: QR Pass */}
      {activeTab === 'pass' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <div className="md:col-span-6 flex justify-center">
            <QrCodeCard
              user={currentUser}
              settings={settings}
              showAdminActions={false}
            />
          </div>

          <div className="md:col-span-6 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
              <h4 className="text-sm font-bold text-slate-900">How to use your pass</h4>
              <ol className="list-decimal pl-4 space-y-2 text-xs text-slate-600 leading-relaxed">
                <li>
                  Present this QR credential directly from your mobile screen or print it as a physical ID badge.
                </li>
                <li>
                  Hold the QR code steady in front of the camera scanner at campus entrance stations or lecture hall doors.
                </li>
                <li>
                  Wait for the green chime confirmation. Your check-in time will be recorded instantly on the university attendance cloud.
                </li>
                <li>
                  Scan again when leaving during the designated check-out window to log your departure time.
                </li>
              </ol>
            </div>

            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-slate-900">Security & Privacy Assurance</p>
              <p className="text-[11px] text-slate-500">
                Your QR credential encodes a secure cryptographic token and does not transmit confidential personal records.
                Only authorized attendance operators and administrators can access verification logs.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Personal Attendance History */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">My Attendance Log</h3>
              <p className="text-xs text-slate-500">
                Personal timestamp records for {currentUser.full_name}
              </p>
            </div>
            <span className="font-mono text-xs font-semibold text-slate-500">
              Total Logged: {personalRecords.length}
            </span>
          </div>

          {personalRecords.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No attendance records recorded yet. Visit a scanning station to log your first check-in!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Session / Event</th>
                    <th className="px-4 py-3">Check-In Time</th>
                    <th className="px-4 py-3">Check-Out Time</th>
                    <th className="px-4 py-3">Recorded Status</th>
                    <th className="px-4 py-3">Station</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {personalRecords.map((r) => {
                    const cin = new Date(r.check_in_at);
                    const cout = r.check_out_at ? new Date(r.check_out_at) : null;
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono tabular-nums text-slate-700">
                          {cin.toISOString().split('T')[0]}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {r.session?.session_name || 'General Session'}
                        </td>
                        <td className="px-4 py-3 font-mono tabular-nums font-semibold text-slate-900">
                          {cin.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3 font-mono tabular-nums text-slate-600">
                          {cout ? cout.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`font-semibold uppercase text-[10px] px-2 py-0.5 rounded ${
                              r.attendance_status === 'present'
                                ? 'bg-emerald-100 text-emerald-800'
                                : r.attendance_status === 'late'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {r.attendance_status === 'checked_out' ? 'Checked Out' : r.attendance_status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-[11px]">{r.recorded_by}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
