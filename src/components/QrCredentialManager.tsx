import React, { useState, useMemo } from 'react';
import {
  QrCode,
  ShieldCheck,
  ShieldAlert,
  Printer,
  RefreshCw,
  Search,
  Filter,
  Download,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { UserProfile, SystemSettings } from '../types';
import { QrCodeCard } from './QrCodeCard';
import { api } from '../lib/api';

interface QrCredentialManagerProps {
  users: UserProfile[];
  settings: SystemSettings | null;
  onRefreshUsers: () => void;
  operatorName: string;
}

export const QrCredentialManager: React.FC<QrCredentialManagerProps> = ({
  users,
  settings,
  onRefreshUsers,
  operatorName,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [isBatchPrintView, setIsBatchPrintView] = useState(false);

  const departments = useMemo(() => {
    return Array.from(new Set(users.map((u) => u.department).filter(Boolean)));
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.user_identifier.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDept = departmentFilter === 'all' || u.department === departmentFilter;
      return matchSearch && matchDept;
    });
  }, [users, searchTerm, departmentFilter]);

  const activeCredsCount = users.filter((u) => u.qr_credential?.credential_status === 'active').length;
  const revokedCredsCount = users.filter((u) => u.qr_credential?.credential_status === 'revoked').length;

  const handleRegenerate = async (userId: string) => {
    if (!confirm('Issue a new QR Token? The old credential will be revoked immediately.')) return;
    try {
      const res = await api.regenerateQr(userId, operatorName);
      if (selectedUser?.id === userId) {
        setSelectedUser(res.user);
      }
      onRefreshUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRevoke = async (userId: string) => {
    if (!confirm('Revoke this QR credential? The user cannot authenticate until re-issued.')) return;
    try {
      const res = await api.revokeQr(userId, operatorName);
      if (selectedUser?.id === userId) {
        setSelectedUser(res.user);
      }
      onRefreshUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Security Architecture Notice */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 flex items-start gap-3 no-print">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-sm">Cryptographic QR Security Standard</h4>
          <p className="mt-0.5 text-blue-800">
            QR codes do not contain passwords, raw biometric hashes, or unrestricted admin privileges.
            Each pass encodes a revocable random cryptographic token reference (<code className="font-mono bg-blue-100 px-1 py-0.5 rounded">QRC-XXXX</code>)
            validated on the centralized server. If an ID badge is lost or compromised, the administrator can revoke it with a single click.
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search user or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg w-full bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 focus:outline-none"
          >
            <option value="all">All Departments ({users.length})</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <span className="text-xs text-slate-500 font-medium ml-2">
            <span className="text-emerald-700 font-bold">{activeCredsCount}</span> Active ·{' '}
            <span className="text-amber-700 font-bold">{revokedCredsCount}</span> Revoked
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBatchPrintView(!isBatchPrintView)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors shadow-xs ${
              isBatchPrintView
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            {isBatchPrintView ? 'Exit Batch Card Sheet' : 'Batch Printable Cards'}
          </button>

          {isBatchPrintView && (
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Sheet Now
            </button>
          )}
        </div>
      </div>

      {/* VIEW A: Batch Card Sheet for printing all cards */}
      {isBatchPrintView ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((u) => (
            <div key={u.id} className="p-2 bg-white rounded-xl shadow-xs border border-slate-200">
              <QrCodeCard
                user={u}
                settings={settings}
                showAdminActions={false}
              />
            </div>
          ))}
        </div>
      ) : (
        /* VIEW B: Two-Column Card Previewer & Directory */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* User selector list (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Registered Passholders ({filteredUsers.length})
              </h4>
            </div>

            <div className="divide-y divide-slate-100 max-h-[620px] overflow-y-auto">
              {filteredUsers.map((u) => {
                const cred = u.qr_credential;
                const isRevoked = cred?.credential_status === 'revoked';
                const isSelected = selectedUser?.id === u.id;

                return (
                  <div
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-50/80 border-l-4 border-blue-600'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {u.profile_photo_url ? (
                        <img
                          src={u.profile_photo_url}
                          alt={u.full_name}
                          className="w-9 h-9 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
                          {u.full_name[0]}
                        </div>
                      )}

                      <div>
                        <p className="font-bold text-slate-900 text-xs">{u.full_name}</p>
                        <p className="text-[10px] font-mono text-blue-700 font-semibold">
                          {u.user_identifier} · {u.department}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                          isRevoked
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isRevoked ? 'REVOKED' : 'ACTIVE'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Individual ID Card Inspector (5 cols) */}
          <div className="lg:col-span-5 sticky top-6">
            {selectedUser ? (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-xs">
                <div className="flex items-center justify-between mb-3 px-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Live Credential Badge
                  </h4>
                  <span className="text-[11px] font-mono text-slate-400">
                    ID: {selectedUser.user_identifier}
                  </span>
                </div>

                <QrCodeCard
                  user={selectedUser}
                  settings={settings}
                  showAdminActions={true}
                  onRegenerate={() => handleRegenerate(selectedUser.id)}
                  onRevoke={() => handleRevoke(selectedUser.id)}
                />
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-400 bg-white">
                <QrCode className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <h4 className="text-xs font-bold text-slate-600">Select an Account</h4>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                  Click on any user from the directory to inspect their verifiable credential card, print their badge, or regenerate their token.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
