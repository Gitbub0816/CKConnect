import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Suspense } from "react";
import { PostHogProvider } from "@/components/posthog-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ClearKey Connect",
    template: "%s | ClearKey Connect",
  },
  description: "CRM, operations, payments, and double-entry accounting for growing businesses.",
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
      { url: "/logo.png", type: "image/png" },
    ],
    shortcut: "/icon.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full antialiased">
        {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
          <ClerkProvider><Suspense><PostHogProvider>{children}</PostHogProvider></Suspense></ClerkProvider>
        ) : (
          <Suspense><PostHogProvider>{children}</PostHogProvider></Suspense>
        )}
      </body>
    </html>
  );
}
