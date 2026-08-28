'use client';

import { useEffect, useState } from "react";

const PHRASES = [
  "Recruiters",
  "Partners",
  "Contributors",
] as const;

export function RotatingHeadline() {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [characterCount, setCharacterCount] = useState(PHRASES[0].length);
  const [isDeleting, setIsDeleting] = useState(false);
  const phrase = PHRASES[phraseIndex];

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
        const nextIndex = (phraseIndex + 1) % PHRASES.length;
        setPhraseIndex(nextIndex);
        setCharacterCount(0);
        setIsDeleting(false);
      }
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [characterCount, isDeleting, phrase, phraseIndex]);

  return (
    <h1 id="landing-title" aria-label="Show your work. Find collaborators. Build an impactful portfolio. Get discovered.">
      <span>Show <span className="text-gray-500">your work</span> &</span>
      <span>get <span className="text-gray-500">discover</span>ed by:</span>
      <span className="typing-line" aria-hidden="true">
        <span className="typing-sizer">Contributors</span>
        <span className="typing-text">{phrase.slice(0, characterCount)}</span>
      </span>
    </h1>
  );
}
