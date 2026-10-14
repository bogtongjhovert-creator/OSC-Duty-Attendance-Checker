import React, { useState, useMemo } from 'react';
import {
  Download,
  Calendar,
  BarChart3,
  PieChart,
  CheckCircle2,
  Clock,
  UserX,
  FileSpreadsheet,
  Printer,
} from 'lucide-react';
import { AttendanceRecord, UserProfile, AttendanceSession } from '../types';

interface ReportsExportsProps {
  records: AttendanceRecord[];
  users: UserProfile[];
  sessions: AttendanceSession[];
}

export const ReportsExports: React.FC<ReportsExportsProps> = ({ records, users, sessions }) => {
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDept, setSelectedDept] = useState('all');

  const departments = useMemo(() => {
    return Array.from(new Set(users.map((u) => u.department).filter(Boolean)));
  }, [users]);

  // Filter records based on timeframe and department
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchDept = selectedDept === 'all' || r.user?.department === selectedDept;

      const recordDate = r.check_in_at ? r.check_in_at.split('T')[0] : '';
      let matchTime = true;

      if (reportType === 'daily') {
        matchTime = recordDate === selectedDate;
      } else if (reportType === 'weekly') {
        // within 7 days of selectedDate
        const refTime = new Date(selectedDate).getTime();
        const rTime = new Date(recordDate).getTime();
        const diffDays = Math.abs((refTime - rTime) / (1000 * 3600 * 24));
        matchTime = diffDays <= 7;
      } else if (reportType === 'monthly') {
        // same month and year
        const [selYear, selMonth] = selectedDate.split('-');
        const [rYear, rMonth] = recordDate.split('-');
        matchTime = selYear === rYear && selMonth === rMonth;
      }

      return matchDept && matchTime;
    });
  }, [records, selectedDate, selectedDept, reportType]);

  // Statistics
  const totalScans = filteredRecords.length;
  const onTimeCount = filteredRecords.filter((r) => r.attendance_status === 'present').length;
  const lateCount = filteredRecords.filter((r) => r.attendance_status === 'late').length;
  const checkedOutCount = filteredRecords.filter((r) => r.attendance_status === 'checked_out').length;

  const onTimePercentage = totalScans > 0 ? Math.round(((onTimeCount + checkedOutCount) / totalScans) * 100) : 0;
  const latePercentage = totalScans > 0 ? Math.round((lateCount / totalScans) * 100) : 0;

  // Breakdown by department
  const departmentBreakdown = useMemo(() => {
    const map: Record<string, { total: number; onTime: number; late: number }> = {};

    filteredRecords.forEach((r) => {
      const dept = r.user?.department || 'Unassigned';
      if (!map[dept]) {
        map[dept] = { total: 0, onTime: 0, late: 0 };
      }
      map[dept].total += 1;
      if (r.attendance_status === 'present' || r.attendance_status === 'checked_out') {
        map[dept].onTime += 1;
      } else if (r.attendance_status === 'late') {
        map[dept].late += 1;
      }
    });

    return Object.entries(map).map(([dept, data]) => ({
      department: dept,
      ...data,
      compliance: data.total > 0 ? Math.round((data.onTime / data.total) * 100) : 0,
    }));
  }, [filteredRecords]);

  const handleExportCsv = () => {
    const headers = [
      'Report Type',
      'Selected Reference Date',
      'Record ID',
      'User Name',
      'ID Number',
      'Department',
      'Date',
      'Check-In',
      'Check-Out',
      'Status',
    ];

    const rows = filteredRecords.map((r) => [
      reportType.toUpperCase(),
      selectedDate,
      r.id,
      `"${r.user?.full_name || 'N/A'}"`,
      r.user?.user_identifier || 'N/A',
      `"${r.user?.department || 'N/A'}"`,
      r.check_in_at ? r.check_in_at.split('T')[0] : 'N/A',
      r.check_in_at ? new Date(r.check_in_at).toLocaleTimeString() : 'N/A',
      r.check_out_at ? new Date(r.check_out_at).toLocaleTimeString() : 'N/A',
      r.attendance_status.toUpperCase(),
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Attendance_Analytics_${reportType}_${selectedDate}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Controls & Range Selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div className="flex flex-wrap items-center gap-2">
          {/* Daily, Weekly, Monthly Segmented Control */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            {(['daily', 'weekly', 'monthly'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setReportType(mode)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-colors ${
                  reportType === mode
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mode} Report
              </button>
            ))}
          </div>

          {/* Reference Date */}
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 font-mono text-slate-800 focus:outline-none"
          />

          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-800 focus:outline-none"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Report
          </button>

          <button
            onClick={handleExportCsv}
            disabled={filteredRecords.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-xs disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV ({filteredRecords.length})
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
            Total Scans Recorded
          </span>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
            {totalScans}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">In selected period</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-semibold uppercase text-emerald-600 tracking-wider">
            Punctuality Rate
          </span>
          <p className="text-2xl font-bold font-mono text-emerald-700 mt-1 tabular-nums">
            {onTimePercentage}%
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">{onTimeCount + checkedOutCount} on-time check-ins</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-semibold uppercase text-amber-600 tracking-wider">
            Late Incident Rate
          </span>
          <p className="text-2xl font-bold font-mono text-amber-700 mt-1 tabular-nums">
            {latePercentage}%
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">{lateCount} late arrivals flagged</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-semibold uppercase text-blue-600 tracking-wider">
            Active Roster Size
          </span>
          <p className="text-2xl font-bold font-mono text-blue-700 mt-1 tabular-nums">
            {users.length}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Enrolled credentials</p>
        </div>
      </div>

      {/* Department Breakdown Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-900">Department Compliance Breakdown</h3>
          <p className="text-xs text-slate-500">
            Attendance punctuality and volume comparison across academic and administrative units
          </p>
        </div>

        {departmentBreakdown.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No attendance activity recorded for this period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Department / Program</th>
                  <th className="px-4 py-3 text-right">Total Scans</th>
                  <th className="px-4 py-3 text-right">On-Time</th>
                  <th className="px-4 py-3 text-right">Late</th>
                  <th className="px-4 py-3 text-right">Punctuality Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {departmentBreakdown.map((row) => (
                  <tr key={row.department} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.department}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-800">
                      {row.total}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-emerald-700 font-semibold">
                      {row.onTime}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-amber-700 font-semibold">
                      {row.late}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${row.compliance}%` }}
                            className="bg-emerald-500 h-full"
                          />
                        </div>
                        <span className="font-mono tabular-nums font-bold text-slate-900 w-8">
                          {row.compliance}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
