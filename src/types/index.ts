export type UserRole = 'admin' | 'operator' | 'user';
export type AccountStatus = 'active' | 'deactivated';
export type CredentialStatus = 'active' | 'revoked';
export type SessionStatus = 'active' | 'upcoming' | 'completed' | 'cancelled';
export type AttendanceStatus = 'present' | 'late' | 'checked_out' | 'absent' | 'excused';

export interface QrCredential {
  id: string;
  user_id: string;
  token_hash: string;
  credential_status: CredentialStatus;
  issued_at: string;
  revoked_at: string | null;
  last_used_at: string | null;
}

export interface UserProfile {
  id: string;
  auth_user_id: string;
  full_name: string;
  email: string;
  user_identifier: string; // Student ID or Employee ID (e.g. STU-2026-101, EMP-2026-004)
  department: string;
  role: UserRole;
  profile_photo_url: string;
  account_status: AccountStatus;
  created_at: string;
  updated_at: string;
  qr_credential?: QrCredential;
}

export interface AttendanceSession {
  id: string;
  session_name: string;
  attendance_date: string; // YYYY-MM-DD
  check_in_start: string; // HH:MM
  check_in_end: string; // HH:MM
  check_out_start: string; // HH:MM
  check_out_end: string; // HH:MM
  late_threshold: string; // HH:MM
  status: SessionStatus;
  created_by: string;
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  user_id: string;
  session_id: string;
  check_in_at: string; // ISO
  check_out_at: string | null; // ISO
  attendance_status: AttendanceStatus;
  recorded_by: string;
  created_at: string;
  updated_at: string;
  user?: UserProfile;
  session?: AttendanceSession;
}

export interface AuditLog {
  id: string;
  attendance_record_id: string | null;
  action: string;
  previous_values: Record<string, unknown> | null;
  updated_values: Record<string, unknown> | null;
  performed_by: string;
  created_at: string;
}

export interface SystemSettings {
  organization_name: string;
  organization_code: string;
  organization_logo_url: string;
  default_timezone: string;
  allow_manual_corrections: boolean;
  allow_checkout_same_qr: boolean;
  duplicate_scan_cooldown_seconds: number;
  sound_feedback_enabled: boolean;
}

export interface ScanResult {
  success: boolean;
  type?: 'check_in' | 'check_out';
  message: string;
  reason?: 'INVALID_CREDENTIAL' | 'ACCOUNT_DEACTIVATED' | 'CREDENTIAL_REVOKED' | 'ALREADY_RECORDED' | 'NO_ACTIVE_SESSION' | 'OUTSIDE_HOURS' | 'SERVER_ERROR';
  record?: AttendanceRecord;
  user?: UserProfile;
  session?: AttendanceSession;
  timestamp?: string;
}
