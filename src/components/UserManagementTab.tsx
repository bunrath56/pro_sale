import React, { useState } from 'react';
import { User, UserRole } from '../types/sales';
import { hashPassword, generateSalt } from '../utils/cryptoSecurity';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Briefcase,
  UserCheck,
  Edit3,
  Trash2,
  Check,
  X,
  Phone,
  Mail,
  Lock,
  Unlock,
  KeyRound,
  AlertTriangle,
} from 'lucide-react';

interface UserManagementTabProps {
  users: User[];
  currentUser: User;
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  onUnlockUser?: (userId: string) => void;
}

export const UserManagementTab: React.FC<UserManagementTabProps> = ({
  users,
  currentUser,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onUnlockUser,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('123456');
  const [role, setRole] = useState<UserRole>('seller');
  const [phone, setPhone] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('seller');
  const [editPhone, setEditPhone] = useState('');

  const colors = [
    'bg-blue-600',
    'bg-indigo-600',
    'bg-purple-600',
    'bg-pink-600',
    'bg-emerald-600',
    'bg-amber-600',
    'bg-cyan-600',
  ];

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    const rawPass = password.trim() || '123456';
    const salt = generateSalt(16);
    const hash = await hashPassword(rawPass, salt);

    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const newUser: User = {
      id: 'usr_' + Date.now(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: '', // Do not store plaintext
      passwordSalt: salt,
      passwordHash: hash,
      role,
      avatarColor: randomColor,
      phone: phone.trim() || undefined,
      targetWon: 75,
      targetRevenue: 33750,
      active: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: new Date().toISOString().split('T')[0],
    };

    onAddUser(newUser);
    setName('');
    setEmail('');
    setPassword('123456');
    setPhone('');
    setShowAddForm(false);
  };

  const startEdit = (u: User) => {
    setEditingId(u.id);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditPassword('');
    setEditRole(u.role);
    setEditPhone(u.phone || '');
  };

  const saveEdit = async (id: string) => {
    const original = users.find((u) => u.id === id);
    if (!original) return;

    let updatedSalt = original.passwordSalt;
    let updatedHash = original.passwordHash;

    if (editPassword.trim()) {
      updatedSalt = generateSalt(16);
      updatedHash = await hashPassword(editPassword.trim(), updatedSalt);
    }

    const updated: User = {
      ...original,
      name: editName.trim() || original.name,
      email: editEmail.trim().toLowerCase() || original.email,
      password: '', // Strip plaintext
      passwordSalt: updatedSalt,
      passwordHash: updatedHash,
      role: editRole,
      phone: editPhone.trim() || undefined,
    };

    onUpdateUser(updated);
    setEditingId(null);
  };

  const toggleUserActive = (u: User) => {
    onUpdateUser({
      ...u,
      active: !u.active,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white p-5 rounded-2xl shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl font-bold">ប្រព័ន្ធគ្រប់គ្រងអ្នកប្រើប្រាស់ (User Management)</h2>
          </div>
          <p className="text-xs text-purple-200 mt-1">
            សិទ្ធិ Dev (All Permissions): បង្កើតអ្នកលក់ថ្មី (Sellers), Sales Manager និងកំណត់គោលដៅលក់ប្រចាំខែ
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-2 transition-colors shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>{showAddForm ? 'បិទទម្រង់' : '+ បន្ថែមសមាជិកថ្មី'}</span>
        </button>
      </div>

      {/* Add User Form */}
      {showAddForm && (
        <form
          onSubmit={handleCreateUser}
          className="bg-purple-50/70 border border-purple-200 p-5 rounded-2xl shadow-sm space-y-4 animate-in fade-in"
        >
          <h3 className="font-bold text-purple-950 text-base flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-purple-700" />
            <span>បញ្ចូលសមាជិកក្រុមថ្មី</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ឈ្មោះពេញ (Full Name) *
              </label>
              <input
                type="text"
                placeholder="ឧ. ដារ៉ា សុខ (Dara Sok)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                អ៊ីមែល (Email) *
              </label>
              <input
                type="email"
                placeholder="dara@masterit.edu.kh"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ពាក្យសម្ងាត់ (Password) *
              </label>
              <input
                type="text"
                placeholder="123456"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white font-mono text-purple-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                តួនាទី (Role) *
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white font-bold text-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              >
                <option value="seller">Seller (Sale Input - បញ្ចូលទិន្នន័យ)</option>
                <option value="manager">Sales Manager (មើលរបាយការណ៍ទាំងអស់ - មិនអាចគ្រប់គ្រង User)</option>
                <option value="dev">Dev (All Permission - សិទ្ធិពេញ)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                លេខទូរស័ព្ទ (Phone Number)
              </label>
              <input
                type="text"
                placeholder="012 345 678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              បោះបង់
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-sm"
            >
              💾 រក្សាទុកសមាជិកថ្មី
            </button>
          </div>
        </form>
      )}

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span>បញ្ជីសមាជិក និងអ្នកលក់ ({users.length} នាក់)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Dev (All Permissions) &bull; Sales Manager (See all seller data) &bull; Sellers (Sale input)
            </p>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-sm text-left border-collapse min-w-[550px]">
            <thead className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3 border-b">សមាជិក (Member)</th>
                <th className="p-3 border-b">តួនាទី (Role)</th>
                <th className="p-3 border-b text-center">ស្ថានភាព</th>
                <th className="p-3 border-b text-center">សកម្មភាព</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {users.map((u) => {
                const isEditing = editingId === u.id;
                const isCurrent = u.id === currentUser.id;

                return (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    {/* Member Info */}
                    <td className="p-3">
                      {isEditing ? (
                        <div className="space-y-1.5">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Name"
                            className="w-full p-1 border rounded text-xs font-semibold"
                          />
                          <input
                            type="email"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            placeholder="Email"
                            className="w-full p-1 border rounded text-xs"
                          />
                          <input
                            type="text"
                            value={editPassword}
                            onChange={(e) => setEditPassword(e.target.value)}
                            placeholder="ពាក្យសម្ងាត់ (Password)"
                            className="w-full p-1 border rounded text-xs font-mono text-purple-800"
                          />
                          <input
                            type="text"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            placeholder="Phone"
                            className="w-full p-1 border rounded text-xs"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 ${
                              u.avatarColor || 'bg-blue-600'
                            }`}
                          >
                            {u.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                              <span>{u.name}</span>
                              {isCurrent && (
                                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">
                                  អ្នកបច្ចុប្បន្ន
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {u.email}
                              </span>
                              <span
                                className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-semibold"
                                title="Password is cryptographically secured with salted SHA-256"
                              >
                                <Lock className="w-2.5 h-2.5 text-emerald-600" />
                                <span>SHA-256 Encrypted</span>
                              </span>
                              {u.lockedUntil && Date.now() < u.lockedUntil && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-rose-700 bg-rose-100 border border-rose-200 px-1.5 py-0.5 rounded font-bold">
                                  <span>🔒 Locked</span>
                                  {onUnlockUser && (
                                    <button
                                      type="button"
                                      onClick={() => onUnlockUser(u.id)}
                                      className="underline hover:text-rose-900 cursor-pointer ml-0.5"
                                    >
                                      Unlock
                                    </button>
                                  )}
                                </span>
                              )}
                              {u.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {u.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Role */}
                    <td className="p-3">
                      {isEditing ? (
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value as UserRole)}
                          className="p-1 border rounded text-xs font-bold bg-white"
                        >
                          <option value="seller">Seller (Sale Input)</option>
                          <option value="manager">Sales Manager</option>
                          <option value="dev">Dev (All Permission)</option>
                        </select>
                      ) : (
                        <div>
                          {u.role === 'dev' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                              <ShieldCheck className="w-3 h-3" />
                              Dev (Me)
                            </span>
                          )}
                          {u.role === 'manager' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                              <Briefcase className="w-3 h-3" />
                              Sales Manager
                            </span>
                          )}
                          {u.role === 'seller' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                              <UserCheck className="w-3 h-3" />
                              Seller
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => toggleUserActive(u)}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                          u.active
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                        }`}
                      >
                        {u.active ? '● សកម្ម (Active)' : '○ អសកម្ម'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => saveEdit(u.id)}
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded"
                            title="រក្សាទុក"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="p-1.5 bg-slate-300 hover:bg-slate-400 text-slate-700 rounded"
                            title="បោះបង់"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5">
                          {deleteConfirmId === u.id ? (
                            <div className="flex items-center justify-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-2 py-1 shadow-xs">
                              <span className="text-[11px] font-bold text-red-700 whitespace-nowrap">លុប {u.name}?</span>
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteUser(u.id);
                                  setDeleteConfirmId(null);
                                }}
                                className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-bold shadow-xs cursor-pointer active:scale-95 transition-transform"
                                title="បញ្ជាក់ការលុបសមាជិកនេះ"
                              >
                                យល់ព្រម
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(null)}
                                className="p-0.5 text-slate-500 hover:text-slate-800 rounded cursor-pointer"
                                title="បោះបង់"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => startEdit(u)}
                                className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded cursor-pointer"
                                title="កែប្រែ"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              {u.id !== 'user_dev' && (
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(u.id)}
                                  className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer transition-colors active:scale-95"
                                  title="លុបសមាជិកនេះ"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
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
    </div>
  );
};
