-- Musio — comptes et profils
-- Chaque compte Supabase (e-mail + mot de passe) a un profil public.
-- Le rôle « creator » ne peut être donné que par un autre créateur (fonction set_creator).

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 30),
  handle      text not null unique check (handle ~ '^[a-z0-9._]{2,24}$'),
  bio         text not null default '' check (char_length(bio) <= 140),
  color       text not null default '#FF5C8A' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  genres      text[] not null default '{}',
  role        text not null default 'user' check (role in ('user', 'creator')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Lecture : les membres connectés voient les profils
drop policy if exists "profils lisibles par les membres" on public.profiles;
create policy "profils lisibles par les membres" on public.profiles
  for select to authenticated using (true);

-- Création : uniquement son propre profil
drop policy if exists "chacun cree son profil" on public.profiles;
create policy "chacun cree son profil" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));

-- Modification : uniquement son propre profil
drop policy if exists "chacun modifie son profil" on public.profiles;
create policy "chacun modifie son profil" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Le rôle ne peut jamais être écrit directement depuis l'appli : seules ces colonnes le sont
revoke insert, update on public.profiles from anon, authenticated;
grant insert (id, name, handle, bio, color, genres) on public.profiles to authenticated;
grant update (name, handle, bio, color, genres) on public.profiles to authenticated;

-- updated_at automatique
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Nom d'utilisateur libre ? (utilisable avant d'avoir un profil)
create or replace function public.handle_available(h text) returns boolean
language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.profiles where handle = lower(h));
$$;
revoke all on function public.handle_available(text) from public, anon;
grant execute on function public.handle_available(text) to authenticated;

-- Donner ou retirer le rôle créateur (réservé aux créateurs)
create or replace function public.set_creator(target_handle text, make boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me_role text;
  target uuid;
  creators int;
begin
  select role into me_role from public.profiles where id = auth.uid();
  if me_role is distinct from 'creator' then
    raise exception 'Réservé aux créateurs de Musio' using errcode = '42501';
  end if;
  select id into target from public.profiles where handle = lower(ltrim(target_handle, '@'));
  if target is null then
    raise exception 'Aucun compte avec ce nom d’utilisateur' using errcode = 'P0002';
  end if;
  if not make then
    select count(*) into creators from public.profiles where role = 'creator';
    if creators <= 1 then
      raise exception 'Il doit rester au moins un créateur' using errcode = '23514';
    end if;
  end if;
  update public.profiles set role = case when make then 'creator' else 'user' end where id = target;
end $$;
revoke all on function public.set_creator(text, boolean) from public, anon;
grant execute on function public.set_creator(text, boolean) to authenticated;

-- Supprimer son propre compte (exigé par l'App Store) : efface l'utilisateur et, en cascade, son profil
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  creators int;
begin
  if me is null then raise exception 'Non connecté' using errcode = '42501'; end if;
  if exists (select 1 from public.profiles where id = me and role = 'creator') then
    select count(*) into creators from public.profiles where role = 'creator';
    if creators <= 1 then
      raise exception 'Tu es le seul créateur : donne d’abord le rôle à quelqu’un d’autre' using errcode = '23514';
    end if;
  end if;
  delete from auth.users where id = me;
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
