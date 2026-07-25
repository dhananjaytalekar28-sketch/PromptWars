# RecoverAI Engineering Modernization Design

**Date:** 2026-07-25  
**Status:** Proposed for implementation  
**Scope:** Engineering quality, security, maintainability, scalability, performance, testing, and delivery automation. Existing product workflows and business behavior remain unchanged.

## 1. Objective

Modernize RecoverAI from a static hackathon application into a production-ready Next.js application with measurable quality gates. The target is not a cosmetic score; it is a codebase that can credibly earn an excellent engineering review through secure secret handling, validated boundaries, focused modules, deterministic tests, and automated verification.

The modernization must preserve:

- Existing routes and user workflows.
- Person and caregiver roles.
- Check-in persistence and generated intervention, script, briefing, and learning outputs.
- English, Arabic, Spanish, and Norwegian localization.
- Existing accessibility and UI behavior.
- Real Gemini-generated output rather than mocks in production.

## 2. Architecture Decision

Use a **feature-based layered architecture** hosted as a full Next.js application on Vercel.

This is preferable to Clean Architecture, DDD, Onion, or a framework-heavy dependency-injection solution because the domain and team size do not justify those abstractions. The design still applies dependency inversion at external boundaries and keeps domain validation independent from React and Gemini.

### Layers

1. **Route layer:** Next.js pages, layouts, route handlers, and error boundaries.
2. **Feature layer:** Check-in, AI support, safety, learning, profile, and settings behavior.
3. **Shared application layer:** Typed async hooks, persistence interfaces, localization, configuration, logging, and reusable components.
4. **Infrastructure layer:** Gemini provider adapter and browser storage implementation.

Dependencies flow inward:

```text
pages/components -> feature services -> domain schemas/types
API route -> AI application service -> AI provider adapter
browser persistence adapter -> domain schemas/types
```

React components must not import the Gemini SDK, environment secrets, or provider-specific response objects.

## 3. Target Project Structure

```text
src/
  app/
    api/
      ai/
        briefing/route.ts
        intervene/route.ts
        learn/route.ts
        scripts/route.ts
    caregiver/page.tsx
    intervene/page.tsx
    learn/page.tsx
    person/page.tsx
    safety/page.tsx
    scripts/page.tsx
    error.tsx
    global-error.tsx
    layout.tsx
    not-found.tsx
  features/
    ai/
      client.ts
      contracts.ts
      prompts.ts
      schemas.ts
      service.ts
      use-ai-action.ts
    check-in/
      schemas.ts
      types.ts
    learning/
      cards.ts
    profile/
      schemas.ts
      types.ts
  shared/
    components/
    config/
      client.ts
      server.ts
    context/
      session-context.tsx
      settings-context.tsx
    hooks/
      use-guards.ts
    i18n/
      index.ts
      keys.ts
      locales/
        ar.json
        en.json
        es.json
        nb.json
    logging/
      logger.ts
    persistence/
      local-storage.ts
      storage.ts
tests/
  unit/
  component/
  integration/
  e2e/
```

Route directories remain thin and feature code lives with the behavior it implements. Shared code must only be promoted to `shared` after at least two real consumers exist.

## 4. Secure AI Boundary

### Decision

Remove `NEXT_PUBLIC_GEMINI_API_KEY` and all browser-side Gemini SDK usage. Store `GEMINI_API_KEY` as a Vercel server environment variable. All generation flows call same-origin Next.js route handlers.

### Request flow

```text
Browser page
  -> typed feature client
  -> POST /api/ai/{action}
  -> request schema validation
  -> action-specific prompt strategy
  -> Gemini provider adapter
  -> response schema validation
  -> safe typed response
  -> browser page
```

### Required controls

- Zod allow-list validation for every request.
- Zod validation for every AI response.
- Maximum request body size and text length.
- Request timeout using `AbortSignal.timeout` or an equivalent controller.
- Server-side rate limiting keyed by a privacy-preserving client identifier and IP where available.
- Generic client errors with structured internal logs.
- No prompt, nickname, recovery context, API key, or generated content in production logs.
- Server-only module enforcement for provider code.
- Same-origin requests; no permissive CORS.
- CSP, HSTS, `nosniff`, frame protection, referrer policy, and restrictive permissions policy.

The API must fail closed: malformed input, malformed model output, unavailable configuration, timeout, or provider failure returns a safe error response and never exposes internals.

## 5. Domain and Data Validation

Zod schemas become the single source of truth for:

- `Profile`
- `Moment`
- check-in payloads
- learning personalization payloads
- all four AI response types
- localStorage hydration

