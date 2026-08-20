/**
 * Turns `app/lib/seed.ts` into the SQL seed migration.
 *
 * Run after editing the seed data:
 *   node --experimental-strip-types scripts/generate-seed-sql.mjs
 *
 * The generated file is a normal Drizzle migration, so the hosting platform
 * applies it to D1 on the next deploy. Statements are INSERT OR IGNORE so a
 * replay never clobbers rows people have since edited.
 */
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { seedProjects, seedUsers } from "../app/lib/seed.ts";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "drizzle", "0001_seed.sql");

const quote = (value) => `'${String(value).replace(/'/g, "''")}'`;

const lines = [
  "-- Seed data for Ahsan Project. Generated from app/lib/seed.ts —",
  "-- run `node --experimental-strip-types scripts/generate-seed-sql.mjs` after editing it.",
  "",
];

for (const user of seedUsers) {
  lines.push(
    "INSERT OR IGNORE INTO `users` (`id`, `username`, `name`, `email`, `headline`, `bio`, `website`, `github`) VALUES (" +
      [user.id, user.username, user.name, "", user.headline, user.bio, user.website, user.github]
        .map(quote)
        .join(", ") +
      ");",
  );
}
lines.push("", "--> statement-breakpoint", "");

let seatId = 0;
for (const project of seedProjects) {
  lines.push(
    "INSERT OR IGNORE INTO `projects` (`id`, `slug`, `title`, `tagline`, `owner_id`, `stage`, `problem`, `solution`, `audience`, `doc_url`, `live_url`, `repo_url`, `tags`, `accent`, `glyph`, `created_at`, `updated_at`) VALUES (" +
      [
        project.id,
        quote(project.slug),
        quote(project.title),
        quote(project.tagline),
        quote(project.ownerId),
        quote(project.stage),
        quote(project.problem),
        quote(project.solution),
        quote(project.audience),
        quote(project.docUrl),
        quote(project.liveUrl),
        quote(project.repoUrl),
        quote(project.tags),
        quote(project.accent),
        quote(project.glyph),
        quote(project.createdAt),
        quote(project.createdAt),
      ].join(", ") +
      ");",
  );

  for (const seat of project.seats) {
    seatId += 1;
    lines.push(
      "INSERT OR IGNORE INTO `seats` (`id`, `project_id`, `role`, `brief`, `status`, `user_id`, `pitch`) VALUES (" +
        [
          seatId,
          project.id,
          quote(seat.role),
          quote(seat.brief),
          quote(seat.status),
          seat.userId ? quote(seat.userId) : "NULL",
          quote(seat.pitch),
        ].join(", ") +
        ");",
    );
  }
}

await writeFile(OUT, lines.join("\n") + "\n", "utf8");
console.log(`wrote ${OUT} (${seedUsers.length} users, ${seedProjects.length} projects)`);
