-- Canonical role catalogue shared by every project.
--
-- Role used to be one of seven broad buckets. The UI now opens a position
-- from a more useful shared catalogue, and the database enforces the same
-- keys so a hand-written request cannot smuggle in a one-off label.

alter table public.seats drop constraint if exists seats_role_valid;

update public.seats
set role = case role
  when 'pm'          then 'product-manager'
  when 'design'      then 'ui-ux-designer'
  when 'engineering' then 'software-engineer'
  when 'research'    then 'researcher'
  when 'content'     then 'content-writer'
  when 'growth'      then 'growth-marketing'
  else role
end;

alter table public.seats
  add constraint seats_role_valid check (role in (
    'product-manager',
    'ui-ux-designer',
    'frontend-developer',
    'backend-developer',
    'mobile-developer',
    'software-engineer',
    'data-ml-engineer',
    'qa-engineer',
    'researcher',
    'content-writer',
    'content-designer',
    'social-media',
    'growth-marketing',
    'partnership',
    'community-manager',
    'mentor',
    'teacher',
    'legal-researcher',
    -- Kept only for rows created by an older release. The new UI never offers it.
    'other'
  ));
