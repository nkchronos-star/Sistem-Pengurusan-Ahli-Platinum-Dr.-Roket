/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import {
  AdminProfile,
  ClassRecording,
  CRMPDutySchedule,
  CRMPProfile,
  DraftSubmission,
  MemberPackage,
  MemberProfile,
  ThesisTalkItem,
  VCSystemSettings,
  VCVoteRecord,
  WeeklyChecklist,
} from './types';
import {
  INITIAL_ADMINS,
  INITIAL_CRMP_SCHEDULES,
  INITIAL_CRMPS,
  INITIAL_DRAFTS,
  INITIAL_MEMBERS,
  INITIAL_RECORDINGS,
  INITIAL_THESIS_TALKS,
  INITIAL_VC_SETTINGS,
  INITIAL_VC_VOTES,
  INITIAL_WEEKLY_CHECKLISTS,
} from './data/initialData';
import { AuthView } from './components/AuthView';
import { MemberDashboard } from './components/MemberDashboard';
import { CRMPDashboard } from './components/CRMPDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import {
  decryptVaultData,
  encryptVaultData,
  sanitizeDataPayload,
} from './utils/security';
import {
  DEFAULT_MALAYSIA_UNIVERSITIES,
  derivePhaseFromDates,
  generateNextMemberUsername,
  normalizeUniversityName,
} from './utils/helpers';
import {
  fetchStateFromSupabase,
  isSupabaseConfigured,
  syncStateToSupabase,
} from './lib/supabase';

const STORAGE_KEY = 'dr_roket_platinium_system_v2';
const ACTIVE_USER_SESSION_KEY = 'dr_roket_active_username_v2';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes auto-logout

interface StoredSystemVault {
  updatedAt?: number;
  members?: MemberProfile[];
  crmps?: CRMPProfile[];
  admins?: AdminProfile[];
  drafts?: DraftSubmission[];
  checklists?: WeeklyChecklist[];
  recordings?: ClassRecording[];
  thesisTalks?: ThesisTalkItem[];
  vcVotes?: VCVoteRecord[];
  vcSettings?: VCSystemSettings;
  crmpSchedules?: CRMPDutySchedule[];
  universities?: string[];
}

const LEGACY_USERNAME_MAP: Record<string, string> = {
  APP0001: 'DR0001',
  'DR0001-KAMARIAH': 'DR0001',
  APP0002: 'DR0002',
  'DR0002-FAIZ': 'DR0002',
  APEP0001: 'DR0003',
  'DR0003-HUDA': 'DR0003',
  APE0001: 'DR0004',
  'DR0004-FARAH': 'DR0004',
  APP0003: 'DR0005',
  'DR0005-SARAH': 'DR0005',
  APEP0002: 'DR0006',
  'DR0006-HAFIZ': 'DR0006',
  APE0002: 'DR0007',
  'DR0007-KHAIRUL': 'DR0007',
  APE0003: 'DR0008',
  'DR0008-NADIA': 'DR0008',
};

function normalizeShortMemberCode(rawCode: string, fallbackIndex?: number): string {
  const upper = (rawCode || '').trim().toUpperCase();
  if (LEGACY_USERNAME_MAP[upper]) {
    return LEGACY_USERNAME_MAP[upper];
  }
  const drWithSuffixMatch = upper.match(/^(DR\d{4})-[A-Z0-9_-]+$/i);
  if (drWithSuffixMatch) {
    return drWithSuffixMatch[1].toUpperCase();
  }
  if (/^(APP|APEP|APE|APHR)\d+$/i.test(upper) && fallbackIndex !== undefined) {
    return `DR${String(fallbackIndex + 1).padStart(4, '0')}`;
  }
  return rawCode;
}

