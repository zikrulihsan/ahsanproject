import { ROLE_GROUPS, ROLES, roleMeta, type Role } from "../lib/roles";

/** One shared picker so every project opens positions from the same catalogue. */
export function RoleSelect({
  id,
  name = "role",
  defaultValue = "product-manager",
}: {
  id: string;
  name?: string;
  defaultValue?: string;
}) {
  return (
    <select id={id} name={name} defaultValue={defaultValue} required>
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
