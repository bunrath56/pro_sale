/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  LeadSource,
  ActivitySource,
  SalesStore,
  DailyRecord,
  ActiveTab,
  User,
  SecurityAuditLog,
} from './types/sales';
import { DEFAULT_USERS, DEFAULT_SOURCES, DEFAULT_FUS } from './data/defaults';
import { hashPassword, generateSalt } from './utils/cryptoSecurity';
import { Header } from './components/Header';
import { InputTab } from './components/InputTab';
import { DashboardTab } from './components/DashboardTab';
import { HistoryTab } from './components/HistoryTab';
import { UserManagementTab } from './components/UserManagementTab';
import { SettingsTab } from './components/SettingsTab';
import { SecurityTab } from './components/SecurityTab';
import { LoginForm } from './components/LoginForm';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { SessionLockModal } from './components/SessionLockModal';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { initGoogleAuth, getAccessToken, getGoogleUser } from './services/googleAuth';
import {
  ensureSpreadsheet,
  fetchAllFromGoogleSheets,
  syncAllToGoogleSheets,
  getStoredSheetInfo,
  saveStoredSheetInfo,
  connectViaSpreadsheetUrl,
  copySalesToClipboard,
  SheetDatabaseInfo,
  SyncState,
} from './services/googleSheetsService';

