import Link from "next/link";
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 p-6">
      {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
        <SignIn />
      ) : (
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-white">
          <h1 className="text-2xl font-semibold">Connect Clerk to continue</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">Add the Clerk environment variables from `.env.example`. The seeded workspace is available after the database bootstrap.</p>
          <Link className="ck-button mt-6" href="/app/northstar-home-services">Open seeded workspace</Link>
        </div>
      )}
    </main>
  );
}
