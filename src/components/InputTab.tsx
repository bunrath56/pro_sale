import React, { useState, useEffect, useMemo } from 'react';
import { LeadSource, ActivitySource, DailyRecord, SalesStore, User } from '../types/sales';
import { SheetDatabaseInfo, SyncState } from '../services/googleSheetsService';
import { fmtMoney, formatDate } from '../utils/formatters';
import { ConfirmModal } from './ConfirmModal';
import {
  Calendar,
  Save,
  Trash2,
  RotateCcw,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Link as LinkIcon,
  Loader2,
} from 'lucide-react';

interface InputTabProps {
  sources: LeadSource[];
  fus: ActivitySource[];
  salesStore: SalesStore;
  users: User[];
  currentUser: User;
  onSaveDay: (
    date: string,
    sellerId: string,
    record: DailyRecord
  ) => Promise<{ success: boolean; syncedToSheets: boolean; message: string }> | void;
  onDeleteDay: (date: string, sellerId: string) => void;
  initialDate?: string;
  initialSellerId?: string;
  sheetInfo?: SheetDatabaseInfo | null;
  syncState?: SyncState;
  syncMessage?: string | null;
  onOpenGoogleSheets?: () => void;
  onManualPushToSheets?: () => Promise<void>;
}

export const InputTab: React.FC<InputTabProps> = ({
  sources,
  fus,
  salesStore,
  users,
  currentUser,
  onSaveDay,
  onDeleteDay,
  initialDate,
  initialSellerId,
  sheetInfo,
  syncState = 'disconnected',
  syncMessage,
  onOpenGoogleSheets,
  onManualPushToSheets,
}) => {
  // Current user's seller ID (or initial target seller when editing from history)
  const [selectedSellerId, setSelectedSellerId] = useState<string>(
    currentUser.role === 'seller' ? currentUser.id : initialSellerId || currentUser.id
  );

  useEffect(() => {
    if (currentUser.role === 'seller') {
      setSelectedSellerId(currentUser.id);
    } else {
      setSelectedSellerId(initialSellerId || currentUser.id);
    }
  }, [initialSellerId, currentUser.id, currentUser.role]);

  const [selectedDate, setSelectedDate] = useState<string>(
    initialDate || formatDate(new Date())
  );
  const [formData, setFormData] = useState<Record<string, number>>({});
  const [savedNotification, setSavedNotification] = useState<{
    type: 'success' | 'warn' | 'error';
    text: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [manualSyncLoading, setManualSyncLoading] = useState(false);

  const activeSeller = useMemo(() => {
    return users.find((u) => u.id === selectedSellerId) || currentUser;
  }, [users, selectedSellerId, currentUser]);

  const storeKey = `${selectedDate}__${selectedSellerId}`;
  const isExistingRecord = Boolean(salesStore[storeKey]);

  // Sync form data whenever selectedDate, selectedSellerId, or salesStore changes
  useEffect(() => {
    const existing = salesStore[storeKey];
    const newForm: Record<string, number> = {};

    sources.forEach((s) => {
      newForm[`${s.id}_l`] = existing ? Number(existing[`${s.id}_l`] || 0) : 0;
      newForm[`${s.id}_q`] = existing ? Number(existing[`${s.id}_q`] || 0) : 0;
      newForm[`${s.id}_n`] = existing ? Number(existing[`${s.id}_n`] || 0) : 0;
      newForm[`${s.id}_w`] = existing ? Number(existing[`${s.id}_w`] || 0) : 0;
      newForm[`${s.id}_r`] = existing ? Number(existing[`${s.id}_r`] || 0) : 0;
    });

    fus.forEach((f) => {
      newForm[`${f.id}_a`] = existing ? Number(existing[`${f.id}_a`] || 0) : 0;
      newForm[`${f.id}_q`] = existing ? Number(existing[`${f.id}_q`] || 0) : 0;
      newForm[`${f.id}_n`] = existing ? Number(existing[`${f.id}_n`] || 0) : 0;
      newForm[`${f.id}_w`] = existing ? Number(existing[`${f.id}_w`] || 0) : 0;
      newForm[`${f.id}_r`] = existing ? Number(existing[`${f.id}_r`] || 0) : 0;
    });

    setFormData(newForm);
  }, [storeKey, salesStore, sources, fus]);

  const handleInputChange = (key: string, val: string) => {
    const parsed = Math.max(0, parseFloat(val) || 0);
    setFormData((prev) => ({
      ...prev,
      [key]: parsed,
    }));
  };

  // Calculate live daily totals
  const dailyTotals = useMemo(() => {
    let totalRevenue = 0;
    let totalWon = 0;
    let totalLeads = 0;
    let totalActs = 0;

    sources.forEach((s) => {
      totalRevenue += formData[`${s.id}_r`] || 0;
      totalWon += formData[`${s.id}_w`] || 0;
      totalLeads += formData[`${s.id}_l`] || 0;
    });

    fus.forEach((f) => {
      totalRevenue += formData[`${f.id}_r`] || 0;
      totalWon += formData[`${f.id}_w`] || 0;
      totalActs += formData[`${f.id}_a`] || 0;
    });

    return { totalRevenue, totalWon, totalLeads, totalActs };
  }, [formData, sources, fus]);

  const handleDateShift = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(formatDate(current));
  };

  const handleSetToday = () => {
    setSelectedDate(formatDate(new Date()));
  };

  const handleSetYesterday = () => {
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    setSelectedDate(formatDate(yest));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Security RBAC authorization guard
    if (currentUser.role === 'seller' && selectedSellerId !== currentUser.id) {
      alert('⚠️ សន្តិសុខប្រព័ន្ធ (Access Denied): អ្នកលក់មានសិទ្ធិកែប្រែទិន្នន័យតែរបស់ខ្លួនឯងប៉ុណ្ណោះ!');
      return;
    }

    const record: DailyRecord = {
      date: selectedDate,
      sellerId: selectedSellerId,
      sellerName: activeSeller.name,
      updatedAt: new Date().toISOString(),
      ...formData,
    };

    setIsSaving(true);
    try {
      const result = await onSaveDay(selectedDate, selectedSellerId, record);
      if (result && typeof result === 'object') {
        setSavedNotification({
          type: result.syncedToSheets ? 'success' : 'warn',
          text: result.message,
        });
      } else {
        setSavedNotification({
          type: sheetInfo ? 'success' : 'warn',
          text: sheetInfo
            ? `✅ បានរក្សាទុកទិន្នន័យថ្ងៃទី ${selectedDate} និង Sync ចូល Google Sheet រួចរាល់!`
            : `⚠️ បានរក្សាទុកក្នុង Local (មិនទាន់បានភ្ជាប់ Google Sheet ទេ)`,
        });
      }
    } catch (err: any) {
      setSavedNotification({
        type: 'error',
        text: `បរាជ័យក្នុងការរក្សាទុក: ${err.message || 'Error'}`,
      });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSavedNotification(null), 6000);
    }
  };

  const handleClear = () => {
    const resetForm: Record<string, number> = {};
    Object.keys(formData).forEach((k) => {
      resetForm[k] = 0;
    });
    setFormData(resetForm);
    setShowClearConfirm(false);
  };

  const handleDelete = () => {
    // Security RBAC authorization guard
    if (currentUser.role === 'seller') {
      alert('⚠️ សន្តិសុខប្រព័ន្ធ (Permission Restricted): អ្នកលក់មិនត្រូវបានអនុញ្ញាតឱ្យលុបកំណត់ត្រាប្រវត្តិឡើយ!');
      setShowDeleteConfirm(false);
      return;
    }

    onDeleteDay(selectedDate, selectedSellerId);
    setSavedNotification({
      type: 'warn',
      text: `🗑️ បានលុបទិន្នន័យថ្ងៃទី ${selectedDate} រួចរាល់!`,
    });
    setShowDeleteConfirm(false);
    setTimeout(() => setSavedNotification(null), 4000);
  };

  const handleTriggerManualSync = async () => {
    if (!onManualPushToSheets) return;
    setManualSyncLoading(true);
    try {
      await onManualPushToSheets();
    } finally {
      setManualSyncLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Google Sheets Real Database Connection Status Banner */}
      {sheetInfo ? (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-300 rounded-2xl p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Google Sheets Real DB Active
                  </span>
                  <h4 className="text-sm font-bold text-slate-800">
                    {sheetInfo.spreadsheetName}
                  </h4>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  ទិន្នន័យដែលបញ្ចូល & Save នឹងត្រូវសរសេរចូល Google Sheet ក្នុង Tab{' '}
                  <span className="font-semibold text-emerald-700">"DailySales"</span> ដោយផ្ទាល់
                  {sheetInfo.lastSyncedAt && (
                    <span className="ml-1 text-slate-500">
                      • Sync ចុងក្រោយ៖ {new Date(sheetInfo.lastSyncedAt).toLocaleTimeString()}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-auto">
              <a
                href={sheetInfo.spreadsheetUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold shadow-sm transition-colors"
                title="បើកមើល Google Sheet ផ្ទាល់"
              >
                <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                <span>បើកមើល Sheet</span>
              </a>
              {onManualPushToSheets && (
                <button
                  type="button"
                  onClick={handleTriggerManualSync}
                  disabled={manualSyncLoading || syncState === 'syncing'}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
                  title="ធ្វើសមកាលកម្មទិន្នន័យភ្លាមៗ"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      manualSyncLoading || syncState === 'syncing' ? 'animate-spin' : ''
                    }`}
                  />
                  <span>Sync ឥឡូវ</span>
                </button>
              )}
              {onOpenGoogleSheets && (
                <button
                  type="button"
                  onClick={onOpenGoogleSheets}
                  className="px-2.5 py-1.5 text-slate-500 hover:text-slate-800 text-xs font-semibold hover:bg-slate-100 rounded-lg transition-colors"
                  title="ការកំណត់ Google Sheets"
                >
                  ការកំណត់
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100/60 border border-amber-300 rounded-2xl p-4 shadow-sm">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shrink-0 mt-0.5">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                  <span>Google Sheets Database មិនទាន់បានភ្ជាប់នៅឡើយទេ!</span>
                  <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 bg-amber-200 text-amber-900 rounded-md">
                    Local Only
                  </span>
                </h4>
                <p className="text-xs text-amber-900/80 mt-1 leading-relaxed max-w-2xl">
                  <strong>ហេតុអ្វីបានជាបញ្ចូលទិន្នន័យហើយ តែមិនឃើញក្នុង Google Sheet?</strong>{' '}
                  ពីព្រោះអ្នកមិនទាន់បានចុច <strong>"ភ្ជាប់ Google Sheets"</strong> នៅក្នុង App នេះទេ។ បច្ចុប្បន្នទិន្នន័យត្រូវបានរក្សាទុកតែក្នុង Browser Local ប៉ុណ្ណោះ។
                </p>
              </div>
            </div>

            {onOpenGoogleSheets && (
              <button
                type="button"
                onClick={onOpenGoogleSheets}
                className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md hover:shadow transition-all shrink-0 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>+ ភ្ជាប់ Google Sheets ឥឡូវនេះ (Connect Real DB)</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. Notification Feedback Bar */}
      {savedNotification && (
        <div
          className={`border px-4 py-3 rounded-xl flex items-center justify-between shadow-sm animate-in fade-in transition-all ${
            savedNotification.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : savedNotification.type === 'error'
              ? 'bg-red-50 border-red-300 text-red-800'
              : 'bg-amber-50 border-amber-300 text-amber-800'
          }`}
        >
          <div className="flex items-center gap-2.5 font-bold text-sm">
            {savedNotification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            )}
            <span>{savedNotification.text}</span>
          </div>
          <div className="flex items-center gap-2">
            {!sheetInfo && onOpenGoogleSheets && (
              <button
                type="button"
                onClick={onOpenGoogleSheets}
                className="underline text-xs font-bold text-amber-900 hover:text-black ml-2"
              >
                ចុចទីនេះដើម្បីភ្ជាប់ Google Sheets
              </button>
            )}
            <button
              onClick={() => setSavedNotification(null)}
              className="text-slate-600 hover:text-slate-900 text-sm font-semibold ml-3"
            >
              បិទ
            </button>
          </div>
        </div>
      )}

      {/* 3. Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Date Selector & Seller Selector Bar */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 p-4 rounded-xl border border-blue-200/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-sm">
          {/* Date Picker */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-700" />
              <label htmlFor="inputDate" className="text-xs font-bold text-slate-800">
                កាលបរិច្ឆេទ (Date):
              </label>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleDateShift(-1)}
                className="p-1.5 border border-slate-300 bg-white hover:bg-slate-50 rounded-lg text-slate-600 transition-colors"
                title="ថ្ងៃមុន"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                type="date"
                id="inputDate"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="p-1.5 border border-slate-300 rounded-lg bg-white font-semibold text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                required
              />
              <button
                type="button"
                onClick={() => handleDateShift(1)}
                className="p-1.5 border border-slate-300 bg-white hover:bg-slate-50 rounded-lg text-slate-600 transition-colors"
                title="ថ្ងៃបន្ទាប់"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Seller Selector (If admin/dev has multiple sellers) */}
          {currentUser.role !== 'seller' && users.length > 1 && (
            <div className="flex items-center gap-2">
              <label htmlFor="sellerSelect" className="text-xs font-bold text-slate-700 whitespace-nowrap">
                ជ្រើសរើស Seller:
              </label>
              <select
                id="sellerSelect"
                value={selectedSellerId}
                onChange={(e) => setSelectedSellerId(e.target.value)}
                className="p-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quick Buttons & Record Status */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleSetToday}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                selectedDate === formatDate(new Date())
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              ថ្ងៃនេះ
            </button>
            <button
              type="button"
              onClick={handleSetYesterday}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              ម្សិលមិញ
            </button>

            {isExistingRecord ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                មានទិន្នន័យ (Editing)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                ទិន្នន័យថ្មី (New)
              </span>
            )}
          </div>
        </div>

        {/* Section 1: New Leads */}
        <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
            <div>
              <h3 className="text-lg font-bold text-blue-900">
                ១. លំហូរ New Leads (Inbound ពី Marketing & Walk-in)
              </h3>
              <p className="text-xs text-slate-500">
                បញ្ចូលចំនួន Leads ចូលថ្មី, អតិថិជន Qualified, Negotiation, Won និងចំណូលសរុប
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded bg-blue-100 text-blue-800">
              {sources.length} ប្រភព
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse min-w-[700px]">
              <thead className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3 border-b border-slate-200 w-1/4">ប្រភព Lead</th>
                  <th className="p-3 border-b border-slate-200 text-center">Leads ចូលថ្មី</th>
                  <th className="p-3 border-b border-slate-200 text-center">Qualified</th>
                  <th className="p-3 border-b border-slate-200 text-center">Negotiation</th>
                  <th className="p-3 border-b border-slate-200 text-center">Won (បិទបាន)</th>
                  <th className="p-3 border-b border-slate-200 text-center bg-blue-50 text-blue-900 font-bold">
                    ចំណូល ($)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sources.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-2.5 font-semibold text-slate-800">
                      <div>{s.name}</div>
                      <div className="text-[11px] text-slate-400 font-normal">
                        Target Won: {s.tgtW} / Leads: {s.tgtL}
                      </div>
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        min="0"
                        value={formData[`${s.id}_l`] || ''}
                        onChange={(e) => handleInputChange(`${s.id}_l`, e.target.value)}
                        className="w-20 p-2 text-center border border-slate-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        placeholder="0"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        min="0"
                        value={formData[`${s.id}_q`] || ''}
                        onChange={(e) => handleInputChange(`${s.id}_q`, e.target.value)}
                        className="w-20 p-2 text-center border border-slate-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        placeholder="0"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        min="0"
                        value={formData[`${s.id}_n`] || ''}
                        onChange={(e) => handleInputChange(`${s.id}_n`, e.target.value)}
                        className="w-20 p-2 text-center border border-slate-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        placeholder="0"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        min="0"
                        value={formData[`${s.id}_w`] || ''}
                        onChange={(e) => handleInputChange(`${s.id}_w`, e.target.value)}
                        className="w-20 p-2 text-center border border-emerald-300 bg-emerald-50/40 rounded-lg text-sm font-bold text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="0"
                      />
                    </td>
                    <td className="p-2 text-center bg-blue-50/40">
                      <div className="relative inline-block w-28">
                        <span className="absolute left-2.5 top-2 text-slate-400 font-bold text-xs">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData[`${s.id}_r`] || ''}
                          onChange={(e) => handleInputChange(`${s.id}_r`, e.target.value)}
                          className="w-full pl-6 pr-2 py-2 text-right border border-blue-300 bg-white rounded-lg text-sm font-bold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: Follow-Up & Outbound Activities */}
        <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
            <div>
              <h3 className="text-lg font-bold text-blue-900">
                ២. សកម្មភាព Follow-Up & Outbound Calls
              </h3>
              <p className="text-xs text-slate-500">
                បញ្ចូលចំនួនសកម្មភាពតេ/ទាក់ទង, អតិថិជន Qualified, Negotiation, Won និងចំណូល
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded bg-indigo-100 text-indigo-800">
              {fus.length} សកម្មភាព
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse min-w-[700px]">
              <thead className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3 border-b border-slate-200 w-1/4">ប្រភេទសកម្មភាព</th>
                  <th className="p-3 border-b border-slate-200 text-center">សកម្មភាព (Acts)</th>
                  <th className="p-3 border-b border-slate-200 text-center">Qualified</th>
                  <th className="p-3 border-b border-slate-200 text-center">Negotiation</th>
                  <th className="p-3 border-b border-slate-200 text-center">Won (បិទបាន)</th>
                  <th className="p-3 border-b border-slate-200 text-center bg-blue-50 text-blue-900 font-bold">
                    ចំណូល ($)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fus.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-2.5 font-semibold text-slate-800">
                      <div>{f.name}</div>
                      <div className="text-[11px] text-slate-400 font-normal">
                        Target Won: {f.tgtW} / Acts: {f.tgtA}
                      </div>
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        min="0"
                        value={formData[`${f.id}_a`] || ''}
                        onChange={(e) => handleInputChange(`${f.id}_a`, e.target.value)}
                        className="w-20 p-2 text-center border border-slate-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        placeholder="0"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        min="0"
                        value={formData[`${f.id}_q`] || ''}
                        onChange={(e) => handleInputChange(`${f.id}_q`, e.target.value)}
                        className="w-20 p-2 text-center border border-slate-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        placeholder="0"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        min="0"
                        value={formData[`${f.id}_n`] || ''}
                        onChange={(e) => handleInputChange(`${f.id}_n`, e.target.value)}
                        className="w-20 p-2 text-center border border-slate-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        placeholder="0"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        min="0"
                        value={formData[`${f.id}_w`] || ''}
                        onChange={(e) => handleInputChange(`${f.id}_w`, e.target.value)}
                        className="w-20 p-2 text-center border border-emerald-300 bg-emerald-50/40 rounded-lg text-sm font-bold text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="0"
                      />
                    </td>
                    <td className="p-2 text-center bg-blue-50/40">
                      <div className="relative inline-block w-28">
                        <span className="absolute left-2.5 top-2 text-slate-400 font-bold text-xs">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData[`${f.id}_r`] || ''}
                          onChange={(e) => handleInputChange(`${f.id}_r`, e.target.value)}
                          className="w-full pl-6 pr-2 py-2 text-right border border-blue-300 bg-white rounded-lg text-sm font-bold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Daily Summary Bar */}
        <div className="bg-gradient-to-r from-indigo-950 via-blue-900 to-slate-900 text-white p-5 rounded-xl shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="text-xs uppercase font-medium text-blue-200 tracking-wider">
                💰 ចំណូលសរុបថ្ងៃនេះ ({activeSeller.name})
              </p>
              <h2 className="text-3xl font-extrabold text-amber-400 mt-1">
                {fmtMoney(dailyTotals.totalRevenue)}
              </h2>
            </div>
            <div className="h-10 w-px bg-white/20 hidden sm:block" />
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-blue-200 block text-xs">សិស្សបិទបាន (Won)</span>
                <span className="font-bold text-lg text-white">{dailyTotals.totalWon} នាក់</span>
              </div>
              <div>
                <span className="text-blue-200 block text-xs">Leads ចូលថ្មី</span>
                <span className="font-bold text-lg text-white">{dailyTotals.totalLeads}</span>
              </div>
              <div>
                <span className="text-blue-200 block text-xs">សកម្មភាព (Acts)</span>
                <span className="font-bold text-lg text-white">{dailyTotals.totalActs}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="px-3.5 py-3 rounded-lg border border-white/20 hover:bg-white/10 text-white font-semibold text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="កំណត់ទិន្នន័យជាសូន្យ"
            >
              <RotateCcw className="w-4 h-4" />
              <span>សម្អាត</span>
            </button>
            {isExistingRecord && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3.5 py-3 rounded-lg border border-red-400/40 bg-red-500/20 hover:bg-red-500/30 text-red-200 font-semibold text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="លុបទិន្នន័យថ្ងៃនេះ"
              >
                <Trash2 className="w-4 h-4 text-red-300" />
                <span>លុប</span>
              </button>
            )}
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 md:flex-initial bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:opacity-60 text-white font-bold px-6 py-3 rounded-lg shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-base transition-all cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>កំពុងរក្សាទុក & Sync...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>💾 រក្សាទុកទិន្នន័យប្រចាំថ្ងៃ</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Confirmation Modal for Deleting Daily Entry */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title={`តើអ្នកពិតជាចង់លុបទិន្នន័យថ្ងៃទី ${selectedDate} ឬទេ?`}
        message={`ទិន្នន័យលក់របស់អ្នកលក់ [${activeSeller.name}] សម្រាប់ថ្ងៃទី ${selectedDate} នឹងត្រូវលុបចេញពីប្រព័ន្ធ។`}
        confirmLabel="លុបចេញ"
        cancelLabel="បោះបង់"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* Confirmation Modal for Clearing Inputs */}
      <ConfirmModal
        isOpen={showClearConfirm}
        title="តើអ្នកចង់កំណត់លេខទាំងអស់ជាសូន្យឡើងវិញឬទេ?"
        message="ទម្រង់នឹងត្រូវសម្អាតតួលេខទាំងអស់ជាសូន្យឡើងវិញ។"
        confirmLabel="សម្អាត"
        cancelLabel="បោះបង់"
        onConfirm={handleClear}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
};
