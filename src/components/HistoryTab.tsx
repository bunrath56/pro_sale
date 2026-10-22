import React, { useState, useMemo } from 'react';
import { LeadSource, ActivitySource, SalesStore, User } from '../types/sales';
import { fmtMoney } from '../utils/formatters';
import { ConfirmModal } from './ConfirmModal';
import { Calendar, PenSquare, Trash2, Search, ArrowUpDown, UserCheck, Filter } from 'lucide-react';

interface HistoryTabProps {
  salesStore: SalesStore;
  sources: LeadSource[];
  fus: ActivitySource[];
  users: User[];
  currentUser: User;
  onSelectDateToEdit: (date: string, sellerId: string) => void;
  onDeleteDate: (date: string, sellerId: string) => void;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
  salesStore,
  sources,
  fus,
  users,
  currentUser,
  onSelectDateToEdit,
  onDeleteDate,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedSellerFilter, setSelectedSellerFilter] = useState<string>(
    currentUser.role === 'seller' ? currentUser.id : 'ALL'
  );
  const [deleteTargetRecord, setDeleteTargetRecord] = useState<{
    date: string;
    sellerId: string;
    sellerName: string;
  } | null>(null);

  // Compute summary metrics for each record in salesStore
  const historyList = useMemo(() => {
    const keys = Object.keys(salesStore);

    const list = keys.map((key) => {
      const record = salesStore[key];
      const seller = users.find((u) => u.id === record.sellerId);

      let totalRevenue = 0;
      let totalWon = 0;
      let totalLeads = 0;
      let totalActs = 0;

      sources.forEach((s) => {
        totalRevenue += Number(record[`${s.id}_r`] || 0);
        totalWon += Number(record[`${s.id}_w`] || 0);
        totalLeads += Number(record[`${s.id}_l`] || 0);
      });

      fus.forEach((f) => {
        totalRevenue += Number(record[`${f.id}_r`] || 0);
        totalWon += Number(record[`${f.id}_w`] || 0);
        totalActs += Number(record[`${f.id}_a`] || 0);
      });

      return {
        key,
        date: record.date,
        sellerId: record.sellerId || 'unknown',
        sellerName: record.sellerName || seller?.name || 'អ្នកលក់',
        sellerAvatar: seller?.avatarColor || 'bg-blue-600',
        totalRevenue,
        totalWon,
        totalLeads,
        totalActs,
      };
    });

    let filtered = list;

    if (selectedSellerFilter !== 'ALL') {
      filtered = filtered.filter((item) => item.sellerId === selectedSellerFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (item) => item.date.includes(term) || item.sellerName.toLowerCase().includes(term)
      );
    }

    filtered.sort((a, b) => {
      return sortAsc ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date);
    });

    return filtered;
  }, [salesStore, sources, fus, users, selectedSellerFilter, searchTerm, sortAsc]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-6">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span>ប្រវត្តិទិន្នន័យលក់ ({historyList.length} កំណត់ត្រា)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            បញ្ជីរាល់ថ្ងៃ និងអ្នកលក់ដែលបានកត់ត្រាទិន្នន័យរួចហើយ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Seller Filter */}
          {currentUser.role !== 'seller' && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1 rounded-xl">
              <Filter className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
              <select
                value={selectedSellerFilter}
                onChange={(e) => setSelectedSellerFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none pr-2"
              >
                <option value="ALL">អ្នកលក់ទាំងអស់ (All Sellers)</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Search Date */}
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ស្វែងរកថ្ងៃ ឬឈ្មោះ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <button
            onClick={() => setSortAsc(!sortAsc)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>{sortAsc ? 'ចាស់ទៅថ្មី' : 'ថ្មីទៅចាស់'}</span>
          </button>
        </div>
      </div>

      {historyList.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-semibold">មិនទាន់មានទិន្នន័យដែលត្រូវនឹងការស្វែងរកទេ</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-sm text-left border-collapse min-w-[700px]">
            <thead className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3 border-b">កាលបរិច្ឆេទ (Date)</th>
                <th className="p-3 border-b">អ្នកលក់ (Seller)</th>
                <th className="p-3 border-b text-center">New Leads</th>
                <th className="p-3 border-b text-center">សកម្មភាព (Acts)</th>
                <th className="p-3 border-b text-center">Won (បិទបាន)</th>
                <th className="p-3 border-b text-center bg-blue-50 text-blue-900">
                  ចំណូល ($)
                </th>
                <th className="p-3 border-b text-center">សកម្មភាព</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {historyList.map((item) => (
                <tr key={item.key} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-bold text-slate-900">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
                      <span>{item.date}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-[10px] shrink-0 ${item.sellerAvatar}`}
                      >
                        {item.sellerName.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="font-semibold text-xs sm:text-sm text-slate-800">
                        {item.sellerName}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-center font-medium text-blue-700">{item.totalLeads}</td>
                  <td className="p-3 text-center font-medium text-slate-700">{item.totalActs}</td>
                  <td className="p-3 text-center font-bold text-emerald-700">
                    {item.totalWon} នាក់
                  </td>
                  <td className="p-3 text-center font-black text-blue-900 bg-blue-50/50">
                    {fmtMoney(item.totalRevenue)}
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {currentUser.role !== 'seller' || currentUser.id === item.sellerId ? (
                        <button
                          onClick={() => onSelectDateToEdit(item.date, item.sellerId)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                        >
                          <PenSquare className="w-3.5 h-3.5" />
                          <span>កែប្រែ</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium px-2 py-1 bg-slate-50 rounded border border-slate-100">
                          មើលបានតែប៉ុណ្ណោះ
                        </span>
                      )}
                      {(currentUser.role === 'dev' ||
                        currentUser.role === 'manager' ||
                        currentUser.id === item.sellerId) && (
                        <button
                          onClick={() =>
                            setDeleteTargetRecord({
                              date: item.date,
                              sellerId: item.sellerId,
                              sellerName: item.sellerName,
                            })
                          }
                          className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer transition-colors active:scale-95"
                          title="លុបកំណត់ត្រានេះ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmation Modal for Deleting Record */}
      <ConfirmModal
        isOpen={Boolean(deleteTargetRecord)}
        title={`តើអ្នកពិតជាចង់លុបទិន្នន័យថ្ងៃទី ${deleteTargetRecord?.date || ''} ឬទេ?`}
        message={`កំណត់ត្រាលក់របស់អ្នកលក់ [${deleteTargetRecord?.sellerName || ''}] នឹងត្រូវលុបចេញពីប្រព័ន្ធ។`}
        confirmLabel="លុបចេញ"
        cancelLabel="បោះបង់"
        onConfirm={() => {
          if (deleteTargetRecord) {
            onDeleteDate(deleteTargetRecord.date, deleteTargetRecord.sellerId);
            setDeleteTargetRecord(null);
          }
        }}
        onCancel={() => setDeleteTargetRecord(null)}
      />
    </div>
  );
};
