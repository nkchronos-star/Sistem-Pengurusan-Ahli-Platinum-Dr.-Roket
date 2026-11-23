import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  User,
  TrendingUp,
  CheckSquare,
  FileText,
  Map,
  CalendarCheck,
  Video,
  Mic,
  LogOut,
  Upload,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Lock,
  PanelLeftClose,
  PanelLeftOpen,
  Camera,
  Rocket,
  Bell,
  MessageCircle,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Link as LinkIcon,
  GraduationCap,
  Sparkles,
  KeyRound,
  BookOpen,
  Eye,
  StickyNote,
} from 'lucide-react';
import {
  ClassLearningPoint,
  ClassRecording,
  CRMPDutySchedule,
  CRMPProfile,
  DayOfWeek,
  DraftSubmission,
  MemberProfile,
  PhDPhase,
  Publication,
  StudyLevel,
  ThesisChapter,
  ThesisSubtopic,
  ThesisTalkItem,
  VCSystemSettings,
  VCVoteRecord,
  WeeklyChecklist,
} from '../types';
import { DAYS_OF_WEEK, PHD_PHASES } from '../data/initialData';
import {
  buildWhatsAppReminder,
  computeAutoWeekFromDate,
  createBlankWeeklyChecklist,
  DEFAULT_MALAYSIA_UNIVERSITIES,
  derivePhaseFromDates,
  getDayReminderScheduleLabel,
  getDefaultSubtopicsForChapter,
  getMalayDayNameFromDateStr,
  getMissingChecklistItemsForDay,
  getTodayDateStr,
  isWeekdayMondayToFriday,
  lookupMalaysiaPostcode,
  normalizeUniversityName,
  STANDARD_AVATAR_SIZE,
  syncDatesToMatchPhase,
} from '../utils/helpers';
import { AvatarUploadModal } from './AvatarUploadModal';
import {
  MasterPhdRoadmap,
  ScholarCharacterAvatar,
} from './MasterPhdRoadmap';
import { PasswordChangeModal } from './PasswordChangeModal';

interface MemberDashboardProps {
  member: MemberProfile;
  allMembers: MemberProfile[];
  crmps: CRMPProfile[];
  drafts: DraftSubmission[];
  checklists: WeeklyChecklist[];
  recordings: ClassRecording[];
  thesisTalks: ThesisTalkItem[];
  vcVotes: VCVoteRecord[];
  vcSettings: VCSystemSettings;
  crmpSchedules: CRMPDutySchedule[];
  universities?: string[];
  onAddUniversity?: (newUni: string) => void;
  onUpdateMember: (updated: MemberProfile) => void;
  onAddDraft: (draft: Omit<DraftSubmission, 'id'>) => void;
  onUpdateDraft?: (updatedDraft: DraftSubmission) => void;
  onSaveChecklist: (checklist: WeeklyChecklist) => void;
  onSubmitVCVote: (vote: Omit<VCVoteRecord, 'id'>) => void;
  onApplyThesisTalk: (
    talk: Omit<ThesisTalkItem, 'id' | 'status' | 'joinLink'>
  ) => void;
  onLogout: () => void;
}

type MemberTab =
  | 'overview'
  | 'profile'
  | 'roadmap'
  | 'publications'
  | 'checklist'
  | 'drafts'
  | 'thesis_map'
  | 'vc_attendance'
  | 'recordings'
  | 'thesis_talk';

// Current system date (Sentiasa mengikut tarikh semasa sebenar)
const TODAY_DATE_STR = getTodayDateStr();

