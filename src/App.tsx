import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Users,
  QrCode,
  Camera,
  ClipboardList,
  CalendarDays,
  BarChart3,
  Shield,
  Settings,
  UserCheck,
  Radio,
  Menu,
  X,
  LogOut,
  ChevronRight,
  Sparkles,
  ScanLine,
  Share2,
  ExternalLink,
} from 'lucide-react';

import {
  UserProfile,
  AttendanceRecord,
  AttendanceSession,
  AuditLog,
  SystemSettings,
  UserRole,
} from './types';
import { api } from './lib/api';
import { AdminDashboard } from './components/AdminDashboard';
import { UserManagement } from './components/UserManagement';
import { QrCredentialManager } from './components/QrCredentialManager';
import { QrScanner } from './components/QrScanner';
import { PublicScannerKiosk } from './components/PublicScannerKiosk';
import { ShareScannerModal } from './components/ShareScannerModal';
import { AdminLogin } from './components/AdminLogin';
import { AttendanceRecords } from './components/AttendanceRecords';
import { AttendanceSessions } from './components/AttendanceSessions';
import { ReportsExports } from './components/ReportsExports';
import { OperatorAccounts } from './components/OperatorAccounts';
import { AuditLogsView } from './components/AuditLogsView';
import { SystemSettingsView } from './components/SystemSettingsView';
import { UserPortal } from './components/UserPortal';

