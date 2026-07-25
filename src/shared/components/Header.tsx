"use client";

import { useFlash } from "@/shared/context/flash-context";
import { useSession } from "@/shared/context/session-context";
import { useSettings } from "@/shared/context/settings-context";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LANGUAGES, type LangCode } from "@/shared/i18n";

export function Header() {
  const { profile, moment, homePath, switchRole } = useSession();
  const { theme, lang, t, toggleTheme, setLang } = useSettings();
  const { setFlash } = useFlash();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleRoleSwitch() {
    if (!profile) return;
    const next = profile.role === "person" ? "caregiver" : "person";
    switchRole(next);
    setMenuOpen(false);
    router.push(next === "person" ? "/person" : "/caregiver");
  }

  function goHome() {
    if (profile) router.push(homePath);
    else router.push("/");
  }

  const personLinks = [
    { href: "/person", label: t("nav.home") },
    { href: "/intervene", label: t("nav.intervene"), needsMoment: true },
    { href: "/scripts", label: t("nav.scripts"), needsMoment: true },
    { href: "/learn", label: t("nav.learn") },
    { href: "/safety", label: t("nav.safety") },
  ];

  const caregiverLinks = [
    { href: "/caregiver", label: t("nav.home") },
    { href: "/scripts", label: t("nav.scripts"), needsMoment: true },
    { href: "/learn", label: t("nav.learn") },
    { href: "/safety", label: t("nav.safety") },
  ];

  const links = profile?.role === "caregiver" ? caregiverLinks : personLinks;

  function onGatedNav(href: string, needsMoment?: boolean) {
    if (needsMoment && !moment) {
      setFlash("flash.checkin.required");
      router.push(homePath);
      return;
    }
    router.push(href);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="app-shell flex min-h-[var(--header-height)] items-center justify-between gap-3 py-2">
        <button
          type="button"
          onClick={goHome}
          className="rounded-[var(--radius-control)] text-lg font-semibold text-[var(--color-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
        >
          {t("app.name")}
        </button>

        {profile && (
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
            {links.map((link) => {
              const active = pathname === link.href;
              const disabled = Boolean(link.needsMoment && !moment);
              return (
                <button
                  key={link.href}
                  type="button"
                  onClick={() => onGatedNav(link.href, link.needsMoment)}
                  aria-current={active ? "page" : undefined}
                  aria-disabled={disabled || undefined}
                  className={`min-h-11 rounded-[var(--radius-control)] px-3 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] ${
                    active
                      ? "bg-[var(--color-primary)] text-white"
                      : disabled
                        ? "text-[var(--color-text-muted)] opacity-60"
                        : "hover:bg-[var(--color-chip-bg)]"
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
          </nav>
        )}

        <div className="flex items-center gap-2">
          {profile && (
            <button
              type="button"
              onClick={handleRoleSwitch}
              className="hidden min-h-11 rounded-[var(--radius-control)] border border-[var(--color-border)] px-3 text-sm font-semibold hover:bg-[var(--color-chip-bg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] md:inline-flex md:items-center"
              aria-label={`${t("nav.switchTo")} ${profile.role === "person" ? t("nav.caregiver") : t("nav.person")}`}
            >
              {t("nav.switchTo")} {profile.role === "person" ? t("nav.caregiver") : t("nav.person")}
            </button>
          )}

          <label className="sr-only" htmlFor="lang-select">
            {t("a11y.selectLanguage")}
          </label>
          <select
            id="lang-select"
            value={lang}
            onChange={(e) => setLang(e.target.value as LangCode)}
            className="min-h-11 rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
            aria-label={t("a11y.selectLanguage")}
          >
            {LANGUAGES.map((language) => (
              <option key={language.code} value={language.code}>
                {language.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full hover:bg-[var(--color-chip-bg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
            aria-label={t("a11y.toggleTheme")}
          >
            <span aria-hidden="true">{theme === "light" ? "☾" : "☀"}</span>
          </button>

          {profile && (
            <button
              type="button"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-control)] border border-[var(--color-border)] text-sm font-semibold md:hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? t("nav.closeMenu") : t("nav.menu")}
            </button>
          )}
        </div>
      </div>

      {profile && menuOpen && (
        <div
          id="mobile-menu"
          className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 md:hidden"
        >
          <div className="mx-auto flex max-w-[var(--shell-width)] flex-col gap-2">
            <Link
              href="/scripts"
              onClick={(event) => {
                if (!moment) {
                  event.preventDefault();
                  setFlash("flash.checkin.required");
                  router.push(homePath);
                }
                setMenuOpen(false);
              }}
              className="min-h-11 rounded-[var(--radius-control)] px-3 py-2 text-sm font-semibold hover:bg-[var(--color-chip-bg)]"
            >
              {t("nav.scripts")}
            </Link>
            <button
              type="button"
              onClick={handleRoleSwitch}
              className="min-h-11 rounded-[var(--radius-control)] border border-[var(--color-border)] px-3 text-start text-sm font-semibold hover:bg-[var(--color-chip-bg)]"
            >
              {t("nav.switchTo")} {profile.role === "person" ? t("nav.caregiver") : t("nav.person")}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
