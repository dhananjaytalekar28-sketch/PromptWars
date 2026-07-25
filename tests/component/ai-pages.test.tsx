import "../helpers/mock-navigation";
import { getMockNavigation } from "../helpers/mock-navigation";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Moment } from "@/features/check-in/types";
import { AppError } from "@/shared/errors/app-error";
import {
  renderWithProviders,
  setupProviderTestEnvironment,
} from "../helpers/render-with-providers";

const validIntervention = {
  steps: [
    { title: "Breathe", body: "Take five slow breaths." },
    { title: "Ground", body: "Name five things you can see." },
    { title: "Reach out", body: "Text your support person." },
  ],
};

const validScripts = {
  personScript: "Person script text",
  caregiverScript: "Caregiver script text",
};

const validBriefing = {
  briefing: "They may feel overwhelmed.",
  doSay: ["I am here with you."],
  dontSay: ["Just stop thinking about it."],
};

const validLearn = {
  blurb: "This matters because cravings peak and pass.",
};

const baseMoment: Moment = {
  id: "moment-1",
  riskLevel: 4,
  chips: ["craving", "alone"],
  updatedAt: "2026-01-01T00:00:00.000Z",
};

vi.mock("@/features/ai/client", () => ({
  requestAi: vi.fn(),
}));

