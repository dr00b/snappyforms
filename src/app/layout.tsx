import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VERWOVO",
  description: "Your time. Verified and ready when you need it.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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
