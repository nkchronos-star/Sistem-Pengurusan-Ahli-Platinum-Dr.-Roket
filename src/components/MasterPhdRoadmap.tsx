import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Flag,
  GraduationCap,
  MapPin,
  Navigation,
  Sparkles,
} from 'lucide-react';
import { MemberProfile } from '../types';
import { getTodayDateStr } from '../utils/helpers';

export interface RoadmapMilestone {
  key:
    | 'earlyRegistration'
    | 'registerPD'
    | 'dataCollectionAnalysis'
    | 'nos'
    | 'viva'
    | 'convocation';
  stepNumber: number;
  title: string;
  shortTitle: string;
  description: string;
  dateStr: string;
}

interface MasterPhdRoadmapProps {
  member: MemberProfile;
  onUpdateDates?: (newDates: MemberProfile['dates']) => void;
  defaultCurrentDate?: string;
  compact?: boolean;
}

function parseDateMs(dateStr?: string): number | null {
  if (!dateStr || !dateStr.trim()) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d).getTime();
}

/**
 * Coordinates (in a 1000 x 440 SVG viewBox) for the 6 stops along the winding S-curve road ("jalan berliku-liku").
 * The road winds across 6 scenic bends from left to right.
 */
const WINDING_STOP_COORDS: {
  x: number;
  y: number;
  labelAlign: 'top' | 'bottom';
}[] = [
  { x: 95, y: 330, labelAlign: 'bottom' }, // 1. Tarikh Daftar Pengajian
  { x: 265, y: 125, labelAlign: 'top' }, // 2. Proposal Defense (PD)
  { x: 445, y: 330, labelAlign: 'bottom' }, // 3. Data Collection
  { x: 615, y: 125, labelAlign: 'top' }, // 4. Notice of Submission (NOS)
  { x: 775, y: 325, labelAlign: 'bottom' }, // 5. Viva
  { x: 910, y: 140, labelAlign: 'top' }, // 6. Convocation
];

/**
 * Evaluates a cubic Bezier curve at parameter t in [0, 1]
 */
function cubicBezierPoint(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  t: number
): { x: number; y: number } {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;

  return {
    x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
  };
}

/**
 * Given overall road progress in [0, 100], returns the exact (x, y) point along the winding S-curve road.
 */
function getPointAlongWindingRoad(percentage: number): {
  x: number;
  y: number;
} {
  const clamped = Math.max(0, Math.min(100, percentage));
  const totalSegments = WINDING_STOP_COORDS.length - 1; // 5 segments
  const exactSegmentFloat = (clamped / 100) * totalSegments;
  const segIndex = Math.min(
    totalSegments - 1,
    Math.floor(exactSegmentFloat)
  );
  const localT = exactSegmentFloat - segIndex;

  const start = WINDING_STOP_COORDS[segIndex];
  const end = WINDING_STOP_COORDS[segIndex + 1];
  const midX = (start.x + end.x) / 2;

  return cubicBezierPoint(
    start,
    { x: midX, y: start.y },
    { x: midX, y: end.y },
    end,
    localT
  );
}

/**
 * Builds the SVG path 'd' string for the winding S-curve road connecting all 6 milestones
 */
function buildWindingRoadSvgPath(): string {
  const first = WINDING_STOP_COORDS[0];
  let d = `M ${first.x} ${first.y}`;
  for (let i = 0; i < WINDING_STOP_COORDS.length - 1; i++) {
    const curr = WINDING_STOP_COORDS[i];
    const next = WINDING_STOP_COORDS[i + 1];
    const midX = (curr.x + next.x) / 2;
    d += ` C ${midX} ${curr.y}, ${midX} ${next.y}, ${next.x} ${next.y}`;
  }
  return d;
}

/**
 * Grafik Topi Konvo (Mortarboard) & Mercun (Fireworks) untuk Convocation (Tanpa Gambar Orang)
 */
