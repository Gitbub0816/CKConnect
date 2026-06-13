import Link from "next/link";
import { Scale } from "lucide-react";
import { legalDocuments } from "@/lib/legal-documents";

export default function LegalIndexPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-14">
      <div className="mx-auto max-w-5xl">
        <Link className="inline-flex items-center gap-2 font-semibold" href="/"><Scale size={19} />ClearKey Connect</Link>
        <div className="mt-10 rounded-2xl border bg-amber-50 p-5 text-sm leading-6 text-amber-950">
          These policy endpoints are structured drafts for attorney review. They are not approved production legal documents yet.
        </div>
        <h1 className="mt-9 text-4xl font-semibold tracking-tight">Legal and policy center</h1>
        <p className="mt-3 max-w-2xl text-slate-600">Stable public endpoints for ClearKey agreements, disclosures, operational policies, and customer rights.</p>
        <div className="mt-9 grid gap-3 md:grid-cols-2">
          {legalDocuments.map((document) => (
            <Link className="ck-card p-5 transition hover:border-blue-300 hover:shadow-md" href={`/legal/${document.slug}`} key={document.slug}>
              <h2 className="font-semibold">{document.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{document.summary}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
