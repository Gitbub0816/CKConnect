"use client";

import { FormEvent, useState } from "react";
import { Bot, LoaderCircle, Send, Sparkles, X } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };

export function KiraAssistant({
  organizationSlug,
  activeModule,
}: {
  organizationSlug: string;
  activeModule: string;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string>();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "I am Kira. Ask me how to use this workspace, diagnose a workflow, or plan a website and automation.",
    },
  ]);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const message = input.trim();
    if (!message || pending) return;
    setInput("");
    setMessages((current) => [...current, { role: "user", content: message }]);
    setPending(true);
    try {
      const response = await fetch("/api/ai/kira", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          organizationSlug,
          activeModule,
          conversationId,
          message,
        }),
      });
      const result = (await response.json()) as {
        answer?: string;
        conversationId?: string;
        error?: string;
      };
      if (!response.ok) throw new Error(result.error || "Kira is unavailable.");
      setConversationId(result.conversationId);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: result.answer || "I could not form a response.",
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "Kira is temporarily unavailable. Your workspace is still safe.",
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <section className="mb-3 flex h-[min(650px,75vh)] w-[min(410px,calc(100vw-40px))] flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl">
          <header className="flex items-center justify-between border-b bg-slate-950 px-4 py-3 text-white">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-amber-400 text-slate-950">
                <Sparkles size={17} />
              </span>
              <div>
                <strong className="text-sm">Kira</strong>
                <div className="text-[10px] text-slate-400">
                  ClearKey workspace expert
                </div>
              </div>
            </div>
            <button
              aria-label="Close Kira"
              className="grid size-8 place-items-center rounded-lg hover:bg-white/10"
              onClick={() => setOpen(false)}
              type="button"
            >
              <X size={16} />
            </button>
          </header>
          <div className="flex-1 space-y-4 overflow-y-auto bg-[#faf8f3] p-4">
            {messages.map((message, index) => (
              <div
                className={`max-w-[88%] whitespace-pre-wrap rounded-xl px-4 py-3 text-sm leading-6 ${
                  message.role === "user"
                    ? "ml-auto bg-slate-950 text-white"
                    : "border bg-white text-slate-700"
                }`}
                key={`${message.role}-${index}`}
              >
                {message.content}
              </div>
            ))}
            {pending && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <LoaderCircle className="animate-spin" size={14} />
                Kira is reviewing this workspace...
              </div>
            )}
          </div>
          <form className="border-t bg-white p-3" onSubmit={submit}>
            <div className="flex items-end gap-2 rounded-xl border p-2 focus-within:border-amber-500">
              <textarea
                className="min-h-11 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none"
                onChange={(event) => setInput(event.target.value)}
                placeholder={`Ask about ${activeModule}...`}
                rows={2}
                value={input}
              />
              <button
                aria-label="Send to Kira"
                className="grid size-10 shrink-0 place-items-center rounded-lg bg-slate-950 text-white disabled:opacity-50"
                disabled={pending || !input.trim()}
                type="submit"
              >
                <Send size={15} />
              </button>
            </div>
          </form>
        </section>
      )}
      <button
        aria-label={open ? "Close Kira" : "Open Kira"}
        className="ml-auto flex h-12 items-center gap-2 rounded-full bg-slate-950 px-4 font-semibold text-white shadow-xl transition hover:-translate-y-0.5"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <Bot size={18} />
        Kira
      </button>
    </div>
  );
}
