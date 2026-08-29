"use client";

import { useEffect, useRef, useState } from "react";

type ShareStatus = "idle" | "copied" | "error";

export function ShareProfileButton({
  name,
  path,
}: {
  name: string;
  path: string;
}) {
  const [status, setStatus] = useState<ShareStatus>("idle");
  const resetTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    };
  }, []);

  const showStatus = (next: Exclude<ShareStatus, "idle">) => {
    setStatus(next);
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setStatus("idle"), 2400);
  };

  const share = async () => {
    const url = new URL(path, window.location.origin).toString();

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${name} — Ahsan Project`,
          text: `View ${name}'s profile and work on Ahsan Project.`,
          url,
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    try {
      await copyToClipboard(url);
      showStatus("copied");
    } catch {
      showStatus("error");
    }
  };

  const label =
    status === "copied"
      ? "Link copied"
      : status === "error"
        ? "Could not copy link"
        : "Share profile";

  return (
    <div className="profile-share-control">
      <button
        aria-label={label}
        className="profile-share-button"
        title="Share profile"
        type="button"
        onClick={share}
      >
        {status === "copied" ? <CheckIcon /> : <ShareIcon />}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {status === "copied"
          ? "Profile link copied."
          : status === "error"
            ? "Could not copy profile link."
            : ""}
      </span>
    </div>
  );
}

async function copyToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  const copied = document.execCommand("copy");
  input.remove();
  if (!copied) throw new Error("The browser could not copy the link.");
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12.5 4.3 4.3L19 7" />
    </svg>
  );
}
