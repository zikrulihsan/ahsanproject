"use client";

import { useEffect } from "react";

/**
 * What people see when a page cannot load — most often because the database is
 * unreachable. It deliberately does not fall back to the bundled seed: showing
 * yesterday's board as though it were today's would be worse than saying so.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main-content" className="notfound">
      <h1>Something went wrong.</h1>
      <p className="muted">
        The board could not load. This is usually temporary, so please try again shortly.
      </p>
      <p style={{ marginTop: 24 }}>
        <button className="primary-button" type="button" onClick={reset}>
          Try again
        </button>
      </p>
    </main>
  );
}
