"use client";

import { useEffect } from "react";

/**
 * The outermost net. `app/error.tsx` cannot catch a failure in the root layout
 * or in `generateMetadata`, and without this one those turn into a blank page
 * with a raw script payload in it.
 */
export default function GlobalError({
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
    <html lang="id">
      <body
        style={{
          background: "#f3f0e8",
          color: "#173d32",
          fontFamily: "Arial, sans-serif",
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 460 }}>
          <h1 style={{ fontSize: 40, letterSpacing: "-0.04em", marginBottom: 12 }}>
            Ada yang tersendat.
          </h1>
          <p style={{ color: "#68746d", lineHeight: 1.7, marginBottom: 24 }}>
            Ahsan Project gagal dimuat. Biasanya ini sementara — coba lagi sebentar lagi.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              background: "#173d32",
              border: 0,
              borderRadius: 100,
              color: "#fff",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 650,
              padding: "14px 24px",
            }}
          >
            Coba lagi
          </button>
        </div>
      </body>
    </html>
  );
}
