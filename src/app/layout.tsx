import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import { Header } from "@/components/Header";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Recovery & Prevention Platform",
  description: "GenAI-powered support for recovery and caregiving",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-[var(--color-bg)] text-[var(--color-text)] transition-colors">
        <AppProvider>
          <Header />
          <DisclaimerBanner />
          <main className="flex-1 flex flex-col w-full max-w-2xl mx-auto px-4 py-6">{children}</main>
        </AppProvider>
      </body>
    </html>
  );
}
