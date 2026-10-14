import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DB_FILE = path.join(__dirname, 'data', 'database.json');

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

// In-Memory Database Structure
interface DatabaseSchema {
  profiles: any[];
  qr_credentials: any[];
  attendance_sessions: any[];
  attendance_records: any[];
  attendance_audit_logs: any[];
  system_settings: Record<string, any>;
}

const DEFAULT_SETTINGS = {
  organization_name: 'OSC Scholar Duty Tracker',
  organization_code: 'OSC-SCHOLARS',
  organization_logo_url: '/src/assets/images/org_institutional_logo_1791949676528.jpg',
  default_timezone: 'Asia/Manila (UTC+8)',
  allow_manual_corrections: true,
  allow_checkout_same_qr: true,
  duplicate_scan_cooldown_seconds: 5,
  sound_feedback_enabled: true,
};

function getTodayDateString(): string {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

function generateInitialData(): DatabaseSchema {
  const today = getTodayDateString();

  const users = [
    {
      id: 'usr_admin_01',
      auth_user_id: 'auth_usr_01',
      full_name: 'Engr. Jhovert Bogtong',
      email: 'bogtong.jhovert@panpacificu.edu.ph',
      user_identifier: 'EMP-2026-001',
      department: 'Office of the Chancellor & IT',
      role: 'admin',
      profile_photo_url: '/src/assets/images/staff_avatar_portrait_1791949678442.jpg',
      account_status: 'active',
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'usr_faculty_02',
      auth_user_id: 'auth_usr_02',
      full_name: 'Dr. Elena Santos',
      email: 'elena.santos@panpacificu.edu.ph',
      user_identifier: 'FAC-2026-012',
      department: 'College of Computer Studies',
      role: 'operator',
      profile_photo_url: '/src/assets/images/faculty_avatar_portrait_1791949678314.jpg',
      account_status: 'active',
      created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'usr_operator_03',
      auth_user_id: 'auth_usr_03',
      full_name: 'Marcus Vance',
      email: 'marcus.vance@panpacificu.edu.ph',
      user_identifier: 'EMP-2026-045',
      department: 'Student Affairs & Campus Security',
      role: 'operator',
      profile_photo_url: '/src/assets/images/staff_avatar_portrait_1791949678442.jpg',
      account_status: 'active',
      created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'usr_student_04',
      auth_user_id: 'auth_usr_04',
      full_name: 'Maria Katrina Ramos',
      email: 'katrina.ramos@panpacificu.edu.ph',
      user_identifier: 'STU-2026-101',
      department: 'BS Computer Science',
      role: 'user',
      profile_photo_url: '/src/assets/images/student_avatar_portrait_1791949677861.jpg',
      account_status: 'active',
      created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'usr_student_05',
      auth_user_id: 'auth_usr_05',
      full_name: 'Christian Bautista',
      email: 'christian.bautista@panpacificu.edu.ph',
      user_identifier: 'STU-2026-102',
      department: 'BS Information Technology',
      role: 'user',
      profile_photo_url: '',
      account_status: 'active',
      created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'usr_student_06',
      auth_user_id: 'auth_usr_06',
      full_name: 'Sofia Isabel Reyes',
      email: 'sofia.reyes@panpacificu.edu.ph',
      user_identifier: 'STU-2026-103',
      department: 'College of Allied Health',
      role: 'user',
      profile_photo_url: '',
      account_status: 'active',
      created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'usr_student_07',
      auth_user_id: 'auth_usr_07',
      full_name: 'Gabriel Morales',
      email: 'gabriel.morales@panpacificu.edu.ph',
      user_identifier: 'STU-2026-104',
      department: 'School of Engineering',
      role: 'user',
      profile_photo_url: '',
      account_status: 'active',
      created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'usr_student_08',
      auth_user_id: 'auth_usr_08',
      full_name: 'Liam Alexander Chen',
      email: 'liam.chen@panpacificu.edu.ph',
      user_identifier: 'STU-2026-105',
      department: 'Business Administration',
      role: 'user',
      profile_photo_url: '',
      account_status: 'active',
      created_at: new Date(Date.now() - 8 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'usr_student_09',
      auth_user_id: 'auth_usr_09',
      full_name: 'Hannah Mendoza (Deactivated)',
      email: 'hannah.mendoza@panpacificu.edu.ph',
      user_identifier: 'STU-2026-106',
      department: 'College of Arts & Sciences',
      role: 'user',
      profile_photo_url: '',
      account_status: 'deactivated', // To demonstrate deactivated test case
      created_at: new Date(Date.now() - 6 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'usr_student_10',
      auth_user_id: 'auth_usr_10',
      full_name: 'Raphael Gomez (Revoked QR)',
      email: 'raphael.gomez@panpacificu.edu.ph',
      user_identifier: 'STU-2026-107',
      department: 'Maritime Studies',
      role: 'user',
      profile_photo_url: '',
      account_status: 'active',
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const credentials = users.map((u, idx) => {
    const isRevoked = u.id === 'usr_student_10';
    return {
      id: `qrc_${idx + 1}`,
      user_id: u.id,
      token_hash: `QRC-${crypto.randomBytes(12).toString('hex').toUpperCase()}`,
      credential_status: isRevoked ? 'revoked' : 'active',
      issued_at: u.created_at,
      revoked_at: isRevoked ? new Date().toISOString() : null,
      last_used_at: null,
    };
  });

  const sessions = [
    {
      id: 'ses_morning_today',
      session_name: 'Morning Scholar Duty Shift',
      attendance_date: today,
      check_in_start: '07:00',
      check_in_end: '11:30',
      check_out_start: '16:00',
      check_out_end: '18:30',
      late_threshold: '08:30',
      status: 'active',
      created_by: 'usr_admin_01',
      created_at: new Date().toISOString(),
    },
    {
      id: 'ses_afternoon_today',
      session_name: 'Afternoon Scholar Office & Lab Duty',
      attendance_date: today,
      check_in_start: '13:00',
      check_in_end: '15:30',
      check_out_start: '17:30',
      check_out_end: '19:30',
      late_threshold: '13:30',
      status: 'active',
      created_by: 'usr_admin_01',
      created_at: new Date().toISOString(),
    },
    {
      id: 'ses_symposium_upcoming',
      session_name: 'Special Institutional Scholar Duty',
      attendance_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      check_in_start: '08:00',
      check_in_end: '10:00',
      check_out_start: '16:00',
      check_out_end: '17:30',
      late_threshold: '08:45',
      status: 'upcoming',
      created_by: 'usr_admin_01',
      created_at: new Date().toISOString(),
    },
  ];

  // Seed sample records for today morning session
  const records = [
    {
      id: 'rec_01',
      user_id: 'usr_student_04', // Maria Katrina Ramos
      session_id: 'ses_morning_today',
      check_in_at: `${today}T08:05:22.000Z`,
      check_out_at: null,
      attendance_status: 'present',
      recorded_by: 'Main Gate Station 1',
      created_at: `${today}T08:05:22.000Z`,
      updated_at: `${today}T08:05:22.000Z`,
    },
    {
      id: 'rec_02',
      user_id: 'usr_student_05', // Christian Bautista
      session_id: 'ses_morning_today',
      check_in_at: `${today}T08:42:15.000Z`,
      check_out_at: null,
      attendance_status: 'late',
      recorded_by: 'Science Hall Scanner A',
      created_at: `${today}T08:42:15.000Z`,
      updated_at: `${today}T08:42:15.000Z`,
    },
    {
      id: 'rec_03',
      user_id: 'usr_faculty_02', // Dr. Elena Santos
      session_id: 'ses_morning_today',
      check_in_at: `${today}T07:48:30.000Z`,
      check_out_at: `${today}T11:20:10.000Z`,
      attendance_status: 'checked_out',
      recorded_by: 'Faculty Lounge Station',
      created_at: `${today}T07:48:30.000Z`,
      updated_at: `${today}T11:20:10.000Z`,
    },
  ];

  const auditLogs = [
    {
      id: 'log_01',
      attendance_record_id: 'rec_01',
      action: 'check_in',
      previous_values: null,
      updated_values: { attendance_status: 'present', check_in_at: `${today}T08:05:22.000Z` },
      performed_by: 'Main Gate Station 1',
      created_at: `${today}T08:05:22.000Z`,
    },
    {
      id: 'log_02',
      attendance_record_id: 'rec_02',
      action: 'check_in',
      previous_values: null,
      updated_values: { attendance_status: 'late', check_in_at: `${today}T08:42:15.000Z` },
      performed_by: 'Science Hall Scanner A',
      created_at: `${today}T08:42:15.000Z`,
    },
  ];

  return {
    profiles: users,
    qr_credentials: credentials,
    attendance_sessions: sessions,
    attendance_records: records,
    attendance_audit_logs: auditLogs,
    system_settings: DEFAULT_SETTINGS,
  };
}

// Load DB from file or initialize
let db: DatabaseSchema;

function loadDatabase(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      // Validate structure
      if (parsed && Array.isArray(parsed.profiles)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load database.json, initializing fresh data:', err);
  }
  const initial = generateInitialData();
  saveDatabase(initial);
  return initial;
}

function saveDatabase(dataToSave: DatabaseSchema = db): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dataToSave, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write database.json:', err);
  }
}

db = loadDatabase();

// SSE (Server-Sent Events) clients for real-time multi-device sync
const sseClients: Response[] = [];

function broadcastEvent(type: string, data: any) {
  const payload = `data: ${JSON.stringify({ type, data, timestamp: new Date().toISOString() })}\n\n`;
  sseClients.forEach((client) => {
    try {
      client.write(payload);
    } catch {
      // client disconnected
    }
  });
}

// -------------------------------------------------------------
// REST API ROUTES
// -------------------------------------------------------------

// SSE stream endpoint
app.get('/api/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'SSE Stream Active' })}\n\n`);
  sseClients.push(res);

  req.on('close', () => {
    const idx = sseClients.indexOf(res);
    if (idx !== -1) sseClients.splice(idx, 1);
  });
});

// Health check and stats
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    profiles_count: db.profiles.length,
    records_count: db.attendance_records.length,
    sessions_count: db.attendance_sessions.length,
    connected_clients: sseClients.length,
    timestamp: new Date().toISOString(),
  });
});

