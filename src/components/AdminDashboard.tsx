import React, { useState, useMemo } from 'react';
import {
  Users,
  CheckCircle,
  Clock,
  UserX,
  TrendingUp,
  Search,
  Filter,
  Calendar,
  ShieldCheck,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { UserProfile, AttendanceRecord, AttendanceSession } from '../types';

interface AdminDashboardProps {
  users: UserProfile[];
  records: AttendanceRecord[];
  sessions: AttendanceSession[];
  onNavigateToTab: (tab: string) => void;
  onOpenUserModal: (user: UserProfile) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  users,
  records,
  sessions,
  onNavigateToTab,
  onOpenUserModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const todayStr = new Date().toISOString().split('T')[0];

  // Compute metrics for today
  const todayRecords = useMemo(() => {
    return records.filter((r) => {
      const recordDate = r.check_in_at ? r.check_in_at.split('T')[0] : '';
      return recordDate === todayStr;
    });
  }, [records, todayStr]);

  const activeUsersCount = useMemo(() => {
    return users.filter((u) => u.account_status === 'active').length;
  }, [users]);

  const presentCount = useMemo(() => {
    return todayRecords.filter((r) => r.attendance_status === 'present').length;
  }, [todayRecords]);

  const lateCount = useMemo(() => {
    return todayRecords.filter((r) => r.attendance_status === 'late').length;
  }, [todayRecords]);

  const checkedOutCount = useMemo(() => {
    return todayRecords.filter((r) => r.attendance_status === 'checked_out').length;
  }, [todayRecords]);

  // Unique users who checked in today
  const attendedUserIds = useMemo(() => {
    return new Set(todayRecords.map((r) => r.user_id));
  }, [todayRecords]);

  // Users without record today (eligible non-operator/admin users or total active users)
  const regularActiveUsers = useMemo(() => {
    return users.filter((u) => u.account_status === 'active');
  }, [users]);

  const absentCount = Math.max(0, regularActiveUsers.length - attendedUserIds.size);

  const totalScansToday = todayRecords.length;
  const attendanceRate =
    regularActiveUsers.length > 0
      ? Math.round((attendedUserIds.size / regularActiveUsers.length) * 100)
      : 0;

  // Filtered recent activity
  const filteredRecords = useMemo(() => {
    return records
      .filter((r) => {
        const matchesStatus = statusFilter === 'all' || r.attendance_status === statusFilter;
        const userName = r.user?.full_name?.toLowerCase() || '';
        const userId = r.user?.user_identifier?.toLowerCase() || '';
        const dept = r.user?.department?.toLowerCase() || '';
        const query = searchTerm.toLowerCase();
        const matchesSearch = userName.includes(query) || userId.includes(query) || dept.includes(query);
        return matchesStatus && matchesSearch;
      })
      .slice(0, 10);
  }, [records, statusFilter, searchTerm]);

  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Registered Users */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Registered Users</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
              {users.length}
            </span>
            <span className="text-xs text-slate-500">
              ({activeUsersCount} active)
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Cross-department roster</p>
        </div>

        {/* Total Attendance Today */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Today&apos;s Records</span>
            <Calendar className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
              {totalScansToday}
            </span>
            <span className="text-xs font-semibold text-blue-600">
              {attendanceRate}% turnout
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Verified check-in events</p>
        </div>

        {/* Present On-Time */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">On-Time Present</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-700 tabular-nums">
              {presentCount}
            </span>
            <span className="text-xs text-slate-500">
              +{checkedOutCount} checked-out
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Before late threshold</p>
        </div>

        {/* Late Arrivals */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Late Arrivals</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-700 tabular-nums">
              {lateCount}
            </span>
            <span className="text-xs text-amber-600 font-medium">
              {totalScansToday > 0 ? Math.round((lateCount / totalScansToday) * 100) : 0}% of scans
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Flagged by session rules</p>
        </div>

        {/* Not Recorded / Absent */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Unrecorded / Absent</span>
            <UserX className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-600 tabular-nums">
              {absentCount}
            </span>
            <span className="text-xs text-slate-400">
              pending scan
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Active users not yet scanned</p>
        </div>
      </div>

      {/* Visual Distribution Bar & Quick Action Strip */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Today&apos;s Attendance Distribution</h3>
            <p className="text-xs text-slate-500">
              Real-time synchronization across campus scanner stations
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Present ({presentCount})
            </span>
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Late ({lateCount})
            </span>
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Checked Out ({checkedOutCount})
            </span>
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300" /> Unrecorded ({absentCount})
            </span>
          </div>
        </div>

        {/* Proportional Progress Bar */}
        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
          {presentCount > 0 && (
            <div
              style={{ width: `${(presentCount / regularActiveUsers.length) * 100}%` }}
              className="bg-emerald-500 transition-all duration-500"
              title={`Present: ${presentCount}`}
            />
          )}
          {lateCount > 0 && (
            <div
              style={{ width: `${(lateCount / regularActiveUsers.length) * 100}%` }}
              className="bg-amber-500 transition-all duration-500"
              title={`Late: ${lateCount}`}
            />
          )}
          {checkedOutCount > 0 && (
            <div
              style={{ width: `${(checkedOutCount / regularActiveUsers.length) * 100}%` }}
              className="bg-blue-500 transition-all duration-500"
              title={`Checked Out: ${checkedOutCount}`}
            />
          )}
          {absentCount > 0 && (
            <div
              style={{ width: `${(absentCount / regularActiveUsers.length) * 100}%` }}
              className="bg-slate-200 transition-all duration-500"
              title={`Unrecorded: ${absentCount}`}
            />
          )}
        </div>
      </div>

      {/* Searchable Activity Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Attendance Activity</h3>
            <p className="text-xs text-slate-500">Live feed of verified scans across all stations</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search name, ID, department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg w-56 focus:outline-none focus:ring-1 focus:ring-blue-600 bg-slate-50"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              {(['all', 'present', 'late', 'checked_out'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md capitalize transition-colors ${
                    statusFilter === st
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st === 'all' ? 'All' : st === 'checked_out' ? 'Checked Out' : st}
                </button>
              ))}
            </div>

            <button
              onClick={() => onNavigateToTab('scanner')}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              Launch Scanner
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Table Content */}
        {filteredRecords.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <p className="text-sm font-medium">No matching attendance records found.</p>
            <p className="text-xs mt-1">Scans recorded at QR stations will appear here automatically.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">User & ID</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Session</th>
                  <th className="px-4 py-3">Check-In Time</th>
                  <th className="px-4 py-3">Check-Out Time</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Station / Operator</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((r) => {
                  const checkInDate = new Date(r.check_in_at);
                  const checkOutDate = r.check_out_at ? new Date(r.check_out_at) : null;
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
                              onClick={() => r.user && onOpenUserModal(r.user)}
                              className="font-bold text-slate-900 hover:text-blue-600 transition-colors text-left"
                            >
                              {r.user?.full_name || 'Unknown User'}
                            </button>
                            <p className="font-mono text-[10px] text-slate-500">
                              {r.user?.user_identifier}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-[160px] truncate">
                        {r.user?.department || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {r.session?.session_name || 'General Session'}
                      </td>
                      <td className="px-4 py-3 font-mono tabular-nums text-slate-900">
                        {checkInDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 font-mono tabular-nums text-slate-600">
                        {checkOutDate
                          ? checkOutDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
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
                        {r.user && (
                          <button
                            onClick={() => onOpenUserModal(r.user!)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            View Card
                          </button>
                        )}
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
