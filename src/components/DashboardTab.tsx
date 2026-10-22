import React, { useState, useMemo } from 'react';
import { LeadSource, ActivitySource, SalesStore, User } from '../types/sales';
import { fmtMoney, getRate, getRateNumber, formatDate, exportToCSV } from '../utils/formatters';
import {
  DollarSign,
  Users,
  Target,
  PhoneCall,
  Calendar,
  Download,
  Filter,
  CheckCircle,
  Check,
  UserCheck,
} from 'lucide-react';

interface DashboardTabProps {
  sources: LeadSource[];
  fus: ActivitySource[];
  salesStore: SalesStore;
  users: User[];
  currentUser: User;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  sources,
  fus,
  salesStore,
  users,
  currentUser,
}) => {
  const sellerUsers = useMemo(() => {
    return users.filter((u) => u.role === 'seller');
  }, [users]);

  // Selected Seller filter: 'ALL' or seller ID.
  // If currentUser is a seller, default to their ID. Otherwise default to 'ALL' for Manager / Dev.
  const [selectedSellerId, setSelectedSellerId] = useState<string>(
    currentUser.role === 'seller' ? currentUser.id : 'ALL'
  );

  const todayStr = useMemo(() => formatDate(new Date()), []);
  const firstDayOfMonthStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  }, []);

  // Filter 1: Single Date for Part A (Today vs MTD)
  const [singleDate, setSingleDate] = useState<string>(todayStr);

  // Filter 2: Date Range for Part B & Part C
  const [startDate, setStartDate] = useState<string>(firstDayOfMonthStr);
  const [endDate, setEndDate] = useState<string>(todayStr);

  const activeSellerObj = useMemo(() => {
    if (selectedSellerId === 'ALL') return null;
    return users.find((u) => u.id === selectedSellerId) || null;
  }, [selectedSellerId, users]);

  // Quick Preset Helper for Part B/C Date Range
  const applyPreset = (preset: 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'lastMonth') => {
    const now = new Date();
    if (preset === 'today') {
      const s = formatDate(now);
      setStartDate(s);
      setEndDate(s);
    } else if (preset === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const s = formatDate(y);
      setStartDate(s);
      setEndDate(s);
    } else if (preset === 'last7') {
      const past = new Date(now);
      past.setDate(past.getDate() - 6);
      setStartDate(formatDate(past));
      setEndDate(formatDate(now));
    } else if (preset === 'thisMonth') {
      setStartDate(firstDayOfMonthStr);
      setEndDate(formatDate(now));
    } else if (preset === 'lastMonth') {
      const firstLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(formatDate(firstLastMonth));
      setEndDate(formatDate(lastLastMonth));
    }
  };

  // --- PART A DATA CALCULATION ---
  const partAData = useMemo(() => {
    const selMonth = singleDate.substring(0, 7);

    const todayAggregated: Record<string, number> = {};
    const mtdAggregated: Record<string, number> = {};

    sources.forEach((s) => {
      todayAggregated[`${s.id}_l`] = 0;
      todayAggregated[`${s.id}_w`] = 0;
      todayAggregated[`${s.id}_r`] = 0;

      mtdAggregated[`${s.id}_l`] = 0;
      mtdAggregated[`${s.id}_w`] = 0;
      mtdAggregated[`${s.id}_r`] = 0;
    });

    fus.forEach((f) => {
      todayAggregated[`${f.id}_a`] = 0;
      todayAggregated[`${f.id}_w`] = 0;
      todayAggregated[`${f.id}_r`] = 0;

      mtdAggregated[`${f.id}_a`] = 0;
      mtdAggregated[`${f.id}_w`] = 0;
      mtdAggregated[`${f.id}_r`] = 0;
    });

    let totalMtdRev = 0;

    Object.keys(salesStore).forEach((key) => {
      const r = salesStore[key];
      if (!r) return;

      // Filter by seller if specific seller selected
      if (selectedSellerId !== 'ALL' && r.sellerId !== selectedSellerId) {
        return;
      }

      // Today
      if (r.date === singleDate) {
        sources.forEach((s) => {
          todayAggregated[`${s.id}_l`] += Number(r[`${s.id}_l`] || 0);
          todayAggregated[`${s.id}_w`] += Number(r[`${s.id}_w`] || 0);
          todayAggregated[`${s.id}_r`] += Number(r[`${s.id}_r`] || 0);
        });
        fus.forEach((f) => {
          todayAggregated[`${f.id}_a`] += Number(r[`${f.id}_a`] || 0);
          todayAggregated[`${f.id}_w`] += Number(r[`${f.id}_w`] || 0);
          todayAggregated[`${f.id}_r`] += Number(r[`${f.id}_r`] || 0);
        });
      }

      // MTD
      if (r.date.startsWith(selMonth) && r.date <= singleDate) {
        sources.forEach((s) => {
          mtdAggregated[`${s.id}_l`] += Number(r[`${s.id}_l`] || 0);
          mtdAggregated[`${s.id}_w`] += Number(r[`${s.id}_w`] || 0);
          mtdAggregated[`${s.id}_r`] += Number(r[`${s.id}_r`] || 0);
          totalMtdRev += Number(r[`${s.id}_r`] || 0);
        });
        fus.forEach((f) => {
          mtdAggregated[`${f.id}_a`] += Number(r[`${f.id}_a`] || 0);
          mtdAggregated[`${f.id}_w`] += Number(r[`${f.id}_w`] || 0);
          mtdAggregated[`${f.id}_r`] += Number(r[`${f.id}_r`] || 0);
          totalMtdRev += Number(r[`${f.id}_r`] || 0);
        });
      }
    });

    let mtdTotW = 0;
    let mtdTotL = 0;
    let mtdTotFA = 0;
    let mtdTotFW = 0;

    sources.forEach((s) => {
      mtdTotW += mtdAggregated[`${s.id}_w`] || 0;
      mtdTotL += mtdAggregated[`${s.id}_l`] || 0;
    });

    fus.forEach((f) => {
      mtdTotFW += mtdAggregated[`${f.id}_w`] || 0;
      mtdTotFA += mtdAggregated[`${f.id}_a`] || 0;
    });

    return {
      todayData: todayAggregated,
      mtd: mtdAggregated,
      totalMtdRev,
      totalWonCustomers: mtdTotW + mtdTotFW,
      totalMtdLeads: mtdTotL,
      totalMtdActs: mtdTotFA,
    };
  }, [salesStore, singleDate, selectedSellerId, sources, fus]);

  // --- PART B & PART C DATA CALCULATION ---
  const partBCData = useMemo(() => {
    const fun: Record<string, number> = {};
    sources.forEach((s) => {
      fun[`${s.id}_l`] = 0;
      fun[`${s.id}_q`] = 0;
      fun[`${s.id}_n`] = 0;
      fun[`${s.id}_w`] = 0;
      fun[`${s.id}_r`] = 0;
    });
    fus.forEach((f) => {
      fun[`${f.id}_a`] = 0;
      fun[`${f.id}_q`] = 0;
      fun[`${f.id}_n`] = 0;
      fun[`${f.id}_w`] = 0;
      fun[`${f.id}_r`] = 0;
    });

    let recordsIncluded = 0;
    Object.keys(salesStore).forEach((key) => {
      const r = salesStore[key];
      if (!r) return;

      if (selectedSellerId !== 'ALL' && r.sellerId !== selectedSellerId) {
        return;
      }

      if (r.date >= startDate && r.date <= endDate) {
        recordsIncluded++;
        sources.forEach((s) => {
          fun[`${s.id}_l`] += Number(r[`${s.id}_l`] || 0);
          fun[`${s.id}_q`] += Number(r[`${s.id}_q`] || 0);
          fun[`${s.id}_n`] += Number(r[`${s.id}_n`] || 0);
          fun[`${s.id}_w`] += Number(r[`${s.id}_w`] || 0);
          fun[`${s.id}_r`] += Number(r[`${s.id}_r`] || 0);
        });
        fus.forEach((f) => {
          fun[`${f.id}_a`] += Number(r[`${f.id}_a`] || 0);
          fun[`${f.id}_q`] += Number(r[`${f.id}_q`] || 0);
          fun[`${f.id}_n`] += Number(r[`${f.id}_n`] || 0);
          fun[`${f.id}_w`] += Number(r[`${f.id}_w`] || 0);
          fun[`${f.id}_r`] += Number(r[`${f.id}_r`] || 0);
        });
      }
    });

    let totalNL = 0;
    let totalNQ = 0;
    let totalNN = 0;
    let totalNW = 0;
    let totalNRev = 0;
    sources.forEach((s) => {
      totalNL += fun[`${s.id}_l`];
      totalNQ += fun[`${s.id}_q`];
      totalNN += fun[`${s.id}_n`];
      totalNW += fun[`${s.id}_w`];
      totalNRev += fun[`${s.id}_r`];
    });

    let totalFA = 0;
    let totalFQ = 0;
    let totalFN = 0;
    let totalFW = 0;
    let totalFRev = 0;
    fus.forEach((f) => {
      totalFA += fun[`${f.id}_a`];
      totalFQ += fun[`${f.id}_q`];
      totalFN += fun[`${f.id}_n`];
      totalFW += fun[`${f.id}_w`];
      totalFRev += fun[`${f.id}_r`];
    });

    return {
      fun,
      recordsIncluded,
      leadsTotals: {
        l: totalNL,
        q: totalNQ,
        n: totalNN,
        w: totalNW,
        r: totalNRev,
      },
      fuTotals: {
        a: totalFA,
        q: totalFQ,
        n: totalFN,
        w: totalFW,
        r: totalFRev,
      },
    };
  }, [salesStore, startDate, endDate, selectedSellerId, sources, fus]);

  // Target Scaler: If viewing an individual seller, targets are the same for all sellers (equal share of total target)
  const sellerScale = useMemo(() => {
    if (selectedSellerId === 'ALL') return 1;
    return 1 / Math.max(1, sellerUsers.length);
  }, [selectedSellerId, sellerUsers.length]);

  // Export Part A Summary to CSV
  const handleExportSummaryCSV = () => {
    const scopeLabel = selectedSellerId === 'ALL' ? 'All_Sellers' : activeSellerObj?.name || 'Seller';
    const rows: (string | number)[][] = [
      ['Master IT School - Sales Summary Report', `Scope: ${scopeLabel}`, `Date: ${singleDate}`],
      [],
      ['សូចនាករ / ប្រភពសកម្មភាព', 'Today Actual', 'Daily Target', 'MTD Actual', 'Monthly Target', '% MTD Pacing'],
      ['--- ១. លំហូរ New Leads តាមប្រភព ---'],
    ];

    sources.forEach((s) => {
      const tw = partAData.todayData[`${s.id}_w`] || 0;
      const tl = partAData.todayData[`${s.id}_l`] || 0;
      const tr = partAData.todayData[`${s.id}_r`] || 0;
      const mtdW = partAData.mtd[`${s.id}_w`] || 0;
      const mtdL = partAData.mtd[`${s.id}_l`] || 0;
      const mtdR = partAData.mtd[`${s.id}_r`] || 0;
      const effectiveTgtW = Math.round(s.tgtW * sellerScale) || 1;
      const effectiveTgtL = Math.round(s.tgtL * sellerScale) || 1;
      rows.push([
        s.name,
        `${tw} Won (${tl} L / ${fmtMoney(Number(tr))})`,
        `${Math.round(s.dtgtW * sellerScale)} Won (${Math.round(s.dtgtL * sellerScale)} L)`,
        `${mtdW} Won (${mtdL} L / ${fmtMoney(Number(mtdR))})`,
        `${effectiveTgtW} Won (${effectiveTgtL} L)`,
        getRate(mtdW, effectiveTgtW),
      ]);
    });

    exportToCSV(`MasterIT_Summary_${scopeLabel}_${singleDate}`, rows);
  };

  return (
    <div className="space-y-8">
      {/* ============================================================ */}
      {/* SELLER SELECTION LIST BOX: CHOOSE ALL OR ONE SELLER          */}
      {/* ============================================================ */}
      {currentUser.role !== 'seller' && (
        <section className="bg-white border border-blue-200/90 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <span>ជ្រើសរើសអ្នកលក់ (Choose All or One Seller)</span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {selectedSellerId === 'ALL'
                      ? 'អ្នកលក់ទាំងអស់ (All Sellers)'
                      : activeSellerObj?.name}
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  ចុចលើប្រអប់ខាងក្រោម ឬជ្រើសរើសពីបញ្ជី (List Box) ដើម្បីមើលទិន្នន័យអ្នកលក់ទាំងអស់ ឬអ្នកលក់ម្នាក់ៗ
                </p>
              </div>
            </div>

            {/* List Box Dropdown */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label htmlFor="sellerSelectBox" className="text-xs font-bold text-slate-600 whitespace-nowrap">
                បញ្ជីជ្រើសរើស (List Box):
              </label>
              <select
                id="sellerSelectBox"
                value={selectedSellerId}
                onChange={(e) => setSelectedSellerId(e.target.value)}
                className="w-full sm:w-64 p-2 bg-slate-50 hover:bg-white border border-blue-300 rounded-xl text-slate-900 font-bold text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
              >
                <option value="ALL">👥 អ្នកលក់ទាំងអស់ (All Sellers at once)</option>
                <optgroup label="អ្នកលក់ម្នាក់ៗ (One Seller)">
                  {sellerUsers.map((s) => (
                    <option key={s.id} value={s.id}>
                      👤 {s.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>

          {/* Interactive Card List Box Items */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2.5 pt-1">
            {/* Option 1: All Sellers Card */}
            <button
              type="button"
              onClick={() => setSelectedSellerId('ALL')}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                selectedSellerId === 'ALL'
                  ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-500/20 shadow-xs'
                  : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1.5">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                    selectedSellerId === 'ALL'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  👥
                </div>
                {selectedSellerId === 'ALL' && (
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
              <div>
                <div className="font-bold text-xs sm:text-sm text-slate-900 leading-tight">
                  អ្នកលក់ទាំងអស់
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  All ({sellerUsers.length} នាក់)
                </div>
              </div>
            </button>

            {/* Individual Seller Cards */}
            {sellerUsers.map((s) => {
              const isSelected = selectedSellerId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedSellerId(s.id)}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-500/20 shadow-xs'
                      : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1.5">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs ${
                        s.avatarColor || 'bg-blue-600'
                      }`}
                    >
                      {s.name.substring(0, 2).toUpperCase()}
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div
                      className="font-bold text-xs sm:text-sm text-slate-900 truncate leading-tight"
                      title={s.name}
                    >
                      {s.name}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                      អ្នកលក់ (Seller)
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ============================================================ */}
      {/* PART A: SUMMARY REPORT (TODAY VS MTD)                        */}
      {/* ============================================================ */}
      <section className="border border-blue-200 rounded-2xl p-5 bg-white shadow-sm space-y-6">
        {/* Header with single date picker */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-black text-blue-950 border-l-4 border-blue-600 pl-3 flex items-center gap-2">
              <span>ផ្នែកទី ១៖ របាយការណ៍សង្ខេប (Today vs MTD)</span>
              {selectedSellerId !== 'ALL' && activeSellerObj && (
                <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2.5 py-0.5 rounded-full">
                  អ្នកលក់: {activeSellerObj.name}
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500 pl-4 mt-0.5">
              {selectedSellerId === 'ALL'
                ? 'របាយការណ៍បូកសរុបអ្នកលក់ទាំងអស់ក្នុងពេលតែមួយ (All Sellers at once)'
                : `របាយការណ៍សង្ខេបផ្ទាល់ខ្លួនរបស់អ្នកលក់ [${activeSellerObj?.name}]`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-blue-50/80 p-1.5 px-3 rounded-lg border border-blue-200">
              <Calendar className="w-4 h-4 text-blue-700" />
              <label htmlFor="dashSingleDate" className="font-bold text-blue-900 text-xs sm:text-sm">
                មើលរបាយការណ៍ត្រឹមថ្ងៃទី:
              </label>
              <input
                type="date"
                id="dashSingleDate"
                value={singleDate}
                onChange={(e) => setSingleDate(e.target.value)}
                className="p-1 border border-blue-200 rounded bg-white text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleExportSummaryCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold rounded-lg border border-blue-200 transition-colors"
              title="ទាញយកសង្ខេបជា CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Revenue */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-4 rounded-xl shadow-md flex items-center justify-between relative overflow-hidden">
            <div>
              <p className="text-xs font-medium text-blue-100 uppercase tracking-wider">
                ចំណូល MTD (Total Revenue)
              </p>
              <h3 className="text-2xl font-black mt-1 tracking-tight text-white">
                {fmtMoney(partAData.totalMtdRev)}
              </h3>
              <p className="text-[11px] text-blue-200 mt-1">ត្រឹមថ្ងៃទី {singleDate}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>

          {/* Card 2: Won Customers */}
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white p-4 rounded-xl shadow-md flex items-center justify-between relative overflow-hidden">
            <div>
              <p className="text-xs font-medium text-emerald-100 uppercase tracking-wider">
                សិស្សបិទបាន (Won Customers)
              </p>
              <h3 className="text-2xl font-black mt-1 tracking-tight text-white">
                {partAData.totalWonCustomers} នាក់
              </h3>
              <p className="text-[11px] text-emerald-200 mt-1">Inbound + Outbound</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
          </div>

          {/* Card 3: Total New Leads */}
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white p-4 rounded-xl shadow-md flex items-center justify-between relative overflow-hidden">
            <div>
              <p className="text-xs font-medium text-indigo-100 uppercase tracking-wider">
                New Leads ចូលសរុប (MTD)
              </p>
              <h3 className="text-2xl font-black mt-1 tracking-tight text-white">
                {partAData.totalMtdLeads.toLocaleString()}
              </h3>
              <p className="text-[11px] text-indigo-200 mt-1">ពីគ្រប់ប្រភព Marketing</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>

          {/* Card 4: Total Outbound Acts */}
          <div className="bg-gradient-to-br from-purple-600 to-purple-700 text-white p-4 rounded-xl shadow-md flex items-center justify-between relative overflow-hidden">
            <div>
              <p className="text-xs font-medium text-purple-100 uppercase tracking-wider">
                សកម្មភាពខលចេញរួម (MTD Acts)
              </p>
              <h3 className="text-2xl font-black mt-1 tracking-tight text-white">
                {partAData.totalMtdActs.toLocaleString()}
              </h3>
              <p className="text-[11px] text-purple-200 mt-1">Cold Calls & Follow-ups</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <PhoneCall className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Summary Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-xs">
          <table className="w-full text-sm text-left border-collapse min-w-[850px]">
            <thead className="bg-blue-900 text-white text-xs uppercase tracking-wider">
              <tr>
                <th className="p-3.5 border-b border-blue-950 font-bold">សូចនាករ / ប្រភពសកម្មភាព</th>
                <th className="p-3.5 border-b border-blue-950 text-center font-bold">Today Actual</th>
                <th className="p-3.5 border-b border-blue-950 text-center font-bold">Daily Target</th>
                <th className="p-3.5 border-b border-blue-950 text-center font-bold">MTD Actual</th>
                <th className="p-3.5 border-b border-blue-950 text-center font-bold">Monthly Target</th>
                <th className="p-3.5 border-b border-blue-950 text-center font-bold">% MTD Pacing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {/* Section 1 Header */}
              <tr className="bg-blue-50/90 font-bold">
                <td colSpan={6} className="p-2.5 px-4 text-blue-950 text-xs sm:text-sm">
                  ១. លំហូរ New Leads តាមប្រភព
                </td>
              </tr>
              {sources.map((s) => {
                const tw = partAData.todayData[`${s.id}_w`] || 0;
                const tl = partAData.todayData[`${s.id}_l`] || 0;
                const tr = partAData.todayData[`${s.id}_r`] || 0;

                const mtdW = partAData.mtd[`${s.id}_w`] || 0;
                const mtdL = partAData.mtd[`${s.id}_l`] || 0;
                const mtdR = partAData.mtd[`${s.id}_r`] || 0;

                const tgtW = Math.round(s.tgtW * sellerScale) || 1;
                const tgtL = Math.round(s.tgtL * sellerScale) || 1;
                const dtgtW = Math.round(s.dtgtW * sellerScale) || 1;
                const dtgtL = Math.round(s.dtgtL * sellerScale) || 1;

                const pacingNum = getRateNumber(mtdW, tgtW);
                const isGoodPacing = pacingNum >= 80;

                return (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 pl-6 font-semibold text-slate-800">{s.name}</td>
                    <td className="text-center font-semibold text-blue-700 p-2">
                      <div>{tw} Won</div>
                      <span className="text-[11px] text-slate-500 font-normal">
                        ({tl} L / {fmtMoney(Number(tr))})
                      </span>
                    </td>
                    <td className="text-center text-slate-600 p-2 font-medium">
                      <div>{dtgtW} Won</div>
                      <span className="text-[11px] text-slate-400 font-normal">({dtgtL} L)</span>
                    </td>
                    <td className="text-center font-bold text-blue-950 p-2">
                      <div>{mtdW} Won</div>
                      <span className="text-[11px] text-emerald-700 font-medium">
                        ({mtdL} L / {fmtMoney(Number(mtdR))})
                      </span>
                    </td>
                    <td className="text-center text-slate-700 p-2 font-semibold">
                      <div>{tgtW} Won</div>
                      <span className="text-[11px] text-slate-500 font-normal">({tgtL} L)</span>
                    </td>
                    <td className="text-center p-2">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          isGoodPacing
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {getRate(mtdW, tgtW)}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {/* Section 2 Header */}
              <tr className="bg-emerald-50/90 font-bold border-t border-slate-200">
                <td colSpan={6} className="p-2.5 px-4 text-emerald-950 text-xs sm:text-sm">
                  ២. សកម្មភាពទាក់ទង (Outbound & Follow-up)
                </td>
              </tr>
              {fus.map((f) => {
                const tw = partAData.todayData[`${f.id}_w`] || 0;
                const ta = partAData.todayData[`${f.id}_a`] || 0;
                const tr = partAData.todayData[`${f.id}_r`] || 0;

                const mtdW = partAData.mtd[`${f.id}_w`] || 0;
                const mtdA = partAData.mtd[`${f.id}_a`] || 0;
                const mtdR = partAData.mtd[`${f.id}_r`] || 0;

                const tgtW = Math.round(f.tgtW * sellerScale) || 1;
                const tgtA = Math.round(f.tgtA * sellerScale) || 1;
                const dtgtW = Math.round(f.dtgtW * sellerScale) || 1;
                const dtgtA = Math.round(f.dtgtA * sellerScale) || 1;

                const pacingNum = getRateNumber(mtdW, tgtW);
                const isGoodPacing = pacingNum >= 80;

                return (
                  <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 pl-6 font-semibold text-slate-800">{f.name}</td>
                    <td className="text-center font-semibold text-emerald-700 p-2">
                      <div>{tw} Won</div>
                      <span className="text-[11px] text-slate-500 font-normal">
                        ({ta} Acts / {fmtMoney(Number(tr))})
                      </span>
                    </td>
                    <td className="text-center text-slate-600 p-2 font-medium">
                      <div>{dtgtW} Won</div>
                      <span className="text-[11px] text-slate-400 font-normal">({dtgtA} Acts)</span>
                    </td>
                    <td className="text-center font-bold text-emerald-950 p-2">
                      <div>{mtdW} Won</div>
                      <span className="text-[11px] text-emerald-700 font-medium">
                        ({mtdA} Acts / {fmtMoney(Number(mtdR))})
                      </span>
                    </td>
                    <td className="text-center text-slate-700 p-2 font-semibold">
                      <div>{tgtW} Won</div>
                      <span className="text-[11px] text-slate-500 font-normal">({tgtA} Acts)</span>
                    </td>
                    <td className="text-center p-2">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          isGoodPacing
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {getRate(mtdW, tgtW)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SHARED DATE RANGE FILTER BAR                                  */}
      {/* ============================================================ */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-4 sm:p-5 rounded-2xl shadow-md flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-indigo-400" />
            <h2 className="font-bold text-base sm:text-lg">
              ការកំណត់ចន្លោះពេល សម្រាប់របាយការណ៍ផ្នែកទី២ និងទី៣
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            ជ្រើសរើសចន្លោះកាលបរិច្ឆេទដើម្បីគណនាទិន្នន័យលម្អិត និងអត្រាបំប្លែង Funnel ({selectedSellerId === 'ALL' ? 'អ្នកលក់ទាំងអស់' : activeSellerObj?.name})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => applyPreset('today')}
              className="px-2.5 py-1 text-xs font-medium rounded bg-white/10 hover:bg-white/20 transition-colors"
            >
              ថ្ងៃនេះ
            </button>
            <button
              onClick={() => applyPreset('yesterday')}
              className="px-2.5 py-1 text-xs font-medium rounded bg-white/10 hover:bg-white/20 transition-colors"
            >
              ម្សិលមិញ
            </button>
            <button
              onClick={() => applyPreset('last7')}
              className="px-2.5 py-1 text-xs font-medium rounded bg-white/10 hover:bg-white/20 transition-colors"
            >
              ៧ ថ្ងៃចុងក្រោយ
            </button>
            <button
              onClick={() => applyPreset('thisMonth')}
              className="px-2.5 py-1 text-xs font-medium rounded bg-blue-600/60 hover:bg-blue-600 text-white transition-colors"
            >
              ខែនេះ
            </button>
            <button
              onClick={() => applyPreset('lastMonth')}
              className="px-2.5 py-1 text-xs font-medium rounded bg-white/10 hover:bg-white/20 transition-colors"
            >
              ខែមុន
            </button>
          </div>

          {/* Date Range Inputs */}
          <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 px-3 rounded-lg border border-slate-700">
            <label htmlFor="startDate" className="text-xs font-medium text-slate-300">
              ពីថ្ងៃទី:
            </label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="p-1 border border-slate-600 rounded bg-white text-slate-900 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            <span className="font-bold text-slate-400">-</span>
            <label htmlFor="endDate" className="text-xs font-medium text-slate-300">
              ដល់:
            </label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="p-1 border border-slate-600 rounded bg-white text-slate-900 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* PART B: DETAILED REPORT                                      */}
      {/* ============================================================ */}
      <section className="border border-slate-200 rounded-2xl p-5 bg-white shadow-sm space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 border-l-4 border-slate-600 pl-3">
            ផ្នែកទី ២៖ របាយការណ៍លម្អិត (Detailed Input Summary)
          </h2>
          <p className="text-xs text-slate-500 pl-4 mt-0.5">
            សរុបលទ្ធផលគ្រប់ជំហានចាប់ពីថ្ងៃ {startDate} ដល់ {endDate} (
            {selectedSellerId === 'ALL' ? 'អ្នកលក់ទាំងអស់រួមបញ្ចូលគ្នា' : `អ្នកលក់៖ ${activeSellerObj?.name}`})
          </p>
        </div>

        {/* 2.1 New Leads Table */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="font-bold text-blue-900 text-sm sm:text-base flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
              ២.១ លទ្ធផល New Leads (សរុបក្នុងចន្លោះពេល)
            </h3>
            <span className="text-xs font-medium text-slate-500">
              ចំណូលសរុប: <strong className="text-blue-800">{fmtMoney(partBCData.leadsTotals.r)}</strong>
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-xs">
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
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 pl-4 font-semibold text-slate-800">{s.name}</td>
                    <td className="p-3 text-center font-semibold text-blue-700">
                      {partBCData.fun[`${s.id}_l`]}
                    </td>
                    <td className="p-3 text-center text-slate-700">
                      {partBCData.fun[`${s.id}_q`]}
                    </td>
                    <td className="p-3 text-center font-medium text-orange-600">
                      {partBCData.fun[`${s.id}_n`]}
                    </td>
                    <td className="p-3 text-center font-bold text-emerald-700">
                      {partBCData.fun[`${s.id}_w`]}
                    </td>
                    <td className="p-3 text-center font-bold text-blue-900 bg-blue-50/60">
                      {fmtMoney(partBCData.fun[`${s.id}_r`])}
                    </td>
                  </tr>
                ))}
                {/* Total Row */}
                <tr className="bg-slate-100 font-extrabold border-t-2 border-slate-300 text-slate-900">
                  <td className="p-3 pl-4 text-right">សរុប (Total):</td>
                  <td className="text-center p-3 text-blue-800 font-black">
                    {partBCData.leadsTotals.l}
                  </td>
                  <td className="text-center p-3">{partBCData.leadsTotals.q}</td>
                  <td className="text-center p-3 text-orange-700">{partBCData.leadsTotals.n}</td>
                  <td className="text-center p-3 text-emerald-700 font-black">
                    {partBCData.leadsTotals.w}
                  </td>
                  <td className="text-center p-3 text-blue-900 bg-blue-100/70 font-black">
                    {fmtMoney(partBCData.leadsTotals.r)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 2.2 Outbound & Follow-up Table */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="font-bold text-emerald-900 text-sm sm:text-base flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
              ២.២ លទ្ធផលសកម្មភាពទាក់ទង (Outbound & Follow-up)
            </h3>
            <span className="text-xs font-medium text-slate-500">
              ចំណូលសរុប: <strong className="text-emerald-800">{fmtMoney(partBCData.fuTotals.r)}</strong>
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-xs">
            <table className="w-full text-sm text-left border-collapse min-w-[700px]">
              <thead className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3 border-b border-slate-200 w-1/4">ប្រភេទសកម្មភាព</th>
                  <th className="p-3 border-b border-slate-200 text-center">សកម្មភាព (Acts)</th>
                  <th className="p-3 border-b border-slate-200 text-center">រកបាន / Qualify</th>
                  <th className="p-3 border-b border-slate-200 text-center">Negotiation</th>
                  <th className="p-3 border-b border-slate-200 text-center">Won (បិទបាន)</th>
                  <th className="p-3 border-b border-slate-200 text-center bg-emerald-50 text-emerald-900 font-bold">
                    ចំណូល ($)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fus.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 pl-4 font-semibold text-slate-800">{f.name}</td>
                    <td className="p-3 text-center font-semibold text-blue-700">
                      {partBCData.fun[`${f.id}_a`]}
                    </td>
                    <td className="p-3 text-center text-slate-700">
                      {partBCData.fun[`${f.id}_q`]}
                    </td>
                    <td className="p-3 text-center font-medium text-orange-600">
                      {partBCData.fun[`${f.id}_n`]}
                    </td>
                    <td className="p-3 text-center font-bold text-emerald-700">
                      {partBCData.fun[`${f.id}_w`]}
                    </td>
                    <td className="p-3 text-center font-bold text-emerald-900 bg-emerald-50/60">
                      {fmtMoney(partBCData.fun[`${f.id}_r`])}
                    </td>
                  </tr>
                ))}
                {/* Total Row */}
                <tr className="bg-slate-100 font-extrabold border-t-2 border-slate-300 text-slate-900">
                  <td className="p-3 pl-4 text-right">សរុប (Total):</td>
                  <td className="text-center p-3 text-blue-800 font-black">
                    {partBCData.fuTotals.a}
                  </td>
                  <td className="text-center p-3">{partBCData.fuTotals.q}</td>
                  <td className="text-center p-3 text-orange-700">{partBCData.fuTotals.n}</td>
                  <td className="text-center p-3 text-emerald-700 font-black">
                    {partBCData.fuTotals.w}
                  </td>
                  <td className="text-center p-3 text-emerald-900 bg-emerald-100/70 font-black">
                    {fmtMoney(partBCData.fuTotals.r)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* PART C: FUNNEL CONVERSION RATES                              */}
      {/* ============================================================ */}
      <section className="border border-indigo-200 rounded-2xl p-5 bg-white shadow-sm space-y-6">
        <div>
          <h2 className="text-xl font-bold text-indigo-900 border-l-4 border-indigo-600 pl-3">
            ផ្នែកទី ៣៖ របាយការណ៍វិភាគអត្រាបំប្លែង (Funnel Conversion Rates)
          </h2>
          <p className="text-xs text-slate-500 pl-4 mt-0.5">
            វិភាគអត្រាជោគជ័យតាមដំណាក់កាលនីមួយៗ (Stage Conversion Rates) និង Win Rate ចុងក្រោយ ({selectedSellerId === 'ALL' ? 'អ្នកលក់ទាំងអស់' : activeSellerObj?.name})
          </p>
        </div>

        {/* Funnel Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-xs">
          <table className="w-full text-sm text-left border-collapse min-w-[850px]">
            <thead className="bg-slate-800 text-white text-xs uppercase tracking-wider">
              <tr>
                <th className="p-3.5 border-b border-slate-900 font-bold">ប្រភព / សកម្មភាព</th>
                <th className="p-3.5 border-b border-slate-900 text-center font-bold">Leads/Acts</th>
                <th className="p-3.5 border-b border-slate-900 text-center font-bold">
                  Qualified (Rate)
                </th>
                <th className="p-3.5 border-b border-slate-900 text-center font-bold">
                  Negotiation (Rate)
                </th>
                <th className="p-3.5 border-b border-slate-900 text-center font-bold">
                  Won (Close Rate)
                </th>
                <th className="p-3.5 border-b border-slate-900 text-center bg-slate-900 font-bold">
                  អត្រាបំប្លែងរួម (Win Rate)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {/* Part 1 Header */}
              <tr className="bg-slate-100 font-bold">
                <td colSpan={6} className="p-2.5 px-4 text-slate-900 text-xs sm:text-sm">
                  ១. លំហូរ New Leads
                </td>
              </tr>
              {sources.map((s) => {
                const l = partBCData.fun[`${s.id}_l`] || 0;
                const q = partBCData.fun[`${s.id}_q`] || 0;
                const n = partBCData.fun[`${s.id}_n`] || 0;
                const w = partBCData.fun[`${s.id}_w`] || 0;
                const r = partBCData.fun[`${s.id}_r`] || 0;

                return (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 pl-6 font-semibold text-slate-800">{s.name}</td>
                    <td className="text-center font-bold text-slate-700 p-2.5">{l}</td>
                    <td className="text-center p-2.5">
                      <span>{q}</span>
                      <span className="text-xs text-slate-500 ml-1.5 font-normal">
                        ({getRate(q, l)})
                      </span>
                    </td>
                    <td className="text-center p-2.5">
                      <span>{n}</span>
                      <span className="text-xs text-slate-500 ml-1.5 font-normal">
                        ({getRate(n, q)})
                      </span>
                    </td>
                    <td className="text-center font-bold text-emerald-700 p-2.5">
                      <div>
                        {w}
                        <span className="text-xs text-slate-500 ml-1.5 font-normal">
                          ({getRate(w, n)})
                        </span>
                      </div>
                      <span className="text-[11px] text-blue-700 font-semibold block">
                        ({fmtMoney(r)})
                      </span>
                    </td>
                    <td className="text-center font-bold bg-slate-50 text-slate-900 p-2.5">
                      <span className="inline-block px-2.5 py-1 rounded bg-slate-200/80 text-xs font-black">
                        {getRate(w, l)}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {/* Part 2 Header */}
              <tr className="bg-slate-100 font-bold border-t border-slate-200">
                <td colSpan={6} className="p-2.5 px-4 text-slate-900 text-xs sm:text-sm">
                  ២. សកម្មភាពទាក់ទង (Outbound & Follow-up)
                </td>
              </tr>
              {fus.map((f) => {
                const a = partBCData.fun[`${f.id}_a`] || 0;
                const q = partBCData.fun[`${f.id}_q`] || 0;
                const n = partBCData.fun[`${f.id}_n`] || 0;
                const w = partBCData.fun[`${f.id}_w`] || 0;
                const r = partBCData.fun[`${f.id}_r`] || 0;

                return (
                  <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 pl-6 font-semibold text-slate-800">{f.name}</td>
                    <td className="text-center font-bold text-slate-700 p-2.5">{a}</td>
                    <td className="text-center p-2.5">
                      <span>{q}</span>
                      <span className="text-xs text-slate-500 ml-1.5 font-normal">
                        ({getRate(q, a)})
                      </span>
                    </td>
                    <td className="text-center p-2.5">
                      <span>{n}</span>
                      <span className="text-xs text-slate-500 ml-1.5 font-normal">
                        ({getRate(n, q)})
                      </span>
                    </td>
                    <td className="text-center font-bold text-emerald-700 p-2.5">
                      <div>
                        {w}
                        <span className="text-xs text-slate-500 ml-1.5 font-normal">
                          ({getRate(w, n)})
                        </span>
                      </div>
                      <span className="text-[11px] text-emerald-700 font-semibold block">
                        ({fmtMoney(r)})
                      </span>
                    </td>
                    <td className="text-center font-bold bg-slate-50 text-slate-900 p-2.5">
                      <span className="inline-block px-2.5 py-1 rounded bg-slate-200/80 text-xs font-black">
                        {getRate(w, a)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