const ConvocationHatAndFireworksIcon: React.FC<{ active: boolean }> = ({
  active,
}) => (
  <svg
    viewBox="0 0 80 70"
    className="w-16 h-14 overflow-visible drop-shadow-md"
    aria-label="Topi Konvo dan Mercun"
  >
    {/* Mercun / Fireworks Kiri, Kanan & Atas */}
    <g className={active ? 'animate-pulse' : 'opacity-85'}>
      {/* Mercun Kiri */}
      <circle cx="12" cy="16" r="2.5" fill="#fbbf24" />
      <circle cx="6" cy="10" r="2" fill="#f43f5e" />
      <circle cx="17" cy="8" r="2" fill="#38bdf8" />
      <circle cx="5" cy="22" r="2" fill="#a855f7" />
      <line
        x1="12"
        y1="16"
        x2="6"
        y2="10"
        stroke="#fbbf24"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="12"
        y1="16"
        x2="17"
        y2="8"
        stroke="#38bdf8"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="12"
        y1="16"
        x2="5"
        y2="22"
        stroke="#f43f5e"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Mercun Kanan */}
      <circle cx="68" cy="16" r="2.5" fill="#fbbf24" />
      <circle cx="75" cy="10" r="2" fill="#10b981" />
      <circle cx="63" cy="8" r="2" fill="#ec4899" />
      <circle cx="74" cy="23" r="2" fill="#f59e0b" />
      <line
        x1="68"
        y1="16"
        x2="75"
        y2="10"
        stroke="#10b981"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="68"
        y1="16"
        x2="63"
        y2="8"
        stroke="#ec4899"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="68"
        y1="16"
        x2="74"
        y2="23"
        stroke="#f59e0b"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Mercun Tengah Atas */}
      <circle cx="40" cy="6" r="2.5" fill="#f59e0b" />
      <circle cx="33" cy="3" r="1.8" fill="#38bdf8" />
      <circle cx="47" cy="3" r="1.8" fill="#f43f5e" />
    </g>

    {/* Topi Konvo (Mortarboard) */}
    <polygon
      points="40,16 14,28 40,40 66,28"
      fill="#0f172a"
      stroke="#fbbf24"
      strokeWidth="2"
    />
    <path
      d="M 24 33 L 24 46 C 24 51, 56 51, 56 46 L 56 33"
      fill="#1e293b"
      stroke="#fbbf24"
      strokeWidth="1.5"
    />
    {/* Butang & Jambul Emas Topi Konvo */}
    <circle cx="40" cy="28" r="3" fill="#fbbf24" />
    <path
      d="M 40 28 Q 55 31 59 47"
      fill="none"
      stroke="#fbbf24"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <circle cx="59" cy="48" r="3" fill="#f59e0b" />
  </svg>
);

