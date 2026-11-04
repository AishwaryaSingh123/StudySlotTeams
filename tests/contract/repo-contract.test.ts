import { describe, it, expect, beforeEach } from 'vitest';
import { resetDbToSeed } from '../../lib/repo/mock/store';
import {
  MockAuthRepo,
} from '../../lib/repo/mock/auth';
import { MockRoomRepo } from '../../lib/repo/mock/rooms';
import { MockBookingRepo } from '../../lib/repo/mock/bookings';
import { MockTeamRepo } from '../../lib/repo/mock/teams';
import { MockTaskRepo } from '../../lib/repo/mock/tasks';
import { MockRulesRepo } from '../../lib/repo/mock/rules';

describe('Repository Contracts and Security Boundaries', () => {
  let authRepo: MockAuthRepo;
  let roomRepo: MockRoomRepo;
  let bookingRepo: MockBookingRepo;
  let teamRepo: MockTeamRepo;
  let taskRepo: MockTaskRepo;
  let rulesRepo: MockRulesRepo;

  beforeEach(async () => {
    await resetDbToSeed();
    authRepo = new MockAuthRepo();
    roomRepo = new MockRoomRepo();
    bookingRepo = new MockBookingRepo();
    teamRepo = new MockTeamRepo();
    taskRepo = new MockTaskRepo();
    rulesRepo = new MockRulesRepo();
  });

  it('rejects self-promotion: student cannot escalate role to staff_admin', async () => {
    const student = await authRepo.getUserByEmail('asha.demo@example.test');
    expect(student).not.toBeNull();
    expect(student?.role).toBe('student');

    // Attempt to pass malicious patch with role: staff_admin
    const res = await authRepo.updateProfile(student!.id, {
      full_name: 'Asha Promoted',
      // @ts-expect-error test illegal role injection
      role: 'staff_admin',
    });

    expect(res.ok).toBe(true);
    // Profile name was updated, but role remains 'student'!
    const refreshed = await authRepo.getUserById(student!.id);
    expect(refreshed?.role).toBe('student');
    expect(refreshed?.full_name).toBe('Asha Promoted');
  });

  it('enforces conflict-free booking: overlapping request is rejected with CONFLICT', async () => {
    const rooms = await roomRepo.listRooms();
    const room = rooms[0];

    const slotStart = '2026-11-19T08:30:00Z'; // 14:00 IST
    const slotEnd = '2026-11-19T09:30:00Z';   // 15:00 IST

    // User A books the slot
    const bookRes1 = await bookingRepo.createBooking('u-asha-02', {
      roomId: room.id,
      startsAt: slotStart,
      endsAt: slotEnd,
      purpose: 'Session A',
    });
    expect(bookRes1.ok).toBe(true);

    // User B attempts overlapping booking for same room & slot
    const bookRes2 = await bookingRepo.createBooking('u-ravi-03', {
      roomId: room.id,
      startsAt: slotStart,
      endsAt: slotEnd,
      purpose: 'Session B',
    });

    expect(bookRes2.ok).toBe(false);
    if (!bookRes2.ok) {
      expect(bookRes2.error.code).toBe('CONFLICT');
      expect(bookRes2.error.message).toContain('That slot was just booked by someone else');
    }

    // When User A cancels, slot is immediately freed
    if (bookRes1.ok) {
      const cancelRes = await bookingRepo.cancelBooking('u-asha-02', bookRes1.data.id);
      expect(cancelRes.ok).toBe(true);

      // Now User B can book it!
      const bookRes3 = await bookingRepo.createBooking('u-ravi-03', {
        roomId: room.id,
        startsAt: slotStart,
        endsAt: slotEnd,
        purpose: 'Session B (retry)',
      });
      expect(bookRes3.ok).toBe(true);
    }
  });

  it('prevents cross-user cancellation: User B cannot cancel User A booking', async () => {
    const rooms = await roomRepo.listRooms();
    const room = rooms[0];

    const bookRes = await bookingRepo.createBooking('u-meera-04', {
      roomId: room.id,
      startsAt: '2026-11-20T04:30:00Z',
      endsAt: '2026-11-20T05:30:00Z',
      purpose: 'Personal Study',
    });
    expect(bookRes.ok).toBe(true);

    if (bookRes.ok) {
      // User Ravi attempts to cancel Meera's booking
      const cancelRes = await bookingRepo.cancelBooking('u-ravi-03', bookRes.data.id);
      expect(cancelRes.ok).toBe(false);
      if (!cancelRes.ok) {
        expect(cancelRes.error.code).toBe('FORBIDDEN');
      }
    }
  });

  it('enforces atomic team creation and creator as lead', async () => {
    const res = await teamRepo.createTeam(
      'u-meera-04',
      'Robotics Research Group',
      'Autonomous Drone Navigation'
    );

    expect(res.ok).toBe(true);
    if (res.ok) {
      const { team, joinCode } = res.data;
      expect(team.name).toBe('Robotics Research Group');
      expect(joinCode).toHaveLength(6);

      const members = await teamRepo.listMembers(team.id);
      expect(members).toHaveLength(1);
      expect(members[0].user_id).toBe('u-meera-04');
      expect(members[0].role).toBe('lead');
    }
  });

  it('enforces team name uniqueness per creator', async () => {
    const res1 = await teamRepo.createTeam('u-meera-04', 'Machine Learning Lab', 'NLP');
    expect(res1.ok).toBe(true);

    const res2 = await teamRepo.createTeam('u-meera-04', 'Machine Learning Lab', 'CV');
    expect(res2.ok).toBe(false);
    if (!res2.ok) {
      expect(res2.error.code).toBe('CONFLICT');
      expect(res2.error.message).toContain('already have a team named');
    }
  });

  it('prevents non-lead from deleting tasks', async () => {
    const tasksRes = await taskRepo.listTasks('team-survey-01');
    expect(tasksRes.ok).toBe(true);
    if (tasksRes.ok && tasksRes.data.length > 0) {
      const task = tasksRes.data[0];

      // Ravi (member, not lead) tries to delete task
      const delRes = await taskRepo.deleteTask('u-ravi-03', task.id);
      expect(delRes.ok).toBe(false);
      if (!delRes.ok) {
        expect(delRes.error.code).toBe('FORBIDDEN');
      }
    }
  });
});
