-- Ahsan Project: dari papan ide menjadi tempat menunjukkan yang sedang dibangun.
--
-- Perubahan positioning, bukan sekadar tampilan. Yang membuat sebuah project
-- menarik untuk dibantu bukan statusnya, melainkan apa yang sedang dikerjakan
-- sekarang dan kapan terakhir bergerak. Migrasi ini menyiapkan datanya:
--
--   projects.now_text        satu kalimat "sekarang sedang …"
--   updates                  catatan perjalanan yang ditulis pemiliknya
--   follows                  mengikuti project tanpa harus jadi anggotanya
--   seats.commitment         perkiraan waktu, supaya "butuh bantuan" bisa dinilai
--   project_overview         ikut membawa kesegaran (last_activity_at)
--
-- Sekaligus menyederhanakan level: 'validating' dihapus sebagai status. Orang
-- yang menjelajah tidak mencari "project yang sedang divalidasi" — validasi
-- adalah salah satu langkah perjalanan, dan tempatnya sekarang di `updates`.

-- ------------------------------------------------------- sekarang sedang apa

alter table public.projects
  add column now_text       text not null default '',
  add column now_updated_at timestamptz,
  add constraint projects_now_len check (char_length(now_text) <= 200);

/*
 * Kapan kalimat "sekarang" itu terakhir berubah.
 *
 * Dihitung trigger, bukan dikirim aplikasi, karena inilah yang dibaca orang
 * sebagai tanda project ini masih hidup — kalau bisa diisi dari luar, ia jadi
 * angka yang bisa dikarang, persis alasan `events` tidak punya grant insert.
 * Menyimpan ulang kalimat yang sama tidak menyegarkan apa pun.
 */
create or replace function public.touch_now_text()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.now_text is distinct from old.now_text and coalesce(trim(new.now_text), '') <> '' then
    new.now_updated_at := now();
  end if;
  return new;
end;
$$;

create trigger projects_touch_now_text
  before update on public.projects
  for each row execute function public.touch_now_text();

/*
 * Menulis kalimat "sekarang", untuk pemilik maupun adminnya.
 *
 * Fungsi, bukan policy, dengan alasan yang persis sama seperti `move_task`:
 * row level security itu per-baris, bukan per-kolom. Policy yang mengizinkan
 * admin menulis `now_text` juga akan mengizinkannya menulis ulang brief,
 * memindahkan level, dan mengganti tautan produknya. Yang boleh berubah di
 * sini cuma satu kolom — dan tahapnya, kalau kalimat itu memang yang
 * menopangnya.
 *
 * Kenapa admin sama sekali: kalimat inilah yang paling sering berubah di
 * seluruh project, dan yang dibaca orang untuk menilai project ini masih hidup
 * atau tidak. Menguncinya di pemilik adalah cara tercepat membuatnya basi.
 * Admin memang mengurus pekerjaannya; brief dan penghapusan tetap milik
 * pemilik.
 *
 * Bagian `case` di bawah adalah `settleStage()` untuk satu kolom ini saja.
 * 'live' tidak pernah perlu diturunkan — `projects_live_needs_link` sudah
 * menjamin ia punya tautan yang bisa dibuka — jadi yang tersisa hanya
 * 'building' yang tidak punya sandaran lain, dan itu turun ke 'idea'.
 * Tanpa ini, mengosongkan kalimatnya akan ditolak CHECK constraint sebagai
 * error, bukan diturunkan levelnya dengan jujur.
 */
