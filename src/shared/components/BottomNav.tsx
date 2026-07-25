"use client";

import { useFlash } from "@/shared/context/flash-context";
import { useSession } from "@/shared/context/session-context";
import { useSettings } from "@/shared/context/settings-context";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function BottomNav() {
  const { profile, moment, homePath } = useSession();
  const { t } = useSettings();
  const { setFlash } = useFlash();
  const pathname = usePathname();

  if (!profile) return null;

  const items =
    profile.role === "person"
      ? [
          { href: "/person", label: t("nav.home") },
          { href: "/intervene", label: t("nav.intervene"), needsMoment: true },
          { href: "/learn", label: t("nav.learn") },
          { href: "/safety", label: t("nav.safety") },
        ]
      : [
          { href: "/caregiver", label: t("nav.home") },
          { href: "/scripts", label: t("nav.scripts"), needsMoment: true },
          { href: "/learn", label: t("nav.learn") },
          { href: "/safety", label: t("nav.safety") },
        ];

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--color-border)] bg-[var(--color-surface)] md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-[var(--shell-width)] grid-cols-4">
        {items.map((item) => {
          const active = pathname === item.href;
          const disabled = Boolean(item.needsMoment && !moment);
          return (
            <li key={item.href}>
              <Link
                href={disabled ? homePath : item.href}
                aria-current={active ? "page" : undefined}
                aria-disabled={disabled || undefined}
                onClick={(event) => {
                  if (!disabled) return;
                  event.preventDefault();
                  setFlash("flash.checkin.required");
                }}
                className={`flex min-h-[var(--bottom-nav-height)] flex-col items-center justify-center px-1 text-xs font-semibold ${
                  active ? "text-[var(--color-primary)]" : "text-[var(--color-text-muted)]"
                } ${disabled ? "opacity-50" : ""}`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
