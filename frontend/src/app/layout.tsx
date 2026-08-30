import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SnappyForms",
  description: "Your time. Verified and ready when you need it.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // No maximumScale: pinning it to 1 blocks pinch-zoom, which is both an
  // accessibility failure and the reason a cramped form had no way out — a
  // user who could not read an overlapping field could not zoom either.
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background sm:max-w-lg">
          {children}
        </div>
      </body>
    </html>
  );
}
