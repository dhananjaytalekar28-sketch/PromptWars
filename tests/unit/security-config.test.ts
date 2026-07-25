import { afterEach, describe, expect, it, vi } from "vitest";
import nextConfig from "../../next.config";

type HeaderEntry = { key: string; value: string };

async function getSecurityHeaders(): Promise<Record<string, string>> {
  const headerGroups = await nextConfig.headers?.();
  const entries =
    headerGroups
      ?.filter((group) => group.source === "/:path*")
      .flatMap((group) => group.headers as HeaderEntry[]) ?? [];

  return Object.fromEntries(entries.map((header) => [header.key, header.value]));
}

describe("next.config security", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });
  it("does not use static export", () => {
    expect(nextConfig.output).not.toBe("export");
  });

  it("disables the X-Powered-By header", () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });

  it("applies required security headers on all routes", async () => {
    const headers = await getSecurityHeaders();

    expect(headers["Content-Security-Policy"]).toBeTruthy();
    expect(headers["Strict-Transport-Security"]).toBe(
      "max-age=63072000; includeSubDomains; preload",
    );
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["Permissions-Policy"]).toBe("camera=(), microphone=(), geolocation=()");
  });

  it("denies framing via CSP frame-ancestors", async () => {
    const headers = await getSecurityHeaders();
    const csp = headers["Content-Security-Policy"];

    expect(csp).toMatch(/frame-ancestors\s+'none'/);
  });

  it("excludes unsafe-eval from the production CSP", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const headers = await getSecurityHeaders();
    const csp = headers["Content-Security-Policy"];

    expect(csp).not.toContain("unsafe-eval");
  });

  it("restricts CSP to same-origin resources with Next.js runtime minimums", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const headers = await getSecurityHeaders();
    const csp = headers["Content-Security-Policy"];

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self' 'unsafe-inline'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).toContain("img-src 'self' blob: data:");
    expect(csp).toContain("font-src 'self'");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).not.toMatch(/\*\s|https?:\/\//);
  });

  it("disables camera, microphone, and geolocation in Permissions-Policy", async () => {
    const headers = await getSecurityHeaders();
    const policy = headers["Permissions-Policy"];

    expect(policy).toMatch(/camera=\(\)/);
    expect(policy).toMatch(/microphone=\(\)/);
    expect(policy).toMatch(/geolocation=\(\)/);
  });
});
