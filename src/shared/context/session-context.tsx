"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { z } from "zod";
import { momentSchema } from "@/features/check-in/schemas";
import type { Moment } from "@/features/check-in/types";
import { profileSchema } from "@/features/profile/schemas";
import type { Profile, Role } from "@/features/profile/types";
import { createBrowserStorageAdapter } from "@/shared/persistence/local-storage";

type HomePath = "/person" | "/caregiver";

interface SessionState {
  profile: Profile | null;
  moment: Moment | null;
  hydrated: boolean;
  homePath: HomePath;
  setProfile: (p: Profile | null) => void;
  setMoment: (m: Moment | null) => void;
  updateMoment: (partial: Partial<Moment>) => void;
  switchRole: (role: Role) => void;
}

const SessionContext = createContext<SessionState | null>(null);

function loadValidated<T>(key: string, schema: z.ZodType<T>): T | null {
  return createBrowserStorageAdapter()?.read(key, schema) ?? null;
}

function saveValidated<T>(key: string, value: T) {
  createBrowserStorageAdapter()?.write(key, value);
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [moment, setMomentState] = useState<Moment | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const homePath: HomePath = profile?.role === "caregiver" ? "/caregiver" : "/person";

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- post-mount storage hydration */
    setProfileState(loadValidated("rp_profile", profileSchema));
    setMomentState(loadValidated("rp_moment", momentSchema));
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const setProfile = useCallback((p: Profile | null) => {
    setProfileState(p);
    saveValidated("rp_profile", p);
  }, []);

  const setMoment = useCallback((m: Moment | null) => {
    setMomentState(m);
    saveValidated("rp_moment", m);
  }, []);

  const updateMoment = useCallback((partial: Partial<Moment>) => {
    setMomentState((prev) => {
      const updated = prev ? { ...prev, ...partial, updatedAt: new Date().toISOString() } : null;
      saveValidated("rp_moment", updated);
      return updated;
    });
  }, []);

  const switchRole = useCallback(
    (role: Role) => {
      const newProfile: Profile = { role, nickname: profile?.nickname };
      setProfileState(newProfile);
      saveValidated("rp_profile", newProfile);
    },
    [profile],
  );

  const value = useMemo(
    () => ({
      profile,
      moment,
      hydrated,
      homePath,
      setProfile,
      setMoment,
      updateMoment,
      switchRole,
    }),
    [profile, moment, hydrated, homePath, setProfile, setMoment, updateMoment, switchRole],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
