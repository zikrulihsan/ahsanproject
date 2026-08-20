"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSupabase } from "./lib/supabase";
import { safeNextPath } from "./lib/urls";
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

  // With email confirmation switched on there is no session yet, and the person
  // has to open the link before they can do anything.
  if (!data.session) {
    return {
      notice: `Kami kirim tautan konfirmasi ke ${email}. Buka tautannya untuk menyelesaikan pendaftaran.`,
      values,
    };
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signIn(_state: AuthState, formData: FormData): Promise<AuthState> {
  const email = text(formData, "email").toLowerCase();
  const password = raw(formData, "password");
  const next = safeNextPath(text(formData, "next"));

  const supabase = await requireSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: translate(error.message), values: { email, next } };

  revalidatePath("/", "layout");
  redirect(next);
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
  };

  return known[message] ?? message;
}
