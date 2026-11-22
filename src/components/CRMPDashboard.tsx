import React, { useState } from 'react';
import {
  BarChart3,
  Users,
  CalendarCheck,
  Calendar,
  LogOut,
  Search,
  Eye,
  X,
  ExternalLink,
  PanelLeftClose,
  PanelLeftOpen,
  Camera,
  Upload,
  Rocket,
  MessageCircle,
  Bell,
  KeyRound,
} from 'lucide-react';
import {
  CRMPDutySchedule,
  CRMPProfile,
  DraftSubmission,
  MemberProfile,
  VCSystemSettings,
  VCVoteRecord,
  WeeklyChecklist,
} from '../types';
import { PHD_PHASES } from '../data/initialData';
import {
  buildWhatsAppReminder,
  computeAutoWeekFromDate,
  getMissingChecklistItemsForDay,
  getTodayDateStr,
} from '../utils/helpers';
import { AvatarUploadModal } from './AvatarUploadModal';
import { PasswordChangeModal } from './PasswordChangeModal';

interface CRMPDashboardProps {
  crmp: CRMPProfile;
  allCrmps: CRMPProfile[];
  allMembers: MemberProfile[];
  drafts: DraftSubmission[];
  checklists: WeeklyChecklist[];
  vcVotes: VCVoteRecord[];
  vcSettings: VCSystemSettings;
  schedules: CRMPDutySchedule[];
  onUpdateMember: (updated: MemberProfile) => void;
  onUpdateDraftFeedback: (draftId: string, feedback: string) => void;
  onUpdateCrmp: (updated: CRMPProfile) => void;
  onUpdateVcSettings: (updated: VCSystemSettings) => void;
  onLogout: () => void;
}

type CrmpTab = 'analytics' | 'members' | 'vc_attendance' | 'schedule';

const TODAY_DATE_STR = getTodayDateStr();

