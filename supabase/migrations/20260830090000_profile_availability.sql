-- A profile's explicit opportunity status, shown in the talent pool and on
-- the public portfolio. Existing members default to collaboration because the
-- directory has always been the collaboration-facing surface of the product;
-- every owner can change or close the status from their profile editor.

alter table public.profiles
  add column availability_status text not null default 'open_to_collaboration',
  add constraint profiles_availability_status check (
    availability_status in (
      'open_to_work',
      'open_to_collaboration',
      'open_to_both',
      'not_open'
    )
  );

comment on column public.profiles.availability_status is
  'Public talent-pool status selected by the profile owner.';