// Active Authenticated Admin / Operator Sessions
interface AdminSession {
  token: string;
  userId: string;
  role: string;
  email: string;
  fullName: string;
  createdAt: number;
}
const activeAdminSessions: Map<string, AdminSession> = new Map();

// POST /api/auth/login - Authenticate administrator or operator
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    res.status(400).json({ error: 'Please enter your Admin Email or ID Number and password.' });
    return;
  }

  const cleanIdent = identifier.trim().toLowerCase();
  const cleanPass = password.trim();

  // Find user by email or user_identifier
  const user = db.profiles.find(
    (u) =>
      u.email.toLowerCase() === cleanIdent ||
      u.user_identifier.toLowerCase() === cleanIdent
  );

  if (!user) {
    res.status(401).json({ error: 'Invalid credentials. User account not found.' });
    return;
  }

  if (user.account_status === 'deactivated') {
    res.status(403).json({ error: 'Account is deactivated. Access denied.' });
    return;
  }

  // Check role authorization
  if (user.role !== 'admin' && user.role !== 'operator') {
    res.status(403).json({
      error: 'Access Denied: This account does not possess administrative or scanner clearance.',
    });
    return;
  }

  // Password verification
  // Admin password: admin2026! or admin123; Operator password: operator2026! or operator123
  const validAdminPasswords = ['admin2026!', 'admin123', 'admin'];
  const validOperatorPasswords = ['operator2026!', 'operator123', 'operator'];

  const isValidPassword =
    user.role === 'admin'
      ? validAdminPasswords.includes(cleanPass)
      : validOperatorPasswords.includes(cleanPass) || validAdminPasswords.includes(cleanPass);

  if (!isValidPassword) {
    res.status(401).json({
      error: 'Invalid security password. Please check your credentials.',
    });
    return;
  }

  // Issue random session token
  const sessionToken = `adm_sec_${crypto.randomBytes(24).toString('hex')}`;
  activeAdminSessions.set(sessionToken, {
    token: sessionToken,
    userId: user.id,
    role: user.role,
    email: user.email,
    fullName: user.full_name,
    createdAt: Date.now(),
  });

  // Log audit event
  db.attendance_audit_logs.unshift({
    id: `log_${Date.now()}`,
    attendance_record_id: null,
    action: 'admin_login',
    previous_values: null,
    updated_values: { role: user.role, ip: req.ip || '127.0.0.1' },
    performed_by: user.full_name,
    created_at: new Date().toISOString(),
  });
  saveDatabase();

  const cred = db.qr_credentials.find((c) => c.user_id === user.id);
  const userWithCred = { ...user, qr_credential: cred || null };

  res.json({
    success: true,
    token: sessionToken,
    user: userWithCred,
    message: 'Authentication successful. Administrative session granted.',
  });
});

