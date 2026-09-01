-- Ahsan Project: the feedback box.
--
-- Everything else this site stores is written to be read back by other people:
-- projects, roles, comments, trails. This is the one table that is not. A
-- masukan is addressed to whoever maintains the site — "alur daftarnya bikin
-- bingung", "halaman ini error terus" — and publishing it would turn a private
-- report into something the whole board reads before anybody has looked at it.
--
-- So the table has no select policy and no select grant. It is written through
-- submit_feedback() below and read in the Supabase dashboard, the same shape
-- `events` (0005) and `notices` (0008) use for rows nobody may forge.

create table public.feedback (
  id         bigint      generated always as identity primary key,
  -- Null for a guest, and null again once an account is deleted: the report is
  -- about the product, and it stays true after whoever sent it has left.
  author_id  uuid        references public.profiles (id) on delete set null,
  kind       text        not null,
  message    text        not null,
  -- Optional, and only so somebody can be answered. A guest has nowhere else
  -- to put a reply address; a signed-in visitor already has one on file, which
  -- `author_id` leads to.
  contact    text        not null default '',
  -- Triage state for whoever reads the box, so a report that has been dealt
  -- with stops coming back up.
  handled    boolean     not null default false,
  created_at timestamptz not null default now(),

  -- The same five kinds as app/lib/feedback.ts, and the same ceilings. They are
  -- repeated rather than inferred: a mismatch would turn a fixable typo into a
  -- constraint error nobody can read.
  constraint feedback_kind_valid check (kind in ('bug', 'idea', 'confusing', 'praise', 'other')),
  constraint feedback_message_len check (char_length(message) between 10 and 2000),
  constraint feedback_contact_len check (char_length(contact) <= 254)
);

-- The box is read as "what is still waiting, newest first".
create index feedback_unhandled_idx on public.feedback (created_at desc) where not handled;

-- ------------------------------------------------------------------ writing

/*
 * The only thing that writes a masukan.
 *
 * Same reasoning as record_notice() in 0008: an insert grant on the table would
 * have to be given to `anon`, and the anon key is public — so the table needs no
 * grant at all, and every row arrives through here.
 *
 * A guest may call it. That is the point of a feedback page: somebody who
 * cannot get past the sign-in screen is exactly the person with something to
 * report, and asking them to make an account first is asking them not to
 * bother. The cost is that the cap below only bites on a signed-in caller,
 * since a guest has no identity to count. That is the honest limit of this
 * design, not an oversight: abuse from guests has to be answered at the edge
 * (rate limiting in the host) or by closing the guest route entirely.
 */
create or replace function public.submit_feedback(
  feedback_kind text,
  message text default '',
  contact text default ''
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller   uuid := auth.uid();
  said     text := left(btrim(coalesce(message, '')), 2000);
  reply_to text := left(btrim(coalesce(contact, '')), 254);
  recent   int;
begin
  if feedback_kind is null or feedback_kind not in ('bug', 'idea', 'confusing', 'praise', 'other') then
    raise exception 'Pilih dulu jenis masukannya.' using errcode = '22023';
  end if;
  if char_length(said) < 10 then
    raise exception 'Ceritakan masukanmu sedikit lebih panjang.' using errcode = '22023';
  end if;

  if caller is not null then
    select count(*) into recent
    from public.feedback f
    where f.author_id = caller and f.created_at > now() - interval '1 hour';

    if recent >= 5 then
      raise exception 'Masukanmu sudah masuk beberapa kali dalam sejam terakhir. Coba lagi nanti.'
        using errcode = '53400';
    end if;
  end if;

  insert into public.feedback (author_id, kind, message, contact)
  values (caller, feedback_kind, said, reply_to);
end;
$$;

revoke all on function public.submit_feedback(text, text, text) from public;
grant execute on function public.submit_feedback(text, text, text) to anon, authenticated;

-- ------------------------------------------------------------------ reading

alter table public.feedback enable row level security;

/*
 * No policy, on purpose.
 *
 * Row level security with nothing granting access denies everything, which is
 * the correct answer for both roles here: a visitor may not read the box, and
 * the person who sent a masukan has no page that shows it back to them. The
 * revoke is belt and braces — Supabase grants new tables to both roles by
 * default, and an unreadable table should not depend on remembering that RLS
 * would have caught it anyway.
 */
revoke all on public.feedback from anon, authenticated;

comment on table public.feedback is
  'Masukan sent to the maintainers. Written only by submit_feedback(); read in the dashboard.';
