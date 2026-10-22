import React, { useState } from 'react';
import { User } from '../types/sales';
import { verifyPassword } from '../utils/cryptoSecurity';
import { Lock, Eye, EyeOff, LogOut, ShieldAlert, AlertCircle } from 'lucide-react';

interface SessionLockModalProps {
  currentUser: User;
  isOpen: boolean;
  onUnlock: () => void;
  onLogout: () => void;
}

export const SessionLockModal: React.FC<SessionLockModalProps> = ({
  currentUser,
  isOpen,
  onUnlock,
  onLogout,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password) {
      setError('សូមបញ្ចូលពាក្យសម្ងាត់ដើម្បីដោះសោ (Please enter password)');
      return;
    }

    setIsVerifying(true);

    try {
      let isValid = false;
      if (currentUser.passwordSalt && currentUser.passwordHash) {
        isValid = await verifyPassword(password, currentUser.passwordSalt, currentUser.passwordHash);
      } else {
        isValid = password === (currentUser.password || '123456');
      }

      if (isValid) {
        setPassword('');
        setError(null);
        setIsVerifying(false);
        onUnlock();
      } else {
        setError('ពាក្យសម្ងាត់មិនត្រឹមត្រូវទេ! (Incorrect password)');
        setIsVerifying(false);
      }
    } catch {
      setError('មានបញ្ហាក្នុងការផ្ទៀងផ្ទាត់ (Verification error)');
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden text-center p-6 sm:p-8 space-y-5 animate-in zoom-in-95 duration-200">
        {/* Lock Icon Banner */}
        <div className="w-16 h-16 mx-auto rounded-3xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-inner">
          <Lock className="w-8 h-8 text-blue-600 animate-pulse" />
        </div>

        <div>
          <h3 className="text-lg font-black text-slate-900">
            វគ្គការងារត្រូវបានចាក់សោ
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Session locked for security due to 15 minutes of inactivity
          </p>
        </div>

        {/* User Card */}
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-xs ${
              currentUser.avatarColor || 'bg-blue-600'
            }`}
          >
            {currentUser.name.substring(0, 2).toUpperCase()}
          </div>
          <div className="text-left">
            <span className="font-bold text-xs text-slate-900 block">{currentUser.name}</span>
            <span className="text-[11px] text-slate-500 font-mono">{currentUser.email}</span>
          </div>
        </div>

        {/* Unlock Form */}
        <form onSubmit={handleUnlock} className="space-y-3 text-left">
          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ពាក្យសម្ងាត់ (Password to Unlock)
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 pr-10 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isVerifying}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{isVerifying ? 'កំពុងផ្ទៀងផ្ទាត់...' : 'ដោះសោ (Unlock Session)'}</span>
          </button>
        </form>

        {/* Switch / Sign out link */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-center">
          <button
            onClick={onLogout}
            className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>ចាកចេញពីគណនី (Sign Out Instead)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
