-- Musio — communautés : création, membres, messages
-- Tout membre connecté peut créer une communauté (10 maximum par personne),
-- la rejoindre, la quitter et y écrire. Le fondateur et les créateurs de Musio modèrent.

create table if not exists public.communities (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(btrim(name)) between 2 and 40),
  description   text not null default '' check (char_length(description) <= 200),
  color         text not null default '#7C5CFF' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  shape         text not null default 'disc' check (shape in ('disc', 'ring', 'dome', 'pill', 'diamond', 'stripes')),
  owner_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  members_count integer not null default 0,
  created_at    timestamptz not null default now()
);
create unique index if not exists communities_name_key on public.communities (lower(btrim(name)));
create index if not exists communities_members_idx on public.communities (members_count desc);

create table if not exists public.community_members (
  community_id uuid not null references public.communities (id) on delete cascade,
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  role         text not null default 'member' check (role in ('owner', 'member')),
  joined_at    timestamptz not null default now(),
  primary key (community_id, user_id)
);
create index if not exists community_members_user_idx on public.community_members (user_id);

create table if not exists public.community_posts (
  id           uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities (id) on delete cascade,
  author_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  text         text not null default '' check (char_length(text) <= 1000),
  track        text check (track is null or char_length(track) <= 40),
  created_at   timestamptz not null default now(),
  check (btrim(text) <> '' or track is not null)
);
create index if not exists community_posts_feed_idx on public.community_posts (community_id, created_at desc);
create index if not exists community_posts_author_idx on public.community_posts (author_id);

-- outils
create or replace function public.is_musio_creator() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'creator');
$$;
create or replace function public.is_community_member(c uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.community_members where community_id = c and user_id = auth.uid());
$$;
create or replace function public.is_community_owner(c uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.communities where id = c and owner_id = auth.uid());
$$;
revoke all on function public.is_musio_creator() from public, anon;
revoke all on function public.is_community_member(uuid) from public, anon;
revoke all on function public.is_community_owner(uuid) from public, anon;
grant execute on function public.is_musio_creator() to authenticated;
grant execute on function public.is_community_member(uuid) to authenticated;
grant execute on function public.is_community_owner(uuid) to authenticated;

-- à la création : limite de 10 par personne, puis le fondateur devient membre « owner »
create or replace function public.communities_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.owner_id := auth.uid();
  new.members_count := 0;
  new.name := btrim(new.name);
  if (select count(*) from public.communities where owner_id = new.owner_id) >= 10 then
    raise exception 'Tu as déjà créé 10 communautés' using errcode = '23514';
  end if;
  return new;
end $$;
create or replace function public.communities_after_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.community_members (community_id, user_id, role) values (new.id, new.owner_id, 'owner');
  return null;
end $$;
drop trigger if exists communities_bi on public.communities;
create trigger communities_bi before insert on public.communities for each row execute function public.communities_before_insert();
drop trigger if exists communities_ai on public.communities;
create trigger communities_ai after insert on public.communities for each row execute function public.communities_after_insert();

-- nombre de membres tenu à jour
create or replace function public.community_members_count() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    update public.communities set members_count = members_count + 1 where id = new.community_id;
  elsif tg_op = 'DELETE' then
    update public.communities set members_count = greatest(members_count - 1, 0) where id = old.community_id;
  end if;
  return null;
end $$;
drop trigger if exists community_members_count on public.community_members;
create trigger community_members_count after insert or delete on public.community_members for each row execute function public.community_members_count();

-- sécurité
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.community_posts enable row level security;

drop policy if exists "communautes visibles" on public.communities;
create policy "communautes visibles" on public.communities for select to authenticated using (true);
drop policy if exists "creer une communaute" on public.communities;
create policy "creer une communaute" on public.communities for insert to authenticated with check (true);
drop policy if exists "modifier sa communaute" on public.communities;
create policy "modifier sa communaute" on public.communities for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists "supprimer une communaute" on public.communities;
create policy "supprimer une communaute" on public.communities for delete to authenticated
  using (owner_id = (select auth.uid()) or (select public.is_musio_creator()));

drop policy if exists "membres visibles" on public.community_members;
create policy "membres visibles" on public.community_members for select to authenticated using (true);
drop policy if exists "rejoindre" on public.community_members;
create policy "rejoindre" on public.community_members for insert to authenticated
  with check (user_id = (select auth.uid()) and role = 'member');
drop policy if exists "quitter ou retirer" on public.community_members;
create policy "quitter ou retirer" on public.community_members for delete to authenticated
  using ((user_id = (select auth.uid()) and role <> 'owner') or (role <> 'owner' and (select public.is_community_owner(community_id))));

drop policy if exists "messages visibles" on public.community_posts;
create policy "messages visibles" on public.community_posts for select to authenticated using (true);
drop policy if exists "ecrire si membre" on public.community_posts;
create policy "ecrire si membre" on public.community_posts for insert to authenticated
  with check (author_id = (select auth.uid()) and (select public.is_community_member(community_id)));
drop policy if exists "supprimer un message" on public.community_posts;
create policy "supprimer un message" on public.community_posts for delete to authenticated
  using (author_id = (select auth.uid()) or (select public.is_community_owner(community_id)) or (select public.is_musio_creator()));

-- colonnes modifiables depuis l'appli
revoke insert, update on public.communities from anon, authenticated;
grant insert (name, description, color, shape) on public.communities to authenticated;
grant update (name, description, color, shape) on public.communities to authenticated;
revoke insert, update on public.community_members from anon, authenticated;
grant insert (community_id, user_id, role) on public.community_members to authenticated;
revoke insert, update on public.community_posts from anon, authenticated;
grant insert (community_id, text, track) on public.community_posts to authenticated;

-- messages en direct
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'community_posts') then
    alter publication supabase_realtime add table public.community_posts;
  end if;
end $$;
