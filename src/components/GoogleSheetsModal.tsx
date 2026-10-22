import React, { useState } from 'react';
import {
  SheetDatabaseInfo,
  SyncState,
  getAppsScriptTemplate,
  downloadSalesCsv,
  copySalesToClipboard,
} from '../services/googleSheetsService';
import { googleSignIn, googleSignOut, getGoogleUser } from '../services/googleAuth';
import { SalesStore } from '../types/sales';
import {
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  CheckCircle2,
  AlertCircle,
  X,
  LogOut,
  Sparkles,
  Database,
  Link as LinkIcon,
  Copy,
  Check,
  Code2,
  Download,
  Info,
  Unlink,
} from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheetInfo: SheetDatabaseInfo | null;
  syncState: SyncState;
  syncMessage: string | null;
  isAutoSyncEnabled: boolean;
  onToggleAutoSync: (enabled: boolean) => void;
  onPushToSheets: () => Promise<void>;
  onPullFromSheets: () => Promise<void>;
  onConnectSpreadsheet: () => Promise<void>;
  onConnectViaUrl: (sheetUrl: string, webAppUrl?: string) => Promise<void>;
  onDisconnectSpreadsheet: () => void;
  salesStore: SalesStore;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  sheetInfo,
  syncState,
  syncMessage,
  isAutoSyncEnabled,
  onToggleAutoSync,
  onPushToSheets,
  onPullFromSheets,
  onConnectSpreadsheet,
  onConnectViaUrl,
  onDisconnectSpreadsheet,
  salesStore,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'oauth' | 'link' | 'export'>('oauth');
  const [sheetUrlInput, setSheetUrlInput] = useState('');
  const [webAppUrlInput, setWebAppUrlInput] = useState('');
  const [showAppsScriptHelp, setShowAppsScriptHelp] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedTsv, setCopiedTsv] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [confirmPushOpen, setConfirmPushOpen] = useState(false);
  const [confirmPullOpen, setConfirmPullOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  if (!isOpen) return null;

  const googleUser = getGoogleUser();

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setAuthNotice(null);
    try {
      const res = await googleSignIn();
      if (res) {
        await onConnectSpreadsheet();
      } else {
        setAuthNotice(
          'បង្អួច Sign-In ត្រូវបានបិទ។ ប្រសិនបើ browser របស់អ្នករារាំងផ្ទាំង popup សូមប្រើវិធីភ្ជាប់តាម Google Sheet URL (Tab ទី១) ខាងក្រោម។'
        );
      }
    } catch (err: any) {
      const msg = String(err?.message || err || '');
      if (msg.includes('popup_blocked')) {
        setAuthNotice('កម្មវិធីរុករក (Browser) បានរារាំង Pop-up។ សូមប្រើវិធីតភ្ជាប់តាម Sheet URL ងាយស្រួលជាង។');
      } else {
        setAuthNotice('មិនអាចភ្ជាប់តាម Google OAuth បានទេ៖ សូមប្រើជម្រើស "តភ្ជាប់តាម Sheet URL / Web App" ខាងក្រោម។');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await googleSignOut();
  };

  const handleDirectConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetUrlInput.trim()) return;
    setActionLoading(true);
    try {
      await onConnectViaUrl(sheetUrlInput.trim(), webAppUrlInput.trim() || undefined);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(getAppsScriptTemplate());
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const handleCopyDataToClipboard = async () => {
    const success = await copySalesToClipboard(salesStore);
    if (success) {
      setCopiedTsv(true);
      setTimeout(() => setCopiedTsv(false), 2500);
    }
  };

  const handleConfirmPush = async () => {
    setConfirmPushOpen(false);
    setActionLoading(true);
    try {
      await onPushToSheets();
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmPull = async () => {
    setConfirmPullOpen(false);
    setActionLoading(true);
    try {
      await onPullFromSheets();
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-inner">
              <FileSpreadsheet className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">
                Google Sheets Database
              </h3>
              <p className="text-xs text-emerald-100 font-medium">
                តភ្ជាប់ទិន្នន័យជាមួយ Google Sheets ដោយផ្ទាល់ (Cloud Database Sync)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* If already connected, show the connection dashboard */}
          {sheetInfo ? (
            <div className="space-y-4">
              {/* Connected Spreadsheet Card */}
              <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="p-2.5 bg-emerald-600 text-white rounded-xl shrink-0 mt-0.5 shadow-xs">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black text-sm text-slate-900">
                          {sheetInfo.spreadsheetName}
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-md">
                          CONNECTED
                        </span>
                        {sheetInfo.webAppUrl && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-md">
                            ⚡ WebApp Sync
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate max-w-[280px]">
                        ID: {sheetInfo.spreadsheetId}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={sheetInfo.spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200 shadow-xs flex items-center gap-1.5 transition-colors"
                    >
                      <span>បើក Sheet</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={onDisconnectSpreadsheet}
                      title="ផ្តាច់ការភ្ជាប់"
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-white transition-colors cursor-pointer"
                    >
                      <Unlink className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between text-xs">
                  <span className="text-slate-600 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Sync ទិន្នន័យលក់ប្រចាំថ្ងៃ</span>
                  </span>
                  {sheetInfo.lastSyncedAt && (
                    <span className="text-[11px] text-slate-500 font-mono">
                      បាន Sync: {new Date(sheetInfo.lastSyncedAt).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Fast Database Sync Mode Controls */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <span className="font-bold text-xs text-slate-800 block">
                      ⚡ Ultra-Fast Local-First Sync
                    </span>
                    <p className="text-[11px] text-slate-500">
                      រក្សាទុកភ្លាមៗក្នុង Memory (0ms) និង Sync ស្វ័យប្រវត្តិតាម Background
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAutoSyncEnabled}
                      onChange={(e) => onToggleAutoSync(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* Manual Sync Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    disabled={actionLoading || syncState === 'syncing'}
                    onClick={() => setConfirmPushOpen(true)}
                    className="p-3 bg-white hover:bg-emerald-50 border border-emerald-200 hover:border-emerald-300 rounded-2xl flex flex-col items-center justify-center gap-1 text-emerald-800 transition-all cursor-pointer group shadow-xs active:scale-98"
                  >
                    <UploadCloud className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-xs">បញ្ចូលទៅ Sheets (Push)</span>
                    <span className="text-[10px] text-slate-500">Sync all records now</span>
                  </button>

                  <button
                    type="button"
                    disabled={actionLoading || syncState === 'syncing'}
                    onClick={() => setConfirmPullOpen(true)}
                    className="p-3 bg-white hover:bg-blue-50 border border-blue-200 hover:border-blue-300 rounded-2xl flex flex-col items-center justify-center gap-1 text-blue-800 transition-all cursor-pointer group shadow-xs active:scale-98"
                  >
                    <DownloadCloud className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-xs">ទាញពី Sheets (Pull)</span>
                    <span className="text-[10px] text-slate-500">Fetch latest from cloud</span>
                  </button>
                </div>
              </div>

              {/* Quick Export Tools within connected view */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCopyDataToClipboard}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-emerald-700 font-bold transition-colors cursor-pointer"
                >
                  {copiedTsv ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedTsv ? 'បានចម្លងរួចរាល់!' : 'ចម្លងទិន្នន័យ (Copy for Sheet)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => downloadSalesCsv(salesStore)}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-blue-700 font-bold transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>ទាញយក CSV</span>
                </button>
              </div>
            </div>
          ) : (
            /* Connection Hub (When Not Connected) */
            <div className="space-y-4">
              {/* Navigation Tabs */}
              <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('oauth')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    activeSubTab === 'oauth'
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ⚡ Google Cloud DB (Live Sync)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('link')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    activeSubTab === 'link'
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🔗 Sheet Link / WebApp
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('export')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    activeSubTab === 'export'
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📋 នាំចេញ / CSV
                </button>
              </div>

              {/* Tab 1: Connect via Direct Google Sheet URL / Web App */}
              {activeSubTab === 'link' && (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 text-xs text-emerald-950 space-y-1.5">
                    <p className="font-bold flex items-center gap-1.5 text-emerald-900">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>ភ្ជាប់បានភ្លាមៗដោយមិនបាច់ប្រើ OAuth ឬរង់ចាំការអនុញ្ញាត Pop-up</span>
                    </p>
                    <p className="text-slate-600">
                      គ្រាន់តែចម្លងតំណភ្ជាប់ (Link) Google Sheet របស់អ្នករួចដាក់ចូលប្រអប់ខាងក្រោម។
                    </p>
                  </div>

                  <form onSubmit={handleDirectConnect} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Google Sheet Link ឬ Spreadsheet ID *
                      </label>
                      <div className="relative">
                        <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          required
                          value={sheetUrlInput}
                          onChange={(e) => setSheetUrlInput(e.target.value)}
                          placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                          className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none font-mono"
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                        <span>ឧទាហរណ៍: docs.google.com/spreadsheets/d/1BxiM...</span>
                        <a
                          href="https://sheets.new"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-700 hover:underline font-bold inline-flex items-center gap-0.5"
                        >
                          <span>+ បង្កើត Sheet ថ្មី</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700">
                          Apps Script Web App Sync URL (ជម្រើសបន្ថែម សម្រាប់ Auto 2-Way Sync)
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowAppsScriptHelp(!showAppsScriptHelp)}
                          className="text-[11px] text-emerald-700 hover:underline font-bold cursor-pointer"
                        >
                          {showAppsScriptHelp ? 'លាក់កូដ' : 'របៀបយក Web App URL'}
                        </button>
                      </div>
                      <input
                        type="text"
                        value={webAppUrlInput}
                        onChange={(e) => setWebAppUrlInput(e.target.value)}
                        placeholder="https://script.google.com/macros/s/.../exec (Optional)"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none font-mono text-slate-600"
                      />
                    </div>

                    {/* Apps Script Guide */}
                    {showAppsScriptHelp && (
                      <div className="p-4 bg-slate-900 text-slate-100 rounded-2xl text-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                            <Code2 className="w-4 h-4" />
                            <span>កូដ Google Apps Script (២ នាទី)</span>
                          </span>
                          <button
                            type="button"
                            onClick={handleCopyScript}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            {copiedScript ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedScript ? 'បានចម្លង!' : 'ចម្លងកូដ'}</span>
                          </button>
                        </div>
                        <ol className="list-decimal pl-4 space-y-1 text-slate-300 text-[11px]">
                          <li>បើក Google Sheet &gt; ចុច <strong>Extensions</strong> &gt; <strong>Apps Script</strong></li>
                          <li>បិទភ្ជាប់ (Paste) កូដខាងលើចូល &gt; ចុច <strong>Deploy</strong> &gt; <strong>New Deployment</strong></li>
                          <li>ជ្រើសរើស <strong>Web app</strong> (Execute as: <em>Me</em>, Who has access: <em>Anyone</em>)</li>
                          <li>ចម្លង <strong>Web app URL</strong> ដាក់ក្នុងប្រអប់ខាងលើ!</li>
                        </ol>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={actionLoading || !sheetUrlInput.trim()}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer hover:shadow-lg disabled:opacity-50"
                    >
                      {actionLoading ? 'កំពុងភ្ជាប់...' : 'រក្សាទុក & ភ្ជាប់ Spreadsheet'}
                    </button>
                  </form>
                </div>
              )}

              {/* Tab 2: Instant Export / Copy (Zero Setup) */}
              {activeSubTab === 'export' && (
                <div className="space-y-4 py-2">
                  <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-2xl text-xs text-blue-900 space-y-2">
                    <p className="font-bold flex items-center gap-1.5 text-blue-950">
                      <Info className="w-4 h-4 text-blue-600" />
                      <span>នាំចេញទិន្នន័យដោយមិនបាច់ភ្ជាប់ Database</span>
                    </p>
                    <p className="text-slate-600">
                      អ្នកអាចចម្លងទិន្នន័យលក់ទាំងអស់ចូល Clipboard រួចបើក Google Sheet ហើយចុច <strong>Ctrl + V</strong> ដើម្បីបិទភ្ជាប់ភ្លាមៗ។
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleCopyDataToClipboard}
                      className="p-4 bg-white hover:bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer shadow-xs active:scale-98"
                    >
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                        {copiedTsv ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                      </div>
                      <div>
                        <span className="font-bold text-xs text-slate-800 block">
                          {copiedTsv ? 'បានចម្លងរួចរាល់!' : 'ចម្លងសម្រាប់ Google Sheet'}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          រួចចុច Ctrl+V ក្នុង Sheet
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => downloadSalesCsv(salesStore)}
                      className="p-4 bg-white hover:bg-blue-50 border border-blue-200 rounded-2xl flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer shadow-xs active:scale-98"
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
                        <Download className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-bold text-xs text-slate-800 block">
                          ទាញយកឯកសារ CSV
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Import ចូល Google Sheet បាន
                        </span>
                      </div>
                    </button>
                  </div>

                  <div className="text-center pt-2">
                    <a
                      href="https://sheets.new"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                    >
                      <span>បើក Google Sheet ថ្មីក្នុងផ្ទាំងថ្មី</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )}

              {/* Tab 1: Google OAuth Real Database */}
              {activeSubTab === 'oauth' && (
                <div className="text-center py-6 px-4 bg-gradient-to-b from-emerald-50/70 to-slate-50 rounded-2xl border border-emerald-200/80 space-y-4">
                  <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
                    <Database className="w-7 h-7" />
                  </div>
                  <div className="max-w-md mx-auto">
                    <h4 className="font-black text-slate-800 text-base">
                      ភ្ជាប់ Google Sheets ជា Database ពិតប្រាកដ (Real Live Database)
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      ចុចចូលប្រើគណនី Google របស់អ្នក ដើម្បីឱ្យប្រព័ន្ធបង្កើត ឬស្វែងរក Spreadsheet <strong>Master IT School - Sales Database</strong> ក្នុង Google Drive របស់អ្នកដោយស្វ័យប្រវត្តិ ជាមួយនឹងការ Read និង Write ទិន្នន័យផ្ទាល់ភ្លាមៗ។
                    </p>
                  </div>

                  {/* Official Google Sign-In Button */}
                  <div>
                    <button
                      type="button"
                      onClick={handleSignIn}
                      disabled={isSigningIn}
                      className="inline-flex items-center justify-center gap-3 px-6 py-3 bg-white hover:bg-emerald-50/50 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-98 disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 48 48">
                        <path
                          fill="#EA4335"
                          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                        />
                        <path
                          fill="#4285F4"
                          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                        />
                        <path
                          fill="#34A853"
                          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                        />
                      </svg>
                      <span>
                        {isSigningIn
                          ? 'កំពុងភ្ជាប់ Google & រៀបចំ Spreadsheet...'
                          : 'Sign in with Google (Connect Real Database)'}
                      </span>
                    </button>
                  </div>

                  {authNotice && (
                    <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center gap-2 text-left max-w-md mx-auto">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{authNotice}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-200/60 max-w-sm mx-auto text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Real-time Read, Write, Batch Updates & Daily Sales Logging</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Live Status Message */}
          {syncMessage && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-semibold ${
                syncState === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-700'
                  : syncState === 'syncing'
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
            >
              {syncState === 'syncing' ? (
                <RefreshCw className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
              ) : syncState === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <span>{syncMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Master IT School &bull; Google Sheets Engine</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition-colors cursor-pointer"
          >
            បិទ (Close)
          </button>
        </div>
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmModal
        isOpen={confirmPushOpen}
        title="បញ្ជាក់ការបញ្ចូលទិន្នន័យទៅ Google Sheets"
        message="ទិន្នន័យលក់បច្ចុប្បន្នទាំងអស់នឹងត្រូវបញ្ចូលទៅ Google Spreadsheet របស់អ្នក។ តើអ្នកយល់ព្រមបន្តឬទេ?"
        confirmLabel="យល់ព្រម Sync ទៅ Sheets"
        cancelLabel="បោះបង់"
        onConfirm={handleConfirmPush}
        onCancel={() => setConfirmPushOpen(false)}
      />

      <ConfirmModal
        isOpen={confirmPullOpen}
        title="បញ្ជាក់ការទាញទិន្នន័យពី Google Sheets"
        message="ទិន្នន័យពី Google Spreadsheet នឹងត្រូវទាញយកមកជំនួសទិន្នន័យក្នុង App នេះ។ តើអ្នកយល់ព្រមបន្តឬទេ?"
        confirmLabel="យល់ព្រមទាញទិន្នន័យមក"
        cancelLabel="បោះបង់"
        onConfirm={handleConfirmPull}
        onCancel={() => setConfirmPullOpen(false)}
      />
    </div>
  );
};
