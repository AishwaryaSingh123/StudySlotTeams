// StudySlot Teams — Mock Teams Repository

import {
  ITeamRepo,
  Team,
  TeamMember,
  Booking,
  CreateTeamSessionInput,
  Result,
} from '../types';
import { getDb, withLock } from './store';
import {
  durationInHours,
  getCampusDateString,
  getCampusTimeString,
  intervalsOverlap,
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

export class MockTeamRepo implements ITeamRepo {
  async getTeam(teamId: string): Promise<Team | null> {
    const db = await getDb();
    const team = db.teams.find((t) => t.id === teamId);
    if (!team) return null;

    const members = db.team_members.filter((m) => m.team_id === teamId);
    const lead = members.find((m) => m.role === 'lead');
    const leadProfile = lead ? db.profiles.find((p) => p.id === lead.user_id) : null;

    // Find next session
    const now = new Date();
    const nextSession = db.bookings
      .filter((b) => b.team_id === teamId && b.status === 'confirmed' && new Date(b.ends_at) > now)
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())[0];

    const room = nextSession ? db.rooms.find((r) => r.id === nextSession.room_id) : null;

    return {
      ...team,
      member_count: members.length,
      lead_name: leadProfile?.full_name,
      next_session: nextSession && room
        ? {
            starts_at: nextSession.starts_at,
            ends_at: nextSession.ends_at,
            room_name: room.name,
          }
        : null,
    };
  }

  async listTeamsForUser(userId: string): Promise<Team[]> {
    const db = await getDb();
    const userTeamIds = db.team_members
      .filter((m) => m.user_id === userId)
      .map((m) => m.team_id);

    const teams: Team[] = [];
    for (const tId of userTeamIds) {
      const t = await this.getTeam(tId);
      if (t) teams.push(t);
    }
    return teams;
  }

  async createTeam(userId: string, name: string, projectName: string): Promise<Result<{ team: Team; joinCode: string }>> {
    return withLock((db) => {
      const trimmedName = name.trim();
      const trimmedProject = projectName.trim();

      if (trimmedName.length < 3 || trimmedName.length > 60) {
        return {
          ok: false,
          error: { code: 'VALIDATION_FAILED', message: 'Team name must be between 3 and 60 characters.' },
        };
      }

      // Check name uniqueness per creator
      const duplicate = db.teams.find(
        (t) => t.created_by === userId && t.name.toLowerCase() === trimmedName.toLowerCase()
      );
      if (duplicate) {
        return {
          ok: false,
          error: {
            code: 'CONFLICT',
            message: `You already have a team named "${trimmedName}". Please choose a distinct name.`,
          },
        };
      }

      // Generate unique join code
      let joinCode = generateJoinCode();
      while (db.teams.some((t) => t.join_code === joinCode)) {
        joinCode = generateJoinCode();
      }

      const teamId = `team-${Date.now().toString(36)}`;
      const newTeam: Team = {
        id: teamId,
        name: trimmedName,
        project_name: trimmedProject,
        join_code: joinCode,
        created_by: userId,
        created_at: new Date().toISOString(),
      };

      // Atomic team creation + lead membership
      const leadMember: TeamMember = {
        team_id: teamId,
        user_id: userId,
        role: 'lead',
        joined_at: new Date().toISOString(),
      };

      db.teams.push(newTeam);
      db.team_members.push(leadMember);

      return {
        ok: true,
        data: {
          team: { ...newTeam, member_count: 1 },
          joinCode,
        },
      };
    });
  }

  async joinTeam(userId: string, joinCode: string): Promise<Result<Team>> {
    return withLock((db) => {
      const code = joinCode.trim().toUpperCase();
      const team = db.teams.find((t) => t.join_code === code);
      if (!team) {
        return {
          ok: false,
          error: { code: 'NOT_FOUND', message: 'Invalid team join code. Please verify the code with your Team Lead.' },
        };
      }

      const alreadyMember = db.team_members.some(
        (m) => m.team_id === team.id && m.user_id === userId
      );
      if (alreadyMember) {
        return {
          ok: false,
          error: { code: 'CONFLICT', message: `You are already a member of ${team.name}.` },
        };
      }

      const newMember: TeamMember = {
        team_id: team.id,
        user_id: userId,
        role: 'member',
        joined_at: new Date().toISOString(),
      };

      db.team_members.push(newMember);

      return {
        ok: true,
        data: { ...team },
      };
    });
  }

  async listMembers(teamId: string): Promise<TeamMember[]> {
    const db = await getDb();
    const memberships = db.team_members.filter((m) => m.team_id === teamId);
    return memberships.map((m) => {
      const profile = db.profiles.find((p) => p.id === m.user_id);
      return {
        ...m,
        profile,
      };
    });
  }

  async removeMember(callerId: string, teamId: string, targetUserId: string): Promise<Result<boolean>> {
    return withLock((db) => {
      const callerMembership = db.team_members.find(
        (m) => m.team_id === teamId && m.user_id === callerId
      );
      if (!callerMembership || callerMembership.role !== 'lead') {
        return {
          ok: false,
          error: { code: 'FORBIDDEN', message: 'Only the Team Lead can remove team members.' },
        };
      }

      const targetMembership = db.team_members.find(
        (m) => m.team_id === teamId && m.user_id === targetUserId
      );
      if (!targetMembership) {
        return {
          ok: false,
          error: { code: 'NOT_FOUND', message: 'Member not found in this team.' },
        };
      }

      if (targetMembership.role === 'lead') {
        return {
          ok: false,
          error: { code: 'RULE_VIOLATION', message: 'Cannot remove the Team Lead. Transfer leadership first.' },
        };
      }

      // Remove member
      db.team_members = db.team_members.filter(
        (m) => !(m.team_id === teamId && m.user_id === targetUserId)
      );

      // Unassign tasks assigned to removed member
      for (const task of db.tasks) {
        if (task.team_id === teamId && task.assignee_id === targetUserId) {
          task.assignee_id = null;
        }
      }

      return { ok: true, data: true };
    });
  }

  async createTeamSession(callerId: string, input: CreateTeamSessionInput): Promise<Result<Booking>> {
    return withLock((db) => {
      const { teamId, roomId, startsAt, endsAt, taskIds, attendeeIds, note } = input;

      // 1. Authorisation: caller must be team lead
      const membership = db.team_members.find(
        (m) => m.team_id === teamId && m.user_id === callerId
      );
      if (!membership || membership.role !== 'lead') {
        return {
          ok: false,
          error: { code: 'FORBIDDEN', message: 'Only the Team Lead can book team sessions.' },
        };
      }

      const team = db.teams.find((t) => t.id === teamId);
      const room = db.rooms.find((r) => r.id === roomId);
      if (!room || !team) {
        return {
          ok: false,
          error: { code: 'NOT_FOUND', message: 'Room or team not found.' },
        };
      }

      // 2. Validate attendees belong to team
      const teamUserIds = db.team_members.filter((m) => m.team_id === teamId).map((m) => m.user_id);
      const allAttendeesValid = attendeeIds.every((id) => teamUserIds.includes(id));
      if (!allAttendeesValid) {
        return {
          ok: false,
          error: { code: 'VALIDATION_FAILED', message: 'All session attendees must be members of the team.' },
        };
      }

      // 3. Validate agenda tasks belong to team and are not 'done'
      const candidateTasks = db.tasks.filter((t) => taskIds.includes(t.id));
      for (const t of candidateTasks) {
        if (t.team_id !== teamId) {
          return {
            ok: false,
            error: { code: 'VALIDATION_FAILED', message: 'Agenda tasks must belong to this team.' },
          };
        }
        if (t.status === 'done') {
          return {
            ok: false,
            error: { code: 'VALIDATION_FAILED', message: `Task "${t.title}" is already done and cannot be added to agenda.` },
          };
        }
      }

      // 4. Validate capacity and general booking rules
      const ruleCheck = validateBookingRules({
        room,
        rules: db.rules,
        blackouts: db.blackouts,
        userExistingBookings: db.bookings,
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

      // 5. Check conflict
      const reqStart = new Date(startsAt);
      const reqEnd = new Date(endsAt);
      const conflict = db.bookings.find((b) => {
        if (b.status !== 'confirmed' || b.room_id !== roomId) return false;
        return intervalsOverlap(reqStart, reqEnd, new Date(b.starts_at), new Date(b.ends_at));
      });

      if (conflict) {
        const reqDate = getCampusDateString(startsAt);
        const reqEndTime = getCampusTimeString(endsAt);
        const reqDuration = durationInHours(startsAt, endsAt);
        const nextFree = findNextFreeSlot(room, reqDate, reqEndTime, reqDuration, db.bookings, db.blackouts);

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

      // 6. Persist atomic session booking
      const newSession: Booking = {
        id: `b-team-${Date.now().toString(36)}`,
        room_id: roomId,
        booked_by: callerId,
        team_id: teamId,
        starts_at: startsAt,
        ends_at: endsAt,
        purpose: input.purpose || `Team Session: ${team.name}`,
        status: 'confirmed',
        created_at: new Date().toISOString(),
        cancelled_at: null,
        session_note: note ? note.slice(0, 200) : null,
        // Mock storage maps task_ids and attendee_ids on the booking record
        ...({
          task_ids: taskIds,
          attendee_ids: attendeeIds,
        } as unknown as object),
      };

      db.bookings.push(newSession);

      const tasks = db.tasks.filter((t) => taskIds.includes(t.id));
      const attendees = db.profiles.filter((p) => attendeeIds.includes(p.id));

      return {
        ok: true,
        data: {
          ...newSession,
          room,
          team,
          tasks,
          attendees,
        },
      };
    });
  }

  async listTeamSessions(teamId: string): Promise<Result<Booking[]>> {
    const db = await getDb();
    const sessions = db.bookings
      .filter((b) => b.team_id === teamId)
      .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime())
      .map((b) => {
        const room = db.rooms.find((r) => r.id === b.room_id);
        const raw = b as unknown as { task_ids?: string[]; attendee_ids?: string[] };
        const tasks = db.tasks.filter((t) => raw.task_ids?.includes(t.id));
        const attendees = db.profiles.filter((p) => raw.attendee_ids?.includes(p.id));

        return {
          ...b,
          room,
          tasks,
          attendees,
        };
      });

    return { ok: true, data: sessions };
  }

  async cancelTeamSession(callerId: string, teamId: string, bookingId: string): Promise<Result<Booking>> {
    return withLock((db) => {
      const membership = db.team_members.find(
        (m) => m.team_id === teamId && m.user_id === callerId
      );
      if (!membership || membership.role !== 'lead') {
        return {
          ok: false,
          error: { code: 'FORBIDDEN', message: 'Only the Team Lead can cancel team sessions.' },
        };
      }

      const booking = db.bookings.find((b) => b.id === bookingId && b.team_id === teamId);
      if (!booking) {
        return {
          ok: false,
          error: { code: 'NOT_FOUND', message: 'Team session booking not found.' },
        };
      }

      if (booking.status === 'cancelled') {
        return {
          ok: false,
          error: { code: 'RULE_VIOLATION', message: 'Session is already cancelled.' },
        };
      }

      booking.status = 'cancelled';
      booking.cancelled_at = new Date().toISOString();

      return {
        ok: true,
        data: { ...booking },
      };
    });
  }
}
