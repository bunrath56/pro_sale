import React, { useState } from 'react';
import { User } from '../types/sales';
import {
  hashPassword,
  verifyPassword,
  generateSalt,
  evaluatePasswordStrength,
} from '../utils/cryptoSecurity';
import {
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldCheck,
  X,
} from 'lucide-react';

interface ChangePasswordModalProps {
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onPasswordChanged: (updatedUser: User) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  currentUser,
  isOpen,
  onClose,
  onPasswordChanged,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const strength = evaluatePasswordStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate inputs
    if (!currentPassword) {
      setError('សូមបញ្ចូលពាក្យសម្ងាត់បច្ចុប្បន្ន (Please enter current password)');
      return;
    }

    if (!newPassword) {
      setError('សូមបញ្ចូលពាក្យសម្ងាត់ថ្មី (Please enter new password)');
      return;
    }

    if (newPassword.length < 8) {
      setError('ពាក្យសម្ងាត់ថ្មីត្រូវមានយ៉ាងហោច 8 តួអក្សរ (Minimum 8 characters required)');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('ពាក្យសម្ងាត់ផ្ទៀងផ្ទាត់មិនត្រូវគ្នាទេ (Passwords do not match)');
      return;
    }

    if (currentPassword === newPassword) {
      setError('ពាក្យសម្ងាត់ថ្មីត្រូវតែខុសពីពាក្យសម្ងាត់ចាស់ (New password must be different)');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Verify current password
      let isValidCurrent = false;
      if (currentUser.passwordSalt && currentUser.passwordHash) {
        isValidCurrent = await verifyPassword(
          currentPassword,
          currentUser.passwordSalt,
          currentUser.passwordHash
        );
      } else {
        // Fallback for unmigrated legacy user
        isValidCurrent = currentPassword === (currentUser.password || '123456');
      }

      if (!isValidCurrent) {
        setError('ពាក្យសម្ងាត់បច្ចុប្បន្នមិនត្រឹមត្រូវទេ! (Incorrect current password)');
        setIsSubmitting(false);
        return;
      }

      // 2. Hash new password with fresh cryptographic salt
      const newSalt = generateSalt(16);
      const newHash = await hashPassword(newPassword, newSalt);

      const updatedUser: User = {
        ...currentUser,
        password: '', // Remove raw plaintext
        passwordSalt: newSalt,
        passwordHash: newHash,
        passwordChangedAt: new Date().toISOString(),
      };

      setSuccess(true);
      setTimeout(() => {
        onPasswordChanged(updatedUser);
        handleClose();
      }, 1200);
    } catch (err) {
      console.error(err);
      setError('មានបញ្ហាក្នុងការប្តូរពាក្យសម្ងាត់ (Failed to update password)');
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccess(false);
    setIsSubmitting(false);
    onClose();
  };

  const getStrengthBarColor = () => {
    switch (strength.level) {
      case 'strong':
        return 'bg-emerald-500';
      case 'good':
        return 'bg-blue-500';
      case 'fair':
        return 'bg-amber-500';
      case 'weak':
      default:
        return 'bg-rose-500';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-xs">
              <KeyRound className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h3 className="font-bold text-base">ប្តូរពាក្យសម្ងាត់ (Change Password)</h3>
              <p className="text-xs text-blue-100">
                គណនី: <span className="font-semibold">{currentUser.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {success ? (
            <div className="py-6 text-center space-y-2">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm">
                ពាក្យសម្ងាត់ត្រូវបានផ្លាស់ប្តូរដោយជោគជ័យ!
              </h4>
              <p className="text-xs text-slate-500">
                Password updated and securely encrypted with salted SHA-256.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Current Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ពាក្យសម្ងាត់បច្ចុប្បន្ន (Current Password) *
                </label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="បញ្ចូលពាក្យសម្ងាត់ចាស់"
                    className="w-full px-3 py-2 pr-9 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ពាក្យសម្ងាត់ថ្មី (New Password) *
                </label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="យ៉ាងហោច 8 តួអក្សរ"
                    className="w-full px-3 py-2 pr-9 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {newPassword && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">កម្រិតសុវត្ថិភាព (Strength):</span>
                      <span className="font-bold capitalize text-slate-700">
                        {strength.level}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${getStrengthBarColor()}`}
                        style={{ width: `${(strength.score / 4) * 100}%` }}
                      />
                    </div>

                    {/* Requirements checklist */}
                    <div className="grid grid-cols-2 gap-1 pt-1 text-[10px] text-slate-600">
                      <span
                        className={`flex items-center gap-1 ${
                          strength.passed.minLength ? 'text-emerald-600 font-semibold' : ''
                        }`}
                      >
                        {strength.passed.minLength ? '✓' : '•'} 8+ Characters
                      </span>
                      <span
                        className={`flex items-center gap-1 ${
                          strength.passed.hasUppercase ? 'text-emerald-600 font-semibold' : ''
                        }`}
                      >
                        {strength.passed.hasUppercase ? '✓' : '•'} Uppercase (A-Z)
                      </span>
                      <span
                        className={`flex items-center gap-1 ${
                          strength.passed.hasLowercase ? 'text-emerald-600 font-semibold' : ''
                        }`}
                      >
                        {strength.passed.hasLowercase ? '✓' : '•'} Lowercase (a-z)
                      </span>
                      <span
                        className={`flex items-center gap-1 ${
                          strength.passed.hasNumber || strength.passed.hasSpecial
                            ? 'text-emerald-600 font-semibold'
                            : ''
                        }`}
                      >
                        {strength.passed.hasNumber || strength.passed.hasSpecial ? '✓' : '•'}{' '}
                        Numbers / Symbols
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ផ្ទៀងផ្ទាត់ពាក្យសម្ងាត់ថ្មី (Confirm New Password) *
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="វាយពាក្យសម្ងាត់ថ្មីម្តងទៀត"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  បោះបង់ (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isSubmitting ? 'កំពុងរក្សាទុក...' : 'ប្តូរពាក្យសម្ងាត់ (Save)'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
