import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Scale } from "lucide-react";
import { getLegalDocument, legalDocuments } from "@/lib/legal-documents";

export function generateStaticParams() {
  return legalDocuments.map(({ slug }) => ({ slug }));
}

export default async function LegalDocumentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const document = getLegalDocument(slug);
  if (!document) notFound();

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-14">
      <article className="mx-auto max-w-3xl">
        <Link className="inline-flex items-center gap-2 font-semibold" href="/"><Scale size={19} />ClearKey Connect</Link>
        <Link className="mt-10 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900" href="/legal"><ArrowLeft size={14} />Legal center</Link>
        <div className="mt-7 ck-card p-7 md:p-10">
          <div className="text-xs font-semibold uppercase tracking-[.16em] text-blue-700">Draft for attorney review</div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">{document.title}</h1>
          <p className="mt-4 text-base leading-7 text-slate-600">{document.summary}</p>
          <div className="mt-9 space-y-8">
            {document.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-lg font-semibold">{section.heading}</h2>
                <p className="mt-2 leading-7 text-slate-600">{section.body}</p>
              </section>
            ))}
          </div>
        </div>
      </article>
    </main>
  );
}
