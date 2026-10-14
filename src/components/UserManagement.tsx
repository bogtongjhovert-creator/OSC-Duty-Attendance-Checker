import React, { useState, useMemo } from 'react';
import {
  UserPlus,
  Upload,
  Search,
  Filter,
  MoreVertical,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  Edit2,
  Trash2,
  RefreshCw,
  Printer,
  FileSpreadsheet,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import { UserProfile, SystemSettings, UserRole, AccountStatus } from '../types';
import { api } from '../lib/api';
import { QrCodeCard } from './QrCodeCard';

interface UserManagementProps {
  users: UserProfile[];
  settings: SystemSettings | null;
  onRefreshUsers: () => void;
  operatorName: string;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  users,
  settings,
  onRefreshUsers,
  operatorName,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCsvOpen, setIsCsvOpen] = useState(false);
  const [selectedUserForCard, setSelectedUserForCard] = useState<UserProfile | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    user_identifier: '',
    department: '',
    role: 'user' as UserRole,
    profile_photo_url: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // CSV Import state
  const [csvContent, setCsvContent] = useState('');
  const [csvResult, setCsvResult] = useState<{ count?: number; errors?: string[] } | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);

  // Distinct departments
  const departments = useMemo(() => {
    const set = new Set(users.map((u) => u.department).filter(Boolean));
    return Array.from(set);
  }, [users]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.user_identifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || u.account_status === statusFilter;
      const matchesDept = departmentFilter === 'all' || u.department === departmentFilter;

      return matchesSearch && matchesRole && matchesStatus && matchesDept;
    });
  }, [users, searchTerm, roleFilter, statusFilter, departmentFilter]);

  // Handle single user create
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);

    try {
      await api.createUser(formData);
      setIsCreateOpen(false);
      setFormData({
        full_name: '',
        email: '',
        user_identifier: '',
        department: '',
        role: 'user',
        profile_photo_url: '',
      });
      onRefreshUsers();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create user');
    } finally {
      setFormLoading(false);
    }
  };

  // Handle user edit update
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setFormError(null);
    setFormLoading(true);

    try {
      await api.updateUser(editingUser.id, {
        full_name: editingUser.full_name,
        email: editingUser.email,
        department: editingUser.department,
        role: editingUser.role,
        account_status: editingUser.account_status,
        profile_photo_url: editingUser.profile_photo_url,
      });
      setEditingUser(null);
      onRefreshUsers();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update user');
    } finally {
      setFormLoading(false);
    }
  };

  // Toggle account status
  const handleToggleStatus = async (user: UserProfile) => {
    const nextStatus: AccountStatus = user.account_status === 'active' ? 'deactivated' : 'active';
    try {
      await api.updateUser(user.id, { account_status: nextStatus });
      onRefreshUsers();
    } catch (err: any) {
      alert(`Could not change account status: ${err.message}`);
    }
  };

  // Regenerate QR
  const handleRegenerateQr = async (userId: string) => {
    if (!confirm('Regenerate QR credential? The previous QR code will immediately stop working.')) return;
    try {
      const res = await api.regenerateQr(userId, operatorName);
      if (selectedUserForCard && selectedUserForCard.id === userId) {
        setSelectedUserForCard(res.user);
      }
      onRefreshUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Revoke QR
  const handleRevokeQr = async (userId: string) => {
    if (!confirm('Revoke this QR credential? The user will be unable to check in until a new QR code is issued.')) return;
    try {
      const res = await api.revokeQr(userId, operatorName);
      if (selectedUserForCard && selectedUserForCard.id === userId) {
        setSelectedUserForCard(res.user);
      }
      onRefreshUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Handle CSV Import
  const handleCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvContent.trim()) return;
    setCsvLoading(true);
    setCsvResult(null);

    try {
      const res = await api.importCsv(csvContent);
      setCsvResult({ count: res.importedCount, errors: res.errors });
      if (res.importedCount > 0) {
        onRefreshUsers();
      }
    } catch (err: any) {
      setCsvResult({ errors: [err.message || 'CSV parse failed'] });
    } finally {
      setCsvLoading(false);
    }
  };

  const sampleCsvTemplate = `Full Name,Email,ID Number,Department,Role
Alyssa Nicole Tan,alyssa.tan@panpacificu.edu.ph,STU-2026-108,BS Computer Science,user
Prof. Anthony Perez,anthony.perez@panpacificu.edu.ph,FAC-2026-020,School of Engineering,operator
Rachelle Domingo,rachelle.domingo@panpacificu.edu.ph,EMP-2026-050,Registrar Office,user`;

  return (
    <div className="space-y-6">
      {/* Action Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Input */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search user, ID, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg w-full bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 focus:outline-none"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 focus:outline-none"
          >
            <option value="all">All Roles</option>
            <option value="user">User / Student</option>
            <option value="operator">Operator</option>
            <option value="admin">Administrator</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="deactivated">Deactivated Only</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              setCsvContent(sampleCsvTemplate);
              setIsCsvOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Upload className="w-3.5 h-3.5" />
            CSV Import
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Add Account
          </button>
        </div>
      </div>

      {/* Users Directory Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">User Credentials Directory</h3>
            <p className="text-xs text-slate-500">
              Showing {filteredUsers.length} of {users.length} registered accounts with automatic QR credentials
            </p>
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <p className="text-sm font-medium">No users match your filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">User & ID</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Department / Program</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">QR Credential</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => {
                  const cred = u.qr_credential;
                  const isRevoked = cred?.credential_status === 'revoked';
                  const isDeactivated = u.account_status === 'deactivated';

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {u.profile_photo_url ? (
                            <img
                              src={u.profile_photo_url}
                              alt={u.full_name}
                              className="w-8 h-8 rounded-full object-cover shrink-0"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
                              {u.full_name[0]}
                            </div>
                          )}
                          <div>
                            <button
                              onClick={() => setSelectedUserForCard(u)}
                              className="font-bold text-slate-900 hover:text-blue-600 transition-colors text-left"
                            >
                              {u.full_name}
                            </button>
                            <p className="font-mono text-[10px] text-blue-700 font-semibold">
                              {u.user_identifier}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {u.email}
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-medium">
                        {u.department}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono uppercase text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`font-semibold text-[10px] uppercase px-2 py-0.5 rounded transition-colors ${
                            isDeactivated
                              ? 'bg-red-100 text-red-800 hover:bg-red-200'
                              : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          }`}
                          title="Click to toggle active / deactivated status"
                        >
                          {u.account_status}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded ${
                            isRevoked
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {isRevoked ? 'REVOKED' : 'ACTIVE QR'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Card */}
                          <button
                            onClick={() => setSelectedUserForCard(u)}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors"
                            title="View & Print QR ID Card"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>

                          {/* Edit Details */}
                          <button
                            onClick={() => setEditingUser(u)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                            title="Edit User"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Regenerate Token */}
                          <button
                            onClick={() => handleRegenerateQr(u.id)}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors"
                            title="Regenerate QR Token (Revokes Old)"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
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

      {/* MODAL 1: CREATE USER */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Create New Account</h3>
              <button
                onClick={() => setIsCreateOpen(false)}
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

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Student / Employee ID Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. STU-2026-110 or EMP-2026-052"
                  value={formData.user_identifier}
                  onChange={(e) => setFormData({ ...formData, user_identifier: e.target.value })}
                  className="w-full text-xs font-mono border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. user@institution.edu"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department / Program *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. College of Computer Studies"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Account Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-600 focus:outline-none bg-white"
                >
                  <option value="user">Regular User (Student / Member)</option>
                  <option value="operator">Attendance Operator (Scanner Personnel)</option>
                  <option value="admin">Administrator (Full Control)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Profile Photo URL (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. /src/assets/images/... or web URL"
                  value={formData.profile_photo_url}
                  onChange={(e) => setFormData({ ...formData, profile_photo_url: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors disabled:opacity-50"
                >
                  {formLoading ? 'Creating & Generating QR...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT USER */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Edit User Account</h3>
              <button
                onClick={() => setEditingUser(null)}
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

            <form onSubmit={handleEditSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editingUser.full_name}
                  onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  required
                  value={editingUser.department}
                  onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Role
                  </label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-600 focus:outline-none bg-white"
                  >
                    <option value="user">Regular User</option>
                    <option value="operator">Operator</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={editingUser.account_status}
                    onChange={(e) => setEditingUser({ ...editingUser, account_status: e.target.value as AccountStatus })}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-600 focus:outline-none bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="deactivated">Deactivated</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Photo URL
                </label>
                <input
                  type="text"
                  value={editingUser.profile_photo_url || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, profile_photo_url: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
                >
                  {formLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CSV IMPORT */}
      {isCsvOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Batch CSV Account Import</h3>
              </div>
              <button
                onClick={() => {
                  setIsCsvOpen(false);
                  setCsvResult(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Paste CSV data below with headers: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">Full Name, Email, ID Number, Department, Role</code>.
              Each imported user will automatically receive a unique QR code.
            </p>

            <form onSubmit={handleCsvImport} className="space-y-4">
              <textarea
                rows={8}
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                className="w-full font-mono text-xs border border-slate-200 rounded-lg p-3 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
              />

              {csvResult && (
                <div
                  className={`p-3 rounded-lg text-xs ${
                    csvResult.count && csvResult.count > 0
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {csvResult.count ? (
                    <p className="font-bold">Successfully imported {csvResult.count} accounts with generated QR codes!</p>
                  ) : null}
                  {csvResult.errors && csvResult.errors.length > 0 && (
                    <div className="mt-1">
                      <p className="font-bold">Issues encountered:</p>
                      <ul className="list-disc pl-4 mt-0.5">
                        {csvResult.errors.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setCsvContent(sampleCsvTemplate)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Load Sample CSV Template
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCsvOpen(false);
                      setCsvResult(null);
                    }}
                    className="px-3 py-2 text-xs font-medium text-slate-600"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={csvLoading || !csvContent.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors disabled:opacity-50"
                  >
                    {csvLoading ? 'Processing & Issuing QRs...' : 'Import Accounts'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: QR CREDENTIAL CARD & PRINT PREVIEW */}
      {selectedUserForCard && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">QR Credential Card</h3>
              <button
                onClick={() => setSelectedUserForCard(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <QrCodeCard
              user={selectedUserForCard}
              settings={settings}
              showAdminActions={true}
              onRegenerate={() => handleRegenerateQr(selectedUserForCard.id)}
              onRevoke={() => handleRevokeQr(selectedUserForCard.id)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
