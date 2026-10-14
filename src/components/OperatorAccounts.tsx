import React, { useState } from 'react';
import { Shield, UserPlus, Check, X, ShieldAlert, KeyRound, QrCode } from 'lucide-react';
import { UserProfile } from '../types';
import { api } from '../lib/api';

interface OperatorAccountsProps {
  users: UserProfile[];
  onRefreshUsers: () => void;
}

export const OperatorAccounts: React.FC<OperatorAccountsProps> = ({ users, onRefreshUsers }) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [stationName, setStationName] = useState('Campus Main Entrance');

  const operators = users.filter((u) => u.role === 'operator' || u.role === 'admin');
  const eligibleUsers = users.filter((u) => u.role === 'user' && u.account_status === 'active');

  const handlePromoteToOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;

    try {
      await api.updateUser(selectedUserId, { role: 'operator' });
      setIsAddOpen(false);
      setSelectedUserId('');
      onRefreshUsers();
    } catch (err: any) {
      alert(`Promotion failed: ${err.message}`);
    }
  };

  const handleDemoteToUser = async (user: UserProfile) => {
    if (user.role === 'admin') {
      alert('Cannot demote root administrator.');
      return;
    }
    if (!confirm(`Revoke operator scanner clearance for ${user.full_name}?`)) return;

    try {
      await api.updateUser(user.id, { role: 'user' });
      onRefreshUsers();
    } catch (err: any) {
      alert(`Demotion failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Authorized Attendance Operators</h3>
          <p className="text-xs text-slate-500">
            Personnel with authorized device clearance to operate the camera scanner and record attendance
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-xs"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Authorize Operator
        </button>
      </div>

      {/* Operators Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {operators.map((op) => {
          const isAdmin = op.role === 'admin';
          return (
            <div
              key={op.id}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      isAdmin ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {isAdmin ? 'System Admin' : 'Scanner Operator'}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    ID: {op.user_identifier}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {op.profile_photo_url ? (
                    <img
                      src={op.profile_photo_url}
                      alt={op.full_name}
                      className="w-10 h-10 rounded-full object-cover shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
                      {op.full_name[0]}
                    </div>
                  )}
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{op.full_name}</h4>
                    <p className="text-[11px] text-slate-500 truncate max-w-[180px]">{op.email}</p>
                    <p className="text-[10px] text-slate-400">{op.department}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 text-[11px]">
                  Scanner Access: <span className="font-semibold text-emerald-600">Active</span>
                </span>
                {!isAdmin && (
                  <button
                    onClick={() => handleDemoteToUser(op)}
                    className="text-[11px] text-red-600 hover:text-red-800 font-medium hover:underline"
                  >
                    Revoke Access
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: AUTHORIZE OPERATOR */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-slate-900">Authorize Scanner Operator</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Promote an existing staff or faculty member to operate attendance scanning stations.
            </p>

            <form onSubmit={handlePromoteToOperator} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select User Account
                </label>
                <select
                  required
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                >
                  <option value="">-- Choose registered account --</option>
                  {eligibleUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.user_identifier}) - {u.department}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assigned Scanner Station Location
                </label>
                <input
                  type="text"
                  value={stationName}
                  onChange={(e) => setStationName(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                  placeholder="e.g. Science Complex Gate 1"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-3 py-2 text-xs font-medium text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedUserId}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors disabled:opacity-50"
                >
                  Authorize Operator
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
