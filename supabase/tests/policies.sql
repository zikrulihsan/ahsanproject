-- Checks that the row level security policies actually hold.
--
-- Run against a scratch database built from supabase/local/auth-shim.sql and
-- the files in supabase/migrations/ — never against real data, it writes rows.
-- Any violated expectation raises, so psql -v ON_ERROR_STOP=1 exits non-zero.
--
--   psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -f supabase/tests/policies.sql

\set ON_ERROR_STOP on

create schema if not exists checks;

-- Runs a statement and fails the test if it was allowed through.
create or replace function checks.denied(statement text, label text)
returns void language plpgsql as $$
begin
  begin
    execute statement;
  exception when others then
    raise notice 'ok, ditolak: %  (%)', label, sqlerrm;
    return;
  end;
  raise exception 'BOCOR: % seharusnya ditolak, tapi berhasil', label;
end;
$$;

-- Runs a statement and fails the test if it was blocked.
create or replace function checks.allowed(statement text, label text)
returns void language plpgsql as $$
begin
  execute statement;
  raise notice 'ok, diizinkan: %', label;
end;
$$;

create or replace function checks.equal(actual anyelement, expected anyelement, label text)
returns void language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception 'SALAH: % — dapat %, harusnya %', label, actual, expected;
  end if;
  raise notice 'ok: % = %', label, expected;
end;
$$;

