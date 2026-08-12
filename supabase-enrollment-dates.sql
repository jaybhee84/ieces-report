-- IECES enrollment date tracking
-- Run once in the same Supabase project used by the IECES Portal.

-- Keep existing rows null because their true enrollment dates are unknown.
alter table public.students
  add column if not exists created_at timestamptz;

-- Every new portal submission receives its database insertion time.
alter table public.students
  alter column created_at set default now();

comment on column public.students.created_at is
  'Time the learner enrollment record was submitted; existing legacy rows may be null.';
