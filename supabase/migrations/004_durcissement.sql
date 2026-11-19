-- Musio — les fonctions de déclencheur ne sont pas appelables depuis l'API
revoke all on function public.touch_updated_at() from public, anon, authenticated;
revoke all on function public.communities_before_insert() from public, anon, authenticated;
revoke all on function public.communities_after_insert() from public, anon, authenticated;
revoke all on function public.community_members_count() from public, anon, authenticated;
revoke all on function public.tracks_before_insert() from public, anon, authenticated;

-- supprimer un fichier demande aussi le droit de le lire (fichiers déjà publics)
drop policy if exists "musio lire les fichiers" on storage.objects;
create policy "musio lire les fichiers" on storage.objects for select to authenticated
  using (bucket_id in ('sounds', 'covers'));
