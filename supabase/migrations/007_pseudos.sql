-- Musio — pseudos : 2 à 24 caractères (001), uniques (001), et jamais uniquement des zéros (@00, @000…)
alter table public.profiles drop constraint if exists profiles_handle_zeros;
alter table public.profiles add constraint profiles_handle_zeros check (handle !~ '^0+$');

create or replace function public.handle_available(h text) returns boolean
language sql stable security definer set search_path = '' as $$
  select lower(h) !~ '^0+$' and not exists (select 1 from public.profiles where handle = lower(h));
$$;
