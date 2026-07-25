"use client";

import { useSession } from "@/shared/context/session-context";
import { useSettings } from "@/shared/context/settings-context";
import type { Role } from "@/features/profile/types";
import { usePageTitle } from "@/shared/hooks/use-guards";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function RolePicker() {
  const { profile, setProfile } = useSession();
  const { t } = useSettings();
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  usePageTitle(t("role.title"));

  useEffect(() => {
    if (!profile) return;
    router.replace(profile.role === "person" ? "/person" : "/caregiver");
  }, [profile, router]);

  if (profile) {
    return (
      <p className="text-center text-sm text-[var(--color-text-muted)]" aria-live="polite">
        {t("common.loading")}
      </p>
    );
  }

  function handleContinue() {
    if (!selectedRole) return;
    setProfile({ role: selectedRole, nickname: nickname.trim() || undefined });
    router.push(selectedRole === "person" ? "/person" : "/caregiver");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
      <h1 className="text-3xl font-bold">{t("role.title")}</h1>
      <p className="max-w-md text-[var(--color-text-muted)]">{t("role.subtitle")}</p>

      <div className="flex flex-wrap justify-center gap-4">
        <RoleCard
          role="person"
          label={t("role.person")}
          description={t("role.person.desc")}
          selected={selectedRole === "person"}
          onSelect={() => setSelectedRole("person")}
        />
        <RoleCard
          role="caregiver"
          label={t("role.caregiver")}
          description={t("role.caregiver.desc")}
          selected={selectedRole === "caregiver"}
          onSelect={() => setSelectedRole("caregiver")}
        />
      </div>

      <div className="w-full max-w-xs">
        <label htmlFor="nickname" className="mb-1 block text-sm text-[var(--color-text-muted)]">
          {t("role.nickname.label")}
        </label>
        <input
          id="nickname"
          type="text"
          maxLength={30}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="w-full rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
          placeholder={t("role.nickname.placeholder")}
        />
      </div>

      <button
        type="button"
        onClick={handleContinue}
        disabled={!selectedRole}
        className="min-h-11 rounded-[var(--radius-control)] bg-[var(--color-primary)] px-8 py-3 text-lg font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] disabled:opacity-40"
      >
        {t("role.continue")}
      </button>
    </div>
  );
}

function RoleCard({
  role,
  label,
  description,
  selected,
  onSelect,
}: {
  role: Role;
  label: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex min-h-11 flex-col items-center gap-2 rounded-[var(--radius)] border-2 p-6 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] ${
        selected
          ? "border-[var(--color-primary)] bg-[var(--color-chip-bg)]"
          : "border-[var(--color-border)] hover:border-[var(--color-primary)]"
      }`}
    >
      <span className="text-3xl" aria-hidden="true">
        {role === "person" ? "🧘" : "🤝"}
      </span>
      <span className="font-semibold">{label}</span>
      <span className="max-w-[150px] text-xs text-[var(--color-text-muted)]">{description}</span>
    </button>
  );
}
