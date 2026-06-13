"use client";

import { useState } from "react";
import { Send } from "lucide-react";

export function CustomerWorkspaceChat({ publicId, token }: { publicId: string; token: string }) {
  const [status, setStatus] = useState("");
  async function submit(formData: FormData) {
    setStatus("Sending...");
    const response = await fetch(`/api/public/workspace/${publicId}/messages`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, name: formData.get("name"), email: formData.get("email"), body: formData.get("body") }) });
    const result = await response.json();
    setStatus(response.ok ? "Message sent. Refresh to see the updated conversation." : result.error ?? "Unable to send message.");
  }
  return <form action={submit} className="rounded-xl border bg-white p-5 shadow-sm"><h2 className="font-semibold">Reply to the workspace</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><input className="ck-input" name="name" placeholder="Your name" required/><input className="ck-input" name="email" placeholder="Email" type="email" required/></div><textarea className="ck-input mt-3 min-h-28 py-3" name="body" placeholder="Write a message..." required/><button className="ck-button mt-3" type="submit"><Send size={14}/>Send message</button>{status && <p className="mt-3 text-xs text-slate-500">{status}</p>}</form>;
}
