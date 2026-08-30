import { tx, type Locale } from "./locale";

export const AVAILABILITY_STATUSES = [
  "open_to_work",
  "open_to_collaboration",
  "open_to_both",
  "not_open",
] as const;

export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number];

export const DEFAULT_AVAILABILITY: AvailabilityStatus = "open_to_collaboration";

export function isAvailabilityStatus(value: string): value is AvailabilityStatus {
  return (AVAILABILITY_STATUSES as readonly string[]).includes(value);
}

/** Keep older profile rows readable while the availability migration rolls out. */
export function availabilityStatus(value: unknown): AvailabilityStatus {
  return typeof value === "string" && isAvailabilityStatus(value)
    ? value
    : DEFAULT_AVAILABILITY;
}

export function availabilityLabel(status: AvailabilityStatus, locale: Locale): string {
  const labels: Record<AvailabilityStatus, [string, string]> = {
    open_to_both: ["Terbuka untuk kerja & kolaborasi", "Open to work & collaboration"],
    open_to_work: ["Terbuka untuk peluang kerja", "Open to work"],
    open_to_collaboration: ["Terbuka untuk kolaborasi", "Open to collaboration"],
    not_open: ["Belum terbuka untuk peluang", "Not open to opportunities"],
  };
  return tx(locale, ...labels[status]);
}

export function isOpenToCollaboration(status: AvailabilityStatus): boolean {
  return status === "open_to_collaboration" || status === "open_to_both";
}