function migrateVaultToFixedIds(
  vault: StoredSystemVault | null
): StoredSystemVault | null {
  if (!vault) return null;
  const codeMap: Record<string, string> = { ...LEGACY_USERNAME_MAP };

  const migratedMembers = Array.isArray(vault.members)
    ? vault.members.map((m, idx) => {
        const upper = (m.username || '').trim().toUpperCase();
        const nextUsername = normalizeShortMemberCode(m.username, idx);
        codeMap[upper] = nextUsername;

        // Segerakkan Fasa Kajian (currentPhase) dengan tarikh Master PhD Roadmap
        const syncedPhaseInfo = m.dates
          ? derivePhaseFromDates(m.dates)
          : null;

        return {
          ...m,
          username: nextUsername,
          university: normalizeUniversityName(m.university),
          currentPhase: syncedPhaseInfo ? syncedPhaseInfo.phase : m.currentPhase,
        };
      })
    : undefined;

  const mapCode = (code: string): string => {
    const upper = (code || '').trim().toUpperCase();
    return codeMap[upper] || normalizeShortMemberCode(code);
  };

  const migratedDrafts = Array.isArray(vault.drafts)
    ? vault.drafts.map((d) => ({
        ...d,
        memberId: mapCode(d.memberId),
        draftLink:
          d.draftLink ||
          `https://docs.google.com/document/d/draf-${d.draftNumber}-${mapCode(
            d.memberId
          ).toLowerCase()}/edit`,
      }))
    : undefined;

  const migratedChecklists = Array.isArray(vault.checklists)
    ? vault.checklists.map((c) => ({
        ...c,
        memberId: mapCode(c.memberId),
      }))
    : undefined;

  const migratedVcVotes = Array.isArray(vault.vcVotes)
    ? vault.vcVotes.map((v) => ({
        ...v,
        memberUsername: mapCode(v.memberUsername),
      }))
    : undefined;

  const migratedThesisTalks = Array.isArray(vault.thesisTalks)
    ? vault.thesisTalks.map((t) => ({
        ...t,
        memberUsername: mapCode(t.memberUsername),
      }))
    : undefined;

  const migratedRecordings = Array.isArray(vault.recordings)
    ? vault.recordings.map((r) => ({
        ...r,
        allowedMemberUsernames: Array.isArray(r.allowedMemberUsernames)
          ? r.allowedMemberUsernames.map(mapCode)
          : [],
      }))
    : undefined;

  const migratedCrmps = Array.isArray(vault.crmps)
    ? vault.crmps.map((c) => ({
        ...c,
        groupName: (c.groupName || '').replace(/Seliaan\s*/gi, '').trim(),
      }))
    : undefined;

  return {
    ...vault,
    members: migratedMembers,
    crmps: migratedCrmps,
    drafts: migratedDrafts,
    checklists: migratedChecklists,
    vcVotes: migratedVcVotes,
    thesisTalks: migratedThesisTalks,
    recordings: migratedRecordings,
  };
}

function loadInitialVault(): StoredSystemVault | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = decryptVaultData<StoredSystemVault>(raw);
    return migrateVaultToFixedIds(parsed);
  } catch {
    return null;
  }
}