export default function App() {
  // Global Data State
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'connected' | 'connecting' | 'offline'>('connecting');

  // Navigation & Role State
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('qrc_admin_token') || null;
    }
    return null;
  });
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [currentRole, setCurrentRole] = useState<UserRole>('user'); // default to user for security
  const [activeTab, setActiveTab] = useState<string>('user-portal');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isKioskMode, setIsKioskMode] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Validate stored session on mount
  useEffect(() => {
    async function checkSession() {
      if (adminToken) {
        try {
          const res = await api.verifyAdminSession(adminToken);
          if (res.valid && res.user) {
            setIsAdminAuthenticated(true);
            setCurrentUser(res.user);
            setCurrentRole(res.user.role as UserRole);
            setActiveTab(res.user.role === 'operator' ? 'scanner' : 'dashboard');
            return;
          }
        } catch {
          // Token invalid or expired
        }
        sessionStorage.removeItem('qrc_admin_token');
        setAdminToken(null);
        setIsAdminAuthenticated(false);
      }
    }
    checkSession();
  }, [adminToken]);

  const handleLoginSuccess = (user: UserProfile, token: string) => {
    sessionStorage.setItem('qrc_admin_token', token);
    setAdminToken(token);
    setIsAdminAuthenticated(true);
    setCurrentUser(user);
    setCurrentRole(user.role);
    if (user.role === 'operator') {
      setActiveTab('scanner');
    } else {
      setActiveTab('dashboard');
    }
  };

  const handleLogout = async () => {
    if (adminToken) {
      try {
        await api.logoutAdmin(adminToken);
      } catch (e) {
        console.warn('Logout error:', e);
      }
    }
    sessionStorage.removeItem('qrc_admin_token');
    setAdminToken(null);
    setIsAdminAuthenticated(false);
    const regular = users.find((u) => u.role === 'user') || users[0];
    if (regular) setCurrentUser(regular);
    setCurrentRole('user');
    setActiveTab('user-portal');
  };

  const enterKioskMode = () => {
    setIsKioskMode(true);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('view', 'scanner');
      window.history.pushState({ kiosk: true }, '', url.toString());
    }
  };

  const exitKioskMode = () => {
    setIsKioskMode(false);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('view');
      url.searchParams.delete('mode');
      url.searchParams.delete('session');
      window.history.pushState({}, '', url.pathname + (url.search ? url.search : ''));
    }
  };

  // Auto-detect separate/shareable public kiosk mode from URL
  // Matches ?view=scanner, ?view=kiosk, /scanner, /kiosk, #scanner, #kiosk
  useEffect(() => {
    const checkUrlForKiosk = () => {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const isScannerView =
        params.get('view') === 'kiosk' ||
        params.get('view') === 'scanner' ||
        params.get('mode') === 'kiosk' ||
        path.endsWith('/scanner') ||
        path.endsWith('/kiosk') ||
        hash === '#scanner' ||
        hash === '#kiosk';
      setIsKioskMode(isScannerView);
    };

    checkUrlForKiosk();
    window.addEventListener('popstate', checkUrlForKiosk);
    window.addEventListener('hashchange', checkUrlForKiosk);
    return () => {
      window.removeEventListener('popstate', checkUrlForKiosk);
      window.removeEventListener('hashchange', checkUrlForKiosk);
    };
  }, []);

  // Fetch initial data
  const loadAllData = useCallback(async () => {
    try {
      const [u, r, s, l, set] = await Promise.all([
        api.getUsers(),
        api.getAttendance(),
        api.getSessions(),
        api.getAuditLogs(),
        api.getSettings(),
      ]);
      setUsers(u);
      setRecords(r);
      setSessions(s);
      setAuditLogs(l);
      setSettings(set);

      if (!currentUser && u.length > 0) {
        if (isAdminAuthenticated) {
          const adminUser = u.find((usr) => usr.role === 'admin') || u[0];
          setCurrentUser(adminUser);
        } else {
          const regUser = u.find((usr) => usr.role === 'user') || u[0];
          setCurrentUser(regUser);
        }
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser, isAdminAuthenticated]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Connect to SSE for Instant Multi-Device Realtime Synchronization
  useEffect(() => {
    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource('/api/events');

      eventSource.onopen = () => {
        setSyncStatus('connected');
      };

      eventSource.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.type === 'ATTENDANCE_RECORDED') {
            const { record } = payload.data;
            setRecords((prev) => {
              const existingIdx = prev.findIndex((r) => r.id === record.id);
              if (existingIdx !== -1) {
                const copy = [...prev];
                copy[existingIdx] = record;
                return copy;
              }
              return [record, ...prev];
            });
          } else if (payload.type === 'ATTENDANCE_CORRECTED') {
            const { record } = payload.data;
            setRecords((prev) => prev.map((r) => (r.id === record.id ? record : r)));
          } else if (payload.type === 'USER_CREATED') {
            setUsers((prev) => [payload.data.user, ...prev]);
          } else if (payload.type === 'USER_UPDATED' || payload.type === 'QR_REGENERATED' || payload.type === 'QR_REVOKED') {
            setUsers((prev) =>
              prev.map((u) => (u.id === payload.data.user.id ? payload.data.user : u))
            );
          } else if (payload.type === 'SESSION_CREATED') {
            setSessions((prev) => [payload.data.session, ...prev]);
          } else if (payload.type === 'SESSION_UPDATED') {
            setSessions((prev) =>
              prev.map((s) => (s.id === payload.data.session.id ? payload.data.session : s))
            );
          } else if (payload.type === 'DATABASE_RESET') {
            loadAllData();
          }
        } catch (err) {
          console.error('Error processing SSE:', err);
        }
      };

      eventSource.onerror = () => {
        setSyncStatus('offline');
      };
    } catch (err) {
      console.warn('SSE not supported or failed to connect:', err);
      setSyncStatus('offline');
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [loadAllData]);

  // Role switching
  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role);
    if (role === 'operator') {
      setActiveTab('scanner');
      const op = users.find((u) => u.role === 'operator') || users[0];
      if (op) setCurrentUser(op);
    } else if (role === 'user') {
      setActiveTab('user-portal');
      const reg = users.find((u) => u.role === 'user') || users[0];
      if (reg) setCurrentUser(reg);
    } else {
      // Role is admin: If not authenticated, require Admin Login
      if (!isAdminAuthenticated) {
        setActiveTab('admin-login');
      } else {
        setActiveTab('dashboard');
        const adm = users.find((u) => u.role === 'admin') || users[0];
        if (adm) setCurrentUser(adm);
      }
    }
  };

  // Nav items based on role
  const getNavItems = () => {
    if (currentRole === 'operator') {
      return [
        { id: 'scanner', label: 'QR Scanner Station', icon: Camera },
        { id: 'public-kiosk', label: 'Public Kiosk Terminal', icon: ScanLine },
        { id: 'records', label: 'Attendance Records', icon: ClipboardList },
      ];
    }
    if (currentRole === 'user') {
      return [
        { id: 'user-portal', label: 'My Pass & Attendance', icon: QrCode },
      ];
    }

    // Admin role
    if (!isAdminAuthenticated) {
      return [
        { id: 'admin-login', label: 'Admin Security Gateway', icon: Shield },
      ];
    }

    return [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'users', label: 'User Management', icon: Users },
      { id: 'credentials', label: 'QR Credentials', icon: QrCode },
      { id: 'scanner', label: 'QR Attendance Scanner', icon: Camera },
      { id: 'public-kiosk', label: 'Public Kiosk Terminal', icon: ScanLine },
      { id: 'records', label: 'Attendance Records', icon: ClipboardList },
      { id: 'sessions', label: 'Attendance Sessions', icon: CalendarDays },
      { id: 'reports', label: 'Reports & Exports', icon: BarChart3 },
      { id: 'operators', label: 'Operator Accounts', icon: Shield },
      { id: 'audit', label: 'Audit Trail', icon: ClipboardList },
      { id: 'settings', label: 'System Settings', icon: Settings },
    ];
  };

  const navItems = getNavItems();
  const orgName = settings?.organization_name || 'OSC Scholar Duty Tracker';
  const orgLogo = settings?.organization_logo_url || '/src/assets/images/org_institutional_logo_1791949676528.jpg';

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">Connecting to Attendance Cloud...</h3>
          <p className="text-xs text-slate-400 mt-1">Initializing database & real-time sync</p>
        </div>
      </div>
    );
  }

  // Full-Screen Public Kiosk Mode
  if (isKioskMode) {
    return (
      <PublicScannerKiosk
        sessions={sessions}
        settings={settings}
        allUsers={users}
        onExitKiosk={exitKioskMode}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      {/* =========================================================================
          TOP BAR CONTRACT (Frontend Design Constitution: 3 Zones, 1 Row)
          [Brand Wordmark] --- [Nav Tabs / Role Context] --- [Primary Action / Status]
         ========================================================================= */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 lg:px-8 py-3 flex items-center justify-between gap-8 no-print shadow-xs">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2.5">
            <img
              src={orgLogo}
              alt="OSC Logo"
              className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
              referrerPolicy="no-referrer"
            />
            <div className="leading-tight">
              <span className="text-sm font-bold tracking-tight text-slate-900 block whitespace-nowrap">
                {orgName}
              </span>
              <span className="text-[10px] text-slate-500 font-medium tracking-wide">
                Scholar Duty &amp; Attendance Monitoring
              </span>
            </div>
          </div>
        </div>

        {/* Zone 2: Navigation Links (Single-line) */}
        <div className="hidden lg:flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
            <span
              className={`w-2 h-2 rounded-full ${
                syncStatus === 'connected'
                  ? 'bg-emerald-500'
                  : syncStatus === 'connecting'
                  ? 'bg-amber-500 animate-pulse'
                  : 'bg-red-500'
              }`}
            />
            <span className="whitespace-nowrap">
              {syncStatus === 'connected' ? 'Central Database Synced' : 'Syncing...'}
            </span>
          </div>

          <span className="text-slate-300">|</span>

          <span className="text-slate-500 whitespace-nowrap">
            Active Session: <strong className="text-slate-800">{sessions[0]?.session_name || 'Daily Track'}</strong>
          </span>
        </div>

        {/* Zone 3: 1 Primary Action (Share Scanner + Public Kiosk View + Role Switcher + Auth) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors shadow-xs whitespace-nowrap border border-slate-200"
            title="Get shareable link & QR code for public entrance scanner"
          >
            <Share2 className="w-3.5 h-3.5 text-blue-600" />
            Share Scanner
          </button>

          <button
            onClick={enterKioskMode}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-xs whitespace-nowrap"
            title="Launch full-screen public attendance terminal"
          >
            <ScanLine className="w-3.5 h-3.5" />
            Public Kiosk View
          </button>

          {/* Log in / Log out button */}
          {isAdminAuthenticated ? (
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-colors shadow-xs whitespace-nowrap"
              title="Sign out of administrative session"
            >
              <LogOut className="w-3.5 h-3.5" />
              Log Out
            </button>
          ) : (
            <button
              onClick={() => {
                setCurrentRole('admin');
                setActiveTab('admin-login');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition-colors shadow-xs whitespace-nowrap"
              title="Authenticate as Administrator"
            >
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              Admin Login
            </button>
          )}

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => handleRoleChange('admin')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                currentRole === 'admin'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Admin {isAdminAuthenticated ? '✓' : ''}
            </button>
            <button
              onClick={() => handleRoleChange('operator')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                currentRole === 'operator'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Operator
            </button>
            <button
              onClick={() => handleRoleChange('user')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                currentRole === 'user'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Passholder
            </button>
          </div>
        </div>
      </header>

      {/* Main Body with Sidebar + Content */}
      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        {/* Sidebar Navigation */}
        <aside
          className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 transform md:relative md:translate-x-0 transition-transform duration-200 ease-in-out no-print ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          } flex flex-col justify-between pt-16 md:pt-0`}
        >
          <div className="p-4 space-y-1">
            <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {currentRole === 'admin'
                ? isAdminAuthenticated
                  ? 'Administration Portal (Secured)'
                  : 'Admin Gateway (Locked)'
                : currentRole === 'operator'
                ? 'Scanner Operator Portal'
                : 'User Portal'}
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'public-kiosk') {
                      setIsKioskMode(true);
                    } else {
                      setActiveTab(item.id);
                    }
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* User profile & Logout footer inside sidebar */}
          {currentUser && (
            <div className="p-4 border-t border-slate-200 bg-slate-50/50">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  {currentUser.profile_photo_url ? (
                    <img
                      src={currentUser.profile_photo_url}
                      alt={currentUser.full_name}
                      className="w-8 h-8 rounded-full object-cover shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
                      {currentUser.full_name[0]}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">{currentUser.full_name}</p>
                    <p className="text-[10px] font-mono text-slate-500 uppercase">{currentUser.role}</p>
                  </div>
                </div>

                {isAdminAuthenticated && (
                  <button
                    onClick={handleLogout}
                    className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                    title="Log Out Session"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </aside>

        {/* Content Viewport */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 min-w-0 overflow-y-auto">
          {/* Security Gate: If accessing Admin role without authentication, force AdminLogin */}
          {currentRole === 'admin' && !isAdminAuthenticated && (
            <AdminLogin
              settings={settings}
              onLoginSuccess={handleLoginSuccess}
              onCancel={() => handleRoleChange('user')}
            />
          )}

          {/* Protected Admin Views: ONLY rendered when isAdminAuthenticated */}
          {currentRole === 'admin' && isAdminAuthenticated && (
            <>
              {activeTab === 'dashboard' && (
                <AdminDashboard
                  users={users}
                  records={records}
                  sessions={sessions}
                  onNavigateToTab={(tab) => setActiveTab(tab)}
                  onOpenUserModal={() => setActiveTab('users')}
                />
              )}

              {activeTab === 'users' && (
                <UserManagement
                  users={users}
                  settings={settings}
                  onRefreshUsers={loadAllData}
                  operatorName={currentUser?.full_name || 'Admin'}
                />
              )}

              {activeTab === 'credentials' && (
                <QrCredentialManager
                  users={users}
                  settings={settings}
                  onRefreshUsers={loadAllData}
                  operatorName={currentUser?.full_name || 'Admin'}
                />
              )}

              {activeTab === 'sessions' && (
                <AttendanceSessions
                  sessions={sessions}
                  onRefreshSessions={loadAllData}
                  operatorName={currentUser?.full_name || 'Admin'}
                />
              )}

              {activeTab === 'reports' && (
                <ReportsExports
                  records={records}
                  users={users}
                  sessions={sessions}
                />
              )}

              {activeTab === 'operators' && (
                <OperatorAccounts
                  users={users}
                  onRefreshUsers={loadAllData}
                />
              )}

              {activeTab === 'audit' && (
                <AuditLogsView
                  logs={auditLogs}
                  onRefreshLogs={loadAllData}
                />
              )}

              {activeTab === 'settings' && (
                <SystemSettingsView
                  settings={settings}
                  onRefreshSettings={loadAllData}
                  onResetData={async () => {
                    await api.resetDemoData();
                    loadAllData();
                  }}
                />
              )}
            </>
          )}

          {/* Scanner View (Accessible by Operator or authenticated Admin) */}
          {activeTab === 'scanner' && (
            <QrScanner
              sessions={sessions}
              activeSessionId={sessions[0]?.id}
              operatorName={currentUser?.full_name || 'Attendance Operator'}
              allUsers={users}
              onScanComplete={() => {}}
            />
          )}

          {/* Master Attendance Records */}
          {activeTab === 'records' && (
            <AttendanceRecords
              records={records}
              users={users}
              sessions={sessions}
              onRefreshRecords={loadAllData}
              operatorName={currentUser?.full_name || 'Admin'}
            />
          )}

          {/* User Passholder Portal */}
          {activeTab === 'user-portal' && currentUser && (
            <UserPortal
              currentUser={currentUser}
              allUsers={users}
              records={records}
              settings={settings}
              onSwitchUser={(user) => setCurrentUser(user)}
            />
          )}
        </main>
      </div>
    </div>
  );
}
