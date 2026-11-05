// StudySlot Teams — Dynamic Repository Selector (Mock vs Supabase)

import {
  IAuthRepo,
  IRoomRepo,
  IBookingRepo,
  ITeamRepo,
  ITaskRepo,
  IMilestoneRepo,
  IReportRepo,
  IRulesRepo,
} from './types';

import { MockAuthRepo } from './mock/auth';
import { MockRoomRepo } from './mock/rooms';
import { MockBookingRepo } from './mock/bookings';
import { MockTeamRepo } from './mock/teams';
import { MockTaskRepo } from './mock/tasks';
import { MockMilestoneRepo } from './mock/milestones';
import { MockReportRepo } from './mock/reports';
import { MockRulesRepo } from './mock/rules';

import { SupabaseAuthRepo } from './supabase/auth';
import { SupabaseRoomRepo } from './supabase/rooms';
import { SupabaseBookingRepo } from './supabase/bookings';
import { SupabaseTeamRepo } from './supabase/teams';
import { SupabaseTaskRepo } from './supabase/tasks';
import { SupabaseMilestoneRepo } from './supabase/milestones';
import { SupabaseReportRepo } from './supabase/reports';
import { SupabaseRulesRepo } from './supabase/rules';

export function isUsingSupabase(): boolean {
  if (process.env.DATA_BACKEND === 'mock') {
    return false;
  }
  if (process.env.DATA_BACKEND === 'supabase') {
    return true;
  }
  // Auto-detect: if Supabase credentials exist, automatically use Supabase!
  const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.trim() !== '');
  const hasKey = Boolean(
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.trim() !== '') ||
    (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY.trim() !== '')
  );
  return hasUrl && hasKey;
}

export function getAuthRepo(): IAuthRepo {
  return isUsingSupabase() ? new SupabaseAuthRepo() : new MockAuthRepo();
}

export function getRoomRepo(): IRoomRepo {
  return isUsingSupabase() ? new SupabaseRoomRepo() : new MockRoomRepo();
}

export function getBookingRepo(): IBookingRepo {
  return isUsingSupabase() ? new SupabaseBookingRepo() : new MockBookingRepo();
}

export function getTeamRepo(): ITeamRepo {
  return isUsingSupabase() ? new SupabaseTeamRepo() : new MockTeamRepo();
}

export function getTaskRepo(): ITaskRepo {
  return isUsingSupabase() ? new SupabaseTaskRepo() : new MockTaskRepo();
}

export function getMilestoneRepo(): IMilestoneRepo {
  return isUsingSupabase() ? new SupabaseMilestoneRepo() : new MockMilestoneRepo();
}

export function getReportRepo(): IReportRepo {
  return isUsingSupabase() ? new SupabaseReportRepo() : new MockReportRepo();
}

export function getRulesRepo(): IRulesRepo {
  return isUsingSupabase() ? new SupabaseRulesRepo() : new MockRulesRepo();
}
