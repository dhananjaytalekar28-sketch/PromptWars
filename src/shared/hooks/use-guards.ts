"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@/features/profile/types";
import { useFlash } from "@/shared/context/flash-context";
import { useSession } from "@/shared/context/session-context";

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · RecoverAI`;
  }, [title]);
}

export function useRequireProfile(expected?: Role) {
  const { profile, hydrated } = useSession();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!profile) {
      router.replace("/");
      return;
    }
    if (expected && profile.role !== expected) {
      router.replace(profile.role === "person" ? "/person" : "/caregiver");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- guard readiness after redirect checks
    setReady(true);
  }, [hydrated, profile, expected, router]);

  return { ready: ready && !!profile && (!expected || profile.role === expected), profile };
}

export function useRequireMoment(homePath: "/person" | "/caregiver" = "/person") {
  const { moment, hydrated } = useSession();
  const { setFlash } = useFlash();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!moment) {
      setFlash("flash.checkin.required");
      router.replace(homePath);
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- guard readiness after redirect checks
    setReady(true);
  }, [hydrated, moment, homePath, router, setFlash]);

  return { ready: ready && !!moment, moment };
}
