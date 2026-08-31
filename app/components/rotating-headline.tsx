'use client';

import { useEffect, useState } from "react";
import { useLanguage } from "./language-provider";

const PHRASES = {
  id: ["Kolaborator", "Tech recruiters", "Hiring manager", "Tim tech"],
  en: ["Collaborators", "Tech recruiters", "Hiring managers", "Tech teams"],
} as const;

export function RotatingHeadline() {
  const { locale, tx } = useLanguage();
  const phrases = PHRASES[locale];
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [characterCount, setCharacterCount] = useState(phrases[0].length);
  const [isDeleting, setIsDeleting] = useState(false);
  const phrase = phrases[phraseIndex];

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let delay = isDeleting ? 45 : 90;

    if (!isDeleting && characterCount === phrase.length) delay = 1200;
    if (isDeleting && characterCount === 0) delay = 220;

    const timeout = window.setTimeout(() => {
      if (!isDeleting && characterCount < phrase.length) {
        setCharacterCount((count) => count + 1);
      } else if (!isDeleting) {
        setIsDeleting(true);
      } else if (characterCount > 0) {
        setCharacterCount((count) => count - 1);
      } else {
        const nextIndex = (phraseIndex + 1) % phrases.length;
        setPhraseIndex(nextIndex);
        setCharacterCount(0);
        setIsDeleting(false);
      }
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [characterCount, isDeleting, phrase, phraseIndex, phrases.length]);

  return (
    <h1 id="landing-title" aria-label={tx("Tampilkan karya techmu. Temukan kolaborator. Jadilah lebih mudah ditemukan.", "Show your tech work. Find collaborators. Get discovered.")}>
      <span>{tx("Tampilkan ", "Show ")}<span className="text-gray-500">{tx("karyamu", "your work")}</span> &amp;</span>
      <span>{tx("buat dirimu ", "get ")}<span className="text-gray-500">{tx("ditemukan", "discover")}</span>{tx(" oleh:", "ed by:")}</span>
      <span className="typing-line" aria-hidden="true">
        <span className="typing-sizer">{tx("Hiring manager", "Tech recruiters")}</span>
        <span className="typing-text">{phrase.slice(0, characterCount)}</span>
      </span>
    </h1>
  );
}
