import React from 'react';
import { ActiveTab, User, UserRole } from '../types/sales';
import { SyncState } from '../services/googleSheetsService';
import {
  PenSquare,
  BarChart3,
  Settings,
  History,
  Users,
  Download,
  Upload,
  Printer,
  ShieldCheck,
  ShieldAlert,
  Briefcase,
  UserCheck,
  LogOut,
  KeyRound,
  FileSpreadsheet,
  RefreshCw,
} from 'lucide-react';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  currentUser: User;
  onLogout: () => void;
  onChangePassword: () => void;
  onOpenGoogleSheets: () => void;
  sheetSyncState: SyncState;
  onExportBackup: () => void;
  onImportBackup: () => void;
  onPrint: () => void;
  totalDaysLogged: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onLogout,
  onChangePassword,
  onOpenGoogleSheets,
  sheetSyncState,
  onExportBackup,
  onImportBackup,
  onPrint,
  totalDaysLogged,
}) => {
  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'dev':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-200">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
            <span>Dev (All Permissions)</span>
          </span>
        );
      case 'manager':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-900 border border-indigo-200">
            <Briefcase className="w-3.5 h-3.5 text-indigo-700" />
            <span>Sales Manager (All Sellers)</span>
          </span>
        );
      case 'seller':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-200">
            <UserCheck className="w-3.5 h-3.5 text-blue-700" />
            <span>Seller (Sale Input)</span>
          </span>
        );
    }
  };

  return (
    <header className="border-b border-slate-200 pb-5 mb-6 space-y-4">
      {/* Top Brand & Current User Profile Row */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0 font-black text-xl tracking-tight">
            IT
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-blue-950 tracking-tight">
                Master IT School
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                {totalDaysLogged} កំណត់ត្រា
              </span>
            </div>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
              ប្រព័ន្ធគ្រប់គ្រងការលក់ពហុអ្នកលក់ (Multi-Seller Tracker & Conversion Analytics)
            </p>
          </div>
        </div>

        {/* User Profile Badge (Read-Only) */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2.5 p-1.5 pr-3 rounded-2xl border border-slate-200 bg-slate-50 shadow-xs">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs ${
                currentUser.avatarColor || 'bg-blue-600'
              }`}
            >
              {currentUser.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="text-left">
              <span className="font-bold text-xs sm:text-sm text-slate-900 block">
                {currentUser.name}
              </span>
              <div className="scale-90 origin-left -mt-0.5">{getRoleBadge(currentUser.role)}</div>
            </div>
          </div>

          {/* Quick Tools */}
          <div className="flex items-center gap-1.5">
            {/* Google Sheets Database Button */}
            <button
              onClick={onOpenGoogleSheets}
              title="គ្រប់គ្រង Google Sheets Database (High-Speed Cloud Sync)"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-xs ${
                sheetSyncState === 'synced'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  : sheetSyncState === 'syncing'
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : sheetSyncState === 'error'
                  ? 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300'
              }`}
            >
              <FileSpreadsheet
                className={`w-4 h-4 ${
                  sheetSyncState === 'synced' ? 'text-emerald-600' : 'text-slate-600'
                }`}
              />
              <span className="hidden sm:inline">Google Sheets DB</span>
              {sheetSyncState === 'syncing' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
              ) : sheetSyncState === 'synced' ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              ) : null}
            </button>

            <button
              onClick={onChangePassword}
              title="ប្តូរពាក្យសម្ងាត់ (Change Password)"
              className="p-2 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
            </button>
            <button
              onClick={onExportBackup}
              title="ទាញយក Backup ទិន្នន័យ (JSON)"
              className="p-2 text-slate-600 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onImportBackup}
              title="បញ្ចូល Backup មកវិញ (JSON)"
              className="p-2 text-slate-600 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4" />
            </button>
            <button
              onClick={onPrint}
              title="បោះពុម្ពរបាយការណ៍ (Print/PDF)"
              className="p-2 text-slate-600 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* Logout */}
            <button
              onClick={onLogout}
              title="ចាកចេញពីគណនី (Sign Out)"
              className="flex items-center gap-1.5 px-2.5 py-2 text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors font-bold text-xs cursor-pointer ml-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ចាកចេញ</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs based on Role */}
      <div className="flex flex-wrap items-center gap-2 pt-2">
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner overflow-x-auto max-w-full">
          {/* Tab 1: Input (Sale Input) */}
          <button
            onClick={() => setActiveTab('input')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'input'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <PenSquare className="w-4 h-4" />
            <span>
              {currentUser.role === 'seller' ? '📝 បញ្ចូលទិន្នន័យខ្ញុំ (Sale Input)' : '📝 បញ្ចូលទិន្នន័យ (Sale Input)'}
            </span>
          </button>

          {/* Tab 2: Dashboard */}
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>
              {currentUser.role === 'seller'
                ? '📊 លទ្ធផលរបស់ខ្ញុំ (My Report)'
                : '📊 របាយការណ៍ (Report All Sellers)'}
            </span>
          </button>

          {/* Tab 3: History */}
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <History className="w-4 h-4" />
            <span>📜 ប្រវត្តិលក់</span>
          </button>

          {/* Tab 4: User Management (Dev only) */}
          {currentUser.role === 'dev' && (
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>👥 អ្នកប្រើប្រាស់ (Users)</span>
            </button>
          )}

          {/* Tab 5: Security & Audit (Dev only) */}
          {currentUser.role === 'dev' && (
            <button
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'security'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>🛡️ សន្តិសុខ (Security & Audit)</span>
            </button>
          )}

          {/* Tab 6: Settings (Dev only) */}
          {currentUser.role === 'dev' && (
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>⚙️ ការកំណត់ (Settings)</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
