import { DayOfWeek, MemberPackage, MemberProfile, WeeklyChecklist } from '../types';

export const STANDARD_AVATAR_SIZE = 300; // 300x300 px
export const MAX_IMAGE_FILE_BYTES = 2 * 1024 * 1024; // 2MB

/**
 * Resizes and center-crops an uploaded image file to 300x300 px JPEG data URL
 */
export function resizeImageFileToStandardAvatar(
  file: File,
  targetSize: number = STANDARD_AVATAR_SIZE
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_IMAGE_FILE_BYTES * 2.5) {
      reject(
        new Error('Saiz fail terlalu besar. Sila pilih gambar di bawah 5MB.')
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        // Center crop square
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetSize, targetSize);
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, targetSize, targetSize);
        resolve(canvas.toDataURL('image/jpeg', 0.88));
      };
      img.onerror = () => reject(new Error('Gagal membaca fail gambar.'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Gagal memuat naik gambar.'));
    reader.readAsDataURL(file);
  });
}

const MALAY_MONTHS = [
  'Jan',
  'Feb',
  'Mac',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Ogo',
  'Sep',
  'Okt',
  'Nov',
  'Dis',
];

const JS_DAY_TO_MALAY: DayOfWeek[] = [
  'Ahad',
  'Isnin',
  'Selasa',
  'Rabu',
  'Khamis',
  'Jumaat',
  'Sabtu',
];

export function getMalayDayNameFromDateStr(dateStr: string): DayOfWeek {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return 'Rabu';
  const dt = new Date(y, m - 1, d);
  return JS_DAY_TO_MALAY[dt.getDay()] || 'Rabu';
}

export function isWeekdayMondayToFriday(dateStr: string): boolean {
  const dayName = getMalayDayNameFromDateStr(dateStr);
  return (
    dayName === 'Isnin' ||
    dayName === 'Selasa' ||
    dayName === 'Rabu' ||
    dayName === 'Khamis' ||
    dayName === 'Jumaat'
  );
}

export function getTodayDateStr(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Creates a fresh, unticked WeeklyChecklist for a given member and week (startDate & weekLabel)
 */
export function createBlankWeeklyChecklist(
  memberUsername: string,
  startDate: string,
  weekLabel: string
): WeeklyChecklist {
  return {
    id: `chk-${memberUsername}-${startDate}`,
    memberId: memberUsername,
    weekLabel,
    startDate,
    weeklyFokusAhad: '',
    weeklyFokusCompleted: false,
    dailyEntries: {
      Ahad: {
        day: 'Ahad',
        dailyWin: '',
        dailyWinCompleted: false,
        dailyFokus: '',
        dailyFokusCompleted: false,
      },
      Isnin: {
        day: 'Isnin',
        dailyWin: '',
        dailyWinCompleted: false,
        dailyFokus: '',
        dailyFokusCompleted: false,
      },
      Selasa: {
        day: 'Selasa',
        dailyWin: '',
        dailyWinCompleted: false,
        dailyFokus: '',
        dailyFokusCompleted: false,
      },
      Rabu: {
        day: 'Rabu',
        dailyWin: '',
        dailyWinCompleted: false,
        dailyFokus: '',
        dailyFokusCompleted: false,
      },
      Khamis: {
        day: 'Khamis',
        dailyWin: '',
        dailyWinCompleted: false,
        dailyFokus: '',
        dailyFokusCompleted: false,
      },
      Jumaat: {
        day: 'Jumaat',
        dailyWin: '',
        dailyWinCompleted: false,
        dailyFokus: '',
        dailyFokusCompleted: false,
      },
      Sabtu: {
        day: 'Sabtu',
        dailyWin: '',
        dailyWinCompleted: false,
        dailyFokus: '',
        dailyFokusCompleted: false,
      },
    },
    tdr001Isnin: false,
    tdr001Notes: '',
    tdr006Selasa: false,
    tdr006Notes: '',
    tdr002Rabu: false,
    tdr003Rabu: false,
    tdr002_003Notes: '',
    tdr017Khamis: false,
    tdr018Khamis: false,
    tdr017_018Notes: '',
    tdr007Jumaat: false,
    tdr007Notes: '',
  };
}

/**
 * Given any YYYY-MM-DD date from the calendar, automatically computes:
 * - startDate (Sunday of that week in YYYY-MM-DD)
 * - weekNumber (1 - 52)
 * - weekLabel (e.g., "Minggu 47 (15 Nov - 21 Nov 2026)")
 * - selectedDayName ('Ahad' .. 'Sabtu')
 */
export function computeAutoWeekFromDate(dateStr: string): {
  startDate: string;
  weekNumber: number;
  weekLabel: string;
  selectedDayName: DayOfWeek;
} {
  const [y, m, d] = dateStr.split('-').map(Number);
  const picked = y && m && d ? new Date(y, m - 1, d) : new Date();
  const dayOfWeekIdx = picked.getDay(); // 0 = Sunday (Ahad)
  const selectedDayName = JS_DAY_TO_MALAY[dayOfWeekIdx] || 'Rabu';

  // Find Sunday of that week
  const sunday = new Date(picked);
  sunday.setDate(picked.getDate() - dayOfWeekIdx);

  // Find Saturday of that week
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);

  // Compute week number of year
  const startOfYear = new Date(sunday.getFullYear(), 0, 1);
  const diffDays = Math.floor(
    (sunday.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)
  );
  const weekNumber = Math.max(
    1,
    Math.ceil((diffDays + startOfYear.getDay() + 1) / 7)
  );

  const pad = (n: number) => String(n).padStart(2, '0');
  const startDate = `${sunday.getFullYear()}-${pad(sunday.getMonth() + 1)}-${pad(
    sunday.getDate()
  )}`;

  const sunStr = `${sunday.getDate()} ${MALAY_MONTHS[sunday.getMonth()]}`;
  const satStr = `${saturday.getDate()} ${
    MALAY_MONTHS[saturday.getMonth()]
  } ${saturday.getFullYear()}`;
  const weekLabel = `Minggu ${weekNumber} (${sunStr} - ${satStr})`;

  return {
    startDate,
    weekNumber,
    weekLabel,
    selectedDayName,
  };
}

