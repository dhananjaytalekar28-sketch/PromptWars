import "../helpers/mock-navigation";
import { getMockNavigation } from "../helpers/mock-navigation";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  renderWithProviders,
  setupProviderTestEnvironment,
} from "../helpers/render-with-providers";

describe("person check-in", () => {
  setupProviderTestEnvironment();

  it("requires at least one chip before saving a check-in", async () => {
    const PersonHome = (await import("@/app/person/page")).default;

    renderWithProviders(<PersonHome />, {
      profile: { role: "person", nickname: "Ada" },
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Hey Ada/i })).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Check in" })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "craving" }));

    expect(screen.getByRole("button", { name: "Check in" })).toBeEnabled();
  });

  it("persists a check-in and surfaces success feedback", async () => {
    const PersonHome = (await import("@/app/person/page")).default;
    const { storage } = renderWithProviders(<PersonHome />, {
      profile: { role: "person" },
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Check in" })).toBeDisabled();
    });

    await userEvent.click(screen.getByRole("button", { name: "craving" }));
    await userEvent.click(screen.getByRole("button", { name: "Check in" }));

    await waitFor(() => {
      expect(screen.getByText("Check-in saved. Choose your next step below.")).toBeInTheDocument();
    });

    const stored = JSON.parse(storage.getItem("rp_moment") ?? "null");
    expect(stored.chips).toEqual(["craving"]);
    expect(stored.riskLevel).toBe(3);
    expect(stored.id).toBe("test-moment-id");
  });

  it("shows the high-risk safety CTA from live risk selection after check-in", async () => {
    const PersonHome = (await import("@/app/person/page")).default;

    renderWithProviders(<PersonHome />, {
      profile: { role: "person" },
      moment: {
        id: "moment-1",
        riskLevel: 2,
        chips: ["craving"],
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Check in" })).toBeEnabled();
    });

    expect(screen.queryByRole("link", { name: "Safety & Helplines" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("radio", { name: "4" }));

    await waitFor(() => {
      expect(
        screen.getByText(
          "Your check-in suggests you may need immediate support. Safety tools are first.",
        ),
      ).toBeInTheDocument();
    });

    expect(screen.getByRole("link", { name: "Safety & Helplines" })).toHaveAttribute(
      "href",
      "/safety",
    );
    expect(screen.queryByRole("link", { name: "Learn & Prevent" })).not.toBeInTheDocument();
  });

  it("redirects non-person profiles away from the person home", async () => {
    const PersonHome = (await import("@/app/person/page")).default;

    renderWithProviders(<PersonHome />, {
      profile: { role: "caregiver" },
    });

    await waitFor(() => {
      expect(getMockNavigation().replace).toHaveBeenCalledWith("/caregiver");
    });
  });
});
