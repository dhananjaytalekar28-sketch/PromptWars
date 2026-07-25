import type { AnchorHTMLAttributes, ReactNode } from "react";
import { vi } from "vitest";

const navigationMocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
  pathname: "/",
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: navigationMocks.push,
    replace: navigationMocks.replace,
    back: navigationMocks.back,
    forward: navigationMocks.forward,
    refresh: navigationMocks.refresh,
    prefetch: navigationMocks.prefetch,
  }),
  usePathname: () => navigationMocks.pathname,
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    onClick,
    ...props
  }: {
    href: string;
    children: ReactNode;
    onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  } & Pick<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    "className" | "aria-current" | "aria-disabled"
  >) => (
    <a href={href} onClick={onClick} {...props}>
      {children}
    </a>
  ),
}));

export function getMockNavigation() {
  return navigationMocks;
}
