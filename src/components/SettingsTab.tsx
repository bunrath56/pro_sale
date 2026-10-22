import React, { useState } from 'react';
import { LeadSource, ActivitySource } from '../types/sales';
import { ConfirmModal } from './ConfirmModal';
import { Plus, RotateCcw, Trash2, Edit3, Check, X, ShieldAlert, Sliders } from 'lucide-react';

interface SettingsTabProps {
  sources: LeadSource[];
  fus: ActivitySource[];
  onAddSource: (source: LeadSource) => void;
  onUpdateSource: (source: LeadSource) => void;
  onDeleteSource: (id: string) => void;
  onResetSources: () => void;
  onClearAllSalesData: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  sources,
  fus,
  onAddSource,
  onUpdateSource,
  onDeleteSource,
  onResetSources,
  onClearAllSalesData,
}) => {
  const [newSourceName, setNewSourceName] = useState('');
  const [newTgtW, setNewTgtW] = useState<number>(30);
  const [newTgtL, setNewTgtL] = useState<number>(90);
  const [workingDays, setWorkingDays] = useState<number>(25);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editTgtW, setEditTgtW] = useState<number>(0);
  const [editTgtL, setEditTgtL] = useState<number>(0);

  const [deleteSourceId, setDeleteSourceId] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleAddSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceName.trim()) return;

    const days = workingDays || 25;
    const tgtW = Number(newTgtW) || 0;
    const tgtL = Number(newTgtL) || 0;

    const newSource: LeadSource = {
      id: 'src_' + Date.now(),
      name: newSourceName.trim(),
      tgtW,
      tgtL,
      dtgtW: Math.round(tgtW / days) || 0,
      dtgtL: Math.round(tgtL / days) || 0,
      isCustom: true,
    };

    onAddSource(newSource);
    setNewSourceName('');
    setNewTgtW(30);
    setNewTgtL(90);
  };

  const startEdit = (source: LeadSource) => {
    setEditingId(source.id);
    setEditName(source.name);
    setEditTgtW(source.tgtW);
    setEditTgtL(source.tgtL);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = (id: string) => {
    const days = workingDays || 25;
    const original = sources.find((s) => s.id === id);
    if (!original) return;

    const updated: LeadSource = {
      ...original,
      name: editName.trim() || original.name,
      tgtW: Number(editTgtW) || 0,
      tgtL: Number(editTgtL) || 0,
      dtgtW: Math.round((Number(editTgtW) || 0) / days) || 0,
      dtgtL: Math.round((Number(editTgtL) || 0) / days) || 0,
    };

    onUpdateSource(updated);
    setEditingId(null);
  };

  return (
    <div className="space-y-8">
      {/* 1. Add Custom Lead Source Section */}
      <div className="bg-amber-50/70 border border-amber-200/90 p-5 rounded-xl shadow-xs space-y-4">
        <div>
          <h2 className="text-xl font-bold text-amber-900 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-700" />
            <span>⚙️ បន្ថែមប្រភព Lead ថ្មី (Add Custom Lead Source)</span>
          </h2>
          <p className="text-xs sm:text-sm text-amber-800 mt-1">
            អ្នកអាចបង្កើតប្រភព Lead ថ្មីនៅទីនេះ (ឧទាហរណ៍៖ TikTok Ads, Telegram Community, Campus Roadshow)។
            នៅពេលបន្ថែមរួច វានឹងលោតចូលក្នុងទម្រង់បញ្ចូលទិន្នន័យ និងរបាយការណ៍ទាំងអស់ដោយស្វ័យប្រវត្តិ។
          </p>
        </div>

        <form onSubmit={handleAddSource} className="bg-white p-5 rounded-xl border border-amber-200 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ឈ្មោះប្រភពថ្មី (Lead Source Name)
              </label>
              <input
                type="text"
                placeholder="ឧ. TikTok Ads ឬ Telegram Channel"
                value={newSourceName}
                onChange={(e) => setNewSourceName(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Target Won ប្រចាំខែ
              </label>
              <input
                type="number"
                min="0"
                value={newTgtW}
                onChange={(e) => setNewTgtW(Number(e.target.value))}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-semibold text-emerald-700 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Target Leads ប្រចាំខែ
              </label>
              <input
                type="number"
                min="0"
                value={newTgtL}
                onChange={(e) => setNewTgtL(Number(e.target.value))}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-semibold text-blue-700 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span>ថ្ងៃធ្វើការក្នុង១ខែ (Working days):</span>
              <input
                type="number"
                min="1"
                max="31"
                value={workingDays}
                onChange={(e) => setWorkingDays(Number(e.target.value) || 25)}
                className="w-16 p-1 border border-slate-300 rounded text-center text-xs font-bold"
              />
              <span className="text-slate-400">
                (Daily Target គណនាស្វ័យប្រវត្តិ៖ ~{Math.round(newTgtW / (workingDays || 25))} Won / ~
                {Math.round(newTgtL / (workingDays || 25))} Leads)
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-5 rounded-lg shadow-sm flex items-center gap-2 text-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>+ បន្ថែមប្រភពចូលទៅក្នុងប្រព័ន្ធ</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 2. Current Sources Management Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">
              បញ្ជីប្រភព New Leads បច្ចុប្បន្ន ({sources.length} ប្រភព)
            </h3>
            <p className="text-xs text-slate-500">
              អ្នកអាចកែប្រែគោលដៅ (Monthly Targets) ឬលុបប្រភពដែលបានបង្កើតដោយខ្លួនឯង
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg text-xs font-bold border border-red-200 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>🔄 Reset ប្រភពទៅកាន់ស្តង់ដារដើម</span>
          </button>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-slate-100 text-slate-700 text-xs font-bold uppercase">
              <tr>
                <th className="p-3 border-b">ឈ្មោះប្រភព (Source Name)</th>
                <th className="p-3 border-b text-center">Monthly Target Won</th>
                <th className="p-3 border-b text-center">Monthly Target Leads</th>
                <th className="p-3 border-b text-center">Daily Won Target</th>
                <th className="p-3 border-b text-center">Daily Leads Target</th>
                <th className="p-3 border-b text-center">សកម្មភាព</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {sources.map((s) => {
                const isEditing = editingId === s.id;
                return (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-semibold">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="p-1.5 border border-slate-300 rounded w-full text-sm font-semibold"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <span>{s.name}</span>
                          {s.isCustom && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                              Custom
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="p-3 text-center">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editTgtW}
                          onChange={(e) => setEditTgtW(Number(e.target.value))}
                          className="p-1 border border-slate-300 rounded w-20 text-center font-bold text-emerald-700 text-sm"
                        />
                      ) : (
                        <span className="font-bold text-emerald-700">{s.tgtW}</span>
                      )}
                    </td>

                    <td className="p-3 text-center">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editTgtL}
                          onChange={(e) => setEditTgtL(Number(e.target.value))}
                          className="p-1 border border-slate-300 rounded w-20 text-center font-bold text-blue-700 text-sm"
                        />
                      ) : (
                        <span className="font-bold text-blue-700">{s.tgtL}</span>
                      )}
                    </td>

                    <td className="p-3 text-center text-slate-600 font-medium">
                      {isEditing ? Math.round(editTgtW / (workingDays || 25)) : s.dtgtW}
                    </td>

                    <td className="p-3 text-center text-slate-600 font-medium">
                      {isEditing ? Math.round(editTgtL / (workingDays || 25)) : s.dtgtL}
                    </td>

                    <td className="p-3 text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => saveEdit(s.id)}
                            className="p-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                            title="រក្សាទុក"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="p-1.5 bg-slate-300 text-slate-700 rounded hover:bg-slate-400"
                            title="បោះបង់"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(s)}
                            className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded"
                            title="កែប្រែ Target"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {s.isCustom && (
                            <button
                              type="button"
                              onClick={() => setDeleteSourceId(s.id)}
                              className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded cursor-pointer transition-colors active:scale-95"
                              title="លុបប្រភពនេះ"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Follow-up / Outbound Categories Overview */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div>
          <h3 className="font-bold text-slate-800 text-lg">
            ប្រភេទសកម្មភាព Follow-up & Outbound ({fus.length} ប្រភេទ)
          </h3>
          <p className="text-xs text-slate-500">
            សកម្មភាពស្នូលសម្រាប់ការហៅទូរស័ព្ទ និងតាមដានអតិថិជន
          </p>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-slate-100 text-slate-700 text-xs font-bold uppercase">
              <tr>
                <th className="p-3 border-b">ប្រភេទសកម្មភាព (Activity)</th>
                <th className="p-3 border-b text-center">Monthly Target Won</th>
                <th className="p-3 border-b text-center">Monthly Target Acts</th>
                <th className="p-3 border-b text-center">Daily Won Target</th>
                <th className="p-3 border-b text-center">Daily Acts Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {fus.map((f) => (
                <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3 font-semibold">{f.name}</td>
                  <td className="p-3 text-center font-bold text-emerald-700">{f.tgtW}</td>
                  <td className="p-3 text-center font-bold text-blue-700">{f.tgtA}</td>
                  <td className="p-3 text-center text-slate-600 font-medium">{f.dtgtW}</td>
                  <td className="p-3 text-center text-slate-600 font-medium">{f.dtgtA}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Danger Zone */}
      <div className="border border-red-200 bg-red-50/30 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-red-900 font-bold">
          <ShieldAlert className="w-5 h-5 text-red-600" />
          <span>ការគ្រប់គ្រងទិន្នន័យ (Data Management)</span>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>សម្អាតទិន្នន័យលក់ទាំងអស់ (Clear All Sales Records)</span>
          </button>
        </div>
      </div>

      {/* Modal: Delete Custom Source */}
      <ConfirmModal
        isOpen={Boolean(deleteSourceId)}
        title="តើអ្នកពិតជាចង់លុបប្រភពនេះឬទេ?"
        message="ប្រភព Lead នេះនឹងត្រូវដកចេញពីប្រព័ន្ធ និងតារាងបញ្ចូលទិន្នន័យ។"
        confirmLabel="លុបចេញ"
        cancelLabel="បោះបង់"
        onConfirm={() => {
          if (deleteSourceId) {
            onDeleteSource(deleteSourceId);
            setDeleteSourceId(null);
          }
        }}
        onCancel={() => setDeleteSourceId(null)}
      />

      {/* Modal: Reset Sources */}
      <ConfirmModal
        isOpen={showResetConfirm}
        title="តើអ្នកចង់ Reset ប្រភពទាំងអស់ទៅស្តង់ដារដើមវិញឬទេ?"
        message="ប្រភពដែលបានបន្ថែមថ្មីទាំងអស់នឹងត្រូវលុបចេញ ហើយត្រលប់ទៅទម្រង់ស្តង់ដារដើមវិញ។"
        confirmLabel="Reset ដើមវិញ"
        cancelLabel="បោះបង់"
        onConfirm={() => {
          onResetSources();
          setShowResetConfirm(false);
        }}
        onCancel={() => setShowResetConfirm(false)}
      />

      {/* Modal: Clear All Records */}
      <ConfirmModal
        isOpen={showClearConfirm}
        title="⚠️ តើអ្នកពិតជាចង់លុបទិន្នន័យលក់ទាំងអស់ឬទេ?"
        message="រាល់កំណត់ត្រាលក់ទាំងអស់ក្នុងប្រព័ន្ធនឹងត្រូវលុបចោលទាំងស្រុង។ សកម្មភាពនេះមិនអាចត្រឡប់ក្រោយបានទេ។"
        confirmLabel="លុបទាំងអស់"
        cancelLabel="បោះបង់"
        onConfirm={() => {
          onClearAllSalesData();
          setShowClearConfirm(false);
        }}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
};