describe("AI-driven pages", () => {
  setupProviderTestEnvironment();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("runs intervene loading, success, error, and retry flows", async () => {
    const { requestAi } = await import("@/features/ai/client");
    vi.mocked(requestAi)
      .mockRejectedValueOnce(new AppError("PROVIDER_ERROR"))
      .mockResolvedValueOnce(validIntervention);

    const IntervenePage = (await import("@/app/intervene/page")).default;
    const { storage } = renderWithProviders(<IntervenePage />, {
      profile: { role: "person" },
      moment: { ...baseMoment },
      pathname: "/intervene",
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Get Steps Now" })).toBeEnabled();
    });

    await userEvent.click(screen.getByRole("button", { name: "Get Steps Now" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(screen.getByText("1. Breathe")).toBeInTheDocument();
    });

    const stored = JSON.parse(storage.getItem("rp_moment") ?? "null");
    expect(stored.lastIntervention.steps).toHaveLength(3);
    expect(requestAi).toHaveBeenCalledTimes(2);
  });

  it("generates scripts with clipboard and speech controls", async () => {
    const { requestAi } = await import("@/features/ai/client");
    vi.mocked(requestAi).mockResolvedValue(validScripts);

    const speak = vi.fn();
    const cancel = vi.fn();
    const writeText = vi.fn().mockResolvedValue(undefined);

    vi.stubGlobal("speechSynthesis", {
      speak,
      cancel,
      pending: false,
      speaking: false,
      paused: false,
      getVoices: () => [],
      pause: vi.fn(),
      resume: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText, readText: vi.fn() },
    });

    const ScriptsPage = (await import("@/app/scripts/page")).default;
    renderWithProviders(<ScriptsPage />, {
      profile: { role: "person" },
      moment: { ...baseMoment },
      pathname: "/scripts",
      lang: "es",
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Generar guiones/i })).toBeEnabled();
    });

    await userEvent.click(screen.getByRole("button", { name: /Generar guiones/i }));

    await waitFor(() => {
      expect(screen.getByText("Person script text")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: /Copiar Tu guión \(Persona\)/i }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("Person script text");
      expect(screen.getByText("Guión copiado")).toBeInTheDocument();
    });

    await userEvent.click(
      screen.getByRole("button", { name: /Leer en voz alta Tu guión \(Persona\)/i }),
    );

    expect(cancel).toHaveBeenCalled();
    expect(speak).toHaveBeenCalled();
    const utterance = speak.mock.calls[0]?.[0] as SpeechSynthesisUtterance;
    expect(utterance.lang).toBe("es-ES");
    expect(utterance.text).toBe("Person script text");

    act(() => {
      utterance.onstart?.({} as SpeechSynthesisEvent);
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Detener Tu guión \(Persona\)/i }),
      ).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: /Detener Tu guión \(Persona\)/i }));
    expect(cancel).toHaveBeenCalledTimes(2);
  });

  it("reports clipboard failures on the scripts page", async () => {
    const { requestAi } = await import("@/features/ai/client");
    vi.mocked(requestAi).mockResolvedValue(validScripts);

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockRejectedValue(new Error("denied")),
        readText: vi.fn(),
      },
    });

    const ScriptsPage = (await import("@/app/scripts/page")).default;
    renderWithProviders(<ScriptsPage />, {
      profile: { role: "person" },
      moment: { ...baseMoment },
      pathname: "/scripts",
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Generate Scripts" })).toBeEnabled();
    });

    await userEvent.click(screen.getByRole("button", { name: "Generate Scripts" }));

    await waitFor(() => {
      expect(screen.getByText("Person script text")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Copy Your Script (Person)" }));

    await waitFor(() => {
      expect(screen.getByText("Could not copy")).toBeInTheDocument();
    });
  });

  it("personalizes learn content and persists the blurb", async () => {
    const { requestAi } = await import("@/features/ai/client");
    vi.mocked(requestAi).mockResolvedValue(validLearn);

    const LearnPage = (await import("@/app/learn/page")).default;
    const { storage } = renderWithProviders(<LearnPage />, {
      profile: { role: "person" },
      moment: { ...baseMoment },
      pathname: "/learn",
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Urge Surfing/i })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: /Urge Surfing/i }));
    await userEvent.click(screen.getByRole("button", { name: "Personalize for me" }));

    await waitFor(() => {
      expect(screen.getByText("This matters because cravings peak and pass.")).toBeInTheDocument();
    });

    const stored = JSON.parse(storage.getItem("rp_moment") ?? "null");
    expect(stored.lastLearnBlurb).toEqual(
      expect.objectContaining({
        cardId: "urge-surfing",
        blurb: "This matters because cravings peak and pass.",
      }),
    );
  });

  it("persists caregiver briefings after generation", async () => {
    const { requestAi } = await import("@/features/ai/client");
    vi.mocked(requestAi).mockResolvedValue(validBriefing);

    const CaregiverHome = (await import("@/app/caregiver/page")).default;
    const { storage } = renderWithProviders(<CaregiverHome />, {
      profile: { role: "caregiver" },
      moment: { ...baseMoment },
      pathname: "/caregiver",
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Get Caregiver Briefing" })).toBeEnabled();
    });

    await userEvent.click(screen.getByRole("button", { name: "Get Caregiver Briefing" }));

    await waitFor(() => {
      expect(screen.getByText("They may feel overwhelmed.")).toBeInTheDocument();
      expect(screen.getByText("I am here with you.")).toBeInTheDocument();
    });

    const stored = JSON.parse(storage.getItem("rp_moment") ?? "null");
    expect(stored.lastBriefing.briefing).toBe("They may feel overwhelmed.");
  });

  it("redirects intervene visitors without a saved moment", async () => {
    const IntervenePage = (await import("@/app/intervene/page")).default;

    renderWithProviders(<IntervenePage />, {
      profile: { role: "person" },
      moment: null,
      pathname: "/intervene",
    });

    await waitFor(() => {
      expect(getMockNavigation().replace).toHaveBeenCalledWith("/person");
    });
  });

  it("shows learn personalization guidance when no check-in exists", async () => {
    const LearnPage = (await import("@/app/learn/page")).default;

    renderWithProviders(<LearnPage />, {
      profile: { role: "person" },
      moment: null,
      pathname: "/learn",
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Urge Surfing/i })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: /Urge Surfing/i }));

    expect(
      screen.getByText("Complete a check-in first to enable personalization."),
    ).toBeInTheDocument();
  });
});
