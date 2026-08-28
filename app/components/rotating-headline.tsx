const PHRASES = [
  "Recruiters",
  "Partners",
  "Contributors",
] as const;

export function RotatingHeadline() {
  return (
    <h1 id="landing-title" aria-label="Show your work. Find collaborators. Build an impactful portfolio. Get discovered.">
      <span>Show your work &</span>
      <span>get discovered by:</span>
      <span className="rotating-lines" aria-hidden="true">
         {PHRASES.map((phrase) => <span key={phrase}>{phrase}</span>)}
      </span>
    </h1>
  );
}
