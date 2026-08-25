import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";

/**
 * Smoke test against a real Supabase project.
 *
 * Skips unless NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are
 * set, so a checkout without credentials still runs a green suite. Read-only on
 * purpose — it must be safe to point at production. The write paths are covered
 * against a scratch database by supabase/tests/policies.sql.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const skip = url && anonKey ? false : "NEXT_PUBLIC_SUPABASE_URL/ANON_KEY belum diisi";

const supabase = skip ? null : createClient(url, anonKey);

test("the board is readable without signing in", { skip }, async () => {
  const { error } = await supabase.from("project_overview").select("slug, stage, boost_count").limit(1);
  assert.equal(error, null, error?.message);
});

test("the overview view exposes every count a card needs", { skip }, async () => {
  const { data, error } = await supabase.from("project_overview").select("*").limit(1);
  assert.equal(error, null, error?.message);

  if (data?.length) {
    for (const column of [
      "owner_username",
      "owner_name",
      "logo_url",
      "seat_count",
      "open_seat_count",
      "open_roles",
      "active_member_count",
      "boost_count",
      "comment_count",
      "open_task_count",
      "done_task_count",
    ]) {
      assert.ok(column in data[0], `kolom ${column} hilang dari project_overview`);
    }
  }
});

test("a guest cannot post a project", { skip }, async () => {
  const { error } = await supabase.from("projects").insert({
    slug: `uji-tamu-${Date.now()}`,
    title: "Uji Tamu",
    tagline: "Percobaan menaruh ide tanpa masuk, harus ditolak.",
    owner_id: "00000000-0000-4000-8000-000000000000",
    problem: "m".repeat(130),
    solution: "s".repeat(130),
    audience: "u".repeat(45),
    tags: ["uji"],
  });

  assert.notEqual(error, null, "tamu seharusnya tidak bisa menaruh ide");
});

test("a guest cannot take a seat", { skip }, async () => {
  const { error } = await supabase.rpc("apply_for_seat", { seat_id: 1, pitch: "Tamu melamar." });
  assert.notEqual(error, null, "tamu seharusnya tidak bisa mengambil peran");
});

test("a guest cannot read anybody's notices", { skip }, async () => {
  // The SELECT policy in 0008 grants nothing to anon, so this comes back empty
  // rather than showing a stranger somebody else's news.
  const { data } = await supabase.from("notices").select("id").limit(1);
  assert.equal(data?.length ?? 0, 0, "tamu seharusnya tidak melihat kabar siapa pun");
});
