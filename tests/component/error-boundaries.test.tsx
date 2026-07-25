import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppProviders } from "@/shared/context/app-providers";

const { mockLoggerError } = vi.hoisted(() => ({
  mockLoggerError: vi.fn(),
}));

vi.mock("@/shared/logging/client-logger", () => ({
  createClientLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: mockLoggerError,
  }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function createSensitiveError(): Error & { digest?: string } {
  const error = new Error(
    "SECRET_INTERNAL_FAILURE: connection to db://admin:password@host",
  ) as Error & { digest?: string };
  error.stack = "Error: SECRET_INTERNAL_FAILURE\n    at /src/internal/secrets.ts:99:13";
  error.digest = "opaque-digest-7f3a";
  return error;
}

function renderWithProviders(ui: React.ReactElement) {
  return render(<AppProviders>{ui}</AppProviders>);
}

describe("route-level failure handling", () => {
  beforeEach(() => {
    localStorage.clear();
    mockLoggerError.mockClear();
    vi.restoreAllMocks();
    mockLoggerError.mockClear();
  });

  describe("error.tsx", () => {
    it("shows a safe generic message without leaking error details", async () => {
      const { default: RouteError } = await import("@/app/error");
      const reset = vi.fn();

      renderWithProviders(<RouteError error={createSensitiveError()} reset={reset} />);

      await waitFor(() => {
        expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      });

      expect(screen.queryByText(/SECRET_INTERNAL_FAILURE/)).not.toBeInTheDocument();
      expect(screen.queryByText(/db:\/\/admin/)).not.toBeInTheDocument();
      expect(screen.queryByText(/secrets\.ts/)).not.toBeInTheDocument();
      expect(screen.queryByText(/opaque-digest/)).not.toBeInTheDocument();
    });

    it("calls reset when retry is clicked", async () => {
      const { default: RouteError } = await import("@/app/error");
      const reset = vi.fn();

      renderWithProviders(<RouteError error={createSensitiveError()} reset={reset} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled();
      });

      fireEvent.click(screen.getByRole("button", { name: "Retry" }));
      expect(reset).toHaveBeenCalledOnce();
    });

    it("keeps the Safety route reachable", async () => {
      const { default: RouteError } = await import("@/app/error");
      const reset = vi.fn();

      renderWithProviders(<RouteError error={createSensitiveError()} reset={reset} />);

      await waitFor(() => {
        expect(screen.getByRole("link", { name: "Safety" })).toBeInTheDocument();
      });

      expect(screen.getByRole("link", { name: "Safety" })).toHaveAttribute("href", "/safety");
    });

    it("logs only an opaque digest, not the raw error message", async () => {
      const { default: RouteError } = await import("@/app/error");
      const reset = vi.fn();

      renderWithProviders(<RouteError error={createSensitiveError()} reset={reset} />);

      await waitFor(() => {
        expect(mockLoggerError).toHaveBeenCalled();
      });

      const [message, metadata] = mockLoggerError.mock.calls[0] ?? [];
      expect(message).toBe("route.error");
      expect(metadata).toEqual({ requestId: "opaque-digest-7f3a" });
      expect(JSON.stringify(metadata)).not.toMatch(/SECRET|password|secrets\.ts/i);
    });
  });

  describe("global-error.tsx", () => {
    it("renders html and body with static safe fallback text", async () => {
      const { default: GlobalError } = await import("@/app/global-error");
      const reset = vi.fn();
      const markup = renderToStaticMarkup(
        <GlobalError error={createSensitiveError()} reset={reset} />,
      );

      expect(markup).toMatch(/<html[\s>]/);
      expect(markup).toMatch(/<body[\s>]/);
      expect(markup).toContain("Something went wrong");
      expect(markup).not.toMatch(/SECRET_INTERNAL_FAILURE/);
      expect(markup).not.toMatch(/secrets\.ts/);
    });

    it("calls reset and links to Safety without providers", async () => {
      const { default: GlobalError } = await import("@/app/global-error");
      const reset = vi.fn();

      render(<GlobalError error={createSensitiveError()} reset={reset} />);

      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
      expect(reset).toHaveBeenCalledOnce();

      expect(screen.getByRole("link", { name: "Safety & Helplines" })).toHaveAttribute(
        "href",
        "/safety",
      );
      expect(screen.getByRole("link", { name: "Go home" })).toHaveAttribute("href", "/");
    });
  });

  describe("not-found.tsx", () => {
    it("shows a safe not-found message without route internals", async () => {
      const { default: NotFound } = await import("@/app/not-found");

      renderWithProviders(<NotFound />);

      await waitFor(() => {
        expect(screen.getByText("Page not found")).toBeInTheDocument();
      });

      expect(screen.queryByText(/SECRET|\.ts|pathname/i)).not.toBeInTheDocument();
    });

    it("links to home and Safety", async () => {
      const { default: NotFound } = await import("@/app/not-found");

      renderWithProviders(<NotFound />);

      await waitFor(() => {
        expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
      });

      expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
      expect(screen.getByRole("link", { name: "Safety" })).toHaveAttribute("href", "/safety");
    });
  });
});
