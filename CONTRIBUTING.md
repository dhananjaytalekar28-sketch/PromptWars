# Contributing to RecoverAI

Use Node.js 24.2.0 and install exactly from the lock file with `npm ci`. Create a short-lived branch, keep changes focused, and preserve the connected Person/Caregiver workflow, accessibility behavior, locale behavior, and visible UI unless the issue explicitly changes them.

## Required checks

Run `npm run format` before review, then:

```bash
npm run verify
npm audit --audit-level=high
npm run test:e2e
```

Add behavior-focused tests for changed behavior. Do not weaken coverage thresholds, bundle budgets, validation, rate limiting, or security headers to make a check pass.

## Architecture boundaries

- Pages compose feature and shared modules; business rules belong in `src/features`.
- Reusable UI, context, persistence, logging, and hooks belong in `src/shared`.
- Browser modules call typed same-origin endpoints and must not import server configuration, providers, `server-only`, `@google/genai`, or Upstash clients.
- Route handlers validate input and return safe structured errors.
- Never add `NEXT_PUBLIC_` credentials or log prompts, nicknames, notes, generated recovery content, tokens, or keys.

## Pull requests

Explain the user impact, tests run, security implications, and rollback. Keep generated output (`.next`, coverage, Playwright reports, bundle reports, and TypeScript build state) out of commits. CI must pass with no production secrets; E2E uses only the guarded fake provider.
