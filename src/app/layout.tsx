import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/shared/context/app-providers";
import { Header } from "@/shared/components/Header";
import { DisclaimerBanner } from "@/shared/components/DisclaimerBanner";
import { FlashBanner } from "@/shared/components/FlashBanner";
import { BottomNav } from "@/shared/components/BottomNav";
import { SkipLink } from "@/shared/components/SkipLink";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "RecoverAI",
    template: "%s · RecoverAI",
  },
  description: "GenAI-powered support for recovery and caregiving",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-[var(--color-bg)] text-[var(--color-text)] transition-colors">
        <AppProviders>
          <SkipLink />
          <Header />
          <DisclaimerBanner />
          <FlashBanner />
          <main
            id="main-content"
            className="flex-1 flex flex-col w-full max-w-[var(--content-width)] mx-auto px-4 py-[var(--space-page)] pb-[calc(var(--bottom-nav-height)+1.5rem)] md:pb-[var(--space-page)]"
          >
            {children}
          </main>
          <BottomNav />
        </AppProviders>
      </body>
    </html>
  );
}
