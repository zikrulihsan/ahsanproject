import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export type Db = ReturnType<typeof drizzle<typeof schema>>;

let cached: Db | null | undefined;

/**
 * The Drizzle client for the Cloudflare D1 binding, or `null` when no database
 * is attached to this deployment.
 *
 * `null` is a supported state, not a bug: local development and the build-time
 * render both run without a binding, and `app/lib/data.ts` falls back to the
 * bundled seed so the site still renders (read-only). Writes refuse loudly
 * instead — see `requireDb()`.
 *
 * The binding lives on the `cloudflare:workers` module, which only exists
 * inside workerd, so the import is dynamic and guarded.
 */
export async function getDb(): Promise<Db | null> {
  if (cached !== undefined) return cached;

  try {
    const { env } = await import("cloudflare:workers");
    cached = env?.DB ? drizzle(env.DB, { schema }) : null;
  } catch {
    cached = null;
  }

  return cached;
}

export class DatabaseUnavailableError extends Error {
  constructor() {
    super(
      "Belum ada database yang terpasang, jadi perubahan tidak bisa disimpan. " +
        "Set `d1` ke \"DB\" di .openai/hosting.json lalu deploy ulang.",
    );
    this.name = "DatabaseUnavailableError";
  }
}

export async function requireDb(): Promise<Db> {
  const db = await getDb();
  if (!db) throw new DatabaseUnavailableError();
  return db;
}
