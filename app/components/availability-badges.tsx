import {
  isOpenToCollaboration,
  type AvailabilityStatus,
} from "../lib/availability";
import { tx, type Locale } from "../lib/locale";

export function AvailabilityBadges({
  status,
  fields,
  skills,
  locale,
}: {
  status: AvailabilityStatus;
  fields: string[];
  skills: string[];
  locale: Locale;
}) {
  const focus = (fields.length > 0 ? fields : skills).slice(0, 2);

  return (
    <div className="availability">
      <div className="availability-badges" aria-label={tx(locale, "Status peluang", "Opportunity status")}>
        {status === "open_to_work" || status === "open_to_both" ? (
          <span className="availability-badge availability-work">
            <i aria-hidden="true" /> {tx(locale, "Terbuka untuk kerja", "Open to work")}
          </span>
        ) : null}
        {isOpenToCollaboration(status) ? (
          <span className="availability-badge availability-collaboration">
            <i aria-hidden="true" /> {tx(locale, "Terbuka untuk kolaborasi", "Open to collaboration")}
          </span>
        ) : null}
        {status === "not_open" ? (
          <span className="availability-badge availability-closed">
            {tx(locale, "Belum terbuka untuk peluang", "Not open to opportunities")}
          </span>
        ) : null}
      </div>

      {isOpenToCollaboration(status) && focus.length > 0 ? (
        <p className="availability-focus">
          {tx(locale, "Kolaborasi di", "Collaboration in")} {focus.join(" · ")}
        </p>
      ) : null}
    </div>
  );
}

