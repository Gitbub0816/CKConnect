import Link from "next/link";
import { ShieldX } from "lucide-react";

export default function UnauthorizedPage() {
  return <main className="grid min-h-screen place-items-center bg-[#f4efe6] p-6"><div className="max-w-lg rounded-2xl border bg-white p-10 text-center shadow-xl"><ShieldX className="mx-auto text-amber-700" size={42}/><h1 className="mt-5 text-3xl font-semibold">Organization access required</h1><p className="mt-4 text-sm leading-6 text-slate-500">Your sign-in was successful, but your account does not have access to this organization. Please contact your company administrator or ClearKey support.</p><Link className="ck-button mt-7" href="/login">Try another organization</Link></div></main>;
}
