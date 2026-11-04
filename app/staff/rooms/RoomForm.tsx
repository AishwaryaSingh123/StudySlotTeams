'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { EquipmentType, Room, RoomStatus } from '../../../lib/repo/types';
import { Button } from '../../../components/Button';
import { TextField } from '../../../components/TextField';
import { FormErrorSummary } from '../../../components/FormErrorSummary';
import { useToast } from '../../../components/Toast';

const EQUIPMENT_OPTIONS: { id: EquipmentType; label: string }[] = [
  { id: 'whiteboard', label: 'Whiteboard' },
  { id: 'display_screen', label: 'Display screen' },
  { id: 'power_sockets', label: 'Power sockets' },
  { id: 'video_conferencing', label: 'Video-conferencing' },
  { id: 'accessible_entrance', label: 'Accessible entrance' },
];

export interface RoomFormProps {
  initialRoom?: Room;
  onSave: (data: Omit<Room, 'id'>) => Promise<{ ok: boolean; room?: Room; error?: string }>;
}

export function RoomForm({ initialRoom, onSave }: RoomFormProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [name, setName] = useState(initialRoom?.name || '');
  const [building, setBuilding] = useState(initialRoom?.building || '');
  const [floor, setFloor] = useState<string>(initialRoom?.floor?.toString() || '1');
  const [capacity, setCapacity] = useState<string>(initialRoom?.capacity?.toString() || '6');
  const [opensAt, setOpensAt] = useState(initialRoom?.opens_at?.slice(0, 5) || '08:00');
  const [closesAt, setClosesAt] = useState(initialRoom?.closes_at?.slice(0, 5) || '22:00');
  const [status, setStatus] = useState<RoomStatus>(initialRoom?.status || 'active');
  const [equipment, setEquipment] = useState<EquipmentType[]>(initialRoom?.equipment || []);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ fieldId?: string; message: string }[]>([]);

  const handleEquipmentToggle = (eq: EquipmentType) => {
    setEquipment((prev) => (prev.includes(eq) ? prev.filter((item) => item !== eq) : [...prev, eq]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);

    const errs: { fieldId?: string; message: string }[] = [];

    if (!name.trim()) errs.push({ fieldId: 'room-name', message: 'Room name is required.' });
    if (!building.trim()) errs.push({ fieldId: 'room-building', message: 'Building name is required.' });

    const capNum = parseInt(capacity, 10);
    if (isNaN(capNum) || capNum < 1 || capNum > 30) {
      errs.push({ fieldId: 'room-capacity', message: 'Capacity must be between 1 and 30.' });
    }

    if (opensAt >= closesAt) {
      errs.push({ fieldId: 'room-close', message: 'Closing time must be after opening time.' });
    }

    if (errs.length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);

    try {
      const res = await onSave({
        name: name.trim(),
        building: building.trim(),
        floor: parseInt(floor, 10) || 1,
        capacity: capNum,
        opens_at: `${opensAt}:00`,
        closes_at: `${closesAt}:00`,
        status,
        equipment,
      });

      if (res.ok) {
        showToast({
          type: 'success',
          message: `Room ${name} ${initialRoom ? 'updated' : 'created'} successfully.`,
        });
        router.push('/staff/rooms');
      } else {
        setErrors([{ message: res.error || 'Failed to save room.' }]);
      }
    } catch {
      setErrors([{ message: 'Network error saving room.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      <div style={{ marginBottom: '16px' }}>
        <Link
          href="/staff/rooms"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.95rem',
            color: 'var(--color-stacks-green)',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Back to room list</span>
        </Link>
      </div>

      <h1>{initialRoom ? `Edit ${initialRoom.name}` : 'Add New Room'}</h1>
      <p style={{ color: 'var(--color-slate)', marginBottom: '24px' }}>
        Configure room specifications, seating capacity, and standard operating schedules.
      </p>

      {errors.length > 0 && <FormErrorSummary errors={errors} />}

      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-rule)',
          borderRadius: 'var(--radius-md)',
          padding: '28px',
        }}
      >
        <form onSubmit={handleSubmit} noValidate>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-slate)', marginBottom: '16px' }}>
            Fields marked <span style={{ color: 'var(--color-error-text)' }}>*</span> are required.
          </p>

          <TextField
            id="room-name"
            label="Room name"
            required
            maxLength={60}
            placeholder="e.g. Room 2.04"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
            <TextField
              id="room-building"
              label="Building"
              required
              maxLength={60}
              placeholder="e.g. Library"
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
            />

            <TextField
              id="room-floor"
              label="Floor level"
              type="number"
              min={0}
              max={10}
              required
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
            />
          </div>

          <TextField
            id="room-capacity"
            label="Capacity (1–30 seats)"
            type="number"
            min={1}
            max={30}
            required
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <TextField
              id="room-open"
              label="Opening time"
              type="time"
              required
              value={opensAt}
              onChange={(e) => setOpensAt(e.target.value)}
            />

            <TextField
              id="room-close"
              label="Closing time"
              type="time"
              required
              value={closesAt}
              onChange={(e) => setClosesAt(e.target.value)}
            />
          </div>

          <fieldset
            style={{
              border: '1px solid var(--color-control-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '16px',
              marginBottom: '20px',
            }}
          >
            <legend style={{ fontWeight: 700, padding: '0 4px', fontSize: '0.95rem' }}>
              Equipment available in this room
            </legend>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
              {EQUIPMENT_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={equipment.includes(opt.id)}
                    onChange={() => handleEquipmentToggle(opt.id)}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset
            style={{
              border: '1px solid var(--color-control-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 16px',
              marginBottom: '24px',
            }}
          >
            <legend style={{ fontWeight: 700, padding: '0 4px', fontSize: '0.95rem' }}>
              Operational Status
            </legend>
            <div style={{ display: 'flex', gap: '24px', marginTop: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="status"
                  value="active"
                  checked={status === 'active'}
                  onChange={() => setStatus('active')}
                  style={{ width: '18px', height: '18px' }}
                />
                <span>Active (Available for booking)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="status"
                  value="inactive"
                  checked={status === 'inactive'}
                  onChange={() => setStatus('inactive')}
                  style={{ width: '18px', height: '18px' }}
                />
                <span>Inactive (Maintenance / Unavailable)</span>
              </label>
            </div>
          </fieldset>

          <div style={{ display: 'flex', gap: '16px' }}>
            <Button type="submit" variant="primary" loading={loading} loadingText="Saving room…">
              {initialRoom ? 'Save changes' : 'Add room'}
            </Button>
            <Link href="/staff/rooms" style={{ textDecoration: 'none' }}>
              <Button variant="secondary">Cancel</Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
