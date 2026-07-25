"use client";

import { useApp } from "@/context/AppContext";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LANGUAGES, type LangCode } from "@/lib/i18n";

export function Header() {
  const { profile, theme, lang, t, toggleTheme, setLang, switchRole } = useApp();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
      <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
        <Link href="/" className="font-semibold text-lg text-[var(--color-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] rounded">
          {t("app.name")}
        </Link>

        <nav className="flex items-center gap-2 flex-wrap" aria-label="Main navigation">
          {profile && (
            <>
              {profile.role === "person" && (
                <>
                  <NavLink href="/person" current={pathname} label={t("nav.home")} />
                  <NavLink href="/intervene" current={pathname} label={t("nav.intervene")} />
                  <NavLink href="/scripts" current={pathname} label={t("nav.scripts")} />
                </>
              )}
              {profile.role === "caregiver" && (
                <>
                  <NavLink href="/caregiver" current={pathname} label={t("nav.home")} />
                  <NavLink href="/scripts" current={pathname} label={t("nav.scripts")} />
                </>
              )}
              <NavLink href="/learn" current={pathname} label={t("nav.learn")} />
              <NavLink href="/safety" current={pathname} label={t("nav.safety")} />

              <button
                onClick={() => switchRole(profile.role === "person" ? "caregiver" : "person")}
                className="ms-2 text-xs px-2 py-1 rounded border border-[var(--color-border)] hover:bg-[var(--color-chip-bg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
                aria-label={`${t("nav.switchTo")} ${profile.role === "person" ? t("nav.caregiver") : t("nav.person")}`}
              >
                {t("nav.switchTo")} {profile.role === "person" ? t("nav.caregiver") : t("nav.person")}
              </button>
            </>
          )}

          {/* Language dropdown */}
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as LangCode)}
            className="text-xs px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
            aria-label="Select language"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-[var(--color-chip-bg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>
        </nav>
      </div>
    </header>
  );
}

function NavLink({ href, current, label }: { href: string; current: string; label: string }) {
  const active = current === href;
  return (
    <Link
      href={href}
      className={`text-sm px-2 py-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] ${
        active ? "bg-[var(--color-primary)] text-white" : "hover:bg-[var(--color-chip-bg)]"
      }`}
      aria-current={active ? "page" : undefined}
    >
      {label}
    </Link>
  );
}