TypeScript types are inferred from schemas rather than duplicated manually. Invalid or obsolete localStorage values are removed and replaced by safe defaults. Schema migrations may be added if persisted data evolves; the initial implementation only needs validation and discard behavior because no historical server data exists.

AI response schemas enforce:

- Required keys.
- Non-empty bounded strings.
- Bounded array lengths.
- Expected step/list counts.
- No unknown keys where practical.

## 6. State Management

Split the current monolithic context:

- `SessionContext`: profile, current moment, persistence, role switching.
- `SettingsContext`: language, direction, theme, translations.
- Flash messages remain a focused shared notification state or a small dedicated context if necessary.

Provider values are memoized. Mutation functions remain stable with `useCallback`. Derived values such as home route and language direction are computed, not persisted independently.

Local state remains local to pages when it does not need cross-route persistence. AI request state is centralized in `useAiAction`:

```ts
type AiActionState<T> =
  | { status: "idle"; data: T | null; error: null }
  | { status: "loading"; data: T | null; error: null }
  | { status: "success"; data: T; error: null }
  | { status: "error"; data: T | null; error: AppError };
```

The hook supports cancellation on unmount, deduplicated requests, safe retry, and an `onSuccess` persistence callback. It must not implement hidden automatic retries for crisis actions; retry behavior must be explicit or limited to safe transient network failures.

## 7. API and Service Design

Use one provider-neutral application service with action-specific strategies:

```ts
interface AiProvider {
  generateJson(input: {
    systemPrompt: string;
    userPrompt: string;
    signal: AbortSignal;
  }): Promise<unknown>;
}
```

Each action owns:

- Request schema.
- Response schema.
- System prompt.
- User prompt builder.

The route handler delegates to a common executor that validates input, invokes the provider, validates output, maps errors, and emits safe responses. This is Strategy + Adapter + Facade without a DI framework.

No repository pattern is introduced because there is no remote persistence repository. Browser persistence uses a narrow `StorageAdapter` interface to make validation and tests deterministic.

## 8. Error Handling and Logging

Add:

- `app/error.tsx` for route-tree failures.
- `app/global-error.tsx` for root failures.
- `app/not-found.tsx`.
- Typed `AppError` codes for validation, configuration, rate limit, timeout, provider, and malformed-output errors.
- A server logger that emits structured metadata without sensitive content.
- A client logger interface that is silent in production unless a monitoring adapter is configured.

All error screens retain access to the Safety route. Client messages remain generic and actionable. Stack traces and provider messages never cross the API boundary.

External monitoring is adapter-ready but not mandatory for this refactor; introducing a paid vendor is outside scope. Vercel runtime logs provide the initial operational sink.

## 9. Performance

Performance changes must be measured, not assumed:

- Remove the Gemini SDK from all browser bundles.
- Split locale resources and load only the active locale.
- Memoize contexts and expensive derived values.
- Avoid unnecessary dynamic imports for small components.
- Use route-level code splitting provided by the App Router.
- Cancel abandoned requests.
- Prevent duplicate concurrent requests.
- Add bundle analysis as an opt-in build script.
- Set performance budgets for first-load JavaScript and route bundles based on the post-refactor baseline.

Static educational content remains local. AI responses remain persisted as the latest result and are not globally cached because they contain sensitive, user-specific context.

## 10. Testing Strategy

### Unit tests

Use Vitest for:

- All Zod schemas and invalid boundary cases.
- Prompt builders.
- AI result validation.
- error mapping.
- localStorage validation and corruption recovery.
- translation interpolation and missing-key behavior.
- configuration parsing.

### Component tests

Use React Testing Library and `@testing-library/user-event` for:

- Role selection and switching.
- Route guard behavior.
- check-in state updates.
- loading, success, error, retry, and cancellation states.
- copy and speech controls with browser API adapters.
- flash messages and localized settings.

### API integration tests

Invoke route handlers with an injected fake `AiProvider`:

- Valid request and response.
- Invalid request.
- malformed model output.
- timeout.
- provider failure.
- rate limit.

Production Gemini calls are never used in automated tests.

### End-to-end tests

Use Playwright for:

- Person check-in -> intervention -> scripts.
- role switch -> caregiver briefing.
- learning personalization.
- deep-link guards.
- persistence across reload.
- safety route availability after a simulated failure.

E2E uses a test-only deterministic provider enabled only by a server-side test environment variable that cannot be active in production.

### Coverage

- Statements, functions, and lines: at least 90%.
- Branches: at least 85%.
- Security schemas, error mapping, persistence, and API execution: 100% branch coverage.

Coverage is a guardrail, not a substitute for behavior-focused tests.

## 11. Developer Experience

Add:

