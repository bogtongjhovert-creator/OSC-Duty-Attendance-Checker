import React, { useState } from 'react';
import { ShieldAlert, Search, History, Clock, UserCheck, AlertCircle } from 'lucide-react';
import { AuditLog } from '../types';

interface AuditLogsViewProps {
  logs: AuditLog[];
  onRefreshLogs: () => void;
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ logs, onRefreshLogs }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = logs.filter((log) => {
    const q = searchTerm.toLowerCase();
    const action = log.action.toLowerCase();
    const performed = log.performed_by.toLowerCase();
    return action.includes(q) || performed.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Attendance Audit Trail</h3>
          <p className="text-xs text-slate-500">
            Immutable system logs recording credential revocations, check-in scans, and administrative manual corrections
          </p>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search action or operator..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg w-full bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">No audit entries found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Action Type</th>
                  <th className="px-4 py-3">Performed By</th>
                  <th className="px-4 py-3">Previous State</th>
                  <th className="px-4 py-3">Updated Values</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => {
                  const logDate = new Date(log.created_at);
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                        {logDate.toLocaleString([], {
                          year: 'numeric',
                          month: 'short',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-mono uppercase text-[10px] font-bold px-2 py-0.5 rounded ${
                            log.action === 'manual_correction'
                              ? 'bg-amber-100 text-amber-800'
                              : log.action.includes('revoke')
                              ? 'bg-red-100 text-red-800'
                              : log.action === 'check_in' || log.action === 'check_out'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{log.performed_by}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-500 max-w-[200px] truncate">
                        {log.previous_values ? JSON.stringify(log.previous_values) : '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-700 max-w-[260px] truncate">
                        {log.updated_values ? JSON.stringify(log.updated_values) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
