import "../helpers/mock-navigation";
import { getMockNavigation } from "../helpers/mock-navigation";
import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Profile } from "@/features/profile/types";
import { FlashBanner } from "@/shared/components/FlashBanner";
import {
  renderWithProviders,
  setupProviderTestEnvironment,
} from "../helpers/render-with-providers";
import { usePageTitle, useRequireMoment, useRequireProfile } from "@/shared/hooks/use-guards";

function ProfileGuardProbe({ expected }: { expected?: Profile["role"] }) {
  const { ready, profile } = useRequireProfile(expected);
  if (!ready) return <p>guard-loading</p>;
  return <p>protected:{profile?.role}</p>;
}

function MomentGuardProbe({ homePath = "/person" }: { homePath?: "/person" | "/caregiver" }) {
  const { ready } = useRequireMoment(homePath);
  if (!ready) return <p>moment-loading</p>;
  return <p>moment-ready</p>;
}

describe("route guards", () => {
  setupProviderTestEnvironment();

  it("sets document title via usePageTitle", async () => {
    function TitleProbe() {
      usePageTitle("Test Page");
      return null;
    }

    renderWithProviders(<TitleProbe />);

    await waitFor(() => {
      expect(document.title).toBe("Test Page · RecoverAI");
    });
  });

  it("redirects missing profiles inside the effect without marking the guard ready", async () => {
    renderWithProviders(<ProfileGuardProbe />, { profile: null });

    expect(screen.getByText("guard-loading")).toBeInTheDocument();

    await waitFor(() => {
      expect(getMockNavigation().replace).toHaveBeenCalledWith("/");
    });

    expect(screen.queryByText(/^protected:/)).not.toBeInTheDocument();
  });

  it("redirects mismatched roles inside the effect", async () => {
    renderWithProviders(<ProfileGuardProbe expected="person" />, {
      profile: { role: "caregiver" },
    });

    await waitFor(() => {
      expect(getMockNavigation().replace).toHaveBeenCalledWith("/caregiver");
    });

    expect(screen.getByText("guard-loading")).toBeInTheDocument();
  });

  it("marks the guard ready only after profile checks pass", async () => {
    renderWithProviders(<ProfileGuardProbe expected="person" />, {
      profile: { role: "person", nickname: "Ada" },
    });

    await waitFor(() => {
      expect(screen.getByText("protected:person")).toBeInTheDocument();
    });
  });

  it("flashes and redirects when a moment is required but missing", async () => {
    renderWithProviders(
      <>
        <MomentGuardProbe />
        <FlashBanner />
      </>,
      {
        profile: { role: "person" },
        moment: null,
      },
    );

    await waitFor(() => {
      expect(getMockNavigation().replace).toHaveBeenCalledWith("/person");
    });

    await waitFor(() => {
      expect(
        screen.getByText("Complete a check-in first to use this feature."),
      ).toBeInTheDocument();
    });
  });

  it("exposes ready state from useRequireMoment when a moment exists", async () => {
    renderWithProviders(<MomentGuardProbe />, {
      profile: { role: "person" },
      moment: {
        id: "moment-1",
        riskLevel: 3,
        chips: ["craving"],
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    });

    await waitFor(() => {
      expect(screen.getByText("moment-ready")).toBeInTheDocument();
    });
  });

  it("marks the guard ready when no specific role is required", async () => {
    renderWithProviders(<ProfileGuardProbe />, {
      profile: { role: "caregiver" },
    });

    await waitFor(() => {
      expect(screen.getByText("protected:caregiver")).toBeInTheDocument();
    });
  });

  it("redirects caregivers without a moment to the caregiver home", async () => {
    renderWithProviders(<MomentGuardProbe homePath="/caregiver" />, {
      profile: { role: "caregiver" },
      moment: null,
    });

    await waitFor(() => {
      expect(getMockNavigation().replace).toHaveBeenCalledWith("/caregiver");
    });
  });
});
