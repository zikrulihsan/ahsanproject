"use client";

import { ROLE_GROUPS, ROLES, roleMeta, type Role } from "../lib/roles";

/** One shared picker so every project opens positions from the same catalogue. */
export function RoleSelect({
  id,
  name = "role",
  defaultValue = "",
  onValueChange,
}: {
  id: string;
  name?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}) {
  return (
    <select
      id={id}
      name={name}
      defaultValue={defaultValue}
      required
      onChange={(event) => onValueChange?.(event.target.value)}
    >
      <option value="" disabled>Pilih role…</option>
      {ROLE_GROUPS.map((group) => (
        <optgroup key={group} label={group}>
          {ROLES.filter((role) => roleMeta[role].group === group).map((role) => (
            <option key={role} value={role}>
              {roleMeta[role].label} — {roleMeta[role].blurb}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

export const DEFAULT_ROLE: Role = "product-manager";
