import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-8 text-center">
      <div className="max-w-md">
        <div className="mb-6 grid size-20 place-items-center rounded-2xl bg-slate-900 text-4xl font-bold text-slate-600 mx-auto">
          404
        </div>
        <h1 className="mb-2 text-2xl font-semibold text-white">Page not found</h1>
        <p className="mb-8 text-slate-400">
          This page does not exist or may have been moved. Check the URL and try again.
        </p>
        <div className="flex justify-center gap-3">
          <Link
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500"
            href="/"
          >
            Go home
          </Link>
          <Link
            className="rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:text-white"
            href="/sign-in"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
