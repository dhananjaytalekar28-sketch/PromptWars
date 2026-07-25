import "../helpers/mock-navigation";
import { getMockNavigation } from "../helpers/mock-navigation";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  renderWithProviders,
  setupProviderTestEnvironment,
} from "../helpers/render-with-providers";

describe("role picker", () => {
  setupProviderTestEnvironment();

  it("renders role choices and keeps continue disabled until a role is selected", async () => {
    const RolePicker = (await import("@/app/page")).default;

    renderWithProviders(<RolePicker />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Welcome to RecoverAI" })).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: /I'm in recovery/ }));

    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
  });

  it("persists a person profile and navigates to /person", async () => {
    const RolePicker = (await import("@/app/page")).default;
    const { storage } = renderWithProviders(<RolePicker />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /I'm in recovery/ })).toBeEnabled();
    });

    await userEvent.click(screen.getByRole("button", { name: /I'm in recovery/ }));
    await userEvent.type(screen.getByLabelText("Nickname (optional)"), "Ada");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(getMockNavigation().push).toHaveBeenCalledWith("/person");
    });

    const stored = JSON.parse(storage.getItem("rp_profile") ?? "null");
    expect(stored).toEqual({ role: "person", nickname: "Ada" });
  });

  it("persists a caregiver profile and navigates to /caregiver", async () => {
    const RolePicker = (await import("@/app/page")).default;
    const { storage } = renderWithProviders(<RolePicker />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /I'm a caregiver/ })).toBeEnabled();
    });

    await userEvent.click(screen.getByRole("button", { name: /I'm a caregiver/ }));
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(getMockNavigation().push).toHaveBeenCalledWith("/caregiver");
    });

    const stored = JSON.parse(storage.getItem("rp_profile") ?? "null");
    expect(stored).toEqual({ role: "caregiver" });
  });

  it("redirects an existing profile to the role home", async () => {
    const RolePicker = (await import("@/app/page")).default;

    renderWithProviders(<RolePicker />, {
      profile: { role: "person", nickname: "Ada" },
    });

    await waitFor(() => {
      expect(getMockNavigation().replace).toHaveBeenCalledWith("/person");
    });

    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });
});