// POST /api/auth/logout - Invalidate admin session
app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '') || req.body.token;

  if (token && activeAdminSessions.has(token)) {
    const session = activeAdminSessions.get(token);
    activeAdminSessions.delete(token);

    if (session) {
      db.attendance_audit_logs.unshift({
        id: `log_${Date.now()}`,
        attendance_record_id: null,
        action: 'admin_logout',
        previous_values: { token_invalidated: true },
        updated_values: null,
        performed_by: session.fullName,
        created_at: new Date().toISOString(),
      });
      saveDatabase();
    }
  }

  res.json({ success: true, message: 'Logged out successfully.' });
});

// GET /api/auth/verify - Verify session token
app.get('/api/auth/verify', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '') || (req.query.token as string);

  if (!token || !activeAdminSessions.has(token)) {
    res.status(401).json({ valid: false, error: 'Session expired or invalid.' });
    return;
  }

  const session = activeAdminSessions.get(token)!;
  const user = db.profiles.find((u) => u.id === session.userId);

  if (!user || user.account_status === 'deactivated') {
    activeAdminSessions.delete(token);
    res.status(401).json({ valid: false, error: 'User no longer authorized.' });
    return;
  }

  const cred = db.qr_credentials.find((c) => c.user_id === user.id);
  res.json({
    valid: true,
    user: { ...user, qr_credential: cred || null },
    role: session.role,
  });
});