export default function App() {
  const [initialVault] = useState<StoredSystemVault | null>(() =>
    loadInitialVault()
  );

  const [members, setMembers] = useState<MemberProfile[]>(() => {
    const rawList = Array.isArray(initialVault?.members)
      ? initialVault.members
      : INITIAL_MEMBERS;
    return rawList.map((m) => ({
      ...m,
      university: normalizeUniversityName(m.university),
    }));
  });

  const [crmps, setCrmps] = useState<CRMPProfile[]>(() =>
    Array.isArray(initialVault?.crmps) ? initialVault.crmps : INITIAL_CRMPS
  );

  const [admins, setAdmins] = useState<AdminProfile[]>(() =>
    Array.isArray(initialVault?.admins) ? initialVault.admins : INITIAL_ADMINS
  );

  const [drafts, setDrafts] = useState<DraftSubmission[]>(() =>
    Array.isArray(initialVault?.drafts) ? initialVault.drafts : INITIAL_DRAFTS
  );

  const [checklists, setChecklists] = useState<WeeklyChecklist[]>(() =>
    Array.isArray(initialVault?.checklists)
      ? initialVault.checklists
      : INITIAL_WEEKLY_CHECKLISTS
  );

  const [recordings, setRecordings] = useState<ClassRecording[]>(() =>
    Array.isArray(initialVault?.recordings)
      ? initialVault.recordings
      : INITIAL_RECORDINGS
  );

  const [thesisTalks, setThesisTalks] = useState<ThesisTalkItem[]>(() =>
    Array.isArray(initialVault?.thesisTalks)
      ? initialVault.thesisTalks
      : INITIAL_THESIS_TALKS
  );

  const [vcVotes, setVcVotes] = useState<VCVoteRecord[]>(() =>
    Array.isArray(initialVault?.vcVotes)
      ? initialVault.vcVotes
      : INITIAL_VC_VOTES
  );

  const [vcSettings, setVcSettings] = useState<VCSystemSettings>(() =>
    initialVault?.vcSettings ? initialVault.vcSettings : INITIAL_VC_SETTINGS
  );

  const [crmpSchedules, setCrmpSchedules] = useState<CRMPDutySchedule[]>(() =>
    Array.isArray(initialVault?.crmpSchedules)
      ? initialVault.crmpSchedules
      : INITIAL_CRMP_SCHEDULES
  );

  const [universities, setUniversities] = useState<string[]>(() => {
    const saved = initialVault?.universities;
    if (Array.isArray(saved) && saved.length > 0) {
      const normalizedSaved = saved.map((u) => normalizeUniversityName(u));
      return Array.from(
        new Set([...DEFAULT_MALAYSIA_UNIVERSITIES, ...normalizedSaved])
      );
    }
    return DEFAULT_MALAYSIA_UNIVERSITIES;
  });

  const handleAddUniversity = (newUni: string) => {
    const clean = normalizeUniversityName(sanitizeDataPayload(newUni.trim()));
    if (!clean) return;
    setUniversities((prev) => {
      const exists = prev.some((u) => u.toLowerCase() === clean.toLowerCase());
      if (exists) return prev;
      return [...prev, clean];
    });
  };

  const [currentUsername, setCurrentUsername] = useState<string | null>(() => {
    try {
      const savedSession = sessionStorage.getItem(ACTIVE_USER_SESSION_KEY);
      if (!savedSession) return null;
      return normalizeShortMemberCode(savedSession);
    } catch {
      return null;
    }
  });
  const [securityToast, setSecurityToast] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (currentUsername) {
        sessionStorage.setItem(ACTIVE_USER_SESSION_KEY, currentUsername);
      } else {
        sessionStorage.removeItem(ACTIVE_USER_SESSION_KEY);
      }
    } catch {
      // ignore sessionStorage error
    }
  }, [currentUsername]);

  // Global Security Shield: Disable Right-Click (Context Menu), DevTools & Source Code Extraction Shortcuts
  useEffect(() => {
    let toastTimer: ReturnType<typeof setTimeout> | null = null;

    const triggerSecurityAlert = (reason: string) => {
      setSecurityToast(reason);
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        setSecurityToast(null);
      }, 3200);
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      triggerSecurityAlert(
        'Fungsi Klik Kanan Dinyahaktifkan: Kod & Data Ahli Dilindungi Sistem Keselamatan Dr. Roket.'
      );
      return false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // Block F12
      if (e.key === 'F12') {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityAlert(
          'Akses Pemeriksaan Kod (F12) Disekat oleh Sistem Keselamatan Dr. Roket.'
        );
        return false;
      }

      // Block Ctrl+Shift+I / J / C / K (Inspect / Console)
      if (
        isCtrlOrCmd &&
        e.shiftKey &&
        (key === 'I' || key === 'J' || key === 'C' || key === 'K')
      ) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityAlert(
          'Fungsi Inspect Element & Konsol Disekat bagi Melindungi Data Ahli.'
        );
        return false;
      }

      // Block Ctrl+U (View Source) & Ctrl+S (Save HTML)
      if (isCtrlOrCmd && (key === 'U' || key === 'S')) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityAlert(
          'Fungsi Muat Turun / Lihat Kod Sumber (View Source) Dinyahaktifkan.'
        );
        return false;
      }
    };

    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    document.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('dragstart', handleDragStart, true);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('dragstart', handleDragStart, true);
      if (toastTimer) clearTimeout(toastTimer);
    };
  }, []);

  // Auto-Logout on Inactivity (30 Minutes) to protect logged-in user data
  useEffect(() => {
    if (!currentUsername) return;
    let inactivityTimer: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        setCurrentUsername(null);
        setSecurityToast(
          'Sesi ditamatkan secara automatik selepas 30 minit tiada aktiviti demi keselamatan data.'
        );
      }, SESSION_TIMEOUT_MS);
    };

    const events = ['mousemove', 'keydown', 'click', 'touchstart'];
    events.forEach((ev) => window.addEventListener(ev, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(inactivityTimer);
      events.forEach((ev) => window.removeEventListener(ev, resetTimer));
    };
  }, [currentUsername]);

  // Load initial data from Supabase on mount (only if remote is newer than local vault)
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;

    fetchStateFromSupabase().then((remote) => {
      if (cancelled || !remote) return;
      const localUpdatedAt = initialVault?.updatedAt || 0;
      const remoteUpdatedAt =
        (remote as StoredSystemVault).updatedAt || 0;
      if (initialVault && remoteUpdatedAt <= localUpdatedAt) {
        return;
      }
      if (Array.isArray(remote.members)) {
        setMembers(
          remote.members.map((m) => ({
            ...m,
            university: normalizeUniversityName(m.university),
          }))
        );
      }
      if (Array.isArray(remote.crmps)) setCrmps(remote.crmps);
      if (Array.isArray(remote.admins)) setAdmins(remote.admins);
      if (Array.isArray(remote.drafts)) setDrafts(remote.drafts);
      if (Array.isArray(remote.checklists)) setChecklists(remote.checklists);
      if (Array.isArray(remote.recordings)) setRecordings(remote.recordings);
      if (Array.isArray(remote.thesisTalks)) setThesisTalks(remote.thesisTalks);
      if (Array.isArray(remote.vcVotes)) setVcVotes(remote.vcVotes);
      if (remote.vcSettings) setVcSettings(remote.vcSettings);
      if (Array.isArray(remote.crmpSchedules))
        setCrmpSchedules(remote.crmpSchedules);
      if (Array.isArray(remote.universities) && remote.universities.length) {
        const normalizedRemoteUnis = remote.universities.map((u) =>
          normalizeUniversityName(u)
        );
        setUniversities(
          Array.from(
            new Set([...DEFAULT_MALAYSIA_UNIVERSITIES, ...normalizedRemoteUnis])
          )
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [initialVault]);

  // Encrypted & Integrity-Signed Vault Persistence + Auto-Sync to Supabase
  useEffect(() => {
    const payload = {
      updatedAt: Date.now(),
      members,
      crmps,
      admins,
      drafts,
      checklists,
      recordings,
      thesisTalks,
      vcVotes,
      vcSettings,
      crmpSchedules,
      universities,
    };

    try {
      const encryptedPayload = encryptVaultData(payload);
      if (encryptedPayload) {
        localStorage.setItem(STORAGE_KEY, encryptedPayload);
      }
    } catch {
      // ignore storage quota errors
    }

    if (!isSupabaseConfigured) return;
    const syncTimer = setTimeout(() => {
      syncStateToSupabase(payload);
    }, 500);

    return () => clearTimeout(syncTimer);
  }, [
    members,
    crmps,
    admins,
    drafts,
    checklists,
    recordings,
    thesisTalks,
    vcVotes,
    vcSettings,
    crmpSchedules,
    universities,
  ]);

  // --- AUTH HANDLERS ---
  const handleLogin = (rawUsername: string, rawPassword?: string): boolean => {
    const clean = rawUsername.trim();
    const cleanLower = clean.toLowerCase();
    const normalizedInputLower = normalizeShortMemberCode(clean).toLowerCase();
    const passInput = (rawPassword ?? 'drroket2026').trim();

    // Log masuk menggunakan ID Pengguna sahaja (cth: DR0001, CRMP001, admin001)
    const matchedMember = members.find(
      (m) =>
        m.username.toLowerCase() === cleanLower ||
        m.username.toLowerCase() === normalizedInputLower
    );
    if (matchedMember) {
      const expectedPass = matchedMember.password || 'drroket2026';
      if (passInput !== expectedPass) return false;
      setCurrentUsername(matchedMember.username);
      return true;
    }

    const matchedCrmp = crmps.find(
      (c) => c.username.toLowerCase() === cleanLower
    );
    if (matchedCrmp) {
      const expectedPass = matchedCrmp.password || 'drroket2026';
      if (passInput !== expectedPass) return false;
      setCurrentUsername(matchedCrmp.username);
      return true;
    }

    const matchedAdmin = admins.find(
      (a) => a.username.toLowerCase() === cleanLower
    );
    if (matchedAdmin) {
      const expectedPass = matchedAdmin.password || 'drroket2026';
      if (passInput !== expectedPass) return false;
      setCurrentUsername(matchedAdmin.username);
      return true;
    }

    return false;
  };

  const handleResetUserPassword = (
    usernameOrEmail: string,
    tempPassword: string
  ): {
    found: boolean;
    username?: string;
    name?: string;
    email?: string;
    roleLabel?: string;
  } => {
    const clean = sanitizeDataPayload(usernameOrEmail.trim().toLowerCase());
    const mappedLegacy = LEGACY_USERNAME_MAP[clean.toUpperCase()]?.toLowerCase();
    const cleanTemp = sanitizeDataPayload(tempPassword.trim());

    const matchedMember = members.find(
      (m) =>
        m.username.toLowerCase() === clean ||
        m.email.toLowerCase() === clean ||
        m.username.split('-')[0].toLowerCase() === clean ||
        (mappedLegacy && m.username.toLowerCase() === mappedLegacy)
    );
    if (matchedMember) {
      setMembers((prev) =>
        prev.map((m) =>
          m.id === matchedMember.id ? { ...m, password: cleanTemp } : m
        )
      );
      return {
        found: true,
        username: matchedMember.username,
        name: matchedMember.name,
        email: matchedMember.email,
        roleLabel: `Ahli Platinum (${matchedMember.package})`,
      };
    }

    const matchedCrmp = crmps.find(
      (c) =>
        c.username.toLowerCase() === clean || c.email.toLowerCase() === clean
    );
    if (matchedCrmp) {
      setCrmps((prev) =>
        prev.map((c) =>
          c.id === matchedCrmp.id ? { ...c, password: cleanTemp } : c
        )
      );
      return {
        found: true,
        username: matchedCrmp.username,
        name: matchedCrmp.name,
        email: matchedCrmp.email,
        roleLabel: 'Penyelaras CRMP',
      };
    }

    const matchedAdmin = admins.find(
      (a) =>
        a.username.toLowerCase() === clean || a.email.toLowerCase() === clean
    );
    if (matchedAdmin) {
      setAdmins((prev) =>
        prev.map((a) =>
          a.id === matchedAdmin.id ? { ...a, password: cleanTemp } : a
        )
      );
      return {
        found: true,
        username: matchedAdmin.username,
        name: matchedAdmin.name,
        email: matchedAdmin.email,
        roleLabel: 'Pentadbir Sistem (Admin)',
      };
    }

    return { found: false };
  };

  const handleRegisterMember = (data: {
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
  }): MemberProfile => {
    const generatedUsername = generateNextMemberUsername(
      data.package,
      members,
      data.name
    );

    const newMember: MemberProfile = {
      id: `mem-${Date.now()}`,
      username: generatedUsername,
      password: data.password || 'drroket2026',
      package: data.package,
      name: data.name,
      email: data.email,
      phone: data.phone,
      avatar: '',
      university: data.university,
      currentSemester: data.currentSemester,
      residence: data.residence,
      researchTitle: data.researchTitle,
      supervisor: data.supervisor,
      crmpId: data.crmpId,
      isActive: true,
      currentPhase: 'Early Registration',
      overallProgress: 10,
      platinumJourneyStep: 1,
      dates: {
        earlyRegistration: '2026-11-18',
        registerPD: '',
        dataCollectionAnalysis: '',
        nos: '',
        thesisSubmission: '',
        viva: '',
      },
      publications: [],
      thesisMap: [
        {
          id: `ch-${Date.now()}-1`,
          chapterNumber: 1,
          title: 'Bab 1: Pengenalan Kajian',
          progress: 20,
          status: 'Sedang Dideraf',
          pages: 8,
          lastUpdated: '2026-11-18',
        },
        {
          id: `ch-${Date.now()}-2`,
          chapterNumber: 2,
          title: 'Bab 2: Sorotan Literatur',
          progress: 0,
          status: 'Belum Mula',
          pages: 0,
          lastUpdated: '2026-11-18',
        },
        {
          id: `ch-${Date.now()}-3`,
          chapterNumber: 3,
          title: 'Bab 3: Metodologi Kajian',
          progress: 0,
          status: 'Belum Mula',
          pages: 0,
          lastUpdated: '2026-11-18',
        },
        {
          id: `ch-${Date.now()}-4`,
          chapterNumber: 4,
          title: 'Bab 4: Dapatan Kajian & Analisis',
          progress: 0,
          status: 'Belum Mula',
          pages: 0,
          lastUpdated: '2026-11-18',
        },
        {
          id: `ch-${Date.now()}-5`,
          chapterNumber: 5,
          title: 'Bab 5: Perbincangan & Kesimpulan',
          progress: 0,
          status: 'Belum Mula',
          pages: 0,
          lastUpdated: '2026-11-18',
        },
      ],
    };

    setMembers((prev) => [...prev, newMember]);
    return newMember;
  };

  // --- MEMBER MUTATIONS (Sanitized against XSS & Injection) ---
  const handleUpdateMember = (updated: MemberProfile) => {
    const clean = sanitizeDataPayload({
      ...updated,
      university: normalizeUniversityName(updated.university),
    });
    setMembers((prev) =>
      prev.map((m) =>
        m.id === clean.id ||
        m.username.toLowerCase() === clean.username.toLowerCase()
          ? clean
          : m
      )
    );
  };

  const handleUpdateCrmp = (updated: CRMPProfile) => {
    const clean = sanitizeDataPayload(updated);
    setCrmps((prev) =>
      prev.map((c) =>
        c.id === clean.id ||
        c.username.toLowerCase() === clean.username.toLowerCase()
          ? clean
          : c
      )
    );
  };

  const handleUpdateAdmin = (updated: AdminProfile) => {
    const clean = sanitizeDataPayload(updated);
    setAdmins((prev) =>
      prev.map((a) =>
        a.id === clean.id ||
        a.username.toLowerCase() === clean.username.toLowerCase()
          ? clean
          : a
      )
    );
  };

  const handleAddDraft = (draft: Omit<DraftSubmission, 'id'>) => {
    const clean = sanitizeDataPayload(draft);
    const created: DraftSubmission = {
      ...clean,
      id: `drf-${Date.now()}`,
    };
    setDrafts((prev) => [created, ...prev]);
  };

  const handleUpdateDraft = (updatedDraft: DraftSubmission) => {
    const clean = sanitizeDataPayload(updatedDraft);
    setDrafts((prev) =>
      prev.map((d) => (d.id === clean.id ? clean : d))
    );
  };

  const handleUpdateDraftFeedback = (draftId: string, feedback: string) => {
    const cleanFeedback = sanitizeDataPayload(feedback);
    setDrafts((prev) =>
      prev.map((d) =>
        d.id === draftId ? { ...d, crmpFeedback: cleanFeedback } : d
      )
    );
  };

  const handleSaveChecklist = (checklist: WeeklyChecklist) => {
    const clean = sanitizeDataPayload(checklist);
    setChecklists((prev) => {
      const exists = prev.some(
        (c) =>
          c.memberId === clean.memberId && c.startDate === clean.startDate
      );
      if (exists) {
        return prev.map((c) =>
          c.memberId === clean.memberId && c.startDate === clean.startDate
            ? clean
            : c
        );
      }
      return [...prev, clean];
    });
  };

  const handleSubmitVCVote = (vote: Omit<VCVoteRecord, 'id'>) => {
    const clean = sanitizeDataPayload(vote);
    setVcVotes((prev) => {
      const filtered = prev.filter(
        (v) =>
          !(
            v.date === clean.date &&
            v.memberUsername === clean.memberUsername
          )
      );
      return [{ ...clean, id: `vc-${Date.now()}` }, ...filtered];
    });
  };

  const handleApplyThesisTalk = (
    talk: Omit<ThesisTalkItem, 'id' | 'status' | 'joinLink'>
  ) => {
    const clean = sanitizeDataPayload(talk);
    const created: ThesisTalkItem = {
      ...clean,
      id: `tt-${Date.now()}`,
      status: 'Dalam Semakan',
      joinLink: 'https://zoom.us/j/98234124555',
    };
    setThesisTalks((prev) => [created, ...prev]);
  };

  // --- ADMIN MUTATIONS ---
  const handleChangeMemberPackageAndUsername = (
    memberId: string,
    newPackage: MemberPackage,
    newUsername: string
  ) => {
    const cleanUsername = sanitizeDataPayload(newUsername);
    const targetMember = members.find((m) => m.id === memberId);
    if (!targetMember) return;
    const oldUsername = targetMember.username;

    setMembers((prev) =>
      prev.map((m) =>
        m.id === memberId
          ? { ...m, package: newPackage, username: cleanUsername }
          : m
      )
    );

    if (oldUsername !== cleanUsername) {
      setDrafts((prev) =>
        prev.map((d) =>
          d.memberId === oldUsername ? { ...d, memberId: cleanUsername } : d
        )
      );
      setChecklists((prev) =>
        prev.map((c) =>
          c.memberId === oldUsername ? { ...c, memberId: cleanUsername } : c
        )
      );
      setVcVotes((prev) =>
        prev.map((v) =>
          v.memberUsername === oldUsername
            ? { ...v, memberUsername: cleanUsername }
            : v
        )
      );
      setThesisTalks((prev) =>
        prev.map((t) =>
          t.memberUsername === oldUsername
            ? { ...t, memberUsername: cleanUsername }
            : t
        )
      );
      setRecordings((prev) =>
        prev.map((r) => ({
          ...r,
          allowedMemberUsernames: r.allowedMemberUsernames.map((u) =>
            u === oldUsername ? cleanUsername : u
          ),
        }))
      );
      if (currentUsername === oldUsername) {
        setCurrentUsername(cleanUsername);
      }
    }
  };

  const handleAssignMemberCrmp = (memberId: string, crmpUsername: string) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, crmpId: crmpUsername } : m))
    );
  };

  const handleSaveRecording = (recording: ClassRecording) => {
    const clean = sanitizeDataPayload(recording);
    setRecordings((prev) => {
      const exists = prev.some((r) => r.id === clean.id);
      if (exists) {
        return prev.map((r) => (r.id === clean.id ? clean : r));
      }
      return [clean, ...prev];
    });
  };

  const handleDeleteRecording = (recordingId: string) => {
    setRecordings((prev) => prev.filter((r) => r.id !== recordingId));
  };

  const handleSaveCrmp = (crmp: CRMPProfile, isNew: boolean) => {
    const clean = sanitizeDataPayload(crmp);
    if (isNew) {
      setCrmps((prev) => [...prev, clean]);
    } else {
      setCrmps((prev) => prev.map((c) => (c.id === clean.id ? clean : c)));
    }
  };

  const handleDeleteCrmp = (crmpId: string) => {
    setCrmps((prev) => prev.filter((c) => c.id !== crmpId));
  };

  const handleSaveSchedule = (schedule: CRMPDutySchedule, isNew: boolean) => {
    const clean = sanitizeDataPayload(schedule);
    if (isNew) {
      setCrmpSchedules((prev) => [clean, ...prev]);
    } else {
      setCrmpSchedules((prev) =>
        prev.map((s) => (s.id === clean.id ? clean : s))
      );
    }
  };

  const handleDeleteSchedule = (scheduleId: string) => {
    setCrmpSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
  };

  const handleUpdateThesisTalk = (talk: ThesisTalkItem) => {
    const clean = sanitizeDataPayload(talk);
    setThesisTalks((prev) => prev.map((t) => (t.id === clean.id ? clean : t)));
  };

  const renderActiveScreen = () => {
    if (!currentUsername) {
      return (
        <AuthView
          members={members}
          crmps={crmps}
          admins={admins}
          onLogin={handleLogin}
          onRegisterMember={handleRegisterMember}
          onResetUserPassword={handleResetUserPassword}
        />
      );
    }

    const activeAdmin = admins.find(
      (a) => a.username.toLowerCase() === currentUsername.toLowerCase()
    );
    if (activeAdmin) {
      return (
        <AdminDashboard
          admin={activeAdmin}
          members={members}
          crmps={crmps}
          recordings={recordings}
          schedules={crmpSchedules}
          thesisTalks={thesisTalks}
          vcSettings={vcSettings}
          onChangeMemberPackageAndUsername={handleChangeMemberPackageAndUsername}
          onAssignMemberCrmp={handleAssignMemberCrmp}
          onSaveRecording={handleSaveRecording}
          onDeleteRecording={handleDeleteRecording}
          onSaveCrmp={handleSaveCrmp}
          onDeleteCrmp={handleDeleteCrmp}
          onSaveSchedule={handleSaveSchedule}
          onDeleteSchedule={handleDeleteSchedule}
          onUpdateThesisTalk={handleUpdateThesisTalk}
          onUpdateVcSettings={(s) => setVcSettings(sanitizeDataPayload(s))}
          onUpdateAdmin={handleUpdateAdmin}
          onUpdateMember={handleUpdateMember}
          onRegisterMember={handleRegisterMember}
          onLogout={() => setCurrentUsername(null)}
        />
      );
    }

    const activeCrmp = crmps.find(
      (c) => c.username.toLowerCase() === currentUsername.toLowerCase()
    );
    if (activeCrmp) {
      return (
        <CRMPDashboard
          crmp={activeCrmp}
          allCrmps={crmps}
          allMembers={members}
          drafts={drafts}
          checklists={checklists}
          vcVotes={vcVotes}
          vcSettings={vcSettings}
          schedules={crmpSchedules}
          onUpdateMember={handleUpdateMember}
          onUpdateDraftFeedback={handleUpdateDraftFeedback}
          onUpdateCrmp={handleUpdateCrmp}
          onUpdateVcSettings={(s) => setVcSettings(sanitizeDataPayload(s))}
          onLogout={() => setCurrentUsername(null)}
        />
      );
    }

    const activeMember = members.find(
      (m) => m.username.toLowerCase() === currentUsername.toLowerCase()
    );
    if (activeMember) {
      return (
        <MemberDashboard
          member={activeMember}
          allMembers={members}
          crmps={crmps}
          drafts={drafts}
          checklists={checklists}
          recordings={recordings}
          thesisTalks={thesisTalks}
          vcVotes={vcVotes}
          vcSettings={vcSettings}
          crmpSchedules={crmpSchedules}
          universities={universities}
          onAddUniversity={handleAddUniversity}
          onUpdateMember={(updated) => {
            if (updated.university) {
              handleAddUniversity(updated.university);
            }
            handleUpdateMember(updated);
          }}
          onAddDraft={handleAddDraft}
          onUpdateDraft={handleUpdateDraft}
          onSaveChecklist={handleSaveChecklist}
          onSubmitVCVote={handleSubmitVCVote}
          onApplyThesisTalk={handleApplyThesisTalk}
          onLogout={() => setCurrentUsername(null)}
        />
      );
    }

    return (
      <AuthView
        members={members}
        crmps={crmps}
        admins={admins}
        onLogin={handleLogin}
        onRegisterMember={handleRegisterMember}
        onResetUserPassword={handleResetUserPassword}
      />
    );
  };

  return (
    <div onContextMenu={(e) => e.preventDefault()} className="relative">
      {renderActiveScreen()}

      {/* Notifikasi Perlindungan Keselamatan (Apabila Klik Kanan / Pintasan Kod Cuba Digunakan) */}
      {securityToast && (
        <div className="fixed bottom-4 right-4 z-[9999] max-w-md bg-slate-900 text-white border border-red-500/60 rounded-xl shadow-lg px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/40 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-xs leading-relaxed">
            <div className="font-bold text-red-300">
              PERLINDUNGAN KESELAMATAN SISTEM AKTIF
            </div>
            <div className="text-slate-200">{securityToast}</div>
          </div>
        </div>
      )}
    </div>
  );
}
