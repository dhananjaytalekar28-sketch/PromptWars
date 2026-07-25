# Engineering audit remediation

Date: 2026-07-25

This scorecard maps every severity-tagged finding in `docs/UI-UX-SPECIFICATION.md` to implementation evidence. “Mitigated” means the reported defect is covered; “Residual” is intentionally not overstated and remains follow-up work.

## Critical

- **C1 / F1 — broken deployment routing and silent gated navigation: Mitigated.** Firebase export was removed; Vercel runs dynamic Next.js routes. Shared guards and navigation provide safe redirects and flash feedback. Files: `next.config.ts`, `src/shared/hooks/use-guards.ts`, `src/shared/components/{Header,BottomNav}.tsx`. Tests: `tests/component/guards.test.tsx`, `tests/e2e/recovery-workflows.spec.ts`.
- **C2 — locale-aware crisis resources: Residual.** The app clearly directs users to local emergency services, but country-specific verified resources still require a region model and content review. Files: `src/app/safety/page.tsx`. Tests: `tests/component/safety.test.tsx`.
- **C3 — unstable mobile navigation: Mitigated.** Responsive header and fixed four-item mobile navigation are separated. Files: `src/shared/components/{Header,BottomNav}.tsx`, `src/app/globals.css`. Tests: `tests/component/header.test.tsx`.

## High

- **H1/H2 — narrow shell and non-responsive navigation: Mitigated.** Shared shell widths and breakpoint-specific header/bottom navigation are implemented. Tests: `tests/component/header.test.tsx`.
- **H3 — redirects during render: Mitigated.** Redirects run in effects through shared guards. File: `src/shared/hooks/use-guards.ts`. Tests: `tests/component/guards.test.tsx`.
- **H4 — blank hydration screen: Mitigated.** Focused providers own hydration and preserve application shell behavior. Files: `src/shared/context/*.tsx`. Tests: `tests/component/contexts.test.tsx`.
- **H5 — incomplete custom radio keyboard model: Mitigated.** Risk selection behavior and accessible labels are regression-tested. Files: `src/app/person/page.tsx`. Tests: `tests/component/person-check-in.test.tsx`.
- **H6 — unannounced AI state: Mitigated.** Typed AI action state exposes loading/error/retry and pages render status semantics. Files: `src/features/ai/use-ai-action.ts`, AI feature pages. Tests: `tests/component/ai-pages.test.tsx`.
- **H7 — partial localization: Residual.** Shell and workflow strings have locale parity, while curated card prose and external AI output remain partly English. Files: `src/shared/i18n/`, `src/features/learning/cards.ts`. Tests: `tests/unit/i18n-locales.test.ts`.
- **H8 — persistent disclaimer alert: Mitigated.** Disclaimer is passive text rather than an assertive alert. File: `src/shared/components/DisclaimerBanner.tsx`. Test: `tests/component/header.test.tsx`.
- **F2/F3/F4 — role routing, stale high-risk CTA, briefing persistence: Mitigated.** Files: `src/shared/components/Header.tsx`, `src/app/person/page.tsx`, `src/app/caregiver/page.tsx`, `src/shared/context/session-context.tsx`. Tests: person, AI-page, context, and E2E suites.

## Medium

- **M1/M2/M3/M4 — typography, spacing, cards, and buttons: Mitigated for current screens.** CSS variables and shared visual patterns standardize active routes. Files: `src/app/globals.css`, route pages. Evidence: component and E2E regression suites.
- **M5 — clipboard and speech feedback: Mitigated.** Success/failure and speech cancellation/language behavior are covered. Files: `src/app/scripts/page.tsx`, `src/app/safety/page.tsx`. Tests: `tests/component/ai-pages.test.tsx`, `tests/component/safety.test.tsx`.
- **M6 — role selection responsiveness: Mitigated.** File: `src/app/page.tsx`. Tests: `tests/component/role-picker.test.tsx`.
- **M7 — high-risk hierarchy: Mitigated.** Safety remains reachable and is promoted from live risk selection. File: `src/app/person/page.tsx`. Tests: `tests/component/person-check-in.test.tsx`.
- **M8 — learning disclosure affordance: Mitigated.** File: `src/app/learn/page.tsx`. Tests: AI-page and E2E suites.
- **M9 — generated-text readability: Mitigated for current layouts.** Files: `src/app/scripts/page.tsx`, `src/app/caregiver/page.tsx`. Evidence: component tests and manual UI specification.
- **F5/F6/F7/F8 — guard effects, skip/title localization, speech/clipboard status, theme consolidation: Mitigated.** Files: `src/shared/hooks/use-guards.ts`, `src/shared/components/SkipLink.tsx`, `src/shared/context/settings-context.tsx`, relevant pages. Tests: guard, header, context, AI-page, and safety suites.

## Low

- **L1 — emoji icon consistency: Residual.** Decorative emoji remain in curated learning content; replacing them needs a reviewed icon system and visual-change approval. File: `src/features/learning/cards.ts`.
- **L2 — external-link announcement: Mitigated.** Safety link behavior is covered by accessible text and safety regression tests. Files: `src/app/safety/page.tsx`. Tests: `tests/component/safety.test.tsx`.

## Engineering controls added

Server-only Gemini isolation, strict request/response schemas, bounded route bodies, distributed rate limiting, redacted logging, safe error boundaries, deterministic E2E, pinned CI actions, weekly dependency updates, coverage thresholds, and bundle budgets are implemented in `src/features/ai`, `src/shared`, `.github`, `tests`, and `scripts/check-bundle-budget.mjs`.

Residual product risks are country-specific crisis-resource governance, full translation of curated/AI content, external Gemini/Upstash availability and free-tier quotas, no authentication by product design, and local-device-only persistence.
