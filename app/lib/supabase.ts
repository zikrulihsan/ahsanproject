import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export type Supabase = SupabaseClient<Database>;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Whether this deployment has a Supabase project behind it.
 *
 * `false` is a supported state, not a bug: a checkout with no `.env.local`
 * still builds, still renders, and still runs its tests — `app/lib/data.ts`
 * serves the read-only seed instead. Writes refuse loudly; see `requireSupabase`.
 */
export function supabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}

/**
 * A Supabase client carrying the visitor's session.
 *
 * Every query it makes runs as that person, so the row level security policies
 * in `supabase/migrations/0003_policies.sql` are what actually decide who may
 * read and write. The checks in the server actions only exist to turn a refusal
 * into a sentence somebody can read.
 */
export async function getSupabase(): Promise<Supabase | null> {
  if (!supabaseConfigured()) return null;

  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components may not set cookies. The middleware refreshes the
          // session on every request, so nothing is lost by ignoring this.
        }
      },
    },
  });
}

export class SupabaseUnavailableError extends Error {
  constructor() {
    super(
      "Belum ada Supabase yang terpasang, jadi perubahan tidak bisa disimpan. " +
        "Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY lalu jalankan ulang.",
    );
    this.name = "SupabaseUnavailableError";
  }
}

export async function requireSupabase(): Promise<Supabase> {
  const supabase = await getSupabase();
  if (!supabase) throw new SupabaseUnavailableError();
  return supabase;
}
