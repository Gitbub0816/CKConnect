"use client";

import { useState } from "react";
import { CalendarDays, Send } from "lucide-react";

async function submit(slug: string, payload: Record<string, unknown>) {
  const response = await fetch(`/api/public/${slug}/submit`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  const result = await response.json() as { error?: string };
  if (!response.ok) throw new Error(result.error ?? "Unable to submit");
}

export function PublicBookingForm({ organizationSlug, service = "Consultation" }: { organizationSlug: string; service?: string }) {
  const [message, setMessage] = useState("");
  return <form className="portal-form" onSubmit={async (event) => {
    event.preventDefault();
    setMessage("Scheduling...");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await submit(organizationSlug, { type: "BOOKING", name: form.get("name"), email: form.get("email"), phone: form.get("phone"), service: form.get("service"), startsAt: new Date(String(form.get("startsAt"))).toISOString(), notes: form.get("notes") });
      formElement.reset();
      setMessage("Your appointment request is confirmed.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to schedule"); }
  }}>
    <div className="portal-form-grid"><input name="name" placeholder="Your name" required/><input name="email" placeholder="Email" type="email" required/><input name="phone" placeholder="Phone"/><input defaultValue={service} name="service" placeholder="Service" required/><input name="startsAt" type="datetime-local" required/><input name="notes" placeholder="Anything we should know?"/></div>
    <button className="portal-button" type="submit"><CalendarDays size={16}/>Request appointment</button>{message && <p>{message}</p>}
  </form>;
}

export function PublicContactForm({ organizationSlug }: { organizationSlug: string }) {
  const [message, setMessage] = useState("");
  return <form className="portal-form" onSubmit={async (event) => {
    event.preventDefault();
    setMessage("Sending...");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await submit(organizationSlug, { type: "FORM", name: form.get("name"), email: form.get("email"), phone: form.get("phone"), subject: form.get("subject"), message: form.get("message") });
      formElement.reset();
      setMessage("Thank you. The team has received your request.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to send"); }
  }}>
    <div className="portal-form-grid"><input name="name" placeholder="Your name" required/><input name="email" placeholder="Email" type="email" required/><input name="phone" placeholder="Phone"/><input name="subject" placeholder="How can we help?" required/><textarea name="message" placeholder="Tell us what you need" required/></div>
    <button className="portal-button" type="submit"><Send size={16}/>Send request</button>{message && <p>{message}</p>}
  </form>;
}