export const MemberDashboard: React.FC<MemberDashboardProps> = ({
  member,
  allMembers,
  crmps,
  drafts,
  checklists,
  recordings,
  thesisTalks,
  vcVotes,
  vcSettings,
  universities = DEFAULT_MALAYSIA_UNIVERSITIES,
  onAddUniversity,
  onUpdateMember,
  onAddDraft,
  onUpdateDraft,
  onSaveChecklist,
  onSubmitVCVote,
  onApplyThesisTalk,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<MemberTab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const isHoldingRoom = member.package === 'Holding Room';

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const handleSaveMemberPassword = (newPassword: string) => {
    const updated = { ...member, ...profileForm, password: newPassword };
    setProfileForm(updated);
    onUpdateMember(updated);
    showToast('Kata laluan akaun anda telah berjaya dikemaskini.');
  };

  const memberCrmp = crmps.find((c) => c.username === member.crmpId);
  const memberDrafts = drafts
    .filter((d) => d.memberId === member.username)
    .sort((a, b) => b.draftNumber - a.draftNumber);
  const latestDraft = memberDrafts[0];

  // --- 1. PROFILE & PUBLICATION STATE ---
  const buildNormalizedProfileForm = (m: MemberProfile): MemberProfile => {
    const normalizedDates = {
      ...m.dates,
      convocation: m.dates.convocation || '2027-11-25',
    };
    const syncedPhaseInfo = derivePhaseFromDates(
      normalizedDates,
      TODAY_DATE_STR
    );
    return {
      ...m,
      university: normalizeUniversityName(m.university),
      studyLevel: m.studyLevel || 'PhD',
      researchField:
        m.researchField || 'Pendidikan & Inovasi Penyelidikan',
      supervisor2: m.supervisor2 || '',
      supervisor3: m.supervisor3 || '',
      address: m.address || m.residence.split(',')[0] || '',
      postcode: m.postcode || '',
      district: m.district || '',
      state: m.state || '',
      currentPhase: syncedPhaseInfo.phase,
      dates: normalizedDates,
    };
  };

  const [profileForm, setProfileForm] = useState<MemberProfile>(() =>
    buildNormalizedProfileForm(member)
  );
  const [showAddUniInput, setShowAddUniInput] = useState(false);
  const [newUniInput, setNewUniInput] = useState('');
  const [postcodeAutoMatched, setPostcodeAutoMatched] = useState(false);

  const commitProfileChanges = (
    patch: Partial<MemberProfile>
  ): MemberProfile => {
    const nextUniversity = normalizeUniversityName(
      patch.university ?? profileForm.university ?? member.university
    );
    const merged: MemberProfile = {
      ...member,
      ...profileForm,
      ...patch,
      university: nextUniversity,
    };
    setProfileForm(merged);
    onUpdateMember(merged);
    return merged;
  };

  // Pastikan Fasa Kajian (currentPhase) sentiasa selari dengan tarikh Master PhD Roadmap
  useEffect(() => {
    const synced = derivePhaseFromDates(member.dates, TODAY_DATE_STR);
    if (member.currentPhase !== synced.phase) {
      onUpdateMember({
        ...member,
        currentPhase: synced.phase,
      });
    }
  }, [
    member.id,
    member.currentPhase,
    member.dates.earlyRegistration,
    member.dates.registerPD,
    member.dates.dataCollectionAnalysis,
    member.dates.nos,
    member.dates.thesisSubmission,
    member.dates.viva,
    member.dates.convocation,
  ]);

  // Combine default + saved universities + current member's university in "Nama Penuh (Singkatan)" format
  const availableUniversities = Array.from(
    new Set(
      [
        ...universities,
        ...(allMembers.map((m) => m.university).filter(Boolean) as string[]),
        ...(profileForm.university ? [profileForm.university] : []),
      ].map((u) => normalizeUniversityName(u))
    )
  );

  const handleAddCustomUniversity = () => {
    const clean = normalizeUniversityName(newUniInput.trim());
    if (!clean) return;
    if (onAddUniversity) {
      onAddUniversity(clean);
    }
    commitProfileChanges({ university: clean });
    setNewUniInput('');
    setShowAddUniInput(false);
    showToast(
      `Universiti "${clean}" berjaya ditambah ke dalam senarai dropdown dan dipilih!`
    );
  };

  const handleAddressOrPostcodeChange = (
    newAddress: string,
    newPostcode: string
  ) => {
    const digits = newPostcode.replace(/\D/g, '').slice(0, 5);
    const matched = lookupMalaysiaPostcode(digits);
    const nextDistrict = matched ? matched.district : profileForm.district || '';
    const nextState = matched ? matched.state : profileForm.state || '';
    setPostcodeAutoMatched(Boolean(matched));

    const composedResidence = [
      newAddress.trim(),
      digits ? `${digits} ${nextDistrict}`.trim() : nextDistrict,
      nextState,
    ]
      .filter(Boolean)
      .join(', ');

    commitProfileChanges({
      address: newAddress,
      postcode: digits,
      district: nextDistrict,
      state: nextState,
      residence: composedResidence || profileForm.residence,
    });
  };

  const [pubModalOpen, setPubModalOpen] = useState(false);
  const [editingPub, setEditingPub] = useState<Publication | null>(null);
  const [pubTitle, setPubTitle] = useState('');
  const [pubType, setPubType] = useState<Publication['type']>('Artikel Jurnal');
  const [pubJournal, setPubJournal] = useState('');
  const [pubYear, setPubYear] = useState('2026');
  const [pubStatus, setPubStatus] =
    useState<Publication['status']>('Diterbitkan');
  const [pubLink, setPubLink] = useState('');

  const handleSaveAvatar = (newAvatar: string) => {
    commitProfileChanges({ avatar: newAvatar });
    showToast(
      'Gambar profil (300×300 px) berjaya dikemaskini dan disimpan.'
    );
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    commitProfileChanges(profileForm);
    showToast(
      'Maklumat Profil Diri berjaya dikemaskini.'
    );
  };

  const openAddPublication = () => {
    setEditingPub(null);
    setPubTitle('');
    setPubType('Artikel Jurnal');
    setPubJournal('');
    setPubYear('2026');
    setPubStatus('Diterbitkan');
    setPubLink('');
    setPubModalOpen(true);
  };

  const openEditPublication = (pub: Publication) => {
    setEditingPub(pub);
    setPubTitle(pub.title);
    setPubType(pub.type);
    setPubJournal(pub.journalOrPublisher);
    setPubYear(pub.year);
    setPubStatus(pub.status);
    setPubLink(pub.link || '');
    setPubModalOpen(true);
  };

  const handleSavePublication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pubTitle.trim()) return;
    let updatedPubs: Publication[];
    if (editingPub) {
      updatedPubs = member.publications.map((p) =>
        p.id === editingPub.id
          ? {
              ...p,
              title: pubTitle.trim(),
              type: pubType,
              journalOrPublisher: pubJournal.trim(),
              year: pubYear,
              status: pubStatus,
              link: pubLink.trim() || undefined,
            }
          : p
      );
    } else {
      const newPub: Publication = {
        id: `pub-${Date.now()}`,
        title: pubTitle.trim(),
        type: pubType,
        journalOrPublisher: pubJournal.trim(),
        year: pubYear,
        status: pubStatus,
        link: pubLink.trim() || undefined,
      };
      updatedPubs = [...member.publications, newPub];
    }
    commitProfileChanges({ publications: updatedPubs });
    setPubModalOpen(false);
    showToast(
      editingPub
        ? 'Senarai penerbitan berjaya dikemaskini.'
        : 'Penerbitan baharu berjaya ditambah.'
    );
  };

  const handleDeletePublication = (pubId: string) => {
    const updatedPubs = member.publications.filter((p) => p.id !== pubId);
    commitProfileChanges({ publications: updatedPubs });
    showToast('Rekod penerbitan telah dipadam.');
  };

  // --- 2. WEEKLY CHECKLIST STATE (TARIKH SEMASA, RESET AUTOMATIK MINGGU BAHARU & ARKIB MINGGU SEBELUM) ---
  const [checklistCalendarDate, setChecklistCalendarDate] =
    useState<string>(TODAY_DATE_STR);
  const currentWeekInfo = computeAutoWeekFromDate(TODAY_DATE_STR);
  const autoWeekInfo = computeAutoWeekFromDate(checklistCalendarDate);

  // Minggu sebelum (< startDate minggu semasa) boleh dilihat; hanya minggu semasa boleh di-tick
  const isCurrentWeek = autoWeekInfo.startDate === currentWeekInfo.startDate;
  const isPastWeek = autoWeekInfo.startDate < currentWeekInfo.startDate;

  // Senarai semua rekod checklist ahli ini (diisih daripada minggu terkini ke minggu terdahulu)
  const memberSavedChecklists = checklists
    .filter((c) => c.memberId === member.username)
    .sort((a, b) => b.startDate.localeCompare(a.startDate));

  // Cari rekod checklist khusus untuk minggu yang dipilih (mengikut memberId DAN startDate minggu tersebut)
  const existingChecklistForSelectedWeek = checklists.find(
    (c) =>
      c.memberId === member.username &&
      c.startDate === autoWeekInfo.startDate
  );

  const [checklistForm, setChecklistForm] = useState<WeeklyChecklist>(() =>
    existingChecklistForSelectedWeek
      ? existingChecklistForSelectedWeek
      : createBlankWeeklyChecklist(
          member.username,
          autoWeekInfo.startDate,
          autoWeekInfo.weekLabel
        )
  );

  // Apabila minggu berubah (contoh: masuk minggu baharu atau ahli klik minggu sebelum),
  // muatkan rekod minggu tersebut atau reset kepada checklist baharu yang kosong jika minggu baharu belum ada rekod
  useEffect(() => {
    const matched = checklists.find(
      (c) =>
        c.memberId === member.username &&
        c.startDate === autoWeekInfo.startDate
    );
    if (matched) {
      setChecklistForm(matched);
    } else {
      setChecklistForm(
        createBlankWeeklyChecklist(
          member.username,
          autoWeekInfo.startDate,
          autoWeekInfo.weekLabel
        )
      );
    }
  }, [member.username, autoWeekInfo.startDate, autoWeekInfo.weekLabel, checklists]);

  const handleCalendarDateChange = (newDateStr: string) => {
    if (!newDateStr) return;
    setChecklistCalendarDate(newDateStr);
  };

  const handleReturnToCurrentWeek = () => {
    setChecklistCalendarDate(TODAY_DATE_STR);
    showToast(`Kembali ke minggu semasa (${currentWeekInfo.weekLabel}).`);
  };

  const handleDailyFieldChange = (
    day: DayOfWeek,
    field: 'dailyWinCompleted' | 'dailyFokusCompleted',
    value: boolean
  ) => {
    if (!isCurrentWeek) {
      showToast(
        'Minggu sebelum dan minggu selepas tidak boleh di-tick. Sila pilih minggu semasa.'
      );
      return;
    }
    setChecklistForm((prev) => {
      const updated: WeeklyChecklist = {
        ...prev,
        id: `chk-${member.username}-${currentWeekInfo.startDate}`,
        memberId: member.username,
        startDate: currentWeekInfo.startDate,
        weekLabel: currentWeekInfo.weekLabel,
        dailyEntries: {
          ...prev.dailyEntries,
          [day]: {
            ...prev.dailyEntries[day],
            [field]: value,
          },
        },
      };
      onSaveChecklist(updated);
      return updated;
    });
  };

  const handleChecklistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCurrentWeek) return;
    const updated: WeeklyChecklist = {
      ...checklistForm,
      id: `chk-${member.username}-${currentWeekInfo.startDate}`,
      memberId: member.username,
      startDate: currentWeekInfo.startDate,
      weekLabel: currentWeekInfo.weekLabel,
    };
    onSaveChecklist(updated);
    showToast(
      `Checklist Submission (${currentWeekInfo.weekLabel}) telah disimpan.`
    );
  };

  // Semak item yang belum di-tick untuk hari yang dipilih pada kalendar
  const activeDayOfWeek = autoWeekInfo.selectedDayName;
  const missingItemsForSelectedDay = getMissingChecklistItemsForDay(
    checklistForm,
    activeDayOfWeek
  );
  const crmpDisplayLabel = memberCrmp
    ? `${member.crmpId} - ${memberCrmp.name}`
    : member.crmpId;
  const waReminder = buildWhatsAppReminder(
    member.name,
    member.username,
    member.phone,
    activeDayOfWeek,
    autoWeekInfo.weekLabel,
    missingItemsForSelectedDay,
    crmpDisplayLabel
  );

  // --- 3. NAIK DRAF STATE ---
  const nextDraftNum = (latestDraft?.draftNumber || 0) + 1;
  const [draftTtb, setDraftTtb] = useState(
    latestDraft?.ttb || 'Julai 2027 (Semester 5)'
  );
  const [draftNum, setDraftNum] = useState<number>(nextDraftNum);
  const [draftDate, setDraftDate] = useState(TODAY_DATE_STR);
  const [draftPages, setDraftPages] = useState<number>(
    (latestDraft?.pageCount || 120) + 15
  );
  const [draftWords, setDraftWords] = useState<number>(
    (latestDraft?.wordCount || 30000) + 3500
  );
  const [sujud11x, setSujud11x] = useState(true);
  const [twoHours7Min, setTwoHours7Min] = useState(true);
  const [updThesisMap, setUpdThesisMap] = useState(true);
  const [tdr013Checked, setTdr013Checked] = useState(true);
  const [tdr010Checked, setTdr010Checked] = useState(true);
  const [fbShareCrmp, setFbShareCrmp] = useState(true);
  const [targetNextDraft, setTargetNextDraft] = useState('');
  const [updAffirmation, setUpdAffirmation] = useState(true);
  const [affirmationText, setAffirmationText] = useState(
    latestDraft?.affirmationText ||
      'Tesis saya siap dengan cemerlang dan memberi manfaat besar sebelum tarikh TTB!'
  );
  const [draftLinkInput, setDraftLinkInput] = useState('');
  const [draftMemberNotes, setDraftMemberNotes] = useState('');
  const [selectedDraftDetailId, setSelectedDraftDetailId] = useState<
    string | null
  >(null);
  const [draftNotesEditMap, setDraftNotesEditMap] = useState<
    Record<string, string>
  >({});
  const [draftLinksEditMap, setDraftLinksEditMap] = useState<
    Record<string, string>
  >({});

  const normalizeOptionalUrl = (raw: string): string => {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    return trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `https://${trimmed}`;
  };

  const handleAddDraftSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLink = normalizeOptionalUrl(draftLinkInput);
    onAddDraft({
      memberId: member.username,
      ttb: draftTtb,
      draftNumber: Number(draftNum),
      date: draftDate,
      pageCount: Number(draftPages),
      wordCount: Number(draftWords),
      sujudSyukur11x: sujud11x,
      twoHoursSevenMinutes: twoHours7Min,
      updateThesisMap: updThesisMap,
      tdr013: tdr013Checked,
      tdr010: draftNum >= 1 && draftNum <= 10 ? tdr010Checked : false,
      fbShareWithCrmp: fbShareCrmp,
      targetForNextDraft:
        targetNextDraft.trim() || `Draf ${Number(draftNum) + 1} dalam 2 minggu`,
      updateAffirmationCard: updAffirmation,
      affirmationText,
      draftLink: cleanLink || undefined,
      memberNotes: draftMemberNotes.trim(),
    });
    setDraftNum(Number(draftNum) + 1);
    setTargetNextDraft('');
    setDraftLinkInput('');
    setDraftMemberNotes('');
    showToast(
      `Tahniah! Maklumat kenaikan Draf ke-${draftNum} telah berjaya direkodkan.`
    );
  };

  const handleSaveExistingDraftNote = (draft: DraftSubmission) => {
    const newNote =
      draftNotesEditMap[draft.id] !== undefined
        ? draftNotesEditMap[draft.id]
        : draft.memberNotes || '';
    const rawLink =
      draftLinksEditMap[draft.id] !== undefined
        ? draftLinksEditMap[draft.id]
        : draft.draftLink || '';
    const cleanLink = normalizeOptionalUrl(rawLink);
    if (onUpdateDraft) {
      onUpdateDraft({
        ...draft,
        draftLink: cleanLink || undefined,
        memberNotes: newNote.trim(),
      });
    }
    showToast(
      `Link & catatan untuk Draf Ke-${draft.draftNumber} telah berjaya disimpan.`
    );
  };

  // --- 4. THESIS MAP UPDATE STATE (Table of Contents: Tajuk Kajian -> Bab -> Subtopik -> Visual Map) ---
  const [researchTitleMapInput, setResearchTitleMapInput] = useState<string>(
    member.researchTitle
  );
  const [chapters, setChapters] = useState<ThesisChapter[]>(() =>
    member.thesisMap.map((ch) => ({
      ...ch,
      subtopics:
        ch.subtopics && ch.subtopics.length > 0
          ? ch.subtopics
          : getDefaultSubtopicsForChapter(
              ch.chapterNumber,
              ch.status === 'Selesai' || ch.progress === 100
            ),
    }))
  );
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [newSubtopicInputs, setNewSubtopicInputs] = useState<
    Record<string, string>
  >({});

  // Sync local profileForm, researchTitleMapInput & chapters when member prop updates externally
  useEffect(() => {
    setProfileForm(buildNormalizedProfileForm(member));
    setResearchTitleMapInput(member.researchTitle);
    setChapters(
      member.thesisMap.map((ch) => ({
        ...ch,
        subtopics:
          ch.subtopics && ch.subtopics.length > 0
            ? ch.subtopics
            : getDefaultSubtopicsForChapter(
                ch.chapterNumber,
                ch.status === 'Selesai' || ch.progress === 100
              ),
      }))
    );
  }, [member]);

  const syncThesisMapLive = (
    nextChapters: ThesisChapter[],
    nextResearchTitle?: string
  ) => {
    setChapters(nextChapters);
    const avgProgress = Math.round(
      nextChapters.reduce((acc, c) => acc + Number(c.progress), 0) /
        Math.max(1, nextChapters.length)
    );
    const resolvedTitle =
      (nextResearchTitle ?? researchTitleMapInput).trim() ||
      profileForm.researchTitle ||
      member.researchTitle;
    commitProfileChanges({
      researchTitle: resolvedTitle,
      thesisMap: nextChapters,
      overallProgress: avgProgress,
    });
  };

  const recalculateChapterProgressFromSubtopics = (
    subs: ThesisSubtopic[],
    currentProgress: number
  ): { progress: number; status: ThesisChapter['status'] } => {
    if (!subs || subs.length === 0) {
      return {
        progress: currentProgress,
        status:
          currentProgress === 100
            ? 'Selesai'
            : currentProgress > 0
            ? 'Sedang Dideraf'
            : 'Belum Mula',
      };
    }
    const doneCount = subs.filter((s) => s.completed).length;
    const pct = Math.round((doneCount / subs.length) * 100);
    const status: ThesisChapter['status'] =
      pct === 100 ? 'Selesai' : pct > 0 ? 'Sedang Dideraf' : 'Belum Mula';
    return { progress: pct, status };
  };

  const handleUpdateChapter = (
    chapterId: string,
    field: keyof ThesisChapter,
    value: string | number
  ) => {
    const updated = chapters.map((ch) =>
      ch.id === chapterId
        ? {
            ...ch,
            [field]: value,
            lastUpdated: TODAY_DATE_STR,
          }
        : ch
    );
    syncThesisMapLive(updated);
  };

  const handleAddSubtopic = (chapterId: string) => {
    const rawTitle = (newSubtopicInputs[chapterId] || '').trim();
    if (!rawTitle) return;
    const updated = chapters.map((ch) => {
      if (ch.id !== chapterId) return ch;
      const existingSubs = ch.subtopics || [];
      const nextIdx = existingSubs.length + 1;
      const newSub: ThesisSubtopic = {
        id: `sub-${ch.chapterNumber}-${Date.now()}`,
        code: `${ch.chapterNumber}.${nextIdx}`,
        title: rawTitle,
        completed: false,
      };
      const nextSubs = [...existingSubs, newSub];
      const recalc = recalculateChapterProgressFromSubtopics(
        nextSubs,
        ch.progress
      );
      return {
        ...ch,
        subtopics: nextSubs,
        progress: recalc.progress,
        status: recalc.status,
        lastUpdated: TODAY_DATE_STR,
      };
    });
    syncThesisMapLive(updated);
    setNewSubtopicInputs((prev) => ({ ...prev, [chapterId]: '' }));
  };

  const handleToggleSubtopicComplete = (
    chapterId: string,
    subtopicId: string
  ) => {
    const updated = chapters.map((ch) => {
      if (ch.id !== chapterId) return ch;
      const nextSubs = (ch.subtopics || []).map((s) =>
        s.id === subtopicId ? { ...s, completed: !s.completed } : s
      );
      const recalc = recalculateChapterProgressFromSubtopics(
        nextSubs,
        ch.progress
      );
      return {
        ...ch,
        subtopics: nextSubs,
        progress: recalc.progress,
        status: recalc.status,
        lastUpdated: TODAY_DATE_STR,
      };
    });
    syncThesisMapLive(updated);
  };

  const handleUpdateSubtopicTitle = (
    chapterId: string,
    subtopicId: string,
    newTitle: string
  ) => {
    const updated = chapters.map((ch) => {
      if (ch.id !== chapterId) return ch;
      const nextSubs = (ch.subtopics || []).map((s) =>
        s.id === subtopicId ? { ...s, title: newTitle } : s
      );
      return { ...ch, subtopics: nextSubs, lastUpdated: TODAY_DATE_STR };
    });
    syncThesisMapLive(updated);
  };

  const handleDeleteSubtopic = (chapterId: string, subtopicId: string) => {
    const updated = chapters.map((ch) => {
      if (ch.id !== chapterId) return ch;
      const filtered = (ch.subtopics || [])
        .filter((s) => s.id !== subtopicId)
        .map((s, idx) => ({
          ...s,
          code: `${ch.chapterNumber}.${idx + 1}`,
        }));
      const recalc = recalculateChapterProgressFromSubtopics(
        filtered,
        ch.progress
      );
      return {
        ...ch,
        subtopics: filtered,
        progress: recalc.progress,
        status: recalc.status,
        lastUpdated: TODAY_DATE_STR,
      };
    });
    syncThesisMapLive(updated);
  };

  const handleAddExtraChapter = () => {
    const nextNum = chapters.length + 1;
    const newCh: ThesisChapter = {
      id: `ch-${Date.now()}`,
      chapterNumber: nextNum,
      title:
        newChapterTitle.trim() ||
        `Bab ${nextNum}: Dapatan / Perbincangan Tambahan`,
      progress: 0,
      status: 'Belum Mula',
      pages: 0,
      lastUpdated: TODAY_DATE_STR,
      notes: '',
      subtopics: getDefaultSubtopicsForChapter(nextNum, false),
    };
    const updated = [...chapters, newCh];
    setNewChapterTitle('');
    syncThesisMapLive(updated);
    showToast(
      `Bab ${nextNum} bersama subtopik telah ditambah ke dalam Thesis Map.`
    );
  };

  const handleRemoveExtraChapter = (chapterId: string) => {
    if (chapters.length <= 5) return;
    const filtered = chapters
      .filter((c) => c.id !== chapterId)
      .map((c, idx) => ({
        ...c,
        chapterNumber: idx + 1,
        subtopics: (c.subtopics || []).map((s, sIdx) => ({
          ...s,
          code: `${idx + 1}.${sIdx + 1}`,
        })),
      }));
    syncThesisMapLive(filtered);
    showToast('Bab tambahan telah dipadam.');
  };

  const handleSaveThesisMap = () => {
    syncThesisMapLive(chapters, researchTitleMapInput);
    showToast(
      'Thesis Map (Tajuk Kajian, Bab & Subtopik) telah dikemaskini dan dijana sebagai Peta Visual!'
    );
  };

  // --- 5. VOTE VC & KEHADIRAN STATE (HANYA 1 BUTANG HADIR + CATATAN PILIHAN) ---
  // Jika ahli tidak tekan butang Hadir, bermaksud Tidak Hadir secara automatik.
  const todayDayName = getMalayDayNameFromDateStr(TODAY_DATE_STR);
  const isTodayWeekday = isWeekdayMondayToFriday(TODAY_DATE_STR);
  const isTodaySetOffByAdmin = vcSettings.offDates.includes(TODAY_DATE_STR);

  // Check if current local time is >= 18:20 (6:20 PM) or if forceOpenVoteWindow is enabled
  const nowDate = new Date();
  const currentMinutesSinceMidnight =
    nowDate.getHours() * 60 + nowDate.getMinutes();
  const isPast620PM =
    currentMinutesSinceMidnight >= 18 * 60 + 20 ||
    vcSettings.forceOpenVoteWindow;

  const isVcVoteOpenToday =
    !isHoldingRoom &&
    isTodayWeekday &&
    !isTodaySetOffByAdmin &&
    isPast620PM;

  const myVotes = vcVotes.filter((v) => v.memberUsername === member.username);
  const todayVoteRecord = myVotes.find((v) => v.date === TODAY_DATE_STR);
  const [vcTakeaway, setVcTakeaway] = useState(
    todayVoteRecord?.takeawayNote || ''
  );
  const [selectedNoteVote, setSelectedNoteVote] = useState<VCVoteRecord | null>(
    null
  );
  const attendancePct = isHoldingRoom
    ? 0
    : Math.min(100, 85 + myVotes.length * 5);

  const handleVoteVCSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isVcVoteOpenToday || isHoldingRoom) return;
    const nowTime =
      todayVoteRecord?.checkInTime ||
      new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    onSubmitVCVote({
      date: TODAY_DATE_STR, // Dikunci kepada hari semasa sahaja
      sessionName: vcSettings.dailyTheme, // Tema yang dimasukkan oleh CRMP
      memberUsername: member.username,
      memberName: member.name,
      crmpId: member.crmpId,
      status: 'Hadir Live', // Hanya ada butang Hadir sahaja
      checkInTime: nowTime,
      takeawayNote: vcTakeaway.trim(),
    });
    showToast(
      todayVoteRecord
        ? `Catatan kehadiran VC Hari Ini (${TODAY_DATE_STR}) berjaya dikemaskini!`
        : `Alhamdulillah! Kehadiran VC Hari Ini (${TODAY_DATE_STR}) telah disahkan sebagai HADIR.`
    );
  };

  // --- 6. THESIS TALK APPLICATION STATE ---
  const [ttTitle, setTtTitle] = useState('');
  const [ttAbstract, setTtAbstract] = useState('');
  const [ttDate, setTtDate] = useState('2026-12-05');
  const [ttTime, setTtTime] = useState('09:00 AM - 10:30 AM');

  const handleApplyThesisTalk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ttTitle.trim()) return;
    onApplyThesisTalk({
      memberUsername: member.username,
      memberName: member.name,
      university: member.university,
      title: ttTitle.trim(),
      abstract:
        ttAbstract.trim() ||
        'Perkongsian perjalanan penulisan tesis dan strategi pengurusan draf.',
      proposedDate: ttDate,
      scheduledTime: ttTime,
      moderatorCrmpId: member.crmpId,
    });
    setTtTitle('');
    setTtAbstract('');
    showToast('Permohonan Thesis Talk anda telah dihantar untuk kelulusan.');
  };

  // Pecahan Bahan & Video Mengikut Tahun
  const [selectedRecordingYear, setSelectedRecordingYear] =
    useState<string>('ALL');

  const getRecordingYear = (dateStr?: string): string => {
    const match = (dateStr || '').trim().match(/^(\d{4})/);
    return match ? match[1] : '2026';
  };

  const availableRecordingYears: string[] = Array.from(
    new Set<string>(recordings.map((r) => getRecordingYear(r.date)))
  ).sort((a, b) => b.localeCompare(a));

  const filteredRecordingsByYear =
    selectedRecordingYear === 'ALL'
      ? recordings
      : recordings.filter(
          (r) => getRecordingYear(r.date) === selectedRecordingYear
        );

  // Filter Recordings based on Package & Explicit Member Access
  const zoomRecordings = filteredRecordingsByYear.filter(
    (r) => r.category === 'zoom'
  );
  const basicRecordings = filteredRecordingsByYear.filter(
    (r) => r.category === 'basic'
  );
  const paidRecordings = filteredRecordingsByYear.filter(
    (r) => r.category === 'paid'
  );

  const groupRecordingsByYear = (
    list: ClassRecording[]
  ): { year: string; items: ClassRecording[] }[] => {
    const years: string[] = Array.from(
      new Set<string>(list.map((r) => getRecordingYear(r.date)))
    ).sort((a, b) => b.localeCompare(a));
    return years.map((yr) => ({
      year: yr,
      items: list
        .filter((r) => getRecordingYear(r.date) === yr)
        .sort((a, b) => b.date.localeCompare(a.date)),
    }));
  };

  const canAccessZoom = (rec: ClassRecording) => {
    if (isHoldingRoom) return false;
    if (rec.allowedMemberUsernames.includes(member.username)) return true;
    if (member.package === 'Premier') return true;
    if (
      (member.package === 'Elite Plus' || member.package === 'Elite') &&
      rec.zoomFrequency === 'Bulanan'
    ) {
      return true;
    }
    return rec.allowedPackages.includes(member.package);
  };

  const canAccessBasic = (rec: ClassRecording) => {
    // Pakej Holding Room tidak boleh tengok kelas percuma (Basic)
    if (isHoldingRoom) return false;
    return (
      rec.allowedMemberUsernames.includes(member.username) ||
      rec.allowedPackages.includes(member.package)
    );
  };

  const canAccessPaid = (rec: ClassRecording) => {
    return rec.allowedMemberUsernames.includes(member.username);
  };

  // --- 7. LEARNING POINT KELAS YANG DIHADIRI (HANYA MASUKKAN LINK) ---
  const memberLearningPoints: ClassLearningPoint[] =
    member.learningPoints || [];
  const [lpEditingRecId, setLpEditingRecId] = useState<string | null>(null);
  const [lpLinkInput, setLpLinkInput] = useState<string>('');
  const [quickLpRecId, setQuickLpRecId] = useState<string>(
    recordings[0]?.id || ''
  );
  const [quickLpLink, setQuickLpLink] = useState<string>('');

  const getLearningPointForRecording = (
    recId: string
  ): ClassLearningPoint | undefined => {
    return memberLearningPoints.find((lp) => lp.recordingId === recId);
  };

  const handleOpenLearningPointEditor = (rec: ClassRecording) => {
    const existing = getLearningPointForRecording(rec.id);
    setLpEditingRecId(rec.id);
    setLpLinkInput(existing?.link || '');
  };

  const saveLearningPointForRec = (rec: ClassRecording, rawLink: string) => {
    const trimmed = rawLink.trim();
    if (!trimmed) {
      showToast('Sila masukkan pautan (link) Learning Point anda.');
      return;
    }
    const normalizedLink =
      trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? trimmed
        : `https://${trimmed}`;

    const existingList = member.learningPoints || [];
    const exists = existingList.some((lp) => lp.recordingId === rec.id);
    const nextEntry: ClassLearningPoint = {
      id: exists
        ? existingList.find((lp) => lp.recordingId === rec.id)!.id
        : `lp-${Date.now()}`,
      recordingId: rec.id,
      recordingTitle: rec.title,
      category: rec.category,
      classDate: rec.date,
      link: normalizedLink,
      updatedAt: TODAY_DATE_STR,
    };

    const updatedList = exists
      ? existingList.map((lp) => (lp.recordingId === rec.id ? nextEntry : lp))
      : [nextEntry, ...existingList];

    commitProfileChanges({ learningPoints: updatedList });
    setLpEditingRecId(null);
    setLpLinkInput('');
    showToast(
      `Link Learning Point bagi "${rec.title}" telah disimpan! Anda boleh baca bila-bila masa.`
    );
  };

  const handleQuickAddLearningPoint = (e: React.FormEvent) => {
    e.preventDefault();
    const targetRec = recordings.find((r) => r.id === quickLpRecId);
    if (!targetRec) return;
    saveLearningPointForRec(targetRec, quickLpLink);
    setQuickLpLink('');
  };

  const handleDeleteLearningPoint = (recId: string) => {
    const updatedList = (member.learningPoints || []).filter(
      (lp) => lp.recordingId !== recId
    );
    commitProfileChanges({ learningPoints: updatedList });
    if (lpEditingRecId === recId) {
      setLpEditingRecId(null);
      setLpLinkInput('');
    }
    showToast('Link Learning Point telah dipadam.');
  };

  // Calculate VC attendance percentage by CRMP for today
  const crmpAttendanceStats = crmps.map((c) => {
    const groupMembers = allMembers.filter((m) => m.crmpId === c.username);
    const votesForDate = vcVotes.filter(
      (v) =>
        v.date === TODAY_DATE_STR &&
        v.crmpId === c.username &&
        (v.status === 'Hadir Live' || v.status === 'Hadir Rakaman')
    );
    const uniqueVotedMembers = new Set(
      votesForDate.map((v) => v.memberUsername)
    ).size;
    const totalGroup = groupMembers.length;
    const pct =
      totalGroup > 0 ? Math.round((uniqueVotedMembers / totalGroup) * 100) : 0;
    return {
      crmp: c,
      attended: uniqueVotedMembers,
      total: totalGroup,
      percentage: pct,
    };
  });

  const navItems: { id: MemberTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'overview',
      label: 'Papan Pemuka',
      icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'profile',
      label: 'Profil Diri',
      icon: <User className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'roadmap',
      label: 'Master PhD Roadmap',
      icon: <GraduationCap className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'publications',
      label: 'Publication',
      icon: <BookOpen className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'checklist',
      label: 'Checklist Mingguan',
      icon: <CheckSquare className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'drafts',
      label: 'Naik Draf',
      icon: <FileText className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'thesis_map',
      label: 'Thesis Map',
      icon: <Map className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'vc_attendance',
      label: 'Kehadiran & Vote VC',
      icon: <CalendarCheck className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'recordings',
      label: 'Rakaman & Kelas',
      icon: <Video className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'thesis_talk',
      label: 'Thesis Talk',
      icon: <Mic className="w-4 h-4 shrink-0" />,
    },
  ];

  const memberInitials = member.name
    .split(' ')
    .filter((w) => !['binti', 'bin', 'dr.'].includes(w.toLowerCase()))
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f3ff] via-[#fdf2f8]/70 to-[#eef2ff] text-slate-900 flex flex-col lg:flex-row">
      {/* Collapsible Sidebar — Tema Ungu Diraja Ceria & Profesional */}
      <aside
        className={`${
          sidebarOpen ? 'w-full lg:w-64' : 'w-full lg:w-20'
        } bg-gradient-to-b from-[#2e1065] via-[#3b0764] to-[#1e1b4b] text-slate-100 flex flex-col justify-between shrink-0 transition-all duration-200 border-r border-purple-900/60 shadow-xl`}
      >
        <div>
          <div className="p-4 border-b border-purple-800/60 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-amber-400 text-white flex items-center justify-center shrink-0 shadow-md">
                <Rocket className="w-5 h-5" />
              </div>
              {sidebarOpen && (
                <div className="min-w-0">
                  <div className="text-sm font-black tracking-tight text-white truncate">
                    DR. ROKET
                  </div>
                  <div className="text-[11px] text-purple-200 truncate font-medium">
                    Ahli Platinum
                  </div>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title={sidebarOpen ? 'Tutup Sidebar' : 'Buka Sidebar'}
              className="p-1.5 rounded-lg text-purple-200 hover:text-white hover:bg-purple-800/60 transition-colors cursor-pointer shrink-0"
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
                } py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer w-full ${
                  activeTab === item.id
                    ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md shadow-pink-500/30'
                    : 'text-purple-100/85 hover:bg-purple-800/50 hover:text-white'
                }`}
              >
                {item.icon}
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            ))}
          </nav>
        </div>

        {/* Bottom Sidebar Profile Section (Watak Ahli / Avatar 300x300 + ID Tetap + Pakej) */}
        <div className="p-3.5 border-t border-purple-800/60 bg-black/20 space-y-3">
          <div
            className={`flex items-center ${
              sidebarOpen ? 'gap-3' : 'justify-center'
            }`}
          >
            <button
              type="button"
              onClick={() => setAvatarModalOpen(true)}
              title="Klik untuk muat naik fail gambar (300×300 px) atau masukkan link gambar"
              className="relative group rounded-full shrink-0 cursor-pointer focus:outline-none"
            >
              <ScholarCharacterAvatar
                member={member}
                size="sm"
                showPhotoIfAvailable
              />
              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-4 h-4 text-white" />
              </div>
            </button>

            {sidebarOpen && (
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-white truncate">
                  {member.name}
                </div>
                <div className="text-xs text-purple-200 font-mono truncate">
                  {member.username} · {member.package}
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
                  className="flex-1 py-1.5 px-2.5 bg-purple-900/70 hover:bg-purple-800 text-purple-100 text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-purple-700/60"
                >
                  <Upload className="w-3 h-3" />
                  Gambar
                </button>
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(true)}
                  className="flex-1 py-1.5 px-2.5 bg-purple-900/70 hover:bg-purple-800 text-purple-100 text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-purple-700/60"
                >
                  <KeyRound className="w-3 h-3" />
                  Password
                </button>
              </div>
              <button
                type="button"
                onClick={onLogout}
                title="Log Keluar"
                className="w-full py-1.5 px-2.5 bg-purple-900/70 hover:bg-rose-600 text-purple-100 hover:text-white text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer border border-purple-700/60"
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
                className="w-full py-2 bg-purple-900/70 hover:bg-rose-600 text-purple-200 hover:text-white rounded-lg flex items-center justify-center cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-gradient-to-r from-[#2e1065] via-[#4c1d95] to-[#3b0764] text-white px-6 py-4 flex items-center justify-between gap-8 border-b border-purple-800/70 shadow-md">
          <div className="space-y-1">
            <h1 className="text-base sm:text-xl font-black tracking-tight">
              Dashboard Ahli Platinum
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-purple-100">
              {memberCrmp?.avatar &&
              (memberCrmp.avatar.startsWith('data:image') ||
                memberCrmp.avatar.startsWith('http') ||
                memberCrmp.avatar.startsWith('/')) ? (
                <img
                  src={memberCrmp.avatar}
                  alt={memberCrmp.name}
                  referrerPolicy="no-referrer"
                  className="w-6 h-6 rounded-full object-cover border border-pink-300 shrink-0"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-purple-800 border border-purple-600 flex items-center justify-center text-purple-100 shrink-0">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
              <span>
                CRMP :{' '}
                <strong className="font-bold text-white">
                  {memberCrmp
                    ? memberCrmp.username === 'CRMP001'
                      ? 'Dr. Mardhiyati Yunus'
                      : memberCrmp.name
                    : 'Dr. Mardhiyati Yunus'}
                </strong>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-white/15 text-amber-300 font-mono text-[11px] font-bold">
                ID Tetap: {member.username}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('vc_attendance')}
              className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-xs font-bold rounded-xl shadow-md shadow-pink-500/25 transition-all whitespace-nowrap shrink-0 cursor-pointer"
            >
              Vote VC (6:20 PM)
            </button>
          </div>
        </header>

        {toastMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-900 text-white text-xs font-medium flex items-center justify-between shadow-md">
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
          {/* Peringatan Ringkas Checklist Belum Di-tick (Tanpa Butang WhatsApp) */}
          {missingItemsForSelectedDay.length > 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-start gap-3">
                <Bell className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-amber-950">
                    Peringatan Checklist Hari {activeDayOfWeek} (
                    {autoWeekInfo.weekLabel})
                  </div>
                  <p className="text-xs text-amber-900">
                    Checklist belum lengkap di-tick:{' '}
                    <strong>{missingItemsForSelectedDay.join(', ')}</strong>.{' '}
                    <strong>Terus kekal BERTAHAN sampai jadi.</strong>
                  </p>
                </div>
              </div>
              {activeTab !== 'checklist' && (
                <div className="flex items-center shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab('checklist')}
                    className="px-3.5 py-2 bg-amber-900 hover:bg-amber-950 text-white text-xs font-semibold rounded-xl cursor-pointer whitespace-nowrap"
                  >
                    Tick Checklist Sekarang
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ========================================== */}
          {/* TAB 1: OVERVIEW (PAPAN PEMUKA)             */}
          {/* ========================================== */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="bg-white/95 border border-purple-200/80 rounded-3xl p-6 space-y-6 shadow-md shadow-purple-900/5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-100 pb-5">
                  <div className="flex items-center gap-4">
                    <div
                      onClick={() => setAvatarModalOpen(true)}
                      title="Klik untuk muat naik gambar (300×300 px) atau masukkan link gambar"
                      className="relative group cursor-pointer shrink-0"
                    >
                      <ScholarCharacterAvatar
                        member={member}
                        size="xl"
                        showPhotoIfAvailable
                      />
                      <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Camera className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 text-xs font-bold mb-1">
                        <Sparkles className="w-3.5 h-3.5 text-pink-600" />
                        <span>Selamat Datang, Ahli Platinum</span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                        {member.name}
                      </h2>
                      <div className="text-xs text-slate-600 mt-0.5 font-medium">
                        ID Tetap:{' '}
                        <strong className="font-mono text-purple-800">
                          {member.username}
                        </strong>{' '}
                        · Pakej{' '}
                        <strong className="text-pink-700">
                          {member.package}
                        </strong>{' '}
                        · {member.university} (Semester {member.currentSemester}
                        )
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAvatarModalOpen(true)}
                      className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-bold rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
                    >
                      <Camera className="w-3.5 h-3.5 text-purple-700" />
                      Tukar Gambar / Link
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('profile')}
                      className="px-3.5 py-2 bg-gradient-to-r from-[#2e1065] to-[#4c1d95] hover:from-[#3b0764] hover:to-[#5b21b6] text-white text-xs font-bold rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
                    >
                      Kemaskini Profil
                    </button>
                  </div>
                </div>

                {/* 4 KPI Cards — Pastel Ceria Mengikut Gambar Rujukan */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div
                    onClick={() => setActiveTab('roadmap')}
                    className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-100/70 border border-emerald-200/90 shadow-xs cursor-pointer hover:shadow-md transition-all"
                  >
                    <div className="text-xs font-bold text-emerald-950">
                      Progress Kajian
                    </div>
                    <div className="flex items-center gap-2.5 mt-1.5">
                      <span className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </span>
                      <span className="text-3xl font-black font-mono text-slate-900 tabular-nums">
                        {member.overallProgress}%
                      </span>
                    </div>
                    <div className="text-xs text-emerald-900 font-semibold mt-1.5">
                      {member.currentPhase}
                    </div>
                  </div>

                  <div
                    onClick={() => setActiveTab('drafts')}
                    className="p-5 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-100/70 border border-purple-200/90 shadow-xs cursor-pointer hover:shadow-md transition-all"
                  >
                    <div className="text-xs font-bold text-purple-950">
                      Draf Terkini
                    </div>
                    <div className="text-3xl font-black font-mono text-slate-900 mt-1.5 tabular-nums">
                      {latestDraft
                        ? `Draf ${latestDraft.draftNumber}`
                        : 'Draf 0'}
                    </div>
                    <div className="text-xs text-purple-800 font-semibold mt-1.5 font-mono">
                      {latestDraft
                        ? `${latestDraft.pageCount} muka surat`
                        : 'Belum naik draf'}
                    </div>
                  </div>

                  <div
                    onClick={() => setActiveTab('vc_attendance')}
                    className="p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-100/70 border border-amber-200/90 shadow-xs cursor-pointer hover:shadow-md transition-all"
                  >
                    <div className="text-xs font-bold text-amber-950">
                      Kehadiran
                    </div>
                    <div className="text-3xl font-black font-mono text-slate-900 mt-1.5 tabular-nums">
                      {attendancePct}%
                    </div>
                    <div className="text-xs text-amber-900 font-semibold mt-1.5">
                      {myVotes.length} Sesi VC Direkodkan
                    </div>
                  </div>

                  <div
                    onClick={() => setActiveTab('publications')}
                    title="Klik untuk buka Dashboard Publication"
                    className="p-5 rounded-2xl bg-gradient-to-br from-pink-50 to-rose-100/70 border border-pink-200/90 shadow-xs cursor-pointer hover:shadow-md transition-all"
                  >
                    <div className="text-xs font-bold text-pink-950">
                      Penerbitan (Publication)
                    </div>
                    <div className="text-3xl font-black font-mono text-slate-900 mt-1.5 tabular-nums">
                      {member.publications.length}
                    </div>
                    <div className="text-xs text-pink-700 font-bold mt-1.5">
                      Buka Dashboard Publication →
                    </div>
                  </div>
                </div>

                {/* Tesis Map Visual Strip — Mengikut Gambar Rujukan */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-black text-slate-900">
                      Tesis Map
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab('thesis_map')}
                      className="text-xs font-bold text-purple-700 hover:underline cursor-pointer"
                    >
                      Kemaskini Bab →
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {chapters.map((ch) => {
                      const isDone =
                        ch.status === 'Selesai' || ch.progress === 100;
                      const isInProgress =
                        !isDone &&
                        (ch.status === 'Sedang Dideraf' ||
                          ch.status === 'Semakan Penyelia' ||
                          ch.progress > 0);
                      return (
                        <div
                          key={ch.id}
                          onClick={() => setActiveTab('thesis_map')}
                          className={`p-4 rounded-2xl border text-center space-y-2 cursor-pointer transition-all hover:shadow-sm ${
                            isDone
                              ? 'bg-emerald-50/80 border-emerald-200'
                              : isInProgress
                              ? 'bg-amber-50/80 border-amber-200'
                              : 'bg-pink-50/70 border-pink-200'
                          }`}
                        >
                          <div className="text-sm font-black text-slate-900">
                            Bab {ch.chapterNumber}
                          </div>
                          <div className="text-[11px] text-slate-600 line-clamp-1 font-medium">
                            {ch.title.replace(/^Bab \d+:\s*/i, '')}
                          </div>
                          <div className="font-mono text-xs font-bold">
                            {isDone ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500 text-white text-[11px]">
                                ✓ Selesai ({ch.progress}%)
                              </span>
                            ) : isInProgress ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[11px]">
                                Sedang ({ch.progress}%)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-pink-500 text-white text-[11px]">
                                Belum
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bottom 2-Column Split: Status Fasa PhD & Kemajuan Keseluruhan */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-6 bg-white/95 border border-purple-200/80 rounded-3xl p-6 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-purple-100 pb-3">
                    <h3 className="text-base font-black text-slate-900">
                      Status Fasa Kajian (Master PhD Roadmap)
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab('roadmap')}
                      className="text-xs font-bold text-purple-700 hover:underline cursor-pointer"
                    >
                      Buka Roadmap & Ubah Fasa →
                    </button>
                  </div>
                  <div className="space-y-2.5 text-xs">
                    {PHD_PHASES.map((ph, idx) => {
                      const activeSyncedPhase = derivePhaseFromDates(
                        profileForm.dates,
                        TODAY_DATE_STR
                      ).phase;
                      const currentIdx = PHD_PHASES.indexOf(activeSyncedPhase);
                      const isDone = idx < currentIdx;
                      const isCurr = idx === currentIdx;
                      return (
                        <div
                          key={ph}
                          onClick={() => setActiveTab('roadmap')}
                          className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                            isCurr
                              ? 'border-pink-500 bg-pink-50/70 font-bold text-pink-950'
                              : isDone
                              ? 'border-emerald-200 bg-emerald-50/40 text-slate-700'
                              : 'border-slate-200 text-slate-500 hover:bg-purple-50/40'
                          }`}
                        >
                          <span>
                            {idx + 1}. {ph}
                          </span>
                          <span className="font-mono text-[11px] font-bold">
                            {isCurr
                              ? '★ Fasa Semasa'
                              : isDone
                              ? '✓ Selesai'
                              : 'Sasaran'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="lg:col-span-6 bg-white/95 border border-purple-200/80 rounded-3xl p-6 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-purple-100 pb-3">
                    <h3 className="text-base font-black text-slate-900">
                      Kemajuan Keseluruhan Mengikut Bab
                    </h3>
                    <span className="text-xs font-mono font-bold text-purple-700">
                      Purata: {member.overallProgress}%
                    </span>
                  </div>

                  <div className="h-52 flex items-end justify-around gap-3 pt-6 px-4 border-b border-slate-200">
                    {chapters.map((ch, idx) => {
                      const barColors = [
                        'bg-pink-500',
                        'bg-orange-500',
                        'bg-amber-400',
                        'bg-emerald-500',
                        'bg-teal-500',
                        'bg-indigo-600',
                      ];
                      const h = Math.max(10, ch.progress);
                      return (
                        <div
                          key={ch.id}
                          className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end"
                        >
                          <span className="font-mono text-xs font-bold text-slate-700 tabular-nums">
                            {ch.progress}%
                          </span>
                          <div
                            className={`w-full max-w-[42px] rounded-t-xl transition-all shadow-xs ${
                              barColors[idx % barColors.length]
                            }`}
                            style={{ height: `${h}%` }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-around text-xs font-bold text-slate-600">
                    {chapters.map((ch) => (
                      <span key={ch.id}>Bab {ch.chapterNumber}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* ========================================== */}
          {/* TAB 2: KEMASKINI MAKLUMAT PERIBADI         */}
          {/* ========================================== */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <form
                onSubmit={handleSaveProfile}
                className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Kemaskini Profil Diri Ahli
                    </h2>
                    <p className="text-xs text-slate-500">
                      Kemaskini universiti, peringkat pengajian, bidang kajian,
                      alamat & poskod (auto daerah/negeri), serta barisan
                      penyelia
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setPasswordModalOpen(true)}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold rounded-xl transition-colors whitespace-nowrap cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <KeyRound className="w-4 h-4 text-indigo-700" />
                      Tukar Kata Laluan
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold rounded-xl transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Simpan Maklumat Peribadi
                    </button>
                  </div>
                </div>

                {/* Muat Naik Gambar / Masukkan Link Gambar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-4">
                    {profileForm.avatar ? (
                      <img
                        src={profileForm.avatar}
                        alt={profileForm.name}
                        referrerPolicy="no-referrer"
                        className="w-20 h-20 rounded-full object-cover border-2 border-amber-400 shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-amber-400 text-slate-950 font-bold text-xl flex items-center justify-center shrink-0">
                        {memberInitials}
                      </div>
                    )}
                    <div className="space-y-1">
                      <div className="text-sm font-bold text-slate-900">
                        Gambar Profil Ahli Platinum
                      </div>
                      <p className="text-xs text-slate-600 font-mono">
                        Saiz Ditetapkan: {STANDARD_AVATAR_SIZE} ×{' '}
                        {STANDARD_AVATAR_SIZE} px (Maksimum 2MB)
                      </p>
                      <p className="text-xs text-slate-500">
                        Anda boleh memuat naik fail gambar dari komputer/telefon
                        (boleh tarik untuk tengahkan muka) atau masukkan link
                        (URL) gambar sahaja.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAvatarModalOpen(true)}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Muat Naik Fail / Masukkan Link Gambar
                  </button>
                </div>

                {/* Maklumat Asas & Pengajian */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Kod Ahli / Username (Mengikut Pakej)
                    </label>
                    <input
                      type="text"
                      disabled
                      value={`${profileForm.username} (${profileForm.package})`}
                      className="w-full px-3 py-2 text-sm font-mono bg-slate-100 border border-slate-200 rounded-lg text-slate-600"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nama Penuh Ahli
                    </label>
                    <input
                      type="text"
                      required
                      value={profileForm.name}
                      onChange={(e) =>
                        commitProfileChanges({ name: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={profileForm.email}
                      onChange={(e) =>
                        commitProfileChanges({
                          email: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      No. Telefon (Untuk Peringatan WhatsApp)
                    </label>
                    <input
                      type="text"
                      required
                      value={profileForm.phone}
                      onChange={(e) =>
                        commitProfileChanges({
                          phone: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                    />
                  </div>

                  {/* Peringkat Pengajian: Dropdown Master / PhD */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Peringkat Pengajian
                    </label>
                    <select
                      value={profileForm.studyLevel || 'PhD'}
                      onChange={(e) =>
                        commitProfileChanges({
                          studyLevel: e.target.value as StudyLevel,
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white font-semibold"
                    >
                      <option value="PhD">PhD (Kedoktoran Falsafah)</option>
                      <option value="Master">Master (Sarjana)</option>
                    </select>
                  </div>

                  {/* Senarai Universiti di Malaysia + Boleh Tambah & Automatik Masuk Dalam Listdown */}
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        Universiti di Malaysia — Nama Penuh (Singkatan)
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowAddUniInput(!showAddUniInput)}
                        className="text-xs font-bold text-indigo-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {showAddUniInput
                          ? 'Tutup Ruangan Tambah'
                          : 'Tiada dalam senarai? Tambah Universiti'}
                      </button>
                    </div>
                    <select
                      value={normalizeUniversityName(profileForm.university)}
                      onChange={(e) =>
                        commitProfileChanges({
                          university: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                    >
                      {availableUniversities.map((uni) => (
                        <option key={uni} value={uni}>
                          {uni}
                        </option>
                      ))}
                    </select>

                    {showAddUniInput && (
                      <div className="mt-2 p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <input
                          type="text"
                          value={newUniInput}
                          onChange={(e) => setNewUniInput(e.target.value)}
                          placeholder="Masukkan Nama Penuh (Singkatan) — Contoh: Universiti Islam Selangor (UIS)"
                          className="flex-1 px-3 py-1.5 text-xs bg-white border border-indigo-300 rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomUniversity}
                          className="px-3.5 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold rounded-lg cursor-pointer whitespace-nowrap"
                        >
                          + Tambah & Masuk Dalam Listdown
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Semester Terkini
                    </label>
                    <select
                      value={profileForm.currentSemester}
                      onChange={(e) =>
                        commitProfileChanges({
                          currentSemester: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                    >
                      {[
                        'S1',
                        'S2',
                        'S3',
                        'S4',
                        'S5',
                        'S6',
                        'S7',
                        'S8',
                        'S9',
                        'S10',
                      ].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Bidang Kajian */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Bidang Kajian
                    </label>
                    <input
                      type="text"
                      value={profileForm.researchField || ''}
                      onChange={(e) =>
                        commitProfileChanges({
                          researchField: e.target.value,
                        })
                      }
                      placeholder="Contoh: Pendidikan STEM / Kejuruteraan Perisian / Sains Kesihatan"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tajuk Kajian Tesis
                    </label>
                    <input
                      type="text"
                      value={profileForm.researchTitle}
                      onChange={(e) => {
                        setResearchTitleMapInput(e.target.value);
                        commitProfileChanges({
                          researchTitle: e.target.value,
                        });
                      }}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                {/* Tempat Tinggal: Masukkan Alamat & Poskod -> Daerah & Negeri Auto Masukkan */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Tempat Tinggal (Masukkan Alamat & Poskod → Daerah & Negeri
                      Auto Masukkan)
                    </h3>
                    {postcodeAutoMatched && (
                      <span className="text-[11px] font-semibold text-emerald-700 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Daerah & Negeri dikesan automatik daripada Poskod{' '}
                        {profileForm.postcode}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Alamat Kediaman
                      </label>
                      <input
                        type="text"
                        value={profileForm.address || ''}
                        onChange={(e) =>
                          handleAddressOrPostcodeChange(
                            e.target.value,
                            profileForm.postcode || ''
                          )
                        }
                        placeholder="No. Rumah, Nama Jalan, Taman / Seksyen"
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Poskod (5 Digit)
                      </label>
                      <input
                        type="text"
                        maxLength={5}
                        value={profileForm.postcode || ''}
                        onChange={(e) =>
                          handleAddressOrPostcodeChange(
                            profileForm.address || '',
                            e.target.value
                          )
                        }
                        placeholder="Contoh: 35900 / 43600 / 81310"
                        className="w-full px-3 py-2 text-sm font-mono bg-white border border-indigo-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Daerah (Auto dari Poskod)
                      </label>
                      <input
                        type="text"
                        value={profileForm.district || ''}
                        onChange={(e) => {
                          const nextDistrict = e.target.value;
                          const composed = [
                            profileForm.address,
                            profileForm.postcode
                              ? `${profileForm.postcode} ${nextDistrict}`.trim()
                              : nextDistrict,
                            profileForm.state,
                          ]
                            .filter(Boolean)
                            .join(', ');
                          commitProfileChanges({
                            district: nextDistrict,
                            residence: composed || profileForm.residence,
                          });
                        }}
                        placeholder="Auto terisi apabila poskod dimasukkan"
                        className="w-full px-3 py-2 text-sm bg-emerald-50/40 border border-emerald-300 rounded-lg font-medium text-slate-900"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Negeri (Auto dari Poskod)
                      </label>
                      <input
                        type="text"
                        value={profileForm.state || ''}
                        onChange={(e) => {
                          const nextState = e.target.value;
                          const composed = [
                            profileForm.address,
                            profileForm.postcode
                              ? `${profileForm.postcode} ${
                                  profileForm.district || ''
                                }`.trim()
                              : profileForm.district,
                            nextState,
                          ]
                            .filter(Boolean)
                            .join(', ');
                          commitProfileChanges({
                            state: nextState,
                            residence: composed || profileForm.residence,
                          });
                        }}
                        placeholder="Auto terisi apabila poskod dimasukkan"
                        className="w-full px-3 py-2 text-sm bg-emerald-50/40 border border-emerald-300 rounded-lg font-medium text-slate-900"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Paparan Penuh Tempat Tinggal
                      </label>
                      <input
                        type="text"
                        value={profileForm.residence}
                        onChange={(e) =>
                          commitProfileChanges({
                            residence: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-700"
                      />
                    </div>
                  </div>
                </div>

                {/* Senarai Penyelia: Penyelia Utama, Penyelia Kedua & Penyelia Ketiga */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Barisan Penyelia (Penyelia Utama, Kedua & Ketiga)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Penyelia Utama
                      </label>
                      <input
                        type="text"
                        value={profileForm.supervisor}
                        onChange={(e) =>
                          commitProfileChanges({
                            supervisor: e.target.value,
                          })
                        }
                        placeholder="Nama Penyelia Utama"
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Penyelia Kedua
                      </label>
                      <input
                        type="text"
                        value={profileForm.supervisor2 || ''}
                        onChange={(e) =>
                          commitProfileChanges({
                            supervisor2: e.target.value,
                          })
                        }
                        placeholder="Nama Penyelia Kedua (Jika ada)"
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Penyelia Ketiga
                      </label>
                      <input
                        type="text"
                        value={profileForm.supervisor3 || ''}
                        onChange={(e) =>
                          commitProfileChanges({
                            supervisor3: e.target.value,
                          })
                        }
                        placeholder="Nama Penyelia Ketiga (Jika ada)"
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* ========================================== */}
          {/* TAB 2B: MASTER PhD ROADMAP (GRAFIK JALAN)  */}
          {/* ========================================== */}
          {activeTab === 'roadmap' && (
            <MasterPhdRoadmap
              member={profileForm}
              defaultCurrentDate={TODAY_DATE_STR}
              onUpdateDates={(newDates) => {
                commitProfileChanges({ dates: newDates });
                showToast(
                  'Tarikh Master PhD Roadmap & kedudukan perjalanan di atas jalan berliku telah dikemaskini!'
                );
              }}
              onUpdatePhase={(newPhase) => {
                const phaseIdx = Math.max(0, PHD_PHASES.indexOf(newPhase));
                const nextProgress = Math.max(
                  profileForm.overallProgress,
                  Math.min(
                    100,
                    Math.round(((phaseIdx + 1) / PHD_PHASES.length) * 95)
                  )
                );
                commitProfileChanges({
                  currentPhase: newPhase,
                  overallProgress: nextProgress,
                });
                showToast(`Fasa kajian semasa dikemaskini kepada: ${newPhase}`);
              }}
            />
          )}

          {/* ========================================== */}
          {/* TAB 2C: DASHBOARD KHAS PUBLICATION         */}
          {/* ========================================== */}
          {activeTab === 'publications' && (
            <div className="space-y-6">
              {/* Ringkasan Statistik Penerbitan (Publication Dashboard) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-pink-600 text-white font-mono text-xs font-bold">
                        DASHBOARD PUBLICATION
                      </span>
                      <span className="text-xs font-mono text-slate-500">
                        {member.username} · {member.university}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 mt-1">
                      Pengurusan & Rekod Penerbitan Ilmiah ({member.name})
                    </h2>
                    <p className="text-xs text-slate-500">
                      Tambah (Add), kemaskini (Edit), atau padam (Delete) rekod
                      artikel jurnal, prosiding persidangan, buku dan bab buku
                      anda
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={openAddPublication}
                    className="px-4 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    Tambah Publication Baharu
                  </button>
                </div>

                {/* 4 Kad Statistik Penerbitan */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-xs font-semibold text-slate-600">
                      Jumlah Penerbitan
                    </div>
                    <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                      {member.publications.length}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Keseluruhan rekod
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
                    <div className="text-xs font-semibold text-emerald-800">
                      Telah Diterbitkan
                    </div>
                    <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
                      {
                        member.publications.filter(
                          (p) => p.status === 'Diterbitkan'
                        ).length
                      }
                    </div>
                    <div className="text-[11px] text-emerald-700 mt-0.5">
                      Status: Diterbitkan
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200">
                    <div className="text-xs font-semibold text-indigo-800">
                      Artikel Jurnal
                    </div>
                    <div className="text-2xl font-bold font-mono text-indigo-700 mt-1">
                      {
                        member.publications.filter(
                          (p) => p.type === 'Artikel Jurnal'
                        ).length
                      }
                    </div>
                    <div className="text-[11px] text-indigo-700 mt-0.5">
                      Scopus / WoS / MyCite
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200">
                    <div className="text-xs font-semibold text-amber-900">
                      Prosiding & Buku
                    </div>
                    <div className="text-2xl font-bold font-mono text-amber-700 mt-1">
                      {
                        member.publications.filter(
                          (p) => p.type !== 'Artikel Jurnal'
                        ).length
                      }
                    </div>
                    <div className="text-[11px] text-amber-800 mt-0.5">
                      Prosiding, Buku & Bab Buku
                    </div>
                  </div>
                </div>

                {/* Jadual Senarai Penerbitan */}
                {member.publications.length === 0 ? (
                  <div className="p-10 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl space-y-2">
                    <BookOpen className="w-7 h-7 text-slate-400 mx-auto" />
                    <div className="font-semibold text-slate-700">
                      Belum ada penerbitan direkodkan
                    </div>
                    <p>
                      Klik butang &ldquo;Tambah Publication Baharu&rdquo; di
                      atas untuk menambah artikel jurnal, prosiding, buku atau
                      bab buku.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600 bg-slate-50">
                          <th className="py-3 px-3">Bil.</th>
                          <th className="py-3 px-3">Tajuk Penerbitan</th>
                          <th className="py-3 px-3">Jenis</th>
                          <th className="py-3 px-3">Jurnal / Penerbit</th>
                          <th className="py-3 px-3">Tahun</th>
                          <th className="py-3 px-3">Status</th>
                          <th className="py-3 px-3 text-right">Tindakan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {member.publications.map((pub, idx) => (
                          <tr key={pub.id} className="hover:bg-slate-50">
                            <td className="py-3.5 px-3 font-mono font-bold text-slate-700">
                              {idx + 1}.
                            </td>
                            <td className="py-3.5 px-3 font-semibold text-slate-900 max-w-md">
                              <div>{pub.title}</div>
                              {pub.link && (
                                <a
                                  href={pub.link}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[11px] text-indigo-700 hover:underline font-normal inline-flex items-center gap-1 mt-0.5"
                                >
                                  Pautan / DOI{' '}
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </td>
                            <td className="py-3.5 px-3 text-slate-700 font-medium">
                              {pub.type}
                            </td>
                            <td className="py-3.5 px-3 text-slate-600">
                              {pub.journalOrPublisher}
                            </td>
                            <td className="py-3.5 px-3 font-mono font-semibold text-slate-800">
                              {pub.year}
                            </td>
                            <td className="py-3.5 px-3">
                              <span
                                className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                                  pub.status === 'Diterbitkan'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : pub.status === 'Diterima'
                                    ? 'bg-indigo-100 text-indigo-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {pub.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openEditPublication(pub)}
                                  className="px-2.5 py-1 border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-700 font-medium inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Pencil className="w-3 h-3" />
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeletePublication(pub.id)
                                  }
                                  className="px-2.5 py-1 border border-red-200 rounded-lg hover:bg-red-50 text-red-700 font-medium inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Modal Add / Edit Publication */}
              {pubModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
                  <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4">
                    <h3 className="text-base font-bold text-slate-900">
                      {editingPub
                        ? 'Kemaskini Maklumat Publication'
                        : 'Tambah Publication Baharu'}
                    </h3>
                    <form
                      onSubmit={handleSavePublication}
                      className="space-y-3.5"
                    >
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Tajuk Artikel / Buku / Prosiding
                        </label>
                        <input
                          type="text"
                          required
                          value={pubTitle}
                          onChange={(e) => setPubTitle(e.target.value)}
                          placeholder="Masukkan tajuk penuh penerbitan"
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Jenis Penerbitan
                          </label>
                          <select
                            value={pubType}
                            onChange={(e) =>
                              setPubType(e.target.value as Publication['type'])
                            }
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                          >
                            <option value="Artikel Jurnal">
                              Artikel Jurnal
                            </option>
                            <option value="Prosiding">Prosiding</option>
                            <option value="Buku">Buku</option>
                            <option value="Bab Buku">Bab Buku</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Tahun
                          </label>
                          <input
                            type="text"
                            required
                            value={pubYear}
                            onChange={(e) => setPubYear(e.target.value)}
                            className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Nama Jurnal / Persidangan / Penerbit
                        </label>
                        <input
                          type="text"
                          required
                          value={pubJournal}
                          onChange={(e) => setPubJournal(e.target.value)}
                          placeholder="Contoh: Sains Malaysiana (Scopus Q2)"
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Status Semasa
                          </label>
                          <select
                            value={pubStatus}
                            onChange={(e) =>
                              setPubStatus(
                                e.target.value as Publication['status']
                              )
                            }
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                          >
                            <option value="Diterbitkan">Diterbitkan</option>
                            <option value="Diterima">
                              Diterima (Accepted)
                            </option>
                            <option value="Dalam Semakan">Dalam Semakan</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Pautan URL / DOI (Pilihan)
                          </label>
                          <input
                            type="text"
                            value={pubLink}
                            onChange={(e) => setPubLink(e.target.value)}
                            placeholder="https://doi.org/..."
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                        <button
                          type="button"
                          onClick={() => setPubModalOpen(false)}
                          className="px-4 py-2 text-xs font-semibold text-slate-600 cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-indigo-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
                        >
                          Simpan Publication
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================== */}
          {/* TAB 4: CHECKLIST SUBMISSION SETIAP MINGGU  */}
          {/* ========================================== */}
          {activeTab === 'checklist' && (
            <form onSubmit={handleChecklistSubmit} className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Checklist Submission — Setiap Minggu
                    </h2>
                    <p className="text-xs text-slate-500">
                      Ahli hanya perlu <strong>tick checklist sahaja</strong>{' '}
                      (tidak perlu menaip sebarang nota) untuk membantu semakan
                      harian. Minggu sebelum dan selepas dikunci.
                    </p>
                  </div>

                  {/* Pilih Tarikh Kalendar -> Minggu Dijana Automatik */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5">
                      <Calendar className="w-4 h-4 text-indigo-700" />
                      <span className="text-xs font-semibold text-slate-600">
                        Klik Kalendar:
                      </span>
                      <input
                        type="date"
                        value={checklistCalendarDate}
                        onChange={(e) =>
                          handleCalendarDateChange(e.target.value)
                        }
                        className="text-xs font-mono font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
                      />
                    </div>

                    <div
                      className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold border ${
                        isCurrentWeek
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-800'
                          : 'bg-slate-100 border-slate-300 text-slate-700'
                      }`}
                    >
                      Auto: {autoWeekInfo.weekLabel} · Hari {activeDayOfWeek}
                    </div>

                    {!isCurrentWeek && (
                      <button
                        type="button"
                        onClick={handleReturnToCurrentWeek}
                        className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl cursor-pointer whitespace-nowrap"
                      >
                        Kembali Ke Minggu Semasa
                      </button>
                    )}
                  </div>
                </div>

                {/* Bar Pemilih Minggu Semasa & Rekod Minggu-Minggu Sebelum */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="text-xs font-bold text-slate-900">
                      Pilih Minggu Semasa atau Lihat Rekod Minggu-Minggu Sebelum:
                    </div>
                    <span className="text-[11px] text-emerald-700 font-semibold">
                      ✓ Minggu baharu automatik reset kosong · Minggu sebelum
                      disimpan dalam arkib
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleReturnToCurrentWeek}
                      className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold border transition-colors cursor-pointer ${
                        isCurrentWeek
                          ? 'bg-indigo-700 border-indigo-700 text-white shadow-xs'
                          : 'bg-white border-indigo-200 text-indigo-800 hover:bg-indigo-50'
                      }`}
                    >
                      ★ Minggu Semasa: {currentWeekInfo.weekLabel} (Hari Ini:{' '}
                      {TODAY_DATE_STR})
                    </button>

                    {memberSavedChecklists
                      .filter((c) => c.startDate !== currentWeekInfo.startDate)
                      .map((pastChk) => {
                        const isSelectedPast =
                          autoWeekInfo.startDate === pastChk.startDate;
                        return (
                          <button
                            key={pastChk.id || pastChk.startDate}
                            type="button"
                            onClick={() =>
                              handleCalendarDateChange(pastChk.startDate)
                            }
                            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-semibold border transition-colors cursor-pointer ${
                              isSelectedPast
                                ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            Arkib: {pastChk.weekLabel}
                          </button>
                        );
                      })}
                  </div>
                </div>

                {/* Banner Kunci jika Minggu Sebelum atau Minggu Selepas dipilih */}
                {!isCurrentWeek && (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <Lock className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                      <div className="text-xs text-red-900 space-y-0.5">
                        <div className="font-bold">
                          {isPastWeek
                            ? 'Minggu Sebelum Dikunci (Tidak Boleh Tick)'
                            : 'Minggu Selepas Dikunci (Tidak Boleh Tick)'}
                        </div>
                        <p>
                          Anda sedang melihat{' '}
                          <strong className="font-mono">
                            {autoWeekInfo.weekLabel}
                          </strong>
                          . Mengikut peraturan sistem, ahli hanya dibenarkan
                          menanda (tick) checklist bagi{' '}
                          <strong>
                            Minggu Semasa ({currentWeekInfo.weekLabel})
                          </strong>{' '}
                          sahaja.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleReturnToCurrentWeek}
                      className="px-3.5 py-1.5 bg-red-700 hover:bg-red-800 text-white text-xs font-semibold rounded-lg cursor-pointer shrink-0 self-start sm:self-center"
                    >
                      Pilih Minggu Semasa ({TODAY_DATE_STR})
                    </button>
                  </div>
                )}

                {/* Status Ringkas यदि Semua Checklist Hari Ini Lengkap */}
                {missingItemsForSelectedDay.length === 0 && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-xs font-semibold text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>
                      Alhamdulillah! Semua checklist laporan untuk Hari{' '}
                      {activeDayOfWeek} ({checklistCalendarDate}) telah lengkap
                      di-tick. Terus kekal BERTAHAN sampai jadi.
                    </span>
                  </div>
                )}

                {/* 1. My Weekly Fokus - Ahad (8.30 malam) */}
                <div
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    !isCurrentWeek
                      ? 'bg-slate-100 border-slate-200 opacity-65'
                      : checklistForm.weeklyFokusCompleted
                      ? 'bg-emerald-50/60 border-emerald-200'
                      : 'bg-indigo-50/50 border-indigo-200'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        1. My Weekly Fokus — Ahad
                      </span>
                      <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[11px] font-mono font-bold">
                        Peringatan Automatik: 8.30 malam
                      </span>
                    </div>
                    <div className="text-xs text-slate-600">
                      Tick selepas anda menghantar My Weekly Fokus hari Ahad
                      (sebelum 8.30 malam) ke CRMP ({crmpDisplayLabel}) & Group
                      FB Platinum
                    </div>
                  </div>
                  <label
                    className={`inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-xs font-bold transition-colors ${
                      !isCurrentWeek
                        ? 'bg-slate-200 border-slate-300 text-slate-500 cursor-not-allowed'
                        : checklistForm.weeklyFokusCompleted
                        ? 'bg-emerald-700 border-emerald-700 text-white cursor-pointer'
                        : 'bg-white border-indigo-300 text-indigo-900 hover:bg-indigo-50 cursor-pointer'
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={!isCurrentWeek}
                      checked={checklistForm.weeklyFokusCompleted}
                      onChange={(e) => {
                        if (!isCurrentWeek) return;
                        const updated = {
                          ...checklistForm,
                          weeklyFokusCompleted: e.target.checked,
                        };
                        setChecklistForm(updated);
                        onSaveChecklist(updated);
                      }}
                      className="w-4 h-4 accent-indigo-600 rounded"
                    />
                    <span>
                      {checklistForm.weeklyFokusCompleted
                        ? '✓ Selesai Tick (Ahad)'
                        : 'Tick My Weekly Fokus'}
                    </span>
                  </label>
                </div>

                {/* 2. Jadual TDR Mengikut Hari (Isnin - Jumaat) — Hanya Tick Sahaja */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h3 className="text-sm font-bold text-slate-900">
                      2. Checklist TDR Mingguan Mengikut Hari (Isnin – Jumaat)
                    </h3>
                    <span className="text-xs text-slate-500">
                      Mesej peringatan dihantar secara automatik mengikut waktu
                      setiap TDR (tak perlu tunggu CRMP)
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
                    {/* ISNIN */}
                    <div
                      className={`border rounded-xl p-4 space-y-2.5 ${
                        !isCurrentWeek
                          ? 'bg-slate-100 border-slate-200 opacity-65'
                          : activeDayOfWeek === 'Isnin'
                          ? 'border-indigo-600 bg-indigo-50/30'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">
                          📌 ISNIN
                        </span>
                        <span className="text-[11px] font-mono font-bold text-indigo-700">
                          TDR001
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-600">
                        Jam 4.30 petang
                      </div>
                      <label
                        className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs font-semibold ${
                          !isCurrentWeek
                            ? 'cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400'
                            : checklistForm.tdr001Isnin
                            ? 'cursor-pointer bg-emerald-50 border-emerald-300 text-emerald-900'
                            : 'cursor-pointer bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          disabled={!isCurrentWeek}
                          checked={checklistForm.tdr001Isnin}
                          onChange={(e) => {
                            if (!isCurrentWeek) return;
                            const updated = {
                              ...checklistForm,
                              tdr001Isnin: e.target.checked,
                            };
                            setChecklistForm(updated);
                            onSaveChecklist(updated);
                          }}
                          className="w-4 h-4 accent-indigo-600"
                        />
                        <span>Tick TDR001</span>
                      </label>
                    </div>

                    {/* SELASA */}
                    <div
                      className={`border rounded-xl p-4 space-y-2.5 ${
                        !isCurrentWeek
                          ? 'bg-slate-100 border-slate-200 opacity-65'
                          : activeDayOfWeek === 'Selasa'
                          ? 'border-indigo-600 bg-indigo-50/30'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">
                          📌 SELASA
                        </span>
                        <span className="text-[11px] font-mono font-bold text-indigo-700">
                          TDR006
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-600">
                        Jam 9.30 malam
                      </div>
                      <label
                        className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs font-semibold ${
                          !isCurrentWeek
                            ? 'cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400'
                            : checklistForm.tdr006Selasa
                            ? 'cursor-pointer bg-emerald-50 border-emerald-300 text-emerald-900'
                            : 'cursor-pointer bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          disabled={!isCurrentWeek}
                          checked={checklistForm.tdr006Selasa}
                          onChange={(e) => {
                            if (!isCurrentWeek) return;
                            const updated = {
                              ...checklistForm,
                              tdr006Selasa: e.target.checked,
                            };
                            setChecklistForm(updated);
                            onSaveChecklist(updated);
                          }}
                          className="w-4 h-4 accent-indigo-600"
                        />
                        <span>Tick TDR006</span>
                      </label>
                    </div>

                    {/* RABU */}
                    <div
                      className={`border rounded-xl p-4 space-y-2.5 ${
                        !isCurrentWeek
                          ? 'bg-slate-100 border-slate-200 opacity-65'
                          : activeDayOfWeek === 'Rabu'
                          ? 'border-indigo-600 bg-indigo-50/30'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">
                          📌 RABU
                        </span>
                        <span className="text-[11px] font-mono font-bold text-indigo-700">
                          TDR002 & 003
                        </span>
                      </div>
                      <label
                        className={`flex flex-col gap-0.5 p-2 rounded-lg border text-xs font-semibold ${
                          !isCurrentWeek
                            ? 'cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400'
                            : checklistForm.tdr002Rabu
                            ? 'cursor-pointer bg-emerald-50 border-emerald-300 text-emerald-900'
                            : 'cursor-pointer bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            disabled={!isCurrentWeek}
                            checked={checklistForm.tdr002Rabu}
                            onChange={(e) => {
                              if (!isCurrentWeek) return;
                              const updated = {
                                ...checklistForm,
                                tdr002Rabu: e.target.checked,
                              };
                              setChecklistForm(updated);
                              onSaveChecklist(updated);
                            }}
                            className="w-4 h-4 accent-indigo-600"
                          />
                          <span>1️⃣ TDR002</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 pl-6">
                          Jam 9.30 malam
                        </span>
                      </label>
                      <label
                        className={`flex flex-col gap-0.5 p-2 rounded-lg border text-xs font-semibold ${
                          !isCurrentWeek
                            ? 'cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400'
                            : checklistForm.tdr003Rabu
                            ? 'cursor-pointer bg-emerald-50 border-emerald-300 text-emerald-900'
                            : 'cursor-pointer bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            disabled={!isCurrentWeek}
                            checked={checklistForm.tdr003Rabu}
                            onChange={(e) => {
                              if (!isCurrentWeek) return;
                              const updated = {
                                ...checklistForm,
                                tdr003Rabu: e.target.checked,
                              };
                              setChecklistForm(updated);
                              onSaveChecklist(updated);
                            }}
                            className="w-4 h-4 accent-indigo-600"
                          />
                          <span>2️⃣ TDR003</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 pl-6">
                          Jam 9.30 malam
                        </span>
                      </label>
                    </div>

                    {/* KHAMIS */}
                    <div
                      className={`border rounded-xl p-4 space-y-2.5 ${
                        !isCurrentWeek
                          ? 'bg-slate-100 border-slate-200 opacity-65'
                          : activeDayOfWeek === 'Khamis'
                          ? 'border-indigo-600 bg-indigo-50/30'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">
                          📌 KHAMIS
                        </span>
                        <span className="text-[11px] font-mono font-bold text-indigo-700">
                          TDR017 & 018
                        </span>
                      </div>
                      <label
                        className={`flex flex-col gap-0.5 p-2 rounded-lg border text-xs font-semibold ${
                          !isCurrentWeek
                            ? 'cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400'
                            : checklistForm.tdr017Khamis
                            ? 'cursor-pointer bg-emerald-50 border-emerald-300 text-emerald-900'
                            : 'cursor-pointer bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            disabled={!isCurrentWeek}
                            checked={checklistForm.tdr017Khamis}
                            onChange={(e) => {
                              if (!isCurrentWeek) return;
                              const updated = {
                                ...checklistForm,
                                tdr017Khamis: e.target.checked,
                              };
                              setChecklistForm(updated);
                              onSaveChecklist(updated);
                            }}
                            className="w-4 h-4 accent-indigo-600"
                          />
                          <span>1️⃣ TDR017</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 pl-6">
                          Jam 1.30 petang
                        </span>
                      </label>
                      <label
                        className={`flex flex-col gap-0.5 p-2 rounded-lg border text-xs font-semibold ${
                          !isCurrentWeek
                            ? 'cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400'
                            : checklistForm.tdr018Khamis
                            ? 'cursor-pointer bg-emerald-50 border-emerald-300 text-emerald-900'
                            : 'cursor-pointer bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            disabled={!isCurrentWeek}
                            checked={checklistForm.tdr018Khamis}
                            onChange={(e) => {
                              if (!isCurrentWeek) return;
                              const updated = {
                                ...checklistForm,
                                tdr018Khamis: e.target.checked,
                              };
                              setChecklistForm(updated);
                              onSaveChecklist(updated);
                            }}
                            className="w-4 h-4 accent-indigo-600"
                          />
                          <span>2️⃣ TDR018</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 pl-6">
                          Jam 9.30 malam
                        </span>
                      </label>
                    </div>

                    {/* JUMAAT */}
                    <div
                      className={`border rounded-xl p-4 space-y-2.5 ${
                        !isCurrentWeek
                          ? 'bg-slate-100 border-slate-200 opacity-65'
                          : activeDayOfWeek === 'Jumaat'
                          ? 'border-indigo-600 bg-indigo-50/30'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">
                          📌 JUMAAT
                        </span>
                        <span className="text-[11px] font-mono font-bold text-indigo-700">
                          1️⃣ TDR007
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-600">
                        Jam 11.30 malam
                      </div>
                      <label
                        className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs font-semibold ${
                          !isCurrentWeek
                            ? 'cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400'
                            : checklistForm.tdr007Jumaat
                            ? 'cursor-pointer bg-emerald-50 border-emerald-300 text-emerald-900'
                            : 'cursor-pointer bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          disabled={!isCurrentWeek}
                          checked={checklistForm.tdr007Jumaat}
                          onChange={(e) => {
                            if (!isCurrentWeek) return;
                            const updated = {
                              ...checklistForm,
                              tdr007Jumaat: e.target.checked,
                            };
                            setChecklistForm(updated);
                            onSaveChecklist(updated);
                          }}
                          className="w-4 h-4 accent-indigo-600"
                        />
                        <span>Tick 1️⃣ TDR007</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* 3. Daily Win & Daily Fokus - Setiap Hari (Hanya Tick Sahaja) */}
                <div className="space-y-3 pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h3 className="text-sm font-bold text-slate-900">
                      3. Daily Fokus & Daily Win — Setiap Hari (Ahad hingga
                      Sabtu)
                    </h3>
                    <span className="text-xs text-slate-500">
                      Ahli hanya tick sahaja selepas kongsi laporan ke CRMP &
                      Group FB Platinum
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600">
                          <th className="py-2.5 px-3 w-36">Hari</th>
                          <th className="py-2.5 px-3">
                            Daily Fokus (Setiap Hari)
                          </th>
                          <th className="py-2.5 px-3">
                            Daily Win (Setiap Hari)
                          </th>
                          <th className="py-2.5 px-3 text-right">
                            Status Hari Ini
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {DAYS_OF_WEEK.map((day) => {
                          const entry = checklistForm.dailyEntries[day];
                          const isSelectedDay = day === activeDayOfWeek;
                          const bothDone =
                            entry.dailyFokusCompleted &&
                            entry.dailyWinCompleted;
                          return (
                            <tr
                              key={day}
                              className={
                                !isCurrentWeek
                                  ? 'bg-slate-50/70 opacity-65'
                                  : isSelectedDay
                                  ? 'bg-indigo-50/40'
                                  : 'hover:bg-slate-50'
                              }
                            >
                              <td className="py-3 px-3 font-bold text-slate-900">
                                {day}
                                {isSelectedDay && (
                                  <span className="block text-[10px] font-mono text-indigo-700">
                                    Hari Dipilih
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3">
                                <label
                                  className={`inline-flex items-center gap-2.5 px-3.5 py-2 rounded-lg border font-semibold ${
                                    !isCurrentWeek
                                      ? 'cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400'
                                      : entry.dailyFokusCompleted
                                      ? 'cursor-pointer bg-emerald-50 border-emerald-300 text-emerald-900'
                                      : 'cursor-pointer bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    disabled={!isCurrentWeek}
                                    checked={entry.dailyFokusCompleted}
                                    onChange={(e) =>
                                      handleDailyFieldChange(
                                        day,
                                        'dailyFokusCompleted',
                                        e.target.checked
                                      )
                                    }
                                    className="w-4 h-4 accent-indigo-600"
                                  />
                                  <span>
                                    {entry.dailyFokusCompleted
                                      ? `✓ Daily Fokus (${day}) Selesai`
                                      : `Tick Daily Fokus (${day})`}
                                  </span>
                                </label>
                              </td>
                              <td className="py-3 px-3">
                                <label
                                  className={`inline-flex items-center gap-2.5 px-3.5 py-2 rounded-lg border font-semibold ${
                                    !isCurrentWeek
                                      ? 'cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400'
                                      : entry.dailyWinCompleted
                                      ? 'cursor-pointer bg-emerald-50 border-emerald-300 text-emerald-900'
                                      : 'cursor-pointer bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    disabled={!isCurrentWeek}
                                    checked={entry.dailyWinCompleted}
                                    onChange={(e) =>
                                      handleDailyFieldChange(
                                        day,
                                        'dailyWinCompleted',
                                        e.target.checked
                                      )
                                    }
                                    className="w-4 h-4 accent-emerald-600"
                                  />
                                  <span>
                                    {entry.dailyWinCompleted
                                      ? `✓ Daily Win (${day}) Selesai`
                                      : `Tick Daily Win (${day})`}
                                  </span>
                                </label>
                              </td>
                              <td className="py-3 px-3 text-right font-semibold">
                                {bothDone ? (
                                  <span className="text-emerald-700">
                                    ✓ Lengkap
                                  </span>
                                ) : (
                                  <span className="text-amber-700">
                                    Belum Lengkap
                                  </span>
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
            </form>
          )}

          {/* ========================================== */}
          {/* TAB 5: NAIK DRAF                           */}
          {/* ========================================== */}
          {activeTab === 'drafts' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
                <div className="border-b border-slate-200 pb-3">
                  <h2 className="text-lg font-bold text-slate-900">
                    Borang Naik Draf Penghasilan Tesis
                  </h2>
                  <p className="text-xs text-slate-500">
                    Rekod draf terkini, sujud syukur 11x, 2 jam 7 minit,
                    TDR013/TDR010, dan klik kalendar untuk tarikh draf
                  </p>
                </div>

                <form onSubmit={handleAddDraftSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        TTB
                      </label>
                      <input
                        type="text"
                        required
                        value={draftTtb}
                        onChange={(e) => setDraftTtb(e.target.value)}
                        placeholder="Julai 2027"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Draf ke berapa :
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        required
                        value={draftNum}
                        onChange={(e) => setDraftNum(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm font-mono font-bold border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Tarikh (Klik Kalendar) :
                      </label>
                      <input
                        type="date"
                        required
                        value={draftDate}
                        onChange={(e) => setDraftDate(e.target.value)}
                        className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Jumlah Page :
                      </label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={draftPages}
                        onChange={(e) => setDraftPages(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Word Count :
                      </label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={draftWords}
                        onChange={(e) => setDraftWords(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="text-xs font-bold text-slate-900">
                      Senarai Semak Naik Draf (Draf Ke-{draftNum})
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      <label className="flex items-center gap-2.5 p-2 bg-white border border-slate-200 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sujud11x}
                          onChange={(e) => setSujud11x(e.target.checked)}
                          className="w-4 h-4 accent-indigo-600"
                        />
                        <span className="font-semibold text-slate-800">
                          Sujud Syukur 11x
                        </span>
                      </label>

                      <label className="flex items-center gap-2.5 p-2 bg-white border border-slate-200 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={twoHours7Min}
                          onChange={(e) => setTwoHours7Min(e.target.checked)}
                          className="w-4 h-4 accent-indigo-600"
                        />
                        <span className="font-semibold text-slate-800">
                          2 jam 7 minit
                        </span>
                      </label>

                      <label className="flex items-center gap-2.5 p-2 bg-white border border-slate-200 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={updThesisMap}
                          onChange={(e) => setUpdThesisMap(e.target.checked)}
                          className="w-4 h-4 accent-indigo-600"
                        />
                        <span className="font-semibold text-slate-800">
                          Update Tesis Map
                        </span>
                      </label>

                      <label className="flex items-center gap-2.5 p-2 bg-white border border-slate-200 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={fbShareCrmp}
                          onChange={(e) => setFbShareCrmp(e.target.checked)}
                          className="w-4 h-4 accent-indigo-600"
                        />
                        <span className="font-semibold text-slate-800">
                          FB & Share with CRMP
                        </span>
                      </label>

                      {draftNum >= 1 && draftNum <= 10 ? (
                        <div className="sm:col-span-2 p-3 rounded-lg bg-indigo-50 border border-indigo-200 space-y-2">
                          <div className="text-[11px] font-bold text-indigo-900">
                            Draf 1 – 10 (Draf ke-{draftNum}): TDR 013 & TDR 010
                          </div>
                          <div className="flex flex-wrap gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={tdr013Checked}
                                onChange={(e) =>
                                  setTdr013Checked(e.target.checked)
                                }
                                className="w-4 h-4 accent-indigo-600"
                              />
                              <span className="font-bold text-slate-900">
                                TDR 013
                              </span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={tdr010Checked}
                                onChange={(e) =>
                                  setTdr010Checked(e.target.checked)
                                }
                                className="w-4 h-4 accent-indigo-600"
                              />
                              <span className="font-bold text-slate-900">
                                TDR 010 (Draf 1–10)
                              </span>
                            </label>
                          </div>
                        </div>
                      ) : (
                        <div className="sm:col-span-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={tdr013Checked}
                              onChange={(e) =>
                                setTdr013Checked(e.target.checked)
                              }
                              className="w-4 h-4 accent-emerald-600"
                            />
                            <span className="font-bold text-slate-900">
                              TDR 013
                            </span>
                          </label>
                          <span className="text-[11px] text-emerald-800">
                            Draf &gt; 10
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Target For Next Draf
                    </label>
                    <input
                      type="text"
                      required
                      value={targetNextDraft}
                      onChange={(e) => setTargetNextDraft(e.target.value)}
                      placeholder={`Sasaran untuk Draf ${draftNum + 1}...`}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>

                  {/* Link Draf Tesis Masing-Masing (Google Drive / OneDrive / Dokumen) */}
                  <div className="p-3.5 rounded-lg bg-indigo-50/70 border border-indigo-200 space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-indigo-950">
                      <ExternalLink className="w-3.5 h-3.5 text-indigo-700" />
                      <span>
                        Link Draf Ke-{draftNum} (Google Drive / OneDrive /
                        Dokumen Tesis Anda)
                      </span>
                    </label>
                    <input
                      type="url"
                      value={draftLinkInput}
                      onChange={(e) => setDraftLinkInput(e.target.value)}
                      placeholder="https://drive.google.com/file/d/... (Masukkan pautan fail draf tesis anda)"
                      className="w-full px-3 py-2 text-xs font-mono bg-white border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-[11px] text-indigo-800">
                      Setiap kenaikan draf, anda boleh masukkan pautan (link)
                      fail draf tesis masing-masing untuk rujukan anda dan CRMP.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-lg border border-slate-200 space-y-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-900 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={updAffirmation}
                        onChange={(e) => setUpdAffirmation(e.target.checked)}
                        className="w-4 h-4 accent-indigo-600"
                      />
                      <span>Update Affirmation Card</span>
                    </label>
                    <textarea
                      rows={2}
                      value={affirmationText}
                      onChange={(e) => setAffirmationText(e.target.value)}
                      placeholder="Tulis kata-kata afirmasi positif tesis anda..."
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                    />
                  </div>

                  {/* Catatan Ahli Untuk Kenaikan Draf Ini (Pilihan) */}
                  <div className="p-3.5 rounded-lg bg-amber-50/60 border border-amber-200 space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                      <StickyNote className="w-3.5 h-3.5 text-amber-700" />
                      <span>
                        Catatan Draf Ke-{draftNum} (Pilihan — Boleh Buat Catatan
                        Untuk Draf Ini)
                      </span>
                    </label>
                    <textarea
                      rows={2}
                      value={draftMemberNotes}
                      onChange={(e) => setDraftMemberNotes(e.target.value)}
                      placeholder="Contoh: Bab 2 subtopik 2.3 selesai ditambah 15 muka surat, rujukan jurnal terkini telah dimasukkan..."
                      className="w-full px-3 py-2 text-xs bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('thesis_map')}
                      className="text-xs font-semibold text-indigo-700 hover:underline cursor-pointer"
                    >
                      Kemaskini Thesis Map (Bab 1–5+) →
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold rounded-xl cursor-pointer"
                    >
                      Simpan Draf Ke-{draftNum}
                    </button>
                  </div>
                </form>
              </div>

              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <div className="border-b border-slate-200 pb-3">
                  <h3 className="text-base font-bold text-slate-900">
                    Maklumat Setiap Kenaikan Draf ({memberDrafts.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Lihat maklumat penuh setiap kenaikan draf, buka link draf
                    masing-masing, dan tambah atau kemaskini catatan anda pada
                    bila-bila masa
                  </p>
                </div>

                {memberDrafts.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
                    Belum ada rekod kenaikan draf. Sila isi borang di sebelah
                    kiri untuk merekodkan kenaikan draf pertama anda.
                  </div>
                ) : (
                  <div className="space-y-3.5 max-h-[720px] overflow-y-auto pr-1">
                    {memberDrafts.map((d, index) => {
                      // Cari draf sebelumnya untuk kira pertambahan muka surat & perkataan
                      const prevDraft = memberDrafts[index + 1];
                      const pageDiff = prevDraft
                        ? d.pageCount - prevDraft.pageCount
                        : d.pageCount;
                      const wordDiff = prevDraft
                        ? d.wordCount - prevDraft.wordCount
                        : d.wordCount;
                      const isExpanded = selectedDraftDetailId === d.id;
                      const currentNoteVal =
                        draftNotesEditMap[d.id] !== undefined
                          ? draftNotesEditMap[d.id]
                          : d.memberNotes || '';
                      const currentLinkVal =
                        draftLinksEditMap[d.id] !== undefined
                          ? draftLinksEditMap[d.id]
                          : d.draftLink || '';

                      return (
                        <div
                          key={d.id}
                          className="border border-slate-200 rounded-xl p-4 space-y-3 hover:border-indigo-300 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <span className="font-mono text-sm font-bold text-indigo-700">
                                Draf Ke-{d.draftNumber}
                              </span>
                              <span className="ml-2 px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 font-mono text-[10px] font-bold">
                                TTB: {d.ttb}
                              </span>
                            </div>
                            <span className="font-mono text-xs text-slate-500">
                              {d.date}
                            </span>
                          </div>

                          {/* Maklumat Kenaikan Muka Surat & Perkataan */}
                          <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono">
                            <div>
                              <div className="text-[10px] text-slate-500">
                                Jumlah Muka Surat
                              </div>
                              <div className="font-bold text-slate-900 text-sm">
                                {d.pageCount} ms
                              </div>
                              <div className="text-[10px] text-emerald-700 font-bold">
                                {prevDraft
                                  ? `${pageDiff >= 0 ? '+' : ''}${pageDiff} ms berbanding Draf ${prevDraft.draftNumber}`
                                  : 'Rekod permulaan'}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] text-slate-500">
                                Jumlah Perkataan
                              </div>
                              <div className="font-bold text-slate-900 text-sm">
                                {d.wordCount.toLocaleString()}
                              </div>
                              <div className="text-[10px] text-emerald-700 font-bold">
                                {prevDraft
                                  ? `${wordDiff >= 0 ? '+' : ''}${wordDiff.toLocaleString()} perkataan`
                                  : 'Rekod permulaan'}
                              </div>
                            </div>
                          </div>

                          {/* Paparan Link Draf Masing-Masing */}
                          {d.draftLink ? (
                            <div className="p-2.5 rounded-lg bg-indigo-50/80 border border-indigo-200 flex items-center justify-between gap-2 text-xs">
                              <div className="min-w-0">
                                <div className="text-[10px] font-bold text-indigo-700 uppercase">
                                  Link Draf Ke-{d.draftNumber}
                                </div>
                                <div className="font-mono text-[11px] text-slate-700 truncate">
                                  {d.draftLink}
                                </div>
                              </div>
                              <a
                                href={d.draftLink}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white text-[11px] font-semibold rounded-lg inline-flex items-center gap-1 shrink-0"
                              >
                                Buka Link Draf
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          ) : (
                            <div className="p-2 rounded-lg bg-slate-50 border border-dashed border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
                              <span>Tiada pautan link draf dimasukkan</span>
                              <button
                                type="button"
                                onClick={() => setSelectedDraftDetailId(d.id)}
                                className="text-indigo-700 font-bold hover:underline cursor-pointer"
                              >
                                + Masukkan Link Draf
                              </button>
                            </div>
                          )}

                          {/* Senarai Semak Kenaikan Draf */}
                          <div className="text-xs text-slate-700 flex flex-wrap gap-1.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                                d.sujudSyukur11x
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {d.sujudSyukur11x ? '✓' : '✗'} Sujud Syukur 11x
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                                d.twoHoursSevenMinutes
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {d.twoHoursSevenMinutes ? '✓' : '✗'} 2 Jam 7 Minit
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                                d.updateThesisMap
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {d.updateThesisMap ? '✓' : '✗'} Update Thesis Map
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                                d.fbShareWithCrmp
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {d.fbShareWithCrmp ? '✓' : '✗'} FB & Share CRMP
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                                d.tdr013
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {d.tdr013 ? '✓' : '✗'} TDR 013
                            </span>
                            {d.draftNumber <= 10 && (
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                                  d.tdr010
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {d.tdr010 ? '✓' : '✗'} TDR 010
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-slate-700">
                            <span className="font-semibold">
                              Target Next Draf:
                            </span>{' '}
                            {d.targetForNextDraft}
                          </div>

                          {/* Paparan Catatan Ahli Sedia Ada */}
                          {d.memberNotes && !isExpanded && (
                            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-950">
                              <div className="font-bold flex items-center gap-1 text-[11px] text-amber-800 mb-0.5">
                                <StickyNote className="w-3 h-3" />
                                Catatan Draf Anda:
                              </div>
                              <div>{d.memberNotes}</div>
                            </div>
                          )}

                          {/* Maklum Balas CRMP */}
                          {d.crmpFeedback && (
                            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                              <strong>Maklum Balas CRMP:</strong>{' '}
                              {d.crmpFeedback}
                            </div>
                          )}

                          {/* Butang Lihat Maklumat Penuh & Buat/Kemaskini Catatan / Link */}
                          <div className="pt-1 border-t border-slate-100 flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedDraftDetailId(
                                  isExpanded ? null : d.id
                                )
                              }
                              className="text-xs font-bold text-indigo-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              {isExpanded
                                ? 'Tutup Maklumat, Link & Catatan'
                                : 'Lihat Maklumat Penuh / Edit Link & Catatan'}
                            </button>
                          </div>

                          {/* Panel Terperinci Maklumat Kenaikan Draf & Ruangan Link + Catatan Ahli */}
                          {isExpanded && (
                            <div className="p-3.5 rounded-xl bg-slate-50 border border-indigo-200 space-y-3 text-xs">
                              <div className="font-bold text-slate-900 border-b border-slate-200 pb-1.5">
                                Maklumat Penuh Kenaikan Draf Ke-{d.draftNumber}{' '}
                                ({d.date})
                              </div>
                              <div className="space-y-1 text-slate-700">
                                <div>
                                  <strong>Tarikh / Tempoh Tamat Belajar (TTB):</strong>{' '}
                                  {d.ttb}
                                </div>
                                <div>
                                  <strong>Update Affirmation Card:</strong>{' '}
                                  {d.updateAffirmationCard ? 'Ya' : 'Tidak'}
                                </div>
                                {d.affirmationText && (
                                  <div>
                                    <strong>Teks Afirmasi:</strong> &ldquo;
                                    {d.affirmationText}&rdquo;
                                  </div>
                                )}
                              </div>

                              <div className="space-y-2 pt-1">
                                <div>
                                  <label className="block text-xs font-bold text-indigo-900 mb-1">
                                    Link Draf Ke-{d.draftNumber} (Google Drive /
                                    OneDrive / Fail):
                                  </label>
                                  <input
                                    type="url"
                                    value={currentLinkVal}
                                    onChange={(e) =>
                                      setDraftLinksEditMap({
                                        ...draftLinksEditMap,
                                        [d.id]: e.target.value,
                                      })
                                    }
                                    placeholder="https://drive.google.com/file/d/..."
                                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-bold text-amber-900 mb-1">
                                    Catatan Anda Untuk Draf Ke-{d.draftNumber}:
                                  </label>
                                  <textarea
                                    rows={2}
                                    value={currentNoteVal}
                                    onChange={(e) =>
                                      setDraftNotesEditMap({
                                        ...draftNotesEditMap,
                                        [d.id]: e.target.value,
                                      })
                                    }
                                    placeholder="Tulis atau kemaskini catatan anda untuk kenaikan draf ini..."
                                    className="w-full px-3 py-2 text-xs bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                                  />
                                </div>

                                <div className="flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleSaveExistingDraftNote(d)
                                    }
                                    className="px-3.5 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
                                  >
                                    Simpan Link & Catatan Draf Ke-{d.draftNumber}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* TAB 6: THESIS MAP UPDATE (VISUAL MIND-MAP) */}
          {/* (TENGAH TAJUK KAJIAN -> BAB -> SUBTOPIK)   */}
          {/* ========================================== */}
          {activeTab === 'thesis_map' && (
            <div className="space-y-6">
              {/* BAHAGIAN 1: VISUAL THESIS MAP (PETA MINDA TAJUK KAJIAN -> BAB -> SUBTOPIK) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Peta Visual Thesis Map (Table of Contents → Mind Map)
                    </h2>
                    <p className="text-xs text-slate-500">
                      Apabila anda mengisi Tajuk Kajian, Bab, dan Subtopik di
                      bawah, sistem menjana peta struktur tesis anda secara
                      automatik. Klik pada mana-mana subtopik dalam peta untuk
                      menanda selesai.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveThesisMap}
                    className="px-5 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold rounded-xl whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Simpan Thesis Map
                  </button>
                </div>

                {/* VISUAL MAP DIAGRAM: TENGAH TAJUK KAJIAN -> PECAH IKUT BAB -> PECAH IKUT SUBTOPIK */}
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 overflow-x-auto">
                  <div className="min-w-[780px] flex flex-col items-center">
                    {/* 1. Pusat Peta: TAJUK KAJIAN (Di Tengah) */}
                    <div className="max-w-2xl w-full bg-slate-900 text-white rounded-2xl p-5 border-2 border-indigo-500 shadow-sm text-center space-y-1.5 relative">
                      <div className="text-[11px] font-mono uppercase tracking-wider text-amber-300 font-bold">
                        TAJUK KAJIAN UTAMA ({member.username} · {member.university})
                      </div>
                      <div className="text-sm sm:text-base font-bold leading-snug">
                        {researchTitleMapInput || member.researchTitle}
                      </div>
                      <div className="text-xs font-mono text-slate-300 pt-1">
                        Kemajuan Keseluruhan Tesis: {member.overallProgress}% ·{' '}
                        {chapters.length} Bab Utama
                      </div>
                    </div>

                    {/* Garis Menegak Dari Tajuk Kajian Ke Garis Cabang Bab */}
                    <div className="w-0.5 h-8 bg-indigo-400" />

                    {/* 2. Pecahan Mengikut Bab (Cabang Mendatar) */}
                    <div
                      className="w-full grid gap-4 relative"
                      style={{
                        gridTemplateColumns: `repeat(${chapters.length}, minmax(190px, 1fr))`,
                      }}
                    >
                      {chapters.map((ch, idx) => {
                        const subs = ch.subtopics || [];
                        const doneSubs = subs.filter((s) => s.completed).length;
                        const isChapterDone =
                          ch.status === 'Selesai' || ch.progress === 100;

                        return (
                          <div
                            key={ch.id}
                            className="flex flex-col items-center relative"
                          >
                            {/* Garis Penghubung Mendatar Antara Bab */}
                            {chapters.length > 1 && (
                              <div
                                className={`h-0.5 bg-indigo-400 absolute top-0 ${
                                  idx === 0
                                    ? 'left-1/2 right-0'
                                    : idx === chapters.length - 1
                                    ? 'left-0 right-1/2'
                                    : 'left-0 right-0'
                                }`}
                              />
                            )}

                            {/* Garis Menegak Pendek Ke Kotak Bab */}
                            <div className="w-0.5 h-6 bg-indigo-400" />

                            {/* Kotak Nod BAB */}
                            <div
                              className={`w-full rounded-xl p-3.5 border-2 shadow-xs space-y-2 ${
                                isChapterDone
                                  ? 'bg-emerald-50 border-emerald-500'
                                  : ch.progress > 0
                                  ? 'bg-indigo-50/70 border-indigo-500'
                                  : 'bg-white border-slate-300'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-xs font-bold text-indigo-800">
                                  BAB {ch.chapterNumber}
                                </span>
                                <span
                                  className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                                    isChapterDone
                                      ? 'bg-emerald-700 text-white'
                                      : 'bg-white text-slate-800 border border-slate-200'
                                  }`}
                                >
                                  {ch.progress}%
                                </span>
                              </div>
                              <div className="text-xs font-bold text-slate-900 leading-snug">
                                {ch.title.replace(/^Bab \d+:\s*/i, '')}
                              </div>
                              <div className="w-full h-1.5 bg-white rounded-full overflow-hidden border border-slate-200">
                                <div
                                  className={`h-full ${
                                    isChapterDone
                                      ? 'bg-emerald-600'
                                      : 'bg-indigo-600'
                                  }`}
                                  style={{ width: `${ch.progress}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                                <span>
                                  Subtopik: {doneSubs}/{subs.length}
                                </span>
                                <span>{ch.pages} ms</span>
                              </div>
                            </div>

                            {/* Garis Menegak Dari Bab Ke Senarai Subtopik */}
                            <div className="w-0.5 h-4 bg-slate-300" />

                            {/* 3. Pecahan Mengikut Subtopik Di Dalam Bab */}
                            <div className="w-full pl-3 border-l-2 border-indigo-300 space-y-2">
                              {subs.length === 0 ? (
                                <div className="p-2.5 rounded-lg bg-white border border-dashed border-slate-300 text-[11px] text-slate-400">
                                  Tiada subtopik ditambah
                                </div>
                              ) : (
                                subs.map((sub) => (
                                  <div
                                    key={sub.id}
                                    onClick={() =>
                                      handleToggleSubtopicComplete(
                                        ch.id,
                                        sub.id
                                      )
                                    }
                                    title="Klik untuk tanda selesai / belum selesai"
                                    className={`relative p-2.5 rounded-lg border text-xs transition-colors cursor-pointer flex items-start gap-2 ${
                                      sub.completed
                                        ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                                        : 'bg-white border-slate-200 text-slate-800 hover:border-indigo-300'
                                    }`}
                                  >
                                    {/* Cabang Kecil Ke Kiri */}
                                    <span className="w-3 h-0.5 bg-indigo-300 absolute -left-3 top-4" />
                                    <input
                                      type="checkbox"
                                      checked={sub.completed}
                                      onChange={() => {}}
                                      className="mt-0.5 w-3.5 h-3.5 accent-emerald-600 shrink-0 cursor-pointer"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <div className="font-mono text-[10px] font-bold text-indigo-700">
                                        {sub.code}
                                      </div>
                                      <div
                                        className={`text-[11px] font-medium leading-tight ${
                                          sub.completed ? 'line-through opacity-80' : ''
                                        }`}
                                      >
                                        {sub.title}
                                      </div>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* BAHAGIAN 2: BORANG TABLE OF CONTENTS (ISI TAJUK KAJIAN, BAB & SUBTOPIK) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
                <div className="border-b border-slate-200 pb-3">
                  <h3 className="text-base font-bold text-slate-900">
                    Kemaskini Isi Kandungan (Table of Contents: Tajuk Kajian, Bab
                    & Subtopik)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Masukkan atau sunting Tajuk Kajian, Tajuk Bab, serta
                    pecahan Subtopik di bawah. Setiap perubahan akan terus
                    dikemaskini pada Peta Visual Thesis Map di atas.
                  </p>
                </div>

                {/* Input Tajuk Kajian (Pusat Peta) */}
                <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-200 space-y-2">
                  <label className="block text-xs font-bold text-indigo-950">
                    Tajuk Kajian Utama (Terletak Di Tengah Thesis Map)
                  </label>
                  <input
                    type="text"
                    value={researchTitleMapInput}
                    onChange={(e) => {
                      const nextVal = e.target.value;
                      setResearchTitleMapInput(nextVal);
                      commitProfileChanges({ researchTitle: nextVal });
                    }}
                    placeholder="Masukkan tajuk penuh kajian PhD anda..."
                    className="w-full px-3.5 py-2.5 text-sm font-semibold bg-white border border-indigo-300 rounded-xl focus:outline-none focus:border-indigo-600"
                  />
                </div>

                {/* Senarai Bab & Subtopik */}
                <div className="space-y-4">
                  {chapters.map((ch) => {
                    const subs = ch.subtopics || [];
                    return (
                      <div
                        key={ch.id}
                        className="border border-slate-200 rounded-2xl p-5 space-y-4 bg-slate-50/40"
                      >
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center border-b border-slate-200 pb-4">
                          <div className="lg:col-span-5 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-bold text-indigo-700">
                                BAB {ch.chapterNumber}
                              </span>
                              {ch.chapterNumber > 5 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveExtraChapter(ch.id)
                                  }
                                  className="text-xs text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" /> Padam Bab
                                </button>
                              )}
                            </div>
                            <input
                              type="text"
                              value={ch.title}
                              onChange={(e) =>
                                handleUpdateChapter(
                                  ch.id,
                                  'title',
                                  e.target.value
                                )
                              }
                              className="w-full px-3 py-2 text-sm font-bold bg-white border border-slate-300 rounded-lg"
                            />
                          </div>

                          <div className="lg:col-span-3">
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                              Status Bab
                            </label>
                            <select
                              value={ch.status}
                              onChange={(e) =>
                                handleUpdateChapter(
                                  ch.id,
                                  'status',
                                  e.target.value
                                )
                              }
                              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-semibold"
                            >
                              <option value="Belum Mula">Belum Mula</option>
                              <option value="Sedang Dideraf">
                                Sedang Dideraf
                              </option>
                              <option value="Semakan Penyelia">
                                Semakan Penyelia
                              </option>
                              <option value="Selesai">Selesai</option>
                            </select>
                          </div>

                          <div className="lg:col-span-2 space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-600 font-medium">
                                Kemajuan
                              </span>
                              <span className="font-mono font-bold text-indigo-700">
                                {ch.progress}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={ch.progress}
                              onChange={(e) =>
                                handleUpdateChapter(
                                  ch.id,
                                  'progress',
                                  Number(e.target.value)
                                )
                              }
                              className="w-full accent-indigo-600 cursor-pointer"
                            />
                          </div>

                          <div className="lg:col-span-2">
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                              Muka Surat
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={ch.pages}
                              onChange={(e) =>
                                handleUpdateChapter(
                                  ch.id,
                                  'pages',
                                  Number(e.target.value)
                                )
                              }
                              className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                            />
                          </div>
                        </div>

                        {/* Pecahan Subtopik Dalam Bab Ini */}
                        <div className="space-y-2.5 pl-2 sm:pl-4 border-l-2 border-indigo-200">
                          <div className="text-xs font-bold text-slate-700">
                            Pecahan Subtopik Bab {ch.chapterNumber} ({subs.length}{' '}
                            Subtopik):
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {subs.map((sub) => (
                              <div
                                key={sub.id}
                                className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2"
                              >
                                <input
                                  type="checkbox"
                                  checked={sub.completed}
                                  onChange={() =>
                                    handleToggleSubtopicComplete(ch.id, sub.id)
                                  }
                                  title="Tanda subtopik selesai"
                                  className="w-4 h-4 accent-emerald-600 shrink-0 cursor-pointer"
                                />
                                <span className="font-mono text-xs font-bold text-indigo-700 shrink-0">
                                  {sub.code}
                                </span>
                                <input
                                  type="text"
                                  value={sub.title}
                                  onChange={(e) =>
                                    handleUpdateSubtopicTitle(
                                      ch.id,
                                      sub.id,
                                      e.target.value
                                    )
                                  }
                                  className="flex-1 text-xs text-slate-800 font-medium bg-transparent focus:outline-none border-b border-transparent focus:border-indigo-400 py-0.5"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeleteSubtopic(ch.id, sub.id)
                                  }
                                  title="Padam subtopik"
                                  className="p-1 text-slate-400 hover:text-red-600 cursor-pointer shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>

                          {/* Tambah Subtopik Baharu untuk Bab Ini */}
                          <div className="flex items-center gap-2 pt-1 max-w-lg">
                            <input
                              type="text"
                              value={newSubtopicInputs[ch.id] || ''}
                              onChange={(e) =>
                                setNewSubtopicInputs((prev) => ({
                                  ...prev,
                                  [ch.id]: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddSubtopic(ch.id);
                                }
                              }}
                              placeholder={`Tambah subtopik ${ch.chapterNumber}.${
                                subs.length + 1
                              } (cth: Kerangka Konseptual)...`}
                              className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddSubtopic(ch.id)}
                              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-semibold rounded-lg inline-flex items-center gap-1 cursor-pointer shrink-0"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Tambah Subtopik
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add Bab jika ada lebih dari 5 bab */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="text-xs font-bold text-slate-900">
                      Add Bab (Jika Ada Lebih Dari 5 Bab)
                    </div>
                    <input
                      type="text"
                      value={newChapterTitle}
                      onChange={(e) => setNewChapterTitle(e.target.value)}
                      placeholder={`Contoh: Bab ${
                        chapters.length + 1
                      }: Dapatan Kajian Tambahan`}
                      className="mt-1.5 w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddExtraChapter}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Add Bab {chapters.length + 1}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* TAB 7: KEHADIRAN & VOTE VC                 */}
          {/* (HANYA 1 BUTANG HADIR + CATATAN PILIHAN)   */}
          {/* ========================================== */}
          {activeTab === 'vc_attendance' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
                <div className="border-b border-slate-200 pb-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900">
                      Vote Kehadiran VC Hari Ini
                    </h2>
                    <span
                      className={`text-xs font-mono font-bold px-2.5 py-1 rounded-md ${
                        isVcVoteOpenToday
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      {isVcVoteOpenToday ? 'VOTE AKTIF (ON)' : 'VOTE OFF'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Tekan butang <strong>HADIR</strong> di bawah untuk mengesahkan
                    kehadiran anda. Jika tidak ditekan, sistem merekodkan anda
                    sebagai <strong>Tidak Hadir</strong> secara automatik.
                  </p>
                </div>

                {/* Maklumat Hari Semasa & Tema VC */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">
                      Tarikh Hari Semasa (Dikunci):
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {todayDayName}, {TODAY_DATE_STR}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">
                      Status Kehadiran Anda Hari Ini:
                    </span>
                    {todayVoteRecord ? (
                      <span className="font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded">
                        ✓ HADIR ({todayVoteRecord.checkInTime})
                      </span>
                    ) : (
                      <span className="font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded">
                        BELUM TEKAN HADIR (TIDAK HADIR)
                      </span>
                    )}
                  </div>
                  <div className="pt-2 border-t border-slate-200 space-y-1">
                    <div className="text-slate-500 font-medium">
                      Tema VC Hari Ini (Oleh CRMP):
                    </div>
                    <div className="text-sm font-bold text-slate-900">
                      {vcSettings.dailyTheme}
                    </div>
                  </div>
                </div>

                {/* Semak sama ada Pakej Holding Room, Hujung Minggu, atau OFF */}
                {isHoldingRoom ? (
                  <div className="p-5 rounded-xl bg-red-50 border border-red-200 text-center space-y-2">
                    <Lock className="w-7 h-7 text-red-600 mx-auto" />
                    <div className="text-sm font-bold text-red-900">
                      Akses Join VC & Vote VC Dikunci (Pakej Holding Room)
                    </div>
                    <p className="text-xs text-red-700 leading-relaxed">
                      Akaun anda kini berada di dalam pakej{' '}
                      <strong>Holding Room ({member.username})</strong>. Ahli di
                      dalam Holding Room tidak boleh menyertai sesi VC (Join VC)
                      atau menanda kehadiran VC sehingga pakej dinaik taraf oleh
                      Pentadbir.
                    </p>
                  </div>
                ) : !isTodayWeekday ? (
                  <div className="p-5 rounded-xl bg-slate-100 border border-slate-300 text-center space-y-1.5">
                    <div className="text-sm font-bold text-slate-800">
                      Vote VC Ditutup (Hujung Minggu)
                    </div>
                    <p className="text-xs text-slate-600">
                      Sesi VC hanya dijalankan pada hari Isnin hingga Jumaat
                      sahaja.
                    </p>
                  </div>
                ) : isTodaySetOffByAdmin ? (
                  <div className="p-5 rounded-xl bg-red-50 border border-red-200 text-center space-y-1.5">
                    <div className="text-sm font-bold text-red-900">
                      Tiada Sesi VC Hari Ini (Vote VC OFF)
                    </div>
                    <p className="text-xs text-red-700">
                      Pentadbir (Admin) telah menetapkan bahawa tiada sesi VC
                      pada hari ini ({TODAY_DATE_STR}).
                    </p>
                  </div>
                ) : !isPast620PM ? (
                  <div className="p-5 rounded-xl bg-amber-50 border border-amber-200 text-center space-y-1.5">
                    <Clock className="w-6 h-6 text-amber-700 mx-auto" />
                    <div className="text-sm font-bold text-amber-950">
                      Vote VC Akan Diaktifkan Pada Pukul 6:20 Petang
                    </div>
                    <p className="text-xs text-amber-800">
                      Sesi VC bermula pada 6:01 Petang. Sila tunggu sehingga
                      6:20 Petang untuk menekan butang Hadir.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleVoteVCSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Catatan / Nota VC Hari Ini (Pilihan — Boleh Tengok Semula
                        Nanti)
                      </label>
                      <textarea
                        rows={3}
                        value={vcTakeaway}
                        onChange={(e) => setVcTakeaway(e.target.value)}
                        placeholder="Tulis catatan atau ilmu penting daripada sesi VC hari ini jika mahu (pilihan)..."
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-600"
                      />
                    </div>

                    {/* Hanya 1 Butang HADIR sahaja */}
                    <button
                      type="submit"
                      className={`w-full py-3.5 px-4 text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs ${
                        todayVoteRecord
                          ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                          : 'bg-indigo-700 hover:bg-indigo-800 text-white'
                      }`}
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      {todayVoteRecord
                        ? '✓ TELAH HADIR (Simpan Kemaskini Catatan)'
                        : 'HADIR VC HARI INI'}
                    </button>
                  </form>
                )}
              </div>

              <div className="lg:col-span-7 space-y-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                  <div className="border-b border-slate-200 pb-3">
                    <h3 className="text-base font-bold text-slate-900">
                      Peratus Kehadiran VC Hari Ini Mengikut Kumpulan CRMP (
                      {TODAY_DATE_STR})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Tema: {vcSettings.dailyTheme}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {crmpAttendanceStats.map((stat) => (
                      <div key={stat.crmp.id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800">
                            {stat.crmp.username} — {stat.crmp.name}
                          </span>
                          <span className="font-mono font-bold text-indigo-700 tabular-nums">
                            {stat.attended}/{stat.total} Ahli Hadir (
                            {stat.percentage}%)
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-600 transition-all"
                            style={{ width: `${stat.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Arkib Rekod Kehadiran & Catatan VC Ahli (Boleh Tengok Balik) */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Rekod Kehadiran & Koleksi Catatan VC Anda ({myVotes.length})
                      </h3>
                      <p className="text-xs text-slate-500">
                        Klik pada mana-mana rekod di bawah untuk membaca semula
                        catatan VC anda
                      </p>
                    </div>
                  </div>

                  {selectedNoteVote && (
                    <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-indigo-800">
                          Catatan VC Pada {selectedNoteVote.date} (
                          {selectedNoteVote.checkInTime})
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedNoteVote(null)}
                          className="text-indigo-700 hover:underline font-semibold cursor-pointer"
                        >
                          Tutup Paparan
                        </button>
                      </div>
                      <div className="font-bold text-slate-900 text-sm">
                        Tema: {selectedNoteVote.sessionName}
                      </div>
                      <div className="p-3 rounded-lg bg-white border border-indigo-100 text-slate-800 whitespace-pre-line">
                        {selectedNoteVote.takeawayNote
                          ? selectedNoteVote.takeawayNote
                          : 'Tiada catatan ditulis untuk sesi VC ini.'}
                      </div>
                    </div>
                  )}

                  <div className="divide-y divide-slate-100 text-xs">
                    {myVotes.map((v) => (
                      <div
                        key={v.id}
                        onClick={() => setSelectedNoteVote(v)}
                        className="py-3 px-2 hover:bg-slate-50 rounded-lg flex items-start justify-between gap-4 cursor-pointer transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="font-bold text-slate-900">
                            {v.sessionName}
                          </div>
                          {v.takeawayNote ? (
                            <div className="text-slate-700 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200">
                              <span className="font-semibold text-indigo-700">
                                Catatan Anda:{' '}
                              </span>
                              {v.takeawayNote}
                            </div>
                          ) : (
                            <div className="text-slate-400 italic">
                              Tiada catatan tambahan
                            </div>
                          )}
                        </div>
                        <div className="text-right font-mono shrink-0">
                          <div className="font-bold text-emerald-700">
                            ✓ HADIR
                          </div>
                          <div className="text-slate-500">
                            {v.date} · {v.checkInTime}
                          </div>
                          <div className="text-[11px] text-indigo-700 font-sans font-semibold mt-0.5">
                            Lihat Catatan →
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* TAB 8: RAKAMAN ZOOM, BASIC & BERBAYAR      */}
          {/* ========================================== */}
          {activeTab === 'recordings' && (
            <div className="space-y-6">
              {isHoldingRoom && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3">
                  <Lock className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs">
                    <div className="font-bold text-red-950">
                      Sekatan Pakej Holding Room ({member.username})
                    </div>
                    <p className="text-red-800">
                      Ahli di dalam pakej <strong>Holding Room</strong> tidak
                      mempunyai akses kepada{' '}
                      <strong>Rakaman Kelas Percuma (Kelas Basic)</strong>,{' '}
                      <strong>Rakaman Zoom</strong>, serta tidak boleh menyertai{' '}
                      <strong>Sesi VC</strong>.
                    </p>
                  </div>
                </div>
              )}

              {/* KOLEKSI LEARNING POINT KELAS YANG DIHADIRI (AHLI HANYA MASUKKAN LINK & BACA BILA-BILA MASA) */}
              <div className="bg-white border border-indigo-200 rounded-2xl p-6 space-y-5 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-md mb-1.5">
                      <BookOpen className="w-3.5 h-3.5" />
                      Nota & Refleksi Kelas Ahli
                    </div>
                    <h2 className="text-base font-bold text-slate-900">
                      Koleksi Learning Point Kelas Yang Dihadiri (
                      {memberLearningPoints.length})
                    </h2>
                    <p className="text-xs text-slate-500">
                      Tambah pautan (link Google Docs / Canva / Notion / Drive /
                      FB) bagi learning point kelas yang anda hadiri untuk
                      dibaca semula pada bila-bila masa.
                    </p>
                  </div>
                </div>

                {/* Borang Pantas Tambah Learning Point (Hanya Pilih Kelas & Masukkan Link) */}
                <form
                  onSubmit={handleQuickAddLearningPoint}
                  className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
                >
                  <div className="md:col-span-5">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Pilih Kelas Yang Dihadiri
                    </label>
                    <select
                      value={quickLpRecId}
                      onChange={(e) => setQuickLpRecId(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-semibold text-slate-800"
                    >
                      {recordings.map((r) => (
                        <option key={r.id} value={r.id}>
                          [
                          {r.category === 'zoom'
                            ? 'Zoom'
                            : r.category === 'basic'
                            ? 'Kelas Basic'
                            : 'Kelas Berbayar'}
                          ] {r.title} ({r.date})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-5">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Link Learning Point Anda (Hanya Masukkan Link)
                    </label>
                    <input
                      type="text"
                      required
                      value={quickLpLink}
                      onChange={(e) => setQuickLpLink(e.target.value)}
                      placeholder="https://docs.google.com/document/d/..."
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <button
                      type="submit"
                      className="w-full py-2 px-3 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Simpan Link
                    </button>
                  </div>
                </form>

                {/* Senarai Learning Point Tersimpan */}
                {memberLearningPoints.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 text-center">
                    Belum ada link Learning Point disimpan. Anda boleh masukkan
                    link melalui ruangan di atas atau klik{' '}
                    <strong>"+ Tambah Learning Point (Masukkan Link)"</strong>{' '}
                    pada mana-mana kad kelas di bawah.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {memberLearningPoints.map((lp) => {
                      const matchedRec = recordings.find(
                        (r) => r.id === lp.recordingId
                      );
                      const displayTitle =
                        matchedRec?.title || lp.recordingTitle;
                      const displayDate = matchedRec?.date || lp.classDate;
                      return (
                        <div
                          key={lp.id}
                          className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/30 flex flex-col justify-between gap-2.5"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-mono">
                              <span className="font-bold text-indigo-700 uppercase">
                                {lp.category === 'zoom'
                                  ? 'Rakaman Zoom'
                                  : lp.category === 'basic'
                                  ? 'Kelas Basic'
                                  : 'Kelas Berbayar'}{' '}
                                · {displayDate}
                              </span>
                              <span className="text-slate-500">
                                Dikemaskini: {lp.updatedAt}
                              </span>
                            </div>
                            <div className="text-xs font-bold text-slate-900">
                              {displayTitle}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 truncate">
                              {lp.link}
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-indigo-100 gap-2">
                            <a
                              href={lp.link}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Baca Learning Point
                            </a>
                            <div className="flex items-center gap-1.5">
                              {matchedRec && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleOpenLearningPointEditor(matchedRec)
                                  }
                                  className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md cursor-pointer inline-flex items-center gap-1"
                                >
                                  <Pencil className="w-3 h-3" />
                                  Ubah Link
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteLearningPoint(lp.recordingId)
                                }
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-md cursor-pointer"
                                title="Padam Link Learning Point"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* BAR PENAPIS & PECAHAN BAHAN / VIDEO MENGIKUT TAHUN */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
                <div className="space-y-0.5">
                  <div className="text-sm font-bold text-slate-900">
                    Arkib Bahan & Rakaman Video Mengikut Tahun
                  </div>
                  <p className="text-xs text-slate-500">
                    Semua bahan rujukan, rakaman Zoom, Kelas Basic dan Kelas
                    Berbayar dipecahkan mengikut tahun untuk memudahkan carian
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRecordingYear('ALL')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      selectedRecordingYear === 'ALL'
                        ? 'bg-indigo-700 border-indigo-700 text-white shadow-xs'
                        : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Semua Tahun ({recordings.length})
                  </button>
                  {availableRecordingYears.map((yr) => {
                    const countForYear = recordings.filter(
                      (r) => getRecordingYear(r.date) === yr
                    ).length;
                    const isSelected = selectedRecordingYear === yr;
                    return (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => setSelectedRecordingYear(yr)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        Tahun {yr} ({countForYear})
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      1. Rakaman Zoom ({member.package})
                    </h2>
                    <p className="text-xs text-slate-500">
                      {member.package === 'Premier'
                        ? 'Ahli Premier: Akses Link Video Setiap Minggu & Bulanan'
                        : member.package === 'Holding Room'
                        ? 'Ahli Holding Room: Tiada Akses Rakaman Zoom'
                        : 'Ahli Elite Plus & Elite: Akses Link Video Setiap Bulan'}
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-lg self-start sm:self-auto">
                    {selectedRecordingYear === 'ALL'
                      ? `Semua Tahun (${zoomRecordings.length} Video)`
                      : `Tahun ${selectedRecordingYear} (${zoomRecordings.length} Video)`}
                  </span>
                </div>

                {zoomRecordings.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                    Tiada rakaman Zoom direkodkan bagi tahun yang dipilih.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {groupRecordingsByYear(zoomRecordings).map((group) => (
                      <div key={group.year} className="space-y-3">
                        <div className="flex items-center justify-between bg-slate-100 border border-slate-200 px-3.5 py-2 rounded-xl">
                          <span className="text-xs font-bold text-slate-900 font-mono">
                            📁 Rakaman Zoom — Tahun {group.year}
                          </span>
                          <span className="text-[11px] font-mono font-semibold text-slate-600">
                            {group.items.length} Video
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {group.items.map((rec) => {
                            const unlocked = canAccessZoom(rec);
                            const savedLp = getLearningPointForRecording(
                              rec.id
                            );
                            const isEditingLp = lpEditingRecId === rec.id;
                            return (
                              <div
                                key={rec.id}
                                className={`border rounded-xl p-4 flex flex-col justify-between space-y-3 ${
                                  unlocked
                                    ? 'border-slate-200 bg-white'
                                    : 'border-slate-200 bg-slate-50 opacity-75'
                                }`}
                              >
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                                    <span>
                                      Rakaman Zoom ·{' '}
                                      {rec.zoomFrequency || 'Bulanan'} · Tahun{' '}
                                      {group.year}
                                    </span>
                                    <span>{rec.date}</span>
                                  </div>
                                  <h3 className="text-sm font-bold text-slate-900">
                                    {rec.title}
                                  </h3>
                                  <p className="text-xs text-slate-600">
                                    {rec.description}
                                  </p>
                                </div>

                                <div className="space-y-2.5 pt-3 border-t border-slate-100">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-500 font-mono">
                                      {rec.duration}
                                    </span>
                                    {unlocked ? (
                                      <a
                                        href={rec.videoUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-3.5 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
                                      >
                                        <Video className="w-3.5 h-3.5" />
                                        Link Video
                                      </a>
                                    ) : (
                                      <span className="text-xs font-semibold text-slate-500 inline-flex items-center gap-1">
                                        <Lock className="w-3.5 h-3.5" />
                                        {isHoldingRoom
                                          ? 'Terkunci (Holding Room)'
                                          : 'Khusus Premier (Mingguan)'}
                                      </span>
                                    )}
                                  </div>

                                  {/* Ruangan Learning Point Kelas (Masukkan Link & Baca Bila-Bila Masa) */}
                                  <div className="pt-2 border-t border-slate-100">
                                    {isEditingLp ? (
                                      <div className="space-y-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                                        <label className="block text-[11px] font-bold text-slate-700">
                                          Masukkan Link Learning Point Kelas Ini:
                                        </label>
                                        <input
                                          type="text"
                                          value={lpLinkInput}
                                          onChange={(e) =>
                                            setLpLinkInput(e.target.value)
                                          }
                                          placeholder="https://docs.google.com/..."
                                          className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded bg-white"
                                        />
                                        <div className="flex items-center justify-end gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setLpEditingRecId(null)
                                            }
                                            className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                                          >
                                            Batal
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              saveLearningPointForRec(
                                                rec,
                                                lpLinkInput
                                              )
                                            }
                                            className="px-3 py-1 bg-indigo-700 hover:bg-indigo-800 text-white text-[11px] font-semibold rounded cursor-pointer"
                                          >
                                            Simpan Link
                                          </button>
                                        </div>
                                      </div>
                                    ) : savedLp ? (
                                      <div className="flex items-center justify-between gap-2 bg-indigo-50/70 border border-indigo-200 px-3 py-2 rounded-lg">
                                        <a
                                          href={savedLp.link}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-xs font-bold text-indigo-800 hover:underline inline-flex items-center gap-1.5"
                                        >
                                          <BookOpen className="w-3.5 h-3.5 text-indigo-700" />
                                          Baca Learning Point Saya
                                          <ExternalLink className="w-3 h-3" />
                                        </a>
                                        <div className="flex items-center gap-1">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleOpenLearningPointEditor(rec)
                                            }
                                            className="p-1 text-slate-600 hover:text-indigo-700 cursor-pointer"
                                            title="Ubah Link Learning Point"
                                          >
                                            <Pencil className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleDeleteLearningPoint(rec.id)
                                            }
                                            className="p-1 text-slate-500 hover:text-red-600 cursor-pointer"
                                            title="Padam Link Learning Point"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleOpenLearningPointEditor(rec)
                                        }
                                        className="w-full py-1.5 px-3 text-xs font-semibold text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50 border border-dashed border-indigo-300 rounded-lg inline-flex items-center justify-center gap-1.5 cursor-pointer"
                                      >
                                        <LinkIcon className="w-3.5 h-3.5" />+
                                        Tambah Learning Point (Masukkan Link)
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      2. Rakaman Kelas Basic — Link Semua Kelas & Bahan Percuma
                    </h2>
                    {isHoldingRoom && (
                      <p className="text-xs text-red-600 font-semibold mt-1">
                        Akses Kelas Percuma (Basic) dikunci bagi pakej Holding
                        Room.
                      </p>
                    )}
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg self-start sm:self-auto">
                    {selectedRecordingYear === 'ALL'
                      ? `Semua Tahun (${basicRecordings.length} Bahan/Video)`
                      : `Tahun ${selectedRecordingYear} (${basicRecordings.length} Bahan/Video)`}
                  </span>
                </div>

                {basicRecordings.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                    Tiada rakaman Kelas Basic direkodkan bagi tahun yang dipilih.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {groupRecordingsByYear(basicRecordings).map((group) => (
                      <div key={group.year} className="space-y-3">
                        <div className="flex items-center justify-between bg-emerald-50/70 border border-emerald-200 px-3.5 py-2 rounded-xl">
                          <span className="text-xs font-bold text-emerald-950 font-mono">
                            📁 Kelas Basic & Bahan Percuma — Tahun {group.year}
                          </span>
                          <span className="text-[11px] font-mono font-semibold text-emerald-800">
                            {group.items.length} Bahan / Video
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {group.items.map((rec) => {
                            const unlocked = canAccessBasic(rec);
                            const savedLp = getLearningPointForRecording(
                              rec.id
                            );
                            const isEditingLp = lpEditingRecId === rec.id;
                            return (
                              <div
                                key={rec.id}
                                className={`border rounded-xl p-4 flex flex-col justify-between space-y-3 ${
                                  unlocked
                                    ? 'border-slate-200 bg-white'
                                    : 'border-slate-200 bg-slate-50 opacity-75'
                                }`}
                              >
                                <div className="space-y-1.5">
                                  <div className="text-xs font-mono text-emerald-700 font-semibold">
                                    Kelas Basic · Tahun {group.year} ·{' '}
                                    {rec.date}
                                  </div>
                                  <h3 className="text-sm font-bold text-slate-900">
                                    {rec.title}
                                  </h3>
                                  <p className="text-xs text-slate-600">
                                    {rec.description}
                                  </p>
                                </div>

                                <div className="space-y-2.5 pt-3 border-t border-slate-100">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-500 font-mono">
                                      {rec.duration}
                                    </span>
                                    {unlocked ? (
                                      <a
                                        href={rec.videoUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        Link Kelas
                                      </a>
                                    ) : (
                                      <span className="text-xs text-red-600 font-semibold inline-flex items-center gap-1">
                                        <Lock className="w-3.5 h-3.5" />{' '}
                                        {isHoldingRoom
                                          ? 'Terkunci (Holding Room)'
                                          : 'Terkunci'}
                                      </span>
                                    )}
                                  </div>

                                  {/* Ruangan Learning Point Kelas (Masukkan Link & Baca Bila-Bila Masa) */}
                                  <div className="pt-2 border-t border-slate-100">
                                    {isEditingLp ? (
                                      <div className="space-y-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                                        <label className="block text-[11px] font-bold text-slate-700">
                                          Masukkan Link Learning Point Kelas Ini:
                                        </label>
                                        <input
                                          type="text"
                                          value={lpLinkInput}
                                          onChange={(e) =>
                                            setLpLinkInput(e.target.value)
                                          }
                                          placeholder="https://docs.google.com/..."
                                          className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded bg-white"
                                        />
                                        <div className="flex items-center justify-end gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setLpEditingRecId(null)
                                            }
                                            className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                                          >
                                            Batal
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              saveLearningPointForRec(
                                                rec,
                                                lpLinkInput
                                              )
                                            }
                                            className="px-3 py-1 bg-indigo-700 hover:bg-indigo-800 text-white text-[11px] font-semibold rounded cursor-pointer"
                                          >
                                            Simpan Link
                                          </button>
                                        </div>
                                      </div>
                                    ) : savedLp ? (
                                      <div className="flex items-center justify-between gap-2 bg-emerald-50/80 border border-emerald-200 px-3 py-2 rounded-lg">
                                        <a
                                          href={savedLp.link}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-xs font-bold text-emerald-900 hover:underline inline-flex items-center gap-1.5"
                                        >
                                          <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
                                          Baca Learning Point
                                          <ExternalLink className="w-3 h-3" />
                                        </a>
                                        <div className="flex items-center gap-1">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleOpenLearningPointEditor(rec)
                                            }
                                            className="p-1 text-slate-600 hover:text-emerald-700 cursor-pointer"
                                            title="Ubah Link Learning Point"
                                          >
                                            <Pencil className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleDeleteLearningPoint(rec.id)
                                            }
                                            className="p-1 text-slate-500 hover:text-red-600 cursor-pointer"
                                            title="Padam Link Learning Point"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleOpenLearningPointEditor(rec)
                                        }
                                        className="w-full py-1.5 px-3 text-xs font-semibold text-emerald-800 bg-emerald-50/50 hover:bg-emerald-50 border border-dashed border-emerald-300 rounded-lg inline-flex items-center justify-center gap-1.5 cursor-pointer"
                                      >
                                        <LinkIcon className="w-3.5 h-3.5" />+
                                        Tambah Learning Point (Masukkan Link)
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      3. Rakaman Kelas Berbayar (Ditentukan Oleh Admin)
                    </h2>
                  </div>
                  <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-lg self-start sm:self-auto">
                    {selectedRecordingYear === 'ALL'
                      ? `Semua Tahun (${paidRecordings.length} Kelas)`
                      : `Tahun ${selectedRecordingYear} (${paidRecordings.length} Kelas)`}
                  </span>
                </div>

                {paidRecordings.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                    Tiada rakaman Kelas Berbayar direkodkan bagi tahun yang
                    dipilih.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {groupRecordingsByYear(paidRecordings).map((group) => (
                      <div key={group.year} className="space-y-3">
                        <div className="flex items-center justify-between bg-indigo-50/70 border border-indigo-200 px-3.5 py-2 rounded-xl">
                          <span className="text-xs font-bold text-indigo-950 font-mono">
                            📁 Kelas Berbayar — Tahun {group.year}
                          </span>
                          <span className="text-[11px] font-mono font-semibold text-indigo-800">
                            {group.items.length} Kelas
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {group.items.map((rec) => {
                            const isPaidUnlocked = canAccessPaid(rec);
                            const savedLp = getLearningPointForRecording(
                              rec.id
                            );
                            const isEditingLp = lpEditingRecId === rec.id;
                            return (
                              <div
                                key={rec.id}
                                className={`border rounded-xl p-4 flex flex-col justify-between space-y-3 ${
                                  isPaidUnlocked
                                    ? 'border-indigo-200 bg-white'
                                    : 'border-slate-200 bg-slate-50'
                                }`}
                              >
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between text-xs font-mono">
                                    <span className="font-semibold text-indigo-700">
                                      {rec.priceLabel || 'Kelas Berbayar'} ·
                                      Tahun {group.year}
                                    </span>
                                    <span className="text-slate-500">
                                      {rec.date}
                                    </span>
                                  </div>
                                  <h3 className="text-sm font-bold text-slate-900">
                                    {rec.title}
                                  </h3>
                                  <p className="text-xs text-slate-600">
                                    {rec.description}
                                  </p>
                                </div>

                                <div className="space-y-2.5 pt-3 border-t border-slate-100">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-500 font-mono">
                                      {rec.duration}
                                    </span>
                                    {isPaidUnlocked ? (
                                      <a
                                        href={rec.videoUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
                                      >
                                        <Video className="w-3.5 h-3.5" />
                                        Link Video
                                      </a>
                                    ) : (
                                      <span className="text-xs font-semibold text-slate-500 inline-flex items-center gap-1">
                                        <Lock className="w-3.5 h-3.5" />
                                        Belum Bayar / Akses
                                      </span>
                                    )}
                                  </div>

                                  {/* Ruangan Learning Point Kelas (Masukkan Link & Baca Bila-Bila Masa) */}
                                  <div className="pt-2 border-t border-slate-100">
                                    {isEditingLp ? (
                                      <div className="space-y-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                                        <label className="block text-[11px] font-bold text-slate-700">
                                          Masukkan Link Learning Point Kelas Ini:
                                        </label>
                                        <input
                                          type="text"
                                          value={lpLinkInput}
                                          onChange={(e) =>
                                            setLpLinkInput(e.target.value)
                                          }
                                          placeholder="https://docs.google.com/..."
                                          className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded bg-white"
                                        />
                                        <div className="flex items-center justify-end gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setLpEditingRecId(null)
                                            }
                                            className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                                          >
                                            Batal
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              saveLearningPointForRec(
                                                rec,
                                                lpLinkInput
                                              )
                                            }
                                            className="px-3 py-1 bg-indigo-700 hover:bg-indigo-800 text-white text-[11px] font-semibold rounded cursor-pointer"
                                          >
                                            Simpan Link
                                          </button>
                                        </div>
                                      </div>
                                    ) : savedLp ? (
                                      <div className="flex items-center justify-between gap-2 bg-indigo-50/70 border border-indigo-200 px-3 py-2 rounded-lg">
                                        <a
                                          href={savedLp.link}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-xs font-bold text-indigo-800 hover:underline inline-flex items-center gap-1.5"
                                        >
                                          <BookOpen className="w-3.5 h-3.5 text-indigo-700" />
                                          Baca Learning Point
                                          <ExternalLink className="w-3 h-3" />
                                        </a>
                                        <div className="flex items-center gap-1">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleOpenLearningPointEditor(rec)
                                            }
                                            className="p-1 text-slate-600 hover:text-indigo-700 cursor-pointer"
                                            title="Ubah Link Learning Point"
                                          >
                                            <Pencil className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleDeleteLearningPoint(rec.id)
                                            }
                                            className="p-1 text-slate-500 hover:text-red-600 cursor-pointer"
                                            title="Padam Link Learning Point"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleOpenLearningPointEditor(rec)
                                        }
                                        className="w-full py-1.5 px-3 text-xs font-semibold text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50 border border-dashed border-indigo-300 rounded-lg inline-flex items-center justify-center gap-1.5 cursor-pointer"
                                      >
                                        <LinkIcon className="w-3.5 h-3.5" />+
                                        Tambah Learning Point (Masukkan Link)
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* TAB 9: THESIS TALK                         */}
          {/* ========================================== */}
          {activeTab === 'thesis_talk' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <div className="border-b border-slate-200 pb-3">
                  <h2 className="text-base font-bold text-slate-900">
                    Mohon Untuk Thesis Talk
                  </h2>
                </div>

                <form onSubmit={handleApplyThesisTalk} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tajuk Pembentangan Thesis Talk
                    </label>
                    <input
                      type="text"
                      required
                      value={ttTitle}
                      onChange={(e) => setTtTitle(e.target.value)}
                      placeholder="Masukkan tajuk perkongsian Thesis Talk anda"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Tarikh Cadangan (Klik Kalendar)
                      </label>
                      <input
                        type="date"
                        required
                        value={ttDate}
                        onChange={(e) => setTtDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Slot Masa
                      </label>
                      <input
                        type="text"
                        required
                        value={ttTime}
                        onChange={(e) => setTtTime(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Ringkasan Perkongsian
                    </label>
                    <textarea
                      rows={3}
                      value={ttAbstract}
                      onChange={(e) => setTtAbstract(e.target.value)}
                      placeholder="Terangkan secara ringkas fokus pembentangan anda..."
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Mohon Thesis Talk
                  </button>
                </form>
              </div>

              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <div className="border-b border-slate-200 pb-3">
                  <h2 className="text-base font-bold text-slate-900">
                    Jadual & Senarai Thesis Talk ({thesisTalks.length})
                  </h2>
                </div>

                <div className="space-y-3">
                  {thesisTalks.map((tt) => (
                    <div
                      key={tt.id}
                      className="border border-slate-200 rounded-xl p-4 space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-mono font-semibold text-indigo-700">
                          {tt.proposedDate} · {tt.scheduledTime}
                        </span>
                        <span className="font-semibold text-slate-700">
                          Status: {tt.status}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {tt.title}
                      </h3>
                      <p className="text-xs text-slate-600">{tt.abstract}</p>
                      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="text-slate-500">
                          Pembentang: <strong>{tt.memberName}</strong> (
                          {tt.memberUsername} · {tt.university})
                        </span>
                        <a
                          href={tt.joinLink}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Link Join Thesis Talk
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modal Muat Naik Gambar (300x300 px) / Masukkan Link Gambar */}
      <AvatarUploadModal
        isOpen={avatarModalOpen}
        userName={member.name}
        userCode={member.username}
        currentAvatar={member.avatar}
        onSaveAvatar={handleSaveAvatar}
        onClose={() => setAvatarModalOpen(false)}
      />

      {/* Modal Tukar / Kemaskini Kata Laluan & Lupa Kata Laluan */}
      <PasswordChangeModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        userName={member.name}
        userCode={member.username}
        userEmail={member.email}
        currentPassword={member.password}
        onSavePassword={handleSaveMemberPassword}
      />
    </div>
  );
};
