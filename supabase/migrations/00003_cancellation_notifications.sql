-- StudySlot Teams — Cancellation Notifications Schema
-- Migration: 00003_cancellation_notifications.sql

alter table public.bookings 
  add column if not exists cancellation_reason text,
  add column if not exists cancellation_notified boolean not null default false;

-- Allow users to update their own booking notification status
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
      and tablename = 'bookings' 
      and policyname = 'bookings_update_notified'
  ) then
    create policy bookings_update_notified on public.bookings
      for update
      using (created_by = auth.uid())
      with check (created_by = auth.uid());
  end if;
end $$;
