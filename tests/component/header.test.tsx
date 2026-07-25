import "../helpers/mock-navigation";
import { getMockNavigation } from "../helpers/mock-navigation";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { BottomNav } from "@/shared/components/BottomNav";
import { DisclaimerBanner } from "@/shared/components/DisclaimerBanner";
import { FlashBanner } from "@/shared/components/FlashBanner";
import { Header } from "@/shared/components/Header";
import { SkipLink } from "@/shared/components/SkipLink";
import { useFlash } from "@/shared/context/flash-context";
import { useSession } from "@/shared/context/session-context";
import {
  renderWithProviders,
  setupProviderTestEnvironment,
} from "../helpers/render-with-providers";

function FlashSetter({ message }: { message: string }) {
  const { setFlash } = useFlash();
  return (
    <button type="button" onClick={() => setFlash(message)}>
      Trigger flash
    </button>
  );
}

describe("header and navigation chrome", () => {
  setupProviderTestEnvironment();

  it("hides role navigation until a profile exists", async () => {
    renderWithProviders(<Header />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "RecoverAI" })).toBeInTheDocument();
    });

    expect(screen.queryByRole("navigation", { name: "Main navigation" })).not.toBeInTheDocument();
  });

  it("gates intervene navigation and shows a flash when no check-in exists", async () => {
    renderWithProviders(
      <>
        <Header />
        <FlashBanner />
      </>,
      {
        profile: { role: "person" },
        moment: null,
        pathname: "/person",
      },
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Intervene" })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Intervene" }));

    expect(getMockNavigation().push).toHaveBeenCalledWith("/person");
    await waitFor(() => {
      expect(
        screen.getByText("Complete a check-in first to use this feature."),
      ).toBeInTheDocument();
    });
  });

  it("navigates to gated routes when a moment exists", async () => {
    renderWithProviders(<Header />, {
      profile: { role: "person" },
      moment: {
        id: "moment-1",
        riskLevel: 3,
        chips: ["craving"],
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      pathname: "/person",
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Intervene" })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Intervene" }));

    expect(getMockNavigation().push).toHaveBeenCalledWith("/intervene");
  });

  it("switches roles and navigates to the new home route", async () => {
    renderWithProviders(<Header />, {
      profile: { role: "person", nickname: "Ada" },
      pathname: "/person",
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Switch to Caregiver/i })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: /Switch to Caregiver/i }));

    await waitFor(() => {
      expect(getMockNavigation().push).toHaveBeenCalledWith("/caregiver");
    });
  });

  it("blocks mobile scripts navigation without a moment", async () => {
    renderWithProviders(
      <>
        <Header />
        <FlashBanner />
      </>,
      {
        profile: { role: "person" },
        moment: null,
        pathname: "/person",
      },
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Menu" })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Menu" }));
    await userEvent.click(screen.getByRole("link", { name: "Scripts" }));

    expect(getMockNavigation().push).toHaveBeenCalledWith("/person");
    await waitFor(() => {
      expect(
        screen.getByText("Complete a check-in first to use this feature."),
      ).toBeInTheDocument();
    });
  });

  it("renders bottom navigation flash gating for person routes", async () => {
    renderWithProviders(
      <>
        <BottomNav />
        <FlashBanner />
      </>,
      {
        profile: { role: "person" },
        moment: null,
        pathname: "/person",
      },
    );

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Intervene" })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("link", { name: "Intervene" }));

    await waitFor(() => {
      expect(
        screen.getByText("Complete a check-in first to use this feature."),
      ).toBeInTheDocument();
    });
  });

  it("renders disclaimer, skip link, and dismissible flash banner", async () => {
    renderWithProviders(
      <>
        <SkipLink />
        <DisclaimerBanner />
        <FlashSetter message="person.checkin.success" />
        <FlashBanner />
      </>,
      { profile: { role: "person" } },
    );

    await waitFor(() => {
      expect(
        screen.getByText(
          "Not medical care. If you or someone else is in immediate danger, contact local emergency services.",
        ),
      ).toBeInTheDocument();
    });

    expect(screen.getByRole("link", { name: "Skip to content" })).toHaveAttribute(
      "href",
      "#main-content",
    );

    await userEvent.click(screen.getByRole("button", { name: "Trigger flash" }));

    await waitFor(() => {
      expect(screen.getByText("Check-in saved. Choose your next step below.")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    await waitFor(() => {
      expect(
        screen.queryByText("Check-in saved. Choose your next step below."),
      ).not.toBeInTheDocument();
    });
  });

  it("sends unauthenticated users home from the app title control", async () => {
    renderWithProviders(<Header />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "RecoverAI" })).toBeEnabled();
    });

    await userEvent.click(screen.getByRole("button", { name: "RecoverAI" }));

    expect(getMockNavigation().push).toHaveBeenCalledWith("/");
  });

  it("sends authenticated users to their role home from the app title control", async () => {
    function HomePathProbe() {
      const { homePath } = useSession();
      return <span data-testid="home-path">{homePath}</span>;
    }

    renderWithProviders(
      <>
        <Header />
        <HomePathProbe />
      </>,
      { profile: { role: "caregiver" } },
    );

    await waitFor(() => {
      expect(screen.getByTestId("home-path")).toHaveTextContent("/caregiver");
    });

    await userEvent.click(screen.getByRole("button", { name: "RecoverAI" }));

    expect(getMockNavigation().push).toHaveBeenCalledWith("/caregiver");
  });

  it("updates the interface language from the header selector", async () => {
    renderWithProviders(<Header />, {
      profile: { role: "person" },
      pathname: "/person",
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Select language")).toBeEnabled();
    });

    await userEvent.selectOptions(screen.getByLabelText("Select language"), "es");

    await waitFor(() => {
      expect(document.documentElement.getAttribute("lang")).toBe("es");
    });
  });

  it("toggles the color theme from the header control", async () => {
    renderWithProviders(<Header />, {
      profile: { role: "person" },
      theme: "light",
      pathname: "/person",
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Switch color theme")).toBeEnabled();
    });

    await userEvent.click(screen.getByLabelText("Switch color theme"));

    await waitFor(() => {
      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    });
  });

  it("closes the mobile menu from the header toggle", async () => {
    renderWithProviders(<Header />, {
      profile: { role: "person" },
      pathname: "/person",
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Menu" })).toBeEnabled();
    });

    await userEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(screen.getByRole("button", { name: "Close menu" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Close menu" }));

    await waitFor(() => {
      expect(screen.queryByRole("link", { name: "Scripts" })).not.toBeInTheDocument();
    });
  });

  it("renders caregiver bottom navigation links when the caregiver role is active", async () => {
    renderWithProviders(<BottomNav />, {
      profile: { role: "caregiver" },
      moment: {
        id: "moment-1",
        riskLevel: 3,
        chips: ["craving"],
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      pathname: "/caregiver",
    });

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Scripts" })).toHaveAttribute("href", "/scripts");
    });
  });
});
