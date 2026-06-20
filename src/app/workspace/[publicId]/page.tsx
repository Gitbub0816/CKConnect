import { notFound } from "next/navigation";
import Link from "next/link";
import { CustomerWorkspaceChat } from "@/components/customer-workspace-chat";
import { verifyCustomerWorkspaceToken } from "@/lib/customer-workspace-token";
import { getDb } from "@/lib/db";

export default async function CustomerWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ publicId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { publicId } = await params;
  const { token } = await searchParams;
  if (!token || !verifyCustomerWorkspaceToken(token, publicId)) notFound();
  const channel = await getDb().collaborationChannel.findFirst({
    where: { publicId, channelType: "CUSTOMER", archivedAt: null },
    include: {
      organization: { include: { theme: true } },
      messages: {
        where: { deletedAt: null },
        include: { author: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!channel) notFound();
  return (
    <main className="min-h-screen bg-[#f4efe6] p-5 sm:p-10">
      <div className="mx-auto max-w-3xl">
        <header className="rounded-2xl bg-slate-950 p-7 text-white">
          <div className="text-xs font-bold uppercase tracking-[.16em] text-amber-400">
            Shared customer workspace
          </div>
          <h1 className="mt-3 text-3xl font-semibold">{channel.name}</h1>
          <p className="mt-2 text-sm text-slate-400">
            {channel.organization.name} · {channel.description}
          </p>
        </header>
        <section className="my-5 space-y-3 rounded-2xl border bg-[#fbfaf7] p-5">
          {channel.messages.map((message) => (
            <div
              className={`max-w-[82%] rounded-xl p-3 text-sm ${message.authorUserId ? "bg-slate-950 text-white" : "ml-auto bg-white shadow-sm"}`}
              key={message.id}
            >
              <strong className="text-xs">
                {message.author
                  ? `${message.author.firstName ?? ""} ${message.author.lastName ?? ""}`.trim() ||
                    channel.organization.name
                  : "Customer"}
              </strong>
              <p className="mt-1 whitespace-pre-wrap leading-6">
                {message.body}
              </p>
              <div className="mt-1 text-[10px] opacity-50">
                {message.createdAt.toLocaleString()}
              </div>
            </div>
          ))}
        </section>
        <CustomerWorkspaceChat publicId={publicId} token={token} />
        <footer className="mt-5 text-center text-[10px] text-slate-400">
          <Link href="https://legal.clearkey.solutions/terms">Terms</Link> ·{" "}
          <Link href="https://legal.clearkey.solutions/privacy">Privacy</Link> · Securely hosted by ClearKey
          Connect
        </footer>
      </div>
    </main>
  );
}
