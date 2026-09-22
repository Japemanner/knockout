-- 019_block_new_signups.sql
-- Backstop naast de Auth-instelling disable_signup = true: elke nieuwe rij in
-- auth.users wordt geweigerd (signup, magic link, invite, admin.createUser,
-- "Add user" in het dashboard). Bestaande accounts kunnen gewoon inloggen.
-- Tijdelijk een account toevoegen:
--   drop trigger kk_block_new_signups on auth.users;
--   ...account aanmaken...
--   daarna deze migration opnieuw draaien.

create or replace function public.kk_block_new_signups()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Nieuwe registraties zijn uitgeschakeld';
end;
$$;

drop trigger if exists kk_block_new_signups on auth.users;
create trigger kk_block_new_signups
  before insert on auth.users
  for each row execute function public.kk_block_new_signups();