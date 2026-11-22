-- =========================================================================
-- SKEMA PANGKALAN DATA SUPABASE: SISTEM PENGURUSAN DR. ROKET (AHLI PLATINIUM)
-- Salin dan jalankan (Run) skrip SQL ini di dalam Supabase SQL Editor anda.
-- =========================================================================

-- 1. Jadual Utama Storan Negeri &Segerak Masa Nyata (Unified State & Backup Vault)
CREATE TABLE IF NOT EXISTS public.dr_roket_system_state (
  id TEXT PRIMARY KEY DEFAULT 'main_vault',
  members JSONB NOT NULL DEFAULT '[]'::jsonb,
  crmps JSONB NOT NULL DEFAULT '[]'::jsonb,
  admins JSONB NOT NULL DEFAULT '[]'::jsonb,
  drafts JSONB NOT NULL DEFAULT '[]'::jsonb,
  checklists JSONB NOT NULL DEFAULT '[]'::jsonb,
  recordings JSONB NOT NULL DEFAULT '[]'::jsonb,
  thesis_talks JSONB NOT NULL DEFAULT '[]'::jsonb,
  vc_votes JSONB NOT NULL DEFAULT '[]'::jsonb,
  vc_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  crmp_schedules JSONB NOT NULL DEFAULT '[]'::jsonb,
  universities JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Jadual Ahli Platinium (Relational Table)
CREATE TABLE IF NOT EXISTS public.dr_roket_members (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  package TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar TEXT,
  university TEXT,
  study_level TEXT DEFAULT 'PhD',
  research_field TEXT,
  current_semester TEXT,
  residence TEXT,
  address TEXT,
  postcode TEXT,
  district TEXT,
  state TEXT,
  research_title TEXT,
  supervisor TEXT,
  supervisor2 TEXT,
  supervisor3 TEXT,
  crmp_id TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  current_phase TEXT,
  overall_progress INTEGER DEFAULT 0,
  platinum_journey_step INTEGER DEFAULT 1,
  dates JSONB DEFAULT '{}'::jsonb,
  publications JSONB DEFAULT '[]'::jsonb,
  thesis_map JSONB DEFAULT '[]'::jsonb,
  crmp_notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Jadual CRMP
CREATE TABLE IF NOT EXISTS public.dr_roket_crmps (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  university TEXT,
  specialization TEXT,
  group_name TEXT,
  avatar TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Jadual Naik Draf Tesis
CREATE TABLE IF NOT EXISTS public.dr_roket_drafts (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  ttb TEXT,
  draft_number INTEGER NOT NULL,
  date TEXT NOT NULL,
  page_count INTEGER DEFAULT 0,
  word_count INTEGER DEFAULT 0,
  sujud_syukur_11x BOOLEAN DEFAULT FALSE,
  two_hours_seven_minutes BOOLEAN DEFAULT FALSE,
  update_thesis_map BOOLEAN DEFAULT FALSE,
  tdr013 BOOLEAN DEFAULT FALSE,
  tdr010 BOOLEAN DEFAULT FALSE,
  fb_share_with_crmp BOOLEAN DEFAULT FALSE,
  target_for_next_draft TEXT,
  update_affirmation_card BOOLEAN DEFAULT FALSE,
  affirmation_text TEXT,
  crmp_feedback TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Jadual Checklist Submission Mingguan
CREATE TABLE IF NOT EXISTS public.dr_roket_checklists (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  week_label TEXT NOT NULL,
  start_date TEXT NOT NULL,
  weekly_fokus_completed BOOLEAN DEFAULT FALSE,
  daily_entries JSONB DEFAULT '{}'::jsonb,
  tdr001_isnin BOOLEAN DEFAULT FALSE,
  tdr006_selasa BOOLEAN DEFAULT FALSE,
  tdr002_rabu BOOLEAN DEFAULT FALSE,
  tdr003_rabu BOOLEAN DEFAULT FALSE,
  tdr017_khamis BOOLEAN DEFAULT FALSE,
  tdr018_khamis BOOLEAN DEFAULT FALSE,
  tdr007_jumaat BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Jadual Kehadiran & Vote VC
CREATE TABLE IF NOT EXISTS public.dr_roket_vc_votes (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  session_name TEXT,
  member_username TEXT NOT NULL,
  member_name TEXT,
  crmp_id TEXT,
  status TEXT NOT NULL,
  check_in_time TEXT,
  takeaway_note TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Aktifkan Row Level Security (RLS) dengan Polisi Akses Aplikasi
ALTER TABLE public.dr_roket_system_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dr_roket_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dr_roket_crmps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dr_roket_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dr_roket_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dr_roket_vc_votes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'dr_roket_system_state' AND policyname = 'Allow public app access'
  ) THEN
    CREATE POLICY "Allow public app access" ON public.dr_roket_system_state FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'dr_roket_members' AND policyname = 'Allow public app access'
  ) THEN
    CREATE POLICY "Allow public app access" ON public.dr_roket_members FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'dr_roket_crmps' AND policyname = 'Allow public app access'
  ) THEN
    CREATE POLICY "Allow public app access" ON public.dr_roket_crmps FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'dr_roket_drafts' AND policyname = 'Allow public app access'
  ) THEN
    CREATE POLICY "Allow public app access" ON public.dr_roket_drafts FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'dr_roket_checklists' AND policyname = 'Allow public app access'
  ) THEN
    CREATE POLICY "Allow public app access" ON public.dr_roket_checklists FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'dr_roket_vc_votes' AND policyname = 'Allow public app access'
  ) THEN
    CREATE POLICY "Allow public app access" ON public.dr_roket_vc_votes FOR ALL USING (true) WITH CHECK (true);
  END IF;
END
$$;
