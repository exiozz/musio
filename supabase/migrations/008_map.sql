-- Musio — Map en ligne : position arrondie (~100 m) et son en cours
-- Une position n'est visible que par les personnes que son auteur suit.
-- Mode fantôme = la ligne est supprimée.

create table if not exists public.presence (
  user_id      uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  lat          double precision not null check (lat between -90 and 90),
  lng          double precision not null check (lng between -180 and 180),
  track_id     text check (track_id is null or char_length(track_id) <= 60),
  track_title  text check (track_title is null or char_length(track_title) <= 80),
  track_artist text check (track_artist is null or char_length(track_artist) <= 60),
  track_color  text check (track_color is null or track_color ~ '^#[0-9A-Fa-f]{6}$'),
  playing      boolean not null default false,
  updated_at   timestamptz not null default now()
);

-- position toujours arrondie côté serveur, horodatage imposé
create or replace function public.presence_before_write() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.user_id := auth.uid();
  new.lat := round(new.lat::numeric, 3);
  new.lng := round(new.lng::numeric, 3);
  new.updated_at := now();
  return new;
end $$;
revoke all on function public.presence_before_write() from public, anon, authenticated;
drop trigger if exists presence_bw on public.presence;
create trigger presence_bw before insert or update on public.presence
  for each row execute function public.presence_before_write();

alter table public.presence enable row level security;

drop policy if exists "voir sa position et celles de qui me suit" on public.presence;
create policy "voir sa position et celles de qui me suit" on public.presence
  for select to authenticated using (
    user_id = (select auth.uid())
    or exists (select 1 from public.follows f where f.follower_id = presence.user_id and f.followee_id = (select auth.uid()))
  );
drop policy if exists "publier sa position" on public.presence;
create policy "publier sa position" on public.presence
  for insert to authenticated with check (user_id = (select auth.uid()) and not (select public.is_banned()));
drop policy if exists "mettre a jour sa position" on public.presence;
create policy "mettre a jour sa position" on public.presence
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "retirer sa position" on public.presence;
create policy "retirer sa position" on public.presence
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.presence from anon;
grant select, insert, update, delete on public.presence to authenticated;
