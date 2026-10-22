import React, { useState, useEffect } from 'react';
import { User } from '../types/sales';
import { verifyPassword, hashPassword, generateSalt } from '../utils/cryptoSecurity';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  Clock,
} from 'lucide-react';

interface LoginFormProps {
  users: User[];
  onLogin: (user: User) => void;
  onFailedLogin: (user: User, isLocked: boolean, lockedUntil?: number | null) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  users,
  onLogin,
  onFailedLogin,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lockoutCountdown, setLockoutCountdown] = useState<string | null>(null);

  // Check if current typed email corresponds to a locked account
  useEffect(() => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setLockoutCountdown(null);
      return;
    }

    const matchedUser = users.find(
      (u) =>
        u.email.toLowerCase() === cleanEmail ||
        u.name.toLowerCase() === cleanEmail ||
        u.id.toLowerCase() === cleanEmail
    );

    if (matchedUser?.lockedUntil && Date.now() < matchedUser.lockedUntil) {
      const updateTimer = () => {
        const remainingMs = matchedUser.lockedUntil! - Date.now();
        if (remainingMs <= 0) {
          setLockoutCountdown(null);
        } else {
          const totalSec = Math.floor(remainingMs / 1000);
          const mins = Math.floor(totalSec / 60);
          const secs = totalSec % 60;
          setLockoutCountdown(
            `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
          );
        }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    } else {
      setLockoutCountdown(null);
    }
  }, [email, users]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail) {
      setError('សូមបញ្ចូលអ៊ីមែលរបស់អ្នក (Please enter your email)');
      return;
    }

    if (!cleanPassword) {
      setError('សូមបញ្ចូលពាក្យសម្ងាត់របស់អ្នក (Please enter your password)');
      return;
    }

    setIsLoading(true);

    try {
      const user = users.find(
        (u) =>
          u.email.toLowerCase() === cleanEmail ||
          u.name.toLowerCase() === cleanEmail ||
          u.id.toLowerCase() === cleanEmail
      );

      if (!user) {
        setError('រកមិនឃើញគណនីដែលមានអ៊ីមែលនេះទេ! (Account not found with this email)');
        setIsLoading(false);
        return;
      }

      if (!user.active) {
        setError('គណនីនេះត្រូវបានផ្អាកដំណើរការ (This account has been deactivated)');
        setIsLoading(false);
        return;
      }

      // Check account lockout
      if (user.lockedUntil && Date.now() < user.lockedUntil) {
        const remainingSec = Math.ceil((user.lockedUntil - Date.now()) / 1000);
        const mins = Math.ceil(remainingSec / 60);
        setError(
          `🔒 គណនីនេះត្រូវបានចាក់សោដោយសារការបញ្ចូលខុសច្រើនដង។ សូមរង់ចាំ ${mins} នាទីទៀត ឬទាក់ទង Dev ដើម្បីដោះសោ។`
        );
        setIsLoading(false);
        return;
      }

      // Cryptographic password verification
      let isValidPassword = false;
      let updatedUserObj = { ...user };

      if (user.passwordSalt && user.passwordHash) {
        isValidPassword = await verifyPassword(
          cleanPassword,
          user.passwordSalt,
          user.passwordHash
        );
      } else {
        // Transparent auto-migration for legacy users
        const legacyPlaintext = user.password || '123456';
        if (cleanPassword === legacyPlaintext) {
          isValidPassword = true;
          const newSalt = generateSalt(16);
          const newHash = await hashPassword(cleanPassword, newSalt);
          updatedUserObj = {
            ...user,
            password: '', // Remove plaintext
            passwordSalt: newSalt,
            passwordHash: newHash,
          };
        }
      }

      if (!isValidPassword) {
        const newAttempts = (user.failedLoginAttempts || 0) + 1;
        const isLocked = newAttempts >= 5;
        const lockedUntil = isLocked ? Date.now() + 10 * 60 * 1000 : null;

        onFailedLogin(user, isLocked, lockedUntil);

        if (isLocked) {
          setError(
            '🔒 គណនីត្រូវបានចាក់សោ 10 នាទី ដោយសារការបញ្ចូលពាក្យសម្ងាត់ខុស 5 លើកជាប់គ្នា (Account locked for 10 mins)'
          );
        } else {
          const remaining = 5 - newAttempts;
          setError(
            `ពាក្យសម្ងាត់មិនត្រឹមត្រូវទេ! (នៅសល់ ${remaining} លើកទៀតមុននឹងចាក់សោគណនី)`
          );
        }
        setIsLoading(false);
        return;
      }

      // Password is correct! Clear failed attempts
      setIsLoading(false);
      onLogin({
        ...updatedUserObj,
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error(err);
      setError('មានបញ្ហាក្នុងការផ្ទៀងផ្ទាត់សន្តិសុខ (Authentication security error)');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 relative overflow-hidden">
      {/* Decorative background glow circles */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden relative z-10">
        {/* Header / Brand */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white p-7 text-center relative">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white font-black text-2xl shadow-lg mb-3">
            IT
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            Master IT School
          </h1>
          <p className="text-xs text-blue-100 mt-1 font-medium">
            ប្រព័ន្ធគ្រប់គ្រងការលក់ពហុអ្នកលក់ (Multi-Seller Sales Tracker)
          </p>

          <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md text-[11px] text-blue-100 border border-white/15">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Enterprise Security Protected</span>
          </div>
        </div>

        {/* Login Body */}
        <div className="p-6 sm:p-8 space-y-5">
          <div className="text-center">
            <h2 className="text-lg font-bold text-slate-800">
              ចូលប្រើប្រព័ន្ធ (Sign In)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              សូមបញ្ចូលអ៊ីមែល និងពាក្យសម្ងាត់របស់អ្នក
            </p>
          </div>

          {/* Account Lockout Notice with Live Timer */}
          {lockoutCountdown && (
            <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">គណនីនេះត្រូវបានចាក់សោបណ្តោះអាសន្ន!</span>
                <p className="mt-0.5 text-rose-700">
                  ការប៉ុនប៉ងបញ្ចូលពាក្យសម្ងាត់ខុសច្រើនដង។ សូមរង់ចាំរហូតដល់ផុតកំណត់៖
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-rose-200 rounded-lg text-rose-700 font-mono font-bold text-sm">
                  <Clock className="w-4 h-4 text-rose-600 animate-spin" />
                  <span>{lockoutCountdown}</span>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && !lockoutCountdown && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                អ៊ីមែល (Email / Username)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="admin@masterit.edu.kh"
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
                  autoFocus
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                ពាក្យសម្ងាត់ (Password)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !!lockoutCountdown}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:via-indigo-700 hover:to-blue-800 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <span>កំពុងផ្ទៀងផ្ទាត់សន្តិសុខ...</span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>ចូលប្រើប្រព័ន្ធ (Sign In)</span>
                </>
              )}
            </button>
          </form>

          {/* Security Assurance Badge */}
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
            <span className="text-[11px] text-slate-500 flex items-center justify-center gap-1 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>SHA-256 Encryption &bull; Anti-Brute-Force Guard</span>
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-center text-[11px] text-slate-400">
          Master IT School
        </div>
      </div>
    </div>
  );
};
