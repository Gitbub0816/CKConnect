"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f5f0e8] p-6">
      <section className="w-full max-w-lg rounded-2xl border bg-white p-8 shadow-xl">
        <span className="grid size-12 place-items-center rounded-xl bg-amber-100 text-amber-900">
          <AlertTriangle size={22} />
        </span>
        <h1 className="mt-5 text-2xl font-semibold">
          That command did not finish
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          The workspace is still available. Retry this screen without reloading
          the whole application.
        </p>
        <button className="ck-button mt-6" onClick={reset} type="button">
          <RotateCcw size={15} />
          Retry workspace
        </button>
        {error.digest && (
          <p className="mt-5 font-mono text-[10px] text-slate-400">
            Reference {error.digest}
          </p>
        )}
      </section>
    </main>
  );
}
