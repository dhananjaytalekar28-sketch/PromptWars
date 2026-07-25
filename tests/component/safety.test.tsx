import "../helpers/mock-navigation";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  renderWithProviders,
  setupProviderTestEnvironment,
} from "../helpers/render-with-providers";

describe("safety page", () => {
  setupProviderTestEnvironment();

  it("renders grounding copy and English helplines by default", async () => {
    const SafetyPage = (await import("@/app/safety/page")).default;

    renderWithProviders(<SafetyPage />, {
      profile: { role: "person" },
      pathname: "/safety",
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Safety & Grounding" })).toBeInTheDocument();
    });

    expect(screen.getByText("5-4-3-2-1 Grounding")).toBeInTheDocument();
    expect(screen.getByText("SAMHSA National Helpline")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "988" })).toHaveAttribute("href", "tel:988");
  });

  it("switches helplines when the language changes", async () => {
    const SafetyPage = (await import("@/app/safety/page")).default;

    renderWithProviders(<SafetyPage />, {
      profile: { role: "person" },
      lang: "es",
      pathname: "/safety",
    });

    await waitFor(() => {
      expect(screen.getByText("Línea de la Vida 988 (EE. UU.)")).toBeInTheDocument();
    });
  });

  it("copies saved scripts and reports clipboard failures", async () => {
    const SafetyPage = (await import("@/app/safety/page")).default;
    const writeText = vi.fn().mockResolvedValue(undefined);

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText, readText: vi.fn() },
    });

    renderWithProviders(<SafetyPage />, {
      profile: { role: "person" },
      moment: {
        id: "moment-1",
        riskLevel: 3,
        chips: ["craving"],
        updatedAt: "2026-01-01T00:00:00.000Z",
        lastScripts: {
          personScript: "Saved person script",
          caregiverScript: "Saved caregiver script",
          at: "2026-01-01T00:00:00.000Z",
        },
      },
      pathname: "/safety",
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Person Script" })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Person Script" }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("Saved person script");
      expect(screen.getByText("Script copied")).toBeInTheDocument();
    });

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockRejectedValue(new Error("denied")),
        readText: vi.fn(),
      },
    });

    await userEvent.click(screen.getByRole("button", { name: "Caregiver Script" }));

    await waitFor(() => {
      expect(screen.getByText("Could not copy")).toBeInTheDocument();
    });
  });
});