export const MasterPhdRoadmap: React.FC<MasterPhdRoadmapProps> = ({
  member,
  onUpdateDates,
  defaultCurrentDate,
  compact = false,
}) => {
  const todayStr = getTodayDateStr();
  const [currentDate, setCurrentDate] = useState<string>(
    defaultCurrentDate || todayStr
  );
  const [localDates, setLocalDates] = useState<MemberProfile['dates']>({
    ...member.dates,
    convocation: member.dates.convocation || '2027-11-25',
  });

  const milestones: RoadmapMilestone[] = [
    {
      key: 'earlyRegistration',
      stepNumber: 1,
      title: 'Tarikh Daftar Pengajian',
      shortTitle: 'Daftar Pengajian',
      description: 'Pendaftaran rasmi pengajian Master / PhD di universiti',
      dateStr: localDates.earlyRegistration || '',
    },
    {
      key: 'registerPD',
      stepNumber: 2,
      title: 'Proposal Defense (PD)',
      shortTitle: 'Proposal Defense',
      description: 'Pembentangan & kelulusan kertas cadangan penyelidikan (PD)',
      dateStr: localDates.registerPD || '',
    },
    {
      key: 'dataCollectionAnalysis',
      stepNumber: 3,
      title: 'Data Collection',
      shortTitle: 'Data Collection',
      description: 'Pengumpulan data lapangan, eksperimen & analisis dapatan',
      dateStr: localDates.dataCollectionAnalysis || '',
    },
    {
      key: 'nos',
      stepNumber: 4,
      title: 'Notice of Submission (NOS)',
      shortTitle: 'Notice of Submission',
      description: 'Penghantaran Notis Serahan Tesis (NOS) 3 bulan sebelum Viva',
      dateStr: localDates.nos || '',
    },
    {
      key: 'viva',
      stepNumber: 5,
      title: 'Viva',
      shortTitle: 'Viva Voce',
      description: 'Sesi pemeriksaan lisan tesis (Viva Voce) bersama panel',
      dateStr: localDates.viva || '',
    },
    {
      key: 'convocation',
      stepNumber: 6,
      title: 'Convocation',
      shortTitle: 'Convocation',
      description: 'Majlis Konvokesyen & Penganugerahan Ijazah Master / PhD',
      dateStr: localDates.convocation || '',
    },
  ];

  const currentMs = parseDateMs(currentDate) ?? Date.now();

  // Determine the last completed milestone based on milestone date <= currentDate
  let lastCompletedIndex = -1;
  milestones.forEach((m, idx) => {
    const ms = parseDateMs(m.dateStr);
    if (ms !== null && ms <= currentMs) {
      lastCompletedIndex = idx;
    }
  });

  const isConvocationReached = lastCompletedIndex === milestones.length - 1;

  // Calculate exact progress percentage along the winding road (0% to 100%)
  let roadProgressPercentage = 0;
  const totalSegments = milestones.length - 1; // 5 segments between 6 milestones

  if (lastCompletedIndex < 0) {
    roadProgressPercentage = 3;
  } else if (isConvocationReached) {
    roadProgressPercentage = 100;
  } else {
    const baseSegmentPct = (lastCompletedIndex / totalSegments) * 100;
    const segmentSpanPct = (1 / totalSegments) * 100;

    const completedDateMs = parseDateMs(milestones[lastCompletedIndex].dateStr);
    const nextDateMs = parseDateMs(milestones[lastCompletedIndex + 1].dateStr);

    let fractionInCurrentSegment = 0.25;
    if (
      completedDateMs !== null &&
      nextDateMs !== null &&
      nextDateMs > completedDateMs
    ) {
      const elapsed = currentMs - completedDateMs;
      const duration = nextDateMs - completedDateMs;
      fractionInCurrentSegment = Math.max(
        0.08,
        Math.min(0.92, elapsed / duration)
      );
    }

    roadProgressPercentage =
      baseSegmentPct + fractionInCurrentSegment * segmentSpanPct;
  }

  const handleDateFieldChange = (
    key: RoadmapMilestone['key'],
    newDateVal: string
  ) => {
    const updated: MemberProfile['dates'] = {
      ...localDates,
      [key]: newDateVal,
    };
    setLocalDates(updated);
    if (onUpdateDates) {
      onUpdateDates(updated);
    }
  };

  const activeStageLabel =
    lastCompletedIndex < 0
      ? 'Persediaan Daftar Pengajian'
      : isConvocationReached
      ? 'Tahniah! Telah Tiba di Convocation 🎓🎆'
      : `Selesai: ${milestones[lastCompletedIndex].shortTitle} → Menuju: ${
          milestones[lastCompletedIndex + 1].shortTitle
        }`;

  const windingRoadPathD = buildWindingRoadSvgPath();
  const currentMarkerCoord = getPointAlongWindingRoad(roadProgressPercentage);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-indigo-950 text-amber-300 font-mono text-xs font-bold">
              MASTER PhD ROADMAP
            </span>
            <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold">
              Peringkat: {member.studyLevel || 'PhD'} · {member.university}
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Peta Perjalanan Berliku Menuju Convocation ({member.name})
          </h2>
          <p className="text-xs text-slate-500">
            Penanda perjalanan bergerak di atas jalan berliku-liku mengikut
            tarikh akhir bahagian yang telah selesai dan tarikh semasa.
          </p>
        </div>

        {/* Simulasi / Pemilih Tarikh Semasa (Klik Kalendar) */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-2 bg-indigo-50/80 border border-indigo-200 rounded-xl px-3.5 py-2">
            <Calendar className="w-4 h-4 text-indigo-700 shrink-0" />
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                Tarikh Semasa (Klik Kalendar)
              </div>
              <input
                type="date"
                value={currentDate}
                onChange={(e) => setCurrentDate(e.target.value)}
                className="text-xs font-mono font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
              />
            </div>
          </div>
          {currentDate !== todayStr && (
            <button
              type="button"
              onClick={() => setCurrentDate(todayStr)}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl cursor-pointer"
            >
              Reset Hari Ini ({todayStr})
            </button>
          )}
        </div>
      </div>

      {/* Status Bar Perjalanan Semasa */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
            <Flag className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-slate-500 font-medium">
              Status Perjalanan Semasa
            </div>
            <div className="text-xs font-bold text-slate-900 truncate">
              {activeStageLabel}
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 font-mono text-xs font-bold">
            {Math.max(0, lastCompletedIndex + 1)}/6
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-slate-500 font-medium">
              Bahagian Telah Selesai
            </div>
            <div className="text-xs font-bold text-slate-900 truncate">
              {lastCompletedIndex >= 0
                ? `${milestones[lastCompletedIndex].title} (${milestones[lastCompletedIndex].dateStr})`
                : 'Belum ada tarikh selesai'}
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-amber-800 font-medium">
              Sasaran Destinasi Akhir (Convocation)
            </div>
            <div className="text-xs font-bold text-slate-900 font-mono truncate">
              {localDates.convocation || 'Belum ditetapkan'} ·{' '}
              {Math.round(roadProgressPercentage)}% Perjalanan
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* GRAFIK JALAN BERLIKU-LIKU MENUJU KE CONVOCATION (TANPA ORANG)    */}
      {/* ================================================================ */}
      <div className="relative rounded-2xl bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900 border border-slate-800 p-5 sm:p-6 overflow-x-auto text-white">
        <div className="min-w-[820px]">
          {/* Tajuk Atas Peta & Petunjuk */}
          <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
            <div className="flex items-center gap-2 font-semibold">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>
                Laluan Berliku Master / PhD Roadmap ({member.studyLevel || 'PhD'}
                ) — {member.researchField || 'Penyelidikan Tesis'}
              </span>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-mono">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                Selesai
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                Kedudukan Semasa ({currentDate})
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500 inline-block" />
                Sasaran Akan Datang
              </span>
            </div>
          </div>

          {/* SVG Peta Jalan Berliku-Liku (S-Curve Winding Road) */}
          <div className="relative w-full">
            <svg
              viewBox="0 0 1000 450"
              className="w-full h-auto select-none overflow-visible"
            >
              <defs>
                <linearGradient
                  id="progressRoadGrad"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="60%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#fbbf24" />
                </linearGradient>
                <filter
                  id="roadShadow"
                  x="-10%"
                  y="-10%"
                  width="120%"
                  height="120%"
                >
                  <feDropShadow
                    dx="0"
                    dy="6"
                    stdDeviation="6"
                    floodColor="#000000"
                    floodOpacity="0.45"
                  />
                </filter>
              </defs>

              {/* Hiasan Latar Belakang (Bukit / Bintang Halus) */}
              <circle cx="150" cy="60" r="2" fill="#475569" />
              <circle cx="480" cy="50" r="2.5" fill="#64748b" />
              <circle cx="760" cy="65" r="2" fill="#475569" />
              <circle cx="330" cy="390" r="2" fill="#475569" />
              <circle cx="630" cy="395" r="2.5" fill="#64748b" />

              {/* 1. Bahu Jalan / Sempadan Luar Jalan Berliku */}
              <path
                d={windingRoadPathD}
                fill="none"
                stroke="#334155"
                strokeWidth="54"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#roadShadow)"
              />

              {/* 2. Permukaan Asfalt Jalan Berliku-liku */}
              <path
                d={windingRoadPathD}
                fill="none"
                stroke="#0f172a"
                strokeWidth="44"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* 3. Jalur Kemajuan Hijau-Emas Mengikut Peratus Perjalanan */}
              <path
                d={windingRoadPathD}
                fill="none"
                stroke="url(#progressRoadGrad)"
                strokeWidth="40"
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={100}
                strokeDasharray="100"
                strokeDashoffset={100 - roadProgressPercentage}
                className="transition-all duration-700 ease-out opacity-85"
              />

              {/* 4. Garisan Putus-Putus Putih Di Tengah Jalan Berliku */}
              <path
                d={windingRoadPathD}
                fill="none"
                stroke="#f8fafc"
                strokeWidth="3"
                strokeDasharray="12 12"
                strokeLinecap="round"
                opacity="0.85"
              />

              {/* 5. Stesen / Perhentian 6 Fasa Di Atas Jalan Berliku */}
              {milestones.map((m, idx) => {
                const coord = WINDING_STOP_COORDS[idx];
                const isDone = idx <= lastCompletedIndex;
                const isNextTarget = idx === lastCompletedIndex + 1;
                const isConvo = m.key === 'convocation';

                const cardWidth = 158;
                const cardHeight = 76;
                const cardX = coord.x - cardWidth / 2;
                const cardY =
                  coord.labelAlign === 'top'
                    ? coord.y - 115
                    : coord.y + 38;

                return (
                  <g key={m.key}>
                    {/*Jika Convocation, papar Topi Konvo & Mercun di atas stesen ke-6 */}
                    {isConvo && (
                      <foreignObject
                        x={coord.x - 42}
                        y={coord.y - 178}
                        width={84}
                        height={72}
                      >
                        <div className="flex items-center justify-center">
                          <ConvocationHatAndFireworksIcon active={isDone} />
                        </div>
                      </foreignObject>
                    )}

                    {/* Garis Tiang Penanda Stesen */}
                    <line
                      x1={coord.x}
                      y1={coord.y}
                      x2={coord.x}
                      y2={
                        coord.labelAlign === 'top'
                          ? coord.y - 38
                          : coord.y + 38
                      }
                      stroke={
                        isConvo
                          ? '#fbbf24'
                          : isDone
                          ? '#34d399'
                          : isNextTarget
                          ? '#818cf8'
                          : '#64748b'
                      }
                      strokeWidth="2.5"
                      strokeDasharray="3 3"
                    />

                    {/* Bulatan Checkpoint Di Atas Jalan */}
                    <circle
                      cx={coord.x}
                      cy={coord.y}
                      r={isConvo ? 22 : 18}
                      fill={
                        isConvo
                          ? isDone
                            ? '#f59e0b'
                            : '#1e293b'
                          : isDone
                          ? '#10b981'
                          : isNextTarget
                          ? '#4f46e5'
                          : '#1e293b'
                      }
                      stroke={
                        isConvo
                          ? '#fde68a'
                          : isDone
                          ? '#a7f3d0'
                          : isNextTarget
                          ? '#c7d2fe'
                          : '#64748b'
                      }
                      strokeWidth="4"
                    />

                    {/* Nombor Fasa Di Dalam Checkpoint */}
                    <text
                      x={coord.x}
                      y={coord.y + 4}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="12"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {isDone ? '✓' : m.stepNumber}
                    </text>

                    {/* Kad Maklumat Fasa (ForeignObject) */}
                    <foreignObject
                      x={cardX}
                      y={cardY}
                      width={cardWidth}
                      height={cardHeight}
                    >
                      <div
                        className={`rounded-xl p-2 text-center border shadow-md ${
                          isConvo
                            ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                            : isDone
                            ? 'bg-emerald-950/90 border-emerald-400/70 text-emerald-100'
                            : isNextTarget
                            ? 'bg-indigo-950/90 border-indigo-400 text-indigo-100'
                            : 'bg-slate-900/90 border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="text-[10px] font-mono uppercase tracking-wider opacity-85">
                          FASA {m.stepNumber} {isConvo ? '🎓🎆' : ''}
                        </div>
                        <div className="text-[11px] font-bold leading-tight truncate mt-0.5 text-white">
                          {m.shortTitle}
                        </div>
                        <div className="text-[10px] font-mono mt-1 px-1.5 py-0.5 rounded bg-black/30 inline-block">
                          {m.dateStr || 'Klik Kalendar'}
                        </div>
                      </div>
                    </foreignObject>
                  </g>
                );
              })}

              {/* 6. Penanda Kedudukan Semasa Di Atas Jalan Berliku (TANPA GAMBAR ORANG) */}
              <g
                transform={`translate(${currentMarkerCoord.x}, ${currentMarkerCoord.y})`}
                className="transition-all duration-700 ease-out"
              >
                {/* Gelombang Cahaya Kedudukan Semasa */}
                <circle
                  cx="0"
                  cy="0"
                  r="26"
                  fill="#fbbf24"
                  opacity="0.25"
                />
                <circle
                  cx="0"
                  cy="0"
                  r="16"
                  fill="#f59e0b"
                  stroke="#ffffff"
                  strokeWidth="3.5"
                />
                {/* Anak Panah / Pin Navigasi Di Tengah */}
                <polygon points="-5,-6 7,0 -5,6 -2,0" fill="#0f172a" />

                {/* Label Terapung Kedudukan Semasa */}
                <foreignObject x={-78} y={-62} width={156} height={42}>
                  <div className="flex flex-col items-center">
                    <div className="px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 font-mono text-[10px] font-extrabold shadow-md border border-white whitespace-nowrap flex items-center gap-1">
                      <Navigation className="w-3 h-3 fill-slate-950" />
                      <span>
                        {isConvocationReached
                          ? 'CONVOCATION! 🎓🎆'
                          : `ANDA DI SINI (${Math.round(
                              roadProgressPercentage
                            )}%)`}
                      </span>
                    </div>
                  </div>
                </foreignObject>
              </g>
            </svg>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* KALENDAR TARIKH MASTER PhD ROADMAP (KLIK KALENDAR)               */}
      {/* ================================================================ */}
      {!compact && (
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Tetapan Tarikh Master PhD Roadmap (Klik Kalendar)
              </h3>
              <p className="text-xs text-slate-500">
                Klik pada ruangan tarikh di bawah untuk memilih tarikh setiap
                fasa. Penanda perjalanan di atas jalan berliku akan bergerak
                secara automatik.
              </p>
            </div>
            <span className="text-xs font-mono text-indigo-700 font-semibold">
              Tarikh Semasa: {currentDate}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {milestones.map((m, idx) => {
              const isDone = idx <= lastCompletedIndex;
              const isNext = idx === lastCompletedIndex + 1;
              const isConvo = m.key === 'convocation';

              return (
                <div
                  key={m.key}
                  className={`p-4 rounded-xl border transition-colors space-y-2.5 ${
                    isConvo && isDone
                      ? 'bg-amber-50/90 border-amber-400'
                      : isDone
                      ? 'bg-emerald-50/60 border-emerald-300'
                      : isNext
                      ? 'bg-indigo-50/60 border-indigo-300'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-6 h-6 rounded-lg font-mono text-xs font-bold flex items-center justify-center shrink-0 ${
                          isConvo && isDone
                            ? 'bg-amber-500 text-slate-950'
                            : isDone
                            ? 'bg-emerald-600 text-white'
                            : isNext
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {m.stepNumber}
                      </span>
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          {m.title}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {m.description}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 inline-flex items-center gap-1 ${
                        isDone
                          ? 'bg-emerald-100 text-emerald-800'
                          : isNext
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {isDone ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          Selesai
                        </>
                      ) : isNext ? (
                        <>
                          <Clock className="w-3 h-3" />
                          Sedang Menuju
                        </>
                      ) : (
                        <>
                          <MapPin className="w-3 h-3" />
                          Sasaran
                        </>
                      )}
                    </span>
                  </div>

                  <div className="pt-1">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Klik Kalendar ({m.shortTitle}):
                    </label>
                    <input
                      type="date"
                      value={m.dateStr}
                      onChange={(e) =>
                        handleDateFieldChange(m.key, e.target.value)
                      }
                      className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
