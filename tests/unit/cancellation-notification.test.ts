import { describe, it, expect } from 'vitest';
import { MockBookingRepo } from '../../lib/repo/mock/bookings';
import { MockRulesRepo } from '../../lib/repo/mock/rules';
import { getDb, withLock } from '../../lib/repo/mock/store';

describe('Cancellation Notifications for Affected Students', () => {
  it('identifies unacknowledged cancellations specifically for the affected student', async () => {
    const bookingRepo = new MockBookingRepo();
    const rulesRepo = new MockRulesRepo();

    // Setup: Create a booking for Asha on 2026-11-20
    const db = await getDb();
    const testBookingId = 'test-cancellation-booking-1';

    await withLock((store) => {
      // Remove any leftover test booking
      store.bookings = store.bookings.filter((b) => b.id !== testBookingId);

      store.bookings.push({
        id: testBookingId,
        room_id: 'r-lib-204',
        booked_by: 'u-asha-02',
        team_id: null,
        starts_at: '2026-11-20T08:30:00Z',
        ends_at: '2026-11-20T09:30:00Z',
        purpose: 'Unit test booking',
        status: 'confirmed',
        created_at: new Date().toISOString(),
        cancelled_at: null,
      });

      // Also ensure a blackout date exists for 2026-11-20
      store.blackouts.push({
        id: 'test-blk-20',
        room_id: null,
        start_date: '2026-11-20',
        end_date: '2026-11-20',
        reason: 'Campus Power Maintenance',
      });
    });

    // Before cancellation: Asha has no unacknowledged cancellations
    let ashaCancellations = await bookingRepo.getUnacknowledgedCancellations('u-asha-02');
    const existingCount = ashaCancellations.filter((b) => b.id === testBookingId).length;
    expect(existingCount).toBe(0);

    // Staff cancels bookings affected by blackout
    const cancelRes = await rulesRepo.cancelBlackoutBookings!(
      'u-staff-01', // staff admin
      'test-blk-20',
      'Campus Power Maintenance'
    );

    expect(cancelRes.ok).toBe(true);

    // Asha now has the unacknowledged cancellation
    ashaCancellations = await bookingRepo.getUnacknowledgedCancellations('u-asha-02');
    const cancelledBooking = ashaCancellations.find((b) => b.id === testBookingId);
    expect(cancelledBooking).toBeDefined();
    expect(cancelledBooking?.cancellation_reason).toContain('Blackout date');
    expect(cancelledBooking?.room?.name).toBeDefined();

    // Another student (e.g. Meera) does NOT see Asha's cancellation
    const meeraCancellations = await bookingRepo.getUnacknowledgedCancellations('u-meera-04');
    expect(meeraCancellations.some((b) => b.id === testBookingId)).toBe(false);

    // When Asha acknowledges the notice, it is cleared
    const ackRes = await bookingRepo.dismissCancellationNotice('u-asha-02', testBookingId);
    expect(ackRes.ok).toBe(true);

    const postAck = await bookingRepo.getUnacknowledgedCancellations('u-asha-02');
    expect(postAck.some((b) => b.id === testBookingId)).toBe(false);

    // Clean up
    await withLock((store) => {
      store.bookings = store.bookings.filter((b) => b.id !== testBookingId);
      store.blackouts = store.blackouts.filter((b) => b.id !== 'test-blk-20');
    });
  });
});
