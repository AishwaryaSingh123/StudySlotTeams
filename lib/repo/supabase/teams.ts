// StudySlot Teams — Supabase Teams Repository
import { getSupabaseClient } from '../../supabase/server';
import {
  ITeamRepo,
  Team,
  TeamMember,
  Booking,
  CreateTeamSessionInput,
  Result,
  Room,
  Rules,
  BlackoutDate,
} from '../types';
import {
  durationInHours,
  getCampusDateString,
  getCampusTimeString,
} from '../../time/campus';
import {
  findNextFreeSlot,
  validateBookingRules,
} from '../../rules/booking';

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export class SupabaseTeamRepo implements ITeamRepo {
  async getTeam(teamId: string): Promise<Team | null> {
    const supabase = getSupabaseClient();
    const { data: team, error } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .maybeSingle();

    if (error || !team) return null;

    const { data: members } = await supabase
      .from('team_members')
      .select('*, profiles(*)')
      .eq('team_id', teamId);

    const lead = (members || []).find((m: any) => m.role === 'lead');

    const nowIso = new Date().toISOString();
    const { data: nextSession } = await supabase
      .from('bookings')
      .select('*, rooms(*)')
      .eq('team_id', teamId)
      .eq('status', 'confirmed')
      .gt('ends_at', nowIso)
      .order('starts_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    return {
      id: team.id,
      name: team.name,
      project_name: team.project_name || team.name,
      join_code: team.join_code,
      created_by: team.created_by,
      created_at: team.created_at,
      member_count: (members || []).length,
      lead_name: lead?.profiles?.full_name,
      next_session: nextSession && nextSession.rooms
        ? {
            starts_at: nextSession.starts_at,
            ends_at: nextSession.ends_at,
            room_name: nextSession.rooms.name,
          }
        : null,
    };
  }

  async listTeamsForUser(userId: string): Promise<Team[]> {
    const supabase = getSupabaseClient();
    const { data: memberships } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId);

    if (!memberships || memberships.length === 0) return [];

    const teams: Team[] = [];
    for (const m of memberships) {
      const t = await this.getTeam(m.team_id);
      if (t) teams.push(t);
    }
    return teams;
  }

  async createTeam(userId: string, name: string, projectName: string): Promise<Result<{ team: Team; joinCode: string }>> {
    const supabase = getSupabaseClient();
    const trimmedName = name.trim();
    const trimmedProject = projectName.trim();

    if (trimmedName.length < 3 || trimmedName.length > 60) {
      return {
        ok: false,
        error: { code: 'VALIDATION_FAILED', message: 'Team name must be between 3 and 60 characters.' },
      };
    }

    const teamId = `team-${Date.now().toString(36)}`;
    const joinCode = generateJoinCode();

    const { data: rpcRes, error: rpcError } = await supabase.rpc('rpc_create_team', {
      p_team_id: teamId,
      p_name: trimmedName,
      p_join_code: joinCode,
    });

    if (rpcError) {
      return { ok: false, error: { code: 'INTERNAL', message: rpcError.message } };
    }

    if (!rpcRes.ok) {
      return { ok: false, error: { code: rpcRes.code, message: rpcRes.message } };
    }

    const created = await this.getTeam(teamId);
    return {
      ok: true,
      data: {
        team: created!,
        joinCode,
      },
    };
  }

  async joinTeam(userId: string, joinCode: string): Promise<Result<Team>> {
    const supabase = getSupabaseClient();
    const code = joinCode.trim().toUpperCase();

    const { data: team, error } = await supabase
      .from('teams')
      .select('*')
      .ilike('join_code', code)
      .maybeSingle();

    if (error || !team) {
      return {
        ok: false,
        error: { code: 'NOT_FOUND', message: 'Invalid team join code. Please verify the code with your Team Lead.' },
      };
    }

    const { data: existing } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', team.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      return {
        ok: false,
        error: { code: 'CONFLICT', message: `You are already a member of ${team.name}.` },
      };
    }

    await supabase.from('team_members').insert({
      team_id: team.id,
      user_id: userId,
      role: 'member',
      joined_at: new Date().toISOString(),
    });

    const fullTeam = await this.getTeam(team.id);
    return { ok: true, data: fullTeam! };
  }

  async listMembers(teamId: string): Promise<TeamMember[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('team_members')
      .select('*, profiles(*)')
      .eq('team_id', teamId);

    if (error || !data) return [];

    return data.map((m: any) => ({
      team_id: m.team_id,
      user_id: m.user_id,
      role: m.role,
      joined_at: m.joined_at,
      profile: m.profiles
        ? {
            id: m.profiles.id,
            full_name: m.profiles.full_name,
            email: m.profiles.email,
            role: m.profiles.role,
            created_at: m.profiles.created_at,
          }
        : undefined,
    }));
  }

  async removeMember(callerId: string, teamId: string, targetUserId: string): Promise<Result<boolean>> {
    const supabase = getSupabaseClient();
    const { data: caller } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)
      .eq('user_id', callerId)
      .maybeSingle();

    if (!caller || caller.role !== 'lead') {
      return {
        ok: false,
        error: { code: 'FORBIDDEN', message: 'Only the Team Lead can remove team members.' },
      };
    }

    const { data: target } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (!target) {
      return {
        ok: false,
        error: { code: 'NOT_FOUND', message: 'Member not found in this team.' },
      };
    }

    if (target.role === 'lead') {
      return {
        ok: false,
        error: { code: 'RULE_VIOLATION', message: 'Cannot remove the Team Lead. Transfer leadership first.' },
      };
    }

    await supabase.from('team_members').delete().eq('team_id', teamId).eq('user_id', targetUserId);
    await supabase.from('tasks').update({ assignee_id: null }).eq('team_id', teamId).eq('assignee_id', targetUserId);

    return { ok: true, data: true };
  }

  async createTeamSession(callerId: string, input: CreateTeamSessionInput): Promise<Result<Booking>> {
    const supabase = getSupabaseClient();
    const { teamId, roomId, startsAt, endsAt, taskIds, attendeeIds, note } = input;

    // Caller must be team lead
    const { data: membership } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)
      .eq('user_id', callerId)
      .maybeSingle();

    if (!membership || membership.role !== 'lead') {
      return {
        ok: false,
        error: { code: 'FORBIDDEN', message: 'Only the Team Lead can book team sessions.' },
      };
    }

    const { data: roomData } = await supabase.from('rooms').select('*').eq('id', roomId).single();
    const { data: teamData } = await supabase.from('teams').select('*').eq('id', teamId).single();
    if (!roomData || !teamData) {
      return { ok: false, error: { code: 'NOT_FOUND', message: 'Room or team not found.' } };
    }

    const room: Room = {
      id: roomData.id,
      name: roomData.name,
      building: roomData.building,
      floor: roomData.floor,
      capacity: roomData.capacity,
      opens_at: roomData.opens_at || '08:00:00',
      closes_at: roomData.closes_at || '22:00:00',
      status: roomData.status || (roomData.is_active ? 'active' : 'inactive'),
      equipment: [],
    };

    const { data: rulesData } = await supabase.from('rules').select('*').limit(1).maybeSingle();
    const rules: Rules = rulesData
      ? {
          id: rulesData.id,
          max_hours_per_day: Number(rulesData.max_hours_per_day),
          max_booking_hours: rulesData.max_booking_hours || 2.0,
          slot_minutes: rulesData.slot_step_minutes || rulesData.slot_minutes || 30,
        }
      : { id: 1, max_hours_per_day: 2.0, max_booking_hours: 2.0, slot_minutes: 30 };

    const { data: blackoutsData } = await supabase.from('blackout_dates').select('*');
    const blackouts: BlackoutDate[] = (blackoutsData || []).map((b: any) => ({
      id: b.id,
      room_id: b.room_id || null,
      start_date: b.date || b.start_date,
      end_date: b.date || b.end_date,
      reason: b.reason,
    }));

    const { data: bookingsData } = await supabase.from('bookings').select('*');
    const allBookings: Booking[] = (bookingsData || []).map((b: any) => ({
      id: b.id,
      room_id: b.room_id,
      booked_by: b.created_by,
      team_id: b.team_id || null,
      starts_at: b.starts_at,
      ends_at: b.ends_at,
      purpose: b.purpose,
      status: b.status,
      created_at: b.created_at,
      cancelled_at: b.cancelled_at || null,
    }));

    const ruleCheck = validateBookingRules({
      room,
      rules,
      blackouts,
      userExistingBookings: allBookings,
      userId: callerId,
      startsAt,
      endsAt,
      attendeeCount: attendeeIds.length,
    });

    if (!ruleCheck.valid && ruleCheck.error) {
      return {
        ok: false,
        error: { code: 'RULE_VIOLATION', message: ruleCheck.error.message },
      };
    }

    const newBookingId = `b-team-${Date.now().toString(36)}`;
    const { data: rpcRes, error: rpcError } = await supabase.rpc('rpc_create_booking', {
      p_id: newBookingId,
      p_room_id: roomId,
      p_starts_at: startsAt,
      p_ends_at: endsAt,
      p_purpose: input.purpose || `Team Session: ${teamData.name}`,
      p_team_id: teamId,
    });

    if (rpcError) {
      return { ok: false, error: { code: 'INTERNAL', message: rpcError.message } };
    }

    if (!rpcRes.ok) {
      if (rpcRes.code === 'CONFLICT') {
        const nextFree = findNextFreeSlot(
          room,
          getCampusDateString(startsAt),
          getCampusTimeString(endsAt),
          durationInHours(startsAt, endsAt),
          allBookings,
          blackouts
        );
        return {
          ok: false,
          error: {
            code: 'CONFLICT',
            message: `That slot was just booked by someone else.${
              nextFree ? ` Next free slot in ${room.name}: ${nextFree.start}–${nextFree.end}.` : ''
            }`,
            nextFreeSlot: nextFree,
          },
        };
      }
      return { ok: false, error: { code: rpcRes.code, message: rpcRes.message } };
    }

    if (taskIds && taskIds.length > 0) {
      const taskRows = taskIds.map((tId) => ({ booking_id: newBookingId, task_id: tId }));
      await supabase.from('session_tasks').insert(taskRows);
    }

    if (attendeeIds && attendeeIds.length > 0) {
      const attendeeRows = attendeeIds.map((uId) => ({
        booking_id: newBookingId,
        user_id: uId,
        status: uId === callerId ? 'accepted' : 'invited',
      }));
      await supabase.from('session_attendees').insert(attendeeRows);
    }

    const { data: fullBooking } = await supabase
      .from('bookings')
      .select('*, rooms(*), teams(*)')
      .eq('id', newBookingId)
      .single();

    return {
      ok: true,
      data: {
        id: fullBooking.id,
        room_id: fullBooking.room_id,
        booked_by: fullBooking.created_by,
        team_id: fullBooking.team_id,
        starts_at: fullBooking.starts_at,
        ends_at: fullBooking.ends_at,
        purpose: fullBooking.purpose,
        status: fullBooking.status,
        created_at: fullBooking.created_at,
        cancelled_at: fullBooking.cancelled_at,
        session_note: note ? note.slice(0, 200) : null,
      },
    };
  }

  async listTeamSessions(teamId: string): Promise<Result<Booking[]>> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('bookings')
      .select('*, rooms(*), session_tasks(task_id), session_attendees(user_id)')
      .eq('team_id', teamId)
      .order('starts_at', { ascending: false });

    if (error || !data) {
      return { ok: true, data: [] };
    }

    const bookings: Booking[] = data.map((b: any) => ({
      id: b.id,
      room_id: b.room_id,
      booked_by: b.created_by,
      team_id: b.team_id,
      starts_at: b.starts_at,
      ends_at: b.ends_at,
      purpose: b.purpose,
      status: b.status,
      created_at: b.created_at,
      cancelled_at: b.cancelled_at || null,
      room: b.rooms
        ? {
            id: b.rooms.id,
            name: b.rooms.name,
            building: b.rooms.building,
            floor: b.rooms.floor,
            capacity: b.rooms.capacity,
            opens_at: b.rooms.opens_at || '08:00:00',
            closes_at: b.rooms.closes_at || '22:00:00',
            status: b.rooms.status || (b.rooms.is_active ? 'active' : 'inactive'),
            equipment: [],
          }
        : undefined,
    }));

    return { ok: true, data: bookings };
  }

  async cancelTeamSession(callerId: string, teamId: string, bookingId: string): Promise<Result<Booking>> {
    const supabase = getSupabaseClient();
    const { data: membership } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)
      .eq('user_id', callerId)
      .maybeSingle();

    if (!membership || membership.role !== 'lead') {
      return {
        ok: false,
        error: { code: 'FORBIDDEN', message: 'Only the Team Lead can cancel team sessions.' },
      };
    }

    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: nowIso,
        cancelled_by: callerId,
      })
      .eq('id', bookingId)
      .eq('team_id', teamId)
      .select()
      .single();

    if (error || !data) {
      return { ok: false, error: { code: 'INTERNAL', message: error?.message || 'Failed to cancel session.' } };
    }

    return {
      ok: true,
      data: {
        id: data.id,
        room_id: data.room_id,
        booked_by: data.created_by,
        team_id: data.team_id,
        starts_at: data.starts_at,
        ends_at: data.ends_at,
        purpose: data.purpose,
        status: data.status,
        created_at: data.created_at,
        cancelled_at: data.cancelled_at,
      },
    };
  }
}
