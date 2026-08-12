-- Allow signed-in IECES applications to read enrollment and advisory data.
-- Run once in the Supabase project shared with the IECES Portal.

alter table public.students enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "Authenticated dashboard reads students" on public.students;
create policy "Authenticated dashboard reads students"
  on public.students for select
  to authenticated
  using (true);

drop policy if exists "Authenticated dashboard reads profiles" on public.profiles;
create policy "Authenticated dashboard reads profiles"
  on public.profiles for select
  to authenticated
  using (true);
