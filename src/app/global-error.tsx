"use client";

import Link from "next/link";
import { useEffect } from "react";
import { createClientLogger } from "@/shared/logging/client-logger";

const logger = createClientLogger();

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    logger.error("route.global_error", {
      requestId: error.digest ?? "unknown",
    });
  }, [error.digest]);

  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col items-center justify-center gap-6 bg-[var(--color-bg,#fff)] px-4 text-center text-[var(--color-text,#111)]">
        <main
          role="alert"
          aria-live="assertive"
          className="flex max-w-md flex-col items-center gap-6"
        >
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="text-sm text-[var(--color-text-muted,#555)]">
            We could not load this page. You can try again or go to a safe area of the app.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={reset}
              className="min-h-11 rounded-lg bg-[#2563eb] px-6 py-2 font-semibold text-white"
            >
              Try again
            </button>
            <Link
              href="/"
              className="min-h-11 rounded-lg border border-[#d1d5db] px-6 py-2 font-semibold"
            >
              Go home
            </Link>
            <Link
              href="/safety"
              className="min-h-11 rounded-lg border border-[#d1d5db] px-6 py-2 font-semibold"
            >
              Safety &amp; Helplines
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
