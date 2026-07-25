"use client";

import { useApp } from "@/context/AppContext";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Header() {
  const { profile, theme, dir, toggleTheme, toggleDir, switchRole } = useApp();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
      <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
        <Link href="/" className="font-semibold text-lg text-[var(--color-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] rounded">
          RecoverAI
        </Link>

        <nav className="flex items-center gap-2 flex-wrap" aria-label="Main navigation">
          {profile && (
            <>
              {profile.role === "person" && (
                <>
                  <NavLink href="/person" current={pathname}>Home</NavLink>
                  <NavLink href="/intervene" current={pathname}>Intervene</NavLink>
                  <NavLink href="/scripts" current={pathname}>Scripts</NavLink>
                </>
              )}
              {profile.role === "caregiver" && (
                <>
                  <NavLink href="/caregiver" current={pathname}>Home</NavLink>
                  <NavLink href="/scripts" current={pathname}>Scripts</NavLink>
                </>
              )}
              <NavLink href="/learn" current={pathname}>Learn</NavLink>
              <NavLink href="/safety" current={pathname}>Safety</NavLink>

              <button
                onClick={() => switchRole(profile.role === "person" ? "caregiver" : "person")}
                className="ms-2 text-xs px-2 py-1 rounded border border-[var(--color-border)] hover:bg-[var(--color-chip-bg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
                aria-label={`Switch to ${profile.role === "person" ? "caregiver" : "person"} role`}
              >
                Switch to {profile.role === "person" ? "Caregiver" : "Person"}
              </button>
            </>
          )}

          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-[var(--color-chip-bg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>
          <button
            onClick={toggleDir}
            className="p-2 rounded-full hover:bg-[var(--color-chip-bg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
            aria-label={`Switch to ${dir === "ltr" ? "RTL" : "LTR"} layout`}
          >
            {dir === "ltr" ? "RTL" : "LTR"}
          </button>
        </nav>
      </div>
    </header>
  );
}

function NavLink({ href, current, children }: { href: string; current: string; children: React.ReactNode }) {
  const active = current === href;
  return (
    <Link
      href={href}
      className={`text-sm px-2 py-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] ${
        active ? "bg-[var(--color-primary)] text-white" : "hover:bg-[var(--color-chip-bg)]"
      }`}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
  );
}
