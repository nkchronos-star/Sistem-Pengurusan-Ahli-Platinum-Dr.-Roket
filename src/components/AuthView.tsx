import React, { useEffect, useState } from 'react';
import {
  Rocket,
  LogIn,
  UserPlus,
  X,
  Lock,
  User,
  ShieldCheck,
  KeyRound,
  Mail,
  CheckCircle2,
} from 'lucide-react';
import {
  AdminProfile,
  CRMPProfile,
  MemberPackage,
  MemberProfile,
} from '../types';
import { sanitizeInputString } from '../utils/security';
import {
  DEFAULT_MALAYSIA_UNIVERSITIES,
  generateNextMemberUsername,
  generateTemporaryPassword,
  normalizeUniversityName,
} from '../utils/helpers';

interface AuthViewProps {
  members: MemberProfile[];
  crmps: CRMPProfile[];
  admins: AdminProfile[];
  onLogin: (username: string, password?: string) => boolean;
  onRegisterMember: (newMember: {
    name: string;
    email: string;
    phone: string;
    university: string;
    currentSemester: string;
    residence: string;
    package: MemberPackage;
    crmpId: string;
    researchTitle: string;
    supervisor: string;
    password?: string;
  }) => MemberProfile;
  onResetUserPassword: (
    usernameOrEmail: string,
    tempPassword: string
  ) => {
    found: boolean;
    username?: string;
    name?: string;
    email?: string;
    roleLabel?: string;
  };
}

