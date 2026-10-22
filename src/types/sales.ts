export type UserRole = 'dev' | 'manager' | 'seller';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Legacy plaintext (auto-migrated)
  passwordHash?: string; // Salted SHA-256 hash
  passwordSalt?: string; // Cryptographic salt
  role: UserRole;
  avatarColor?: string;
  phone?: string;
  targetWon?: number; // Personal monthly target won
  targetRevenue?: number; // Personal monthly revenue target
  active: boolean;
  createdAt: string;
  lastLoginAt?: string;
  failedLoginAttempts?: number;
  lockedUntil?: number | null; // Timestamp (ms) until which account is locked
  passwordChangedAt?: string;
}

export interface SecurityAuditLog {
  id: string;
  timestamp: string; // ISO string
  action:
    | 'AUTH_LOGIN_SUCCESS'
    | 'AUTH_LOGIN_FAILED'
    | 'AUTH_LOCKOUT'
    | 'AUTH_UNLOCK'
    | 'AUTH_LOGOUT'
    | 'SESSION_LOCKED'
    | 'SESSION_UNLOCKED'
    | 'PASSWORD_CHANGED'
    | 'USER_CREATED'
    | 'USER_UPDATED'
    | 'USER_DELETED'
    | 'RECORD_SAVED'
    | 'RECORD_DELETED'
    | 'BACKUP_EXPORTED'
    | 'BACKUP_IMPORTED'
    | 'SETTINGS_UPDATED';
  actorId: string;
  actorName: string;
  actorRole: UserRole | 'system';
  target?: string;
  severity: 'info' | 'warn' | 'danger';
  details: string;
  ipAddress?: string;
}

export interface UserSession {
  token: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  issuedAt: number;
  expiresAt: number;
  lastActivityAt: number;
  isLocked: boolean;
}

export interface LeadSource {
  id: string;
  name: string;
  tgtW: number; // Monthly target Won
  tgtL: number; // Monthly target Leads
  dtgtW: number; // Daily target Won (~tgtW / 25)
  dtgtL: number; // Daily target Leads (~tgtL / 25)
  isCustom?: boolean;
}

export interface ActivitySource {
  id: string;
  name: string;
  tgtW: number; // Monthly target Won
  tgtA: number; // Monthly target Acts
  dtgtW: number; // Daily target Won (~tgtW / 25)
  dtgtA: number; // Daily target Acts (~tgtA / 25)
}

export interface DailyRecord {
  date: string; // YYYY-MM-DD
  sellerId: string; // The seller ID who logged this record
  sellerName?: string;
  updatedAt?: string;
  [key: string]: number | string | undefined; // e.g. ads_l, ads_q, ads_n, ads_w, ads_r, outb_a, etc.
}

// Keyed by `${date}__${sellerId}`
export type SalesStore = Record<string, DailyRecord>;

export type ActiveTab = 'input' | 'dashboard' | 'history' | 'users' | 'settings' | 'security';