/**
 * Jadual masa penghantaran mesej peringatan automatik (tanpa perlu tunggu CRMP)
 */
export function getDayReminderScheduleLabel(day: DayOfWeek): string {
  switch (day) {
    case 'Ahad':
      return 'My Weekly Fokus — jam 8.30 malam';
    case 'Isnin':
      return '📌 SETIAP HARI ISNIN - TDR001 jam 4.30 petang';
    case 'Selasa':
      return '📌 SETIAP HARI SELASA - TDR006 - jam 9.30 malam';
    case 'Rabu':
      return '📌 SETIAP HARI RABU: 1️⃣ TDR002 - jam 9.30 malam & 2️⃣ TDR003 - jam 9.30 malam';
    case 'Khamis':
      return '📌 SETIAP HARI KHAMIS: 1️⃣ TDR017 - jam 1.30 petang & 2️⃣ TDR018 - jam 9.30 malam';
    case 'Jumaat':
      return '📌 SETIAP HARI JUMAAT: 1️⃣ TDR007 - jam 11.30 malam';
    case 'Sabtu':
      return 'Daily Fokus & Daily Win (Sabtu - jam 8.30 malam)';
  }
}

/**
 * Checks which items a member has NOT ticked for a specific day of the week
 */
export function getMissingChecklistItemsForDay(
  checklist: WeeklyChecklist | undefined,
  day: DayOfWeek
): string[] {
  const missing: string[] = [];

  // 1. Weekly Fokus (Ahad - jam 8.30 malam)
  if (day === 'Ahad' && !checklist?.weeklyFokusCompleted) {
    missing.push('My Weekly Fokus (Ahad - jam 8.30 malam)');
  }

  // 2. Daily Fokus & Daily Win setiap hari
  const daily = checklist?.dailyEntries?.[day];
  if (!daily?.dailyFokusCompleted) {
    missing.push(`Daily Fokus (${day})`);
  }
  if (!daily?.dailyWinCompleted) {
    missing.push(`Daily Win (${day})`);
  }

  // 3. TDR mengikut hari & waktu peringatan automatik (Isnin - Jumaat)
  if (day === 'Isnin' && !checklist?.tdr001Isnin) {
    missing.push('TDR001 (Isnin - jam 4.30 petang)');
  }
  if (day === 'Selasa' && !checklist?.tdr006Selasa) {
    missing.push('TDR006 (Selasa - jam 9.30 malam)');
  }
  if (day === 'Rabu') {
    if (!checklist?.tdr002Rabu)
      missing.push('1️⃣ TDR002 (Rabu - jam 9.30 malam)');
    if (!checklist?.tdr003Rabu)
      missing.push('2️⃣ TDR003 (Rabu - jam 9.30 malam)');
  }
  if (day === 'Khamis') {
    if (!checklist?.tdr017Khamis)
      missing.push('1️⃣ TDR017 (Khamis - jam 1.30 petang)');
    if (!checklist?.tdr018Khamis)
      missing.push('2️⃣ TDR018 (Khamis - jam 9.30 malam)');
  }
  if (day === 'Jumaat' && !checklist?.tdr007Jumaat) {
    missing.push('1️⃣ TDR007 (Jumaat - jam 11.30 malam)');
  }

  return missing;
}

/**
 * Formats a clean Malaysian WhatsApp phone number (e.g. "012-9012345" -> "60129012345")
 * and generates an automatic WhatsApp reminder message (sent automatically without waiting for CRMP)
 */
