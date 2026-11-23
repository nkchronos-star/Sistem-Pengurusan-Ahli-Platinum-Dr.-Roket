import React, { useEffect, useState } from 'react';
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
  Award,
  Flame,
  AlertTriangle,
  GraduationCap,
  BookOpen,
  CheckCircle2,
  MapPin,
  Phone,
  Mail,
  Building2,
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
  computeChecklistCompletionForRecord,
  getMissingChecklistItemsForDay,
  getTodayDateStr,
  inferMemberGender,
} from '../utils/helpers';
import { AvatarUploadModal } from './AvatarUploadModal';
import { PasswordChangeModal } from './PasswordChangeModal';
import {
  MasterPhdRoadmap,
  ScholarCharacterAvatar,
} from './MasterPhdRoadmap';

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

  useEffect(() => {
    setVcThemeInput(vcSettings.dailyTheme);
  }, [vcSettings.dailyTheme]);

  useEffect(() => {
    if (!selectedMember) return;
    const latest = allMembers.find((m) => m.id === selectedMember.id);
    if (latest) {
      setSelectedMember(latest);
    }
  }, [allMembers, selectedMember]);

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

  // Comprehensive CRMP Analytics Metrics
  const maleCount = myMembers.filter(
    (m) => inferMemberGender(m) === 'Lelaki'
  ).length;
  const femaleCount = myMembers.filter(
    (m) => inferMemberGender(m) === 'Perempuan'
  ).length;
  const activeCount = myMembers.filter((m) => m.isActive).length;
  const inactiveCount = myMembers.filter((m) => !m.isActive).length;

  const earlyRegCount = myMembers.filter(
    (m) => m.currentPhase === 'Early Registration'
  ).length;
  const pdCount = myMembers.filter(
    (m) => m.currentPhase === 'Proposal Defence (PD)'
  ).length;
  const dataCollectionCount = myMembers.filter(
    (m) => m.currentPhase === 'Data Collection & Analysis'
  ).length;
  const nosCount = myMembers.filter(
    (m) =>
      m.currentPhase === 'Notice of Submission (Nos)' ||
      m.currentPhase === 'Thesis Submission'
  ).length;
  const vivaCount = myMembers.filter((m) => m.currentPhase === 'Viva').length;
  const graduateCount = myMembers.filter((m) => !!m.isGraduated).length;
  const excellentThesisCount = myMembers.filter(
    (m) => !!m.isExcellentThesis
  ).length;
  const totalPublications = myMembers.reduce(
    (sum, m) => sum + m.publications.length,
    0
  );
  const completedPdCount = myMembers.filter(
    (m) => PHD_PHASES.indexOf(m.currentPhase) >= 1
  ).length;
  const uniqueUniversities = new Set(myMembers.map((m) => m.university)).size;

  // Semester breakdown (S1, S2, S3, S4, S5, S6+)
  const semesterBuckets = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6+'];
  const semesterColors = [
    'bg-pink-500',
    'bg-amber-500',
    'bg-emerald-500',
    'bg-sky-500',
    'bg-indigo-600',
    'bg-purple-600',
  ];
  const semesterBreakdown = semesterBuckets.map((bucket, idx) => {
    const matchingMembers = myMembers.filter((m) => {
      const sem = (m.currentSemester || 'S1').toUpperCase().trim();
      if (bucket === 'S6+') {
        const num = parseInt(sem.replace(/[^0-9]/g, ''), 10);
        return !isNaN(num) && num >= 6;
      }
      return sem === bucket;
    });
    return {
      bucket,
      label: bucket === 'S1' ? 'Sem 1 (Baru)' : `Sem ${bucket.replace('S', '')}`,
      count: matchingMembers.length,
      members: matchingMembers,
      color: semesterColors[idx % semesterColors.length],
    };
  });

  // Member Checklist Consistency & Activity Analysis
  const memberActivityRanking = myMembers
    .map((m) => {
      const memChecklists = checklists.filter((c) => c.memberId === m.username);
      const currentWeekChk = checklists.find(
        (c) =>
          c.memberId === m.username &&
          c.startDate === reminderDateInfo.startDate
      );
      const currentStats = computeChecklistCompletionForRecord(currentWeekChk);
      const allWeeksStats = memChecklists.map((c) =>
        computeChecklistCompletionForRecord(c)
      );
      const avgPct =
        allWeeksStats.length > 0
          ? Math.round(
              allWeeksStats.reduce((s, x) => s + x.percentage, 0) /
                allWeeksStats.length
            )
          : currentStats.percentage;
      const totalCompletedItems = allWeeksStats.reduce(
        (s, x) => s + x.tickedCount,
        0
      );
      const memDrafts = drafts
        .filter((d) => d.memberId === m.username)
        .sort((a, b) => b.draftNumber - a.draftNumber);
      const latestDraft = memDrafts[0];
      const missingToday = getMissingChecklistItemsForDay(
        currentWeekChk,
        reminderDateInfo.selectedDayName
      );

      return {
        member: m,
        currentWeekPct: currentStats.percentage,
        currentCompleted: currentStats.tickedCount,
        currentTotal: currentStats.totalPossible,
        avgPct,
        totalCompletedItems,
        weeksTracked: memChecklists.length,
        latestDraft,
        missingToday,
      };
    })
    .sort(
      (a, b) =>
        b.currentWeekPct - a.currentWeekPct ||
        b.avgPct - a.avgPct ||
        b.member.overallProgress - a.member.overallProgress
    );

  // Ahli yang selalu buat checklist (Top consistent) vs Ahli kurang aktif / perlu perhatian
  const topConsistentMembers = memberActivityRanking.filter(
    (item) => item.currentWeekPct >= 60 && item.member.isActive
  );
  const lessActiveMembers = memberActivityRanking.filter(
    (item) =>
      !item.member.isActive ||
      item.currentWeekPct < 60 ||
      item.missingToday.length > 0
  );

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
    '#14b8a6', // Early Registration
    '#a855f7', // Proposal Defence (PD)
    '#0ea5e9', // Data Collection & Analysis
    '#f97316', // Notice of Submission (Nos)
    '#22c55e', // Thesis Submission
    '#eab308', // Viva
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
      label: 'Baru Daftar',
      value: earlyRegCount,
      max: Math.max(myMembers.length, 4),
      barColor: 'bg-teal-500',
    },
    {
      label: 'Telah PD',
      value: completedPdCount,
      max: Math.max(myMembers.length, 4),
      barColor: 'bg-purple-500',
    },
    {
      label: 'Fasa NOS',
      value: nosCount,
      max: Math.max(myMembers.length, 4),
      barColor: 'bg-orange-500',
    },
    {
      label: 'Viva Voce',
      value: vivaCount,
      max: Math.max(myMembers.length, 4),
      barColor: 'bg-amber-500',
    },
    {
      label: 'Ahli Aktif',
      value: activeCount,
      max: Math.max(myMembers.length, 4),
      barColor: 'bg-emerald-500',
    },
    {
      label: 'Penerbitan',
      value: totalPublications,
      max: Math.max(totalPublications, 5),
      barColor: 'bg-indigo-600',
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
      label: 'Papan Pemuka & Analisis',
      icon: <BarChart3 className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'members',
      label: `Senarai & Detail Ahli (${myMembers.length})`,
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
    <div className="min-h-screen bg-gradient-to-br from-[#f6f0ff] via-[#fdf4ff] to-[#eef2ff] text-slate-900 flex flex-col lg:flex-row">
      {/* Collapsible Royal Purple Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-full lg:w-64' : 'w-full lg:w-20'
        } bg-gradient-to-b from-[#2a1258] via-[#230e4b] to-[#190838] text-slate-100 flex flex-col justify-between shrink-0 transition-all duration-200 border-r border-purple-900/50 shadow-xl`}
      >
        <div>
          <div className="p-4 border-b border-purple-800/50 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-amber-400 text-white flex items-center justify-center shrink-0 shadow-md">
                <Rocket className="w-5 h-5" />
              </div>
              {sidebarOpen && (
                <div className="min-w-0">
                  <div className="text-sm font-black tracking-tight text-white truncate">
                    PLATINUM DR. ROKET
                  </div>
                  <div className="text-[11px] text-purple-200 truncate font-medium">
                    Panel Penyelaras CRMP
                  </div>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title={sidebarOpen ? 'Tutup Sidebar' : 'Buka Sidebar'}
              className="p-1.5 rounded-lg text-purple-300 hover:text-white hover:bg-purple-800/50 transition-colors cursor-pointer shrink-0"
            >
              {sidebarOpen ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeftOpen className="w-4 h-4" />
              )}
            </button>
          </div>

          <nav className="p-2.5 space-y-1.5 flex lg:flex-col overflow-x-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                title={!sidebarOpen ? item.label : undefined}
                className={`flex items-center ${
                  sidebarOpen ? 'gap-3 px-3.5' : 'justify-center px-2'
                } py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer w-full ${
                  activeTab === item.id
                    ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md shadow-pink-950/40'
                    : 'text-purple-100/80 hover:bg-purple-800/40 hover:text-white'
                }`}
              >
                {item.icon}
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            ))}
          </nav>
        </div>

        {/* Bottom Profile Section */}
        <div className="p-3.5 border-t border-purple-800/50 bg-[#14052e]/60 space-y-3">
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
                  className="w-10 h-10 rounded-full object-cover border-2 border-amber-400"
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
                <div className="text-sm font-bold text-white truncate">
                  {crmp.name}
                </div>
                <div className="text-xs text-purple-200 truncate font-mono">
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
                  className="flex-1 py-1.5 px-2.5 bg-purple-900/70 hover:bg-purple-800 text-purple-100 text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Upload className="w-3 h-3" />
                  Gambar
                </button>
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(true)}
                  className="flex-1 py-1.5 px-2.5 bg-purple-900/70 hover:bg-purple-800 text-purple-100 text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <KeyRound className="w-3 h-3" />
                  Password
                </button>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="w-full py-1.5 px-2.5 bg-purple-900/70 hover:bg-red-700 text-purple-200 hover:text-white text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
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
                className="w-full py-2 bg-purple-900/70 hover:bg-purple-800 text-purple-200 hover:text-white rounded-lg flex items-center justify-center cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onLogout}
                title="Log Keluar"
                className="w-full py-2 bg-purple-900/70 hover:bg-red-700 text-purple-200 hover:text-white rounded-lg flex items-center justify-center cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-gradient-to-r from-[#2c125e] via-[#431d8a] to-[#5624a8] text-white px-6 py-4 flex items-center justify-between gap-8 border-b border-purple-800/50 shadow-md">
          <div>
            <h1 className="text-base sm:text-xl font-black tracking-tight">
              Dashboard Pengurusan Ahli Platinum (CRMP)
            </h1>
            <p className="text-xs text-purple-100 font-medium">
              {crmp.groupName} · {crmp.name} ({crmp.username})
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('vc_attendance')}
              className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-xs font-bold rounded-xl whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
            >
              Set Tema & Kehadiran VC
            </button>
          </div>
        </header>

        {toastMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-900 text-white text-xs font-medium flex items-center justify-between shadow-sm">
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
          {/* TAB 1: PAPAN PEMUKA & ANALISIS MENARIK     */}
          {/* ========================================== */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {/* Baris 1: 6 Kad KPI Berwarna-warni & Ceria (Termasuk Pecahan L & P, Baru Daftar, PD, NOS, Viva) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                {/* 1. Jumlah Ahli + Lelaki & Perempuan */}
                <div className="bg-gradient-to-br from-sky-50 via-white to-indigo-50 border-2 border-sky-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-bold text-sky-900">
                    <span>Jumlah Ahli</span>
                    <Users className="w-4 h-4 text-sky-600" />
                  </div>
                  <div className="text-3xl font-black font-mono text-sky-700 mt-1 tabular-nums">
                    {myMembers.length}
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-bold">
                    <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-900 border border-sky-300">
                      L: {maleCount}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-pink-100 text-pink-900 border border-pink-300">
                      P: {femaleCount}
                    </span>
                  </div>
                </div>

                {/* 2. Baru Daftar (Early Registration) */}
                <div className="bg-gradient-to-br from-teal-50 via-white to-emerald-50 border-2 border-teal-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-bold text-teal-900">
                    <span>Baru Daftar</span>
                    <Rocket className="w-4 h-4 text-teal-600" />
                  </div>
                  <div className="text-3xl font-black font-mono text-teal-700 mt-1 tabular-nums">
                    {earlyRegCount}
                  </div>
                  <div className="text-[11px] text-teal-800 font-semibold mt-1.5">
                    Early Registration (ER)
                  </div>
                </div>

                {/* 3. Proposal Defence (PD) & Data Collection */}
                <div className="bg-gradient-to-br from-purple-50 via-white to-indigo-50 border-2 border-purple-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-bold text-purple-900">
                    <span>Telah PD & Data</span>
                    <BookOpen className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="text-3xl font-black font-mono text-purple-700 mt-1 tabular-nums">
                    {completedPdCount}
                  </div>
                  <div className="text-[11px] text-purple-800 font-semibold mt-1.5">
                    PD: {pdCount} · Data: {dataCollectionCount}
                  </div>
                </div>

                {/* 4. Notice of Submission (NOS) & Thesis Submission */}
                <div className="bg-gradient-to-br from-orange-50 via-white to-amber-50 border-2 border-orange-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-bold text-orange-900">
                    <span>Fasa NOS & Tesis</span>
                    <CheckCircle2 className="w-4 h-4 text-orange-600" />
                  </div>
                  <div className="text-3xl font-black font-mono text-orange-600 mt-1 tabular-nums">
                    {nosCount}
                  </div>
                  <div className="text-[11px] text-orange-800 font-semibold mt-1.5">
                    Notice of Submission
                  </div>
                </div>

                {/* 5. Viva Voce & Graduate */}
                <div className="bg-gradient-to-br from-amber-50 via-white to-yellow-50 border-2 border-amber-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                    <span>Viva & Graduate</span>
                    <GraduationCap className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-3xl font-black font-mono text-amber-700 mt-1 tabular-nums">
                    {vivaCount}
                  </div>
                  <div className="text-[11px] text-amber-800 font-semibold mt-1.5">
                    Grad: {graduateCount} · Cemerlang: {excellentThesisCount}
                  </div>
                </div>

                {/* 6. Status Aktif & Penerbitan */}
                <div className="bg-gradient-to-br from-pink-50 via-white to-rose-50 border-2 border-pink-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-bold text-pink-900">
                    <span>Aktif & Penerbitan</span>
                    <Award className="w-4 h-4 text-pink-600" />
                  </div>
                  <div className="text-3xl font-black font-mono text-pink-600 mt-1 tabular-nums">
                    {activeCount}/{myMembers.length}
                  </div>
                  <div className="text-[11px] text-pink-800 font-semibold mt-1.5">
                    {totalPublications} Jurnal · {uniqueUniversities} Uni
                  </div>
                </div>
              </div>

              {/* Baris 2: Carta Donut Status Fasa Kajian & Carta Bar Pecahan Semester (Sem 1, Sem 2, Sem 3...) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Status Fasa Kajian (Donut + Legend Berwarna) */}
                <div className="lg:col-span-6 bg-white/95 border-2 border-purple-100 rounded-2xl p-6 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-purple-100 pb-3">
                    <div>
                      <h2 className="text-base font-black text-slate-900">
                        Status Fasa Kajian Ahli
                      </h2>
                      <p className="text-xs text-slate-500">
                        Taburan ahli mengikut fasa Master / PhD semasa
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-800 font-mono text-xs font-bold border border-purple-200">
                      L: {maleCount} | P: {femaleCount}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
                    <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
                      <svg
                        viewBox="0 0 36 36"
                        className="w-40 h-40 -rotate-90 drop-shadow-xs"
                      >
                        <circle
                          cx="18"
                          cy="18"
                          r="15.915"
                          fill="transparent"
                          stroke="#f1f5f9"
                          strokeWidth="4.8"
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
                                  strokeWidth="4.8"
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
                        <span className="text-3xl font-black font-mono text-slate-900">
                          {myMembers.length}
                        </span>
                        <span className="text-xs font-bold text-slate-500">
                          Ahli
                        </span>
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="flex-1 space-y-2 text-xs w-full">
                      {phaseDistribution.map((pd) => (
                        <div
                          key={pd.phase}
                          className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-purple-50/50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                              style={{ backgroundColor: pd.color }}
                            />
                            <span className="text-slate-700 font-semibold">
                              {pd.phase}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 font-mono">
                            <span className="font-black text-slate-900">
                              {pd.count}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              ({pd.pct}%)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Pecahan Semester (Sem 1, Sem 2, Sem 3, Sem 4, Sem 5, Sem 6+) & Kemajuan */}
                <div className="lg:col-span-6 bg-white/95 border-2 border-purple-100 rounded-2xl p-6 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-purple-100 pb-3">
                    <div>
                      <h2 className="text-base font-black text-slate-900">
                        Analisis Mengikut Semester (Sem 1 – Sem 6+) & Fasa
                      </h2>
                      <p className="text-xs text-slate-500">
                        Bilangan ahli mengikut semester pengajian semasa
                      </p>
                    </div>
                    <span className="text-xs text-purple-700 font-mono font-bold">
                      {crmp.username}
                    </span>
                  </div>

                  {/* Bar Chart Semester */}
                  <div className="grid grid-cols-6 gap-2.5 pt-2">
                    {semesterBreakdown.map((sb) => {
                      const maxSem = Math.max(
                        ...semesterBreakdown.map((x) => x.count),
                        2
                      );
                      const heightPct =
                        sb.count > 0
                          ? Math.max(22, Math.round((sb.count / maxSem) * 100))
                          : 10;
                      return (
                        <div
                          key={sb.bucket}
                          className="flex flex-col items-center p-2.5 rounded-xl bg-slate-50 border border-slate-200/80"
                        >
                          <div className="h-24 w-full flex items-end justify-center">
                            <div
                              className={`w-full max-w-[34px] rounded-t-lg transition-all flex items-start justify-center pt-1 text-[11px] font-mono font-black text-white ${
                                sb.count > 0 ? sb.color : 'bg-slate-200 text-slate-500'
                              }`}
                              style={{ height: `${heightPct}%` }}
                            >
                              {sb.count}
                            </div>
                          </div>
                          <div className="mt-2 text-xs font-black text-slate-800 font-mono">
                            {sb.bucket}
                          </div>
                          <div className="text-[10px] text-slate-500 text-center leading-tight">
                            {sb.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Mini Bar Chart Pencapaian */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="text-xs font-bold text-slate-700 mb-2">
                      Ringkasan Kemajuan Kumpulan:
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {analyticsChartMetrics.map((m) => (
                        <div
                          key={m.label}
                          className="p-2 rounded-xl bg-purple-50/60 border border-purple-100 text-center"
                        >
                          <div className="text-base font-black font-mono text-indigo-900">
                            {m.value}
                          </div>
                          <div className="text-[10px] font-semibold text-slate-600 truncate">
                            {m.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Baris 3: Analisis Keaktifan Checklist — Siapa Yang Selalu Buat Checklist vs Siapa Yang Kurang Aktif */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Kiri: Siapa Yang Selalu Buat Checklist (Ahli Paling Konsisten) */}
                <div className="lg:col-span-6 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/70 border-2 border-emerald-200 rounded-2xl p-6 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-emerald-200/80 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Flame className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-emerald-950">
                          Siapa Yang Selalu Buat Checklist ({topConsistentMembers.length})
                        </h3>
                        <p className="text-xs text-emerald-800">
                          Ahli paling konsisten menanda Checklist & TDR mingguan
                        </p>
                      </div>
                    </div>
                  </div>

                  {topConsistentMembers.length === 0 ? (
                    <div className="p-5 text-center text-xs text-slate-500 bg-white/80 rounded-xl border border-emerald-100">
                      Tiada ahli yang mencapai tahap konsistensi tinggi minggu ini.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {topConsistentMembers.map((item, idx) => (
                        <div
                          key={item.member.id}
                          className="p-3.5 rounded-xl bg-white border border-emerald-200/90 flex items-center justify-between gap-3 shadow-2xs hover:border-emerald-400 transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-900 font-mono text-xs font-black flex items-center justify-center shrink-0">
                              #{idx + 1}
                            </div>
                            <ScholarCharacterAvatar
                              member={item.member}
                              size="sm"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-900 text-xs truncate">
                                  {item.member.name}
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-800 font-mono text-[10px] font-bold">
                                  {item.member.username}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-600">
                                {item.member.university} · Sem{' '}
                                <strong>{item.member.currentSemester}</strong> ·{' '}
                                {item.member.currentPhase}
                              </div>
                              <div className="w-36 sm:w-48 bg-emerald-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                                <div
                                  className="bg-emerald-600 h-full rounded-full"
                                  style={{ width: `${item.currentWeekPct}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 font-mono text-xs font-black">
                              {item.currentWeekPct}% Siap
                            </span>
                            <button
                              type="button"
                              onClick={() => openMemberDetail(item.member)}
                              className="text-[11px] font-bold text-indigo-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              Detail & Gambar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Kanan: Siapa Yang Kurang Aktif / Perlu Perhatian */}
                <div className="lg:col-span-6 bg-gradient-to-br from-amber-50/90 via-white to-rose-50/70 border-2 border-amber-200 rounded-2xl p-6 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-amber-200/80 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-amber-950">
                          Siapa Yang Kurang Aktif / Perlu Perhatian ({lessActiveMembers.length})
                        </h3>
                        <p className="text-xs text-amber-800">
                          Ahli yang belum lengkap checklist hari ini atau status tidak aktif
                        </p>
                      </div>
                    </div>
                  </div>

                  {lessActiveMembers.length === 0 ? (
                    <div className="p-5 text-center text-xs text-emerald-800 bg-white/80 rounded-xl border border-emerald-200 font-semibold">
                      Alhamdulillah! Semua ahli aktif dan lengkap menanda checklist.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {lessActiveMembers.map((item) => (
                        <div
                          key={item.member.id}
                          className="p-3.5 rounded-xl bg-white border border-amber-200/90 flex items-center justify-between gap-3 shadow-2xs hover:border-amber-400 transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <ScholarCharacterAvatar
                              member={item.member}
                              size="sm"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-900 text-xs truncate">
                                  {item.member.name}
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-mono text-[10px] font-bold">
                                  {item.member.username}
                                </span>
                                {!item.member.isActive && (
                                  <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-bold">
                                    Tidak Aktif
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-600">
                                {item.member.university} · Sem{' '}
                                <strong>{item.member.currentSemester}</strong> ·{' '}
                                Checklist Minggu Ini:{' '}
                                <strong className="text-amber-800">
                                  {item.currentWeekPct}%
                                </strong>
                              </div>
                              {item.missingToday.length > 0 && (
                                <div className="text-[11px] text-rose-700 font-medium mt-0.5 truncate">
                                  Belum Tick ({reminderDateInfo.selectedDayName}):{' '}
                                  {item.missingToday.join(', ')}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => openMemberDetail(item.member)}
                              className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white text-[11px] font-bold rounded-lg inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              Lihat Detail
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Baris 4: Kad Individu Ahli Berserta Gambar, Maklumat Ringkas & Butang Detail / Roadmap */}
              <div className="bg-white/95 border-2 border-purple-100 rounded-2xl p-6 space-y-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-100 pb-3">
                  <div>
                    <h2 className="text-base font-black text-slate-900">
                      Detail Setiap Ahli By Individu Berserta Gambar & Roadmap ({myMembers.length} Ahli)
                    </h2>
                    <p className="text-xs text-slate-500">
                      Klik pada mana-mana kad ahli untuk melihat gambar/watak,
                      maklumat peribadi lengkap, Master PhD Roadmap, link draf &
                      checklist
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('members')}
                    className="text-xs font-bold text-indigo-700 hover:underline cursor-pointer"
                  >
                    Buka Jadual Penuh & Tapis Ahli →
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {memberActivityRanking.map((item) => {
                    const mem = item.member;
                    const gender = inferMemberGender(mem);
                    return (
                      <div
                        key={mem.id}
                        className="border-2 border-purple-100 hover:border-indigo-300 bg-gradient-to-br from-white via-purple-50/20 to-indigo-50/30 rounded-2xl p-4 space-y-3 transition-all shadow-2xs flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <ScholarCharacterAvatar member={mem} size="md" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-900 font-mono text-[11px] font-black">
                                  {mem.username}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                    gender === 'Perempuan'
                                      ? 'bg-pink-100 text-pink-800'
                                      : 'bg-sky-100 text-sky-800'
                                  }`}
                                >
                                  {gender}
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 text-[10px] font-bold">
                                  {mem.package}
                                </span>
                              </div>
                              <h3 className="text-sm font-black text-slate-900 mt-1 leading-snug">
                                {mem.name}
                              </h3>
                              <div className="text-xs text-slate-600 font-medium">
                                {mem.university} · {mem.studyLevel || 'PhD'} (Sem{' '}
                                <strong>{mem.currentSemester}</strong>)
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-center bg-white/90 p-2.5 rounded-xl border border-purple-100 text-xs">
                            <div>
                              <div className="text-[10px] text-slate-500">
                                Progress
                              </div>
                              <div className="font-mono font-black text-indigo-700">
                                {mem.overallProgress}%
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] text-slate-500">
                                Draf Terkini
                              </div>
                              <div className="font-mono font-black text-slate-900">
                                {item.latestDraft
                                  ? `Draf ${item.latestDraft.draftNumber}`
                                  : 'Tiada'}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] text-slate-500">
                                Checklist
                              </div>
                              <div className="font-mono font-black text-emerald-700">
                                {item.currentWeekPct}%
                              </div>
                            </div>
                          </div>

                          <div className="text-xs text-slate-700 space-y-1">
                            <div className="truncate">
                              <span className="font-bold text-slate-800">
                                Fasa:
                              </span>{' '}
                              <span className="text-indigo-700 font-semibold">
                                {mem.currentPhase}
                              </span>
                            </div>
                            <div className="line-clamp-1">
                              <span className="font-bold text-slate-800">
                                Tesis:
                              </span>{' '}
                              {mem.researchTitle}
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-purple-100 flex items-center justify-between gap-2">
                          <span className="text-[11px] font-mono text-slate-500 truncate">
                            {mem.phone}
                          </span>
                          <button
                            type="button"
                            onClick={() => openMemberDetail(mem)}
                            className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Detail, Peribadi & Roadmap
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* TAB 2: JEJAK KEMAJUAN & SENARAI AHLI       */}
          {/* ========================================== */}
          {activeTab === 'members' && (
            <div className="bg-white/95 border-2 border-purple-100 rounded-2xl p-6 space-y-5 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-purple-100 pb-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    Senarai & Detail Setiap Ahli ({filteredMyMembers.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Lihat detail setiap ahli by individu berserta gambar,
                    maklumat peribadi, Master PhD Roadmap, link draf & status
                    peringatan automatik Checklist/TDR
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
                      placeholder="Cari nama / ID tetap / universiti..."
                      className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <select
                    value={phaseFilter}
                    onChange={(e) => setPhaseFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="ALL">Semua Fasa Kajian</option>
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
                      Mesej peringatan dihantar secara automatik oleh sistem
                      mengikut jadual (tak perlu tunggu CRMP)
                    </span>
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-bold text-slate-600">
                      <th className="py-2.5 px-3">Gambar & Ahli</th>
                      <th className="py-2.5 px-3">ID Tetap & Pakej</th>
                      <th className="py-2.5 px-3">Uni / Sem</th>
                      <th className="py-2.5 px-3">Fasa Semasa</th>
                      <th className="py-2.5 px-3">Draf / Pub</th>
                      <th className="py-2.5 px-3">
                        Checklist ({reminderDateInfo.selectedDayName})
                      </th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Detail Individu</th>
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
                      const chkStats =
                        computeChecklistCompletionForRecord(memChecklist);
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
                        <tr key={mem.id} className="hover:bg-purple-50/40">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2.5">
                              <ScholarCharacterAvatar member={mem} size="sm" />
                              <div>
                                <div className="font-bold text-slate-900">
                                  {mem.name}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  {inferMemberGender(mem)} · {mem.phone}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-mono font-bold text-indigo-700">
                              {mem.username}
                            </div>
                            <div className="text-[11px] text-slate-600 font-semibold">
                              {mem.package}
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-700">
                            {mem.university} · {mem.currentSemester}
                          </td>
                          <td className="py-3 px-3 text-slate-800 font-semibold">
                            {mem.currentPhase} ({mem.overallProgress}%)
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-700">
                            <div>
                              {topDraft
                                ? `Draf ${topDraft.draftNumber}`
                                : 'Tiada'}{' '}
                              · {mem.publications.length} Pub
                            </div>
                            {topDraft?.draftLink && (
                              <a
                                href={topDraft.draftLink}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] font-sans font-bold text-indigo-700 hover:underline inline-flex items-center gap-0.5"
                              >
                                Buka Link Draf
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-mono text-[11px] font-bold text-slate-800 mb-0.5">
                              Minggu Ini: {chkStats.percentage}%
                            </div>
                            {missingItems.length === 0 ? (
                              <span className="text-emerald-700 font-semibold">
                                ✓ Lengkap Hari Ini
                              </span>
                            ) : (
                              <div className="space-y-1">
                                <div className="text-[11px] text-amber-800 font-medium">
                                  Belum: {missingItems.join(', ')}
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-bold rounded-md">
                                    Auto-Hantar
                                  </span>
                                  <a
                                    href={waReminder.whatsappUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2 py-0.5 bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-semibold rounded-md inline-flex items-center gap-1"
                                  >
                                    <MessageCircle className="w-2.5 h-2.5" />
                                    Lihat Mesej
                                  </a>
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <button
                              type="button"
                              onClick={() => handleToggleMemberActive(mem)}
                              className={`text-xs font-bold cursor-pointer ${
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
                              className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold rounded-lg inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Detail & Roadmap
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
                className="bg-white/95 border-2 border-purple-100 rounded-2xl p-6 space-y-4 shadow-sm"
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

              <div className="bg-white/95 border-2 border-purple-100 rounded-2xl p-6 space-y-5 shadow-sm">
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
                          <th className="py-2 px-3">ID Tetap Ahli</th>
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
            <div className="bg-white/95 border-2 border-purple-100 rounded-2xl p-6 space-y-4 shadow-sm">
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

      {/* Modal Detail Individu Ahli Berserta Gambar, Maklumat Peribadi, Master PhD Roadmap & Draf */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border-2 border-purple-200 rounded-2xl max-w-5xl w-full p-6 space-y-6 max-h-[92vh] overflow-y-auto shadow-2xl">
            {/* Header Profil Individu Berserta Gambar / Watak Ahli */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-purple-50 via-pink-50/60 to-indigo-50 p-4 rounded-2xl border border-purple-200">
              <div className="flex items-center gap-4">
                <ScholarCharacterAvatar member={selectedMember} size="lg" />
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-md bg-indigo-700 text-white font-mono text-xs font-black">
                      ID Tetap: {selectedMember.username}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-pink-100 text-pink-900 text-xs font-bold border border-pink-200">
                      Pakej {selectedMember.package}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-900 text-xs font-bold border border-purple-200">
                      {inferMemberGender(selectedMember)}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-900 text-xs font-bold border border-emerald-200">
                      {selectedMember.studyLevel || 'PhD'} · Sem{' '}
                      {selectedMember.currentSemester}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mt-1">
                    {selectedMember.name}
                  </h3>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">
                    {selectedMember.university} · Fasa Semasa:{' '}
                    <strong className="text-indigo-700">
                      {selectedMember.currentPhase} (
                      {selectedMember.overallProgress}%)
                    </strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="p-2 text-slate-500 hover:text-slate-900 bg-white rounded-xl border border-slate-200 cursor-pointer self-end sm:self-start"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 1. Maklumat Peribadi & Akademik Lengkap Ahli */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <h4 className="text-sm font-black text-slate-900 border-b border-slate-200 pb-2">
                1. Maklumat Peribadi & Akademik Ahli
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <div className="text-slate-400 font-semibold flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-indigo-600" />
                    E-mel & Telefon
                  </div>
                  <div className="font-bold text-slate-900">
                    {selectedMember.email}
                  </div>
                  <div className="font-mono text-slate-700 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-emerald-600" />
                    {selectedMember.phone}
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <div className="text-slate-400 font-semibold flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                    Universiti & Bidang
                  </div>
                  <div className="font-bold text-slate-900">
                    {selectedMember.university}
                  </div>
                  <div className="text-slate-700">
                    Bidang: {selectedMember.researchField || 'Penyelidikan Siswazah'}
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <div className="text-slate-400 font-semibold flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                    Alamat / Tempat Tinggal
                  </div>
                  <div className="font-bold text-slate-900">
                    {selectedMember.residence || '-'}
                  </div>
                  <div className="text-slate-600">
                    Negeri: {selectedMember.state || 'Malaysia'}
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 sm:col-span-2 space-y-1">
                  <div className="text-slate-400 font-semibold">
                    Tajuk Kajian / Tesis
                  </div>
                  <div className="font-bold text-slate-900">
                    {selectedMember.researchTitle}
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <div className="text-slate-400 font-semibold">
                    Barisan Penyelia (Supervisor)
                  </div>
                  <div className="font-bold text-slate-900">
                    1. {selectedMember.supervisor || '-'}
                  </div>
                  {selectedMember.supervisor2 && (
                    <div className="text-slate-700">
                      2. {selectedMember.supervisor2}
                    </div>
                  )}
                  {selectedMember.supervisor3 && (
                    <div className="text-slate-700">
                      3. {selectedMember.supervisor3}
                    </div>
                  )}
                </div>
              </div>

              {/* Tarikh Penting Fasa Kajian */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs pt-1">
                <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                  <div className="text-slate-500 text-[11px]">Register PD</div>
                  <div className="font-mono font-bold text-slate-900 mt-0.5">
                    {selectedMember.dates.registerPD || '-'}
                  </div>
                </div>
                <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                  <div className="text-slate-500 text-[11px]">
                    Data Collection
                  </div>
                  <div className="font-mono font-bold text-slate-900 mt-0.5">
                    {selectedMember.dates.dataCollectionAnalysis || '-'}
                  </div>
                </div>
                <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                  <div className="text-slate-500 text-[11px]">Tarikh NoS</div>
                  <div className="font-mono font-bold text-slate-900 mt-0.5">
                    {selectedMember.dates.nos || '-'}
                  </div>
                </div>
                <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                  <div className="text-slate-500 text-[11px]">
                    Thesis Submission
                  </div>
                  <div className="font-mono font-bold text-slate-900 mt-0.5">
                    {selectedMember.dates.thesisSubmission || '-'}
                  </div>
                </div>
                <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                  <div className="text-slate-500 text-[11px]">Tarikh Viva</div>
                  <div className="font-mono font-bold text-slate-900 mt-0.5">
                    {selectedMember.dates.viva || '-'}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Master PhD Roadmap Ahli (Visual Winding Road + Watak Ahli) */}
            <div className="space-y-2">
              <h4 className="text-sm font-black text-slate-900">
                2. Master PhD Roadmap — Perjalanan Kajian {selectedMember.name}
              </h4>
              <MasterPhdRoadmap member={selectedMember} compact />
            </div>

            {/* 3. Peta Thesis Map */}
            <div className="space-y-2.5">
              <h4 className="text-sm font-black text-slate-900">
                3. Peta Thesis Map: {selectedMember.researchTitle} (
                {selectedMember.thesisMap.length} Bab)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                {selectedMember.thesisMap.map((ch) => (
                  <div
                    key={ch.id}
                    className="p-3 border border-slate-200 rounded-xl text-xs space-y-1.5 bg-slate-50/60"
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
                      <div className="pt-1 border-t border-slate-200 space-y-1">
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

            {/* 4. Rekod Naik Draf Tesis, Link Draf & Semakan CRMP */}
            <div className="space-y-3">
              <h4 className="text-sm font-black text-slate-900">
                4. Rekod Kenaikan Draf Tesis, Link Draf & Semakan CRMP
              </h4>
              {drafts.filter((d) => d.memberId === selectedMember.username)
                .length === 0 ? (
                <div className="p-4 text-xs text-slate-500 border border-slate-200 rounded-xl">
                  Ahli ini belum memuat naik sebarang rekod draf.
                </div>
              ) : (
                <div className="space-y-3">
                  {drafts
                    .filter((d) => d.memberId === selectedMember.username)
                    .map((drf) => (
                      <div
                        key={drf.id}
                        className="p-4 border border-slate-200 rounded-xl space-y-2.5 text-xs bg-white"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 font-mono">
                          <span className="font-bold text-indigo-700 text-sm">
                            Draf Ke-{drf.draftNumber} ({drf.pageCount} ms ·{' '}
                            {drf.wordCount.toLocaleString()} perkataan)
                          </span>
                          <div className="flex items-center gap-2">
                            {drf.draftLink && (
                              <a
                                href={drf.draftLink}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1 bg-indigo-700 hover:bg-indigo-800 text-white font-sans text-xs font-semibold rounded-lg inline-flex items-center gap-1"
                              >
                                Buka Link Draf Ke-{drf.draftNumber}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                            <span className="text-slate-500">{drf.date}</span>
                          </div>
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
                          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
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
                            className="px-3.5 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white font-semibold rounded-lg cursor-pointer"
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
                Ulasan & Bimbingan CRMP Untuk {selectedMember.name}
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
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
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
