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

const isSupabase = process.env.DATA_BACKEND === 'supabase';

export function getAuthRepo(): IAuthRepo {
  return isSupabase ? new SupabaseAuthRepo() : new MockAuthRepo();
}

export function getRoomRepo(): IRoomRepo {
  return isSupabase ? new SupabaseRoomRepo() : new MockRoomRepo();
}

export function getBookingRepo(): IBookingRepo {
  return isSupabase ? new SupabaseBookingRepo() : new MockBookingRepo();
}

export function getTeamRepo(): ITeamRepo {
  return isSupabase ? new SupabaseTeamRepo() : new MockTeamRepo();
}

export function getTaskRepo(): ITaskRepo {
  return isSupabase ? new SupabaseTaskRepo() : new MockTaskRepo();
}

export function getMilestoneRepo(): IMilestoneRepo {
  return isSupabase ? new SupabaseMilestoneRepo() : new MockMilestoneRepo();
}

export function getReportRepo(): IReportRepo {
  return isSupabase ? new SupabaseReportRepo() : new MockReportRepo();
}

export function getRulesRepo(): IRulesRepo {
  return isSupabase ? new SupabaseRulesRepo() : new MockRulesRepo();
}