export default function App() {
  // Clean Slate Migration: Ensure all demo/test data is cleared from localStorage
  (() => {
    try {
      const CLEAN_KEY = 'masterit_clean_slate_2026_10_22_real_db_v3';
      if (typeof window !== 'undefined' && localStorage.getItem(CLEAN_KEY) !== 'true') {
        localStorage.removeItem('masterit_sales');
        localStorage.removeItem('masterit_users');
        localStorage.removeItem('masterit_security_audit_logs');
        localStorage.removeItem('masterit_custom_sources');
        localStorage.removeItem('masterit_current_user_id');
        localStorage.setItem(CLEAN_KEY, 'true');
      }
    } catch (e) {
      console.warn('Clean slate check:', e);
    }
  })();

  // 1. Users state (Clean - only genuine owner/admins)
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem('masterit_users');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load users', e);
    }
    return DEFAULT_USERS;
  });

  // 2. Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('masterit_is_authenticated');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  // 3. Current User state
  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('masterit_current_user_id');
      if (saved && users.some((u) => u.id === saved)) return saved;
    } catch (e) {
      console.error(e);
    }
    return 'user_sutak';
  });

  const currentUser = users.find((u) => u.id === currentUserId) || users[0] || DEFAULT_USERS[0];

  // 4. Security Audit Logs state (Clean empty array)
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLog[]>(() => {
    try {
      const saved = localStorage.getItem('masterit_security_audit_logs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to load audit logs', e);
    }
    return [];
  });

  // 5. Inactivity Session Lock State
  const [isSessionLocked, setIsSessionLocked] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 6. Lead Sources state
  const [sources, setSources] = useState<LeadSource[]>(() => {
    try {
      const saved = localStorage.getItem('masterit_custom_sources');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load custom sources', e);
    }
    return DEFAULT_SOURCES;
  });

  const fus: ActivitySource[] = DEFAULT_FUS;

  // 7. Sales Store state (Clean empty store)
  const [salesStore, setSalesStore] = useState<SalesStore>(() => {
    try {
      const saved = localStorage.getItem('masterit_sales');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {
      console.error('Failed to load sales store', e);
    }
    return {};
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [inputDateTarget, setInputDateTarget] = useState<string | undefined>(undefined);
  const [inputSellerTarget, setInputSellerTarget] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 8. Google Sheets Cloud Database State
  const [sheetInfo, setSheetInfo] = useState<SheetDatabaseInfo | null>(() => getStoredSheetInfo());
  const [syncState, setSyncState] = useState<SyncState>(() =>
    getStoredSheetInfo() ? 'synced' : 'disconnected'
  );
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [isGoogleSheetsModalOpen, setIsGoogleSheetsModalOpen] = useState(false);
  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState(true);
  const autoSyncDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Google Auth state listener & Auto-pull live database on connect
  useEffect(() => {
    const unsub = initGoogleAuth(async (user, token) => {
      if (user && token && sheetInfo) {
        setSyncState('syncing');
        setSyncMessage('កំពុងភ្ជាប់ & ទាញទិន្នន័យពី Google Sheets...');
        try {
          const fetched = await fetchAllFromGoogleSheets(token, sheetInfo);
          if (fetched.salesStore && Object.keys(fetched.salesStore).length > 0) {
            setSalesStore(fetched.salesStore);
            localStorage.setItem('masterit_sales', JSON.stringify(fetched.salesStore));
          }
          if (fetched.sources && fetched.sources.length > 0) {
            setSources(fetched.sources);
            localStorage.setItem('masterit_custom_sources', JSON.stringify(fetched.sources));
          }
          if (fetched.users && fetched.users.length > 0) {
            setUsers(fetched.users);
            localStorage.setItem('masterit_users', JSON.stringify(fetched.users));
          }
          setSyncState('synced');
          setSyncMessage(`បានទាញទិន្នន័យពី Google Sheets: ${sheetInfo.spreadsheetName}`);
        } catch (err: any) {
          console.warn('Initial pull from Google Sheets:', err);
          setSyncState('synced');
        }
      } else if (!user) {
        setSyncState('disconnected');
      }
    });
    return () => unsub();
  }, [sheetInfo]);

  // High-Speed Background Sync Engine (Debounced)
  const scheduleBackgroundSync = useCallback(
    (
      currentSales: SalesStore,
      currentSources: LeadSource[],
      currentUsers: User[],
      currentLogs: SecurityAuditLog[]
    ) => {
      if (!isAutoSyncEnabled || !sheetInfo) return;

      if (autoSyncDebounceRef.current) {
        clearTimeout(autoSyncDebounceRef.current);
      }

      autoSyncDebounceRef.current = setTimeout(async () => {
        const token = await getAccessToken();
        if (!token && !sheetInfo.webAppUrl) return;

        setSyncState('syncing');
        try {
          await syncAllToGoogleSheets(
            token,
            sheetInfo,
            currentSales,
            currentSources,
            currentUsers,
            currentLogs
          );
          const updatedInfo = {
            ...sheetInfo,
            lastSyncedAt: new Date().toISOString(),
          };
          setSheetInfo(updatedInfo);
          saveStoredSheetInfo(updatedInfo);
          setSyncState('synced');
          setSyncMessage(`Synced to Google Sheets at ${new Date().toLocaleTimeString()}`);
        } catch (err: any) {
          console.error('Background sync failed:', err);
          setSyncState('error');
          setSyncMessage(err.message || 'Sync error');
        }
      }, 1500); // 1.5s debounce ensures smooth 0ms local response without hitting API quotas
    },
    [isAutoSyncEnabled, sheetInfo]
  );

  // Sync users to storage
  const saveUsers = useCallback(
    (newUsers: User[]) => {
      setUsers(newUsers);
      localStorage.setItem('masterit_users', JSON.stringify(newUsers));
      scheduleBackgroundSync(salesStore, sources, newUsers, auditLogs);
    },
    [salesStore, sources, auditLogs, scheduleBackgroundSync]
  );

  // Save audit log helper
  const recordAuditLog = useCallback(
    (
      action: SecurityAuditLog['action'],
      target: string | undefined,
      severity: SecurityAuditLog['severity'],
      details: string,
      actorOverride?: { id: string; name: string; role: any }
    ) => {
      const newLog: SecurityAuditLog = {
        id: 'sec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        timestamp: new Date().toISOString(),
        action,
        actorId: actorOverride?.id || currentUser.id || 'system',
        actorName: actorOverride?.name || currentUser.name || 'System',
        actorRole: actorOverride?.role || currentUser.role || 'system',
        target,
        severity,
        details,
      };

      setAuditLogs((prev) => {
        const updated = [newLog, ...prev].slice(0, 500); // retain last 500 records
        localStorage.setItem('masterit_security_audit_logs', JSON.stringify(updated));
        return updated;
      });
    },
    [currentUser]
  );

  // Background Migration: Hash legacy plaintext passwords with cryptographic salts
  useEffect(() => {
    const migratePasswords = async () => {
      let needsMigration = false;
      const migrated = await Promise.all(
        users.map(async (u) => {
          if (!u.passwordHash) {
            needsMigration = true;
            const plainPass = u.password || '123456';
            const salt = generateSalt(16);
            const hash = await hashPassword(plainPass, salt);
            return {
              ...u,
              password: '', // Remove raw plaintext
              passwordSalt: salt,
              passwordHash: hash,
              failedLoginAttempts: u.failedLoginAttempts || 0,
              lockedUntil: u.lockedUntil || null,
            };
          }
          return u;
        })
      );

      if (needsMigration) {
        saveUsers(migrated);
      }
    };

    migratePasswords();
  }, [users, saveUsers]);

  // Inactivity auto-lock monitor (15 minutes = 900,000 ms)
  useEffect(() => {
    if (!isAuthenticated || isSessionLocked) return;

    const resetInactivityTimer = () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = setTimeout(() => {
        setIsSessionLocked(true);
        recordAuditLog(
          'SESSION_LOCKED',
          currentUser.name,
          'warn',
          'វគ្គការងារត្រូវបានចាក់សោស្វ័យប្រវត្តិដោយសារអសកម្មភាពលើសពី 15 នាទី'
        );
      }, 15 * 60 * 1000);
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((evt) => window.addEventListener(evt, resetInactivityTimer));
    resetInactivityTimer();

    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      events.forEach((evt) => window.removeEventListener(evt, resetInactivityTimer));
    };
  }, [isAuthenticated, isSessionLocked, currentUser.name, recordAuditLog]);

  // Ensure non-dev users cannot view or stay on dev-only tabs (users, settings, security)
  useEffect(() => {
    if (
      currentUser.role !== 'dev' &&
      (activeTab === 'users' || activeTab === 'settings' || activeTab === 'security')
    ) {
      setActiveTab(currentUser.role === 'seller' ? 'input' : 'dashboard');
    }
  }, [currentUser.role, activeTab]);

  // Authentication Handlers
  const handleLogin = (user: User) => {
    setCurrentUserId(user.id);
    setIsAuthenticated(true);
    setIsSessionLocked(false);
    localStorage.setItem('masterit_current_user_id', user.id);
    localStorage.setItem('masterit_is_authenticated', 'true');

    // Update user login timestamp & clear failed attempts
    const updatedUsers = users.map((u) =>
      u.id === user.id
        ? {
            ...u,
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: new Date().toISOString(),
          }
        : u
    );
    saveUsers(updatedUsers);

    recordAuditLog(
      'AUTH_LOGIN_SUCCESS',
      user.name,
      'info',
      `ចូលប្រើប្រព័ន្ធដោយជោគជ័យ (Role: ${user.role})`,
      { id: user.id, name: user.name, role: user.role }
    );

    if (user.role === 'seller') {
      setActiveTab('input');
    } else {
      setActiveTab('dashboard');
    }
  };

  const handleFailedLogin = (user: User, isLocked: boolean, lockedUntil?: number | null) => {
    const updatedUsers = users.map((u) => {
      if (u.id === user.id) {
        return {
          ...u,
          failedLoginAttempts: (u.failedLoginAttempts || 0) + 1,
          lockedUntil: isLocked ? lockedUntil : u.lockedUntil,
        };
      }
      return u;
    });
    saveUsers(updatedUsers);

    if (isLocked) {
      recordAuditLog(
        'AUTH_LOCKOUT',
        user.email,
        'danger',
        `គណនី [${user.name}] ត្រូវបានចាក់សោ 10 នាទី ដោយសារការបញ្ចូលខុស 5 លើក (Brute Force Defense Triggered)`,
        { id: user.id, name: user.name, role: user.role }
      );
    } else {
      const attempts = (user.failedLoginAttempts || 0) + 1;
      recordAuditLog(
        'AUTH_LOGIN_FAILED',
        user.email,
        'warn',
        `ការបញ្ចូលពាក្យសម្ងាត់មិនត្រឹមត្រូវ (លើកទី ${attempts}/5)`,
        { id: user.id, name: user.name, role: user.role }
      );
    }
  };

  const handleUnlockUser = (userId: string) => {
    const targetUser = users.find((u) => u.id === userId);
    const updatedUsers = users.map((u) => {
      if (u.id === userId) {
        return {
          ...u,
          failedLoginAttempts: 0,
          lockedUntil: null,
        };
      }
      return u;
    });
    saveUsers(updatedUsers);

    recordAuditLog(
      'AUTH_UNLOCK',
      targetUser?.name || userId,
      'info',
      `អ្នកគ្រប់គ្រងបានដោះសោគណនី [${targetUser?.name}] ដោយជោគជ័យ`
    );
  };

  const handleLogout = () => {
    recordAuditLog('AUTH_LOGOUT', currentUser.name, 'info', 'អ្នកប្រើប្រាស់បានចាកចេញពីប្រព័ន្ធ');
    setIsAuthenticated(false);
    setIsSessionLocked(false);
    localStorage.setItem('masterit_is_authenticated', 'false');
  };

  const handleUnlockSession = () => {
    setIsSessionLocked(false);
    recordAuditLog(
      'SESSION_UNLOCKED',
      currentUser.name,
      'info',
      'បានដោះសោវគ្គការងារត្រឡប់មកវិញដោយជោគជ័យ'
    );
  };

  const handlePasswordChanged = (updatedUser: User) => {
    const updated = users.map((u) => (u.id === updatedUser.id ? updatedUser : u));
    saveUsers(updated);
    recordAuditLog(
      'PASSWORD_CHANGED',
      updatedUser.name,
      'info',
      `ពាក្យសម្ងាត់ត្រូវបានផ្លាស់ប្តូរ និង Encrypt ជាមួយ SHA-256 + Salt ថ្មី`
    );
  };

  // Sync sources
  const saveSources = (newSources: LeadSource[]) => {
    setSources(newSources);
    localStorage.setItem('masterit_custom_sources', JSON.stringify(newSources));
    scheduleBackgroundSync(salesStore, newSources, users, auditLogs);
  };

  // Sync salesStore
  const saveStore = (newStore: SalesStore) => {
    setSalesStore(newStore);
    localStorage.setItem('masterit_sales', JSON.stringify(newStore));
    scheduleBackgroundSync(newStore, sources, users, auditLogs);
  };

  // Google Sheets DB Handlers
  const handleConnectSpreadsheet = async () => {
    const token = await getAccessToken();
    if (!token) {
      alert('សូម Sign in with Google ជាមុនសិន!');
      return;
    }

    setSyncState('syncing');
    setSyncMessage('កំពុងស្វែងរក ឬបង្កើត Google Spreadsheet ថ្មី...');
    try {
      const info = await ensureSpreadsheet(token);
      setSheetInfo(info);
      setSyncState('syncing');
      setSyncMessage(`បានភ្ជាប់ជាមួយ Spreadsheet [${info.spreadsheetName}]! កំពុងទាញទិន្នន័យ...`);

      // Attempt to pull existing live data from the sheet first
      const fetched = await fetchAllFromGoogleSheets(token, info);
      const hasRemoteSales = fetched.salesStore && Object.keys(fetched.salesStore).length > 0;

      if (hasRemoteSales) {
        setSalesStore(fetched.salesStore);
        localStorage.setItem('masterit_sales', JSON.stringify(fetched.salesStore));
        if (fetched.sources && fetched.sources.length > 0) {
          setSources(fetched.sources);
          localStorage.setItem('masterit_custom_sources', JSON.stringify(fetched.sources));
        }
        if (fetched.users && fetched.users.length > 0) {
          setUsers(fetched.users);
          localStorage.setItem('masterit_users', JSON.stringify(fetched.users));
        }
        setSyncState('synced');
        setSyncMessage(`✅ បានភ្ជាប់ & ទាញទិន្នន័យពិតពី Google Sheets [${info.spreadsheetName}]!`);
      } else {
        await syncAllToGoogleSheets(
          token,
          info,
          salesStore,
          sources,
          users,
          auditLogs
        );
        setSyncState('synced');
        setSyncMessage(`✅ បានភ្ជាប់ជាមួយ Google Sheets [${info.spreadsheetName}] ជា Database ពិតប្រាកដ!`);
      }
    } catch (err: any) {
      console.error(err);
      setSyncState('error');
      setSyncMessage('បរាជ័យក្នុងការភ្ជាប់: ' + (err.message || 'Error'));
    }
  };

  const handleConnectViaUrl = async (urlOrId: string, webAppUrl?: string) => {
    try {
      setSyncState('syncing');
      setSyncMessage('កំពុងភ្ជាប់ជាមួយ Google Spreadsheet...');
      const info = connectViaSpreadsheetUrl(urlOrId, undefined, webAppUrl);
      setSheetInfo(info);
      setSyncState('synced');
      setSyncMessage(`បានភ្ជាប់ជាមួយ Spreadsheet ដោយជោគជ័យ!`);
      if (webAppUrl) {
        await syncAllToGoogleSheets(
          null,
          info,
          salesStore,
          sources,
          users,
          auditLogs
        );
      }
    } catch (err: any) {
      console.error(err);
      setSyncState('error');
      setSyncMessage('បរាជ័យក្នុងការភ្ជាប់: ' + (err.message || 'Error'));
    }
  };

  const handleDisconnectSpreadsheet = () => {
    saveStoredSheetInfo(null);
    setSheetInfo(null);
    setSyncState('disconnected');
    setSyncMessage(null);
  };

  const handlePushToSheets = async () => {
    if (!sheetInfo) return;
    const token = await getAccessToken();

    // If no OAuth token and no webAppUrl, copy to clipboard and notify
    if (!token && !sheetInfo.webAppUrl) {
      await copySalesToClipboard(salesStore);
      window.open(sheetInfo.spreadsheetUrl, '_blank');
      setSyncState('synced');
      setSyncMessage('✅ បានចម្លងទិន្នន័យរួចរាល់! សូមបើក Google Sheet ហើយចុច Ctrl+V (Paste)');
      return;
    }

    setSyncState('syncing');
    setSyncMessage('កំពុង Sync ទិន្នន័យទាំងអស់ទៅ Google Sheets...');
    try {
      await syncAllToGoogleSheets(
        token,
        sheetInfo,
        salesStore,
        sources,
        users,
        auditLogs
      );
      const updatedInfo = {
        ...sheetInfo,
        lastSyncedAt: new Date().toISOString(),
      };
      setSheetInfo(updatedInfo);
      saveStoredSheetInfo(updatedInfo);
      setSyncState('synced');
      setSyncMessage('✅ បានបញ្ចូលទិន្នន័យទៅ Google Sheets ដោយជោគជ័យ!');
      recordAuditLog(
        'SETTINGS_UPDATED',
        'Google Sheets DB',
        'info',
        'បានធ្វើសមកាលកម្មទិន្នន័យទៅ Google Sheets'
      );
    } catch (err: any) {
      console.error(err);
      setSyncState('error');
      setSyncMessage('❌ បរាជ័យក្នុងការ Sync: ' + err.message);
    }
  };

  const handlePullFromSheets = async () => {
    if (!sheetInfo) return;
    const token = await getAccessToken();
    if (!token && !sheetInfo.webAppUrl) {
      alert('ដើម្បីទាញទិន្នន័យពី Google Sheets សូមភ្ជាប់តាម Web App URL ឬចូលតាម Google OAuth');
      return;
    }

    setSyncState('syncing');
    setSyncMessage('កំពុងទាញទិន្នន័យពី Google Sheets...');
    try {
      const fetched = await fetchAllFromGoogleSheets(token, sheetInfo);
      if (fetched.salesStore && Object.keys(fetched.salesStore).length > 0) {
        setSalesStore(fetched.salesStore);
        localStorage.setItem('masterit_sales', JSON.stringify(fetched.salesStore));
      }
      if (fetched.sources && fetched.sources.length > 0) {
        setSources(fetched.sources);
        localStorage.setItem('masterit_custom_sources', JSON.stringify(fetched.sources));
      }
      if (fetched.users && fetched.users.length > 0) {
        setUsers(fetched.users);
        localStorage.setItem('masterit_users', JSON.stringify(fetched.users));
      }
      if (fetched.auditLogs && fetched.auditLogs.length > 0) {
        setAuditLogs(fetched.auditLogs);
        localStorage.setItem('masterit_security_audit_logs', JSON.stringify(fetched.auditLogs));
      }

      const updatedInfo = {
        ...sheetInfo,
        lastSyncedAt: new Date().toISOString(),
      };
      setSheetInfo(updatedInfo);
      saveStoredSheetInfo(updatedInfo);
      setSyncState('synced');
      setSyncMessage('✅ បានទាញទិន្នន័យពី Google Sheets មកក្នុង App ដោយជោគជ័យ!');
      recordAuditLog(
        'SETTINGS_UPDATED',
        'Google Sheets DB',
        'info',
        'បានទាញទិន្នន័យពី Google Sheets មកក្នុងប្រព័ន្ធ'
      );
    } catch (err: any) {
      console.error(err);
      setSyncState('error');
      setSyncMessage('❌ បរាជ័យក្នុងការទាញទិន្នន័យ: ' + err.message);
    }
  };

  // Handler: Save day for a seller
  const handleSaveDay = async (date: string, sellerId: string, record: DailyRecord) => {
    const key = `${date}__${sellerId}`;
    const updated = {
      ...salesStore,
      [key]: record,
    };
    saveStore(updated);
    recordAuditLog(
      'RECORD_SAVED',
      `Date: ${date} (Seller: ${record.sellerName || sellerId})`,
      'info',
      `បានរក្សាទុកទិន្នន័យលក់ប្រចាំថ្ងៃ`
    );

    // Direct immediate sync to Google Sheets database if connected
    if (sheetInfo) {
      const token = await getAccessToken();
      if (token || sheetInfo.webAppUrl) {
        setSyncState('syncing');
        setSyncMessage(`កំពុង Sync ចូល Google Sheets [${sheetInfo.spreadsheetName}]...`);
        try {
          await syncAllToGoogleSheets(
            token,
            sheetInfo,
            updated,
            sources,
            users,
            auditLogs
          );
          const updatedInfo = {
            ...sheetInfo,
            lastSyncedAt: new Date().toISOString(),
          };
          setSheetInfo(updatedInfo);
          saveStoredSheetInfo(updatedInfo);
          setSyncState('synced');
          setSyncMessage(`បាន Sync ចូល Google Sheets នៅម៉ោង ${new Date().toLocaleTimeString()}`);
          return {
            success: true,
            syncedToSheets: true,
            message: `✅ បានរក្សាទុក និង Sync ចូល Google Sheets [${sheetInfo.spreadsheetName}] ក្នុង Tab "DailySales" ដោយជោគជ័យ!`,
          };
        } catch (err: any) {
          console.error('Save sync failed:', err);
          setSyncState('error');
          setSyncMessage(err.message || 'Sync error');
          return {
            success: true,
            syncedToSheets: false,
            message: `⚠️ បានរក្សាទុកក្នុង Local ប៉ុន្តែមិនទាន់អាច Sync ចូល Google Sheet បានទេ (${err.message})`,
          };
        }
      } else {
        return {
          success: true,
          syncedToSheets: false,
          message: '⚠️ បានរក្សាទុកក្នុង Local ប៉ុន្តែមិនទាន់បាន Sign in Google OAuth ដើម្បី Sync ចូល Google Sheet ឡើយ។ សូមចុចប៊ូតុង "Google Sheets"!',
        };
      }
    }

    return {
      success: true,
      syncedToSheets: false,
      message: '⚠️ បានរក្សាទុកក្នុង Local (មិនទាន់បានភ្ជាប់ Google Sheet ទេ! សូមចុច "+ ភ្ជាប់ Google Sheets" ខាងលើ)',
    };
  };

  // Handler: Delete day for a seller
  const handleDeleteDay = async (date: string, sellerId: string) => {
    const key = `${date}__${sellerId}`;
    const updated = { ...salesStore };
    delete updated[key];
    saveStore(updated);
    recordAuditLog(
      'RECORD_DELETED',
      `Date: ${date} (Seller: ${sellerId})`,
      'warn',
      `បានលុបទិន្នន័យលក់ប្រចាំថ្ងៃចេញពីប្រព័ន្ធ`
    );

    if (sheetInfo) {
      const token = await getAccessToken();
      if (token || sheetInfo.webAppUrl) {
        try {
          await syncAllToGoogleSheets(
            token,
            sheetInfo,
            updated,
            sources,
            users,
            auditLogs
          );
        } catch (e) {
          console.error('Delete sync failed:', e);
        }
      }
    }
  };

  // Handler: User Management
  const handleAddUser = (newUser: User) => {
    const updated = [...users, newUser];
    saveUsers(updated);
    recordAuditLog(
      'USER_CREATED',
      newUser.name,
      'info',
      `បានបង្កើតសមាជិកថ្មី Role: ${newUser.role}`
    );
    alert(`✅ សមាជិក [${newUser.name}] ត្រូវបានបន្ថែមដោយជោគជ័យ!`);
  };

  const handleUpdateUser = (updatedUser: User) => {
    const updated = users.map((u) => (u.id === updatedUser.id ? updatedUser : u));
    saveUsers(updated);
    recordAuditLog(
      'USER_UPDATED',
      updatedUser.name,
      'info',
      `បានកែប្រែព័ត៌មាន ឬសិទ្ធិរបស់សមាជិក`
    );
  };

  const handleDeleteUser = (userId: string) => {
    const targetUser = users.find((u) => u.id === userId);
    const updated = users.filter((u) => u.id !== userId);
    saveUsers(updated);
    recordAuditLog(
      'USER_DELETED',
      targetUser?.name || userId,
      'danger',
      `បានលុបគណនីសមាជិក [${targetUser?.name}] ចេញពីប្រព័ន្ធ`
    );
    if (currentUserId === userId) {
      setCurrentUserId('user_dev');
    }
  };

  // Handler: Custom Sources
  const handleAddSource = (newSource: LeadSource) => {
    const updated = [...sources, newSource];
    saveSources(updated);
    recordAuditLog('SETTINGS_UPDATED', newSource.name, 'info', 'បានបន្ថែមប្រភព Lead ថ្មី');
    alert(`✅ ប្រភព [${newSource.name}] ត្រូវបានបន្ថែមដោយជោគជ័យ!`);
  };

  const handleUpdateSource = (updatedSource: LeadSource) => {
    const updated = sources.map((s) => (s.id === updatedSource.id ? updatedSource : s));
    saveSources(updated);
    recordAuditLog('SETTINGS_UPDATED', updatedSource.name, 'info', 'បានកែប្រែប្រភព Lead');
  };

  const handleDeleteSource = (id: string) => {
    const target = sources.find((s) => s.id === id);
    const updated = sources.filter((item) => item.id !== id);
    saveSources(updated);
    recordAuditLog('SETTINGS_UPDATED', target?.name || id, 'warn', 'បានលុបប្រភព Lead');
  };

  const handleResetSources = () => {
    localStorage.removeItem('masterit_custom_sources');
    setSources(DEFAULT_SOURCES);
    recordAuditLog('SETTINGS_UPDATED', 'Lead Sources', 'warn', 'បាន Reset ប្រភព Lead ទៅ Default');
  };

  // Handler: Clear all sales data
  const handleClearAllSalesData = () => {
    saveStore({});
    recordAuditLog(
      'RECORD_DELETED',
      'All Sales Records',
      'danger',
      'បានលុបសម្អាតទិន្នន័យលក់ទាំងអស់ (System Reset)'
    );
  };

  // Clear Audit Logs
  const handleClearAuditLogs = () => {
    const resetLog: SecurityAuditLog = {
      id: 'sec_reset_' + Date.now(),
      timestamp: new Date().toISOString(),
      action: 'SETTINGS_UPDATED',
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      target: 'Audit Logs',
      severity: 'warn',
      details: 'អ្នកគ្រប់គ្រង Dev បានសម្អាតកំណត់ត្រាសវនកម្មចាស់ៗ',
    };
    setAuditLogs([resetLog]);
    localStorage.setItem('masterit_security_audit_logs', JSON.stringify([resetLog]));
  };

  // Handler: Export Backup JSON
  const handleExportBackup = () => {
    const backupData = {
      appName: 'Master IT Sales Tracker Multi-Seller',
      exportDate: new Date().toISOString(),
      users: users.map((u) => ({ ...u, password: '' })), // Ensure passwords are scrubbed
      sources,
      salesStore,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `MasterIT_MultiSeller_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    recordAuditLog('BACKUP_EXPORTED', 'JSON Backup', 'info', 'បាន Export ទិន្នន័យ Backup');
  };

  // Handler: Import Backup JSON
  const handleImportBackup = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed.salesStore) {
          saveStore(parsed.salesStore);
          if (parsed.users && Array.isArray(parsed.users)) {
            saveUsers(parsed.users);
          }
          if (parsed.sources && Array.isArray(parsed.sources)) {
            saveSources(parsed.sources);
          }
          recordAuditLog('BACKUP_IMPORTED', file.name, 'warn', 'បាន Import ទិន្នន័យពីឯកសារ Backup');
          alert('✅ បានទាញបញ្ចូល Backup ជោគជ័យ!');
        } else {
          alert('❌ ឯកសារ Backup មិនត្រឹមត្រូវ!');
        }
      } catch (err) {
        console.error('Import error', err);
        alert('❌ មានបញ្ហាក្នុងការអានឯកសារ Backup!');
      }
    };
    reader.readAsText(file);
  };

  const handlePrint = () => {
    window.print();
  };

  // Jump from history to edit
  const handleSelectDateToEdit = (date: string, sellerId: string) => {
    setInputDateTarget(date);
    setInputSellerTarget(sellerId);
    setActiveTab('input');
  };

  if (!isAuthenticated) {
    return (
      <LoginForm
        users={users}
        onLogin={handleLogin}
        onFailedLogin={handleFailedLogin}
      />
    );
  }

  return (
    <div className="min-h-screen p-3 sm:p-5 md:p-8 bg-[#f0f2f5]">
      {/* Hidden file input for import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        className="hidden"
      />

      {/* Inactivity Session Lock Modal */}
      <SessionLockModal
        currentUser={currentUser}
        isOpen={isSessionLocked}
        onUnlock={handleUnlockSession}
        onLogout={handleLogout}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        currentUser={currentUser}
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        onPasswordChanged={handlePasswordChanged}
      />

      {/* Google Sheets Cloud Database Modal */}
      <GoogleSheetsModal
        isOpen={isGoogleSheetsModalOpen}
        onClose={() => setIsGoogleSheetsModalOpen(false)}
        sheetInfo={sheetInfo}
        syncState={syncState}
        syncMessage={syncMessage}
        isAutoSyncEnabled={isAutoSyncEnabled}
        onToggleAutoSync={(enabled) => setIsAutoSyncEnabled(enabled)}
        onPushToSheets={handlePushToSheets}
        onPullFromSheets={handlePullFromSheets}
        onConnectSpreadsheet={handleConnectSpreadsheet}
        onConnectViaUrl={handleConnectViaUrl}
        onDisconnectSpreadsheet={handleDisconnectSpreadsheet}
        salesStore={salesStore}
      />

      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200/80 p-4 sm:p-6 md:p-8">
        {/* Header */}
        <Header
          activeTab={activeTab}
          setActiveTab={(tab) => {
            if (tab !== 'input') {
              setInputDateTarget(undefined);
              setInputSellerTarget(undefined);
            }
            setActiveTab(tab);
          }}
          currentUser={currentUser}
          onLogout={handleLogout}
          onChangePassword={() => setIsChangePasswordOpen(true)}
          onOpenGoogleSheets={() => setIsGoogleSheetsModalOpen(true)}
          sheetSyncState={syncState}
          onExportBackup={handleExportBackup}
          onImportBackup={handleImportBackup}
          onPrint={handlePrint}
          totalDaysLogged={Object.keys(salesStore).length}
        />

        {/* Tab 1: Sale Input */}
        {activeTab === 'input' && (
          <InputTab
            sources={sources}
            fus={fus}
            salesStore={salesStore}
            users={users}
            currentUser={currentUser}
            onSaveDay={handleSaveDay}
            onDeleteDay={handleDeleteDay}
            initialDate={inputDateTarget}
            initialSellerId={inputSellerTarget}
            sheetInfo={sheetInfo}
            syncState={syncState}
            syncMessage={syncMessage}
            onOpenGoogleSheets={() => setIsGoogleSheetsModalOpen(true)}
            onManualPushToSheets={handlePushToSheets}
          />
        )}

        {/* Tab 2: Dashboard (All Sellers at once or individual) */}
        {activeTab === 'dashboard' && (
          <DashboardTab
            sources={sources}
            fus={fus}
            salesStore={salesStore}
            users={users}
            currentUser={currentUser}
          />
        )}

        {/* Tab 3: History / Log */}
        {activeTab === 'history' && (
          <HistoryTab
            salesStore={salesStore}
            sources={sources}
            fus={fus}
            users={users}
            currentUser={currentUser}
            onSelectDateToEdit={handleSelectDateToEdit}
            onDeleteDate={handleDeleteDay}
          />
        )}

        {/* Tab 4: User Management (Dev only) */}
        {activeTab === 'users' && currentUser.role === 'dev' && (
          <UserManagementTab
            users={users}
            currentUser={currentUser}
            onAddUser={handleAddUser}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
            onUnlockUser={handleUnlockUser}
          />
        )}

        {/* Tab 5: Security & Audit (Dev only) */}
        {activeTab === 'security' && currentUser.role === 'dev' && (
          <SecurityTab
            users={users}
            auditLogs={auditLogs}
            onUnlockUser={handleUnlockUser}
            onClearAuditLogs={handleClearAuditLogs}
          />
        )}

        {/* Tab 6: Settings (Dev only) */}
        {activeTab === 'settings' && currentUser.role === 'dev' && (
          <SettingsTab
            sources={sources}
            fus={fus}
            onAddSource={handleAddSource}
            onUpdateSource={handleUpdateSource}
            onDeleteSource={handleDeleteSource}
            onResetSources={handleResetSources}
            onClearAllSalesData={handleClearAllSalesData}
          />
        )}
      </div>

      {/* Footer Branding */}
      <footer className="max-w-7xl mx-auto mt-6 text-center text-xs text-slate-500 pb-4">
        <p>
          Master IT School &bull; Multi-Seller Sales Tracking & Security Compliance System
        </p>
      </footer>
    </div>
  );
}
