import { act, render, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { momentSchema } from "@/features/check-in/schemas";
import type { Moment } from "@/features/check-in/types";
import { profileSchema } from "@/features/profile/schemas";
import type { Profile } from "@/features/profile/types";
import { AppProviders } from "@/shared/context/app-providers";
import { useFlash } from "@/shared/context/flash-context";
import { useSession } from "@/shared/context/session-context";
import { useSettings } from "@/shared/context/settings-context";

const personProfile: Profile = { role: "person", nickname: "Ada" };
const caregiverProfile: Profile = { role: "caregiver" };

const validMoment: Moment = {
  id: "moment-1",
  riskLevel: 3,
  chips: ["craving"],
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function SessionRenderCounter({ onRender }: { onRender: () => void }) {
  useSession();
  onRender();
  return null;
}

function SettingsToggleButton() {
  const { toggleTheme, hydrated } = useSettings();
  return (
    <button type="button" disabled={!hydrated} onClick={() => toggleTheme()}>
      Toggle theme
    </button>
  );
}

describe("application contexts", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("hydrates validated profile and moment from storage", async () => {
    localStorage.setItem("rp_profile", JSON.stringify(personProfile));
    localStorage.setItem("rp_moment", JSON.stringify(validMoment));

    const { result } = renderHook(() => useSession(), {
      wrapper: ({ children }) => <AppProviders>{children}</AppProviders>,
    });

    await waitFor(() => {
      expect(result.current.hydrated).toBe(true);
    });

    expect(result.current.profile).toEqual(personProfile);
    expect(result.current.moment).toEqual(validMoment);
    expect(profileSchema.safeParse(result.current.profile).success).toBe(true);
    expect(momentSchema.safeParse(result.current.moment).success).toBe(true);
  });

  it("switches role and persists profile", async () => {
    const { result } = renderHook(() => ({ session: useSession(), settings: useSettings() }), {
      wrapper: ({ children }) => <AppProviders>{children}</AppProviders>,
    });

    await waitFor(() => {
      expect(result.current.session.hydrated).toBe(true);
    });

    act(() => {
      result.current.session.setProfile(personProfile);
    });

    act(() => {
      result.current.session.switchRole("caregiver");
    });

    expect(result.current.session.profile).toEqual({ role: "caregiver", nickname: "Ada" });
    expect(result.current.session.homePath).toBe("/caregiver");

    const stored = JSON.parse(localStorage.getItem("rp_profile") ?? "null");
    expect(stored).toEqual({ role: "caregiver", nickname: "Ada" });
  });

  it("persists moment updates", async () => {
    const { result } = renderHook(() => useSession(), {
      wrapper: ({ children }) => <AppProviders>{children}</AppProviders>,
    });

    await waitFor(() => {
      expect(result.current.hydrated).toBe(true);
    });

    act(() => {
      result.current.setMoment(validMoment);
    });

    act(() => {
      result.current.updateMoment({ riskLevel: 5 });
    });

    expect(result.current.moment?.riskLevel).toBe(5);
    const stored = JSON.parse(localStorage.getItem("rp_moment") ?? "null");
    expect(stored.riskLevel).toBe(5);
    expect(momentSchema.safeParse(stored).success).toBe(true);
  });

  it("persists theme and restores language direction", async () => {
    localStorage.setItem("rp_theme", "dark");
    localStorage.setItem("rp_lang", "ar");

    const { result } = renderHook(() => useSettings(), {
      wrapper: ({ children }) => <AppProviders>{children}</AppProviders>,
    });

    await waitFor(() => {
      expect(result.current.hydrated).toBe(true);
    });

    expect(result.current.theme).toBe("dark");
    expect(result.current.lang).toBe("ar");
    expect(result.current.dir).toBe("rtl");
    expect(document.documentElement.getAttribute("dir")).toBe("rtl");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe("light");
    expect(localStorage.getItem("rp_theme")).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("clears flash after timeout", async () => {
    const { result } = renderHook(() => ({ flash: useFlash(), settings: useSettings() }), {
      wrapper: ({ children }) => <AppProviders>{children}</AppProviders>,
    });

    await waitFor(() => {
      expect(result.current.settings.hydrated).toBe(true);
    });

    vi.useFakeTimers();

    act(() => {
      result.current.flash.setFlash("flash.checkin.required");
    });

    expect(result.current.flash.flash).toBe("flash.checkin.required");

    act(() => {
      vi.advanceTimersByTime(6000);
    });

    expect(result.current.flash.flash).toBeNull();
  });

  it("does not rerender session-only consumers when settings change", async () => {
    let sessionRenderCount = 0;

    const { getByRole } = render(
      <AppProviders>
        <SessionRenderCounter onRender={() => (sessionRenderCount += 1)} />
        <SettingsToggleButton />
      </AppProviders>,
    );

    await waitFor(() => {
      expect(sessionRenderCount).toBeGreaterThan(0);
      expect((getByRole("button", { name: "Toggle theme" }) as HTMLButtonElement).disabled).toBe(
        false,
      );
    });

    const countBefore = sessionRenderCount;

    act(() => {
      getByRole("button", { name: "Toggle theme" }).click();
    });

    expect(sessionRenderCount).toBe(countBefore);
  });

  it("survives SecurityError when reading theme and lang from storage", async () => {
    const storage = {
      getItem: vi.fn(() => {
        throw new DOMException("SecurityError", "SecurityError");
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    };

    vi.stubGlobal("localStorage", storage);

    const { result } = renderHook(() => useSettings(), {
      wrapper: ({ children }) => <AppProviders>{children}</AppProviders>,
    });

    await waitFor(() => {
      expect(result.current.hydrated).toBe(true);
    });

    expect(result.current.theme).toBe("light");
    expect(result.current.lang).toBe("en");
  });

  it("types homePath as person or caregiver route", async () => {
    const { result } = renderHook(() => useSession(), {
      wrapper: ({ children }) => <AppProviders>{children}</AppProviders>,
    });

    await waitFor(() => {
      expect(result.current.hydrated).toBe(true);
    });

    expect(result.current.homePath).toBe("/person");

    act(() => {
      result.current.setProfile(caregiverProfile);
    });

    expect(result.current.homePath).toBe("/caregiver");
  });
});
