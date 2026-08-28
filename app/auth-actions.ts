"use server";

import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import { requireSupabase } from "./lib/supabase";
import { safeNextPath, startPath } from "./lib/urls";
import { tags } from "./lib/cache-tags";
import { siteOrigin } from "./lib/origin";

export type AuthState = {
  error?: string;
  notice?: string;
  values: { email?: string; name?: string; next?: string };
};

const MIN_PASSWORD = 8;

export async function signUp(_state: AuthState, formData: FormData): Promise<AuthState> {
  const email = text(formData, "email").toLowerCase();
  const name = text(formData, "name");
  const password = raw(formData, "password");
  const confirm = raw(formData, "confirm");
  const next = safeNextPath(text(formData, "next"));
  const values = { email, name, next };

  if (!email.includes("@")) return { error: "Alamat emailnya belum benar.", values };
  if (name.length < 2) return { error: "Isi namamu, minimal dua huruf.", values };
  if (password.length < MIN_PASSWORD) {
    return { error: `Kata sandi minimal ${MIN_PASSWORD} karakter.`, values };
  }
  if (password !== confirm) return { error: "Ulangan kata sandinya belum sama.", values };

  const supabase = await requireSupabase();
  const origin = await siteOrigin();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name: name.slice(0, 80) },
      emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) return { error: translate(error.message), values };

  // A trigger creates the public profile alongside the auth user, so the people
  // directory is now missing somebody. It is cached and shared, so it has to be
  // told rather than left to notice on its own.
  updateTag(tags.people);

  // With email confirmation switched on there is no session yet, and the person
  // has to open the link before they can do anything.
  if (!data.session) {
    return {
      notice: `Kami kirim tautan konfirmasi ke ${email}. Buka tautannya untuk menyelesaikan pendaftaran.`,
      values,
    };
  }

  revalidatePath("/", "layout");
  redirect(startPath(next));
}

export async function signIn(_state: AuthState, formData: FormData): Promise<AuthState> {
  const email = text(formData, "email").toLowerCase();
  const password = raw(formData, "password");
  const next = safeNextPath(text(formData, "next"));

  const supabase = await requireSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: translate(error.message), values: { email, next } };

  revalidatePath("/", "layout");
  redirect(startPath(next));
}

/** Starts Google's OAuth flow and returns through the app's PKCE callback. */
export async function signInWithGoogle(formData: FormData): Promise<void> {
  const next = safeNextPath(text(formData, "next"));
  const supabase = await requireSupabase();
  const origin = await siteOrigin();
  const callback = new URL("/auth/callback", origin);
  callback.searchParams.set("next", next);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callback.toString(),
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    const destination = new URL("/signin", origin);
    destination.searchParams.set("error", "google-gagal");
    if (next !== "/") destination.searchParams.set("next", next);
    redirect(destination.toString());
  }

  redirect(data.url);
}

/**
 * Sends the "set a new password" link.
 *
 * The answer is the same whether or not the address is registered: telling a
 * stranger which emails have accounts here is not something a login page
 * should do. The link lands on /auth/confirm, which trades the token for a
 * session and forwards to the form below.
 */
export async function requestPasswordReset(
  _state: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = text(formData, "email").toLowerCase();
  const values = { email };

  if (!email.includes("@")) return { error: "Alamat emailnya belum benar.", values };

  const supabase = await requireSupabase();
  const origin = await siteOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=${encodeURIComponent("/akun/password")}`,
  });
  // A rate limit is worth saying out loud; anything else stays behind the
  // same neutral notice, so a failure cannot be read as "this email exists".
  if (error && /rate|limit|too many/i.test(error.message)) {
    return { error: "Terlalu sering meminta. Tunggu sebentar lalu coba lagi.", values };
  }

  return {
    notice:
      `Kalau ${email} terdaftar di sini, tautan untuk menyetel ulang kata sandi sudah dikirim. ` +
      "Tautannya berlaku sebentar saja, jadi buka segera.",
    values,
  };
}

/**
 * Sets the new password, using the session the recovery link established.
 *
 * Without that session there is nobody to update, so this refuses rather than
 * guessing — an expired link should send somebody back to ask for a new one.
 */
export async function updatePassword(_state: AuthState, formData: FormData): Promise<AuthState> {
  const password = raw(formData, "password");
  const confirm = raw(formData, "confirm");

  if (password.length < MIN_PASSWORD) {
    return { error: `Kata sandi minimal ${MIN_PASSWORD} karakter.`, values: {} };
  }
  if (password !== confirm) return { error: "Ulangan kata sandinya belum sama.", values: {} };

  const supabase = await requireSupabase();
  const { data: session } = await supabase.auth.getUser();
  if (!session.user) {
    return {
      error:
        "Tautannya sudah kedaluwarsa atau sudah dipakai. Minta tautan baru lewat “Lupa kata sandi”.",
      values: {},
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: translate(error.message), values: {} };

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signOut(): Promise<void> {
  const supabase = await requireSupabase();
  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/");
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/** Passwords keep their whitespace — trimming would silently change them. */
function raw(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/** Supabase answers in English; these are the ones people actually hit. */
function translate(message: string): string {
  const known: Record<string, string> = {
    "Invalid login credentials": "Email atau kata sandinya tidak cocok.",
    "Email not confirmed": "Emailnya belum dikonfirmasi. Cek kotak masuk kamu dulu.",
    "User already registered": "Email ini sudah terdaftar. Coba masuk saja.",
    "New password should be different from the old password.":
      "Kata sandi barunya masih sama dengan yang lama.",
  };

  return known[message] ?? message;
}
