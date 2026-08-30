/**
 * A short, shared starting point for project topics.
 *
 * These are suggestions rather than a closed taxonomy: a project can still
 * add a topic that is not here. Keeping the list short removes the blank-page
 * problem without forcing unusual projects into the wrong bucket.
 */
export const SUGGESTED_TOPICS = [
  "education",
  "health",
  "community",
  "small business",
  "environment",
  "technology",
  "faith",
  "family",
  "careers",
  "finance",
  "public services",
  "creative",
] as const;

import { tx, type Locale } from "./locale";

const TOPIC_ID: Record<(typeof SUGGESTED_TOPICS)[number], string> = {
  education: "pendidikan",
  health: "kesehatan",
  community: "komunitas",
  "small business": "usaha kecil",
  environment: "lingkungan",
  technology: "teknologi",
  faith: "keagamaan",
  family: "keluarga",
  careers: "karier",
  finance: "keuangan",
  "public services": "layanan publik",
  creative: "kreatif",
};

export function topicLabel(topic: string, locale: Locale): string {
  return topic in TOPIC_ID
    ? tx(locale, TOPIC_ID[topic as keyof typeof TOPIC_ID], topic)
    : topic;
}
