"use client";

import { useState } from "react";
import { MAXIMUM } from "../lib/brief";
import { RoleSelect } from "./role-select";

/** A catalogue role plus a named escape hatch when the catalogue does not fit. */
export function RoleFields({
  id,
  roleName = "role",
  roleTitleName = "roleTitle",
  defaultRole = "",
  defaultRoleTitle = "",
  roleError,
  roleTitleError,
}: {
  id: string;
  roleName?: string;
  roleTitleName?: string;
  defaultRole?: string;
  defaultRoleTitle?: string;
  roleError?: string;
  roleTitleError?: string;
}) {
  const [role, setRole] = useState(defaultRole);

  return (
    <div className="role-fields">
      <label htmlFor={id}>Open role</label>
      <RoleSelect
        id={id}
        name={roleName}
        defaultValue={defaultRole}
        onValueChange={setRole}
      />
      <p className="hint role-catalogue-hint">
        Search the catalogue. If it is not there, choose “Other role”.
      </p>
      {roleError ? <p className="field-error role-field-error" role="alert">{roleError}</p> : null}

      <div
        className={roleTitleError ? "field has-error" : "field"}
        hidden={role !== "other"}
      >
        <label htmlFor={`${id}-title`}>Other role name</label>
        <input
          id={`${id}-title`}
          name={roleTitleName}
          type="text"
          defaultValue={defaultRoleTitle}
          maxLength={MAXIMUM.roleTitle}
          required={role === "other"}
          disabled={role !== "other"}
          aria-invalid={roleTitleError ? true : undefined}
          placeholder="For example: Videographer, Treasurer, Event coordinator"
        />
        {roleTitleError ? <p className="field-error" role="alert">{roleTitleError}</p> : null}
      </div>
    </div>
  );
}
