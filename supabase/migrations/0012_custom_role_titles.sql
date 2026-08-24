-- Let a project name a role that does not yet belong in the shared catalogue.
--
-- `role = 'other'` remains the filterable canonical bucket. `role_title` is
-- the specific label people see on the project, such as "Videografer".

alter table public.seats
  add column role_title text not null default '',
  add constraint seats_role_title_len check (char_length(role_title) <= 80);

