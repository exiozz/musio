-- Musio — abonnements en ligne
-- Qui suit qui : visible par les membres connectés, chacun ne gère que ses propres abonnements.

create table if not exists public.follows (
  follower_id  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  followee_id  uuid not null references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index if not exists follows_followee_idx on public.follows (followee_id);

alter table public.follows enable row level security;

drop policy if exists "abonnements lisibles par les membres" on public.follows;
create policy "abonnements lisibles par les membres" on public.follows
  for select to authenticated using (true);

drop policy if exists "chacun s'abonne" on public.follows;
create policy "chacun s'abonne" on public.follows
  for insert to authenticated with check (follower_id = (select auth.uid()) and not public.is_banned());

drop policy if exists "chacun se desabonne" on public.follows;
create policy "chacun se desabonne" on public.follows
  for delete to authenticated using (follower_id = (select auth.uid()));

revoke all on public.follows from anon;
grant select, insert, delete on public.follows to authenticated;
