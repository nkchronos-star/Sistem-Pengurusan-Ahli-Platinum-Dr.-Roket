import React, { useState } from 'react';
import {
  Users,
  Video,
  BookOpen,
  CreditCard,
  UserCog,
  Calendar,
  Mic,
  LogOut,
  Search,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Camera,
  Upload,
  Rocket,
  Power,
  Clock,
  KeyRound,
  UserPlus,
  Eye,
  BarChart3,
  Award,
  GraduationCap,
  CheckCircle2,
  Copy,
  ExternalLink,
  MapPin,
  Building2,
} from 'lucide-react';
import {
  AdminProfile,
  ClassRecording,
  CRMPDutySchedule,
  CRMPProfile,
  MemberPackage,
  MemberProfile,
  PhDPhase,
  RecordingCategory,
  ThesisTalkItem,
  VCSystemSettings,
} from '../types';
import { PHD_PHASES } from '../data/initialData';
import {
  computeAutoWeekFromDate,
  DEFAULT_MALAYSIA_UNIVERSITIES,
  generateNextMemberUsername,
  generateTemporaryPassword,
  getTodayDateStr,
  normalizeUniversityName,
} from '../utils/helpers';
import { AvatarUploadModal } from './AvatarUploadModal';
import { PasswordChangeModal } from './PasswordChangeModal';
import {
  MasterPhdRoadmap,
  ScholarCharacterAvatar,
} from './MasterPhdRoadmap';

interface AdminDashboardProps {
  admin: AdminProfile;
  members: MemberProfile[];
  crmps: CRMPProfile[];
  recordings: ClassRecording[];
  schedules: CRMPDutySchedule[];
  thesisTalks: ThesisTalkItem[];
  vcSettings: VCSystemSettings;
  onChangeMemberPackageAndUsername: (
    memberId: string,
    newPackage: MemberPackage,
    newUsername: string
  ) => void;
  onAssignMemberCrmp: (memberId: string, crmpUsername: string) => void;
  onSaveRecording: (recording: ClassRecording) => void;
  onDeleteRecording: (recordingId: string) => void;
  onSaveCrmp: (crmp: CRMPProfile, isNew: boolean) => void;
  onDeleteCrmp: (crmpId: string) => void;
  onSaveSchedule: (schedule: CRMPDutySchedule, isNew: boolean) => void;
  onDeleteSchedule: (scheduleId: string) => void;
  onUpdateThesisTalk: (talk: ThesisTalkItem) => void;
  onUpdateVcSettings: (updated: VCSystemSettings) => void;
  onUpdateAdmin: (updated: AdminProfile) => void;
  onUpdateMember: (updated: MemberProfile) => void;
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
  onLogout: () => void;
}

type AdminTab =
  | 'members'
  | 'analytics'
  | 'zoom_recordings'
  | 'basic_recordings'
  | 'paid_recordings'
  | 'crmp_management'
  | 'crmp_schedule'
  | 'thesis_talks';

const TODAY_DATE_STR = getTodayDateStr();

const MALAYSIAN_STATES = [
  'Selangor',
  'Perak',
  'Johor',
  'Pulau Pinang',
  'Kedah',
  'Kelantan',
  'Terengganu',
  'Pahang',
  'Negeri Sembilan',
  'Melaka',
  'Sabah',
  'Sarawak',
  'Perlis',
  'Wilayah Persekutuan Kuala Lumpur',
  'Wilayah Persekutuan Putrajaya',
  'Wilayah Persekutuan Labuan',
];

function inferMemberGender(m: MemberProfile): 'Lelaki' | 'Perempuan' {
  if (m.gender === 'Lelaki' || m.gender === 'Perempuan') return m.gender;
  const lower = (m.name || '').toLowerCase();
  if (
    lower.includes(' binti ') ||
    lower.includes(' bt ') ||
    lower.includes(' bt. ') ||
    lower.startsWith('siti ') ||
    lower.startsWith('nur ') ||
    lower.startsWith('nurul ') ||
    lower.startsWith('nik kamariah') ||
    lower.startsWith('farah ') ||
    lower.startsWith('nadia ') ||
    lower.startsWith('puteri ') ||
    lower.startsWith('aisyah ')
  ) {
    return 'Perempuan';
  }
  return 'Lelaki';
}

