import React, { useState } from 'react';
import { Plus, Calendar, Clock, Edit2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { AttendanceSession, SessionStatus } from '../types';
import { api } from '../lib/api';

interface AttendanceSessionsProps {
  sessions: AttendanceSession[];
  onRefreshSessions: () => void;
  operatorName: string;
}

export const AttendanceSessions: React.FC<AttendanceSessionsProps> = ({
  sessions,
  onRefreshSessions,
  operatorName,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<AttendanceSession | null>(null);

  const [formData, setFormData] = useState({
    session_name: '',
    attendance_date: new Date().toISOString().split('T')[0],
    check_in_start: '07:30',
    check_in_end: '10:30',
    check_out_start: '16:00',
    check_out_end: '18:30',
    late_threshold: '08:15',
    status: 'active' as SessionStatus,
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleOpenCreate = () => {
    setEditingSession(null);
    setFormData({
      session_name: '',
      attendance_date: new Date().toISOString().split('T')[0],
      check_in_start: '07:30',
      check_in_end: '10:30',
      check_out_start: '16:00',
      check_out_end: '18:30',
      late_threshold: '08:15',
      status: 'active',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (session: AttendanceSession) => {
    setEditingSession(session);
    setFormData({
      session_name: session.session_name,
      attendance_date: session.attendance_date,
      check_in_start: session.check_in_start,
      check_in_end: session.check_in_end,
      check_out_start: session.check_out_start,
      check_out_end: session.check_out_end,
      late_threshold: session.late_threshold,
      status: session.status,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setLoading(true);

    try {
      if (editingSession) {
        await api.updateSession(editingSession.id, {
          ...formData,
        });
      } else {
        await api.createSession({
          ...formData,
          created_by: operatorName || 'Admin',
        });
      }
      setIsModalOpen(false);
      onRefreshSessions();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Attendance Sessions & Timing Rules</h3>
          <p className="text-xs text-slate-500">
            Define official check-in windows, late thresholds, and event-specific scanning tracks
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Session
        </button>
      </div>

      {/* Sessions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sessions.map((s) => {
          const isActive = s.status === 'active';
          return (
            <div
              key={s.id}
              className={`rounded-xl border p-4 bg-white shadow-xs transition-all ${
                isActive ? 'border-blue-300 ring-1 ring-blue-100' : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      isActive
                        ? 'bg-blue-100 text-blue-800'
                        : s.status === 'upcoming'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {s.status}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 mt-1.5 leading-snug">
                    {s.session_name}
                  </h4>
                </div>
                <button
                  onClick={() => handleOpenEdit(s)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-50 transition-colors"
                  title="Edit Session Rules"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Timing Grid */}
              <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-slate-500">
                    <Calendar className="w-3.5 h-3.5" /> Date:
                  </span>
                  <span className="font-mono text-slate-900 font-semibold">{s.attendance_date}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-slate-500">
                    <Clock className="w-3.5 h-3.5" /> Check-in Window:
                  </span>
                  <span className="font-mono text-slate-900">
                    {s.check_in_start} - {s.check_in_end}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-amber-600 font-medium">
                    <Clock className="w-3.5 h-3.5" /> Late Arrival Cutoff:
                  </span>
                  <span className="font-mono text-amber-700 font-bold">{s.late_threshold}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-slate-500">
                    <Clock className="w-3.5 h-3.5" /> Check-out Window:
                  </span>
                  <span className="font-mono text-slate-900">
                    {s.check_out_start} - {s.check_out_end}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE / EDIT SESSION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">
                {editingSession ? 'Edit Attendance Session' : 'Create Attendance Session'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 bg-red-50 text-red-700 text-xs p-3 rounded-lg border border-red-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Session / Event Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Morning Shift or CS101 Lecture"
                  value={formData.session_name}
                  onChange={(e) => setFormData({ ...formData, session_name: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Session Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.attendance_date}
                  onChange={(e) => setFormData({ ...formData, attendance_date: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Check-in Start *
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.check_in_start}
                    onChange={(e) => setFormData({ ...formData, check_in_start: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Late Cutoff Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.late_threshold}
                    onChange={(e) => setFormData({ ...formData, late_threshold: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 font-mono bg-amber-50/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Check-in End
                  </label>
                  <input
                    type="time"
                    value={formData.check_in_end}
                    onChange={(e) => setFormData({ ...formData, check_in_end: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Check-out End
                  </label>
                  <input
                    type="time"
                    value={formData.check_out_end}
                    onChange={(e) => setFormData({ ...formData, check_out_end: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Session Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as SessionStatus })}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white"
                >
                  <option value="active">Active (Currently Accepting Scans)</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="completed">Completed / Closed</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
                >
                  {loading ? 'Saving...' : 'Save Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