export function buildWhatsAppReminder(
  memberName: string,
  memberUsername: string,
  phone: string,
  day: DayOfWeek,
  weekLabel: string,
  missingItems: string[],
  crmpInfo: string = 'CRMP Masing-Masing'
): { message: string; whatsappUrl: string; formattedPhone: string } {
  const digitsOnly = phone.replace(/\D/g, '');
  const formattedPhone = digitsOnly.startsWith('0')
    ? `6${digitsOnly}`
    : digitsOnly.startsWith('60')
    ? digitsOnly
    : `60${digitsOnly}`;

  const scheduleLabel = getDayReminderScheduleLabel(day);
  const bulletList = missingItems.map((it) => `• ${it}`).join('\n');
  const message =
    `Assalamualaikum & Salam Roket ${memberName} (${memberUsername}),\n\n` +
    `[MESEJ PERINGATAN AUTOMATIK SISTEM — DR. ROKET PLATINUM]\n` +
    `Tarikh/Minggu: Hari ${day}, ${weekLabel}\n` +
    `Waktu Peringatan Automatik: ${scheduleLabel}\n\n` +
    `Sistem mendapati checklist anda masih belum lengkap ditandakan (tick):\n` +
    `${bulletList}\n\n` +
    `JADUAL PERINGATAN AUTOMATIK (TANPA PERLU TUNGGU CRMP):\n` +
    `- My Weekly Fokus 8.30 malam\n` +
    `📌 SETIAP HARI ISNIN - TDR001 jam 4.30 petang\n` +
    `📌 SETIAP HARI SELASA - TDR006 - jam 9.30 malam\n` +
    `📌 SETIAP HARI RABU:\n` +
    `1️⃣ TDR002 - jam 9.30 malam\n` +
    `2️⃣ TDR003 - jam 9.30 malam\n\n` +
    `📌 SETIAP HARI KHAMIS:\n` +
    `1️⃣ TDR017 - jam 1.30 petang\n` +
    `2️⃣ TDR018 - jam 9.30 malam\n\n` +
    `📌 SETIAP HARI JUMAAT:\n` +
    `1️⃣ TDR007 - jam 11.30 malam\n\n` +
    `PERINGATAN PENTING:\n` +
    `Mesej peringatan ini dihantar secara automatik oleh sistem tanpa perlu menunggu CRMP. Sila pastikan anda menghantar laporan hari ini (${day}) kepada CRMP masing-masing (${crmpInfo}) dan juga di dalam Group FB Platinum, kemudian tick pada Checklist Submission anda.\n\n` +
    `Terus kekal BERTAHAN sampai jadi.`;

  const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(
    message
  )}`;

  return { message, whatsappUrl, formattedPhone };
}

export function getDefaultSubtopicsForChapter(
  chapterNumber: number,
  isCompleted: boolean = false
): { id: string; code: string; title: string; completed: boolean }[] {
  const presets: Record<number, { code: string; title: string }[]> = {
    1: [
      { code: '1.1', title: 'Pengenalan & Latar Belakang Kajian' },
      { code: '1.2', title: 'Penyataan Masalah' },
      { code: '1.3', title: 'Objektif & Persoalan Kajian' },
      { code: '1.4', title: 'Skop & Kepentingan Kajian' },
    ],
    2: [
      { code: '2.1', title: 'Pengenalan Sorotan Literatur' },
      { code: '2.2', title: 'Teori & Kerangka Konseptual Kajian' },
      { code: '2.3', title: 'Kajian Lepas & Jurang Kajian (Research Gap)' },
      { code: '2.4', title: 'Rumusan Bab 2' },
    ],
    3: [
      { code: '3.1', title: 'Reka Bentuk Penyelidikan' },
      { code: '3.2', title: 'Populasi, Persampelan & Instrumen' },
      { code: '3.3', title: 'Kesahan, Kebolehpercayaan & Kajian Rintis' },
      { code: '3.4', title: 'Prosedur Pengumpulan & Analisis Data' },
    ],
    4: [
      { code: '4.1', title: 'Profil Demografi & Penyaringan Data' },
      { code: '4.2', title: 'Analisis Dapatan Objektif 1 & 2' },
      { code: '4.3', title: 'Analisis Dapatan Objektif 3 & Pengujian Hipotesis' },
      { code: '4.4', title: 'Rumusan Dapatan Kajian' },
    ],
    5: [
      { code: '5.1', title: 'Ringkasan & Perbincangan Dapatan Utama' },
      { code: '5.2', title: 'Implikasi Teori, Metodologi & Praktikal' },
      { code: '5.3', title: 'Limitasi & Cadangan Kajian Masa Hadapan' },
      { code: '5.4', title: 'Kesimpulan Keseluruhan Tesis' },
    ],
  };

  const list = presets[chapterNumber] || [
    { code: `${chapterNumber}.1`, title: `Pengenalan Bab ${chapterNumber}` },
    { code: `${chapterNumber}.2`, title: `Perbincangan Subtopik Utama` },
    { code: `${chapterNumber}.3`, title: `Rumusan Bab ${chapterNumber}` },
  ];

  return list.map((item, idx) => ({
    id: `sub-${chapterNumber}-${idx + 1}`,
    code: item.code,
    title: item.title,
    completed: isCompleted,
  }));
}

/**
 * Senarai Universiti di Malaysia dalam format: Nama Penuh (Singkatan)
 */
export const DEFAULT_MALAYSIA_UNIVERSITIES: string[] = [
  'Universiti Pendidikan Sultan Idris (UPSI)',
  'Universiti Kebangsaan Malaysia (UKM)',
  'Universiti Malaya (UM)',
  'Universiti Sains Malaysia (USM)',
  'Universiti Putra Malaysia (UPM)',
  'Universiti Teknologi Malaysia (UTM)',
  'Universiti Teknologi MARA (UiTM)',
  'Universiti Islam Antarabangsa Malaysia (UIAM)',
  'Universiti Utara Malaysia (UUM)',
  'Universiti Malaysia Sarawak (UNIMAS)',
  'Universiti Malaysia Sabah (UMS)',
  'Universiti Malaysia Terengganu (UMT)',
  'Universiti Sains Islam Malaysia (USIM)',
  'Universiti Tun Hussein Onn Malaysia (UTHM)',
  'Universiti Teknikal Malaysia Melaka (UTeM)',
  'Universiti Malaysia Pahang Al-Sultan Abdullah (UMPSA)',
  'Universiti Malaysia Perlis (UniMAP)',
  'Universiti Malaysia Kelantan (UMK)',
  'Universiti Sultan Zainal Abidin (UniSZA)',
  'Universiti Pertahanan Nasional Malaysia (UPNM)',
  'Universiti Teknologi PETRONAS (UTP)',
  'Universiti Tenaga Nasional (UNITEN)',
  'Multimedia University (MMU)',
  'Universiti Kuala Lumpur (UniKL)',
  'Universiti Tunku Abdul Rahman (UTAR)',
  'Management and Science University (MSU)',
  'Open University Malaysia (OUM)',
  "Taylor's University (Taylor's)",
  'Sunway University (Sunway)',
  'Monash University Malaysia (Monash)',
  'University of Nottingham Malaysia (UNM)',
  'UCSI University (UCSI)',
  'HELP University (HELP)',
  'SEGi University (SEGi)',
  'Wawasan Open University (WOU)',
  'AIMST University (AIMST)',
  'International Medical University (IMU)',
  'University of Cyberjaya (UoC)',
  'UNITAR International University (UNITAR)',
  'MAHSA University (MAHSA)',
  'City University Malaysia (CityU)',
  'Albukhary International University (AIU)',
  'Universiti Islam Selangor (UIS)',
  "Universiti Islam Antarabangsa Sultan Abdul Halim Mu'adzam Shah (UniSHAMS)",
  'Universiti Sultan Azlan Shah (USAS)',
  'Universiti Melaka (UNIMEL)',
  'Asia Pacific University of Technology & Innovation (APU)',
  'INTI International University (INTI)',
];

const UNIVERSITY_SHORT_TO_FULL_MAP: Record<string, string> = {
  UPSI: 'Universiti Pendidikan Sultan Idris (UPSI)',
  UKM: 'Universiti Kebangsaan Malaysia (UKM)',
  UM: 'Universiti Malaya (UM)',
  USM: 'Universiti Sains Malaysia (USM)',
  UPM: 'Universiti Putra Malaysia (UPM)',
  UTM: 'Universiti Teknologi Malaysia (UTM)',
  UITM: 'Universiti Teknologi MARA (UiTM)',
  UIAM: 'Universiti Islam Antarabangsa Malaysia (UIAM)',
  IIUM: 'Universiti Islam Antarabangsa Malaysia (UIAM)',
  'UIAM (IIUM)': 'Universiti Islam Antarabangsa Malaysia (UIAM)',
  UUM: 'Universiti Utara Malaysia (UUM)',
  UNIMAS: 'Universiti Malaysia Sarawak (UNIMAS)',
  UMS: 'Universiti Malaysia Sabah (UMS)',
  UMT: 'Universiti Malaysia Terengganu (UMT)',
  USIM: 'Universiti Sains Islam Malaysia (USIM)',
  UTHM: 'Universiti Tun Hussein Onn Malaysia (UTHM)',
  UTEM: 'Universiti Teknikal Malaysia Melaka (UTeM)',
  UMPSA: 'Universiti Malaysia Pahang Al-Sultan Abdullah (UMPSA)',
  UMP: 'Universiti Malaysia Pahang Al-Sultan Abdullah (UMPSA)',
  'UMPSA (UMP)': 'Universiti Malaysia Pahang Al-Sultan Abdullah (UMPSA)',
  UNIMAP: 'Universiti Malaysia Perlis (UniMAP)',
  UMK: 'Universiti Malaysia Kelantan (UMK)',
  UNISZA: 'Universiti Sultan Zainal Abidin (UniSZA)',
  UPNM: 'Universiti Pertahanan Nasional Malaysia (UPNM)',
  UTP: 'Universiti Teknologi PETRONAS (UTP)',
  'UTP (UNIVERSITI TEKNOLOGI PETRONAS)': 'Universiti Teknologi PETRONAS (UTP)',
  UNITEN: 'Universiti Tenaga Nasional (UNITEN)',
  'UNITEN (UNIVERSITI TENAGA NASIONAL)': 'Universiti Tenaga Nasional (UNITEN)',
  MMU: 'Multimedia University (MMU)',
  'MMU (MULTIMEDIA UNIVERSITY)': 'Multimedia University (MMU)',
  UNIKL: 'Universiti Kuala Lumpur (UniKL)',
  'UNIKL (UNIVERSITI KUALA LUMPUR)': 'Universiti Kuala Lumpur (UniKL)',
  UTAR: 'Universiti Tunku Abdul Rahman (UTAR)',
  'UTAR (UNIVERSITI TUNKU ABDUL RAHMAN)': 'Universiti Tunku Abdul Rahman (UTAR)',
  MSU: 'Management and Science University (MSU)',
  'MSU (MANAGEMENT & SCIENCE UNIVERSITY)': 'Management and Science University (MSU)',
  OUM: 'Open University Malaysia (OUM)',
  'OUM (OPEN UNIVERSITY MALAYSIA)': 'Open University Malaysia (OUM)',
  "TAYLOR'S UNIVERSITY": "Taylor's University (Taylor's)",
  'SUNWAY UNIVERSITY': 'Sunway University (Sunway)',
  'MONASH UNIVERSITY MALAYSIA': 'Monash University Malaysia (Monash)',
  'UNIVERSITY OF NOTTINGHAM MALAYSIA': 'University of Nottingham Malaysia (UNM)',
  'UCSI UNIVERSITY': 'UCSI University (UCSI)',
  'HELP UNIVERSITY': 'HELP University (HELP)',
  'SEGI UNIVERSITY': 'SEGi University (SEGi)',
  WOU: 'Wawasan Open University (WOU)',
  'WOU (WAWASAN OPEN UNIVERSITY)': 'Wawasan Open University (WOU)',
  'AIMST UNIVERSITY': 'AIMST University (AIMST)',
  IMU: 'International Medical University (IMU)',
  'IMU (INTERNATIONAL MEDICAL UNIVERSITY)': 'International Medical University (IMU)',
  'UNIVERSITY OF CYBERJAYA (UOC)': 'University of Cyberjaya (UoC)',
  'UNITAR INTERNATIONAL UNIVERSITY': 'UNITAR International University (UNITAR)',
  'MAHSA UNIVERSITY': 'MAHSA University (MAHSA)',
  'CITY UNIVERSITY MALAYSIA': 'City University Malaysia (CityU)',
  'ALBUKHARY INTERNATIONAL UNIVERSITY (AIU)': 'Albukhary International University (AIU)',
  UIS: 'Universiti Islam Selangor (UIS)',
  KUIS: 'Universiti Islam Selangor (UIS)',
  UNISHAMS: "Universiti Islam Antarabangsa Sultan Abdul Halim Mu'adzam Shah (UniSHAMS)",
  USAS: 'Universiti Sultan Azlan Shah (USAS)',
  UNIMEL: 'Universiti Melaka (UNIMEL)',
  APU: 'Asia Pacific University of Technology & Innovation (APU)',
  INTI: 'INTI International University (INTI)',
};

/**
 * Menukar nama singkatan universiti kepada format "Nama Penuh (Singkatan)"
 */
export function normalizeUniversityName(rawUni: string): string {
  const trimmed = (rawUni || '').trim();
  if (!trimmed) return 'Universiti Pendidikan Sultan Idris (UPSI)';
  const mapped = UNIVERSITY_SHORT_TO_FULL_MAP[trimmed.toUpperCase()];
  return mapped || trimmed;
}

/**
 * Mengesan jantina pelajar secara automatik berdasarkan nama penuh ahli:
 * - "bin" atau "a/l" -> Lelaki ('male')
 * - "binti", "bt", atau "a/p" -> Perempuan ('female')
 */
export function detectStudentGenderFromName(name: string): {
  gender: 'male' | 'female';
  label: string;
  detectedKeyword: string;
} {
  const lower = (name || '').toLowerCase();

  if (/\b(binti|bt\.?)\b/i.test(lower)) {
    return {
      gender: 'female',
      label: 'Perempuan',
      detectedKeyword: 'binti',
    };
  }
  if (/\ba\/p\b/i.test(lower)) {
    return {
      gender: 'female',
      label: 'Perempuan',
      detectedKeyword: 'a/p',
    };
  }
  if (/\b(bin|b\.?)\b/i.test(lower)) {
    return {
      gender: 'male',
      label: 'Lelaki',
      detectedKeyword: 'bin',
    };
  }
  if (/\ba\/l\b/i.test(lower)) {
    return {
      gender: 'male',
      label: 'Lelaki',
      detectedKeyword: 'a/l',
    };
  }

  // Fallback heuristics if no explicit bin/binti/a/l/a/p token
  if (
    /\b(siti|nur|nurul|nik kamariah|farah|nadia|aisyah|fatimah|zainab|noraini|mardhiyati|halimah|rosnah)\b/i.test(
      lower
    )
  ) {
    return {
      gender: 'female',
      label: 'Perempuan',
      detectedKeyword: 'nama perempuan',
    };
  }

  return {
    gender: 'male',
    label: 'Lelaki',
    detectedKeyword: 'bin / lelaki',
  };
}

/**
 * Auto-lookup Daerah & Negeri berdasarkan Poskod 5-digit Malaysia
 */
export function lookupMalaysiaPostcode(rawPostcode: string): {
  district: string;
  state: string;
} | null {
  const clean = (rawPostcode || '').replace(/\D/g, '');
  if (clean.length < 5) return null;

  const code = parseInt(clean.slice(0, 5), 10);
  const prefix2 = parseInt(clean.slice(0, 2), 10);
  const prefix3 = parseInt(clean.slice(0, 3), 10);

  // Exact 3-digit / specific postcode mappings for major towns & districts
  const exactMap: Record<number, { district: string; state: string }> = {
    359: { district: 'Tanjong Malim (Muallim)', state: 'Perak' },
    358: { district: 'Slim River (Muallim)', state: 'Perak' },
    350: { district: 'Tapah (Batang Padang)', state: 'Perak' },
    355: { district: 'Bidor (Batang Padang)', state: 'Perak' },
    319: { district: 'Kampar', state: 'Perak' },
    326: { district: 'Seri Iskandar (Perak Tengah)', state: 'Perak' },
    320: { district: 'Sitiawan (Manjung)', state: 'Perak' },
    340: { district: 'Taiping (Larut Matang)', state: 'Perak' },
    330: { district: 'Kuala Kangsar', state: 'Perak' },
    360: { district: 'Teluk Intan (Hilir Perak)', state: 'Perak' },
    436: { district: 'Bangi (Hulu Langat)', state: 'Selangor' },
    430: { district: 'Kajang (Hulu Langat)', state: 'Selangor' },
    434: { district: 'Serdang / Seri Kembangan (Petaling)', state: 'Selangor' },
    435: { district: 'Semenyih (Hulu Langat)', state: 'Selangor' },
    438: { district: 'Dengkil (Sepang)', state: 'Selangor' },
    439: { district: 'Sepang / KLIA', state: 'Selangor' },
    630: { district: 'Cyberjaya (Sepang)', state: 'Selangor' },
    400: { district: 'Shah Alam (Petaling)', state: 'Selangor' },
    401: { district: 'Shah Alam (Petaling)', state: 'Selangor' },
    402: { district: 'Shah Alam (Petaling)', state: 'Selangor' },
    403: { district: 'Shah Alam (Petaling)', state: 'Selangor' },
    404: { district: 'Shah Alam (Petaling)', state: 'Selangor' },
    410: { district: 'Klang', state: 'Selangor' },
    411: { district: 'Klang', state: 'Selangor' },
    412: { district: 'Klang', state: 'Selangor' },
    460: { district: 'Petaling Jaya (Petaling)', state: 'Selangor' },
    461: { district: 'Petaling Jaya (Petaling)', state: 'Selangor' },
    462: { district: 'Petaling Jaya (Petaling)', state: 'Selangor' },
    473: { district: 'Petaling Jaya (Petaling)', state: 'Selangor' },
    474: { district: 'Petaling Jaya (Petaling)', state: 'Selangor' },
    475: { district: 'Subang Jaya (Petaling)', state: 'Selangor' },
    476: { district: 'Subang Jaya / USJ (Petaling)', state: 'Selangor' },
    471: { district: 'Puchong (Petaling)', state: 'Selangor' },
    480: { district: 'Rawang (Gombak)', state: 'Selangor' },
    681: { district: 'Batu Caves / Gombak', state: 'Selangor' },
    680: { district: 'Ampang (Hulu Langat)', state: 'Selangor' },
    450: { district: 'Kuala Selangor', state: 'Selangor' },
    423: { district: 'Puncak Alam (Kuala Selangor)', state: 'Selangor' },
    813: { district: 'Skudai / Johor Bahru', state: 'Johor' },
    812: { district: 'Johor Bahru', state: 'Johor' },
    811: { district: 'Johor Bahru', state: 'Johor' },
    800: { district: 'Johor Bahru', state: 'Johor' },
    801: { district: 'Johor Bahru', state: 'Johor' },
    810: { district: 'Kulai', state: 'Johor' },
    817: { district: 'Pasir Gudang (Johor Bahru)', state: 'Johor' },
    830: { district: 'Batu Pahat', state: 'Johor' },
    864: { district: 'Parit Raja (Batu Pahat)', state: 'Johor' },
    840: { district: 'Muar', state: 'Johor' },
    846: { district: 'Pagoh (Muar)', state: 'Johor' },
    850: { district: 'Segamat', state: 'Johor' },
    860: { district: 'Kluang', state: 'Johor' },
    819: { district: 'Kota Tinggi', state: 'Johor' },
    820: { district: 'Pontian', state: 'Johor' },
    868: { district: 'Mersing', state: 'Johor' },
    118: { district: 'Gelugor (Timur Laut)', state: 'Pulau Pinang' },
    119: { district: 'Bayan Lepas (Barat Daya)', state: 'Pulau Pinang' },
    117: { district: 'Gelugor (Timur Laut)', state: 'Pulau Pinang' },
    132: { district: 'Kepala Batas (Seberang Perai Utara)', state: 'Pulau Pinang' },
    140: { district: 'Bukit Mertajam (Seberang Perai Tengah)', state: 'Pulau Pinang' },
    143: { district: 'Nibong Tebal (Seberang Perai Selatan)', state: 'Pulau Pinang' },
    718: { district: 'Nilai (Seremban)', state: 'Negeri Sembilan' },
    700: { district: 'Seremban', state: 'Negeri Sembilan' },
    701: { district: 'Seremban', state: 'Negeri Sembilan' },
    710: { district: 'Port Dickson', state: 'Negeri Sembilan' },
    720: { district: 'Kuala Pilah', state: 'Negeri Sembilan' },
    730: { district: 'Tampin', state: 'Negeri Sembilan' },
    761: { district: 'Durian Tunggal (Alor Gajah)', state: 'Melaka' },
    780: { district: 'Alor Gajah', state: 'Melaka' },
    770: { district: 'Jasin', state: 'Melaka' },
    750: { district: 'Melaka Tengah', state: 'Melaka' },
    754: { district: 'Ayer Keroh (Melaka Tengah)', state: 'Melaka' },
    601: { district: 'Sintok (Kubang Pasu)', state: 'Kedah' }, // 06010
    266: { district: 'Pekan', state: 'Pahang' },
    263: { district: 'Gambang / Kuantan', state: 'Pahang' },
    250: { district: 'Kuantan', state: 'Pahang' },
    280: { district: 'Temerloh', state: 'Pahang' },
    276: { district: 'Raub', state: 'Pahang' },
    270: { district: 'Jerantut', state: 'Pahang' },
    287: { district: 'Bentong', state: 'Pahang' },
    210: { district: 'Kuala Nerus / Kuala Terengganu', state: 'Terengganu' },
    213: { district: 'Kuala Nerus', state: 'Terengganu' },
    200: { district: 'Kuala Terengganu', state: 'Terengganu' },
    222: { district: 'Besut', state: 'Terengganu' },
    230: { district: 'Dungun', state: 'Terengganu' },
    240: { district: 'Kemaman', state: 'Terengganu' },
    161: { district: 'Pengkalan Chepa / Kota Bharu', state: 'Kelantan' },
    163: { district: 'Bachok', state: 'Kelantan' },
    176: { district: 'Jeli', state: 'Kelantan' },
    180: { district: 'Kuala Krai', state: 'Kelantan' },
    185: { district: 'Gua Musang', state: 'Kelantan' },
    170: { district: 'Pasir Mas', state: 'Kelantan' },
    162: { district: 'Tumpat', state: 'Kelantan' },
    168: { district: 'Pasir Puteh', state: 'Kelantan' },
    175: { district: 'Tanah Merah', state: 'Kelantan' },
    943: { district: 'Kota Samarahan', state: 'Sarawak' },
    930: { district: 'Kuching', state: 'Sarawak' },
    960: { district: 'Sibu', state: 'Sarawak' },
    970: { district: 'Bintulu', state: 'Sarawak' },
    980: { district: 'Miri', state: 'Sarawak' },
    884: { district: 'Kota Kinabalu', state: 'Sabah' },
    880: { district: 'Kota Kinabalu', state: 'Sabah' },
    890: { district: 'Keningau', state: 'Sabah' },
    900: { district: 'Sandakan', state: 'Sabah' },
    910: { district: 'Tawau', state: 'Sabah' },
  };

  if (clean === '06010') {
    return { district: 'Sintok (Kubang Pasu)', state: 'Kedah' };
  }
  if (clean.startsWith('026')) {
    return { district: 'Arau', state: 'Perlis' };
  }
  if (exactMap[prefix3]) {
    return exactMap[prefix3];
  }

  // General state & primary district resolution by 2-digit / 5-digit range
  if (prefix2 === 1 || prefix2 === 2) {
    return { district: 'Kangar / Arau', state: 'Perlis' };
  }
  if (prefix2 >= 5 && prefix2 <= 9) {
    const kedahDistrict =
      prefix2 === 5
        ? 'Alor Setar (Kota Setar)'
        : prefix2 === 6
        ? 'Jitra (Kubang Pasu)'
        : prefix2 === 7
        ? 'Langkawi'
        : prefix2 === 8
        ? 'Sungai Petani (Kuala Muda)'
        : 'Kulim / Baling';
    return { district: kedahDistrict, state: 'Kedah' };
  }
  if (prefix2 >= 10 && prefix2 <= 14) {
    const penangDistrict =
      prefix2 <= 11
        ? 'Georgetown (Timur Laut)'
        : prefix2 === 12 || prefix2 === 13
        ? 'Butterworth (Seberang Perai Utara)'
        : 'Seberang Perai';
    return { district: penangDistrict, state: 'Pulau Pinang' };
  }
  if (prefix2 >= 15 && prefix2 <= 18) {
    return {
      district: prefix2 <= 16 ? 'Kota Bharu' : 'Kelantan',
      state: 'Kelantan',
    };
  }
  if (prefix2 >= 20 && prefix2 <= 24) {
    return {
      district:
        prefix2 <= 21
          ? 'Kuala Terengganu'
          : prefix2 === 22
          ? 'Besut / Setiu'
          : prefix2 === 23
          ? 'Dungun'
          : 'Kemaman',
      state: 'Terengganu',
    };
  }
  if ((prefix2 >= 25 && prefix2 <= 28) || prefix3 === 390 || prefix3 === 391 || prefix3 === 690) {
    return {
      district:
        prefix3 === 390 || prefix3 === 391
          ? 'Cameron Highlands'
          : prefix2 <= 26
          ? 'Kuantan / Pekan'
          : prefix2 === 27
          ? 'Kuala Lipis / Raub'
          : 'Temerloh / Bentong',
      state: 'Pahang',
    };
  }
  if (prefix2 >= 30 && prefix2 <= 36) {
    return {
      district:
        prefix2 <= 31
          ? 'Ipoh (Kinta)'
          : prefix2 === 32
          ? 'Manjung / Perak Tengah'
          : prefix2 === 33
          ? 'Kuala Kangsar / Hulu Perak'
          : prefix2 === 34
          ? 'Taiping (Larut Matang)'
          : prefix2 === 35
          ? 'Batang Padang / Muallim'
          : 'Hilir Perak (Teluk Intan)',
      state: 'Perak',
    };
  }
  if (
    (prefix2 >= 40 && prefix2 <= 48) ||
    (prefix2 >= 63 && prefix2 <= 68)
  ) {
    return {
      district:
        prefix2 === 40
          ? 'Shah Alam (Petaling)'
          : prefix2 === 41 || prefix2 === 42
          ? 'Klang / Kuala Langat'
          : prefix2 === 43
          ? 'Hulu Langat (Bangi / Kajang)'
          : prefix2 === 44
          ? 'Hulu Selangor (Kuala Kubu Bharu)'
          : prefix2 === 45
          ? 'Kuala Selangor / Sabak Bernam'
          : prefix2 === 46 || prefix2 === 47
          ? 'Petaling Jaya / Subang Jaya'
          : prefix2 === 48 || prefix2 === 68
          ? 'Gombak / Ampang'
          : 'Sepang / Cyberjaya',
      state: 'Selangor',
    };
  }
  if (prefix2 >= 50 && prefix2 <= 60) {
    return {
      district: 'Kuala Lumpur',
      state: 'Wilayah Persekutuan Kuala Lumpur',
    };
  }
  if (prefix2 === 62) {
    return {
      district: 'Putrajaya',
      state: 'Wilayah Persekutuan Putrajaya',
    };
  }
  if (prefix2 >= 70 && prefix2 <= 73) {
    return {
      district:
        prefix2 <= 71 ? 'Seremban / Port Dickson' : 'Kuala Pilah / Jempol / Tampin',
      state: 'Negeri Sembilan',
    };
  }
  if (prefix2 >= 75 && prefix2 <= 78) {
    return {
      district:
        prefix2 <= 76
          ? 'Melaka Tengah'
          : prefix2 === 77
          ? 'Jasin'
          : 'Alor Gajah',
      state: 'Melaka',
    };
  }
  if (prefix2 >= 79 && prefix2 <= 86) {
    return {
      district:
        prefix2 <= 81
          ? 'Johor Bahru / Iskandar Puteri'
          : prefix2 === 82
          ? 'Pontian'
          : prefix2 === 83
          ? 'Batu Pahat'
          : prefix2 === 84
          ? 'Muar / Tangkak'
          : prefix2 === 85
          ? 'Segamat'
          : 'Kluang / Mersing',
      state: 'Johor',
    };
  }
  if (prefix2 === 87) {
    return {
      district: 'Labuan',
      state: 'Wilayah Persekutuan Labuan',
    };
  }
  if (prefix2 >= 88 && prefix2 <= 91) {
    return {
      district:
        prefix2 === 88
          ? 'Kota Kinabalu'
          : prefix2 === 89
          ? 'Keningau / Tuaran / Papar'
          : prefix2 === 90
          ? 'Sandakan'
          : 'Tawau / Lahad Datu',
      state: 'Sabah',
    };
  }
  if (prefix2 >= 93 && prefix2 <= 98) {
    return {
      district:
        prefix2 <= 94
          ? 'Kuching / Kota Samarahan'
          : prefix2 === 95
          ? 'Sri Aman / Betong'
          : prefix2 === 96
          ? 'Sibu / Sarikei'
          : prefix2 === 97
          ? 'Bintulu'
          : 'Miri / Limbang',
      state: 'Sarawak',
    };
  }

  if (code > 0) {
    return { district: 'Daerah Tempatan', state: 'Malaysia' };
  }
  return null;
}

export function getPackagePrefix(pkg: MemberPackage): string {
  if (pkg === 'Premier') return 'APP';
  if (pkg === 'Elite Plus') return 'APEP';
  if (pkg === 'Holding Room') return 'APHR';
  return 'APE';
}

export function generateNextMemberUsername(
  pkg: MemberPackage,
  members: MemberProfile[]
): string {
  const prefix = getPackagePrefix(pkg);
  const matching = members.filter((m) => {
    const upper = m.username.toUpperCase();
    if (pkg === 'Elite') {
      return (
        upper.startsWith('APE') &&
        !upper.startsWith('APEP') &&
        !upper.startsWith('APHR')
      );
    }
    return upper.startsWith(prefix);
  });
  const maxNum = matching.reduce((acc, m) => {
    const n = parseInt(m.username.toUpperCase().replace(prefix, ''), 10);
    return !isNaN(n) && n > acc ? n : acc;
  }, 0);
  return `${prefix}${String(maxNum + 1).padStart(4, '0')}`;
}

export function generateTemporaryPassword(): string {
  const randomDigits = Math.floor(100000 + Math.random() * 900000);
  return `DR-${randomDigits}`;
}
