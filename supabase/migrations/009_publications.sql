-- Musio — publications du feed en ligne (photos / vidéos en musique)
-- « Public » : tous les membres. « Amis » : les personnes que l'auteur suit.
-- « Moi seulement » reste sur l'appareil (jamais envoyé).
-- Fichiers : bucket posts/<id du compte>/<id de la publication>/…

create table if not exists public.posts (
  id             uuid primary key default gen_random_uuid(),
  author_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  track_id       text check (track_id is null or char_length(track_id) <= 60),
  track_title    text check (track_title is null or char_length(track_title) <= 80),
  track_artist   text check (track_artist is null or char_length(track_artist) <= 60),
  track_color    text check (track_color is null or track_color ~ '^#[0-9A-Fa-f]{6}$'),
  start_sec      integer not null default 0 check (start_sec between 0 and 7200),
  len_sec        integer not null default 30 check (len_sec between 1 and 600),
  style          text not null default 'waves' check (char_length(style) <= 20),
  filter         text not null default 'normal' check (char_length(filter) <= 20),
  texts          jsonb not null default '[]' check (jsonb_typeof(texts) = 'array' and pg_column_size(texts) <= 8000),
  caption        text not null default '' check (char_length(caption) <= 2200),
  video_path     text check (video_path is null or char_length(video_path) <= 200),
  photo_paths    text[] not null default '{}' check (cardinality(photo_paths) <= 10),
  allow_comments boolean not null default true,
  vis            text not null default 'Public' check (vis in ('Public', 'Amis')),
  created_at     timestamptz not null default now()
);
create index if not exists posts_recent_idx on public.posts (created_at desc);
create index if not exists posts_author_idx on public.posts (author_id, created_at desc);

create or replace function public.posts_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare p text;
begin
  new.author_id := auth.uid();
  new.created_at := now();
  if new.video_path is not null and split_part(new.video_path, '/', 1) <> new.author_id::text then
    raise exception 'Chemin de fichier invalide' using errcode = '42501';
  end if;
  foreach p in array new.photo_paths loop
    if split_part(p, '/', 1) <> new.author_id::text then raise exception 'Chemin de fichier invalide' using errcode = '42501'; end if;
  end loop;
  if (select count(*) from public.posts where author_id = new.author_id and created_at > now() - interval '1 day') >= 50 then
    raise exception 'Tu as atteint la limite de 50 publications par jour' using errcode = '23514';
  end if;
  return new;
end $$;
revoke all on function public.posts_before_insert() from public, anon, authenticated;
drop trigger if exists posts_bi on public.posts;
create trigger posts_bi before insert on public.posts for each row execute function public.posts_before_insert();

alter table public.posts enable row level security;
drop policy if exists "voir les publications" on public.posts;
create policy "voir les publications" on public.posts for select to authenticated using (
  vis = 'Public'
  or author_id = (select auth.uid())
  or exists (select 1 from public.follows f where f.follower_id = posts.author_id and f.followee_id = (select auth.uid()))
);
drop policy if exists "publier" on public.posts;
create policy "publier" on public.posts for insert to authenticated
  with check (author_id = (select auth.uid()) and not (select public.is_banned()));
drop policy if exists "supprimer une publication" on public.posts;
create policy "supprimer une publication" on public.posts for delete to authenticated
  using (author_id = (select auth.uid()) or (select public.is_musio_creator()));

revoke insert, update, delete on public.posts from anon, authenticated;
grant insert (id, track_id, track_title, track_artist, track_color, start_sec, len_sec, style, filter, texts, caption, video_path, photo_paths, allow_comments, vis) on public.posts to authenticated;
grant delete on public.posts to authenticated;

-- fichiers des publications (50 Mo max, limite du plan gratuit)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('posts', 'posts', true, 52428800, array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "musio deposer ses fichiers" on storage.objects;
create policy "musio deposer ses fichiers" on storage.objects for insert to authenticated
  with check (bucket_id in ('sounds', 'covers', 'posts') and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "musio supprimer ses fichiers" on storage.objects;
create policy "musio supprimer ses fichiers" on storage.objects for delete to authenticated
  using (bucket_id in ('sounds', 'covers', 'posts') and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_musio_creator())));
drop policy if exists "musio lire les fichiers" on storage.objects;
create policy "musio lire les fichiers" on storage.objects for select to authenticated
  using (bucket_id in ('sounds', 'covers', 'posts'));
