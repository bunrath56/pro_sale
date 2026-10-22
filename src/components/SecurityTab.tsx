import React, { useState } from 'react';
import { User, SecurityAuditLog } from '../types/sales';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  KeyRound,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Download,
  Trash2,
  Search,
  UserCheck,
  Activity,
  FileText,
} from 'lucide-react';

interface SecurityTabProps {
  users: User[];
  auditLogs: SecurityAuditLog[];
  onUnlockUser: (userId: string) => void;
  onClearAuditLogs: () => void;
}

export const SecurityTab: React.FC<SecurityTabProps> = ({
  users,
  auditLogs,
  onUnlockUser,
  onClearAuditLogs,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Find locked users or users with failed attempts
  const lockedUsers = users.filter((u) => {
    if (!u.lockedUntil) return false;
    return Date.now() < u.lockedUntil;
  });

  const usersWithFailedAttempts = users.filter((u) => (u.failedLoginAttempts || 0) > 0);

  // Filter logs
  const filteredLogs = auditLogs.filter((log) => {
    if (filterSeverity !== 'all' && log.severity !== filterSeverity) return false;
    if (filterAction !== 'all' && log.action !== filterAction) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchActor = log.actorName.toLowerCase().includes(q);
      const matchAction = log.action.toLowerCase().includes(q);
      const matchDetails = log.details.toLowerCase().includes(q);
      const matchTarget = (log.target || '').toLowerCase().includes(q);
      if (!matchActor && !matchAction && !matchDetails && !matchTarget) return false;
    }
    return true;
  });

  const handleExportAudit = () => {
    const report = {
      title: 'Master IT School - Security Audit Report',
      generatedAt: new Date().toISOString(),
      totalEvents: auditLogs.length,
      logs: auditLogs,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Security_Audit_Report_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getSeverityBadge = (severity: SecurityAuditLog['severity']) => {
    switch (severity) {
      case 'danger':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-rose-600" />
            <span>Danger</span>
          </span>
        );
      case 'warn':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            <span>Warning</span>
          </span>
        );
      case 'info':
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-blue-600" />
            <span>Info</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <h2 className="text-xl font-bold">ប្រព័ន្ធសន្តិសុខ និងកំណត់ត្រាសវនកម្ម (Security & Audit Trail)</h2>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            ស្តង់ដារសុវត្ថិភាពកម្រិតវិជ្ជាជីវៈ (Professional Security Standards): ការការពារការវាយប្រហារ Brute-Force,  mã hóa SHA-256 Salted, តាមដានសកម្មភាពគ្រប់សមាជិក
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportAudit}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>ទាញយករបាយការណ៍សវនកម្ម (Export Logs)</span>
          </button>
        </div>
      </div>

      {/* Security Health Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Encryption */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">កម្រិតបច្ចេកវិទ្យា Hash</span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <KeyRound className="w-4 h-4" />
            </span>
          </div>
          <div className="text-lg font-black text-slate-900 mt-1">SHA-256 + Salt</div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
            16-Byte Cryptographic Salt
          </p>
        </div>

        {/* Card 2: Lockout Defense */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Brute-Force Lockout</span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Lock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-lg font-black text-slate-900 mt-1">
            {lockedUsers.length > 0 ? (
              <span className="text-rose-600">{lockedUsers.length} គណនីជាប់សោ</span>
            ) : (
              <span className="text-slate-800">សកម្មភាពធម្មតា (Normal)</span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            5 លើកអតិបរមា / ចាក់សោ 10 នាទី
          </p>
        </div>

        {/* Card 3: Inactivity Guard */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Inactivity Auto-Lock</span>
            <span className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-lg font-black text-purple-700 mt-1">15 នាទី (Active)</div>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            ចាក់សោស្វ័យប្រវត្តិពេលគ្មានសកម្មភាព
          </p>
        </div>

        {/* Card 4: Audit Trail Count */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">ព្រឹត្តិការណ៍សវនកម្មសរុប</span>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Activity className="w-4 h-4" />
            </span>
          </div>
          <div className="text-lg font-black text-slate-900 mt-1">{auditLogs.length} Events</div>
          <p className="text-[11px] text-indigo-600 font-semibold mt-0.5">
            កត់ត្រារាល់ការ Login & ការកែប្រែ
          </p>
        </div>
      </div>

      {/* Account Lockout & Security Threat Management */}
      {(lockedUsers.length > 0 || usersWithFailedAttempts.length > 0) && (
        <div className="bg-rose-50/80 border border-rose-200 p-5 rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
            <h3 className="text-sm font-bold text-rose-950">
              ការគ្រប់គ្រងគណនីជាប់សោ និងការបញ្ចូលខុស (Account Lockout & Risk Management)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {users
              .filter(
                (u) =>
                  (u.lockedUntil && Date.now() < u.lockedUntil) ||
                  (u.failedLoginAttempts || 0) > 0
              )
              .map((u) => {
                const isLocked = u.lockedUntil && Date.now() < u.lockedUntil;
                const remainingSec = isLocked
                  ? Math.max(0, Math.floor((u.lockedUntil! - Date.now()) / 1000))
                  : 0;
                const remainingMin = Math.ceil(remainingSec / 60);

                return (
                  <div
                    key={u.id}
                    className="p-3 bg-white border border-rose-200 rounded-xl flex items-center justify-between shadow-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-900">{u.name}</span>
                        {isLocked ? (
                          <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-black rounded">
                            LOCKED
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded">
                            {u.failedLoginAttempts}/5 Failed
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">{u.email}</p>
                      {isLocked && (
                        <p className="text-[11px] text-rose-600 font-medium mt-1">
                          សល់ពេល: ~{remainingMin} នាទីទៀត
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => onUnlockUser(u.id)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>ដោះសោ (Unlock)</span>
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Audit Log Table & Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {/* Controls Bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-600" />
            <h3 className="font-bold text-sm text-slate-800">
              ប្រវត្តិកត់ត្រាសន្តិសុខ (Audit Trail Activity Log)
            </h3>
            <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-xs font-bold rounded-full">
              {filteredLogs.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="ស្វែងរកតាមឈ្មោះ ឬ សកម្មភាព..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
              />
            </div>

            {/* Severity Filter */}
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="py-1.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
            >
              <option value="all">កម្រិតទាំងអស់ (All Severities)</option>
              <option value="danger">🔴 Danger Only</option>
              <option value="warn">🟡 Warning Only</option>
              <option value="info">🔵 Info Only</option>
            </select>

            {/* Action Filter */}
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="py-1.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
            >
              <option value="all">សកម្មភាពទាំងអស់ (All Actions)</option>
              <option value="AUTH_LOGIN_SUCCESS">Login Success</option>
              <option value="AUTH_LOGIN_FAILED">Login Failed</option>
              <option value="AUTH_LOCKOUT">Account Lockout</option>
              <option value="AUTH_UNLOCK">Account Unlock</option>
              <option value="PASSWORD_CHANGED">Password Changed</option>
              <option value="USER_CREATED">User Created</option>
              <option value="USER_UPDATED">User Updated</option>
              <option value="USER_DELETED">User Deleted</option>
              <option value="RECORD_SAVED">Record Saved</option>
              <option value="RECORD_DELETED">Record Deleted</option>
            </select>

            {/* Clear button */}
            <button
              onClick={() => {
                if (window.confirm('តើអ្នកប្រាកដជាចង់សម្អាតកំណត់ត្រាសវនកម្មទាំងអស់មែនទេ? (Clear all audit logs?)')) {
                  onClearAuditLogs();
                }
              }}
              className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors cursor-pointer"
              title="Clear all logs"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                <th className="py-2.5 px-3">ពេលវេលា (Timestamp)</th>
                <th className="py-2.5 px-3">កម្រិត (Severity)</th>
                <th className="py-2.5 px-3">សកម្មភាព (Event Action)</th>
                <th className="py-2.5 px-3">អ្នកធ្វើសកម្មភាព (Actor)</th>
                <th className="py-2.5 px-3">គោលដៅ (Target)</th>
                <th className="py-2.5 px-3">សេចក្តីលម្អិត (Security Details)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    មិនមានកំណត់ត្រាត្រូវនឹងលក្ខខណ្ឌស្វែងរកឡើយ (No audit records found)
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const dateObj = new Date(log.timestamp);
                  const formattedDate = dateObj.toLocaleDateString('km-KH', {
                    month: 'short',
                    day: 'numeric',
                  });
                  const formattedTime = dateObj.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });

                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        <span>{formattedDate} </span>
                        <span className="text-slate-400">{formattedTime}</span>
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        {getSeverityBadge(log.severity)}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap font-mono font-bold text-[11px] text-slate-800">
                        {log.action}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">{log.actorName}</div>
                        <div className="text-[10px] text-slate-400 capitalize">
                          Role: {log.actorRole}
                        </div>
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap text-slate-600">
                        {log.target || '-'}
                      </td>
                      <td className="py-2 px-3 text-slate-600 font-medium max-w-md break-words">
                        {log.details}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
