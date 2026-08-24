-- Public contact points for a portfolio profile.
--
-- The authentication email stays private. A person has to deliberately fill
-- public_email before an address appears on their profile.

alter table public.profiles
  add column public_email text not null default '',
  add column linkedin     text not null default '',
  add column x_url        text not null default '',
  add column resume_url   text not null default '';

alter table public.profiles
  add constraint profiles_public_email_length check (char_length(public_email) <= 254),
  add constraint profiles_linkedin_length     check (char_length(linkedin) <= 300),
  add constraint profiles_x_url_length        check (char_length(x_url) <= 300),
  add constraint profiles_resume_url_length   check (char_length(resume_url) <= 300);
