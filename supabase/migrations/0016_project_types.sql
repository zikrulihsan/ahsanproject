-- Jenis project: kenapa ia ada, dan apa artinya ikut mengerjakannya.
--
-- Sampai sekarang sebuah project cuma bisa dibedakan dari tahapnya (sejauh apa)
-- dan topiknya (tentang apa). Keduanya tidak menjawab pertanyaan yang paling
-- menentukan bagi orang yang mau ikut: ini project iseng akhir pekan, project
-- komunitas, produk yang sudah dipakai orang, atau usaha yang menghasilkan
-- uang? Role yang dibuka bisa sama persis, tapi keempatnya adalah kesepakatan
-- yang berbeda. Kolom ini yang menyimpannya, dan Explore memakainya sebagai
-- saringan tersendiri.
--
-- Sengaja tegak lurus terhadap `stage`. 'live' berarti sudah bisa dibuka orang
-- lain — itu ketersediaan, bukan alasan project ini ada. Sebuah pet project
-- boleh saja 'live', dan sebuah project komersial boleh saja masih 'idea'.

alter table public.projects
  add column project_type text not null default '';

/*
 * Kosong itu nilai yang sah, dan artinya "belum disebutkan".
 *
 * Setiap baris yang sudah ada dibuat sebelum pertanyaan ini pernah ditanyakan,
 * jadi menebakkan salah satu jenis untuk mereka sama saja menempelkan klaim
 * yang tidak pernah dibuat pemiliknya — persis hal yang paling dihindari papan
 * ini. Project baru wajib memilih (lihat createProject di app/actions.ts),
 * jadi kekosongan ini menutup sendiri seiring waktu, bukan ditambal sekarang.
 */
alter table public.projects
  add constraint projects_type_valid
  check (project_type in ('', 'pet', 'community', 'product', 'commercial'));

create index projects_type_idx on public.projects (project_type);

-- Project bawaan dari supabase/seed.sql diisi menurut apa adanya, sama seperti
-- 0015 mengisi logo FlipCard: yang di-set di sini hanya baris yang memang
-- ditanam berkas seed itu, dan hanya kalau pemiliknya belum menyebut sendiri.
update public.projects set project_type = 'pet'
where slug = 'tap-tap-dzikr' and project_type = '';

update public.projects set project_type = 'product'
where slug in ('wecard', 'carikontak') and project_type = '';

update public.projects set project_type = 'commercial'
where slug in ('invoice-cepat', 'warung-antre') and project_type = '';

update public.projects set project_type = 'community'
where slug in ('main-aman', 'swegrowth', 'titip-jemput') and project_type = '';

/*
 * Dibangun ulang supaya papan bisa menyaring tanpa membaca tabel projects
 * secara terpisah.
 *
 * Di-drop lalu dibuat ulang, bukan CREATE OR REPLACE — alasannya sama seperti
 * 0004, 0006, 0007, 0010 dan 0015: replace diam-diam mempertahankan reloptions
 * lama, jadi penggantian yang lupa `security_invoker = true` akan berhenti
 * menghormati RLS.
 */
drop view if exists public.project_overview;

create view public.project_overview with (security_invoker = true) as
select
  p.id, p.slug, p.title, p.tagline, p.owner_id, p.stage, p.project_type,
  p.problem, p.solution, p.audience,
  p.doc_url, p.live_url, p.repo_url, p.logo_url,
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
