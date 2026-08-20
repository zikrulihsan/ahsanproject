import { eq } from "drizzle-orm";
import { getChatGPTUser } from "../chatgpt-auth";
import { getDb } from "../../db";
import { users } from "../../db/schema";
import { slugify } from "./brief";
import type { Person } from "./data";

export type Viewer = Person & {
  /** False when the visitor is signed in but there is no database to record them in. */
  persisted: boolean;
};

/**
 * The signed-in visitor, given a profile row the first time they show up.
 *
 * Returns `null` for anonymous visitors. Sign-in itself is handled by the
 * hosting platform — see `app/chatgpt-auth.ts`.
 */
export async function currentViewer(): Promise<Viewer | null> {
  const auth = await getChatGPTUser();
  if (!auth) return null;

  const name = auth.fullName?.trim() || auth.email.split("@")[0];
  const db = await getDb();
  if (!db) {
    return {
      id: auth.userId,
      username: slugify(name) || "tamu",
      name,
      headline: "",
      bio: "",
      website: "",
      github: "",
      persisted: false,
    };
  }

  const [existing] = await db.select().from(users).where(eq(users.id, auth.userId)).limit(1);
  if (existing) return { ...existing, persisted: true };

  const [created] = await db
    .insert(users)
    .values({
      id: auth.userId,
      username: await freeUsername(name || auth.email),
      name,
      email: auth.email,
    })
    .returning();

  return { ...created, persisted: true };
}

/** A username nobody has taken yet, derived from the person's name. */
async function freeUsername(seed: string): Promise<string> {
  const db = await getDb();
  const base = slugify(seed.split("@")[0]) || "orang";
  if (!db) return base;

  for (let suffix = 0; suffix < 50; suffix += 1) {
    const candidate = suffix === 0 ? base : `${base}-${suffix + 1}`;
    const [taken] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, candidate))
      .limit(1);
    if (!taken) return candidate;
  }

  return `${base}-${Date.now().toString(36)}`;
}
