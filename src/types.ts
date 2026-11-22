export type Role = 'member' | 'crmp' | 'admin';

export type MemberPackage = 'Premier' | 'Elite Plus' | 'Elite' | 'Holding Room';

export type PhDPhase =
  | 'Early Registration'
  | 'Proposal Defence (PD)'
  | 'Data Collection & Analysis'
  | 'Notice of Submission (Nos)'
  | 'Thesis Submission'
  | 'Viva';

export interface Publication {
  id: string;
  title: string;
  type: 'Artikel Jurnal' | 'Prosiding' | 'Buku' | 'Bab Buku';
  journalOrPublisher: string;
  year: string;
  status: 'Diterbitkan' | 'Diterima' | 'Dalam Semakan';
  link?: string;
}

export interface ThesisSubtopic {
  id: string;
  code: string; // e.g., "1.1", "1.2"
  title: string; // e.g., "Pengenalan", "Penyataan Masalah"
  completed: boolean;
}

export interface ThesisChapter {
  id: string;
  chapterNumber: number;
  title: string;
  progress: number; // 0 - 100
  status: 'Belum Mula' | 'Sedang Dideraf' | 'Semakan Penyelia' | 'Selesai';
  pages: number;
  lastUpdated: string;
  notes?: string;
  subtopics?: ThesisSubtopic[];
}

export interface DraftSubmission {
  id: string;
  memberId: string;
  ttb: string; // Tarikh/Tempoh Tamat Belajar
  draftNumber: number;
  date: string;
  pageCount: number;
  wordCount: number;
  sujudSyukur11x: boolean;
  twoHoursSevenMinutes: boolean;
  updateThesisMap: boolean;
  tdr013: boolean;
  tdr010: boolean; // Papar untuk draf 1 - 10
  fbShareWithCrmp: boolean;
  targetForNextDraft: string;
  updateAffirmationCard: boolean;
  affirmationText?: string;
  memberNotes?: string; // Catatan ahli untuk setiap kenaikan draf
  crmpFeedback?: string;
}

export type DayOfWeek = 'Ahad' | 'Isnin' | 'Selasa' | 'Rabu' | 'Khamis' | 'Jumaat' | 'Sabtu';

export interface DailyChecklistEntry {
  day: DayOfWeek;
  dailyWin: string;
  dailyWinCompleted: boolean;
  dailyFokus: string;
  dailyFokusCompleted: boolean;
}

export interface WeeklyChecklist {
  id: string;
  memberId: string;
  weekLabel: string; // Dijana automatik daripada tarikh kalendar
  startDate: string; // YYYY-MM-DD
  weeklyFokusAhad: string;
  weeklyFokusCompleted: boolean;
  dailyEntries: Record<DayOfWeek, DailyChecklistEntry>;
  tdr001Isnin: boolean;
  tdr001Notes: string;
  tdr006Selasa: boolean;
  tdr006Notes: string;
  tdr002Rabu: boolean;
  tdr003Rabu: boolean;
  tdr002_003Notes: string;
  tdr017Khamis: boolean;
  tdr018Khamis: boolean;
  tdr017_018Notes: string;
  tdr007Jumaat: boolean;
  tdr007Notes: string;
}

export type StudyLevel = 'Master' | 'PhD';

export interface MemberProfile {
  id: string;
  username: string; // APP0001, APEP0001, APE0001
  password?: string;
  package: MemberPackage;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  university: string;
  studyLevel?: StudyLevel; // 'Master' | 'PhD'
  researchField?: string; // Bidang Kajian
  currentSemester: string; // S1 - S10
  residence: string;
  address?: string; // Alamat
  postcode?: string; // Poskod (5 digit)
  district?: string; // Daerah (Auto dari poskod)
  state?: string; // Negeri (Auto dari poskod)
  researchTitle: string;
  supervisor: string; // Penyelia Utama
  supervisor2?: string; // Penyelia Kedua
  supervisor3?: string; // Penyelia Ketiga
  crmpId: string; // e.g., CRMP001
  isActive: boolean;
  currentPhase: PhDPhase;
  overallProgress: number; // 0 - 100
  platinumJourneyStep: number; // 1 - 12
  dates: {
    earlyRegistration: string; // Tarikh Daftar Pengajian
    registerPD: string; // Proposal Defense (PD)
    dataCollectionAnalysis: string; // Data Collection
    nos: string; // Notice of Submission (NOS)
    thesisSubmission: string;
    viva: string; // Viva
    convocation?: string; // Convocation
  };
  publications: Publication[];
  thesisMap: ThesisChapter[];
  crmpNotes?: string;
  gender?: 'Lelaki' | 'Perempuan';
  isExcellentThesis?: boolean; // Dapat Tesis Cemerlang
  isGraduated?: boolean; // Telah Graduate / Konvokesyen
  learningPoints?: ClassLearningPoint[]; // Koleksi link learning point kelas yang dihadiri
}

export interface CRMPProfile {
  id: string;
  username: string; // CRMP001
  password?: string;
  name: string;
  email: string;
  phone: string;
  university: string;
  specialization: string;
  groupName: string;
  avatar: string;
}

export interface AdminProfile {
  id: string;
  username: string; // admin001
  password?: string;
  name: string;
  email: string;
  roleTitle: string;
  avatar?: string;
}

export type RecordingCategory = 'zoom' | 'basic' | 'paid';

export interface ClassLearningPoint {
  id: string;
  recordingId: string;
  recordingTitle: string;
  category: RecordingCategory;
  classDate: string;
  link: string; // Link learning point yang dimasukkan oleh ahli
  updatedAt: string;
}

export interface ClassRecording {
  id: string;
  title: string;
  category: RecordingCategory;
  zoomFrequency?: 'Mingguan' | 'Bulanan';
  date: string;
  duration: string;
  instructor: string;
  videoUrl: string;
  description: string;
  allowedPackages: MemberPackage[];
  allowedMemberUsernames: string[];
  priceLabel?: string;
}

export interface ThesisTalkItem {
  id: string;
  memberUsername: string;
  memberName: string;
  university: string;
  title: string;
  abstract: string;
  proposedDate: string;
  scheduledTime: string;
  status: 'Diluluskan' | 'Dalam Semakan' | 'Selesai';
  joinLink: string;
  moderatorCrmpId: string;
}

export interface VCVoteRecord {
  id: string;
  date: string; // YYYY-MM-DD (Hari semasa sahaja)
  sessionName: string; // Tema yang dimasukkan oleh CRMP
  memberUsername: string;
  memberName: string;
  crmpId: string;
  status: 'Hadir Live' | 'Hadir Rakaman' | 'Tidak Hadir';
  checkInTime: string;
  takeawayNote?: string;
}

export interface VCSystemSettings {
  dailyTheme: string; // Tema VC hari ini yang dimasukkan oleh CRMP
  themeUpdatedBy: string; // CRMP yang kemaskini tema
  vcTimeLabel: string; // "6:01 Petang (Isnin - Jumaat)"
  voteOpenTime: string; // "18:20" (6:20 Petang)
  offDates: string[]; // Tarikh (YYYY-MM-DD) yang Admin set tiada VC (Vote OFF)
  forceOpenVoteWindow: boolean; // Membolehkan vote diaktifkan pada bila-bila masa atau ikut jam 6:20 petang
}

export interface CRMPDutySchedule {
  id: string;
  date: string;
  dayName: string;
  timeSlot: string;
  sessionTitle: string;
  crmpId: string;
  crmpName: string;
  backupCrmpId: string;
  vcLink: string;
}
