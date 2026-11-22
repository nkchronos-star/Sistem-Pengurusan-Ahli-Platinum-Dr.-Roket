import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  AdminProfile,
  ClassRecording,
  CRMPDutySchedule,
  CRMPProfile,
  DraftSubmission,
  MemberProfile,
  ThesisTalkItem,
  VCSystemSettings,
  VCVoteRecord,
  WeeklyChecklist,
} from '../types';

const envMeta = (import.meta as unknown as { env: Record<string, string | undefined> }).env || {};

const supabaseUrl =
  envMeta.VITE_SUPABASE_URL ||
  envMeta.SUPABASE_URL ||
  '';

const supabaseAnonKey =
  envMeta.VITE_SUPABASE_ANON_KEY ||
  envMeta.SUPABASE_ANON_KEY ||
  envMeta.VITE_SUPABASE_PUBLISHABLE_KEY ||
  envMeta.SUPABASE_KEY ||
  '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('http') &&
    supabaseAnonKey.length > 10
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

export interface DrRoketCloudPayload {
  members: MemberProfile[];
  crmps: CRMPProfile[];
  admins: AdminProfile[];
  drafts: DraftSubmission[];
  checklists: WeeklyChecklist[];
  recordings: ClassRecording[];
  thesisTalks: ThesisTalkItem[];
  vcVotes: VCVoteRecord[];
  vcSettings: VCSystemSettings;
  crmpSchedules: CRMPDutySchedule[];
  universities: string[];
}

/**
 * Loads application state from Supabase (table: dr_roket_system_state)
 */
export async function fetchStateFromSupabase(): Promise<Partial<DrRoketCloudPayload> | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('dr_roket_system_state')
      .select('*')
      .eq('id', 'main_vault')
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      members: Array.isArray(data.members) && data.members.length > 0 ? data.members : undefined,
      crmps: Array.isArray(data.crmps) && data.crmps.length > 0 ? data.crmps : undefined,
      admins: Array.isArray(data.admins) && data.admins.length > 0 ? data.admins : undefined,
      drafts: Array.isArray(data.drafts) ? data.drafts : undefined,
      checklists: Array.isArray(data.checklists) ? data.checklists : undefined,
      recordings: Array.isArray(data.recordings) && data.recordings.length > 0 ? data.recordings : undefined,
      thesisTalks: Array.isArray(data.thesis_talks) ? data.thesis_talks : undefined,
      vcVotes: Array.isArray(data.vc_votes) ? data.vc_votes : undefined,
      vcSettings: data.vc_settings && Object.keys(data.vc_settings).length > 0 ? data.vc_settings : undefined,
      crmpSchedules: Array.isArray(data.crmp_schedules) ? data.crmp_schedules : undefined,
      universities: Array.isArray(data.universities) && data.universities.length > 0 ? data.universities : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Persists application state to Supabase (dr_roket_system_state + relational tables if created)
 */
export async function syncStateToSupabase(
  payload: DrRoketCloudPayload
): Promise<boolean> {
  if (!supabase) return false;
  try {
    // 1. Upsert into unified dr_roket_system_state table
    const { error } = await supabase.from('dr_roket_system_state').upsert(
      {
        id: 'main_vault',
        members: payload.members,
        crmps: payload.crmps,
        admins: payload.admins,
        drafts: payload.drafts,
        checklists: payload.checklists,
        recordings: payload.recordings,
        thesis_talks: payload.thesisTalks,
        vc_votes: payload.vcVotes,
        vc_settings: payload.vcSettings,
        crmp_schedules: payload.crmpSchedules,
        universities: payload.universities,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    // 2. Also sync relational members table if it exists in the user's Supabase project
    if (payload.members.length > 0) {
      const memberRows = payload.members.map((m) => ({
        id: m.id,
        username: m.username,
        package: m.package,
        name: m.name,
        email: m.email,
        phone: m.phone,
        avatar: m.avatar,
        university: m.university,
        study_level: m.studyLevel || 'PhD',
        research_field: m.researchField || '',
        current_semester: m.currentSemester,
        residence: m.residence,
        address: m.address || '',
        postcode: m.postcode || '',
        district: m.district || '',
        state: m.state || '',
        research_title: m.researchTitle,
        supervisor: m.supervisor,
        supervisor2: m.supervisor2 || '',
        supervisor3: m.supervisor3 || '',
        crmp_id: m.crmpId,
        is_active: m.isActive,
        current_phase: m.currentPhase,
        overall_progress: m.overallProgress,
        platinum_journey_step: m.platinumJourneyStep,
        dates: m.dates,
        publications: m.publications,
        thesis_map: m.thesisMap,
        crmp_notes: m.crmpNotes || '',
        updated_at: new Date().toISOString(),
      }));
      await supabase
        .from('dr_roket_members')
        .upsert(memberRows, { onConflict: 'id' });
    }

    return !error;
  } catch {
    return false;
  }
}
