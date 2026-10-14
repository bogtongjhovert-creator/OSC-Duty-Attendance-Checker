import {
  UserProfile,
  AttendanceSession,
  AttendanceRecord,
  AuditLog,
  SystemSettings,
  ScanResult,
} from '../types';

export const api = {
  // Health
  async getHealth() {
    const res = await fetch('/api/health');
    return res.json();
  },

  // Users
  async getUsers(): Promise<UserProfile[]> {
    const res = await fetch('/api/users');
    if (!res.ok) throw new Error('Failed to load users');
    const data = await res.json();
    return data.users;
  },

  async createUser(userData: {
    full_name: string;
    email: string;
    user_identifier: string;
    department: string;
    role?: string;
    profile_photo_url?: string;
  }): Promise<{ user: UserProfile }> {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create user');
    return data;
  },

  async updateUser(id: string, updates: Partial<UserProfile>): Promise<{ user: UserProfile }> {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update user');
    return data;
  },

  async regenerateQr(id: string, performedBy: string) {
    const res = await fetch(`/api/users/${id}/regenerate-qr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ performed_by: performedBy }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to regenerate QR credential');
    return data;
  },

  async revokeQr(id: string, performedBy: string) {
    const res = await fetch(`/api/users/${id}/revoke-qr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ performed_by: performedBy }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to revoke QR credential');
    return data;
  },

  async importCsv(csvData: string) {
    const res = await fetch('/api/users/import-csv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csvData }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'CSV import failed');
    return data;
  },

  // Sessions
  async getSessions(): Promise<AttendanceSession[]> {
    const res = await fetch('/api/sessions');
    if (!res.ok) throw new Error('Failed to load sessions');
    const data = await res.json();
    return data.sessions;
  },

  async createSession(sessionData: Partial<AttendanceSession>): Promise<{ session: AttendanceSession }> {
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create session');
    return data;
  },

  async updateSession(id: string, sessionData: Partial<AttendanceSession>): Promise<{ session: AttendanceSession }> {
    const res = await fetch(`/api/sessions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update session');
    return data;
  },

  // Attendance
  async getAttendance(): Promise<AttendanceRecord[]> {
    const res = await fetch('/api/attendance');
    if (!res.ok) throw new Error('Failed to load attendance');
    const data = await res.json();
    return data.records;
  },

  async scanAttendance(payload: {
    qrToken: string;
    sessionId?: string;
    operatorName?: string;
  }): Promise<ScanResult> {
    const res = await fetch('/api/attendance/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return data;
  },

  async correctAttendance(
    id: string,
    corrections: {
      attendance_status?: string;
      check_in_at?: string;
      check_out_at?: string | null;
      reason: string;
      performed_by: string;
    }
  ): Promise<{ record: AttendanceRecord }> {
    const res = await fetch(`/api/attendance/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corrections),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to correct attendance');
    return data;
  },

  // Audit Logs
  async getAuditLogs(): Promise<AuditLog[]> {
    const res = await fetch('/api/audit-logs');
    if (!res.ok) throw new Error('Failed to load audit logs');
    const data = await res.json();
    return data.logs;
  },

  // Settings
  async getSettings(): Promise<SystemSettings> {
    const res = await fetch('/api/settings');
    if (!res.ok) throw new Error('Failed to load settings');
    const data = await res.json();
    return data.settings;
  },

  async updateSettings(settings: Partial<SystemSettings>): Promise<{ settings: SystemSettings }> {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update settings');
    return data;
  },

  // Reset to initial institutional demo data
  async resetDemoData(): Promise<void> {
    const res = await fetch('/api/reset-demo', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to reset database');
  },

  // Authentication & Security Sessions
  async loginAdmin(credentials: { identifier: string; password: string }): Promise<{
    success: boolean;
    token: string;
    user: UserProfile;
    message: string;
  }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Authentication failed');
    return data;
  },

  async logoutAdmin(token?: string): Promise<{ success: boolean }> {
    const res = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify({ token }),
    });
    return res.json();
  },

  async verifyAdminSession(token: string): Promise<{ valid: boolean; user?: UserProfile; role?: string }> {
    const res = await fetch(`/api/auth/verify?token=${encodeURIComponent(token)}`);
    if (!res.ok) return { valid: false };
    return res.json();
  },
};