export const AuthView: React.FC<AuthViewProps> = ({
  members,
  crmps,
  admins,
  onLogin,
  onRegisterMember,
  onResetUserPassword,
}) => {
  const [usernameInput, setUsernameInput] = useState(
    members[0]?.username || 'DR0001'
  );
  const [passwordInput, setPasswordInput] = useState('drroket2026');
  const [errorMsg, setErrorMsg] = useState('');
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotQuery, setForgotQuery] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccessInfo, setForgotSuccessInfo] = useState<{
    username: string;
    name: string;
    email: string;
    roleLabel: string;
    tempPassword: string;
  } | null>(null);

  // Anti-Brute Force Lockout State
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  // Registration state
  const [regPackage, setRegPackage] = useState<MemberPackage>('Premier');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('drroket2026');
  const [regUni, setRegUni] = useState(
    'Universiti Pendidikan Sultan Idris (UPSI)'
  );
  const [regSemester, setRegSemester] = useState('S1');
  const [regResidence, setRegResidence] = useState('');
  const [regCrmpId, setRegCrmpId] = useState(crmps[0]?.username || 'CRMP001');
  const [regTitle, setRegTitle] = useState('');
  const [regSupervisor, setRegSupervisor] = useState('');

  const getNextUsernamePreview = (pkg: MemberPackage) => {
    return generateNextMemberUsername(pkg, members, regName);
  };

  const getAccountCurrentPassword = (code: string): string => {
    const clean = code.trim().toLowerCase();
    const m = members.find((x) => x.username.toLowerCase() === clean);
    if (m) return m.password || 'drroket2026';
    const c = crmps.find((x) => x.username.toLowerCase() === clean);
    if (c) return c.password || 'drroket2026';
    const a = admins.find((x) => x.username.toLowerCase() === clean);
    if (a) return a.password || 'drroket2026';
    return 'drroket2026';
  };

  const handleFormLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (lockoutSeconds > 0) {
      setErrorMsg(
        `Akses dikunci sementara kerana terlalu banyak cubaan gagal. Sila tunggu ${lockoutSeconds} saat.`
      );
      return;
    }

    const trimmed = sanitizeInputString(usernameInput.trim());
    if (!trimmed) {
      setErrorMsg('Sila masukkan ID Pengguna anda (cth: DR0001).');
      return;
    }

    if (!passwordInput || passwordInput.trim().length < 4) {
      setErrorMsg('Kata laluan tidak sah (minimum 4 aksara).');
      return;
    }

    const ok = onLogin(trimmed, passwordInput.trim());
    if (!ok) {
      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);
      if (nextAttempts >= 5) {
        setLockoutSeconds(30);
        setFailedAttempts(0);
        setErrorMsg(
          'Amaran Keselamatan: 5 cubaan log masuk gagal. Akaun dikunci selama 30 saat untuk mengelakkan pencerobohan.'
        );
      } else {
        setErrorMsg(
          `ID Pengguna atau Kata Laluan tidak tepat. (${
            5 - nextAttempts
          } baki cubaan sebelum kunci keselamatan)`
        );
      }
    } else {
      setFailedAttempts(0);
    }
  };

  const handleForgotPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccessInfo(null);

    const cleanQuery = sanitizeInputString(forgotQuery.trim());
    if (!cleanQuery) {
      setForgotError(
        'Sila masukkan ID Pengguna anda (contoh: DR0001 / CRMP001 / admin001).'
      );
      return;
    }

    const tempPassword = generateTemporaryPassword();
    const res = onResetUserPassword(cleanQuery, tempPassword);

    if (!res.found || !res.username) {
      setForgotError(
        'Tiada akaun dijumpai dengan ID Pengguna tersebut.'
      );
      return;
    }

    setForgotSuccessInfo({
      username: res.username,
      name: res.name || res.username,
      email: res.email || 'user@drroket.com',
      roleLabel: res.roleLabel || 'Pengguna',
      tempPassword,
    });
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim()) return;
    const created = onRegisterMember({
      name: sanitizeInputString(regName.trim()),
      email: sanitizeInputString(regEmail.trim()),
      phone: sanitizeInputString(regPhone.trim()) || '012-0000000',
      university: normalizeUniversityName(
        sanitizeInputString(regUni.trim()) ||
          'Universiti Pendidikan Sultan Idris (UPSI)'
      ),
      currentSemester: sanitizeInputString(regSemester),
      residence: sanitizeInputString(regResidence.trim()) || 'Malaysia',
      package: regPackage,
      crmpId: sanitizeInputString(regCrmpId),
      researchTitle:
        sanitizeInputString(regTitle.trim()) ||
        'Kajian Kedoktoran Falsafah (Dalam Penyediaan)',
      supervisor:
        sanitizeInputString(regSupervisor.trim()) ||
        'Prof. Madya Dr. Mardhiyati Yunus',
      password: sanitizeInputString(regPassword.trim()) || 'drroket2026',
    });
    setShowRegisterModal(false);
    onLogin(created.username, created.password || 'drroket2026');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f3ff] via-[#fdf2f8] to-[#eef2ff] flex flex-col items-center justify-center p-4">
      {/* Centered Cheerful & Professional Login Card */}
      <div className="w-full max-w-md bg-white border border-purple-200/80 rounded-3xl shadow-xl shadow-purple-900/10 overflow-hidden">
        {/* Top Brand Banner */}
        <div className="bg-gradient-to-r from-[#2e1065] via-[#4c1d95] to-[#3b0764] px-8 py-7 text-center space-y-2 relative overflow-hidden">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-amber-400 text-white flex items-center justify-center mx-auto shadow-md">
            <Rocket className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-white">
            PLATINUM DR. ROKET
          </h1>
          <p className="text-xs text-purple-200 font-medium">
            Sistem Pengurusan Ahli Platinum
          </p>
        </div>

        {/* Form Body */}
        <div className="p-8 space-y-5">
          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold text-slate-900">
              Log Masuk Akaun
            </h2>
            <p className="text-xs text-slate-500">
              Log masuk guna <strong>ID Pengguna Tetap</strong> (cth:{' '}
              <span className="font-mono text-purple-700 font-semibold">
                DR0001-KAMARIAH
              </span>
              ) atau <strong>E-mel</strong>
            </p>
          </div>

          <form
            onSubmit={handleFormLogin}
            autoComplete="off"
            data-form-type="other"
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                ID Pengguna Tetap atau E-mel
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-purple-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  name="drroket_code_entry"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-form-type="other"
                  readOnly
                  onFocus={(e) => e.currentTarget.removeAttribute('readonly')}
                  onMouseDown={(e) =>
                    e.currentTarget.removeAttribute('readonly')
                  }
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="DR0001-KAMARIAH atau e-mel anda"
                  className="w-full pl-10 pr-4 py-2.5 text-sm font-mono border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent bg-purple-50/30"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                * ID Pengguna kekal sama walaupun pakej bertukar (Premier /
                Elite Plus / Elite / Holding Room).
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Kata Laluan
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotQuery(usernameInput.trim());
                    setForgotError('');
                    setForgotSuccessInfo(null);
                    setShowForgotModal(true);
                  }}
                  className="text-xs font-bold text-purple-700 hover:underline cursor-pointer"
                >
                  Lupa Kata Laluan?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-purple-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  name="drroket_access_key"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-form-type="other"
                  readOnly
                  onFocus={(e) => e.currentTarget.removeAttribute('readonly')}
                  onMouseDown={(e) =>
                    e.currentTarget.removeAttribute('readonly')
                  }
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Masukkan kata laluan"
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent bg-purple-50/30 [-webkit-text-security:disc]"
                  required
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium text-center">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-gradient-to-r from-pink-500 to-purple-700 hover:from-pink-600 hover:to-purple-800 text-white text-sm font-bold rounded-xl shadow-md shadow-purple-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              Log Masuk
            </button>
          </form>

          {/* Butang Daftar Ahli & Lupa Kata Laluan */}
          <div className="pt-4 border-t border-slate-100 space-y-2.5">
            <button
              type="button"
              onClick={() => setShowRegisterModal(true)}
              className="w-full py-2.5 px-4 bg-purple-50 hover:bg-purple-100 text-purple-950 border border-purple-200 text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-purple-700" />
              Daftar Ahli Baharu
            </button>

            <button
              type="button"
              onClick={() => {
                setForgotQuery(usernameInput.trim());
                setForgotError('');
                setForgotSuccessInfo(null);
                setShowForgotModal(true);
              }}
              className="w-full py-2 px-4 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-200 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-700" />
              Lupa Kata Laluan
            </button>
          </div>

          {/* Akses Pantas Akaun Semasa (Dinamik mengikut data terkini) */}
          <div className="pt-2 text-center space-y-1.5">
            <div className="text-[11px] text-slate-400 font-medium">
              Akses Pantas Akaun Sistem (ID Tetap / E-mel):
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] font-mono">
              {[
                ...members.slice(0, 3).map((m) => ({
                  code: m.username,
                  label: m.package,
                })),
                ...(crmps[0]
                  ? [{ code: crmps[0].username, label: 'CRMP' }]
                  : []),
                ...(admins[0]
                  ? [{ code: admins[0].username, label: 'Admin' }]
                  : []),
              ].map((acc) => (
                <button
                  key={acc.code}
                  type="button"
                  onClick={() => {
                    const currentPass = getAccountCurrentPassword(acc.code);
                    setUsernameInput(acc.code);
                    setPasswordInput(currentPass);
                    onLogin(acc.code, currentPass);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-purple-50/70 hover:bg-purple-100 text-purple-900 border border-purple-200/80 transition-colors cursor-pointer font-semibold"
                >
                  {acc.code}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-emerald-700 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Perlindungan Data Disulitkan & Anti-Klik Kanan Aktif</span>
          </div>
        </div>
      </div>

      {/* Modal Lupa Kata Laluan */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white border border-purple-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Lupa Kata Laluan
                  </h3>
                  <p className="text-xs text-slate-500">
                    Kata laluan sementara akan dihantar ke e-mel berdaftar anda
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ID Pengguna Tetap atau E-mel Berdaftar
                </label>
                <input
                  type="text"
                  required
                  value={forgotQuery}
                  onChange={(e) => setForgotQuery(e.target.value)}
                  placeholder="Contoh: DR0001-KAMARIAH atau e-mel"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              {forgotError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                  {forgotError}
                </div>
              )}

              {forgotSuccessInfo && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2.5 text-xs">
                  <div className="flex items-center gap-2 font-bold text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Kata Laluan Sementara Telah Dihantar ke E-mel!
                    </span>
                  </div>
                  <div className="space-y-1 text-emerald-900">
                    <div>
                      Akaun:{' '}
                      <strong>
                        {forgotSuccessInfo.name} ({forgotSuccessInfo.username})
                      </strong>{' '}
                      — {forgotSuccessInfo.roleLabel}
                    </div>
                    <div>
                      E-mel Penerima:{' '}
                      <strong className="font-mono">
                        {forgotSuccessInfo.email}
                      </strong>
                    </div>
                    <div className="pt-1">
                      Kata Laluan Sementara:{' '}
                      <span className="font-mono font-bold text-sm bg-white px-2.5 py-1 rounded border border-emerald-300 text-emerald-950">
                        {forgotSuccessInfo.tempPassword}
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setUsernameInput(forgotSuccessInfo.username);
                        setPasswordInput(forgotSuccessInfo.tempPassword);
                        setShowForgotModal(false);
                      }}
                      className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
                    >
                      Guna Kata Laluan Sementara & Log Masuk
                    </button>
                    <a
                      href={`mailto:${encodeURIComponent(
                        forgotSuccessInfo.email
                      )}?subject=${encodeURIComponent(
                        `[Platinum Dr. Roket] Kata Laluan Sementara (${forgotSuccessInfo.username})`
                      )}&body=${encodeURIComponent(
                        `Assalamualaikum & Salam Roket ${forgotSuccessInfo.name},\n\nID Pengguna Tetap: ${forgotSuccessInfo.username}\nKata Laluan Sementara: ${forgotSuccessInfo.tempPassword}\n\nSila log masuk menggunakan kata laluan sementara ini dan kemaskini kata laluan baharu anda.`
                      )}`}
                      className="px-3 py-2 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-semibold rounded-lg inline-flex items-center gap-1"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      Buka E-mel
                    </a>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Hantar Kata Laluan Sementara ke E-mel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Daftar Ahli Baharu */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-purple-200 rounded-2xl max-w-lg w-full p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Daftar Ahli Platinum Baharu
                </h3>
                <p className="text-xs text-slate-500">
                  ID Pengguna Tetap dijana mengikut nama (kekal sama walaupun
                  bertukar pakej)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRegisterModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Pakej Ahli Platinum (ID Tetap:{' '}
                  <span className="font-mono font-bold text-purple-700">
                    {getNextUsernamePreview(regPackage)}
                  </span>
                  )
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      'Premier',
                      'Elite Plus',
                      'Elite',
                      'Holding Room',
                    ] as MemberPackage[]
                  ).map((pkg) => (
                    <button
                      type="button"
                      key={pkg}
                      onClick={() => setRegPackage(pkg)}
                      className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                        regPackage === pkg
                          ? 'border-purple-600 bg-purple-50/70 text-slate-900'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-xs font-bold">{pkg}</div>
                      <div className="text-[11px] font-mono text-purple-700 mt-0.5 truncate">
                        {getNextUsernamePreview(pkg)}
                      </div>
                    </button>
                  ))}
                </div>
                {regPackage === 'Holding Room' && (
                  <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mt-2">
                    Nota Pakej Holding Room: Tiada akses kepada Rakaman Kelas
                    Percuma (Basic) dan tidak boleh menyertai sesi VC.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Penuh
                  </label>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Masukkan nama penuh anda"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    E-mel
                  </label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="nama@siswa.edu.my"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    No. Telefon
                  </label>
                  <input
                    type="text"
                    required
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="012-3456789"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kata Laluan Akaun
                  </label>
                  <input
                    type="text"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Minimum 4 aksara"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Semester Terkini
                  </label>
                  <select
                    value={regSemester}
                    onChange={(e) => setRegSemester(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    {['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'].map(
                      (s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Universiti — Nama Penuh (Singkatan)
                  </label>
                  <select
                    value={regUni}
                    onChange={(e) => setRegUni(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    {DEFAULT_MALAYSIA_UNIVERSITIES.map((uni) => (
                      <option key={uni} value={uni}>
                        {uni}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tempat Tinggal
                  </label>
                  <input
                    type="text"
                    value={regResidence}
                    onChange={(e) => setRegResidence(e.target.value)}
                    placeholder="Bandar / Negeri"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kumpulan CRMP
                  </label>
                  <select
                    value={regCrmpId}
                    onChange={(e) => setRegCrmpId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    {crmps.map((c) => (
                      <option key={c.username} value={c.username}>
                        {c.username} - {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tajuk Kajian
                  </label>
                  <input
                    type="text"
                    value={regTitle}
                    onChange={(e) => setRegTitle(e.target.value)}
                    placeholder="Tajuk penyelidikan PhD / Sarjana"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Penyelia Utama
                  </label>
                  <input
                    type="text"
                    value={regSupervisor}
                    onChange={(e) => setRegSupervisor(e.target.value)}
                    placeholder="Nama penyelia"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Daftar Sekarang ({getNextUsernamePreview(regPackage)})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
