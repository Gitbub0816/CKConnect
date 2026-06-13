import Link from "next/link";
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 p-6">
      {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
        <SignUp />
      ) : (
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-white">
          <h1 className="text-2xl font-semibold">Workspace creation is ready</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">Once Clerk is connected, this route will handle account creation and organization onboarding.</p>
          <Link className="ck-button mt-6" href="/app/northstar-home-services">Preview the product</Link>
        </div>
      )}
    </main>
  );
}
