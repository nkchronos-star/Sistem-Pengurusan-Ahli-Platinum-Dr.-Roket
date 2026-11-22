import React, { useState } from 'react';
import { KeyRound, Lock, Mail, CheckCircle2, X, Eye, EyeOff } from 'lucide-react';
import { generateTemporaryPassword } from '../utils/helpers';
import { sanitizeInputString } from '../utils/security';

interface PasswordChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  userCode: string;
  userEmail: string;
  currentPassword?: string;
  onSavePassword: (newPassword: string) => void;
}

export const PasswordChangeModal: React.FC<PasswordChangeModalProps> = ({
  isOpen,
  onClose,
  userName,
  userCode,
  userEmail,
  currentPassword,
  onSavePassword,
}) => {
  const effectiveCurrentPassword = currentPassword || 'drroket2026';

  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [sentTempPassword, setSentTempPassword] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setOldPass('');
    setNewPass('');
    setConfirmPass('');
    setErrorMsg('');
    setSentTempPassword(null);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (oldPass.trim() !== effectiveCurrentPassword) {
      setErrorMsg(
        'Kata laluan semasa tidak tepat. Jika terlupa, klik "Lupa Kata Laluan" di bawah.'
      );
      return;
    }

    const cleanNew = sanitizeInputString(newPass.trim());
    if (cleanNew.length < 4) {
      setErrorMsg('Kata laluan baharu mestilah sekurang-kurangnya 4 aksara.');
      return;
    }

    if (cleanNew !== confirmPass.trim()) {
      setErrorMsg('Pengesahan kata laluan baharu tidak sepadan.');
      return;
    }

    onSavePassword(cleanNew);
    handleClose();
  };

  const handleSendTempPasswordToEmail = () => {
    setErrorMsg('');
    const tempPass = generateTemporaryPassword();
    onSavePassword(tempPass);
    setSentTempPassword(tempPass);
    setOldPass(tempPass);
  };

  const mailtoLink = sentTempPassword
    ? `mailto:${encodeURIComponent(
        userEmail
      )}?subject=${encodeURIComponent(
        `[Platinum Dr. Roket] Kata Laluan Sementara Akaun ${userCode}`
      )}&body=${encodeURIComponent(
        `Assalamualaikum & Salam Roket ${userName} (${userCode}),\n\nBerikut ialah Kata Laluan Sementara anda:\n\nID Pengguna: ${userCode}\nKata Laluan Sementara: ${sentTempPassword}\n\nSila log masuk dan tukar kata laluan anda di ruangan Tukar Kata Laluan.`
      )}`
    : '#';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Tukar / Kemaskini Kata Laluan
              </h3>
              <p className="text-xs text-slate-500">
                {userName} ({userCode})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Kata Laluan Semasa
              </label>
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="text-[11px] font-semibold text-indigo-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                {showPasswords ? (
                  <>
                    <EyeOff className="w-3 h-3" /> Sembunyi
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3" /> Papar
                  </>
                )}
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPasswords ? 'text' : 'password'}
                required
                value={oldPass}
                onChange={(e) => setOldPass(e.target.value)}
                placeholder="Masukkan kata laluan semasa"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Kata Laluan Baharu
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPasswords ? 'text' : 'password'}
                required
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="Minimum 4 aksara"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Sahkan Kata Laluan Baharu
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPasswords ? 'text' : 'password'}
                required
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                placeholder="Ulang kata laluan baharu"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
              {errorMsg}
            </div>
          )}

          {/* Ruangan Lupa Kata Laluan Semasa -> Hantar Kata Laluan Sementara ke E-mel */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-slate-600">
                Lupa kata laluan semasa?
              </div>
              <button
                type="button"
                onClick={handleSendTempPasswordToEmail}
                className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-950 text-xs font-bold rounded-lg inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Mail className="w-3.5 h-3.5" />
                Lupa Kata Laluan
              </button>
            </div>

            {sentTempPassword && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Kata Laluan Sementara Dihantar ke E-mel ({userEmail})
                  </span>
                </div>
                <p className="text-emerald-800">
                  Kata laluan sementara anda ialah:{' '}
                  <strong className="font-mono bg-white px-2 py-0.5 rounded border border-emerald-300 text-emerald-950">
                    {sentTempPassword}
                  </strong>
                </p>
                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[11px] text-emerald-700">
                    Telah diisi ke ruangan Kata Laluan Semasa di atas.
                  </span>
                  <a
                    href={mailtoLink}
                    className="text-[11px] font-bold text-indigo-700 hover:underline"
                  >
                    Buka E-mel →
                  </a>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold rounded-xl cursor-pointer"
            >
              Simpan Kata Laluan Baharu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
