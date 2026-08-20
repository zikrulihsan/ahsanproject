/**
 * `cloudflare:workers` only exists inside the workerd runtime, so there is no
 * package to pull types from. Declare the one binding this site reads.
 */
declare module "cloudflare:workers" {
  export const env: { DB?: import("drizzle-orm/d1").AnyD1Database };
}