- `format`, `format:check`, `typecheck`, `test`, `test:coverage`, `test:e2e`, `analyze`, and `verify` scripts.
- Prettier with import-compatible formatting.
- `.env.example` containing names only, never secrets.
- Typed client/server configuration modules that fail fast.
- Updated README for local setup, Vercel deployment, testing, architecture, and security.
- Architecture decision record for the Vercel/server AI boundary.
- A concise contribution guide defining verification commands.

No code generator is needed at the current scale.

## 12. Build and DevOps

Remove static export and Firebase-specific runtime deployment configuration. Vercel becomes the supported production target.

GitHub Actions must run:

1. `npm ci`
2. formatting check
3. ESLint
4. TypeScript
5. unit/component/integration tests with coverage
6. production build
7. `npm audit` at an agreed severity threshold
8. Playwright E2E against the built application

CI actions are pinned to immutable commit SHAs. Secrets are scoped only to deployment jobs. Pull requests from forks never receive deployment or provider secrets. Vercel deployment may remain connected through its Git integration; CI still gates merge quality.

## 13. Dependency and Supply-Chain Management

- Remove Firebase tools if Firebase deployment is retired.
- Remove dead Vercel CLI only if deployment uses Git integration; otherwise retain it intentionally.
- Retain Zod and use it at all trust boundaries.
- Use the current supported Google GenAI SDK after consulting its installed-version documentation and migration guidance.
- Commit `package-lock.json` and use `npm ci`.
- Add Dependabot configuration for weekly grouped updates.
- Add license and vulnerability checks only if they provide actionable output; avoid redundant scanners.

## 14. Design Patterns

Appropriate patterns:

- **Adapter:** Gemini implementation of `AiProvider`.
- **Strategy:** action-specific schemas and prompt builders.
- **Facade:** server AI executor and typed browser client.
- **Observer:** React state/context.
- **State:** discriminated async request states.
- **Dependency injection:** constructor/function injection only at infrastructure boundaries and in tests.

Explicitly excluded as unnecessary:

- Repository pattern for local-only state.
- Global service locator or DI container.
- Builder, Composite, Command, and Decorator abstractions without a concrete use case.
- DDD aggregates or event sourcing.

## 15. Migration Sequence

1. Establish test tooling and capture existing business behavior.
2. Add schemas and validated persistence without changing user-visible behavior.
3. Add provider-neutral AI contracts and server route handlers.
4. Move Gemini calls to the server and remove the public key path.
5. Refactor pages onto the shared async action hook.
6. Split and memoize contexts.
7. Reorganize files by feature and remove dead modules.
8. Add error boundaries, logging, rate limiting, timeout, and security headers.
9. Split locales and verify all languages.
10. Add E2E tests, CI, dependency automation, bundle budgets, and documentation.
11. Build and deploy to Vercel with a real server-side key.
12. Run the full verification suite and perform a final engineering re-audit.

Each stage must leave the application buildable and testable. Existing uncommitted UI/accessibility changes are preserved and incorporated rather than overwritten.

## 16. Acceptance Criteria

The modernization is complete only when:

- No secret or provider credential appears in a client bundle.
- No `NEXT_PUBLIC_GEMINI_API_KEY` reference remains.
- Every external input, persisted value, and AI response is runtime validated.
- No unchecked `as` cast exists at a trust boundary.
- No dead source module or unused direct dependency remains.
- No route performs navigation during render.
- Every async action supports cancellation and exposes typed state.
- Error boundaries and safe API error mapping are active.
- Security headers are verified in the production deployment.
- All four product workflows pass E2E tests.
- Coverage thresholds pass.
- Formatting, linting, type checking, tests, production build, dependency audit, and E2E pass in CI.
- Browser bundles do not include the Gemini SDK.
- README and environment documentation match the deployed architecture.
- The Vercel production URL successfully completes a real Gemini workflow.

## 17. Non-Goals

- Changing product behavior, content strategy, or visual design.
- Adding authentication, accounts, cloud persistence, multi-tenancy, billing, or analytics.
- Introducing paid monitoring or infrastructure services.
- Replacing localStorage with a database.
- Building generalized framework abstractions for hypothetical future products.

These can be designed independently if future requirements demand them.

## 18. Risks and Mitigations

- **Free-tier limitations:** Vercel and Gemini quotas can throttle usage. Mitigate with bounded requests, rate limiting, clear retry messaging, and documented quotas.
- **Provider response variability:** Mitigate with strict schemas, bounded retries where safe, and safe error handling.
- **Large refactor regression:** Mitigate by capturing behavior first, migrating incrementally, and running E2E after each major boundary change.
- **Local persisted-state incompatibility:** Validate and discard invalid legacy data; never crash during hydration.
- **Documentation drift:** CI verifies required environment names and the README is updated in the same change as deployment architecture.