export const CRMPDashboard: React.FC<CRMPDashboardProps> = ({
  crmp,
  allCrmps,
  allMembers,
  drafts,
  checklists,
  vcVotes,
  vcSettings,
  schedules,
  onUpdateMember,
  onUpdateDraftFeedback,
  onUpdateCrmp,
  onUpdateVcSettings,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<CrmpTab>('analytics');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  const hasValidAvatar =
    crmp.avatar &&
    (crmp.avatar.startsWith('data:') || crmp.avatar.startsWith('http'));

  const [searchQuery, setSearchQuery] = useState('');
  const [phaseFilter, setPhaseFilter] = useState<string>('ALL');
  const [selectedMember, setSelectedMember] = useState<MemberProfile | null>(
    null
  );
  const [crmpNoteInput, setCrmpNoteInput] = useState('');
  const [draftFeedbackMap, setDraftFeedbackMap] = useState<
    Record<string, string>
  >({});
  const [selectedVcDate, setSelectedVcDate] = useState(TODAY_DATE_STR);
  const [vcThemeInput, setVcThemeInput] = useState(vcSettings.dailyTheme);
  const [reminderDate, setReminderDate] = useState(TODAY_DATE_STR);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const handleSaveCrmpAvatar = (avatarDataOrUrl: string) => {
    onUpdateCrmp({ ...crmp, avatar: avatarDataOrUrl });
    showToast(
      avatarDataOrUrl
        ? 'Gambar profil CRMP (300×300 / pautan) berjaya disimpan.'
        : 'Gambar profil CRMP telah dipadam.'
    );
  };

  const handleSaveCrmpPassword = (newPassword: string) => {
    onUpdateCrmp({ ...crmp, password: newPassword });
    showToast('Kata laluan akaun CRMP anda telah berjaya dikemaskini.');
  };

  const handleSaveVcTheme = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vcThemeInput.trim()) return;
    onUpdateVcSettings({
      ...vcSettings,
      dailyTheme: vcThemeInput.trim(),
      themeUpdatedBy: `${crmp.username} (${crmp.name})`,
    });
    showToast('Tema VC Hari Ini telah dikemaskini untuk semua ahli Platinum.');
  };

  const reminderDateInfo = computeAutoWeekFromDate(reminderDate);

  // Members under this CRMP
  const myMembers = allMembers.filter((m) => m.crmpId === crmp.username);

  // Metrics required for CRMP:
  const activeCount = myMembers.filter((m) => m.isActive).length;
  const inactiveCount = myMembers.filter((m) => !m.isActive).length;
  const vivaCount = myMembers.filter((m) => m.currentPhase === 'Viva').length;
  const totalPublications = myMembers.reduce(
    (sum, m) => sum + m.publications.length,
    0
  );
  const completedPdCount = myMembers.filter(
    (m) => PHD_PHASES.indexOf(m.currentPhase) >= 1
  ).length;
  const uniqueUniversities = new Set(myMembers.map((m) => m.university)).size;

  // Filtered members for search/filter
  const filteredMyMembers = myMembers.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.university.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPhase =
      phaseFilter === 'ALL' || m.currentPhase === phaseFilter;
    return matchesSearch && matchesPhase;
  });

  // Phase Breakdown for CRMP group
  const phaseColors = [
    '#0ea5e9',
    '#6366f1',
    '#10b981',
    '#f59e0b',
    '#ec4899',
    '#8b5cf6',
  ];
  const phaseDistribution = PHD_PHASES.map((phase, idx) => {
    const count = myMembers.filter((m) => m.currentPhase === phase).length;
    return {
      phase,
      count,
      color: phaseColors[idx % phaseColors.length],
      pct:
        myMembers.length > 0 ? Math.round((count / myMembers.length) * 100) : 0,
    };
  });

  // Bar Chart data for analytics
  const analyticsChartMetrics = [
    {
      label: 'Ahli Aktif',
      value: activeCount,
      max: Math.max(myMembers.length, 5),
      barColor: 'bg-emerald-600',
    },
    {
      label: 'Tidak Aktif',
      value: inactiveCount,
      max: Math.max(myMembers.length, 5),
      barColor: 'bg-amber-500',
    },
    {
      label: 'Telah PD',
      value: completedPdCount,
      max: Math.max(myMembers.length, 5),
      barColor: 'bg-indigo-600',
    },
    {
      label: 'Viva Voce',
      value: vivaCount,
      max: Math.max(myMembers.length, 5),
      barColor: 'bg-purple-600',
    },
    {
      label: 'Publication',
      value: totalPublications,
      max: Math.max(totalPublications, 8),
      barColor: 'bg-sky-600',
    },
  ];

  // Peratus Kehadiran Setiap Hari VC (Semua CRMP Boleh Lihat)
  const allCrmpVcStats = allCrmps.map((c) => {
    const groupMembers = allMembers.filter((m) => m.crmpId === c.username);
    const votesForDay = vcVotes.filter(
      (v) =>
        v.date === selectedVcDate &&
        v.crmpId === c.username &&
        (v.status === 'Hadir Live' || v.status === 'Hadir Rakaman')
    );
    const uniqueAttended = new Set(votesForDay.map((v) => v.memberUsername))
      .size;
    const total = groupMembers.length;
    const percentage =
      total > 0 ? Math.round((uniqueAttended / total) * 100) : 0;
    return {
      crmp: c,
      attended: uniqueAttended,
      total,
      percentage,
    };
  });

  const openMemberDetail = (mem: MemberProfile) => {
    setSelectedMember(mem);
    setCrmpNoteInput(mem.crmpNotes || '');
  };

  const handleSaveMemberNote = () => {
    if (!selectedMember) return;
    const updated = { ...selectedMember, crmpNotes: crmpNoteInput };
    setSelectedMember(updated);
    onUpdateMember(updated);
    showToast(`Catatan kemajuan untuk ${selectedMember.name} telah disimpan.`);
  };

  const handleToggleMemberActive = (mem: MemberProfile) => {
    const updated = { ...mem, isActive: !mem.isActive };
    if (selectedMember?.id === mem.id) {
      setSelectedMember(updated);
    }
    onUpdateMember(updated);
    showToast(
      `Status ${mem.name} dikemaskini kepada ${
        updated.isActive ? 'Aktif' : 'Tidak Aktif'
      }.`
    );
  };

  const crmpInitials = crmp.name
    .split(' ')
    .filter((w) => !['binti', 'bin', 'dr.'].includes(w.toLowerCase()))
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  const navItems: { id: CrmpTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'analytics',
      label: 'Papan Pemuka',
      icon: <BarChart3 className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'members',
      label: `Senarai Ahli (${myMembers.length})`,
      icon: <Users className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'vc_attendance',
      label: 'Kehadiran & Tema VC',
      icon: <CalendarCheck className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'schedule',
      label: 'Jadual Bertugas',
      icon: <Calendar className="w-4 h-4 shrink-0" />,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col lg:flex-row">
      {/* Collapsible Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-full lg:w-64' : 'w-full lg:w-20'
        } bg-slate-900 text-slate-100 flex flex-col justify-between shrink-0 transition-all duration-200 border-r border-slate-800`}
      >
        <div>
          <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Rocket className="w-5 h-5" />
              </div>
              {sidebarOpen && (
                <div className="min-w-0">
                  <div className="text-sm font-bold tracking-tight text-white truncate">
                    PLATINUM DR. ROKET
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    Panel Penyelaras CRMP
                  </div>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title={sidebarOpen ? 'Tutup Sidebar' : 'Buka Sidebar'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            >
              {sidebarOpen ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeftOpen className="w-4 h-4" />
              )}
            </button>
          </div>

          <nav className="p-2.5 space-y-1 flex lg:flex-col overflow-x-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                title={!sidebarOpen ? item.label : undefined}
                className={`flex items-center ${
                  sidebarOpen ? 'gap-3 px-3.5' : 'justify-center px-2'
                } py-2.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer w-full ${
                  activeTab === item.id
                    ? 'bg-pink-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {item.icon}
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            ))}
          </nav>
        </div>

        {/* Bottom Profile Section with Upload File OR Image Link (Macam Gambar 1) */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/40 space-y-3">
          <div
            className={`flex items-center ${
              sidebarOpen ? 'gap-3' : 'justify-center'
            }`}
          >
            <button
              type="button"
              onClick={() => setAvatarModalOpen(true)}
              title="Klik untuk muat naik gambar (300x300 px) atau masuk pautan gambar"
              className="relative group w-10 h-10 rounded-full shrink-0 cursor-pointer focus:outline-none"
            >
              {hasValidAvatar ? (
                <img
                  src={crmp.avatar}
                  alt={crmp.name}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full object-cover border border-amber-400"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center">
                  {crmpInitials}
                </div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-4 h-4 text-white" />
              </div>
            </button>

            {sidebarOpen && (
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-white truncate">
                  {crmp.name}
                </div>
                <div className="text-xs text-slate-400 truncate">
                  CRMP · {crmp.username}
                </div>
              </div>
            )}
          </div>

          {sidebarOpen ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAvatarModalOpen(true)}
                  className="flex-1 py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Upload className="w-3 h-3" />
                  Gambar
                </button>
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(true)}
                  className="flex-1 py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <KeyRound className="w-3 h-3" />
                  Password
                </button>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="w-full py-1.5 px-2.5 bg-slate-800 hover:bg-red-900/60 text-slate-300 hover:text-white text-[11px] font-medium rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Log Keluar
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => setPasswordModalOpen(true)}
                title="Tukar Kata Laluan"
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg flex items-center justify-center cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onLogout}
                title="Log Keluar"
                className="w-full py-2 bg-slate-800 hover:bg-red-900/60 text-slate-300 hover:text-white rounded-lg flex items-center justify-center cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between gap-8 border-b border-slate-800">
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight">
              Dashboard Pengurusan Ahli Platinum
            </h1>
            <p className="text-xs text-slate-300">
              {crmp.groupName} ({crmp.name})
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('vc_attendance')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl whitespace-nowrap shrink-0 cursor-pointer"
            >
              Set Tema & Kehadiran VC
            </button>
          </div>
        </header>

        {toastMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-900 text-white text-xs font-medium flex items-center justify-between">
            <span>{toastMsg}</span>
            <button
              type="button"
              onClick={() => setToastMsg('')}
              className="text-emerald-200 hover:text-white ml-4"
            >
              Tutup
            </button>
          </div>
        )}

        <main className="p-6 space-y-6 max-w-7xl w-full mx-auto">
          {/* ========================================== */}
          {/* TAB 1: PAPAN PEMUKA & CARTA ANALISIS       */}
          {/* ========================================== */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {/* Top 5 KPI Cards required for CRMP */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                  <div className="text-xs text-slate-500 font-semibold">
                    Jumlah Ahli Aktif
                  </div>
                  <div className="text-3xl font-bold font-mono text-emerald-700 mt-1 tabular-nums">
                    {activeCount}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Daripada {myMembers.length} ahli
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                  <div className="text-xs text-slate-500 font-semibold">
                    Ahli Tidak Aktif
                  </div>
                  <div className="text-3xl font-bold font-mono text-amber-600 mt-1 tabular-nums">
                    {inactiveCount}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Universiti: {uniqueUniversities}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                  <div className="text-xs text-slate-500 font-semibold">
                    Jumlah Telah PD
                  </div>
                  <div className="text-3xl font-bold font-mono text-indigo-700 mt-1 tabular-nums">
                    {completedPdCount}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Semester S1 – S8
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                  <div className="text-xs text-slate-500 font-semibold">
                    Jumlah Viva
                  </div>
                  <div className="text-3xl font-bold font-mono text-purple-700 mt-1 tabular-nums">
                    {vivaCount}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Peringkat Viva Voce
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                  <div className="text-xs text-slate-500 font-semibold">
                    Penerbitan
                  </div>
                  <div className="text-3xl font-bold font-mono text-pink-700 mt-1 tabular-nums">
                    {totalPublications}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Jurnal & Prosiding
                  </div>
                </div>
              </div>

              {/* Middle Split: Status Fasa PhD (Donut + Legend) & Kemajuan Keseluruhan (Bar Chart) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Status Fasa PhD */}
                <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                  <h2 className="text-base font-bold text-slate-900">
                    Status Fasa PhD
                  </h2>

                  <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
                    <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                      <svg
                        viewBox="0 0 36 36"
                        className="w-36 h-36 -rotate-90"
                      >
                        <circle
                          cx="18"
                          cy="18"
                          r="15.915"
                          fill="transparent"
                          stroke="#f1f5f9"
                          strokeWidth="4.2"
                        />
                        {
                          phaseDistribution.reduce(
                            (acc, seg) => {
                              if (seg.pct <= 0) return acc;
                              const dashArray = `${seg.pct} ${100 - seg.pct}`;
                              const dashOffset = 100 - acc.offset;
                              acc.elements.push(
                                <circle
                                  key={seg.phase}
                                  cx="18"
                                  cy="18"
                                  r="15.915"
                                  fill="transparent"
                                  stroke={seg.color}
                                  strokeWidth="4.2"
                                  strokeDasharray={dashArray}
                                  strokeDashoffset={dashOffset}
                                />
                              );
                              acc.offset += seg.pct;
                              return acc;
                            },
                            { offset: 0, elements: [] as React.ReactNode[] }
                          ).elements
                        }
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-2xl font-bold font-mono text-slate-900">
                          {myMembers.length}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          Ahli
                        </span>
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="flex-1 space-y-2 text-xs w-full">
                      {phaseDistribution.map((pd) => (
                        <div
                          key={pd.phase}
                          className="flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: pd.color }}
                            />
                            <span className="text-slate-700 font-medium">
                              {pd.phase}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-slate-900">
                            ({pd.count})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Kemajuan Keseluruhan (Carta Bar Analisis) */}
                <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-slate-900">
                      Carta Analisis & Kemajuan Keseluruhan
                    </h2>
                    <span className="text-xs text-slate-500 font-mono">
                      {crmp.username}
                    </span>
                  </div>

                  <div className="h-44 flex items-end justify-around gap-3 pt-4 px-2 border-b border-slate-200">
                    {analyticsChartMetrics.map((m) => {
                      const heightPct = Math.max(
                        12,
                        Math.min(100, Math.round((m.value / m.max) * 100))
                      );
                      return (
                        <div
                          key={m.label}
                          className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end"
                        >
                          <span className="font-mono text-xs font-bold text-slate-900 tabular-nums">
                            {m.value}
                          </span>
                          <div
                            className={`w-full max-w-[42px] rounded-t-lg transition-all ${m.barColor}`}
                            style={{ height: `${heightPct}%` }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-start justify-around gap-2 text-center">
                    {analyticsChartMetrics.map((m) => (
                      <div
                        key={m.label}
                        className="flex-1 text-[11px] font-semibold text-slate-600"
                      >
                        {m.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Table: Senarai & Jejak Kemajuan Ahli Seliaan + Status Checklist / WhatsApp Reminder */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Senarai & Jejak Kemajuan Ahli Seliaan
                    </h2>
                    <p className="text-xs text-slate-500">
                      Termasuk semakan Checklist / TDR hari semasa dan butang
                      peringatan WhatsApp
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('members')}
                    className="text-xs font-semibold text-indigo-700 hover:underline cursor-pointer"
                  >
                    Tapis & Cari Ahli →
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-bold text-slate-700">
                        <th className="py-2.5 px-3">No.</th>
                        <th className="py-2.5 px-3">Nama Ahli</th>
                        <th className="py-2.5 px-3">Uni</th>
                        <th className="py-2.5 px-3">Sem</th>
                        <th className="py-2.5 px-3">Fasa Semasa</th>
                        <th className="py-2.5 px-3">
                          Checklist & TDR ({reminderDateInfo.selectedDayName})
                        </th>
                        <th className="py-2.5 px-3 text-right">Jejak</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {myMembers.map((mem, idx) => {
                        const memChecklist = checklists.find(
                          (c) =>
                            c.memberId === mem.username &&
                            c.startDate === reminderDateInfo.startDate
                        );
                        const missingItems = getMissingChecklistItemsForDay(
                          memChecklist,
                          reminderDateInfo.selectedDayName
                        );
                        const waReminder = buildWhatsAppReminder(
                          mem.name,
                          mem.username,
                          mem.phone,
                          reminderDateInfo.selectedDayName,
                          reminderDateInfo.weekLabel,
                          missingItems,
                          `${crmp.username} - ${crmp.name}`
                        );

                        return (
                          <tr key={mem.id} className="hover:bg-slate-50">
                            <td className="py-3 px-3 font-mono">{idx + 1}.</td>
                            <td className="py-3 px-3 font-semibold text-slate-900">
                              <div>{mem.name}</div>
                              <div className="text-[11px] font-mono text-slate-500">
                                {mem.username} · {mem.package}
                              </div>
                            </td>
                            <td className="py-3 px-3 font-bold text-slate-800">
                              {mem.university}
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-700">
                              {mem.currentSemester}
                            </td>
                            <td className="py-3 px-3 text-indigo-700 font-semibold">
                              {mem.currentPhase} ({mem.overallProgress}%)
                            </td>
                            <td className="py-3 px-3">
                              {missingItems.length === 0 ? (
                                <span className="text-emerald-700 font-semibold">
                                  ✓ Lengkap Ditanda
                                </span>
                              ) : (
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-amber-700 font-semibold">
                                    Belum Tick ({missingItems.length})
                                  </span>
                                  <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-bold rounded-md">
                                    Auto-Hantar Ikut Jadual
                                  </span>
                                  <a
                                    href={waReminder.whatsappUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-semibold rounded-lg inline-flex items-center gap-1"
                                  >
                                    <MessageCircle className="w-3 h-3" />
                                    Lihat Mesej Auto
                                  </a>
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => openMemberDetail(mem)}
                                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                Lihat
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* TAB 2: JEJAK KEMAJUAN & SENARAI AHLI       */}
          {/* ========================================== */}
          {activeTab === 'members' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Jejak Kemajuan Setiap Ahli ({filteredMyMembers.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Lihat perkembangan ahli masing-masing, semak draf, Thesis
                    Map & status mesej peringatan automatik Checklist/TDR
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Tarikh Semakan Checklist:
                    </label>
                    <input
                      type="date"
                      value={reminderDate}
                      onChange={(e) => setReminderDate(e.target.value)}
                      className="px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg cursor-pointer"
                    />
                  </div>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari nama / kod / universiti..."
                      className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <select
                    value={phaseFilter}
                    onChange={(e) => setPhaseFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="ALL">Semua Fasa PhD</option>
                    {PHD_PHASES.map((ph) => (
                      <option key={ph} value={ph}>
                        {ph}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-indigo-950 font-medium">
                  <Bell className="w-4 h-4 text-indigo-700 shrink-0" />
                  <span>
                    Semakan Checklist & TDR untuk{' '}
                    <strong>
                      {reminderDateInfo.selectedDayName} ({reminderDate})
                    </strong>{' '}
                    · Auto Minggu:{' '}
                    <strong className="font-mono">
                      {reminderDateInfo.weekLabel}
                    </strong>{' '}
                    ·{' '}
                    <span className="text-emerald-800 font-bold">
                      Mesej peringatan dihantar secara automatik oleh sistem mengikut jadual (tak perlu tunggu CRMP)
                    </span>
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600">
                      <th className="py-2.5 px-3">Kod</th>
                      <th className="py-2.5 px-3">Nama Ahli</th>
                      <th className="py-2.5 px-3">Pakej</th>
                      <th className="py-2.5 px-3">Uni / Sem</th>
                      <th className="py-2.5 px-3">Fasa Semasa</th>
                      <th className="py-2.5 px-3">Draf / Pub</th>
                      <th className="py-2.5 px-3">
                        Checklist ({reminderDateInfo.selectedDayName})
                      </th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredMyMembers.map((mem) => {
                      const memDrafts = drafts.filter(
                        (d) => d.memberId === mem.username
                      );
                      const topDraft = memDrafts.sort(
                        (a, b) => b.draftNumber - a.draftNumber
                      )[0];
                      const memChecklist = checklists.find(
                        (c) =>
                          c.memberId === mem.username &&
                          c.startDate === reminderDateInfo.startDate
                      );
                      const missingItems = getMissingChecklistItemsForDay(
                        memChecklist,
                        reminderDateInfo.selectedDayName
                      );
                      const waReminder = buildWhatsAppReminder(
                        mem.name,
                        mem.username,
                        mem.phone,
                        reminderDateInfo.selectedDayName,
                        reminderDateInfo.weekLabel,
                        missingItems,
                        `${crmp.username} - ${crmp.name}`
                      );

                      return (
                        <tr key={mem.id} className="hover:bg-slate-50">
                          <td className="py-3 px-3 font-mono font-bold text-indigo-700">
                            {mem.username}
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-900">
                            <div>{mem.name}</div>
                            <div className="text-[11px] text-slate-500 font-normal">
                              {mem.phone}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-slate-700">
                            {mem.package}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-700">
                            {mem.university} · {mem.currentSemester}
                          </td>
                          <td className="py-3 px-3 text-slate-800 font-medium">
                            {mem.currentPhase} ({mem.overallProgress}%)
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-700">
                            {topDraft
                              ? `Draf ${topDraft.draftNumber}`
                              : 'Tiada'}{' '}
                            · {mem.publications.length} Pub
                          </td>
                          <td className="py-3 px-3">
                            {missingItems.length === 0 ? (
                              <span className="text-emerald-700 font-semibold">
                                ✓ Lengkap
                              </span>
                            ) : (
                              <div className="space-y-1">
                                <div className="text-[11px] text-amber-800 font-medium">
                                  Belum: {missingItems.join(', ')}
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-bold rounded-md">
                                    Dihantar Automatik
                                  </span>
                                  <a
                                    href={waReminder.whatsappUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-semibold rounded-lg inline-flex items-center gap-1"
                                  >
                                    <MessageCircle className="w-3 h-3" />
                                    Salinan WhatsApp
                                  </a>
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <button
                              type="button"
                              onClick={() => handleToggleMemberActive(mem)}
                              className={`text-xs font-semibold cursor-pointer ${
                                mem.isActive
                                  ? 'text-emerald-700'
                                  : 'text-amber-700'
                              }`}
                            >
                              {mem.isActive ? 'Aktif' : 'Tidak Aktif'}
                            </button>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => openMemberDetail(mem)}
                              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Lihat Progress
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* TAB 3: PERATUS KEHADIRAN & TEMA VC CRMP    */}
          {/* ========================================== */}
          {activeTab === 'vc_attendance' && (
            <div className="space-y-6">
              {/* CRMP Input Tema VC Hari Ini */}
              <form
                onSubmit={handleSaveVcTheme}
                className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Tetapkan Tema VC Hari Ini (Dimasukkan Oleh CRMP)
                    </h2>
                    <p className="text-xs text-slate-500">
                      VC diadakan Isnin – Jumaat jam{' '}
                      <strong>{vcSettings.vcTimeLabel}</strong> · Vote diaktifkan
                      pada <strong>{vcSettings.voteOpenTime}</strong>
                    </p>
                  </div>
                  <div className="text-xs font-mono text-indigo-700 font-semibold">
                    Dikemaskini oleh: {vcSettings.themeUpdatedBy}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    required
                    value={vcThemeInput}
                    onChange={(e) => setVcThemeInput(e.target.value)}
                    placeholder="Masukkan tema VC hari ini untuk paparan undian ahli..."
                    className="flex-1 px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-600"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold rounded-xl cursor-pointer shrink-0"
                  >
                    Simpan Tema VC Hari Ini
                  </button>
                </div>
              </form>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Peratus Kehadiran Setiap Hari VC — Semua CRMP Boleh Lihat
                    </h2>
                    <p className="text-xs text-slate-500">
                      Ahli hanya boleh vote untuk hari semasa sahaja (Isnin –
                      Jumaat). CRMP boleh menyemak rekod mengikut kalendar.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-slate-700">
                      Pilih Kalendar Tarikh VC:
                    </label>
                    <input
                      type="date"
                      value={selectedVcDate}
                      onChange={(e) => setSelectedVcDate(e.target.value)}
                      className="px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {allCrmpVcStats.map((st) => (
                    <div
                      key={st.crmp.id}
                      className={`border rounded-xl p-4 space-y-2.5 ${
                        st.crmp.username === crmp.username
                          ? 'border-indigo-600 bg-indigo-50/40'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-indigo-700">
                          {st.crmp.username}
                        </span>
                        <span className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                          {st.percentage}%
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-900">
                        {st.crmp.name}
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600"
                          style={{ width: `${st.percentage}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        Hadir: {st.attended} / {st.total} Ahli
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-slate-200 space-y-3">
                  <h3 className="text-sm font-bold text-slate-900">
                    Senarai Undian Kehadiran VC Ahli Pada {selectedVcDate}
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600">
                          <th className="py-2 px-3">Kod Ahli</th>
                          <th className="py-2 px-3">Nama Ahli</th>
                          <th className="py-2 px-3">Kumpulan CRMP</th>
                          <th className="py-2 px-3">Status Vote VC</th>
                          <th className="py-2 px-3">Masa</th>
                          <th className="py-2 px-3">Catatan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {allMembers.map((m) => {
                          const vote = vcVotes.find(
                            (v) =>
                              v.date === selectedVcDate &&
                              v.memberUsername === m.username
                          );
                          return (
                            <tr key={m.id} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">
                                {m.username}
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-slate-900">
                                {m.name}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-600">
                                {m.crmpId}
                              </td>
                              <td className="py-2.5 px-3 font-semibold">
                                {vote ? (
                                  <span className="text-emerald-700">
                                    ✓ Hadir
                                  </span>
                                ) : (
                                  <span className="text-red-600">
                                    Tidak Hadir
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-600">
                                {vote ? vote.checkInTime : '-'}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600">
                                {vote ? vote.takeawayNote : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* TAB 4: JADUAL BERTUGAS CRMP                */}
          {/* ========================================== */}
          {activeTab === 'schedule' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
              <div className="border-b border-slate-200 pb-4">
                <h2 className="text-lg font-bold text-slate-900">
                  Jadual Bertugas CRMP (VC Isnin – Jumaat · 6:01 Petang)
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600">
                      <th className="py-2.5 px-3">Tarikh</th>
                      <th className="py-2.5 px-3">Hari</th>
                      <th className="py-2.5 px-3">Slot Masa</th>
                      <th className="py-2.5 px-3">Sesi VC</th>
                      <th className="py-2.5 px-3">CRMP Bertugas</th>
                      <th className="py-2.5 px-3">CRMP Pembantu</th>
                      <th className="py-2.5 px-3 text-right">Pautan VC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {schedules.map((sch) => {
                      const isMyDuty =
                        sch.crmpId === crmp.username ||
                        sch.backupCrmpId === crmp.username;
                      return (
                        <tr
                          key={sch.id}
                          className={
                            isMyDuty ? 'bg-indigo-50/50' : 'hover:bg-slate-50'
                          }
                        >
                          <td className="py-3 px-3 font-mono font-semibold text-slate-900">
                            {sch.date}
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-800">
                            {sch.dayName}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-600">
                            {sch.timeSlot}
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-900">
                            {sch.sessionTitle}
                          </td>
                          <td className="py-3 px-3 font-semibold text-indigo-700">
                            {sch.crmpId} — {sch.crmpName}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-600">
                            {sch.backupCrmpId}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <a
                              href={sch.vcLink}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1"
                            >
                              Buka VC
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modal Upload Gambar Standard 300x300 atau Pautan URL */}
      <AvatarUploadModal
        isOpen={avatarModalOpen}
        onClose={() => setAvatarModalOpen(false)}
        currentAvatar={hasValidAvatar ? crmp.avatar : ''}
        userName={crmp.name}
        userCode={crmp.username}
        onSaveAvatar={handleSaveCrmpAvatar}
      />

      {/* Modal Tukar Kata Laluan & Lupa Kata Laluan CRMP */}
      <PasswordChangeModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        userName={crmp.name}
        userCode={crmp.username}
        userEmail={crmp.email}
        currentPassword={crmp.password}
        onSavePassword={handleSaveCrmpPassword}
      />

      {/* Modal Jejak Kemajuan & Perkembangan Penuh Ahli */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <div className="text-xs font-mono font-bold text-indigo-700">
                  {selectedMember.username} · Pakej {selectedMember.package} ·{' '}
                  {selectedMember.university} (Sem{' '}
                  {selectedMember.currentSemester})
                </div>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                  {selectedMember.name}
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Tajuk Kajian: {selectedMember.researchTitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-slate-500">Register PD</div>
                <div className="font-mono font-bold text-slate-900 mt-1">
                  {selectedMember.dates.registerPD || '-'}
                </div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-slate-500">Data Collection</div>
                <div className="font-mono font-bold text-slate-900 mt-1">
                  {selectedMember.dates.dataCollectionAnalysis || '-'}
                </div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-slate-500">Tarikh NoS</div>
                <div className="font-mono font-bold text-slate-900 mt-1">
                  {selectedMember.dates.nos || '-'}
                </div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-slate-500">Thesis Submission</div>
                <div className="font-mono font-bold text-slate-900 mt-1">
                  {selectedMember.dates.thesisSubmission || '-'}
                </div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-slate-500">Tarikh Viva</div>
                <div className="font-mono font-bold text-slate-900 mt-1">
                  {selectedMember.dates.viva || '-'}
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <h4 className="text-sm font-bold text-slate-900">
                Peta Thesis Map: {selectedMember.researchTitle} (
                {selectedMember.thesisMap.length} Bab)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                {selectedMember.thesisMap.map((ch) => (
                  <div
                    key={ch.id}
                    className="p-3 border border-slate-200 rounded-lg text-xs space-y-1.5"
                  >
                    <div className="flex justify-between font-bold">
                      <span>Bab {ch.chapterNumber}</span>
                      <span className="font-mono text-indigo-700">
                        {ch.progress}%
                      </span>
                    </div>
                    <div className="text-slate-800 font-semibold line-clamp-2 text-[11px]">
                      {ch.title}
                    </div>
                    {ch.subtopics && ch.subtopics.length > 0 && (
                      <div className="pt-1 border-t border-slate-100 space-y-1">
                        {ch.subtopics.map((sub) => (
                          <div
                            key={sub.id}
                            className="text-[10px] text-slate-600 flex items-start gap-1"
                          >
                            <span className="font-mono font-bold text-indigo-700">
                              {sub.code}
                            </span>
                            <span
                              className={
                                sub.completed
                                  ? 'line-through text-emerald-700'
                                  : ''
                              }
                            >
                              {sub.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="text-[11px] font-mono text-slate-500">
                      {ch.status} · {ch.pages} ms
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-900">
                Rekod Naik Draf Tesis & Semakan CRMP
              </h4>
              {drafts.filter((d) => d.memberId === selectedMember.username)
                .length === 0 ? (
                <div className="p-4 text-xs text-slate-500 border border-slate-200 rounded-lg">
                  Ahli ini belum memuat naik sebarang rekod draf.
                </div>
              ) : (
                <div className="space-y-3">
                  {drafts
                    .filter((d) => d.memberId === selectedMember.username)
                    .map((drf) => (
                      <div
                        key={drf.id}
                        className="p-4 border border-slate-200 rounded-lg space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between font-mono">
                          <span className="font-bold text-indigo-700 text-sm">
                            Draf Ke-{drf.draftNumber} ({drf.pageCount} ms ·{' '}
                            {drf.wordCount.toLocaleString()} perkataan)
                          </span>
                          <span className="text-slate-500">{drf.date}</span>
                        </div>
                        <div className="text-slate-600">
                          Sujud Syukur 11x: {drf.sujudSyukur11x ? 'Ya' : 'Tidak'}{' '}
                          · 2 Jam 7 Minit:{' '}
                          {drf.twoHoursSevenMinutes ? 'Ya' : 'Tidak'} · TDR013:{' '}
                          {drf.tdr013 ? 'Ya' : 'Tidak'}{' '}
                          {drf.draftNumber <= 10 &&
                            `· TDR010: ${drf.tdr010 ? 'Ya' : 'Tidak'}`}
                        </div>
                        {drf.memberNotes && (
                          <div className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-900">
                            <strong>Catatan Ahli:</strong> {drf.memberNotes}
                          </div>
                        )}
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            value={
                              draftFeedbackMap[drf.id] ??
                              drf.crmpFeedback ??
                              ''
                            }
                            onChange={(e) =>
                              setDraftFeedbackMap({
                                ...draftFeedbackMap,
                                [drf.id]: e.target.value,
                              })
                            }
                            placeholder="Tulis maklum balas CRMP untuk draf ini..."
                            className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const fb =
                                draftFeedbackMap[drf.id] ??
                                drf.crmpFeedback ??
                                '';
                              onUpdateDraftFeedback(drf.id, fb);
                              showToast(
                                `Maklum balas untuk Draf Ke-${drf.draftNumber} disimpan.`
                              );
                            }}
                            className="px-3 py-1.5 bg-indigo-700 text-white font-semibold rounded-lg cursor-pointer"
                          >
                            Simpan Ulasan
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="space-y-2 pt-3 border-t border-slate-200">
              <label className="block text-xs font-bold text-slate-900">
                Ulasan CRMP Untuk {selectedMember.name}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={crmpNoteInput}
                  onChange={(e) => setCrmpNoteInput(e.target.value)}
                  placeholder="Tulis nota bimbingan untuk ahli ini..."
                  className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
                <button
                  type="button"
                  onClick={handleSaveMemberNote}
                  className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Simpan Nota
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
