"use client";

import { useApp } from "@/context/AppContext";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Role } from "@/lib/types";

export default function RolePicker() {
  const { profile, setProfile } = useApp();
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  if (profile) {
    router.replace(profile.role === "person" ? "/person" : "/caregiver");
    return null;
  }

  function handleContinue() {
    if (!selectedRole) return;
    setProfile({ role: selectedRole, nickname: nickname.trim() || undefined });
    router.push(selectedRole === "person" ? "/person" : "/caregiver");
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 text-center">
      <h1 className="text-3xl font-bold">Welcome to RecoverAI</h1>
      <p className="text-[var(--color-text-muted)] max-w-md">
        A supportive platform for individuals navigating recovery and their caregivers.
        Choose your role to get started.
      </p>

      <div className="flex gap-4">
        <RoleCard
          role="person"
          label="I'm in recovery"
          description="Get zero-typing interventions, crisis scripts, and grounding tools"
          selected={selectedRole === "person"}
          onSelect={() => setSelectedRole("person")}
        />
        <RoleCard
          role="caregiver"
          label="I'm a caregiver"
          description="Get briefings, dual scripts, and guidance on how to help"
          selected={selectedRole === "caregiver"}
          onSelect={() => setSelectedRole("caregiver")}
        />
      </div>

      <div className="w-full max-w-xs">
        <label htmlFor="nickname" className="block text-sm text-[var(--color-text-muted)] mb-1">
          Nickname (optional)
        </label>
        <input
          id="nickname"
          type="text"
          maxLength={30}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
          placeholder="How should we address you?"
        />
      </div>

      <button
        onClick={handleContinue}
        disabled={!selectedRole}
        className="px-8 py-3 rounded-full bg-[var(--color-primary)] text-white font-semibold text-lg disabled:opacity-40 hover:bg-[var(--color-primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] transition-colors"
      >
        Continue
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
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex flex-col items-center gap-2 p-6 rounded-xl border-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] ${
        selected
          ? "border-[var(--color-primary)] bg-[var(--color-chip-bg)]"
          : "border-[var(--color-border)] hover:border-[var(--color-primary)]"
      }`}
    >
      <span className="text-3xl">{role === "person" ? "🧘" : "🤝"}</span>
      <span className="font-semibold">{label}</span>
      <span className="text-xs text-[var(--color-text-muted)] max-w-[150px]">{description}</span>
    </button>
  );
}
