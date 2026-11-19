-- Musio — sons publiés en ligne
-- Un membre publie un son (fichier audio + pochette) : tout le monde peut l'écouter dans l'appli.
-- Fichiers dans Supabase Storage : sounds/<id du compte>/… et covers/<id du compte>/…

create table if not exists public.tracks (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title       text not null check (char_length(btrim(title)) between 1 and 60),
  artist      text not null check (char_length(btrim(artist)) between 1 and 40),
  genre       text not null default 'Import' check (char_length(genre) <= 24),
  duration    integer not null check (duration between 1 and 1800),
  audio_path  text not null check (char_length(audio_path) <= 200),
  cover_path  text check (cover_path is null or char_length(cover_path) <= 200),
  color       text not null default '#7C5CFF' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  rights_ok   boolean not null check (rights_ok),          -- l'auteur certifie avoir les droits
  created_at  timestamptz not null default now()
);
create index if not exists tracks_recent_idx on public.tracks (created_at desc);
create index if not exists tracks_owner_idx on public.tracks (owner_id);

-- le chemin du fichier doit être dans le dossier de son auteur ; 100 sons maximum par compte
create or replace function public.tracks_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.owner_id := auth.uid();
  if split_part(new.audio_path, '/', 1) <> new.owner_id::text
     or (new.cover_path is not null and split_part(new.cover_path, '/', 1) <> new.owner_id::text) then
    raise exception 'Chemin de fichier invalide' using errcode = '42501';
  end if;
  if (select count(*) from public.tracks where owner_id = new.owner_id) >= 100 then
    raise exception 'Tu as atteint la limite de 100 sons publiés' using errcode = '23514';
  end if;
  return new;
end $$;
drop trigger if exists tracks_bi on public.tracks;
create trigger tracks_bi before insert on public.tracks for each row execute function public.tracks_before_insert();

alter table public.tracks enable row level security;
drop policy if exists "sons visibles" on public.tracks;
create policy "sons visibles" on public.tracks for select to authenticated using (true);
drop policy if exists "publier un son" on public.tracks;
create policy "publier un son" on public.tracks for insert to authenticated with check (owner_id = (select auth.uid()));
drop policy if exists "modifier son son" on public.tracks;
create policy "modifier son son" on public.tracks for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists "retirer un son" on public.tracks;
create policy "retirer un son" on public.tracks for delete to authenticated
  using (owner_id = (select auth.uid()) or (select public.is_musio_creator()));

revoke insert, update on public.tracks from anon, authenticated;
grant insert (title, artist, genre, duration, audio_path, cover_path, color, rights_ok) on public.tracks to authenticated;
grant update (title, artist, genre, cover_path, color) on public.tracks to authenticated;

-- stockage des fichiers (lecture publique, écriture dans son propre dossier)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('sounds', 'sounds', true, 20971520, array['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/webm', 'audio/flac']),
  ('covers', 'covers', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "musio deposer ses fichiers" on storage.objects;
create policy "musio deposer ses fichiers" on storage.objects for insert to authenticated
  with check (bucket_id in ('sounds', 'covers') and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "musio supprimer ses fichiers" on storage.objects;
create policy "musio supprimer ses fichiers" on storage.objects for delete to authenticated
  using (bucket_id in ('sounds', 'covers') and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_musio_creator())));
