// src/app/layout.tsx
import "./globals.css";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ClearPath",
  description: "Mission-Ready Field Guide & Debt Demolition in one app.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900">
        <header className="sticky top-0 z-10 border-b bg-white/70 backdrop-blur">
          <nav className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
            <Link href="/" className="font-semibold">
              ClearPath
            </Link>
            <div className="flex gap-4 text-sm">
              <Link href="/test" className="hover:underline">
                /test
              </Link>
              <Link href="/field-guide" className="hover:underline">
                Field Guide
              </Link>
            </div>
          </nav>
        </header>

        <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
