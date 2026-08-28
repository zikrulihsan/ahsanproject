import { cache } from "react";
import { getSupabase } from "./supabase";
import type { Person } from "./data";
import type { ProfileRow } from "./database.types";

export type Viewer = Person & { email: string };

/**
 * The signed-in visitor, or `null` for a guest.
 *
 * Uses `getUser()` rather than `getSession()`: the session cookie is whatever
 * the browser sent, while `getUser()` has the auth server vouch for it. Pages
 * decide what to show from this, but the database decides what may actually
 * happen — see `supabase/migrations/0003_policies.sql`.
 *
 * Wrapped in cache() because both the header and the page body ask who is
 * looking, and getUser() is a network round trip to the auth server — without
 * this, every page paid for it twice.
 */
export const currentViewer = cache(async (): Promise<Viewer | null> => {
  try {
    const supabase = await getSupabase();
    if (!supabase) return null;

    const {
      data: { user },
    } = await supabase.auth.getUser();
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
