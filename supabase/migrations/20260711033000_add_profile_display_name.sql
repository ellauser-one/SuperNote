-- name: add_profile_display_name
alter table public.profiles
  add column display_name text;

comment on column public.profiles.display_name is 'Optional display name (nickname), separate from unique username';
