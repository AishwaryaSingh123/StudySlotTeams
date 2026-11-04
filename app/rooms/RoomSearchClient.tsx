'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Filter, RotateCcw } from 'lucide-react';
import { EquipmentType, RoomSearchResult } from '../../lib/repo/types';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { Select } from '../../components/Select';
import { DataTable, Column } from '../../components/DataTable';
import { FormErrorSummary } from '../../components/FormErrorSummary';

const EQUIPMENT_OPTIONS: { id: EquipmentType; label: string }[] = [
  { id: 'whiteboard', label: 'Whiteboard' },
  { id: 'display_screen', label: 'Display screen' },
  { id: 'power_sockets', label: 'Power sockets' },
  { id: 'video_conferencing', label: 'Video-conferencing' },
  { id: 'accessible_entrance', label: 'Accessible entrance' },
];

export interface RoomSearchClientProps {
  initialRooms: RoomSearchResult[];
  initialParams: {
    date: string;
    startTime: string;
    endTime: string;
    minCapacity?: number;
    equipment?: EquipmentType[];
    building?: string;
  };
  buildings: string[];
}

export function RoomSearchClient({
  initialRooms,
  initialParams,
  buildings,
}: RoomSearchClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [date, setDate] = useState(initialParams.date);
  const [startTime, setStartTime] = useState(initialParams.startTime);
  const [endTime, setEndTime] = useState(initialParams.endTime);
  const [minCapacity, setMinCapacity] = useState<string>(initialParams.minCapacity?.toString() || '');
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentType[]>(initialParams.equipment || []);
  const [building, setBuilding] = useState<string>(initialParams.building || '');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [searchErrors, setSearchErrors] = useState<{ fieldId?: string; message: string }[]>([]);

  // Sorting
  const [sortBy, setSortBy] = useState<'capacity' | 'name' | 'availability'>('availability');
  const [sortOrder, setSortOrder] = useState<'ascending' | 'descending'>('ascending');

  const handleEquipmentToggle = (eq: EquipmentType) => {
    setSelectedEquipment((prev) =>
      prev.includes(eq) ? prev.filter((item) => item !== eq) : [...prev, eq]
    );
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchErrors([]);

    const errors: { fieldId?: string; message: string }[] = [];
    if (!date) {
      errors.push({ fieldId: 'filter-date', message: 'Date is required.' });
    }
    if (!startTime) {
      errors.push({ fieldId: 'filter-start', message: 'Start time is required.' });
    }
    if (!endTime) {
      errors.push({ fieldId: 'filter-end', message: 'End time is required.' });
    }
    if (startTime && endTime && startTime >= endTime) {
      errors.push({ fieldId: 'filter-end', message: 'End time must be after start time.' });
    }
    if (minCapacity) {
      const cap = parseInt(minCapacity, 10);
      if (isNaN(cap) || cap < 1) {
        errors.push({ fieldId: 'filter-capacity', message: 'Minimum capacity must be at least 1 person.' });
      } else if (cap > 50) {
        errors.push({ fieldId: 'filter-capacity', message: 'Minimum capacity cannot exceed 50 people.' });
      }
    }

    if (errors.length > 0) {
      setSearchErrors(errors);
      return;
    }

    startTransition(() => {
      const q = new URLSearchParams();
      if (date) q.set('date', date);
      if (startTime) q.set('startTime', startTime);
      if (endTime) q.set('endTime', endTime);
      if (minCapacity) q.set('minCapacity', minCapacity);
      if (building) q.set('building', building);
      if (selectedEquipment.length > 0) q.set('equipment', selectedEquipment.join(','));

      router.push(`/rooms?${q.toString()}`);
    });
  };

  const handleClearFilters = () => {
    setSearchErrors([]);
    setDate('2026-11-12');
    setStartTime('14:00');
    setEndTime('15:00');
    setMinCapacity('');
    setSelectedEquipment([]);
    setBuilding('');

    router.push('/rooms?date=2026-11-12&startTime=14:00&endTime=15:00');
  };

  // Sort rooms
  const sortedRooms = [...initialRooms].sort((a, b) => {
    if (sortBy === 'capacity') {
      const diff = a.capacity - b.capacity;
      return sortOrder === 'ascending' ? diff : -diff;
    }
    if (sortBy === 'name') {
      const diff = a.name.localeCompare(b.name);
      return sortOrder === 'ascending' ? diff : -diff;
    }
    // availability: free first
    const rank = (r: RoomSearchResult) => (r.availability === 'free' ? 0 : r.availability === 'booked' ? 1 : 2);
    const diff = rank(a) - rank(b);
    return sortOrder === 'ascending' ? diff : -diff;
  });

  const columns: Column<RoomSearchResult>[] = [
    {
      key: 'name',
      header: 'Room',
      sortable: true,
      render: (r) => (
        <div>
          <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-ink)' }}>
            {r.name}
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--color-slate)' }}>
            {r.building}, Floor {r.floor}
          </div>
        </div>
      ),
    },
    {
      key: 'capacity',
      header: 'Capacity',
      sortable: true,
      render: (r) => <span className="tabular-nums">{r.capacity} seats</span>,
    },
    {
      key: 'equipment',
      header: 'Equipment',
      render: (r) => (
        <span style={{ fontSize: '0.95rem' }}>
          {r.equipment.map((eq) => eq.replace(/_/g, ' ')).join(', ') || 'Standard room'}
        </span>
      ),
    },
    {
      key: 'availability',
      header: 'Availability for your time',
      sortable: true,
      render: (r) => {
        if (r.availability === 'free') {
          return (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-success-bg)',
                color: 'var(--color-success-text)',
                fontWeight: 700,
              }}
            >
              Free
            </span>
          );
        }
        if (r.availability === 'booked') {
          return (
            <div>
              <span
                className="hatch-booked"
                style={{
                  display: 'inline-block',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 700,
                  color: 'var(--color-slate)',
                  border: '1px solid var(--color-rule)',
                }}
              >
                Booked
              </span>
              {r.nextFreeSlot && (
                <div style={{ fontSize: '0.85rem', color: 'var(--color-slate)', marginTop: '4px' }}>
                  Next free: <span className="tabular-nums">{r.nextFreeSlot.start}–{r.nextFreeSlot.end}</span>
                </div>
              )}
            </div>
          );
        }
        return (
          <span
            className="hatch-blocked"
            style={{
              display: 'inline-block',
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              color: 'var(--color-warning-text)',
              border: '1px solid var(--color-rule)',
            }}
          >
            {r.blockedReason || 'Unavailable'}
          </span>
        );
      },
    },
    {
      key: 'action',
      header: 'Action',
      render: (r) => (
        <Link
          href={`/rooms/${r.id}?date=${date}&startTime=${startTime}&endTime=${endTime}`}
          style={{ textDecoration: 'none' }}
        >
          <Button variant={r.availability === 'free' ? 'primary' : 'secondary'}>
            View and book
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1>Find a study room</h1>
        <p style={{ color: 'var(--color-slate)', fontSize: '1rem' }}>
          Filter active study rooms by date, time, capacity, and equipment. Times use campus time (Asia/Kolkata).
        </p>
      </div>

      {/* Mobile filter toggle */}
      <div style={{ display: 'none' }} className="mobile-filter-bar">
        <Button
          variant="secondary"
          onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
          aria-expanded={mobileFilterOpen}
        >
          <Filter size={18} aria-hidden="true" />
          <span>Filters ({selectedEquipment.length + (minCapacity ? 1 : 0) + (building ? 1 : 0)} active)</span>
        </Button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '320px 1fr',
          gap: '32px',
          alignItems: 'start',
        }}
        className="rooms-grid-layout"
      >
        {/* Filter Panel (Left) */}
        <aside
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-rule)',
            borderRadius: 'var(--radius-md)',
            padding: '24px 20px',
          }}
          className={mobileFilterOpen ? 'filter-panel-open' : 'filter-panel'}
        >
          <form role="search" onSubmit={handleSearch} noValidate>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Filter Rooms</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-slate)', marginBottom: '16px' }}>
              Fields marked <span style={{ color: 'var(--color-error-text)' }}>*</span> are required.
            </p>

            <FormErrorSummary errors={searchErrors} />

            <TextField
              id="filter-date"
              label="Date"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <TextField
                id="filter-start"
                label="Start time"
                type="time"
                step={1800}
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
              <TextField
                id="filter-end"
                label="End time"
                type="time"
                step={1800}
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>

            <TextField
              id="filter-capacity"
              label="Minimum capacity"
              type="number"
              min={1}
              max={30}
              placeholder="e.g. 6"
              value={minCapacity}
              onChange={(e) => setMinCapacity(e.target.value)}
            />

            <Select
              id="filter-building"
              label="Building"
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
              options={[
                { value: '', label: 'All campus buildings' },
                ...buildings.map((b) => ({ value: b, label: b })),
              ]}
            />

            {/* Equipment Fieldset */}
            <fieldset
              style={{
                border: '1px solid var(--color-control-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 14px',
                marginBottom: '20px',
              }}
            >
              <legend style={{ fontWeight: 700, padding: '0 4px', fontSize: '0.95rem' }}>
                Required equipment
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
                      minHeight: '28px',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedEquipment.includes(opt.id)}
                      onChange={() => handleEquipmentToggle(opt.id)}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Button type="submit" variant="primary" loading={isPending} loadingText="Searching…">
                Apply filters
              </Button>
              <Button type="button" variant="secondary" onClick={handleClearFilters}>
                <RotateCcw size={16} aria-hidden="true" />
                <span>Clear filters</span>
              </Button>
            </div>
          </form>
        </aside>

        {/* Results Panel (Right) */}
        <section aria-labelledby="results-heading" style={{ minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div aria-live="polite" id="results-heading">
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>
                {initialRooms.length} {initialRooms.length === 1 ? 'room matches' : 'rooms match'} your criteria
              </h2>
            </div>

            {/* Sort control */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="sort-select" style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                Sort by:
              </label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'capacity' | 'name' | 'availability')}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-control-border)',
                  background: 'var(--color-surface)',
                  fontSize: '0.95rem',
                }}
              >
                <option value="availability">Availability (Free first)</option>
                <option value="capacity">Capacity (Seats)</option>
                <option value="name">Room Name</option>
              </select>
            </div>
          </div>

          <DataTable
            caption={`Study room search results for ${date}, ${startTime}–${endTime}`}
            columns={columns}
            data={sortedRooms}
            keyExtractor={(r) => r.id}
            sortColumn={sortBy}
            sortDirection={sortOrder}
            onSort={(col) => {
              if (sortBy === col) {
                setSortOrder((prev) => (prev === 'ascending' ? 'descending' : 'ascending'));
              } else {
                setSortBy(col as 'capacity' | 'name' | 'availability');
                setSortOrder('ascending');
              }
            }}
            emptyMessage={`No rooms match these filters for ${date}, ${startTime}–${endTime}. Try a shorter time, a smaller capacity, or remove an equipment filter.`}
          />
        </section>
      </div>
    </div>
  );
}
