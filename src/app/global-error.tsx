"use client";

import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#0a0b0f",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <div style={{ maxWidth: "24rem" }}>
            <div
              style={{
                display: "grid",
                width: "5rem",
                height: "5rem",
                placeItems: "center",
                borderRadius: "1rem",
                background: "#1e293b",
                fontSize: "1.875rem",
                fontWeight: 700,
                color: "#475569",
                margin: "0 auto 1.5rem",
              }}
            >
              500
            </div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#f1f5f9", margin: "0 0 0.5rem" }}>
              Critical error
            </h1>
            <p style={{ color: "#94a3b8", margin: "0 0 2rem" }}>
              The application encountered a critical error. Please try again.
            </p>
            {error.digest && (
              <p style={{ fontFamily: "monospace", fontSize: "0.7rem", color: "#475569", margin: "0 0 1.5rem" }}>
                ref: {error.digest}
              </p>
            )}
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
              <button
                onClick={reset}
                style={{
                  background: "#4f46e5",
                  color: "white",
                  border: "none",
                  borderRadius: "0.5rem",
                  padding: "0.625rem 1.25rem",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
                type="button"
              >
                Try again
              </button>
              <Link
                href="/"
                style={{
                  border: "1px solid #334155",
                  color: "#cbd5e1",
                  borderRadius: "0.5rem",
                  padding: "0.625rem 1.25rem",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  textDecoration: "none",
                }}
              >
                Go home
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
