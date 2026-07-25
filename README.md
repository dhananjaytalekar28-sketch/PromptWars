# RecoverAI

RecoverAI is a Next.js 16 recovery-support application for people navigating substance use disorders and their caregivers. It combines local, privacy-conscious check-ins with server-generated interventions, scripts, caregiver briefings, and learning explanations. It is not medical care.

## Capabilities

- Zero-typing risk check-ins and actionable interventions
- Dual person/caregiver emergency scripts
- Caregiver briefings linked to the latest check-in
- Curated learning cards with optional AI personalization
- Safety tools that remain available when AI is unavailable
- Light/dark themes, four locales, RTL layout, keyboard and screen-reader support

## Local setup

Use Node.js 24.2.0.

```bash
npm ci
copy .env.example .env.local
npm run dev
```

Fill the server-only values in `.env.local`; never prefix Gemini or Upstash variables with `NEXT_PUBLIC_`. The complete variable list and safe defaults are in `.env.example`. Open `http://localhost:3000`.

## Architecture

Browser code contains feature pages, shared UI, validated local persistence, and a typed same-origin AI client. Next.js Route Handlers validate bounded requests, apply Upstash Redis rate limits, and call Gemini through the server-only `@google/genai` adapter. Provider responses are treated as untrusted data and validated with Zod before being returned.

Production is a dynamic Vercel deployment. It is not a Firebase static export. Gemini and Upstash credentials remain in the server environment.

## Scripts

- `npm run dev` — development server
- `npm run build` / `npm run start` — production build and server
- `npm run format` / `npm run format:check` — Prettier
- `npm run lint` — ESLint with zero warnings
- `npm run typecheck` — strict TypeScript validation
- `npm run test` / `npm run test:coverage` — Vitest suite and coverage gates
- `npm run test:e2e` — Playwright recovery workflows
- `npm run analyze` — Next.js bundle analyzer
- `npm run check:bundle` — client bundle isolation and size budgets
- `npm run verify` — local formatting, lint, type, coverage, build, and bundle gates

## Testing the workflow

Choose Person, save a check-in, generate an intervention and scripts, switch to Caregiver, generate a briefing, personalize a Learn card, and open Safety. For deterministic E2E only, `E2E_FAKE_AI=true` selects the fake provider outside production. Production never returns fake AI results.

## Security

Inputs and persisted state are schema-validated; request bodies are bounded; production rate limiting fails closed; logs exclude prompts and personal recovery content; AI output is rendered as text; security headers are configured in `next.config.ts`; and CI audits high-severity dependencies. See `docs/architecture/ADR-001-server-side-ai-boundary.md`.

## Deploying to Vercel

1. Import the repository into Vercel.
2. Configure every variable from `.env.example` for the target environments.
3. Build with `npm run build`.
4. Deploy only after `npm run verify`, `npm audit --audit-level=high`, and E2E pass.
5. Verify security headers and a real AI request without exposing environment values.

See `CONTRIBUTING.md` for engineering expectations and `docs/ENGINEERING-AUDIT-REMEDIATION.md` for remediation evidence.
