import { cache } from "react";
import { getSupabase } from "./supabase";
import type { Person } from "./data";
import type { ProfileRow } from "./database.types";

export type Viewer = Person & { email: string };

/**
 * The account the request is signed in as, or `null` for a guest.
 *
 * Uses `getUser()` rather than `getSession()`: the session cookie is whatever
 * the browser sent, while `getUser()` has the auth server vouch for it. Pages
 * decide what to show from this, but the database decides what may actually
 * happen — see `supabase/migrations/0003_policies.sql`.
 *
 * Wrapped in cache() because it is a network round trip to the auth server and
 * several things on a page want to know who is asking. Both `viewerId` and
 * `currentViewer` go through here, so a page pays for it once however many of
 * them it calls.
 */
const authUser = cache(async () => {
  try {
    const supabase = await getSupabase();
    if (!supabase) return null;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    // Identity only personalises public pages. If Auth is temporarily down,
    // keep those pages available as a guest and let protected actions deny the
    // request normally instead of breaking the whole streamed response.
    console.error("[ahsan] Sesi pengunjung gagal dibaca; lanjut sebagai tamu.", error);
    return null;
  }
});

/**
 * Who is asking, and nothing else about them.
 *
 * `currentViewer()` also reads the profile row, which is a second round trip
 * and everything a header needs. A caller that only wants to look something up
 * by id — the board's role history, an activity tag on a write — should not
 * wait for a name and a bio it will not render.
 */
export async function viewerId(): Promise<string | null> {
  return (await authUser())?.id ?? null;
}

/**
 * The signed-in visitor with their public profile, or `null` for a guest.
 */
export const currentViewer = cache(async (): Promise<Viewer | null> => {
  try {
    const supabase = await getSupabase();
    if (!supabase) return null;

    const user = await authUser();
    if (!user) return null;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) throw new Error(profileError.message);

    if (profile) return toViewer(profile, user.email ?? "");

    // The sign-up trigger creates the profile, so this is the unlikely path:
    // an auth user that lost its public half. Put it back rather than showing
    // somebody a half-signed-in site they cannot escape.
    const fallbackName =
      (user.user_metadata?.name as string | undefined)?.trim() ||
      user.email?.split("@")[0] ||
      "Orang";
    const { data: created, error: createError } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        username: `orang-${user.id.slice(0, 8)}`,
        name: fallbackName.slice(0, 80),
      })
      .select("*")
      .maybeSingle();
    if (createError) throw new Error(createError.message);

    return created ? toViewer(created, user.email ?? "") : null;
  } catch (error) {
    // Identity only personalises public pages. If Auth is temporarily down,
    // keep those pages available as a guest and let protected actions deny the
    // request normally instead of breaking the whole streamed response.
    console.error("[ahsan] Sesi pengunjung gagal dibaca; lanjut sebagai tamu.", error);
    return null;
  }
});

function toViewer(profile: ProfileRow, email: string): Viewer {
  return {
    id: profile.id,
    username: profile.username,
    name: profile.name,
    profession: profile.profession ?? "",
    headline: profile.headline ?? "",
    bio: profile.bio ?? "",
    skills: profile.skills ?? [],
    yearsExperience: profile.years_experience ?? null,
    fields: profile.fields ?? [],
    website: profile.website ?? "",
    publicEmail: profile.public_email ?? "",
    github: profile.github ?? "",
    linkedin: profile.linkedin ?? "",
    x: profile.x_url ?? "",
    resume: profile.resume_url ?? "",
    activityHidden: profile.activity_hidden ?? [],
    email,
  };
}
