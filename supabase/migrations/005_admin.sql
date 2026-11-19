-- Musio — panel admin : suspensions, signalements, boosts, statistiques
-- Tout ce qui est « admin » est réservé aux comptes qui ont le rôle creator.

-- ---------- suspension de comptes ----------
alter table public.profiles add column if not exists banned_until timestamptz;

create or replace function public.is_banned() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select banned_until > now() from public.profiles where id = auth.uid()), false);
$$;
revoke all on function public.is_banned() from public, anon;
grant execute on function public.is_banned() to authenticated;

-- un compte suspendu ne peut plus créer, rejoindre, écrire ni publier
drop policy if exists "creer une communaute" on public.communities;
create policy "creer une communaute" on public.communities for insert to authenticated
  with check (not (select public.is_banned()));
drop policy if exists "rejoindre" on public.community_members;
create policy "rejoindre" on public.community_members for insert to authenticated
  with check (user_id = (select auth.uid()) and role = 'member' and not (select public.is_banned()));
drop policy if exists "ecrire si membre" on public.community_posts;
create policy "ecrire si membre" on public.community_posts for insert to authenticated
  with check (author_id = (select auth.uid()) and (select public.is_community_member(community_id)) and not (select public.is_banned()));
drop policy if exists "publier un son" on public.tracks;
create policy "publier un son" on public.tracks for insert to authenticated
  with check (owner_id = (select auth.uid()) and not (select public.is_banned()));

create or replace function public.admin_ban(target_handle text, days integer) returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare target public.profiles%rowtype; until timestamptz;
begin
  if not public.is_musio_creator() then raise exception 'Réservé aux créateurs de Musio' using errcode = '42501'; end if;
  select * into target from public.profiles where handle = lower(ltrim(target_handle, '@'));
  if target.id is null then raise exception 'Aucun compte avec ce nom d’utilisateur' using errcode = 'P0002'; end if;
  if target.role = 'creator' then raise exception 'Impossible de suspendre un créateur de Musio' using errcode = '42501'; end if;
  until := case when days is null or days <= 0 then null else now() + make_interval(days => least(days, 36500)) end;
  update public.profiles set banned_until = until where id = target.id;
  return until;
end $$;
revoke all on function public.admin_ban(text, integer) from public, anon;
grant execute on function public.admin_ban(text, integer) to authenticated;

-- ---------- signalements ----------
create table if not exists public.reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  target_type  text not null check (target_type in ('user', 'post', 'conv', 'comm', 'cpost', 'track')),
  target_id    text not null check (char_length(target_id) <= 80),
  target_label text not null default '' check (char_length(target_label) <= 120),
  reason       text not null check (char_length(reason) <= 40),
  status       text not null default 'open' check (status in ('open', 'done', 'dismissed')),
  handled_by   uuid references public.profiles (id) on delete set null,
  handled_at   timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists reports_open_idx on public.reports (status, created_at desc);

create or replace function public.reports_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.reporter_id := auth.uid(); new.status := 'open'; new.handled_by := null; new.handled_at := null;
  if (select count(*) from public.reports where reporter_id = new.reporter_id and created_at > now() - interval '1 day') >= 30 then
    raise exception 'Trop de signalements aujourd’hui' using errcode = '23514';
  end if;
  return new;
end $$;
create or replace function public.reports_before_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin new.handled_by := auth.uid(); new.handled_at := now(); return new; end $$;
drop trigger if exists reports_bi on public.reports;
create trigger reports_bi before insert on public.reports for each row execute function public.reports_before_insert();
drop trigger if exists reports_bu on public.reports;
create trigger reports_bu before update on public.reports for each row execute function public.reports_before_update();
revoke all on function public.reports_before_insert() from public, anon, authenticated;
revoke all on function public.reports_before_update() from public, anon, authenticated;

alter table public.reports enable row level security;
drop policy if exists "signaler" on public.reports;
create policy "signaler" on public.reports for insert to authenticated with check (reporter_id = (select auth.uid()));
drop policy if exists "admins lisent les signalements" on public.reports;
create policy "admins lisent les signalements" on public.reports for select to authenticated using ((select public.is_musio_creator()));
drop policy if exists "admins traitent les signalements" on public.reports;
create policy "admins traitent les signalements" on public.reports for update to authenticated
  using ((select public.is_musio_creator())) with check ((select public.is_musio_creator()));
revoke insert, update, delete on public.reports from anon, authenticated;
grant insert (target_type, target_id, target_label, reason) on public.reports to authenticated;
grant update (status) on public.reports to authenticated;

-- ---------- boosts (mise en avant pendant une durée choisie) ----------
create table if not exists public.boosts (
  id          uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('track', 'community', 'post')),
  target_id   uuid not null,
  label       text not null default '' check (char_length(label) <= 120),
  starts_at   timestamptz not null default now(),
  ends_at     timestamptz not null,
  created_by  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  check (ends_at > starts_at and ends_at <= starts_at + interval '90 days')
);
create index if not exists boosts_active_idx on public.boosts (ends_at desc);

alter table public.boosts enable row level security;
drop policy if exists "boosts visibles" on public.boosts;
create policy "boosts visibles" on public.boosts for select to authenticated using (true);
drop policy if exists "admins creent des boosts" on public.boosts;
create policy "admins creent des boosts" on public.boosts for insert to authenticated
  with check ((select public.is_musio_creator()) and created_by = (select auth.uid()));
drop policy if exists "admins arretent des boosts" on public.boosts;
create policy "admins arretent des boosts" on public.boosts for delete to authenticated using ((select public.is_musio_creator()));
revoke insert, update on public.boosts from anon, authenticated;
grant insert (target_type, target_id, label, starts_at, ends_at) on public.boosts to authenticated;

-- ---------- statistiques ----------
create or replace function public.admin_stats() returns json
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_musio_creator() then raise exception 'Réservé aux créateurs de Musio' using errcode = '42501'; end if;
  return json_build_object(
    'users', (select count(*) from public.profiles),
    'users_7d', (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'users_24h', (select count(*) from public.profiles where created_at > now() - interval '1 day'),
    'creators', (select count(*) from public.profiles where role = 'creator'),
    'banned', (select count(*) from public.profiles where banned_until > now()),
    'communities', (select count(*) from public.communities),
    'messages', (select count(*) from public.community_posts),
    'messages_24h', (select count(*) from public.community_posts where created_at > now() - interval '1 day'),
    'tracks', (select count(*) from public.tracks),
    'reports_open', (select count(*) from public.reports where status = 'open'),
    'boosts_active', (select count(*) from public.boosts where ends_at > now() and starts_at <= now()),
    'storage_mb', (select round(coalesce(sum((metadata->>'size')::bigint), 0) / 1048576.0, 1) from storage.objects where bucket_id in ('sounds', 'covers'))
  );
end $$;
revoke all on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;
