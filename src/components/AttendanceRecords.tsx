import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  Calendar,
  Clock,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  History,
  X,
  FileText,
} from 'lucide-react';
import { AttendanceRecord, UserProfile, AttendanceSession } from '../types';
import { api } from '../lib/api';

interface AttendanceRecordsProps {
  records: AttendanceRecord[];
  users: UserProfile[];
  sessions: AttendanceSession[];
  onRefreshRecords: () => void;
  operatorName: string;
}

export const AttendanceRecords: React.FC<AttendanceRecordsProps> = ({
  records,
  users,
  sessions,
  onRefreshRecords,
  operatorName,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sessionFilter, setSessionFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  // Correction Modal State
  const [correctionRecord, setCorrectionRecord] = useState<AttendanceRecord | null>(null);
  const [newStatus, setNewStatus] = useState<string>('present');
  const [newCheckInTime, setNewCheckInTime] = useState<string>('');
  const [newCheckOutTime, setNewCheckOutTime] = useState<string>('');
  const [correctionReason, setCorrectionReason] = useState<string>('');
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);

  // User History Drawer Modal
  const [historyUser, setHistoryUser] = useState<UserProfile | null>(null);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const user = r.user;
      const userName = user?.full_name?.toLowerCase() || '';
      const userId = user?.user_identifier?.toLowerCase() || '';
      const dept = user?.department?.toLowerCase() || '';
      const query = searchTerm.toLowerCase();

      const matchesSearch = userName.includes(query) || userId.includes(query) || dept.includes(query);
      const matchesStatus = statusFilter === 'all' || r.attendance_status === statusFilter;
      const matchesSession = sessionFilter === 'all' || r.session_id === sessionFilter;

      let matchesDate = true;
      if (dateFilter) {
        const recordDate = r.check_in_at ? r.check_in_at.split('T')[0] : '';
        matchesDate = recordDate === dateFilter;
      }

      return matchesSearch && matchesStatus && matchesSession && matchesDate;
    });
  }, [records, searchTerm, statusFilter, sessionFilter, dateFilter]);

  // Open correction modal
  const openCorrectionModal = (record: AttendanceRecord) => {
    setCorrectionRecord(record);
    setNewStatus(record.attendance_status);
    setNewCheckInTime(record.check_in_at ? new Date(record.check_in_at).toTimeString().slice(0, 5) : '08:00');
    setNewCheckOutTime(record.check_out_at ? new Date(record.check_out_at).toTimeString().slice(0, 5) : '');
    setCorrectionReason('');
  };

  // Submit correction
  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionRecord || !correctionReason.trim()) return;

    setIsSubmittingCorrection(true);
    try {
      // Reconstruct ISO strings if time updated
      const baseDate = correctionRecord.check_in_at.split('T')[0];
      const updatedCheckInIso = `${baseDate}T${newCheckInTime}:00.000Z`;
      const updatedCheckOutIso = newCheckOutTime ? `${baseDate}T${newCheckOutTime}:00.000Z` : null;

      await api.correctAttendance(correctionRecord.id, {
        attendance_status: newStatus,
        check_in_at: updatedCheckInIso,
        check_out_at: updatedCheckOutIso,
        reason: correctionReason.trim(),
        performed_by: operatorName || 'Admin',
      });

      setCorrectionRecord(null);
      onRefreshRecords();
    } catch (err: any) {
      alert(`Correction failed: ${err.message}`);
    } finally {
      setIsSubmittingCorrection(false);
    }
  };

  // Export records to CSV
  const handleExportCsv = () => {
    const headers = [
      'Record ID',
      'Full Name',
      'Student/Employee ID',
      'Department',
      'Session',
      'Attendance Date',
      'Check-In Time',
      'Check-Out Time',
      'Status',
      'Recorded By',
    ];

    const rows = filteredRecords.map((r) => {
      const checkInDate = new Date(r.check_in_at);
      const checkOutDate = r.check_out_at ? new Date(r.check_out_at) : null;
      return [
        r.id,
        `"${r.user?.full_name || 'N/A'}"`,
        r.user?.user_identifier || 'N/A',
        `"${r.user?.department || 'N/A'}"`,
        `"${r.session?.session_name || 'N/A'}"`,
        checkInDate.toISOString().split('T')[0],
        checkInDate.toLocaleTimeString(),
        checkOutDate ? checkOutDate.toLocaleTimeString() : 'N/A',
        r.attendance_status.toUpperCase(),
        `"${r.recorded_by}"`,
      ].join(',');
    });

    const csvString = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Attendance_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // User's full attendance history
  const userHistoryRecords = useMemo(() => {
    if (!historyUser) return [];
    return records.filter((r) => r.user_id === historyUser.id);
  }, [records, historyUser]);

  return (
    <div className="space-y-6">
      {/* Search & Filter Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Input */}
          <div className="relative min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search user, ID, department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg w-full bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          {/* Date Picker */}
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 focus:outline-none"
          />

          {/* Session Filter */}
          <select
            value={sessionFilter}
            onChange={(e) => setSessionFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 focus:outline-none"
          >
            <option value="all">All Sessions</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.session_name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="present">Present (On-Time)</option>
            <option value="late">Late Arrival</option>
            <option value="checked_out">Checked Out</option>
            <option value="excused">Excused</option>
          </select>

          {dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Clear Date
            </button>
          )}
        </div>

        {/* Export Button */}
        <button
          onClick={handleExportCsv}
          disabled={filteredRecords.length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-xs disabled:opacity-50 shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV ({filteredRecords.length})
        </button>
      </div>

      {/* Attendance Records Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Official Attendance Records</h3>
            <p className="text-xs text-slate-500">
              Verified records with immutable check-in timestamps and audit trail
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Total Records: {filteredRecords.length}
          </span>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <p className="text-sm font-medium">No attendance logs found matching the filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">User & ID</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Session</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Check-In</th>
                  <th className="px-4 py-3">Check-Out</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Scanner Station</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((r) => {
                  const checkIn = new Date(r.check_in_at);
                  const checkOut = r.check_out_at ? new Date(r.check_out_at) : null;
                  const dateStr = checkIn.toISOString().split('T')[0];

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {r.user?.profile_photo_url ? (
                            <img
                              src={r.user.profile_photo_url}
                              alt={r.user.full_name}
                              className="w-7 h-7 rounded-full object-cover shrink-0"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center font-bold text-[10px] text-slate-700 shrink-0">
                              {r.user?.full_name ? r.user.full_name[0] : 'U'}
                            </div>
                          )}
                          <div>
                            <button
                              onClick={() => r.user && setHistoryUser(r.user)}
                              className="font-bold text-slate-900 hover:text-blue-600 transition-colors text-left"
                            >
                              {r.user?.full_name || 'Unknown'}
                            </button>
                            <p className="font-mono text-[10px] text-blue-700 font-semibold">
                              {r.user?.user_identifier}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-[140px] truncate">
                        {r.user?.department || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-medium max-w-[150px] truncate">
                        {r.session?.session_name || '—'}
                      </td>
                      <td className="px-4 py-3 font-mono tabular-nums text-slate-600">
                        {dateStr}
                      </td>
                      <td className="px-4 py-3 font-mono tabular-nums font-semibold text-slate-900">
                        {checkIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 font-mono tabular-nums text-slate-600">
                        {checkOut
                          ? checkOut.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-semibold uppercase text-[10px] px-2 py-0.5 rounded ${
                            r.attendance_status === 'present'
                              ? 'bg-emerald-100 text-emerald-800'
                              : r.attendance_status === 'late'
                              ? 'bg-amber-100 text-amber-800'
                              : r.attendance_status === 'checked_out'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {r.attendance_status === 'checked_out' ? 'Checked Out' : r.attendance_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-[11px]">
                        {r.recorded_by}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openCorrectionModal(r)}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors"
                            title="Manual Correction (Audited)"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {r.user && (
                            <button
                              onClick={() => setHistoryUser(r.user!)}
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                              title="View User Attendance History"
                            >
                              <History className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: MANUAL ATTENDANCE CORRECTION WITH AUDIT TRAIL */}
      {correctionRecord && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Manual Attendance Correction</h3>
              </div>
              <button
                onClick={() => setCorrectionRecord(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Corrections require an audit justification and are permanently logged to the immutable audit trail.
            </p>

            <form onSubmit={handleCorrectionSubmit} className="space-y-3.5">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <p className="font-bold text-slate-900">{correctionRecord.user?.full_name}</p>
                <p className="font-mono text-slate-500">{correctionRecord.user?.user_identifier}</p>
                <p className="text-slate-400 text-[11px] mt-1">{correctionRecord.session?.session_name}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Adjust Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                >
                  <option value="present">Present (On-Time)</option>
                  <option value="late">Late Arrival</option>
                  <option value="checked_out">Checked Out</option>
                  <option value="excused">Excused Absence</option>
                  <option value="absent">Marked Absent</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Check-In Time
                  </label>
                  <input
                    type="time"
                    required
                    value={newCheckInTime}
                    onChange={(e) => setNewCheckInTime(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Check-Out Time (Optional)
                  </label>
                  <input
                    type="time"
                    value={newCheckOutTime}
                    onChange={(e) => setNewCheckOutTime(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mandatory Audit Reason *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Scanner glitch at Gate 2, student showed proof of physical arrival at 08:02 AM."
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCorrectionRecord(null)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCorrection || !correctionReason.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors disabled:opacity-50"
                >
                  {isSubmittingCorrection ? 'Logging Correction...' : 'Apply Correction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DRAWER / MODAL: INDIVIDUAL ATTENDANCE HISTORY */}
      {historyUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-3">
                {historyUser.profile_photo_url ? (
                  <img
                    src={historyUser.profile_photo_url}
                    alt={historyUser.full_name}
                    className="w-10 h-10 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-sm text-slate-700">
                    {historyUser.full_name[0]}
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{historyUser.full_name}</h3>
                  <p className="font-mono text-xs text-blue-700 font-semibold">{historyUser.user_identifier}</p>
                </div>
              </div>
              <button
                onClick={() => setHistoryUser(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-3 flex-1 overflow-y-auto space-y-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Individual Attendance Log ({userHistoryRecords.length} records)
              </h4>

              {userHistoryRecords.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No historical records for this user.</p>
              ) : (
                userHistoryRecords.map((hr) => {
                  const cin = new Date(hr.check_in_at);
                  const cout = hr.check_out_at ? new Date(hr.check_out_at) : null;
                  return (
                    <div
                      key={hr.id}
                      className="p-3 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-800">{hr.session?.session_name || 'Session'}</p>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                          In: {cin.toLocaleTimeString()} · Out: {cout ? cout.toLocaleTimeString() : '—'}
                        </p>
                      </div>
                      <span
                        className={`font-semibold uppercase text-[10px] px-2 py-0.5 rounded ${
                          hr.attendance_status === 'present'
                            ? 'bg-emerald-100 text-emerald-800'
                            : hr.attendance_status === 'late'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {hr.attendance_status}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setHistoryUser(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold rounded-lg transition-colors"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