// GET /api/users - return users with attached active qr_credentials
app.get('/api/users', (req: Request, res: Response) => {
  const usersWithCreds = db.profiles.map((u) => {
    const cred = db.qr_credentials.find((c) => c.user_id === u.id);
    return { ...u, qr_credential: cred || null };
  });
  res.json({ users: usersWithCreds });
});

// POST /api/users - create new user with auto QR credential
app.post('/api/users', (req: Request, res: Response) => {
  const { full_name, email, user_identifier, department, role, profile_photo_url } = req.body;

  if (!full_name || !email || !user_identifier || !department) {
    res.status(400).json({ error: 'Full name, email, ID number, and department are required.' });
    return;
  }

  // Check unique constraints
  if (db.profiles.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    res.status(409).json({ error: 'A user with this email address already exists.' });
    return;
  }
  if (db.profiles.some((u) => u.user_identifier.toLowerCase() === user_identifier.toLowerCase())) {
    res.status(409).json({ error: 'A user with this Employee / Student ID already exists.' });
    return;
  }

  const newUserId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newUser = {
    id: newUserId,
    auth_user_id: `auth_${newUserId}`,
    full_name: full_name.trim(),
    email: email.trim().toLowerCase(),
    user_identifier: user_identifier.trim().toUpperCase(),
    department: department.trim(),
    role: role || 'user',
    profile_photo_url: profile_photo_url || '',
    account_status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Generate unique cryptographic QR token
  const newCredential = {
    id: `qrc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    user_id: newUserId,
    token_hash: `QRC-${crypto.randomBytes(12).toString('hex').toUpperCase()}`,
    credential_status: 'active',
    issued_at: new Date().toISOString(),
    revoked_at: null,
    last_used_at: null,
  };

  db.profiles.unshift(newUser);
  db.qr_credentials.unshift(newCredential);
  saveDatabase();

  broadcastEvent('USER_CREATED', { user: { ...newUser, qr_credential: newCredential } });

  res.status(201).json({ user: { ...newUser, qr_credential: newCredential } });
});

// PUT /api/users/:id - update user details or status
app.put('/api/users/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const userIndex = db.profiles.findIndex((u) => u.id === id);

  if (userIndex === -1) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  const current = db.profiles[userIndex];
  const updates = req.body;

  db.profiles[userIndex] = {
    ...current,
    ...updates,
    id: current.id, // Immutable ID
    updated_at: new Date().toISOString(),
  };

  saveDatabase();

  const cred = db.qr_credentials.find((c) => c.user_id === id);
  const updatedUser = { ...db.profiles[userIndex], qr_credential: cred || null };

  broadcastEvent('USER_UPDATED', { user: updatedUser });
  res.json({ user: updatedUser });
});

// POST /api/users/:id/regenerate-qr - regenerate QR token (revoking previous)
app.post('/api/users/:id/regenerate-qr', (req: Request, res: Response) => {
  const { id } = req.params;
  const user = db.profiles.find((u) => u.id === id);

  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  // Revoke existing credentials
  db.qr_credentials.forEach((c) => {
    if (c.user_id === id && c.credential_status === 'active') {
      c.credential_status = 'revoked';
      c.revoked_at = new Date().toISOString();
    }
  });

  // Issue new credential
  const newCredential = {
    id: `qrc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    user_id: id,
    token_hash: `QRC-${crypto.randomBytes(12).toString('hex').toUpperCase()}`,
    credential_status: 'active',
    issued_at: new Date().toISOString(),
    revoked_at: null,
    last_used_at: null,
  };

  db.qr_credentials.unshift(newCredential);

  // Add audit log
  db.attendance_audit_logs.unshift({
    id: `log_${Date.now()}`,
    attendance_record_id: null,
    action: 'qr_regenerated',
    previous_values: { status: 'old_credential_revoked' },
    updated_values: { new_token_hash: newCredential.token_hash },
    performed_by: req.body.performed_by || 'Admin',
    created_at: new Date().toISOString(),
  });

  saveDatabase();

  const userWithCred = { ...user, qr_credential: newCredential };
  broadcastEvent('QR_REGENERATED', { user: userWithCred });

  res.json({ credential: newCredential, user: userWithCred });
});

// POST /api/users/:id/revoke-qr - revoke QR token
app.post('/api/users/:id/revoke-qr', (req: Request, res: Response) => {
  const { id } = req.params;
  const user = db.profiles.find((u) => u.id === id);

  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  db.qr_credentials.forEach((c) => {
    if (c.user_id === id) {
      c.credential_status = 'revoked';
      c.revoked_at = new Date().toISOString();
    }
  });

  db.attendance_audit_logs.unshift({
    id: `log_${Date.now()}`,
    attendance_record_id: null,
    action: 'qr_revoked',
    previous_values: { user_id: id },
    updated_values: { credential_status: 'revoked' },
    performed_by: req.body.performed_by || 'Admin',
    created_at: new Date().toISOString(),
  });

  saveDatabase();

  const cred = db.qr_credentials.find((c) => c.user_id === id);
  const userWithCred = { ...user, qr_credential: cred || null };
  broadcastEvent('QR_REVOKED', { user: userWithCred });

  res.json({ message: 'QR credential revoked.', user: userWithCred });
});

// POST /api/users/import-csv - batch import users
app.post('/api/users/import-csv', (req: Request, res: Response) => {
  const { csvData } = req.body;
  if (!csvData || typeof csvData !== 'string') {
    res.status(400).json({ error: 'CSV data string is required.' });
    return;
  }

  const lines = csvData.trim().split(/\r?\n/);
  if (lines.length < 2) {
    res.status(400).json({ error: 'CSV file must have a header row and at least one user record.' });
    return;
  }

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));
  const fullNameIdx = headers.findIndex((h) => h.includes('name'));
  const emailIdx = headers.findIndex((h) => h.includes('email'));
  const idIdx = headers.findIndex((h) => h.includes('id') || h.includes('identifier') || h.includes('student'));
  const deptIdx = headers.findIndex((h) => h.includes('dept') || h.includes('department') || h.includes('program'));
  const roleIdx = headers.findIndex((h) => h.includes('role'));

  if (fullNameIdx === -1 || emailIdx === -1 || idIdx === -1) {
    res.status(400).json({
      error: 'CSV headers must contain at least Full Name, Email, and Student/Employee ID columns.',
    });
    return;
  }

  let importedCount = 0;
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    // Simple CSV parser supporting quotes
    const parts: string[] = [];
    let insideQuote = false;
    let currentPart = '';
    for (let c = 0; c < rawLine.length; c++) {
      const char = rawLine[c];
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === ',' && !insideQuote) {
        parts.push(currentPart.trim());
        currentPart = '';
      } else {
        currentPart += char;
      }
    }
    parts.push(currentPart.trim());

    const fullName = parts[fullNameIdx]?.replace(/['"]/g, '').trim();
    const email = parts[emailIdx]?.replace(/['"]/g, '').trim().toLowerCase();
    const identifier = parts[idIdx]?.replace(/['"]/g, '').trim().toUpperCase();
    const dept = (deptIdx !== -1 ? parts[deptIdx]?.replace(/['"]/g, '').trim() : '') || 'General Department';
    const role = (roleIdx !== -1 ? parts[roleIdx]?.replace(/['"]/g, '').trim().toLowerCase() : '') || 'user';

    if (!fullName || !email || !identifier) {
      errors.push(`Row ${i + 1}: Incomplete data`);
      continue;
    }

    if (db.profiles.some((u) => u.email === email || u.user_identifier === identifier)) {
      errors.push(`Row ${i + 1}: Email ${email} or ID ${identifier} already registered`);
      continue;
    }

    const newUserId = `usr_${Date.now()}_${i}`;
    const newUser = {
      id: newUserId,
      auth_user_id: `auth_${newUserId}`,
      full_name: fullName,
      email: email,
      user_identifier: identifier,
      department: dept,
      role: role === 'admin' || role === 'operator' ? role : 'user',
      profile_photo_url: '',
      account_status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const newCredential = {
      id: `qrc_${Date.now()}_${i}`,
      user_id: newUserId,
      token_hash: `QRC-${crypto.randomBytes(12).toString('hex').toUpperCase()}`,
      credential_status: 'active',
      issued_at: new Date().toISOString(),
      revoked_at: null,
      last_used_at: null,
    };

    db.profiles.push(newUser);
    db.qr_credentials.push(newCredential);
    importedCount++;
  }

  saveDatabase();
  broadcastEvent('USERS_IMPORTED', { importedCount });

  res.json({ success: true, importedCount, errors });
});

// GET /api/sessions - list attendance sessions
app.get('/api/sessions', (req: Request, res: Response) => {
  res.json({ sessions: db.attendance_sessions });
});

// POST /api/sessions - create session
app.post('/api/sessions', (req: Request, res: Response) => {
  const {
    session_name,
    attendance_date,
    check_in_start,
    check_in_end,
    check_out_start,
    check_out_end,
    late_threshold,
    status,
    created_by,
  } = req.body;

  if (!session_name || !attendance_date || !check_in_start || !late_threshold) {
    res.status(400).json({ error: 'Session name, date, check-in start, and late threshold are required.' });
    return;
  }

  const newSession = {
    id: `ses_${Date.now()}`,
    session_name: session_name.trim(),
    attendance_date: attendance_date,
    check_in_start: check_in_start || '07:30',
    check_in_end: check_in_end || '11:00',
    check_out_start: check_out_start || '16:00',
    check_out_end: check_out_end || '18:30',
    late_threshold: late_threshold || '08:15',
    status: status || 'active',
    created_by: created_by || 'Admin',
    created_at: new Date().toISOString(),
  };

  db.attendance_sessions.unshift(newSession);
  saveDatabase();

  broadcastEvent('SESSION_CREATED', { session: newSession });
  res.status(201).json({ session: newSession });
});

// PUT /api/sessions/:id - update session
app.put('/api/sessions/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const idx = db.attendance_sessions.findIndex((s) => s.id === id);

  if (idx === -1) {
    res.status(404).json({ error: 'Session not found.' });
    return;
  }

  db.attendance_sessions[idx] = {
    ...db.attendance_sessions[idx],
    ...req.body,
    id: db.attendance_sessions[idx].id,
  };

  saveDatabase();
  broadcastEvent('SESSION_UPDATED', { session: db.attendance_sessions[idx] });
  res.json({ session: db.attendance_sessions[idx] });
});

// GET /api/attendance - get all attendance records with user & session details
app.get('/api/attendance', (req: Request, res: Response) => {
  const records = db.attendance_records.map((r) => {
    const user = db.profiles.find((u) => u.id === r.user_id);
    const session = db.attendance_sessions.find((s) => s.id === r.session_id);
    return {
      ...r,
      user: user || null,
      session: session || null,
    };
  });
  res.json({ records });
});

// POST /api/attendance/scan - Dedicated server-side validation & recording
app.post('/api/attendance/scan', (req: Request, res: Response) => {
  const { qrToken, sessionId, operatorName } = req.body;

  if (!qrToken) {
    res.status(400).json({
      success: false,
      reason: 'INVALID_CREDENTIAL',
      message: 'No QR code data received.',
    });
    return;
  }

  // Parse token if encoded as JSON
  let cleanedToken = qrToken.trim();
  try {
    const parsed = JSON.parse(cleanedToken);
    if (parsed && parsed.token) {
      cleanedToken = parsed.token;
    }
  } catch {
    // raw token format
  }

  // 1. Validate QR Token exists in database
  const credential = db.qr_credentials.find((c) => c.token_hash === cleanedToken);
  if (!credential) {
    res.status(404).json({
      success: false,
      reason: 'INVALID_CREDENTIAL',
      message: 'Invalid QR Credential. Token not found in database.',
    });
    return;
  }

  // 2. Validate Credential Status
  if (credential.credential_status === 'revoked') {
    res.status(403).json({
      success: false,
      reason: 'CREDENTIAL_REVOKED',
      message: 'QR Credential has been revoked by administration.',
    });
    return;
  }

  // 3. Find and Validate User Account
  const user = db.profiles.find((u) => u.id === credential.user_id);
  if (!user) {
    res.status(404).json({
      success: false,
      reason: 'INVALID_CREDENTIAL',
      message: 'User account linked to this credential was not found.',
    });
    return;
  }

  // 4. Validate Account Status
  if (user.account_status === 'deactivated') {
    res.status(403).json({
      success: false,
      reason: 'ACCOUNT_DEACTIVATED',
      message: `Account for ${user.full_name} is deactivated.`,
      user,
    });
    return;
  }

  // 5. Select Active Session
  let session = sessionId
    ? db.attendance_sessions.find((s) => s.id === sessionId)
    : db.attendance_sessions.find((s) => s.status === 'active');

  if (!session) {
    // If no active session found, pick the most recent session
    session = db.attendance_sessions[0];
  }

  if (!session) {
    res.status(400).json({
      success: false,
      reason: 'NO_ACTIVE_SESSION',
      message: 'No active attendance session configured.',
    });
    return;
  }

  const now = new Date();
  const currentIso = now.toISOString();

  // 6. Check existing attendance record in this session
  const existingRecordIndex = db.attendance_records.findIndex(
    (r) => r.user_id === user.id && r.session_id === session.id
  );

  if (existingRecordIndex !== -1) {
    const existing = db.attendance_records[existingRecordIndex];

    // If already checked in and check-out is requested / allowed
    const allowCheckout = db.system_settings.allow_checkout_same_qr !== false;
    if (allowCheckout && !existing.check_out_at) {
      // Record check-out
      db.attendance_records[existingRecordIndex] = {
        ...existing,
        check_out_at: currentIso,
        attendance_status: 'checked_out',
        updated_at: currentIso,
      };

      // Update credential last used
      credential.last_used_at = currentIso;

      // Log audit
      db.attendance_audit_logs.unshift({
        id: `log_${Date.now()}`,
        attendance_record_id: existing.id,
        action: 'check_out',
        previous_values: { check_out_at: null, attendance_status: existing.attendance_status },
        updated_values: { check_out_at: currentIso, attendance_status: 'checked_out' },
        performed_by: operatorName || 'QR Scanner Station',
        created_at: currentIso,
      });

      saveDatabase();

      const updatedRecord = {
        ...db.attendance_records[existingRecordIndex],
        user,
        session,
      };

      broadcastEvent('ATTENDANCE_RECORDED', { record: updatedRecord, type: 'check_out' });

      res.json({
        success: true,
        type: 'check_out',
        message: 'Check-out Recorded Successfully',
        record: updatedRecord,
        user,
        session,
        timestamp: currentIso,
      });
      return;
    }

    // Already checked out or duplicate check-in within cooldown
    res.status(409).json({
      success: false,
      reason: 'ALREADY_RECORDED',
      message: existing.check_out_at
        ? `Attendance and check-out already completed for ${user.full_name} in this session.`
        : `Attendance already recorded for ${user.full_name} in this session.`,
      user,
      session,
      record: existing,
    });
    return;
  }

  // 7. Calculate status (present vs late based on late_threshold)
  // Extract time HH:MM from now in current timezone
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const currentTimeStr = `${hours}:${minutes}`;

  let status: 'present' | 'late' = 'present';
  if (session.late_threshold && currentTimeStr > session.late_threshold) {
    status = 'late';
  }

  // 8. Record new check-in attendance
  const newRecord = {
    id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    user_id: user.id,
    session_id: session.id,
    check_in_at: currentIso,
    check_out_at: null,
    attendance_status: status,
    recorded_by: operatorName || 'QR Scanner Station',
    created_at: currentIso,
    updated_at: currentIso,
  };

  db.attendance_records.unshift(newRecord);
  credential.last_used_at = currentIso;

  // 9. Create Audit Log
  db.attendance_audit_logs.unshift({
    id: `log_${Date.now()}`,
    attendance_record_id: newRecord.id,
    action: 'check_in',
    previous_values: null,
    updated_values: {
      attendance_status: status,
      check_in_at: currentIso,
      session_name: session.session_name,
    },
    performed_by: operatorName || 'QR Scanner Station',
    created_at: currentIso,
  });

  saveDatabase();

  const fullRecord = {
    ...newRecord,
    user,
    session,
  };

  broadcastEvent('ATTENDANCE_RECORDED', { record: fullRecord, type: 'check_in' });

  res.status(201).json({
    success: true,
    type: 'check_in',
    message: 'Attendance Successfully Recorded',
    record: fullRecord,
    user,
    session,
    timestamp: currentIso,
  });
});

// PUT /api/attendance/:id - Manual correction with audit trail
app.put('/api/attendance/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { attendance_status, check_in_at, check_out_at, reason, performed_by } = req.body;

  const idx = db.attendance_records.findIndex((r) => r.id === id);
  if (idx === -1) {
    res.status(404).json({ error: 'Attendance record not found.' });
    return;
  }

  const previous = { ...db.attendance_records[idx] };
  const updated = {
    ...previous,
    attendance_status: attendance_status || previous.attendance_status,
    check_in_at: check_in_at || previous.check_in_at,
    check_out_at: check_out_at !== undefined ? check_out_at : previous.check_out_at,
    updated_at: new Date().toISOString(),
  };

  db.attendance_records[idx] = updated;

  // Log manual correction to audit trail
  db.attendance_audit_logs.unshift({
    id: `log_${Date.now()}`,
    attendance_record_id: id,
    action: 'manual_correction',
    previous_values: {
      status: previous.attendance_status,
      check_in: previous.check_in_at,
      check_out: previous.check_out_at,
    },
    updated_values: {
      status: updated.attendance_status,
      check_in: updated.check_in_at,
      check_out: updated.check_out_at,
      reason: reason || 'Administrative correction',
    },
    performed_by: performed_by || 'Admin',
    created_at: new Date().toISOString(),
  });

  saveDatabase();

  const user = db.profiles.find((u) => u.id === updated.user_id);
  const session = db.attendance_sessions.find((s) => s.id === updated.session_id);
  const fullRecord = { ...updated, user, session };

  broadcastEvent('ATTENDANCE_CORRECTED', { record: fullRecord });

  res.json({ record: fullRecord });
});

// GET /api/audit-logs - get audit trail
app.get('/api/audit-logs', (req: Request, res: Response) => {
  res.json({ logs: db.attendance_audit_logs });
});

// GET /api/settings - get system settings
app.get('/api/settings', (req: Request, res: Response) => {
  res.json({ settings: db.system_settings });
});

// PUT /api/settings - update settings
app.put('/api/settings', (req: Request, res: Response) => {
  db.system_settings = {
    ...db.system_settings,
    ...req.body,
  };
  saveDatabase();
  broadcastEvent('SETTINGS_UPDATED', { settings: db.system_settings });
  res.json({ settings: db.system_settings });
});

// POST /api/reset-demo - reset to initial data
app.post('/api/reset-demo', (req: Request, res: Response) => {
  db = generateInitialData();
  saveDatabase();
  broadcastEvent('DATABASE_RESET', {});
  res.json({ success: true, message: 'Database reset to initial institutional state.' });
});

// -------------------------------------------------------------
// VITE DEV SERVER OR STATIC PRODUCTION SERVING
// -------------------------------------------------------------
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`QR Attendance Cloud server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