create or replace function public.set_now(project bigint, line text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null or not public.can_manage_project(project) then
    raise exception 'Cuma pemilik project atau adminnya yang bisa menulis ini.'
      using errcode = '42501';
  end if;

  update public.projects p
  set now_text = left(trim(coalesce(line, '')), 200),
      stage = case
                when p.stage = 'building'
                     and coalesce(trim(line), '') = ''
                     and p.repo_url = '' and p.doc_url = '' and p.live_url = ''
                  then 'idea'
                else p.stage
              end
  where p.id = project;
end;
$$;

grant execute on function public.set_now(bigint, text) to authenticated;

-- ---------------------------------------------------------------- perjalanan

/*
 * Catatan perjalanan project — apa yang selesai, apa yang sedang diuji, apa
 * yang berubah arah.
 *
 * Berbeda dari `events`: `events` ditulis sistem dan tidak bisa dikarang,
 * sedangkan ini memang tulisan orangnya. Keduanya dibutuhkan — yang satu bukti,
 * yang satu cerita — dan halaman project menampilkannya sebagai satu perjalanan.
 * Karena ini tulisan manusia, ia boleh dihapus penulisnya; yang tidak boleh
 * disentuh siapa pun tetap `events`.
 */
create table public.updates (
  id         bigint      generated always as identity primary key,
  project_id bigint      not null references public.projects (id) on delete cascade,
  -- Melepas, bukan ikut terhapus: catatan perjalanan sebuah project tidak
  -- hilang karena penulisnya menghapus akunnya, sama seperti `tasks`.
  author_id  uuid        references public.profiles (id) on delete set null,
  title      text        not null,
  body       text        not null default '',
  created_at timestamptz not null default now(),

  constraint updates_title_len check (char_length(title) between 3 and 120),
  constraint updates_body_len  check (char_length(body) <= 1000)
);

create index updates_project_idx on public.updates (project_id, id desc);
create index updates_author_idx  on public.updates (author_id, id desc);

alter table public.updates enable row level security;

create policy "perjalanan project terbuka untuk siapa saja"
  on public.updates for select
  to anon, authenticated
  using (true);

-- Yang menjalankan project yang menulis kabarnya, dan hanya atas nama sendiri.
create policy "pengurus project menulis kabar"
  on public.updates for insert
  to authenticated
  with check (
    public.can_manage_project(project_id)
    and author_id = (select auth.uid())
  );

create policy "penulisnya boleh menghapus kabarnya"
  on public.updates for delete
  to authenticated
  using (author_id = (select auth.uid()) or public.can_manage_project(project_id));

grant select         on public.updates to anon, authenticated;
grant insert, delete on public.updates to authenticated;

-- ------------------------------------------------------------------ mengikuti

/*
 * Mengikuti sebuah project tanpa ikut mengerjakannya.
 *
 * Sengaja terpisah dari `boosts`. Dukungan itu penilaian ("ini bagus");
 * mengikuti itu niat ("kabari saya kalau ada gerakan"). Menggabungkan keduanya
 * akan memaksa orang memilih antara memuji dan menyimak.
 */
create table public.follows (
  project_id bigint      not null references public.projects (id) on delete cascade,
  user_id    uuid        not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create index follows_user_idx on public.follows (user_id, project_id);

alter table public.follows enable row level security;

-- Jumlah pengikut ada di halaman project, jadi barisnya memang terbuka.
create policy "pengikut terlihat"
  on public.follows for select
  to anon, authenticated
  using (true);

create policy "orang mengikuti atas namanya sendiri"
  on public.follows for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "berhenti mengikuti hanya untuk diri sendiri"
  on public.follows for delete
  to authenticated
  using (user_id = (select auth.uid()));

grant select         on public.follows to anon, authenticated;
grant insert, delete on public.follows to authenticated;

-- ------------------------------------------------------------------ komitmen

-- Berapa besar bantuan yang diminta, dengan kata-kata pemiliknya sendiri
-- ("± 2 jam per minggu", "fleksibel"). Kosong berarti belum ditentukan —
-- bukan berarti tanpa batas.
alter table public.seats
  add column commitment text not null default '',
  add constraint seats_commitment_len check (char_length(commitment) <= 80);

-- --------------------------------------------------------------------- level

/*
 * Empat level, bukan lima.
 *
 * 'validating' dilepas: bagi orang yang menjelajah, "sedang divalidasi" dan
 * "sedang dibangun" adalah hal yang sama — ada yang sedang mengerjakannya.
 * Yang membedakan keduanya adalah cerita, dan cerita sekarang punya tempatnya
 * sendiri di `updates`.
 *
 * Barisnya dipindahkan menurut bukti yang sudah ada, bukan diseragamkan:
 * project yang sudah punya tautan kerja naik ke 'building' (constraint
 * projects_building_needs_work menuntut itu), sisanya kembali ke 'idea'.
 * Constraint lama harus dilepas dulu, atau UPDATE-nya ditolak nilai lamanya.
 */
alter table public.projects drop constraint projects_stage_valid;

update public.projects
set stage = case
              when repo_url <> '' or doc_url <> '' or live_url <> '' then 'building'
              else 'idea'
            end
where stage = 'validating';

alter table public.projects
  add constraint projects_stage_valid check (stage in ('idea', 'building', 'live', 'resting'));

/*
 * "Sedang dibangun" boleh bersandar pada kalimat "sekarang".
 *
 * Sebelumnya level ini menuntut tautan kerja — repo, dokumen, atau produknya.
 * Itu memaksa orang yang baru mulai, dan belum punya apa pun untuk ditautkan,
 * berdiam di 'idea' padahal ia sedang mengerjakannya. Menuliskan apa yang
 * sedang dikerjakan sekarang adalah bukti yang sama sahihnya, dan bisa dicek
 * satu baris — yang penting bagi CHECK constraint, karena ia tidak bisa
 * melihat tabel lain.
 */
alter table public.projects drop constraint projects_building_needs_work;
alter table public.projects add constraint projects_building_needs_work check (
  stage not in ('building', 'live')
  or repo_url <> '' or doc_url <> '' or live_url <> '' or now_text <> ''
);

-- ------------------------------------------------------------------- jejak

/*
 * Satu jenis jejak baru: menulis kabar project.
 *
 * Daftarnya dieja di tiga tempat — CHECK di sini, CHECK pada
 * profiles.activity_hidden, dan EVENT_KINDS di app/lib/activity.ts. Keduanya
 * di sini harus dilepas dan dipasang ulang; menambah nilai ke CHECK tidak bisa
 * dilakukan setengah-setengah.
 */
alter table public.events drop constraint events_kind_valid;
alter table public.events add constraint events_kind_valid check (kind in (
  'project_created', 'project_stage_changed', 'seat_opened', 'seat_applied',
  'seat_filled', 'task_created', 'task_taken', 'task_done',
  'comment_posted', 'boost_given', 'update_posted'));

alter table public.profiles drop constraint profiles_activity_hidden_valid;
alter table public.profiles add constraint profiles_activity_hidden_valid check (
  activity_hidden <@ array[
    'project_created', 'project_stage_changed', 'seat_opened', 'seat_applied',
    'seat_filled', 'task_created', 'task_taken', 'task_done',
    'comment_posted', 'boost_given', 'update_posted']::text[]
);

create or replace function public.record_update_posted()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.record_event(new.author_id, new.project_id, 'update_posted',
    public.project_snapshot(new.project_id) || jsonb_build_object('update_title', new.title));
  return new;
end;
$$;

create trigger updates_record_event
  after insert on public.updates
  for each row execute function public.record_update_posted();

-- ------------------------------------------------------------------ overview

/*
 * Dibangun ulang untuk membawa dua hal baru: kalimat "sekarang", dan kapan
 * project ini terakhir bergerak.
 *
 * `last_activity_at` sengaja dihitung dari tabel yang policy SELECT-nya
 * `using (true)` semuanya — projects, updates, comments, tasks, seats. `events`
 * tidak dipakai justru karena ia menyaring menurut pilihan privasi pelakunya:
 * kesegaran sebuah project tidak boleh berubah-ubah tergantung siapa yang
 * membacanya.
 *
 * Di-drop lalu dibuat ulang, bukan CREATE OR REPLACE — pola yang sama dengan
 * 0004, 0006 dan 0007: replace diam-diam mempertahankan reloptions lama, jadi
 * penggantian yang lupa `security_invoker = true` akan berhenti menghormati RLS.
 */
drop view if exists public.project_overview;

create view public.project_overview with (security_invoker = true) as
select
  p.id, p.slug, p.title, p.tagline, p.owner_id, p.stage,
  p.problem, p.solution, p.audience,
  p.doc_url, p.live_url, p.repo_url,
  p.tags, p.glyph, p.created_at,
  p.now_text, p.now_updated_at,
  o.username as owner_username,
  o.name     as owner_name,
  (select count(*) from public.seats s where s.project_id = p.id)                         as seat_count,
  (select count(*) from public.seats s where s.project_id = p.id and s.status = 'open')   as open_seat_count,
  (select count(*) from public.seats s where s.project_id = p.id and s.status = 'filled') as active_member_count,
  (select coalesce(array_agg(distinct s.role), '{}'::text[])
     from public.seats s where s.project_id = p.id and s.status = 'open')                 as open_roles,
  (select count(*) from public.boosts   b where b.project_id = p.id)                      as boost_count,
  (select count(*) from public.follows  f where f.project_id = p.id)                      as follower_count,
  (select count(*) from public.comments c where c.project_id = p.id)                      as comment_count,
  (select count(*) from public.updates  u where u.project_id = p.id)                      as update_count,
  (select count(*) from public.tasks t where t.project_id = p.id and t.status <> 'done')  as open_task_count,
  (select count(*) from public.tasks t where t.project_id = p.id and t.status  = 'done')  as done_task_count,
  greatest(
    p.updated_at,
    coalesce((select max(u.created_at) from public.updates  u where u.project_id = p.id), p.updated_at),
    coalesce((select max(c.created_at) from public.comments c where c.project_id = p.id), p.updated_at),
    coalesce((select max(t.updated_at) from public.tasks    t where t.project_id = p.id), p.updated_at),
    coalesce((select max(s.created_at) from public.seats    s where s.project_id = p.id), p.updated_at)
  ) as last_activity_at
from public.projects p
join public.profiles o on o.id = p.owner_id;

grant select on public.project_overview to anon, authenticated;