function inferMemberState(m: MemberProfile): string {
  if (m.state && m.state.trim() && m.state.trim() !== 'Malaysia') {
    return m.state.trim();
  }
  const res = (m.residence || '').toLowerCase();
  for (const st of MALAYSIAN_STATES) {
    if (res.includes(st.toLowerCase())) {
      return st;
    }
  }
  if (res.includes('kuala lumpur')) return 'Wilayah Persekutuan Kuala Lumpur';
  if (res.includes('putrajaya')) return 'Wilayah Persekutuan Putrajaya';
  return 'Lain-lain / Belum Kemaskini';
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  admin,
  members,
  crmps,
  recordings,
  schedules,
  thesisTalks,
  vcSettings,
  onChangeMemberPackageAndUsername,
  onAssignMemberCrmp,
  onSaveRecording,
  onDeleteRecording,
  onSaveCrmp,
  onDeleteCrmp,
  onSaveSchedule,
  onDeleteSchedule,
  onUpdateThesisTalk,
  onUpdateVcSettings,
  onUpdateAdmin,
  onUpdateMember,
  onRegisterMember,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('members');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [adminPasswordModalOpen, setAdminPasswordModalOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const hasValidAvatar =
    admin.avatar &&
    (admin.avatar.startsWith('data:') || admin.avatar.startsWith('http'));

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const handleSaveAdminAvatar = (avatarDataOrUrl: string) => {
    onUpdateAdmin({ ...admin, avatar: avatarDataOrUrl });
    showToast(
      avatarDataOrUrl
        ? 'Gambar profil SuperAdmin (300×300 / pautan) berjaya disimpan.'
        : 'Gambar profil SuperAdmin telah dipadam.'
    );
  };

  const handleSaveAdminPassword = (newPassword: string) => {
    onUpdateAdmin({ ...admin, password: newPassword });
    showToast('Kata laluan SuperAdmin telah berjaya dikemaskini.');
  };

  // --- 1. MEMBER MANAGEMENT STATE ---
  const [searchName, setSearchName] = useState('');
  const [filterCrmpGroup, setFilterCrmpGroup] = useState('ALL');
  const [filterPackage, setFilterPackage] = useState('ALL');

  const [pkgModalMember, setPkgModalMember] = useState<MemberProfile | null>(
    null
  );
  const [targetPackage, setTargetPackage] = useState<MemberPackage>('Premier');
  const [targetUsername, setTargetUsername] = useState('');

  // Admin Tukar Password Ahli Modal State
  const [pwdModalMember, setPwdModalMember] = useState<MemberProfile | null>(
    null
  );
  const [memberNewPassword, setMemberNewPassword] = useState('');

  // Admin Lihat Maklumat Lengkap Ahli Modal State
  const [viewingMemberId, setViewingMemberId] = useState<string | null>(null);
  const viewingMember =
    members.find((m) => m.id === viewingMemberId) || null;

  // Admin Tambah Ahli Baharu Modal State (Ringkas: Hanya Jana Username & Password Pertama Kali Login)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemPackage, setNewMemPackage] = useState<MemberPackage>('Premier');
  const [newMemName, setNewMemName] = useState('');
  const [newMemEmail, setNewMemEmail] = useState('');
  const [newMemPhone, setNewMemPhone] = useState('');
  const [newMemPassword, setNewMemPassword] = useState('drroket2026');
  const [newMemUni, setNewMemUni] = useState(
    'Universiti Pendidikan Sultan Idris (UPSI)'
  );
  const [newMemSemester, setNewMemSemester] = useState('S1');
  const [newMemResidence, setNewMemResidence] = useState('');
  const [newMemCrmpId, setNewMemCrmpId] = useState(
    crmps[0]?.username || 'CRMP001'
  );
  const [newMemTitle, setNewMemTitle] = useState('');
  const [newMemSupervisor, setNewMemSupervisor] = useState('');
  const [generatedCredentialSlip, setGeneratedCredentialSlip] = useState<{
    username: string;
    password: string;
    package: MemberPackage;
    crmpId: string;
    name: string;
  } | null>(null);

  const computeSuggestedUsername = (pkg: MemberPackage, customName?: string) => {
    return generateNextMemberUsername(
      pkg,
      members,
      customName !== undefined ? customName : newMemName
    );
  };

  const openChangePackageModal = (mem: MemberProfile) => {
    setPkgModalMember(mem);
    setTargetPackage(mem.package);
    setTargetUsername(mem.username);
  };

  const openMemberPasswordModal = (mem: MemberProfile) => {
    setPwdModalMember(mem);
    setMemberNewPassword(mem.password || 'drroket2026');
  };

  const handleSaveMemberPasswordByAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwdModalMember) return;
    const cleanPass = memberNewPassword.trim();
    if (cleanPass.length < 4) {
      showToast('Kata laluan ahli mestilah sekurang-kurangnya 4 aksara.');
      return;
    }
    onUpdateMember({
      ...pwdModalMember,
      password: cleanPass,
    });
    showToast(
      `Kata laluan untuk ${pwdModalMember.name} (${pwdModalMember.username}) berjaya ditukar kepada "${cleanPass}".`
    );
    setPwdModalMember(null);
  };

  const handleAddMemberByAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextCode = computeSuggestedUsername(newMemPackage);
    const cleanPass = newMemPassword.trim() || 'drroket2026';
    const placeholderName =
      newMemName.trim() || `Ahli Baharu Platinum (${nextCode})`;
    const placeholderEmail =
      newMemEmail.trim() || `${nextCode.toLowerCase()}@drroket.com`;

    const created = onRegisterMember({
      name: placeholderName,
      email: placeholderEmail,
      phone: newMemPhone.trim() || 'Belum Dikemaskini',
      university: normalizeUniversityName(newMemUni),
      currentSemester: newMemSemester,
      residence: newMemResidence.trim() || 'Belum Dikemaskini',
      package: newMemPackage,
      crmpId: newMemCrmpId,
      researchTitle:
        newMemTitle.trim() || 'Akan Dikemaskini Oleh Ahli Selepas Login',
      supervisor: newMemSupervisor.trim() || 'Akan Dikemaskini Oleh Ahli',
      password: cleanPass,
    });

    setGeneratedCredentialSlip({
      username: created.username,
      password: cleanPass,
      package: created.package,
      crmpId: created.crmpId,
      name: created.name,
    });

    setNewMemName('');
    setNewMemEmail('');
    setNewMemPhone('');
    setNewMemResidence('');
    setNewMemTitle('');
    setNewMemSupervisor('');
    showToast(
      `Username (${created.username}) & Password pertama kali login berjaya dijana!`
    );
  };

  const handleCopyCredentials = (username: string, password: string, pkg: string) => {
    const text = `Maklumat Login Pertama Kali Sistem Platinum Dr. Roket\nPakej: ${pkg}\nUsername (Kod Ahli): ${username}\nPassword Pertama Kali: ${password}\n*Sila log masuk dan kemaskini profil serta kata laluan anda.`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
    }
    showToast(`Username (${username}) & Password (${password}) telah disalin!`);
  };

  const handleSelectNewPackage = (pkg: MemberPackage) => {
    setTargetPackage(pkg);
    // ID Pengguna kekal tetap sama walaupun ahli bertukar pakej (cth: DR0001-KAMARIAH)
    if (pkgModalMember) {
      setTargetUsername(pkgModalMember.username);
    }
  };

  const handleConfirmPackageChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkgModalMember || !targetUsername.trim()) return;
    onChangeMemberPackageAndUsername(
      pkgModalMember.id,
      targetPackage,
      targetUsername.trim().toUpperCase()
    );
    showToast(
      `Pakej ${pkgModalMember.name} berjaya ditukar kepada ${targetPackage} (ID Pengguna Tetap kekal: ${targetUsername
        .trim()
        .toUpperCase()}).`
    );
    setPkgModalMember(null);
  };

  const filteredMembers = members.filter((m) => {
    const matchesName =
      m.name.toLowerCase().includes(searchName.toLowerCase()) ||
      m.username.toLowerCase().includes(searchName.toLowerCase()) ||
      m.university.toLowerCase().includes(searchName.toLowerCase());
    const matchesCrmp =
      filterCrmpGroup === 'ALL' || m.crmpId === filterCrmpGroup;
    const matchesPkg = filterPackage === 'ALL' || m.package === filterPackage;
    return matchesName && matchesCrmp && matchesPkg;
  });

  // Pecahan & Penapis Rakaman / Bahan Mengikut Tahun
  const [adminRecordingYear, setAdminRecordingYear] = useState<string>('ALL');

  const getRecordingYear = (dateStr?: string): string => {
    const match = (dateStr || '').trim().match(/^(\d{4})/);
    return match ? match[1] : '2026';
  };

  const availableRecordingYears: string[] = Array.from(
    new Set<string>(recordings.map((r) => getRecordingYear(r.date)))
  ).sort((a, b) => b.localeCompare(a));

  const groupRecordingsByYear = (
    category: 'zoom' | 'basic' | 'paid'
  ): { year: string; items: ClassRecording[] }[] => {
    const catList = recordings.filter(
      (r) =>
        r.category === category &&
        (adminRecordingYear === 'ALL' ||
          getRecordingYear(r.date) === adminRecordingYear)
    );
    const years: string[] = Array.from(
      new Set<string>(catList.map((r) => getRecordingYear(r.date)))
    ).sort((a, b) => b.localeCompare(a));
    return years.map((yr) => ({
      year: yr,
      items: catList
        .filter((r) => getRecordingYear(r.date) === yr)
        .sort((a, b) => b.date.localeCompare(a.date)),
    }));
  };

  // Stats for Top Overview
  const uniqueUniversities = new Set(members.map((m) => m.university)).size;
  const totalPublications = members.reduce(
    (sum, m) => sum + m.publications.length,
    0
  );
  const phaseColors = [
    '#0ea5e9',
    '#6366f1',
    '#10b981',
    '#f59e0b',
    '#ec4899',
    '#8b5cf6',
  ];
  const phaseDistribution = PHD_PHASES.map((phase, idx) => {
    const count = members.filter((m) => m.currentPhase === phase).length;
    return {
      phase,
      count,
      color: phaseColors[idx % phaseColors.length],
      pct: members.length > 0 ? Math.round((count / members.length) * 100) : 0,
    };
  });

  // --- ANALISIS KESELURUHAN AHLI METRICS ---
  const excellentThesisMembers = members.filter((m) => !!m.isExcellentThesis);
  const graduatedMembers = members.filter((m) => !!m.isGraduated);
  const vivaMembers = members.filter(
    (m) => m.currentPhase === 'Viva' || !!m.isGraduated
  );
  const nosMembers = members.filter(
    (m) =>
      m.currentPhase === 'Notice of Submission (Nos)' ||
      m.currentPhase === 'Thesis Submission'
  );
  const pdMembers = members.filter(
    (m) => m.currentPhase === 'Proposal Defence (PD)'
  );
  const dataCollectionMembers = members.filter(
    (m) => m.currentPhase === 'Data Collection & Analysis'
  );
  const maleMembers = members.filter((m) => inferMemberGender(m) === 'Lelaki');
  const femaleMembers = members.filter(
    (m) => inferMemberGender(m) === 'Perempuan'
  );
  const phdMembers = members.filter((m) => (m.studyLevel || 'PhD') === 'PhD');
  const masterMembers = members.filter((m) => m.studyLevel === 'Master');
  const activeMembersCount = members.filter((m) => m.isActive).length;
  const totalLearningPointsCount = members.reduce(
    (sum, m) => sum + (m.learningPoints?.length || 0),
    0
  );

  // Breakdown by University
  const universityAnalytics = Array.from(
    new Set(members.map((m) => normalizeUniversityName(m.university)))
  )
    .map((uni) => {
      const uniMembers = members.filter(
        (m) => normalizeUniversityName(m.university) === uni
      );
      return {
        university: uni,
        total: uniMembers.length,
        pct:
          members.length > 0
            ? Math.round((uniMembers.length / members.length) * 100)
            : 0,
        phdCount: uniMembers.filter((m) => (m.studyLevel || 'PhD') === 'PhD')
          .length,
        masterCount: uniMembers.filter((m) => m.studyLevel === 'Master').length,
        excellentCount: uniMembers.filter((m) => !!m.isExcellentThesis).length,
        graduateCount: uniMembers.filter((m) => !!m.isGraduated).length,
        vivaCount: uniMembers.filter(
          (m) => m.currentPhase === 'Viva' || !!m.isGraduated
        ).length,
        nosCount: uniMembers.filter(
          (m) =>
            m.currentPhase === 'Notice of Submission (Nos)' ||
            m.currentPhase === 'Thesis Submission'
        ).length,
        membersList: uniMembers,
      };
    })
    .sort((a, b) => b.total - a.total);

  // Breakdown by State (Negeri)
  const stateAnalytics = Array.from(
    new Set(members.map((m) => inferMemberState(m)))
  )
    .map((st) => {
      const stMembers = members.filter((m) => inferMemberState(m) === st);
      return {
        state: st,
        total: stMembers.length,
        pct:
          members.length > 0
            ? Math.round((stMembers.length / members.length) * 100)
            : 0,
        maleCount: stMembers.filter((m) => inferMemberGender(m) === 'Lelaki')
          .length,
        femaleCount: stMembers.filter(
          (m) => inferMemberGender(m) === 'Perempuan'
        ).length,
        membersList: stMembers,
      };
    })
    .sort((a, b) => b.total - a.total);

  // --- 2. RECORDING ACCESS & CRUD STATE (ZOOM / BASIC / PAID) ---
  const [accessModalRec, setAccessModalRec] = useState<ClassRecording | null>(
    null
  );
  const [editingRecording, setEditingRecording] =
    useState<ClassRecording | null>(null);
  const [newRecTitle, setNewRecTitle] = useState('');
  const [newRecFreq, setNewRecFreq] = useState<'Mingguan' | 'Bulanan'>(
    'Mingguan'
  );
  const [newRecDate, setNewRecDate] = useState(TODAY_DATE_STR);
  const [newRecDuration, setNewRecDuration] = useState('2 Jam 00 Minit');
  const [newRecInstructor] = useState('Dr. Roket');
  const [newRecUrl, setNewRecUrl] = useState('https://zoom.us/rec/share/...');
  const [newRecDesc, setNewRecDesc] = useState('');
  const [newRecPrice, setNewRecPrice] = useState('RM 290 (Berbayar)');

  const handleSaveEditedRecording = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecording || !editingRecording.title.trim()) return;
    onSaveRecording({
      ...editingRecording,
      title: editingRecording.title.trim(),
      videoUrl: editingRecording.videoUrl.trim(),
      date: editingRecording.date || TODAY_DATE_STR,
      duration: editingRecording.duration.trim() || '2 Jam 00 Minit',
      description:
        editingRecording.description.trim() ||
        'Rakaman pembelajaran eksklusif Ahli Platinum Dr. Roket.',
    });
    showToast(
      `Maklumat rakaman "${editingRecording.title}" (Tarikh / Link / Tajuk) telah berjaya dikemaskini!`
    );
    setEditingRecording(null);
  };

  const handleCreateRecording = (
    e: React.FormEvent,
    category: RecordingCategory
  ) => {
    e.preventDefault();
    if (!newRecTitle.trim()) return;
    const defaultPkgs: MemberPackage[] =
      category === 'zoom'
        ? newRecFreq === 'Mingguan'
          ? ['Premier']
          : ['Premier', 'Elite Plus', 'Elite']
        : category === 'basic'
        ? ['Premier', 'Elite Plus', 'Elite']
        : [];
    const defaultUsers =
      category === 'paid'
        ? []
        : members
            .filter((m) => defaultPkgs.includes(m.package))
            .map((m) => m.username);

    const created: ClassRecording = {
      id: `rec-${category}-${Date.now()}`,
      title: newRecTitle.trim(),
      category,
      zoomFrequency: category === 'zoom' ? newRecFreq : undefined,
      date: newRecDate,
      duration: newRecDuration,
      instructor: newRecInstructor,
      videoUrl: newRecUrl,
      description:
        newRecDesc.trim() ||
        'Rakaman pembelajaran eksklusif Ahli Platinum Dr. Roket.',
      allowedPackages: defaultPkgs,
      allowedMemberUsernames: defaultUsers,
      priceLabel: category === 'paid' ? newRecPrice : undefined,
    };
    onSaveRecording(created);
    setNewRecTitle('');
    setNewRecDesc('');
    showToast(`Rakaman baharu "${created.title}" telah ditambah.`);
  };

  const handleToggleMemberAccessForRecording = (
    rec: ClassRecording,
    username: string
  ) => {
    const exists = rec.allowedMemberUsernames.includes(username);
    const updatedUsers = exists
      ? rec.allowedMemberUsernames.filter((u) => u !== username)
      : [...rec.allowedMemberUsernames, username];
    const updatedRec = { ...rec, allowedMemberUsernames: updatedUsers };
    onSaveRecording(updatedRec);
    if (accessModalRec?.id === rec.id) {
      setAccessModalRec(updatedRec);
    }
  };

  const handleSelectAllMembersForRecording = (
    rec: ClassRecording,
    selectAll: boolean
  ) => {
    const updatedUsers = selectAll ? members.map((m) => m.username) : [];
    const updatedRec = { ...rec, allowedMemberUsernames: updatedUsers };
    onSaveRecording(updatedRec);
    if (accessModalRec?.id === rec.id) {
      setAccessModalRec(updatedRec);
    }
  };

  const handleChangeZoomFrequency = (
    rec: ClassRecording,
    freq: 'Mingguan' | 'Bulanan'
  ) => {
    const allowedPackages: MemberPackage[] =
      freq === 'Mingguan' ? ['Premier'] : ['Premier', 'Elite Plus', 'Elite'];
    const allowedMemberUsernames = members
      .filter((m) => allowedPackages.includes(m.package))
      .map((m) => m.username);
    const updated = {
      ...rec,
      zoomFrequency: freq,
      allowedPackages,
      allowedMemberUsernames,
    };
    onSaveRecording(updated);
    showToast(
      `Rakaman "${rec.title}" ditetapkan sebagai ${freq} (${allowedPackages.join(
        ', '
      )}).`
    );
  };

  // --- 3. CRMP MANAGEMENT (TAMBAH / DELETE / UPDATE CRMP) ---
  const [editingCrmp, setEditingCrmp] = useState<CRMPProfile | null>(null);
  const [crmpUsername, setCrmpUsername] = useState('');
  const [crmpName, setCrmpName] = useState('');
  const [crmpEmail, setCrmpEmail] = useState('');
  const [crmpPhone, setCrmpPhone] = useState('');
  const [crmpUni, setCrmpUni] = useState('');
  const [crmpSpec, setCrmpSpec] = useState('');
  const [crmpGroup, setCrmpGroup] = useState('');

  const getNextCrmpCode = () => {
    const maxNum = crmps.reduce((acc, c) => {
      const n = parseInt(c.username.replace('CRMP', ''), 10);
      return !isNaN(n) && n > acc ? n : acc;
    }, 0);
    return `CRMP${String(maxNum + 1).padStart(3, '0')}`;
  };

  const startNewCrmpForm = () => {
    setEditingCrmp(null);
    setCrmpUsername(getNextCrmpCode());
    setCrmpName('');
    setCrmpEmail('');
    setCrmpPhone('');
    setCrmpUni('');
    setCrmpSpec('');
    setCrmpGroup('');
  };

  const startEditCrmp = (c: CRMPProfile) => {
    setEditingCrmp(c);
    setCrmpUsername(c.username);
    setCrmpName(c.name);
    setCrmpEmail(c.email);
    setCrmpPhone(c.phone);
    setCrmpUni(c.university);
    setCrmpSpec(c.specialization);
    setCrmpGroup(c.groupName);
  };

  const handleSaveCrmpForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!crmpName.trim()) return;
    const code = (crmpUsername.trim() || getNextCrmpCode()).toUpperCase();
    const payload: CRMPProfile = {
      id: editingCrmp ? editingCrmp.id : `crmp-${Date.now()}`,
      username: code,
      name: crmpName.trim(),
      email: crmpEmail.trim() || `${code.toLowerCase()}@drroket.com`,
      phone: crmpPhone.trim() || '012-0000000',
      university: crmpUni.trim() || 'Universiti Awam',
      specialization: crmpSpec.trim() || 'Penyelidikan Siswazah',
      groupName: crmpGroup.trim() || `Kumpulan ${code}`,
      avatar: editingCrmp
        ? editingCrmp.avatar
        : crmpName
            .trim()
            .split(' ')
            .slice(0, 2)
            .map((w) => w[0])
            .join(''),
    };
    onSaveCrmp(payload, !editingCrmp);
    showToast(
      editingCrmp
        ? `Maklumat ${payload.username} berjaya dikemaskini.`
        : `CRMP baharu (${payload.username}) berjaya ditambah.`
    );
    startNewCrmpForm();
  };

  // --- 4. JADUAL BERTUGAS VC CRMP & KAWALAN HARI TIADA VC (VOTE OFF) ---
  const [schDate, setSchDate] = useState('2026-11-24');
  const [schTime, setSchTime] = useState('6:01 Petang (Vote: 6:20 Petang)');
  const [schTitle, setSchTitle] = useState(
    'VC Petang: Semakan Momentum Draf & TDR'
  );
  const [schCrmpId, setSchCrmpId] = useState(crmps[0]?.username || 'CRMP001');
  const [schBackupId, setSchBackupId] = useState(
    crmps[1]?.username || 'CRMP002'
  );
  const [schLink] = useState('https://zoom.us/j/91122334455');
  const [offDateInput, setOffDateInput] = useState('2026-11-20');

  const schDateInfo = computeAutoWeekFromDate(schDate);
  const isTodayOff = vcSettings.offDates.includes(TODAY_DATE_STR);

  const handleToggleTodayVcOff = () => {
    const nextOffDates = isTodayOff
      ? vcSettings.offDates.filter((d) => d !== TODAY_DATE_STR)
      : [...vcSettings.offDates, TODAY_DATE_STR];
    onUpdateVcSettings({
      ...vcSettings,
      offDates: nextOffDates,
    });
    showToast(
      isTodayOff
        ? `VC Hari Ini (${TODAY_DATE_STR}) diaktifkan semula (Vote ON pada 6:20 Petang).`
        : `Hari Ini (${TODAY_DATE_STR}) ditetapkan sebagai Tiada VC (Vote OFF).`
    );
  };

  const handleAddOffDate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!offDateInput) return;
    if (vcSettings.offDates.includes(offDateInput)) {
      showToast(`Tarikh ${offDateInput} sudah ada dalam senarai Tiada VC.`);
      return;
    }
    onUpdateVcSettings({
      ...vcSettings,
      offDates: [...vcSettings.offDates, offDateInput].sort(),
    });
    showToast(
      `Tarikh ${offDateInput} ditetapkan sebagai Hari Tiada VC (Vote OFF).`
    );
  };

  const handleRemoveOffDate = (dateToRemove: string) => {
    onUpdateVcSettings({
      ...vcSettings,
      offDates: vcSettings.offDates.filter((d) => d !== dateToRemove),
    });
    showToast(`Tarikh ${dateToRemove} dikeluarkan daripada senarai Tiada VC.`);
  };

  const handleToggleForceOpenVote = () => {
    const next = !vcSettings.forceOpenVoteWindow;
    onUpdateVcSettings({
      ...vcSettings,
      forceOpenVoteWindow: next,
    });
    showToast(
      next
        ? 'Simulasi Tetingkap Vote 6:20 Petang: DIBUKA (Ahli boleh vote sekarang).'
        : 'Tetingkap Vote mengikut masa sebenar (>= 6:20 Petang).'
    );
  };

  const handleAddScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lead = crmps.find((c) => c.username === schCrmpId);
    const created: CRMPDutySchedule = {
      id: `sch-${Date.now()}`,
      date: schDate,
      dayName: schDateInfo.selectedDayName,
      timeSlot: schTime,
      sessionTitle: schTitle,
      crmpId: schCrmpId,
      crmpName: lead?.name || schCrmpId,
      backupCrmpId: schBackupId,
      vcLink: schLink,
    };
    onSaveSchedule(created, true);
    showToast(
      `Jadual bertugas VC CRMP pada ${schDate} (${schDateInfo.selectedDayName}) telah ditambah.`
    );
  };

  const navItems: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'members',
      label: 'Papan Pemuka & Ahli',
      icon: <Users className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'analytics',
      label: 'Analisis Keseluruhan Ahli',
      icon: <BarChart3 className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'zoom_recordings',
      label: 'Rakaman Zoom',
      icon: <Video className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'basic_recordings',
      label: 'Kelas Basic',
      icon: <BookOpen className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'paid_recordings',
      label: 'Kelas Berbayar',
      icon: <CreditCard className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'crmp_management',
      label: 'Pengurusan CRMP',
      icon: <UserCog className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'crmp_schedule',
      label: 'Jadual & Kawalan VC',
      icon: <Calendar className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'thesis_talks',
      label: 'Thesis Talk',
      icon: <Mic className="w-4 h-4 shrink-0" />,
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
                  <div className="text-[11px] text-amber-300 truncate font-semibold">
                    SuperAdmin Sistem
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
                onClick={() => {
                  setActiveTab(item.id);
                  if (item.id === 'crmp_management' && !crmpUsername) {
                    setCrmpUsername(getNextCrmpCode());
                  }
                }}
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
                  src={admin.avatar}
                  alt={admin.name}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full object-cover border-2 border-amber-400"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center">
                  SA
                </div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-4 h-4 text-white" />
              </div>
            </button>

            {sidebarOpen && (
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-white truncate">
                  {admin.name}
                </div>
                <div className="text-xs text-purple-200 truncate font-mono">
                  SuperAdmin · {admin.username}
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
                  onClick={() => setAdminPasswordModalOpen(true)}
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
                onClick={() => setAdminPasswordModalOpen(true)}
                title="Tukar Kata Laluan Admin"
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
              Dashboard Pengurusan Ahli Platinum
            </h1>
            <p className="text-xs text-purple-100 font-medium">
              Panel Kawalan Utama (SuperAdmin) · Sistem Pengurusan Ahli Platinum Dr. Roket
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('crmp_schedule')}
              className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-xs font-bold rounded-xl cursor-pointer shadow-sm"
            >
              Kawalan VC ({isTodayOff ? 'Hari Ini OFF' : '6:01 Petang'})
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
          {/* TAB 1: PAPAN PEMUKA & SEMUA AHLI PLATINUM  */}
          {/* ========================================== */}
          {activeTab === 'members' && (
            <div className="space-y-6">
              {/* Top 4 KPI Cards (Mengikut Gambar Rujukan 2 + Senarai L: ?, P: ? dalam Jumlah Ahli) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-sky-50 via-white to-indigo-50 border-2 border-sky-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-sky-900 font-extrabold uppercase tracking-wide">
                      Jumlah Ahli
                    </div>
                    <Users className="w-5 h-5 text-sky-600" />
                  </div>
                  <div className="text-3xl font-black font-mono text-sky-700 mt-1 tabular-nums">
                    {members.length}
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs font-black font-mono">
                    <span className="px-2.5 py-0.5 rounded-lg bg-sky-100 text-sky-900 border border-sky-300">
                      L: {maleMembers.length}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-pink-100 text-pink-900 border border-pink-300">
                      P: {femaleMembers.length}
                    </span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-amber-50 via-white to-orange-50 border-2 border-amber-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-amber-900 font-extrabold uppercase tracking-wide">
                      Jumlah CRMP
                    </div>
                    <GraduationCap className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="text-3xl font-black font-mono text-amber-600 mt-1 tabular-nums">
                    {crmps.length}
                  </div>
                  <div className="text-xs text-amber-800 font-semibold mt-2">
                    Kumpulan Penyelaras CRMP
                  </div>
                </div>

                <div className="bg-gradient-to-br from-teal-50 via-white to-emerald-50 border-2 border-teal-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-teal-900 font-extrabold uppercase tracking-wide">
                      Universiti
                    </div>
                    <Building2 className="w-5 h-5 text-teal-600" />
                  </div>
                  <div className="text-3xl font-black font-mono text-teal-700 mt-1 tabular-nums">
                    {uniqueUniversities}
                  </div>
                  <div className="text-xs text-teal-800 font-semibold mt-2">
                    PhD: {phdMembers.length} · Master: {masterMembers.length}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-pink-50 via-white to-rose-50 border-2 border-pink-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-pink-900 font-extrabold uppercase tracking-wide">
                      Semester
                    </div>
                    <Calendar className="w-5 h-5 text-pink-600" />
                  </div>
                  <div className="text-3xl font-black font-mono text-pink-600 mt-1 tabular-nums">
                    S1 – S8
                  </div>
                  <div className="text-xs text-pink-800 font-semibold mt-2">
                    {totalPublications} Penerbitan · {excellentThesisMembers.length} Tesis Cemerlang
                  </div>
                </div>
              </div>

              {/* Ringkasan Pantas Pencapaian & Pautan Ke Analisis Keseluruhan Ahli */}
              <div className="bg-white/95 border-2 border-purple-100 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm">
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 flex-1">
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                    <div className="text-[11px] font-bold text-amber-800">
                      Tesis Cemerlang
                    </div>
                    <div className="text-xl font-black font-mono text-amber-950 mt-0.5">
                      {excellentThesisMembers.length}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                    <div className="text-[11px] font-bold text-emerald-800">
                      Jumlah Graduate
                    </div>
                    <div className="text-xl font-black font-mono text-emerald-950 mt-0.5">
                      {graduatedMembers.length}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-50 border border-purple-200">
                    <div className="text-[11px] font-bold text-purple-800">
                      Jumlah Viva
                    </div>
                    <div className="text-xl font-black font-mono text-purple-950 mt-0.5">
                      {vivaMembers.length}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-sky-50 border border-sky-200">
                    <div className="text-[11px] font-bold text-sky-800">
                      Jumlah NOS
                    </div>
                    <div className="text-xl font-black font-mono text-sky-950 mt-0.5">
                      {nosMembers.length}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200">
                    <div className="text-[11px] font-bold text-indigo-800">
                      Ahli Lelaki (L)
                    </div>
                    <div className="text-xl font-black font-mono text-indigo-950 mt-0.5">
                      {maleMembers.length}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-pink-50 border border-pink-200">
                    <div className="text-[11px] font-bold text-pink-800">
                      Ahli Perempuan (P)
                    </div>
                    <div className="text-xl font-black font-mono text-pink-950 mt-0.5">
                      {femaleMembers.length}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('analytics')}
                  className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold rounded-xl inline-flex items-center justify-center gap-2 cursor-pointer shrink-0 shadow-sm"
                >
                  <BarChart3 className="w-4 h-4" />
                  Buka Carta Analisis Keseluruhan
                </button>
              </div>

              {/* Status Fasa Kajian (Donut) & Kemajuan Keseluruhan (Bar Berwarna + Anak Panah Trend) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-6 bg-white/95 border-2 border-purple-100 rounded-2xl p-6 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-black text-slate-900">
                      Status Fasa Kajian
                    </h2>
                    <span className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-900 font-mono text-xs font-bold border border-sky-200">
                      Jumlah: {members.length} (L: {maleMembers.length}, P: {femaleMembers.length})
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
                          {members.length}
                        </span>
                        <span className="text-xs font-bold text-slate-500">
                          Ahli
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 space-y-2 text-xs w-full">
                      {phaseDistribution.map((pd) => (
                        <div
                          key={pd.phase}
                          className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-purple-50/50"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: pd.color }}
                            />
                            <span className="text-slate-700 font-semibold">
                              {pd.phase}
                            </span>
                          </div>
                          <span className="font-mono font-black text-slate-900">
                            {pd.count} ({pd.pct}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-6 bg-white/95 border-2 border-purple-100 rounded-2xl p-6 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-black text-slate-900">
                        Kemajuan Keseluruhan Ahli
                      </h2>
                      <p className="text-xs text-slate-500">
                        Peratus kemajuan pengajian mengikut ahli (disusun menaik)
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                      Momentum Menaik ↗
                    </span>
                  </div>
                  <div className="relative h-44 flex items-end justify-around gap-2.5 pt-6 px-2 border-b-2 border-slate-200">
                    {/* Trend Arrow SVG in background */}
                    <svg
                      viewBox="0 0 300 100"
                      className="absolute inset-0 w-full h-full pointer-events-none opacity-80"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M 20 82 Q 150 55 275 14"
                        fill="none"
                        stroke="#16a34a"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />
                      <polygon
                        points="282,10 267,11 275,23"
                        fill="#16a34a"
                      />
                    </svg>
                    {[...members]
                      .sort((a, b) => a.overallProgress - b.overallProgress)
                      .slice(0, 8)
                      .map((m, idx) => {
                        const barColors = [
                          'bg-pink-500',
                          'bg-orange-500',
                          'bg-amber-400',
                          'bg-emerald-500',
                          'bg-teal-500',
                          'bg-sky-500',
                          'bg-blue-600',
                          'bg-indigo-700',
                        ];
                        return (
                          <div
                            key={m.id}
                            className="relative z-10 flex-1 flex flex-col items-center gap-1 h-full justify-end"
                          >
                            <span className="font-mono text-[10px] font-black text-slate-800">
                              {m.overallProgress}%
                            </span>
                            <div
                              className={`w-full max-w-[34px] rounded-t-lg shadow-xs ${
                                barColors[idx % barColors.length]
                              }`}
                              style={{
                                height: `${Math.max(15, m.overallProgress)}%`,
                              }}
                            />
                          </div>
                        );
                      })}
                  </div>
                  <div className="flex items-center justify-around text-[10px] font-mono font-bold text-slate-600">
                    {[...members]
                      .sort((a, b) => a.overallProgress - b.overallProgress)
                      .slice(0, 8)
                      .map((m) => (
                        <span key={m.id} className="truncate max-w-[68px]" title={m.username}>
                          {m.username.split('-')[0]}
                        </span>
                      ))}
                  </div>
                </div>
              </div>

              {/* Jadual Semua Ahli Platinum */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Senarai Semua Ahli Platinum ({filteredMembers.length})
                    </h2>
                    <p className="text-xs text-slate-500">
                      Cari nama ahli, tapis mengikut kumpulan CRMP, tentukan
                      CRMP, dan tukar kod/username sekiranya bertukar pakej
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchName}
                        onChange={(e) => setSearchName(e.target.value)}
                        placeholder="Search nama ahli / kod..."
                        className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>

                    <select
                      value={filterCrmpGroup}
                      onChange={(e) => setFilterCrmpGroup(e.target.value)}
                      className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="ALL">Semua Kumpulan CRMP</option>
                      {crmps.map((c) => (
                        <option key={c.username} value={c.username}>
                          {c.username} — {c.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={filterPackage}
                      onChange={(e) => setFilterPackage(e.target.value)}
                      className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="ALL">Semua Pakej</option>
                      <option value="Premier">Premier (APP)</option>
                      <option value="Elite Plus">Elite Plus (APEP)</option>
                      <option value="Elite">Elite (APE)</option>
                      <option value="Holding Room">Holding Room (APHR)</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => {
                        setGeneratedCredentialSlip(null);
                        setShowAddMemberModal(true);
                      }}
                      className="px-3.5 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      + Tambah Ahli (Jana Username & Password)
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600">
                        <th className="py-2.5 px-3">Kod / Username</th>
                        <th className="py-2.5 px-3">Nama Ahli</th>
                        <th className="py-2.5 px-3">Pakej</th>
                        <th className="py-2.5 px-3">Uni / Negeri</th>
                        <th className="py-2.5 px-3">Fasa & Pencapaian</th>
                        <th className="py-2.5 px-3">Tentukan CRMP</th>
                        <th className="py-2.5 px-3 text-right">
                          Tindakan Admin
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredMembers.map((mem) => (
                        <tr key={mem.id} className="hover:bg-slate-50">
                          <td className="py-3 px-3 font-mono font-bold text-indigo-700">
                            {mem.username}
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-900">
                            <button
                              type="button"
                              onClick={() => setViewingMemberId(mem.id)}
                              className="text-left hover:text-indigo-700 hover:underline cursor-pointer font-bold"
                            >
                              {mem.name}
                            </button>
                            <div className="text-[11px] text-slate-500 font-normal">
                              {inferMemberGender(mem)} · {mem.email} · {mem.phone}
                            </div>
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-800">
                            <span
                              className={
                                mem.package === 'Holding Room'
                                  ? 'text-red-700 font-bold'
                                  : ''
                              }
                            >
                              {mem.package}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-600">
                            <div>
                              {mem.university} · {mem.studyLevel || 'PhD'} (
                              {mem.currentSemester})
                            </div>
                            <div className="text-[11px] text-slate-500 font-sans">
                              Negeri: {inferMemberState(mem)}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-slate-700 space-y-1">
                            <div>
                              {mem.currentPhase} ({mem.overallProgress}%)
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {mem.isExcellentThesis && (
                                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold">
                                  Tesis Cemerlang
                                </span>
                              )}
                              {mem.isGraduated && (
                                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-bold">
                                  Graduate
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <select
                              value={mem.crmpId}
                              onChange={(e) => {
                                onAssignMemberCrmp(mem.id, e.target.value);
                                showToast(
                                  `CRMP untuk ${mem.name} ditetapkan kepada ${e.target.value}.`
                                );
                              }}
                              className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium"
                            >
                              {crmps.map((c) => (
                                <option key={c.username} value={c.username}>
                                  {c.username} - {c.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setViewingMemberId(mem.id)}
                                title="Lihat Maklumat Lengkap Ahli"
                                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-semibold rounded-lg inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                Lihat Maklumat
                              </button>
                              <button
                                type="button"
                                onClick={() => openChangePackageModal(mem)}
                                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                              >
                                <RefreshCw className="w-3 h-3" />
                                Tukar Pakej / Kod
                              </button>
                              <button
                                type="button"
                                onClick={() => openMemberPasswordModal(mem)}
                                title="Tukar Kata Laluan Ahli"
                                className="px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 text-xs font-semibold rounded-lg inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                              >
                                <KeyRound className="w-3 h-3" />
                                Password
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* TAB 1B: ANALISIS KESELURUHAN AHLI          */}
          {/* ========================================== */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Analisis Keseluruhan Berkaitan Ahli Platinum (
                      {members.length} Ahli)
                    </h2>
                    <p className="text-xs text-slate-500">
                      Statistik lengkap mengikut universiti, bilangan ahli
                      dapat tesis cemerlang, jumlah graduate, viva, NOS,
                      jantina (lelaki & perempuan), negeri, pakej, dan peringkat
                      pengajian.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setGeneratedCredentialSlip(null);
                      setShowAddMemberModal(true);
                    }}
                    className="px-3.5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <UserPlus className="w-3.5 h-3.5" />+ Tambah Ahli Baharu
                  </button>
                </div>

                {/* 10 Kad KPI Utama Analisis Keseluruhan (Termasuk Jumlah Ahli L: ?, P: ?) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                  <div className="p-4 rounded-xl border-2 border-sky-300 bg-gradient-to-br from-sky-50 to-indigo-50/70">
                    <div className="flex items-center justify-between text-xs font-bold text-sky-900">
                      <span>Jumlah Ahli</span>
                      <Users className="w-4 h-4 text-sky-700" />
                    </div>
                    <div className="text-2xl font-black font-mono text-sky-950 mt-1">
                      {members.length}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] font-black font-mono">
                      <span className="px-2 py-0.5 rounded bg-sky-200/80 text-sky-950">
                        L: {maleMembers.length}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-pink-200/80 text-pink-950">
                        P: {femaleMembers.length}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border-2 border-amber-300 bg-amber-50/70">
                    <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                      <span>Tesis Cemerlang</span>
                      <Award className="w-4 h-4 text-amber-700" />
                    </div>
                    <div className="text-2xl font-black font-mono text-amber-950 mt-1">
                      {excellentThesisMembers.length}
                    </div>
                    <div className="text-[11px] text-amber-800 mt-0.5 font-medium">
                      Ahli dapat Tesis Cemerlang
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border-2 border-emerald-300 bg-emerald-50/70">
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                      <span>Jumlah Graduate</span>
                      <GraduationCap className="w-4 h-4 text-emerald-700" />
                    </div>
                    <div className="text-2xl font-black font-mono text-emerald-950 mt-1">
                      {graduatedMembers.length}
                    </div>
                    <div className="text-[11px] text-emerald-800 mt-0.5 font-medium">
                      Telah tamat / Konvokesyen
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border-2 border-purple-300 bg-purple-50/70">
                    <div className="flex items-center justify-between text-xs font-bold text-purple-900">
                      <span>Jumlah Ahli Viva</span>
                      <CheckCircle2 className="w-4 h-4 text-purple-700" />
                    </div>
                    <div className="text-2xl font-black font-mono text-purple-950 mt-1">
                      {vivaMembers.length}
                    </div>
                    <div className="text-[11px] text-purple-800 mt-0.5 font-medium">
                      Fasa Viva / Lulus Viva
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border-2 border-orange-300 bg-orange-50/70">
                    <div className="flex items-center justify-between text-xs font-bold text-orange-900">
                      <span>Jumlah Ahli NOS</span>
                      <Clock className="w-4 h-4 text-orange-700" />
                    </div>
                    <div className="text-2xl font-black font-mono text-orange-950 mt-1">
                      {nosMembers.length}
                    </div>
                    <div className="text-[11px] text-orange-800 mt-0.5 font-medium">
                      Notice of Submission & Hantar Tesis
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/70">
                    <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                      <span>PD & Data Collection</span>
                      <BookOpen className="w-4 h-4 text-indigo-700" />
                    </div>
                    <div className="text-2xl font-black font-mono text-indigo-950 mt-1">
                      {pdMembers.length + dataCollectionMembers.length}
                    </div>
                    <div className="text-[11px] text-indigo-800 mt-0.5">
                      PD: {pdMembers.length} · Data: {dataCollectionMembers.length}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-pink-200 bg-pink-50/60">
                    <div className="text-xs font-bold text-pink-900">
                      Pecahan Jantina (L & P)
                    </div>
                    <div className="text-xl font-black font-mono text-pink-950 mt-1">
                      L: {maleMembers.length} · P: {femaleMembers.length}
                    </div>
                    <div className="text-[11px] text-pink-800 mt-0.5">
                      Lelaki:{' '}
                      {members.length > 0
                        ? Math.round((maleMembers.length / members.length) * 100)
                        : 0}
                      % · Perempuan:{' '}
                      {members.length > 0
                        ? Math.round(
                            (femaleMembers.length / members.length) * 100
                          )
                        : 0}
                      %
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                    <div className="text-xs font-bold text-slate-700">
                      Peringkat Pengajian
                    </div>
                    <div className="text-xl font-black font-mono text-slate-900 mt-1">
                      PhD: {phdMembers.length} · Master: {masterMembers.length}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Aktif: {activeMembersCount} · Tidak Aktif:{' '}
                      {members.length - activeMembersCount}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                    <div className="text-xs font-bold text-slate-700">
                      Universiti & Negeri
                    </div>
                    <div className="text-xl font-black font-mono text-slate-900 mt-1">
                      {universityAnalytics.length} Uni · {stateAnalytics.length}{' '}
                      Negeri
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Taburan seluruh Malaysia
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                    <div className="text-xs font-bold text-slate-700">
                      Penerbitan & Learning Point
                    </div>
                    <div className="text-xl font-black font-mono text-slate-900 mt-1">
                      {totalPublications} Pub · {totalLearningPointsCount} LP
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Jurnal, Prosiding & Nota Kelas
                    </div>
                  </div>
                </div>

                {/* Carta Visual Menarik & Senang Dibaca: Donut Fasa Kajian + Bar Chart Pencapaian & Semester */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
                  {/* Donut Chart Visual Status Fasa Kajian */}
                  <div className="lg:col-span-5 p-5 rounded-2xl bg-gradient-to-br from-purple-50/70 via-white to-indigo-50/50 border border-purple-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-black text-slate-900">
                        Carta Visual Taburan Fasa Kajian
                      </h3>
                      <span className="font-mono text-xs font-bold text-indigo-700">
                        L: {maleMembers.length} | P: {femaleMembers.length}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-5">
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
                          <span className="text-2xl font-black font-mono text-slate-900">
                            {members.length}
                          </span>
                          <span className="text-[11px] font-bold text-slate-500">
                            Ahli
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 space-y-1.5 text-xs w-full">
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
                              <span className="text-slate-700 font-semibold">
                                {pd.phase}
                              </span>
                            </div>
                            <span className="font-mono font-black text-slate-900">
                              {pd.count} ({pd.pct}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Carta Bar Visual Pencapaian & Demografi */}
                  <div className="lg:col-span-7 p-5 rounded-2xl bg-gradient-to-br from-indigo-50/60 via-white to-pink-50/50 border border-indigo-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-black text-slate-900">
                        Carta Bar Analisis Pencapaian, Jantina & Semester
                      </h3>
                      <span className="text-xs font-semibold text-slate-500">
                        Perbandingan Visual Mudah Dibaca
                      </span>
                    </div>
                    <div className="h-40 flex items-end justify-around gap-3 pt-4 px-2 border-b border-slate-200">
                      {[
                        {
                          label: 'Lelaki (L)',
                          val: maleMembers.length,
                          color: 'bg-sky-500',
                        },
                        {
                          label: 'Perempuan (P)',
                          val: femaleMembers.length,
                          color: 'bg-pink-500',
                        },
                        {
                          label: 'Telah PD',
                          val: pdMembers.length + dataCollectionMembers.length,
                          color: 'bg-indigo-600',
                        },
                        {
                          label: 'Fasa NOS',
                          val: nosMembers.length,
                          color: 'bg-orange-500',
                        },
                        {
                          label: 'Viva Voce',
                          val: vivaMembers.length,
                          color: 'bg-purple-600',
                        },
                        {
                          label: 'Graduate',
                          val: graduatedMembers.length,
                          color: 'bg-emerald-600',
                        },
                        {
                          label: 'Cemerlang',
                          val: excellentThesisMembers.length,
                          color: 'bg-amber-500',
                        },
                      ].map((bar) => {
                        const maxVal = Math.max(members.length, 5);
                        const hPct = Math.max(
                          14,
                          Math.round((bar.val / maxVal) * 100)
                        );
                        return (
                          <div
                            key={bar.label}
                            className="flex-1 flex flex-col items-center gap-1 h-full justify-end"
                          >
                            <span className="font-mono text-xs font-black text-slate-900">
                              {bar.val}
                            </span>
                            <div
                              className={`w-full max-w-[38px] rounded-t-lg ${bar.color} shadow-xs`}
                              style={{ height: `${hPct}%` }}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-around text-[11px] font-bold text-slate-700 text-center">
                      {[
                        'Lelaki (L)',
                        'Perempuan (P)',
                        'PD & Data',
                        'Fasa NOS',
                        'Viva Voce',
                        'Graduate',
                        'Cemerlang',
                      ].map((lbl) => (
                        <span key={lbl} className="flex-1 truncate">
                          {lbl}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 1. ANALISIS MENGIKUT UNIVERSITI & 2. ANALISIS MENGIKUT NEGERI */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Mengikut Universiti */}
                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-indigo-700" />
                      <h3 className="text-base font-bold text-slate-900">
                        1. Analisis Ahli Mengikut Universiti (
                        {universityAnalytics.length} Universiti)
                      </h3>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-600 font-semibold">
                          <th className="py-2.5 px-2.5">Universiti</th>
                          <th className="py-2.5 px-2 text-center">Jumlah</th>
                          <th className="py-2.5 px-2 text-center">
                            PhD / Master
                          </th>
                          <th className="py-2.5 px-2 text-center">
                            Tesis Cemerlang
                          </th>
                          <th className="py-2.5 px-2 text-center">Graduate</th>
                          <th className="py-2.5 px-2 text-center">
                            Viva / NOS
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {universityAnalytics.map((ua) => (
                          <tr key={ua.university} className="hover:bg-slate-50">
                            <td className="py-3 px-2.5">
                              <div className="font-bold text-slate-900">
                                {ua.university}
                              </div>
                              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                                <div
                                  className="bg-indigo-600 h-full rounded-full"
                                  style={{ width: `${Math.max(8, ua.pct)}%` }}
                                />
                              </div>
                            </td>
                            <td className="py-3 px-2 text-center font-mono font-bold text-indigo-700">
                              {ua.total} ({ua.pct}%)
                            </td>
                            <td className="py-3 px-2 text-center font-mono text-slate-700">
                              {ua.phdCount} PhD · {ua.masterCount} M
                            </td>
                            <td className="py-3 px-2 text-center font-mono font-bold text-amber-700">
                              {ua.excellentCount}
                            </td>
                            <td className="py-3 px-2 text-center font-mono font-bold text-emerald-700">
                              {ua.graduateCount}
                            </td>
                            <td className="py-3 px-2 text-center font-mono text-purple-700">
                              {ua.vivaCount} Viva · {ua.nosCount} NOS
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mengikut Negeri Tempat Tinggal */}
                <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-700" />
                      <h3 className="text-base font-bold text-slate-900">
                        2. Analisis Ahli Mengikut Negeri ({stateAnalytics.length}{' '}
                        Negeri)
                      </h3>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {stateAnalytics.map((sa) => (
                      <div
                        key={sa.state}
                        className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-900">
                            {sa.state}
                          </span>
                          <span className="font-mono font-bold text-emerald-800">
                            {sa.total} ahli ({sa.pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-600 h-full rounded-full"
                            style={{ width: `${Math.max(8, sa.pct)}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-600">
                          <span>
                            Lelaki: <strong>{sa.maleCount}</strong> · Perempuan:{' '}
                            <strong>{sa.femaleCount}</strong>
                          </span>
                          <span className="font-mono text-slate-500">
                            {sa.membersList.map((m) => m.username).join(', ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. PECAHAN PAKEJ, JANTINA & KUMPULAN CRMP */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2.5">
                    3. Pecahan Mengikut Pakej Ahli
                  </h3>
                  {(
                    [
                      'Premier',
                      'Elite Plus',
                      'Elite',
                      'Holding Room',
                    ] as MemberPackage[]
                  ).map((pkg) => {
                    const count = members.filter(
                      (m) => m.package === pkg
                    ).length;
                    const pct =
                      members.length > 0
                        ? Math.round((count / members.length) * 100)
                        : 0;
                    return (
                      <div key={pkg} className="space-y-1 text-xs">
                        <div className="flex justify-between font-semibold">
                          <span>{pkg}</span>
                          <span className="font-mono">
                            {count} ahli ({pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              pkg === 'Holding Room'
                                ? 'bg-red-600'
                                : 'bg-indigo-600'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2.5">
                    4. Pecahan Jantina & Peringkat
                  </h3>
                  <div className="space-y-2.5 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <span className="font-semibold text-slate-700">
                        Ahli Lelaki
                      </span>
                      <span className="font-mono font-bold text-slate-900">
                        {maleMembers.length} orang
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-pink-50/60 border border-pink-200 flex items-center justify-between">
                      <span className="font-semibold text-pink-900">
                        Ahli Perempuan
                      </span>
                      <span className="font-mono font-bold text-pink-950">
                        {femaleMembers.length} orang
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-indigo-50/60 border border-indigo-200 flex items-center justify-between">
                      <span className="font-semibold text-indigo-900">
                        Peringkat PhD
                      </span>
                      <span className="font-mono font-bold text-indigo-950">
                        {phdMembers.length} orang
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200 flex items-center justify-between">
                      <span className="font-semibold text-emerald-900">
                        Peringkat Master
                      </span>
                      <span className="font-mono font-bold text-emerald-950">
                        {masterMembers.length} orang
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2.5">
                    5. Pecahan Mengikut Kumpulan CRMP
                  </h3>
                  <div className="space-y-2.5 text-xs">
                    {crmps.map((c) => {
                      const groupMems = members.filter(
                        (m) => m.crmpId === c.username
                      );
                      return (
                        <div
                          key={c.id}
                          className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="font-bold text-slate-900 truncate">
                              {c.username} — {c.name}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              Tesis Cemerlang:{' '}
                              {
                                groupMems.filter((m) => !!m.isExcellentThesis)
                                  .length
                              }{' '}
                              · Graduate:{' '}
                              {groupMems.filter((m) => !!m.isGraduated).length}
                            </div>
                          </div>
                          <span className="font-mono font-bold text-indigo-700 shrink-0">
                            {groupMems.length} ahli
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 6. JADUAL REKOD PENCAPAIAN AHLI (TESIS CEMERLANG, GRADUATE, VIVA, NOS, JANTINA, NEGERI) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <div className="border-b border-slate-200 pb-3">
                  <h3 className="text-base font-bold text-slate-900">
                    6. Senarai Penuh Rekod Pencapaian & Demografi Ahli (Boleh
                    Kemaskini Status Tesis Cemerlang / Graduate & Lihat
                    Maklumat)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tandakan kotak <strong>Tesis Cemerlang</strong> atau{' '}
                    <strong>Graduate</strong> untuk mengemaskini rekod
                    pencapaian ahli secara langsung, atau klik{' '}
                    <strong>Lihat Maklumat</strong> bagi melihat profil penuh.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-600 font-semibold">
                        <th className="py-2.5 px-2.5">Kod / Nama Ahli</th>
                        <th className="py-2.5 px-2">Jantina</th>
                        <th className="py-2.5 px-2">Universiti</th>
                        <th className="py-2.5 px-2">Negeri</th>
                        <th className="py-2.5 px-2">Fasa Semasa</th>
                        <th className="py-2.5 px-2 text-center">
                          Tesis Cemerlang
                        </th>
                        <th className="py-2.5 px-2 text-center">Graduate</th>
                        <th className="py-2.5 px-2 text-right">Maklumat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {members.map((mem) => (
                        <tr key={mem.id} className="hover:bg-slate-50">
                          <td className="py-3 px-2.5">
                            <div className="font-mono font-bold text-indigo-700">
                              {mem.username} · {mem.package}
                            </div>
                            <div className="font-semibold text-slate-900">
                              {mem.name}
                            </div>
                          </td>
                          <td className="py-3 px-2 font-medium text-slate-700">
                            {inferMemberGender(mem)}
                          </td>
                          <td className="py-3 px-2 text-slate-700">
                            {mem.university} ({mem.studyLevel || 'PhD'})
                          </td>
                          <td className="py-3 px-2 text-slate-700">
                            {inferMemberState(mem)}
                          </td>
                          <td className="py-3 px-2 font-semibold text-slate-800">
                            {mem.currentPhase}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <input
                              type="checkbox"
                              checked={!!mem.isExcellentThesis}
                              onChange={(e) => {
                                onUpdateMember({
                                  ...mem,
                                  isExcellentThesis: e.target.checked,
                                });
                                showToast(
                                  `Status Tesis Cemerlang bagi ${mem.name} dikemaskini.`
                                );
                              }}
                              className="w-4 h-4 accent-amber-600 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-2 text-center">
                            <input
                              type="checkbox"
                              checked={!!mem.isGraduated}
                              onChange={(e) => {
                                onUpdateMember({
                                  ...mem,
                                  isGraduated: e.target.checked,
                                });
                                showToast(
                                  `Status Graduate bagi ${mem.name} dikemaskini.`
                                );
                              }}
                              className="w-4 h-4 accent-emerald-600 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-2 text-right">
                            <button
                              type="button"
                              onClick={() => setViewingMemberId(mem.id)}
                              className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg font-semibold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Lihat
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* TAB 2: RAKAMAN ZOOM (MINGGU / BULAN)       */}
          {/* ========================================== */}
          {activeTab === 'zoom_recordings' && (
            <div className="space-y-6">
              <form
                onSubmit={(e) => handleCreateRecording(e, 'zoom')}
                className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
              >
                <div className="border-b border-slate-200 pb-3">
                  <h2 className="text-base font-bold text-slate-900">
                    Tambah Rakaman Zoom (Tentukan Minggu / Bulan)
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tajuk Rakaman Zoom
                    </label>
                    <input
                      type="text"
                      required
                      value={newRecTitle}
                      onChange={(e) => setNewRecTitle(e.target.value)}
                      placeholder="Contoh: Sesi Zoom Mingguan Premier Minggu 47"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Minggu / Bulan
                    </label>
                    <select
                      value={newRecFreq}
                      onChange={(e) =>
                        setNewRecFreq(e.target.value as 'Mingguan' | 'Bulanan')
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="Mingguan">
                        Mingguan (Khusus Premier)
                      </option>
                      <option value="Bulanan">
                        Bulanan (Premier, Elite Plus & Elite)
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tarikh (Klik Kalendar)
                    </label>
                    <input
                      type="date"
                      value={newRecDate}
                      onChange={(e) => setNewRecDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tempoh Rakaman
                    </label>
                    <input
                      type="text"
                      value={newRecDuration}
                      onChange={(e) => setNewRecDuration(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Pautan Video Zoom
                    </label>
                    <input
                      type="text"
                      required
                      value={newRecUrl}
                      onChange={(e) => setNewRecUrl(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Rakaman Zoom
                  </button>
                </div>
              </form>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Senarai Rakaman Zoom & Kawalan Akses Ahli (Dipecahkan Ikut
                      Tahun)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Pilih tahun di sebelah kanan untuk menapis bahan & video
                      Rakaman Zoom
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAdminRecordingYear('ALL')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${
                        adminRecordingYear === 'ALL'
                          ? 'bg-indigo-700 border-indigo-700 text-white'
                          : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Semua Tahun
                    </button>
                    {availableRecordingYears.map((yr) => (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => setAdminRecordingYear(yr)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border cursor-pointer ${
                          adminRecordingYear === yr
                            ? 'bg-slate-900 border-slate-900 text-white'
                            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        Tahun {yr}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-5">
                  {groupRecordingsByYear('zoom').map((group) => (
                    <div key={group.year} className="space-y-3">
                      <div className="flex items-center justify-between bg-slate-100 border border-slate-200 px-3.5 py-2 rounded-xl">
                        <span className="text-xs font-bold text-slate-900 font-mono">
                          📁 Rakaman Zoom — Tahun {group.year}
                        </span>
                        <span className="text-[11px] font-mono font-semibold text-slate-600">
                          {group.items.length} Video
                        </span>
                      </div>

                      <div className="space-y-3">
                        {group.items.map((rec) => (
                          <div
                            key={rec.id}
                            className="border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                          >
                            <div className="space-y-1">
                              <div className="text-xs font-mono text-indigo-700 font-semibold">
                                Rakaman {rec.zoomFrequency || 'Bulanan'} · Tahun{' '}
                                {group.year} · {rec.date} · {rec.duration}
                              </div>
                              <div className="text-sm font-bold text-slate-900">
                                {rec.title}
                              </div>
                              <div className="text-xs text-slate-500">
                                Ahli Dibenarkan Akses:{' '}
                                <strong>
                                  {rec.allowedMemberUsernames.length} /{' '}
                                  {members.length} ahli
                                </strong>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              <select
                                value={rec.zoomFrequency || 'Bulanan'}
                                onChange={(e) =>
                                  handleChangeZoomFrequency(
                                    rec,
                                    e.target.value as 'Mingguan' | 'Bulanan'
                                  )
                                }
                                className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-semibold"
                              >
                                <option value="Mingguan">Set: Mingguan</option>
                                <option value="Bulanan">Set: Bulanan</option>
                              </select>

                              <button
                                type="button"
                                onClick={() => setEditingRecording({ ...rec })}
                                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-semibold rounded-lg inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                Kemaskini (Tarikh / Link / Tajuk)
                              </button>

                              <button
                                type="button"
                                onClick={() => setAccessModalRec(rec)}
                                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
                              >
                                Tentukan Akses Ahli (
                                {rec.allowedMemberUsernames.length})
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteRecording(rec.id);
                                  showToast('Rakaman Zoom telah dipadam.');
                                }}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* TAB 3: RAKAMAN KELAS BASIC                 */}
          {/* ========================================== */}
          {activeTab === 'basic_recordings' && (
            <div className="space-y-6">
              <form
                onSubmit={(e) => handleCreateRecording(e, 'basic')}
                className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
              >
                <div className="border-b border-slate-200 pb-3">
                  <h2 className="text-base font-bold text-slate-900">
                    Tambah Rakaman Kelas Basic
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tajuk Kelas Basic
                    </label>
                    <input
                      type="text"
                      required
                      value={newRecTitle}
                      onChange={(e) => setNewRecTitle(e.target.value)}
                      placeholder="Contoh: Technical Class Basic: Literature Review"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tarikh Kelas (Klik Kalendar)
                    </label>
                    <input
                      type="date"
                      value={newRecDate}
                      onChange={(e) => setNewRecDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tempoh Rakaman
                    </label>
                    <input
                      type="text"
                      value={newRecDuration}
                      onChange={(e) => setNewRecDuration(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Pautan Video / Link Kelas Basic
                    </label>
                    <input
                      type="text"
                      required
                      value={newRecUrl}
                      onChange={(e) => setNewRecUrl(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Tambah Kelas Basic
                  </button>
                </div>
              </form>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Senarai Rakaman Kelas Basic & Kawalan Akses Ahli
                      (Dipecahkan Ikut Tahun)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Pilih tahun di sebelah kanan untuk menapis bahan & video
                      Kelas Basic
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAdminRecordingYear('ALL')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${
                        adminRecordingYear === 'ALL'
                          ? 'bg-indigo-700 border-indigo-700 text-white'
                          : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Semua Tahun
                    </button>
                    {availableRecordingYears.map((yr) => (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => setAdminRecordingYear(yr)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border cursor-pointer ${
                          adminRecordingYear === yr
                            ? 'bg-slate-900 border-slate-900 text-white'
                            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        Tahun {yr}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-5">
                  {groupRecordingsByYear('basic').map((group) => (
                    <div key={group.year} className="space-y-3">
                      <div className="flex items-center justify-between bg-emerald-50/70 border border-emerald-200 px-3.5 py-2 rounded-xl">
                        <span className="text-xs font-bold text-emerald-950 font-mono">
                          📁 Kelas Basic & Bahan Percuma — Tahun {group.year}
                        </span>
                        <span className="text-[11px] font-mono font-semibold text-emerald-800">
                          {group.items.length} Bahan / Video
                        </span>
                      </div>

                      <div className="space-y-3">
                        {group.items.map((rec) => (
                          <div
                            key={rec.id}
                            className="border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                          >
                            <div className="space-y-1">
                              <div className="text-xs font-mono text-emerald-700 font-semibold">
                                Kelas Basic · Tahun {group.year} · {rec.date} ·{' '}
                                {rec.duration}
                              </div>
                              <div className="text-sm font-bold text-slate-900">
                                {rec.title}
                              </div>
                              <div className="text-xs font-mono text-slate-500 truncate max-w-xl">
                                Link: {rec.videoUrl}
                              </div>
                              <div className="text-xs text-slate-500">
                                Akses Dibenarkan:{' '}
                                <strong>
                                  {rec.allowedMemberUsernames.length} /{' '}
                                  {members.length} ahli
                                </strong>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => setEditingRecording({ ...rec })}
                                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-semibold rounded-lg inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                Kemaskini (Tarikh / Link / Tajuk)
                              </button>
                              <button
                                type="button"
                                onClick={() => setAccessModalRec(rec)}
                                className="px-3.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg cursor-pointer"
                              >
                                Tentukan Ahli Boleh Akses (
                                {rec.allowedMemberUsernames.length})
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteRecording(rec.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* TAB 4: RAKAMAN KELAS BERBAYAR              */}
          {/* ========================================== */}
          {activeTab === 'paid_recordings' && (
            <div className="space-y-6">
              <form
                onSubmit={(e) => handleCreateRecording(e, 'paid')}
                className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
              >
                <div className="border-b border-slate-200 pb-3">
                  <h2 className="text-base font-bold text-slate-900">
                    Tambah Rakaman Kelas Berbayar
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tajuk Kelas Berbayar
                    </label>
                    <input
                      type="text"
                      required
                      value={newRecTitle}
                      onChange={(e) => setNewRecTitle(e.target.value)}
                      placeholder="Contoh: Roket Intensive Class III (RIC III)"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tarikh Kelas (Klik Kalendar)
                    </label>
                    <input
                      type="date"
                      value={newRecDate}
                      onChange={(e) => setNewRecDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Label Harga
                    </label>
                    <input
                      type="text"
                      value={newRecPrice}
                      onChange={(e) => setNewRecPrice(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Pautan Video / Link Kelas Berbayar
                    </label>
                    <input
                      type="text"
                      required
                      value={newRecUrl}
                      onChange={(e) => setNewRecUrl(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tempoh Rakaman
                    </label>
                    <input
                      type="text"
                      value={newRecDuration}
                      onChange={(e) => setNewRecDuration(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Tambah Kelas Berbayar
                  </button>
                </div>
              </form>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Senarai Rakaman Kelas Berbayar & Penetapan Siapa Boleh
                      Akses (Dipecahkan Ikut Tahun)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Pilih tahun di sebelah kanan untuk menapis bahan & video
                      Kelas Berbayar
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAdminRecordingYear('ALL')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${
                        adminRecordingYear === 'ALL'
                          ? 'bg-indigo-700 border-indigo-700 text-white'
                          : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Semua Tahun
                    </button>
                    {availableRecordingYears.map((yr) => (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => setAdminRecordingYear(yr)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border cursor-pointer ${
                          adminRecordingYear === yr
                            ? 'bg-slate-900 border-slate-900 text-white'
                            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        Tahun {yr}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-5">
                  {groupRecordingsByYear('paid').map((group) => (
                    <div key={group.year} className="space-y-3">
                      <div className="flex items-center justify-between bg-indigo-50/70 border border-indigo-200 px-3.5 py-2 rounded-xl">
                        <span className="text-xs font-bold text-indigo-950 font-mono">
                          📁 Kelas Berbayar — Tahun {group.year}
                        </span>
                        <span className="text-[11px] font-mono font-semibold text-indigo-800">
                          {group.items.length} Kelas
                        </span>
                      </div>

                      <div className="space-y-3">
                        {group.items.map((rec) => (
                          <div
                            key={rec.id}
                            className="border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                          >
                            <div className="space-y-1">
                              <div className="text-xs font-mono text-indigo-700 font-semibold">
                                {rec.priceLabel || 'Kelas Berbayar'} · Tahun{' '}
                                {group.year} · {rec.date} · {rec.duration}
                              </div>
                              <div className="text-sm font-bold text-slate-900">
                                {rec.title}
                              </div>
                              <div className="text-xs font-mono text-slate-500 truncate max-w-xl">
                                Link: {rec.videoUrl}
                              </div>
                              <div className="text-xs text-slate-600">
                                Ahli Boleh Akses:{' '}
                                <span className="font-mono font-semibold text-emerald-700">
                                  {rec.allowedMemberUsernames.length > 0
                                    ? rec.allowedMemberUsernames.join(', ')
                                    : 'Tiada ahli dipilih'}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => setEditingRecording({ ...rec })}
                                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-semibold rounded-lg inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                Kemaskini (Tarikh / Link / Tajuk)
                              </button>
                              <button
                                type="button"
                                onClick={() => setAccessModalRec(rec)}
                                className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
                              >
                                Tentukan Siapa Boleh Akses (
                                {rec.allowedMemberUsernames.length})
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteRecording(rec.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* TAB 5: PENGURUSAN CRMP (ADD/UPDATE/DELETE) */}
          {/* ========================================== */}
          {activeTab === 'crmp_management' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <div className="border-b border-slate-200 pb-3">
                  <h2 className="text-base font-bold text-slate-900">
                    {editingCrmp
                      ? `Update CRMP (${editingCrmp.username})`
                      : 'Tambah CRMP Baharu'}
                  </h2>
                </div>

                <form onSubmit={handleSaveCrmpForm} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Kod Username CRMP
                    </label>
                    <input
                      type="text"
                      required
                      value={crmpUsername}
                      onChange={(e) => setCrmpUsername(e.target.value)}
                      placeholder="CRMP005"
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nama Penuh CRMP
                    </label>
                    <input
                      type="text"
                      required
                      value={crmpName}
                      onChange={(e) => setCrmpName(e.target.value)}
                      placeholder="Contoh: Dr. Haziq bin Kamarul"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nama Kumpulan CRMP
                    </label>
                    <input
                      type="text"
                      required
                      value={crmpGroup}
                      onChange={(e) => setCrmpGroup(e.target.value)}
                      placeholder="Contoh: Kumpulan CRMP Epsilon"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Universiti
                      </label>
                      <input
                        type="text"
                        value={crmpUni}
                        onChange={(e) => setCrmpUni(e.target.value)}
                        placeholder="UKM / UTM / UPSI"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        No. Telefon
                      </label>
                      <input
                        type="text"
                        value={crmpPhone}
                        onChange={(e) => setCrmpPhone(e.target.value)}
                        placeholder="012-3456789"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Bidang Kepakaran
                    </label>
                    <input
                      type="text"
                      value={crmpSpec}
                      onChange={(e) => setCrmpSpec(e.target.value)}
                      placeholder="Contoh: Kejuruteraan Perisian & Pendidikan"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    {editingCrmp && (
                      <button
                        type="button"
                        onClick={startNewCrmpForm}
                        className="px-3 py-2 text-xs font-semibold text-slate-600 cursor-pointer"
                      >
                        Batal
                      </button>
                    )}
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold rounded-xl cursor-pointer"
                    >
                      {editingCrmp ? 'Update CRMP' : 'Tambah CRMP'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <h3 className="text-base font-bold text-slate-900">
                  Senarai CRMP ({crmps.length})
                </h3>
                <div className="space-y-3">
                  {crmps.map((c) => {
                    const count = members.filter(
                      (m) => m.crmpId === c.username
                    ).length;
                    return (
                      <div
                        key={c.id}
                        className="border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-indigo-700">
                              {c.username}
                            </span>
                            <span className="text-sm font-bold text-slate-900">
                              {c.name}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600">
                            {c.groupName} · {c.university} · {c.specialization}
                          </div>
                          <div className="text-xs text-slate-500 font-mono">
                            Bilangan Ahli: {count} orang · Tel: {c.phone}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => startEditCrmp(c)}
                            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-100 inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Pencil className="w-3 h-3" /> Update
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteCrmp(c.id);
                              showToast(`CRMP ${c.username} telah dipadam.`);
                            }}
                            className="px-3 py-1.5 border border-red-200 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-50 inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" /> Delete
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
          {/* TAB 6: JADUAL VC & KAWALAN HARI TIADA VC   */}
          {/* ========================================== */}
          {activeTab === 'crmp_schedule' && (
            <div className="space-y-6">
              {/* Admin Controls: Set Hari Tiada VC (Vote OFF) & Waktu Vote 6:20 Petang */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Kawalan Vote VC Harian & Tetapan Hari Tiada VC (Admin)
                    </h2>
                    <p className="text-xs text-slate-500">
                      VC diadakan <strong>Isnin – Jumaat</strong> jam{' '}
                      <strong>{vcSettings.vcTimeLabel}</strong> dan Vote VC
                      diaktifkan pada <strong>{vcSettings.voteOpenTime}</strong>.
                      Ahli hanya boleh vote untuk hari semasa sahaja.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleToggleTodayVcOff}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                        isTodayOff
                          ? 'bg-red-700 hover:bg-red-800 text-white'
                          : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      {isTodayOff
                        ? `Hari Ini (${TODAY_DATE_STR}): TIADA VC (Vote OFF)`
                        : `Hari Ini (${TODAY_DATE_STR}): ADA VC (Vote ON)`}
                    </button>

                    <button
                      type="button"
                      onClick={handleToggleForceOpenVote}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold border inline-flex items-center gap-1.5 cursor-pointer ${
                        vcSettings.forceOpenVoteWindow
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                          : 'border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      {vcSettings.forceOpenVoteWindow
                        ? 'Tetingkap 6:20 Petang: Aktif Sekarang'
                        : 'Ikut Jam Sebenar (6:20 Petang)'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  <form
                    onSubmit={handleAddOffDate}
                    className="lg:col-span-5 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
                  >
                    <div className="text-xs font-bold text-slate-900">
                      Tambah Tarikh Hari Tiada VC (Vote Akan OFF Automatik)
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Klik kalendar di bawah untuk memilih tarikh cuti atau hari
                      yang tiada sesi VC (Sabtu & Ahad sememangnya OFF secara
                      automatik).
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        required
                        value={offDateInput}
                        onChange={(e) => setOffDateInput(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white cursor-pointer"
                      />
                      <button
                        type="submit"
                        className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg cursor-pointer shrink-0"
                      >
                        Set Tiada VC
                      </button>
                    </div>
                  </form>

                  <div className="lg:col-span-7 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">
                        Senarai Tarikh Tiada VC (Vote OFF):
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">
                        Tema Semasa (Oleh CRMP): {vcSettings.dailyTheme}
                      </span>
                    </div>

                    {vcSettings.offDates.length === 0 ? (
                      <div className="text-xs text-slate-500 py-2">
                        Tiada tarikh khas ditutup. Semua hari Isnin – Jumaat
                        aktif untuk VC.
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {vcSettings.offDates.map((d) => {
                          const info = computeAutoWeekFromDate(d);
                          return (
                            <div
                              key={d}
                              className="px-3 py-1.5 bg-white border border-red-200 rounded-lg text-xs flex items-center gap-2"
                            >
                              <span className="font-mono font-bold text-red-700">
                                {d} ({info.selectedDayName})
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveOffDate(d)}
                                title="Aktifkan semula VC pada tarikh ini"
                                className="text-slate-400 hover:text-red-700 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <form
                onSubmit={handleAddScheduleSubmit}
                className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
              >
                <div className="border-b border-slate-200 pb-3">
                  <h2 className="text-base font-bold text-slate-900">
                    Tentukan Jadual Bertugas VC CRMP
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tarikh Bertugas (Klik Kalendar)
                    </label>
                    <input
                      type="date"
                      required
                      value={schDate}
                      onChange={(e) => setSchDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Hari & Minggu (Auto)
                    </label>
                    <div className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold">
                      {schDateInfo.selectedDayName} · Minggu {schDateInfo.weekNumber}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Slot Masa VC
                    </label>
                    <input
                      type="text"
                      value={schTime}
                      onChange={(e) => setSchTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      CRMP Bertugas Utama
                    </label>
                    <select
                      value={schCrmpId}
                      onChange={(e) => setSchCrmpId(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                    >
                      {crmps.map((c) => (
                        <option key={c.username} value={c.username}>
                          {c.username} — {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      CRMP Pembantu
                    </label>
                    <select
                      value={schBackupId}
                      onChange={(e) => setSchBackupId(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                    >
                      {crmps.map((c) => (
                        <option key={c.username} value={c.username}>
                          {c.username} — {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Topik / Sesi VC
                    </label>
                    <input
                      type="text"
                      required
                      value={schTitle}
                      onChange={(e) => setSchTitle(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Tambah Jadual Bertugas VC
                  </button>
                </div>
              </form>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <h3 className="text-base font-bold text-slate-900">
                  Senarai Jadual Bertugas VC CRMP ({schedules.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600">
                        <th className="py-2.5 px-3">Tarikh / Hari</th>
                        <th className="py-2.5 px-3">Slot Masa</th>
                        <th className="py-2.5 px-3">Sesi VC</th>
                        <th className="py-2.5 px-3">CRMP Utama</th>
                        <th className="py-2.5 px-3">CRMP Pembantu</th>
                        <th className="py-2.5 px-3 text-right">Tindakan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {schedules.map((sch) => (
                        <tr key={sch.id} className="hover:bg-slate-50">
                          <td className="py-3 px-3 font-mono font-semibold">
                            {sch.date} ({sch.dayName})
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
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteSchedule(sch.id);
                                showToast('Jadual bertugas telah dipadam.');
                              }}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* TAB 7: KELULUSAN THESIS TALK               */}
          {/* ========================================== */}
          {activeTab === 'thesis_talks' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <h2 className="text-base font-bold text-slate-900">
                  Pengurusan & Kelulusan Permohonan Thesis Talk
                </h2>
              </div>

              <div className="space-y-3">
                {thesisTalks.map((tt) => (
                  <div
                    key={tt.id}
                    className="border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="text-xs font-mono text-indigo-700 font-semibold">
                        {tt.proposedDate} · {tt.scheduledTime} · Pembentang:{' '}
                        {tt.memberName} ({tt.memberUsername})
                      </div>
                      <div className="text-sm font-bold text-slate-900">
                        {tt.title}
                      </div>
                      <p className="text-xs text-slate-600">{tt.abstract}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={tt.status}
                        onChange={(e) => {
                          onUpdateThesisTalk({
                            ...tt,
                            status: e.target.value as ThesisTalkItem['status'],
                          });
                          showToast(
                            `Status Thesis Talk "${tt.title}" dikemaskini.`
                          );
                        }}
                        className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-semibold"
                      >
                        <option value="Dalam Semakan">Dalam Semakan</option>
                        <option value="Diluluskan">Diluluskan</option>
                        <option value="Selesai">Selesai</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modal Upload Gambar Standard 300x300 atau Pautan URL */}
      <AvatarUploadModal
        isOpen={avatarModalOpen}
        onClose={() => setAvatarModalOpen(false)}
        currentAvatar={hasValidAvatar ? admin.avatar || '' : ''}
        userName={admin.name}
        userCode={admin.username}
        onSaveAvatar={handleSaveAdminAvatar}
      />

      {/* Modal Tukar Kata Laluan & Lupa Kata Laluan SuperAdmin */}
      <PasswordChangeModal
        isOpen={adminPasswordModalOpen}
        onClose={() => setAdminPasswordModalOpen(false)}
        userName={admin.name}
        userCode={admin.username}
        userEmail={admin.email}
        currentPassword={admin.password}
        onSavePassword={handleSaveAdminPassword}
      />

      {/* Modal Tukar Pakej Ahli (ID Pengguna Kekal Tetap Sama Walaupun Bertukar Pakej) */}
      {pkgModalMember && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Tukar Pakej Ahli (ID Pengguna Kekal Tetap Sama)
                </h3>
                <p className="text-xs text-slate-500">
                  Ahli: {pkgModalMember.name} ({pkgModalMember.username})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPkgModalMember(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmPackageChange} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Pilih Pakej Baharu Ahli
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
                      onClick={() => handleSelectNewPackage(pkg)}
                      className={`p-2.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer text-center ${
                        targetPackage === pkg
                          ? pkg === 'Holding Room'
                            ? 'border-red-600 bg-red-50 text-red-900'
                            : 'border-indigo-600 bg-indigo-50 text-indigo-900'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div>{pkg}</div>
                      <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                        ID Tetap Kekal
                      </div>
                    </button>
                  ))}
                </div>
                {targetPackage === 'Holding Room' && (
                  <p className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-2">
                    <strong>Pakej Holding Room:</strong> Ahli ini tidak akan
                    mempunyai akses untuk menonton Kelas Percuma (Basic),
                    Rakaman Zoom, dan tidak boleh menyertai Sesi VC.
                  </p>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-emerald-950">
                    ID Pengguna Tetap Ahli (Tidak Berubah Bila Tukar Pakej)
                  </label>
                  <span className="px-2 py-0.5 rounded bg-emerald-200/80 text-emerald-950 text-[10px] font-bold">
                    ID KEKAL SAMA
                  </span>
                </div>
                <input
                  type="text"
                  required
                  value={targetUsername}
                  onChange={(e) => setTargetUsername(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono font-bold border border-emerald-300 rounded-lg bg-white text-indigo-900"
                />
                <p className="text-[11px] text-emerald-800">
                  ID Pengguna seperti <strong>{pkgModalMember.username}</strong>{' '}
                  kekal sama walaupun ahli bertukar status Premier, Elite Plus,
                  Elite atau Holding Room supaya pangkalan data sentiasa
                  konsisten. Ahli juga boleh log masuk menggunakan E-mel mereka.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    const target = pkgModalMember;
                    setPkgModalMember(null);
                    openMemberPasswordModal(target);
                  }}
                  className="text-xs font-bold text-indigo-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  Tukar Password Ahli Ini
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPkgModalMember(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    Sahkan Pertukaran
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Admin Tukar / Reset Kata Laluan Ahli */}
      {pwdModalMember && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Tukar Kata Laluan Ahli (Oleh Admin)
                </h3>
                <p className="text-xs text-slate-500">
                  Ahli: {pwdModalMember.name} ({pwdModalMember.username})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPwdModalMember(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSaveMemberPasswordByAdmin}
              className="space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Kata Laluan Baharu Ahli
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setMemberNewPassword(generateTemporaryPassword())
                    }
                    className="text-xs font-bold text-indigo-700 hover:underline cursor-pointer"
                  >
                    Jana Kata Laluan Sementara
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={memberNewPassword}
                  onChange={(e) => setMemberNewPassword(e.target.value)}
                  placeholder="Masukkan kata laluan baharu ahli"
                  className="w-full px-3.5 py-2.5 text-sm font-mono font-bold border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Ahli ({pwdModalMember.email}) boleh terus log masuk
                  menggunakan kata laluan ini dan menukarnya semula di dalam
                  profil mereka.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setPwdModalMember(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Simpan Kata Laluan Ahli
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Admin Tambah Ahli Platinium Baharu (Ringkas: Hanya Jana Username & Password Pertama Kali Login) */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Tambah Ahli Baharu (Jana Username & Password Pertama Kali Login)
                </h3>
                <p className="text-xs text-slate-500">
                  Hanya pilih pakej untuk dapatkan Username & Password pertama
                  kali login. Ahli akan kemaskini profil sendiri selepas log
                  masuk.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddMemberModal(false);
                  setGeneratedCredentialSlip(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {generatedCredentialSlip ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                    Akaun Pertama Kali Login Ahli Berjaya Dijana!
                  </div>
                  <p className="text-xs text-emerald-800">
                    Sila salin dan berikan <strong>Username</strong> serta{' '}
                    <strong>Password Pertama Kali Login</strong> di bawah kepada
                    ahli. Ahli boleh terus log masuk dan mengemaskini maklumat
                    peribadi mereka sendiri.
                  </p>
                  <div className="p-4 rounded-xl bg-white border border-emerald-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500 font-medium">
                        Pakej & Kumpulan CRMP:
                      </span>
                      <span className="font-bold text-slate-900">
                        {generatedCredentialSlip.package} ·{' '}
                        {generatedCredentialSlip.crmpId}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500 font-medium">
                        Username (Kod Ahli):
                      </span>
                      <span className="text-base font-mono font-bold text-indigo-700">
                        {generatedCredentialSlip.username}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">
                        Password Pertama Kali Login:
                      </span>
                      <span className="text-base font-mono font-bold text-emerald-800">
                        {generatedCredentialSlip.password}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyCredentials(
                        generatedCredentialSlip.username,
                        generatedCredentialSlip.password,
                        generatedCredentialSlip.package
                      )
                    }
                    className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Salin Username & Password
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setGeneratedCredentialSlip(null)}
                      className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                    >
                      + Jana Ahli Lain
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddMemberModal(false);
                        setGeneratedCredentialSlip(null);
                      }}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl cursor-pointer"
                    >
                      Selesai
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAddMemberByAdminSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    1. Pilih Pakej Ahli (Username Dijana Automatik)
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
                        onClick={() => setNewMemPackage(pkg)}
                        className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                          newMemPackage === pkg
                            ? 'border-indigo-600 bg-indigo-50/60 text-slate-900'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className="text-xs font-bold">{pkg}</div>
                        <div className="text-[11px] font-mono text-indigo-700 mt-0.5">
                          {computeSuggestedUsername(pkg)}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Paparan Username & Password Pertama Kali Login */}
                <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">
                      Username Pertama Kali Login (Auto):
                    </span>
                    <span className="text-base font-mono font-bold text-indigo-800">
                      {computeSuggestedUsername(newMemPackage)}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        Password Pertama Kali Login
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setNewMemPassword(generateTemporaryPassword())
                        }
                        className="text-xs font-bold text-indigo-700 hover:underline cursor-pointer"
                      >
                        Jana Password Sementara
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={newMemPassword}
                      onChange={(e) => setNewMemPassword(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono font-bold border border-indigo-300 rounded-lg bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Kumpulan CRMP
                    </label>
                    <select
                      value={newMemCrmpId}
                      onChange={(e) => setNewMemCrmpId(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-semibold"
                    >
                      {crmps.map((c) => (
                        <option key={c.username} value={c.username}>
                          {c.username} - {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nama Ahli (Pilihan - Ahli Kemaskini Sendiri)
                    </label>
                    <input
                      type="text"
                      value={newMemName}
                      onChange={(e) => setNewMemName(e.target.value)}
                      placeholder="Boleh dibiarkan kosong"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowAddMemberModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Jana Username & Password (
                    {computeSuggestedUsername(newMemPackage)})
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal Kemaskini Rakaman Zoom / Kelas Basic / Kelas Berbayar (Ubah Tarikh / Link / Tajuk) */}
      {editingRecording && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <div className="text-xs font-mono font-bold text-indigo-700 uppercase">
                  Kemaskini{' '}
                  {editingRecording.category === 'zoom'
                    ? 'Rakaman Zoom'
                    : editingRecording.category === 'basic'
                    ? 'Kelas Basic'
                    : 'Kelas Berbayar'}
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Ubah Tajuk, Tarikh & Link Rakaman
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingRecording(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedRecording} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tajuk Rakaman / Kelas
                </label>
                <input
                  type="text"
                  required
                  value={editingRecording.title}
                  onChange={(e) =>
                    setEditingRecording({
                      ...editingRecording,
                      title: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tarikh Kelas (Klik Kalendar)
                  </label>
                  <input
                    type="date"
                    required
                    value={editingRecording.date}
                    onChange={(e) =>
                      setEditingRecording({
                        ...editingRecording,
                        date: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tempoh Rakaman
                  </label>
                  <input
                    type="text"
                    value={editingRecording.duration}
                    onChange={(e) =>
                      setEditingRecording({
                        ...editingRecording,
                        duration: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {editingRecording.category === 'zoom' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kekerapan Rakaman Zoom
                  </label>
                  <select
                    value={editingRecording.zoomFrequency || 'Bulanan'}
                    onChange={(e) =>
                      setEditingRecording({
                        ...editingRecording,
                        zoomFrequency: e.target.value as 'Mingguan' | 'Bulanan',
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-semibold"
                  >
                    <option value="Mingguan">Mingguan (Khusus Premier)</option>
                    <option value="Bulanan">
                      Bulanan (Premier, Elite Plus & Elite)
                    </option>
                  </select>
                </div>
              )}

              {editingRecording.category === 'paid' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Label Harga Kelas Berbayar
                  </label>
                  <input
                    type="text"
                    value={editingRecording.priceLabel || ''}
                    onChange={(e) =>
                      setEditingRecording({
                        ...editingRecording,
                        priceLabel: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Link Video / Pautan Kelas
                </label>
                <input
                  type="text"
                  required
                  value={editingRecording.videoUrl}
                  onChange={(e) =>
                    setEditingRecording({
                      ...editingRecording,
                      videoUrl: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Keterangan Ringkas
                </label>
                <textarea
                  rows={2}
                  value={editingRecording.description}
                  onChange={(e) =>
                    setEditingRecording({
                      ...editingRecording,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingRecording(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Simpan Kemaskini Rakaman
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Lihat Maklumat Lengkap Ahli Berserta Gambar & Roadmap (Oleh Admin) */}
      {viewingMember && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border-2 border-purple-200 rounded-2xl max-w-4xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-start justify-between border-b border-purple-100 pb-4 bg-gradient-to-r from-purple-50 via-pink-50/50 to-indigo-50 p-4 rounded-xl">
              <div className="flex items-center gap-4">
                <ScholarCharacterAvatar member={viewingMember} size="lg" />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-indigo-700 text-white font-mono text-xs font-bold">
                      ID Tetap: {viewingMember.username}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-pink-100 text-pink-900 text-xs font-bold">
                      Pakej {viewingMember.package}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-900 text-xs font-semibold">
                      {viewingMember.studyLevel || 'PhD'} ·{' '}
                      {viewingMember.currentSemester}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mt-1.5">
                    {viewingMember.name}
                  </h3>
                  <p className="text-xs text-slate-600">
                    {viewingMember.email} · {viewingMember.phone} · Kumpulan
                    CRMP: <strong>{viewingMember.crmpId}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingMemberId(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <MasterPhdRoadmap member={viewingMember} compact />

            {/* Kawalan Status Pencapaian & Demografi Ahli Oleh Admin */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="text-xs font-bold text-slate-900">
                Status Pencapaian & Rekod Analisis Ahli (Boleh Dikemaskini Admin)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <label className="p-2.5 rounded-lg bg-white border border-amber-300 flex items-center gap-2 cursor-pointer font-semibold text-amber-950">
                  <input
                    type="checkbox"
                    checked={!!viewingMember.isExcellentThesis}
                    onChange={(e) => {
                      onUpdateMember({
                        ...viewingMember,
                        isExcellentThesis: e.target.checked,
                      });
                      showToast('Status Tesis Cemerlang ahli dikemaskini.');
                    }}
                    className="w-4 h-4 accent-amber-600"
                  />
                  <span>Dapat Tesis Cemerlang</span>
                </label>

                <label className="p-2.5 rounded-lg bg-white border border-emerald-300 flex items-center gap-2 cursor-pointer font-semibold text-emerald-950">
                  <input
                    type="checkbox"
                    checked={!!viewingMember.isGraduated}
                    onChange={(e) => {
                      onUpdateMember({
                        ...viewingMember,
                        isGraduated: e.target.checked,
                      });
                      showToast('Status Graduate ahli dikemaskini.');
                    }}
                    className="w-4 h-4 accent-emerald-600"
                  />
                  <span>Telah Graduate</span>
                </label>

                <div>
                  <select
                    value={inferMemberGender(viewingMember)}
                    onChange={(e) => {
                      onUpdateMember({
                        ...viewingMember,
                        gender: e.target.value as 'Lelaki' | 'Perempuan',
                      });
                      showToast('Jantina ahli dikemaskini.');
                    }}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg bg-white font-semibold"
                  >
                    <option value="Perempuan">Jantina: Perempuan</option>
                    <option value="Lelaki">Jantina: Lelaki</option>
                  </select>
                </div>

                <div>
                  <select
                    value={viewingMember.currentPhase}
                    onChange={(e) => {
                      onUpdateMember({
                        ...viewingMember,
                        currentPhase: e.target.value as PhDPhase,
                      });
                      showToast('Fasa pengajian ahli dikemaskini.');
                    }}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg bg-white font-semibold"
                  >
                    {PHD_PHASES.map((ph) => (
                      <option key={ph} value={ph}>
                        {ph}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Maklumat Akademik, Universiti & Negeri */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="font-bold text-slate-900 border-b border-slate-100 pb-1.5">
                  Maklumat Universiti & Penyelidikan
                </div>
                <div>
                  <span className="text-slate-500">Universiti:</span>{' '}
                  <strong className="text-slate-900">
                    {viewingMember.university}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">Peringkat & Semester:</span>{' '}
                  <strong className="text-slate-900">
                    {viewingMember.studyLevel || 'PhD'} ·{' '}
                    {viewingMember.currentSemester}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">Bidang Kajian:</span>{' '}
                  <strong className="text-slate-900">
                    {viewingMember.researchField || 'Penyelidikan Siswazah'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">Tajuk Kajian:</span>{' '}
                  <strong className="text-slate-900">
                    {viewingMember.researchTitle}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">Penyelia Utama:</span>{' '}
                  <strong className="text-slate-900">
                    {viewingMember.supervisor}
                  </strong>
                </div>
                {viewingMember.supervisor2 && (
                  <div>
                    <span className="text-slate-500">Penyelia 2:</span>{' '}
                    <strong className="text-slate-900">
                      {viewingMember.supervisor2}
                    </strong>
                  </div>
                )}
              </div>

              <div className="p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="font-bold text-slate-900 border-b border-slate-100 pb-1.5">
                  Tempat Tinggal, Negeri & Roadmap Tarikh
                </div>
                <div>
                  <span className="text-slate-500">Negeri:</span>{' '}
                  <strong className="text-slate-900">
                    {inferMemberState(viewingMember)}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">Alamat / Kediaman:</span>{' '}
                  <strong className="text-slate-900">
                    {viewingMember.residence}
                  </strong>
                </div>
                <div className="pt-1 border-t border-slate-100 grid grid-cols-2 gap-1.5 font-mono text-[11px]">
                  <div>
                    Daftar: <strong>{viewingMember.dates.earlyRegistration}</strong>
                  </div>
                  <div>
                    PD: <strong>{viewingMember.dates.registerPD}</strong>
                  </div>
                  <div>
                    Data:{' '}
                    <strong>{viewingMember.dates.dataCollectionAnalysis}</strong>
                  </div>
                  <div>
                    NOS: <strong>{viewingMember.dates.nos}</strong>
                  </div>
                  <div>
                    Submit:{' '}
                    <strong>{viewingMember.dates.thesisSubmission}</strong>
                  </div>
                  <div>
                    Viva: <strong>{viewingMember.dates.viva}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Senarai Penerbitan & Learning Point Kelas Ahli */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="font-bold text-slate-900">
                  Senarai Publication ({viewingMember.publications.length})
                </div>
                {viewingMember.publications.length === 0 ? (
                  <p className="text-slate-500">Tiada rekod penerbitan.</p>
                ) : (
                  <div className="space-y-1.5">
                    {viewingMember.publications.map((pub) => (
                      <div
                        key={pub.id}
                        className="p-2 rounded bg-slate-50 border border-slate-200"
                      >
                        <div className="font-semibold text-slate-900">
                          {pub.title}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {pub.type} · {pub.journalOrPublisher} ({pub.year}) ·{' '}
                          <strong>{pub.status}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="font-bold text-slate-900">
                  Learning Point Kelas Dihadiri (
                  {(viewingMember.learningPoints || []).length})
                </div>
                {(viewingMember.learningPoints || []).length === 0 ? (
                  <p className="text-slate-500">
                    Tiada link learning point kelas direkodkan.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {(viewingMember.learningPoints || []).map((lp) => (
                      <div
                        key={lp.id}
                        className="p-2 rounded bg-indigo-50/50 border border-indigo-200 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 truncate">
                            {lp.recordingTitle}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500">
                            {lp.classDate}
                          </div>
                        </div>
                        <a
                          href={lp.link}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 bg-indigo-700 text-white rounded font-semibold inline-flex items-center gap-1 shrink-0"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Baca
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = viewingMember;
                    setViewingMemberId(null);
                    openChangePackageModal(target);
                  }}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Tukar Pakej / Kod
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const target = viewingMember;
                    setViewingMemberId(null);
                    openMemberPasswordModal(target);
                  }}
                  className="px-3.5 py-2 bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  Tukar Password
                </button>
              </div>
              <button
                type="button"
                onClick={() => setViewingMemberId(null)}
                className="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tentukan Siapa Boleh Akses Setiap Rakaman */}
      {accessModalRec && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[88vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <div className="text-xs font-mono font-bold text-indigo-700">
                  Kawalan Akses Rakaman ({accessModalRec.category.toUpperCase()})
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  {accessModalRec.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAccessModalRec(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
              <span className="font-semibold text-slate-700">
                Dipilih: {accessModalRec.allowedMemberUsernames.length} daripada{' '}
                {members.length} ahli
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleSelectAllMembersForRecording(accessModalRec, true)
                  }
                  className="px-2.5 py-1 bg-white border border-slate-300 rounded font-semibold hover:bg-slate-100 cursor-pointer"
                >
                  Pilih Semua
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleSelectAllMembersForRecording(accessModalRec, false)
                  }
                  className="px-2.5 py-1 bg-white border border-slate-300 rounded font-semibold hover:bg-slate-100 cursor-pointer"
                >
                  Nyahpilih Semua
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg max-h-80 overflow-y-auto">
              {members.map((mem) => {
                const isAllowed =
                  accessModalRec.allowedMemberUsernames.includes(mem.username);
                return (
                  <label
                    key={mem.id}
                    className="p-3 flex items-center justify-between hover:bg-slate-50 cursor-pointer text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isAllowed}
                        onChange={() =>
                          handleToggleMemberAccessForRecording(
                            accessModalRec,
                            mem.username
                          )
                        }
                        className="w-4 h-4 accent-indigo-600"
                      />
                      <div>
                        <span className="font-mono font-bold text-indigo-700 mr-2">
                          {mem.username}
                        </span>
                        <span className="font-semibold text-slate-900">
                          {mem.name}
                        </span>
                      </div>
                    </div>
                    <span className="text-slate-500 font-mono">
                      {mem.package} · {mem.crmpId}
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setAccessModalRec(null);
                  showToast('Tetapan akses rakaman telah disimpan.');
                }}
                className="px-5 py-2 bg-indigo-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
