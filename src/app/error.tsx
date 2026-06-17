"use client";

import Link from "next/link";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-8 text-center">
      <div className="max-w-md">
        <div className="mb-6 grid size-20 place-items-center rounded-2xl bg-slate-900 text-4xl font-bold text-slate-600 mx-auto">
          500
        </div>
        <h1 className="mb-2 text-2xl font-semibold text-white">Something went wrong</h1>
        <p className="mb-8 text-slate-400">
          {error.message && error.message !== "An unexpected error occurred"
            ? error.message
            : "An unexpected error occurred. Please try again or return home."}
        </p>
        {error.digest && (
          <p className="mb-6 font-mono text-xs text-slate-600">ref: {error.digest}</p>
        )}
        <div className="flex justify-center gap-3">
          <button
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500"
            onClick={reset}
            type="button"
          >
            Try again
          </button>
          <Link
            className="rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:text-white"
            href="/"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