-- Becomes a signed-in visitor, the same way PostgREST does it.
create or replace function checks.act_as(who uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', who)::text, true);
  execute 'set local role authenticated';
end;
$$;

-- Becomes an anonymous visitor. Dropping the role is not enough: the JWT claims
-- have to go too, or auth.uid() keeps answering with whoever acted last and the
-- guest checks below quietly stop testing anything.
create or replace function checks.act_as_guest()
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', true);
  execute 'reset role';
  execute 'set local role anon';
end;
$$;

-- The helpers are called while acting as anon/authenticated, so those roles
-- need to be able to reach them.
grant usage on schema checks to anon, authenticated;
grant execute on all functions in schema checks to anon, authenticated;

begin;

-- Two people sign up. The trigger gives each one a profile.
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-4111-8111-111111111111', 'ihsan@example.com', '{"name":"Zikrul Ihsan"}'),
  ('22222222-2222-4222-8222-222222222222', 'dina@example.com',  '{"name":"Dina Pratiwi"}'),
  -- Same display name as Dina: the username must not collide.
  ('33333333-3333-4333-8333-333333333333', 'dina2@example.com', '{"name":"Dina Pratiwi"}'),
  -- On no project at all, so "assign somebody from outside" has a real subject.
  ('44444444-4444-4444-8444-444444444444', 'budi@example.com',  '{"name":"Budi Santoso"}');

select checks.equal(
  (select username from public.profiles where id = '22222222-2222-4222-8222-222222222222'),
  'dina-pratiwi', 'username dari nama');
select checks.equal(
  (select username from public.profiles where id = '33333333-3333-4333-8333-333333333333'),
  'dina-pratiwi-2', 'username kembar dapat akhiran');

-- ---------------------------------------------------------------- projects --

select checks.act_as('11111111-1111-4111-8111-111111111111');

select checks.allowed($$
  insert into public.projects (slug, title, tagline, owner_id, problem, solution, audience, tags)
  values ('kelas-sore', 'Kelas Sore', 'Papan jadwal kelas tambahan gratis di kampung.',
          '11111111-1111-4111-8111-111111111111',
          repeat('m', 130), repeat('s', 130), repeat('u', 45), array['pendidikan'])
$$, 'pemilik menaruh proyeknya sendiri');

select checks.denied($$
  insert into public.projects (slug, title, tagline, owner_id, problem, solution, audience, tags)
  values ('curian', 'Curian', 'Menaruh proyek atas nama orang lain.',
          '22222222-2222-4222-8222-222222222222',
          repeat('m', 130), repeat('s', 130), repeat('u', 45), array['uji'])
$$, 'menaruh proyek atas nama orang lain');

select checks.denied($$
  insert into public.projects (slug, title, tagline, owner_id, problem, solution, audience, tags)
  values ('kosongan', 'Kosongan', 'Ide yang briefnya tidak diisi sungguh-sungguh.',
          '11111111-1111-4111-8111-111111111111', 'pendek', 'pendek', 'pendek', array['uji'])
$$, 'brief kosongan ditolak database');

select checks.denied($$
  insert into public.projects (slug, title, tagline, owner_id, stage, problem, solution, audience, tags)
  values ('ngaku-jalan', 'Ngaku Jalan', 'Mengaku sudah jalan tanpa tautan apa pun.',
          '11111111-1111-4111-8111-111111111111', 'live',
          repeat('m', 130), repeat('s', 130), repeat('u', 45), array['uji'])
$$, 'level "sudah jalan" tanpa tautan');

-- Dina cannot touch someone else's project.
select checks.act_as('22222222-2222-4222-8222-222222222222');

update public.projects set title = 'Dibajak' where slug = 'kelas-sore';
select checks.equal((select title from public.projects where slug = 'kelas-sore'),
                    'Kelas Sore', 'judul orang lain tidak berubah');

delete from public.projects where slug = 'kelas-sore';
select checks.equal((select count(*)::int from public.projects where slug = 'kelas-sore'),
                    1, 'proyek orang lain tidak terhapus');

-- ------------------------------------------------------------------- seats --

select checks.denied($$
  insert into public.seats (project_id, role, brief)
  select id, 'design', 'Menyelinap membuka peran di proyek orang.'
  from public.projects where slug = 'kelas-sore'
$$, 'membuka peran di proyek orang lain');

select checks.act_as('11111111-1111-4111-8111-111111111111');
select checks.allowed($$
  insert into public.seats (project_id, role, brief)
  select id, 'design', 'Menyusun tampilan jadwal mingguan.'
  from public.projects where slug = 'kelas-sore'
$$, 'pemilik membuka peran');

select checks.denied($$select public.apply_for_seat((select id from public.seats limit 1), 'Saya sendiri.')$$,
                     'pemilik melamar ke proyeknya sendiri');

-- Dina applies, properly.
select checks.act_as('22222222-2222-4222-8222-222222222222');
select checks.allowed($$select public.apply_for_seat((select id from public.seats limit 1), 'Bisa 4 jam per minggu.')$$,
                      'melamar peran yang terbuka');
select checks.equal((select status from public.seats limit 1), 'pending', 'peran jadi menunggu');

select checks.denied($$select public.apply_for_seat((select id from public.seats limit 1), 'Sekali lagi.')$$,
                     'melamar dua kali');

-- The applicant must not be able to hand themselves the seat.
update public.seats set status = 'filled' where status = 'pending';
select checks.equal((select status from public.seats limit 1), 'pending', 'pelamar tidak bisa meloloskan diri sendiri');

select checks.denied($$select public.decide_seat((select id from public.seats limit 1), true)$$,
                     'pelamar menyetujui lamarannya sendiri');

-- The owner decides.
select checks.act_as('11111111-1111-4111-8111-111111111111');
select checks.allowed($$select public.decide_seat((select id from public.seats limit 1), true)$$,
                      'pemilik menerima lamaran');
select checks.equal((select status from public.seats limit 1), 'filled', 'peran terisi');

-- ---------------------------------------------------------------- comments --

select checks.act_as('22222222-2222-4222-8222-222222222222');
select checks.denied($$
  insert into public.comments (project_id, author_id, body)
  select id, '11111111-1111-4111-8111-111111111111', 'Menulis atas nama orang lain.'
  from public.projects where slug = 'kelas-sore'
$$, 'berkomentar atas nama orang lain');

select checks.allowed($$
  insert into public.comments (project_id, author_id, body)
  select id, '22222222-2222-4222-8222-222222222222', 'Mulai dari satu RT dulu.'
  from public.projects where slug = 'kelas-sore'
$$, 'berkomentar sebagai diri sendiri');

-- ------------------------------------------------------------------ boosts --

select checks.allowed($$
  insert into public.boosts (project_id, user_id)
  select id, '22222222-2222-4222-8222-222222222222' from public.projects where slug = 'kelas-sore'
$$, 'mendukung sebagai diri sendiri');

select checks.denied($$
  insert into public.boosts (project_id, user_id)
  select id, '11111111-1111-4111-8111-111111111111' from public.projects where slug = 'kelas-sore'
$$, 'mendukung atas nama orang lain');

select checks.denied($$
  insert into public.boosts (project_id, user_id)
  select id, '22222222-2222-4222-8222-222222222222' from public.projects where slug = 'kelas-sore'
$$, 'mendukung dua kali');

delete from public.boosts where user_id = '11111111-1111-4111-8111-111111111111';
select checks.equal((select count(*)::int from public.boosts), 1, 'dukungan orang lain tidak bisa dicabut');

-- ------------------------------------------------------------ akses & tugas --

-- Dina holds a filled seat by now. Promote her, and seat dina2 as a plain
-- member, so all three levels are represented at once.
select checks.act_as('11111111-1111-4111-8111-111111111111');

update public.seats set access = 'admin' where user_id = '22222222-2222-4222-8222-222222222222';
select checks.equal((select access from public.seats where user_id = '22222222-2222-4222-8222-222222222222'),
                    'admin', 'pemilik mengangkat admin');

select checks.allowed($$
  insert into public.seats (project_id, role, brief, status, user_id)
  select id, 'research', 'Ngobrol ke calon pengguna.', 'filled', '33333333-3333-4333-8333-333333333333'
  from public.projects where slug = 'kelas-sore'
$$, 'pemilik mendudukkan anggota');

-- An open seat carrying the admin flag would hand over the keys the moment an
-- application is accepted.
select checks.denied($$
  insert into public.seats (project_id, role, brief, access)
  select id, 'content', 'Peran terbuka yang mengaku admin.', 'admin'
  from public.projects where slug = 'kelas-sore'
$$, 'peran terbuka mengaku admin');

-- can_manage_project, all four answers. Reading seats from inside a seats
-- policy is exactly what would recurse if the helper were SECURITY INVOKER,
-- so these also stand as the recursion check.
select checks.equal(public.can_manage_project((select id from public.projects where slug = 'kelas-sore')), true,  'pemilik boleh mengelola');
select checks.act_as('22222222-2222-4222-8222-222222222222');
select checks.equal(public.can_manage_project((select id from public.projects where slug = 'kelas-sore')), true,  'admin boleh mengelola');
select checks.act_as('33333333-3333-4333-8333-333333333333');
select checks.equal(public.can_manage_project((select id from public.projects where slug = 'kelas-sore')), false, 'anggota tidak mengelola');
select checks.act_as_guest();
select checks.equal(public.can_manage_project((select id from public.projects where slug = 'kelas-sore')), false, 'tamu tidak mengelola');

-- Admins run the work, not the project.
select checks.act_as('22222222-2222-4222-8222-222222222222');
update public.projects set title = 'Dirombak Admin' where slug = 'kelas-sore';
select checks.equal((select title from public.projects where slug = 'kelas-sore'),
                    'Kelas Sore', 'admin tidak bisa mengubah brief');

-- A WITH CHECK failure raises, unlike a USING clause, which filters silently.
-- That is why this one is checks.denied and the brief edit above is not.
select checks.denied($$update public.seats set access = 'admin' where user_id = '33333333-3333-4333-8333-333333333333'$$,
                     'admin mengangkat admin baru');
select checks.equal((select access from public.seats where user_id = '33333333-3333-4333-8333-333333333333'),
                    'member', 'anggota tetap anggota');

select checks.allowed($$
  insert into public.tasks (project_id, title, detail, created_by, assignee_id)
  select id, 'Tugas asli', 'Ngobrol ke lima warung.', '22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333'
  from public.projects where slug = 'kelas-sore'
$$, 'admin membuat tugas');

select checks.denied($$
  insert into public.tasks (project_id, title, created_by, assignee_id)
  select id, 'Tugas titipan', '22222222-2222-4222-8222-222222222222', '44444444-4444-4444-8444-444444444444'
  from public.projects where slug = 'kelas-sore'
$$, 'menugaskan orang di luar proyek');

select checks.act_as('33333333-3333-4333-8333-333333333333');
select checks.denied($$
  insert into public.tasks (project_id, title, created_by)
  select id, 'Tugas bikinan sendiri', '33333333-3333-4333-8333-333333333333'
  from public.projects where slug = 'kelas-sore'
$$, 'anggota membuat tugas');

-- The assignee may move their own task along …
select checks.allowed($$select public.move_task((select id from public.tasks limit 1), 'doing')$$,
                      'yang kebagian memindahkan tugasnya');
select checks.equal((select status from public.tasks limit 1), 'doing', 'tugas jadi dikerjakan');

-- … and nothing else. This is the whole reason move_task exists instead of an
-- UPDATE policy: row level security cannot narrow a write down to one column.
update public.tasks set title = 'Dibajak', assignee_id = '33333333-3333-4333-8333-333333333333';
select checks.equal((select title from public.tasks limit 1), 'Tugas asli',
                    'yang kebagian tidak bisa menulis ulang tugasnya');

select checks.denied($$select public.move_task((select id from public.tasks limit 1), 'entah')$$,
                     'status tugas yang tidak ada');

delete from public.tasks;
select checks.equal((select count(*)::int from public.tasks), 1, 'anggota tidak bisa menghapus tugas');

-- A bystander is not the assignee and manages nothing.
select checks.act_as('44444444-4444-4444-8444-444444444444');
select checks.denied($$select public.move_task((select id from public.tasks limit 1), 'done')$$,
                     'orang luar memindahkan tugas');

select checks.act_as_guest();
select checks.denied($$select public.move_task((select id from public.tasks limit 1), 'done')$$,
                     'tamu memindahkan tugas');
select checks.denied($$
  insert into public.tasks (project_id, title, created_by)
  select id, 'Tugas tamu', '11111111-1111-4111-8111-111111111111' from public.projects where slug = 'kelas-sore'
$$, 'tamu membuat tugas');

-- Managers may rewrite the task itself.
select checks.act_as('22222222-2222-4222-8222-222222222222');
update public.tasks set title = 'Ngobrol ke lima warung';
select checks.equal((select title from public.tasks limit 1), 'Ngobrol ke lima warung',
                    'admin boleh mengubah tugas');

select checks.equal((select open_task_count::int from public.project_overview), 1, 'hitungan tugas jalan');
select checks.equal((select done_task_count::int from public.project_overview), 0, 'hitungan tugas beres');

-- Somebody leaving a project releases their tasks rather than leaving them
-- pointing at a person who is no longer on it.
select checks.act_as('11111111-1111-4111-8111-111111111111');
select checks.equal((select assignee_id from public.tasks limit 1), '33333333-3333-4333-8333-333333333333'::uuid, 'tugas ada yang pegang');
select checks.allowed($$delete from public.seats where user_id = '33333333-3333-4333-8333-333333333333'$$, 'pemilik melepas anggota');
select checks.equal((select assignee_id from public.tasks limit 1), null::uuid, 'tugasnya ikut dilepas');

-- ------------------------------------------------------------------ jejak --

-- The trail is written by triggers, so by now the actions above have already
-- produced entries. What matters is who they are attributed to, that nobody can
-- forge one, and that hiding a kind really hides it.

select checks.act_as('11111111-1111-4111-8111-111111111111');

-- The owner accepted dina's application, but joining is dina's to show.
select checks.equal(
  (select e.actor_id from public.events e where e.kind = 'seat_filled' order by e.id desc limit 1),
  '22222222-2222-4222-8222-222222222222'::uuid, 'yang gabung yang punya jejaknya, bukan yang menerima');

select checks.equal(
  (select e.actor_id from public.events e where e.kind = 'project_created' order by e.id limit 1),
  '11111111-1111-4111-8111-111111111111'::uuid, 'yang menaruh ide yang punya jejaknya');

select checks.equal(
  (select (e.payload ->> 'task_title') from public.events e where e.kind = 'task_created' order by e.id desc limit 1),
  'Tugas asli', 'jejak tugas menyimpan judulnya');

-- Nothing anybody can write by hand.
select checks.denied($$
  insert into public.events (actor_id, kind, payload)
  values ('11111111-1111-4111-8111-111111111111', 'task_done', '{"task_title":"Karangan"}'::jsonb)
$$, 'mengarang jejak sendiri');
select checks.denied($$update public.events set kind = 'task_done'$$, 'mengubah jejak');
select checks.denied($$delete from public.events$$, 'menghapus jejak');

-- A statement with nobody behind it writes nothing. This is what keeps
-- supabase/seed.sql from manufacturing history for backdated projects.
reset role;
select set_config('request.jwt.claims', '', true);
insert into public.projects (slug, title, tagline, owner_id, problem, solution, audience, tags)
values ('uji-tanpa-orang', 'Uji Tanpa Orang', 'Disisipkan tanpa ada orang di baliknya.',
        '11111111-1111-4111-8111-111111111111', repeat('m', 130), repeat('s', 130), repeat('u', 45), array['uji']);
select checks.equal((select count(*)::int from public.events where payload ->> 'slug' = 'uji-tanpa-orang'),
                    0, 'tanpa orang di baliknya, tidak ada jejak');
delete from public.projects where slug = 'uji-tanpa-orang';

-- Hiding a kind has to be a database rule, or the anon key reads straight past it.
select checks.act_as('22222222-2222-4222-8222-222222222222');
select checks.allowed($$
  update public.profiles set activity_hidden = array['comment_posted'] where id = '22222222-2222-4222-8222-222222222222'
$$, 'menyembunyikan satu jenis jejak');

select checks.denied($$
  update public.profiles set activity_hidden = array['bukan-jenis-apa-apa'] where id = '22222222-2222-4222-8222-222222222222'
$$, 'menyembunyikan jenis yang tidak ada');

select checks.equal(
  (select count(*)::int from public.events where actor_id = '22222222-2222-4222-8222-222222222222' and kind = 'comment_posted'),
  1, 'pemiliknya tetap melihat jejaknya sendiri');

select checks.act_as_guest();
select checks.equal(
  (select count(*)::int from public.events where actor_id = '22222222-2222-4222-8222-222222222222' and kind = 'comment_posted'),
  0, 'orang lain tidak melihat jejak yang disembunyikan');
select checks.equal(
  (select count(*)::int from public.events where actor_id = '22222222-2222-4222-8222-222222222222' and kind = 'seat_filled'),
  1, 'jenis lain tetap kelihatan');

-- Somebody else's choice is not yours to make.
select checks.act_as('33333333-3333-4333-8333-333333333333');
update public.profiles set activity_hidden = array['task_done'] where id = '22222222-2222-4222-8222-222222222222';
select checks.equal((select activity_hidden from public.profiles where id = '22222222-2222-4222-8222-222222222222'),
                    array['comment_posted'], 'pilihan orang lain tidak bisa diubah');

-- ------------------------------------------------------------------ delete --

-- Deleting a project has to take its seats, comments and support with it,
-- because app/actions.ts deleteProject() leans on the cascade rather than
-- clearing the children itself.
select checks.equal((select count(*)::int from public.seats), 1, 'ada peran sebelum dihapus');
select checks.equal((select count(*)::int from public.comments), 1, 'ada komentar sebelum dihapus');

select checks.act_as('11111111-1111-4111-8111-111111111111');
select checks.allowed($$delete from public.projects where slug = 'kelas-sore'$$, 'pemilik menghapus proyeknya');
select checks.equal((select count(*)::int from public.seats), 0, 'peran ikut terhapus');
select checks.equal((select count(*)::int from public.comments), 0, 'komentar ikut terhapus');
select checks.equal((select count(*)::int from public.boosts), 0, 'dukungan ikut terhapus');
select checks.equal((select count(*)::int from public.tasks), 0, 'tugas ikut terhapus');

-- Deliberately the other way round for the trail: events release the project
-- rather than cascading, and the payload keeps the title, so somebody's history
-- does not develop a hole when a project they worked on is deleted.
select checks.equal(
  (select (e.payload ->> 'title') from public.events e where e.kind = 'project_created' order by e.id limit 1),
  'Kelas Sore', 'jejak menyimpan judul proyek yang sudah dihapus');
select checks.equal(
  (select e.project_id from public.events e where e.kind = 'project_created' order by e.id limit 1),
  null::bigint, 'jejak melepas proyeknya, bukan ikut terhapus');

-- Put it back so the guest checks below still have something to read.
select checks.allowed($$
  insert into public.projects (slug, title, tagline, owner_id, problem, solution, audience, tags)
  values ('kelas-sore', 'Kelas Sore', 'Papan jadwal kelas tambahan gratis di kampung.',
          '11111111-1111-4111-8111-111111111111',
          repeat('m', 130), repeat('s', 130), repeat('u', 45), array['pendidikan'])
$$, 'pemilik menaruh ulang proyeknya');

-- -------------------------------------------------------------------- anon --

select checks.act_as_guest();
select checks.equal(auth.uid(), null::uuid, 'tamu benar-benar tanpa identitas');

select checks.equal((select count(*)::int from public.projects), 1, 'tamu tetap bisa membaca papan');
select checks.equal((select count(*)::int from public.project_overview), 1, 'tamu bisa membaca ringkasan');

select checks.denied($$
  insert into public.projects (slug, title, tagline, owner_id, problem, solution, audience, tags)
  values ('tamu', 'Tamu', 'Tamu mencoba menaruh ide tanpa masuk.',
          '11111111-1111-4111-8111-111111111111',
          repeat('m', 130), repeat('s', 130), repeat('u', 45), array['uji'])
$$, 'tamu menaruh ide');

select checks.denied($$select public.apply_for_seat((select id from public.seats limit 1), 'Tamu melamar.')$$,
                     'tamu melamar peran');

-- The overview must agree with the rows it counts.
-- The project was just re-created, so every count starts from nothing again.
select checks.equal((select seat_count::int from public.project_overview), 0, 'hitungan peran');
select checks.equal((select comment_count::int from public.project_overview), 0, 'hitungan komentar');
select checks.equal((select boost_count::int from public.project_overview), 0, 'hitungan dukungan');
select checks.equal((select open_task_count::int from public.project_overview), 0, 'hitungan tugas jalan');
select checks.equal((select done_task_count::int from public.project_overview), 0, 'hitungan tugas beres');

reset role;
rollback;

drop schema checks cascade;
