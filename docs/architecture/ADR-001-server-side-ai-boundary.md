# ADR-001: Server-side AI boundary

- Status: Accepted
- Date: 2026-07-25

## Context

RecoverAI processes sensitive recovery context and depends on Gemini. Shipping provider credentials or the Gemini SDK to browser code would expose credentials, weaken validation, and couple the UI to a vendor. Public AI endpoints also require bounded input, safe errors, and distributed abuse controls.

## Decision

Browser features call typed same-origin Next.js Route Handlers. Route handlers enforce content type and body limits, validate requests with Zod, rate-limit through Upstash Redis, apply timeouts, and invoke a provider-neutral application service. Only the server-only Gemini adapter imports `@google/genai` and reads `GEMINI_API_KEY`. Model output is untrusted and schema-validated before crossing back to the browser.

Production fails closed when required AI or rate-limit configuration is unavailable. Logs use allow-listed metadata and exclude prompt and recovery content. A deterministic fake provider is permitted only when `E2E_FAKE_AI=true` and `NODE_ENV` is not production.

## Consequences

Credentials and provider code stay out of client chunks; the browser has a stable contract; and provider errors become safe application errors. Deployments require a dynamic Node.js runtime, Gemini configuration, and Upstash Redis. AI features depend on those services, while curated learning and Safety remain usable without AI.

## Rejected alternatives

- Direct browser-to-Gemini calls: rejected because credentials and trust decisions would reach an untrusted client.
- `NEXT_PUBLIC_` API keys: rejected because Next.js embeds them in browser assets.
- Static Firebase export: rejected because secure Route Handlers require a server runtime.
- Silent canned fallback responses: rejected because fake content could be mistaken for live recovery guidance.
- In-memory production limiting: rejected because it is not reliable across serverless instances.

## Rollback

Revert browser callers and route composition together to the last verified server-side release. Keep credentials revoked from any client-facing configuration. If Gemini or Upstash is degraded, disable AI endpoints with safe `503` responses while retaining Safety and curated content; do not bypass validation or rate limiting.
