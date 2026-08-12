-- IECES news approval workflow
-- Run once in the Supabase SQL Editor for the shared news project.

alter table public.news_articles
  add column if not exists status text;

-- Keep articles that were already live visible after enabling approval.
update public.news_articles
set status = 'approved'
where status is null;

alter table public.news_articles
  alter column status set default 'pending',
  alter column status set not null;

alter table public.news_articles
  drop constraint if exists news_articles_status_check;

alter table public.news_articles
  add constraint news_articles_status_check
  check (status in ('pending', 'approved', 'rejected'));

-- Replace unrestricted public reading with role-specific access.
drop policy if exists "Public read" on public.news_articles;
drop policy if exists "Approved articles are public" on public.news_articles;
drop policy if exists "Authenticated users read all articles" on public.news_articles;

create policy "Approved articles are public"
  on public.news_articles for select
  to anon
  using (status = 'approved');

create policy "Authenticated users read all articles"
  on public.news_articles for select
  to authenticated
  using (true);

-- Existing authenticated insert/update policies continue to apply.
-- Because the Media Manager does not provide status on insert, new rows
-- automatically enter the pending queue.
