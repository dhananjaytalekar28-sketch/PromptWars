# RecoverAI Engineering Modernization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor RecoverAI into a secure, feature-oriented, fully tested Next.js application that keeps all current business workflows while moving Gemini execution behind a server-only boundary.

**Architecture:** Use thin App Router pages and route handlers over feature modules. Browser code calls typed same-origin AI endpoints; server-only adapters invoke Gemini and validate all external data. Contexts, persistence, localization, logging, and async state are isolated behind narrow interfaces.

**Tech Stack:** Next.js 16.2.x, React 19, TypeScript strict mode, Zod 4, `@google/genai`, Vitest, React Testing Library, Playwright, Prettier, Vercel, Upstash Redis rate limiting.

## Global Constraints

- Preserve all routes, roles, check-in behavior, AI workflows, persistence behavior, locales, accessibility behavior, and current UI appearance.
- Never expose Gemini or Upstash credentials through `NEXT_PUBLIC_*`.
- Never log prompts, nicknames, recovery context, generated content, tokens, or API keys.
- Validate requests, persisted state, and AI responses at runtime.
- Use the installed Next.js 16 documentation under `node_modules/next/dist/docs/` when present; otherwise use official Next.js 16 documentation.
- Do not create commits unless the user explicitly authorizes them.
- Preserve the user's existing uncommitted UI/accessibility changes.
- Use Node 24.2.0 for all commands.
- Run focused tests after every task and the full `npm run verify` suite before completion.

---

## Task 1: Establish deterministic quality tooling

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`
- Create: `playwright.config.ts`
- Create: `.prettierrc.json`
- Create: `.prettierignore`
- Create: `tests/unit/i18n.test.ts`

**Interfaces:**

- Produces scripts: `format`, `format:check`, `typecheck`, `test`, `test:watch`, `test:coverage`, `test:e2e`, `analyze`, `verify`.
- Produces browser-like unit test environment with React Testing Library cleanup and Web API stubs.

- [ ] **Step 1: Install current test and formatting dependencies**

Run:

```powershell
nvm use 24.2.0
npm install --save-dev vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @playwright/test prettier @next/bundle-analyzer cross-env yaml
```

Expected: `package.json` and `package-lock.json` include package-manager-resolved current versions and integrity hashes.

- [ ] **Step 2: Add scripts**

Add:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint . --max-warnings=0",
    "typecheck": "tsc --noEmit",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "analyze": "cross-env ANALYZE=true next build",
    "verify": "npm run format:check && npm run lint && npm run typecheck && npm run test:coverage && npm run build"
  }
}
```

Keep the existing package name and metadata.

- [ ] **Step 3: Configure Vitest and coverage**

Create `vitest.config.ts`:

```ts
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/app/**/page.tsx", "src/app/layout.tsx"],
      thresholds: { lines: 90, functions: 90, statements: 90, branches: 85 },
    },
  },
});
```

Create `tests/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
```

- [ ] **Step 4: Configure Playwright**

Create `playwright.config.ts` with:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: "http://127.0.0.1:3000", trace: "on-first-retry" },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    env: { E2E_FAKE_AI: "true" },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
```

- [ ] **Step 5: Add a baseline unit test**

Create `tests/unit/i18n.test.ts` that asserts:

```ts
import { describe, expect, it } from "vitest";
import { getTranslations, t } from "@/lib/i18n";

describe("translations", () => {
  it("interpolates variables", () => {
    expect(t(getTranslations("en"), "person.greeting", { name: "Sam" })).toContain("Sam");
  });

  it("falls back to the key for an unknown translation", () => {
    expect(t(getTranslations("en"), "missing.key")).toBe("missing.key");
  });
});
```

- [ ] **Step 6: Verify the harness**

Run:

```powershell
npm run test
npm run typecheck
```

Expected: baseline tests and TypeScript pass.

---

## Task 2: Make schemas the domain source of truth

**Files:**

- Create: `src/features/profile/schemas.ts`
- Create: `src/features/profile/types.ts`
- Create: `src/features/check-in/schemas.ts`
- Create: `src/features/check-in/types.ts`
- Create: `tests/unit/domain-schemas.test.ts`
- Modify consumers currently importing: `src/lib/types.ts`

**Interfaces:**

- Produces `profileSchema`, `momentSchema`, `momentPayloadSchema`, `learnPayloadSchema`.
- Produces inferred `Profile`, `Role`, `Moment`, `MomentPayload`, `LearnPayload`, `ChipId`.

- [ ] **Step 1: Write failing schema tests**

Cover:

```ts
expect(profileSchema.safeParse({ role: "person", nickname: "A" }).success).toBe(true);
expect(profileSchema.safeParse({ role: "admin" }).success).toBe(false);
expect(momentSchema.safeParse(validMoment).success).toBe(true);
expect(momentSchema.safeParse({ ...validMoment, riskLevel: 6 }).success).toBe(false);
expect(momentSchema.safeParse({ ...validMoment, chips: ["unknown"] }).success).toBe(false);
expect(momentPayloadSchema.safeParse({ riskLevel: 3, chips: [] }).success).toBe(false);
expect(learnPayloadSchema.safeParse({ riskLevel: 3, chips: ["alone"], cardId: "" }).success).toBe(
  false,
);
```

- [ ] **Step 2: Confirm tests fail**

Run:

```powershell
npm run test -- tests/unit/domain-schemas.test.ts
```

Expected: imports do not exist.

- [ ] **Step 3: Implement strict schemas**

In `src/features/check-in/schemas.ts`, define:

```ts
export const allowedChips = [
  "craving",
  "triggered",
  "alone",
  "with-people",
  "after-slip",
  "anxious",
  "angry",
  "tired",
  "need-to-leave",
] as const;

const boundedText = z.string().trim().min(1).max(2_000);

export const interventionSchema = z
  .object({
    steps: z
      .array(z.object({ title: boundedText.max(120), body: boundedText }))
      .min(3)
      .max(5),
    at: z.iso.datetime(),
  })
  .strict();

export const scriptsSchema = z
  .object({
    personScript: boundedText,
    caregiverScript: boundedText,
    at: z.iso.datetime(),
  })
  .strict();

export const briefingSchema = z
  .object({
    briefing: boundedText,
    doSay: z.array(boundedText.max(300)).min(3).max(5),
    dontSay: z.array(boundedText.max(300)).min(3).max(5),
    at: z.iso.datetime(),
  })
  .strict();
```

Define `momentSchema` with risk `1..5`, `chips` min 1/max 9, note max 500, and the persisted response schemas. Define request payload schemas without `at`.

- [ ] **Step 4: Infer all public types**

Use `z.infer<typeof schema>` in the feature type files. Keep a temporary `src/lib/types.ts` compatibility barrel re-exporting the new names so route refactors remain incremental.

- [ ] **Step 5: Run focused tests**

Run:

```powershell
npm run test -- tests/unit/domain-schemas.test.ts
npm run typecheck
```

Expected: all pass.

---

## Task 3: Validate browser persistence and recover corruption

**Files:**

- Create: `src/shared/persistence/storage.ts`
- Create: `src/shared/persistence/local-storage.ts`
- Create: `tests/unit/local-storage.test.ts`
- Modify: `src/context/AppContext.tsx`

**Interfaces:**

- Produces:

```ts
export interface StorageAdapter {
  read<T>(key: string, schema: z.ZodType<T>): T | null;
  write<T>(key: string, value: T): void;
  remove(key: string): void;
}

export function createLocalStorageAdapter(storage: Storage): StorageAdapter;
```

- [ ] **Step 1: Write failing persistence tests**

Test valid hydration, malformed JSON removal, schema-invalid value removal, write failure tolerance, and `null` when missing.

- [ ] **Step 2: Confirm failure**

Run:

```powershell
npm run test -- tests/unit/local-storage.test.ts
```

- [ ] **Step 3: Implement the adapter**

Parse JSON as `unknown`, call `schema.safeParse`, remove invalid entries, and never return unchecked casts. Do not log stored content.

- [ ] **Step 4: Replace `loadJSON<T>` and `saveJSON`**

Hydrate profile with `profileSchema` and moment with `momentSchema`. Keep storage keys unchanged (`rp_profile`, `rp_moment`, `rp_theme`, `rp_lang`) to preserve behavior.

- [ ] **Step 5: Verify**

Run:

```powershell
npm run test -- tests/unit/local-storage.test.ts
npm run typecheck
```

---

## Task 4: Create provider-neutral AI contracts and prompt strategies

**Files:**

- Create: `src/features/ai/contracts.ts`
- Create: `src/features/ai/schemas.ts`
- Create: `src/features/ai/prompts.ts`
- Create: `tests/unit/ai-prompts.test.ts`
- Create: `tests/unit/ai-schemas.test.ts`

**Interfaces:**

- Produces `AiAction`, `AiProvider`, `AiActionDefinition<TRequest,TResponse>`.
- Produces `interventionResponseSchema`, `scriptsResponseSchema`, `briefingResponseSchema`, `learnResponseSchema`.
- Produces `AI_ACTIONS` keyed by `intervene | scripts | briefing | learn`.
- Produces:

```ts
export interface AiRequestByAction {
  intervene: MomentPayload;
  scripts: MomentPayload;
  briefing: MomentPayload;
  learn: LearnPayload;
}

export interface AiResponseByAction {
  intervene: InterventionResponse;
  scripts: ScriptsResponse;
  briefing: BriefingResponse;
  learn: LearnResponse;
}

export type AiResult<A extends AiAction> = AiResponseByAction[A];
```

- [ ] **Step 1: Write failing prompt and response tests**

Assert each prompt includes the bounded risk/chip context, optional notes only when present, and never includes undefined text. Assert malformed model shapes fail and valid shapes pass.

- [ ] **Step 2: Confirm failure**

Run:

```powershell
npm run test -- tests/unit/ai-prompts.test.ts tests/unit/ai-schemas.test.ts
```

- [ ] **Step 3: Implement contracts**

```ts
export interface AiProvider {
  generateJson(input: {
    systemPrompt: string;
    userPrompt: string;
    responseJsonSchema: Record<string, unknown>;
    signal: AbortSignal;
  }): Promise<unknown>;
}

export interface AiActionDefinition<Request, Response> {
  requestSchema: z.ZodType<Request>;
  responseSchema: z.ZodType<Response>;
  systemPrompt: string;
  buildUserPrompt(request: Request): string;
}
```

- [ ] **Step 4: Implement strict action schemas and definitions**

Use `.strict()`, bounded strings, and bounded list lengths. Keep prompt wording behaviorally equivalent to the existing `src/lib/ai-service.ts`.

Convert response schemas for Gemini structured output with Zod 4's `z.toJSONSchema(responseSchema)` at the provider boundary while still parsing every returned value with the original Zod schema.

- [ ] **Step 5: Verify**

Run the focused tests and `npm run typecheck`.

---

## Task 5: Implement server-only Gemini and configuration adapters

**Files:**

- Create: `src/shared/config/server.ts`
- Create: `src/features/ai/providers/gemini-provider.ts`
- Create: `tests/unit/server-config.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Delete after migration: `src/lib/gemini-client.ts`
- Delete after migration: `src/lib/gemini.ts`

**Interfaces:**

- Produces `getServerConfig()` returning `{ geminiApiKey, geminiModel, aiTimeoutMs }`.
- Produces `createGeminiProvider(config): AiProvider`.

- [ ] **Step 1: Replace the deprecated SDK**

Run:

```powershell
npm uninstall @google/generative-ai
npm install @google/genai server-only
```

- [ ] **Step 2: Write failing config tests**

Test missing `GEMINI_API_KEY`, default model, model override, and numeric timeout bounds. Tests must restore `process.env`.

- [ ] **Step 3: Implement fail-fast server configuration**

Use a Zod schema over:

```ts
{
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
  AI_TIMEOUT_MS: process.env.AI_TIMEOUT_MS ?? "15000",
}
```

Import `"server-only"` at the top. Never expose the parsed key.

- [ ] **Step 4: Implement the provider**

Initialize `GoogleGenAI` server-side and call `ai.models.generateContent` with:

```ts
{
  model: config.geminiModel,
  contents: userPrompt,
  config: {
    systemInstruction: systemPrompt,
    responseMimeType: "application/json",
    responseJsonSchema,
  },
}
```

Parse response text as `unknown`; the application service validates it. Respect cancellation through the SDK-supported abort option or race the provider promise against the supplied signal if the SDK does not expose a signal.

- [ ] **Step 5: Verify server-only isolation**

Run focused tests and build. Search the generated client assets for a known non-secret marker from the provider module and confirm it is absent.

---

## Task 6: Add typed AI execution, safe errors, and logging

**Files:**

- Create: `src/shared/errors/app-error.ts`
- Create: `src/shared/logging/logger.ts`
- Create: `src/features/ai/service.ts`
- Create: `tests/unit/ai-service.test.ts`
- Create: `tests/unit/app-error.test.ts`

**Interfaces:**

- Produces:

```ts
export type AppErrorCode =
  | "INVALID_REQUEST"
  | "CONFIGURATION_ERROR"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "PROVIDER_ERROR"
  | "INVALID_PROVIDER_RESPONSE";

export async function executeAiAction<A extends AiAction>(
  action: A,
  rawInput: unknown,
  dependencies: { provider: AiProvider; signal: AbortSignal; logger: Logger },
): Promise<AiResult<A>>;
```

- [ ] **Step 1: Write failing execution tests**

Cover valid input/output, invalid request, malformed provider response, provider exception, abort/timeout, and confirmation that logs contain action/error code but no request content.

- [ ] **Step 2: Implement `AppError`**

Store code, safe message, status, and optional cause. Map:

- invalid request -> 400
- rate limit -> 429
- timeout -> 504
- configuration/provider/malformed response -> 503

- [ ] **Step 3: Implement redacted structured logger**

Allow only known metadata keys: action, code, status, durationMs, requestId. Never accept arbitrary payload objects.

- [ ] **Step 4: Implement action execution**

Validate input, invoke provider, validate output, map errors, and use `performance.now()` for duration. Return only parsed response data.

- [ ] **Step 5: Verify 100% branch coverage for these modules**

Run:

```powershell
npm run test:coverage -- tests/unit/ai-service.test.ts tests/unit/app-error.test.ts
```

---

## Task 7: Add distributed rate limiting and secure API route handlers

**Files:**

- Create: `src/features/ai/rate-limit.ts`
- Create: `src/features/ai/route-handler.ts`
- Create: `src/app/api/ai/intervene/route.ts`
- Create: `src/app/api/ai/scripts/route.ts`
- Create: `src/app/api/ai/briefing/route.ts`
- Create: `src/app/api/ai/learn/route.ts`
- Create: `tests/integration/ai-route-handler.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**

- Produces `RateLimiter.check(identifier): Promise<{ allowed: boolean; retryAfterSeconds: number }>`
- Produces `createAiRouteHandler(action, dependencies?)`.

- [ ] **Step 1: Install the free-tier-compatible distributed limiter**

Run:

```powershell
npm install @upstash/ratelimit @upstash/redis
```

- [ ] **Step 2: Write route integration tests**

Use injected fake provider and limiter. Cover valid 200, malformed JSON 400, oversized body 413, invalid schema 400, rate limit 429 with `Retry-After`, malformed AI 503, timeout 504, and generic response without stack/provider detail.

- [ ] **Step 3: Implement the limiter**

Use Upstash sliding-window limiting in production. Permit an injected in-memory fake only in tests. Parse:

```text
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
AI_RATE_LIMIT_REQUESTS=10
AI_RATE_LIMIT_WINDOW_SECONDS=60
```

Production configuration must fail closed if rate-limit credentials are absent.

- [ ] **Step 4: Implement the common route handler**

Reject non-JSON content types. Read at most 4,096 UTF-8 bytes before `JSON.parse`; return 413 when `Content-Length` exceeds 4,096 or the actual encoded body exceeds 4,096. Derive a hashed identifier from forwarding headers without logging raw IP, apply timeout, and return:

```ts
{
  data: parsedData;
}
```

or:

```ts
{ error: { code: appError.code, message: appError.safeMessage } }
```

- [ ] **Step 5: Create four thin route files**

Each file exports the action shown by its directory name:

```ts
export const runtime = "nodejs";
export const POST = createAiRouteHandler("intervene");
```

`scripts/route.ts`, `briefing/route.ts`, and `learn/route.ts` pass `"scripts"`, `"briefing"`, and `"learn"` respectively.

- [ ] **Step 6: Verify**

Run integration tests, typecheck, and build.

---

## Task 8: Replace browser Gemini calls with a typed cancellable client

**Files:**

- Create: `src/features/ai/client.ts`
- Create: `src/features/ai/use-ai-action.ts`
- Create: `tests/unit/ai-client.test.ts`
- Create: `tests/component/use-ai-action.test.tsx`
- Modify: `src/app/intervene/page.tsx`
- Modify: `src/app/scripts/page.tsx`
- Modify: `src/app/caregiver/page.tsx`
- Modify: `src/app/learn/page.tsx`
- Delete: `src/lib/ai-service.ts`

**Interfaces:**

- Produces `requestAi(action, input, { signal }): Promise<AiResult>`.
- Produces `useAiAction<TInput,TOutput>({ action, initialData, onSuccess })`.

- [ ] **Step 1: Write failing client tests**

Cover success, structured 4xx/5xx errors, invalid response envelope, network error, and abort.

- [ ] **Step 2: Implement typed client**

POST to `/api/ai/${action}` with JSON and signal. Parse the response envelope with Zod before returning it.

- [ ] **Step 3: Write failing hook tests**

Assert `idle -> loading -> success`, `loading -> error`, duplicate invocation suppression, explicit retry, previous data retention, and abort on unmount.

- [ ] **Step 4: Implement discriminated hook state**

Do not update state after abort. Expose `{ state, run, retry, cancel }`.

- [ ] **Step 5: Refactor four pages**

Replace repeated loading/error/status/try-catch logic with the hook while preserving copy, speech, persistence, and visible strings.

- [ ] **Step 6: Remove client provider code**

Delete `src/lib/ai-service.ts` and `src/lib/gemini-client.ts`. Search for `NEXT_PUBLIC_GEMINI_API_KEY`, `GoogleGenerativeAI`, and `@google/generative-ai`; expect zero matches.

- [ ] **Step 7: Verify**

Run focused tests, lint, typecheck, and build.

---

## Task 9: Split and memoize application contexts

**Files:**

- Create: `src/shared/context/session-context.tsx`
- Create: `src/shared/context/settings-context.tsx`
- Create: `src/shared/context/flash-context.tsx`
- Create: `src/shared/context/app-providers.tsx`
- Create: `tests/component/contexts.test.tsx`
- Modify: `src/app/layout.tsx`
- Modify: all context consumers
- Delete: `src/context/AppContext.tsx`

**Interfaces:**

- Produces `useSession()`, `useSettings()`, `useFlash()`, `AppProviders`.
- `homePath` is typed as `"/person" | "/caregiver"`.

- [ ] **Step 1: Write context behavior tests**

Test validated hydration, role switching, persisted moment updates, theme persistence, language direction, flash timeout, and that settings-only updates do not rerender a session-only probe.

- [ ] **Step 2: Implement focused contexts**

Memoize each provider value and keep stable callbacks. Move hydration into the owning context. Keep the existing loading behavior.

- [ ] **Step 3: Update consumers**

Replace `useApp()` with the narrowest hook. Update `useGuards` to consume `useSession` and `useFlash`.

- [ ] **Step 4: Delete monolithic context**

Search for `useApp` and `AppContext`; expect zero matches.

- [ ] **Step 5: Verify**

Run component tests, lint, typecheck, and build.

---

## Task 10: Split and type localization resources

**Files:**

- Create: `src/shared/i18n/locales/en.json`
- Create: `src/shared/i18n/locales/ar.json`
- Create: `src/shared/i18n/locales/es.json`
- Create: `src/shared/i18n/locales/nb.json`
- Create: `src/shared/i18n/keys.ts`
- Create: `src/shared/i18n/index.ts`
- Create: `tests/unit/i18n-locales.test.ts`
- Modify localization consumers
- Delete: `src/lib/i18n.ts`

**Interfaces:**

- Produces `LangCode`, `TranslationKey`, `loadTranslations`, `translate`.

- [ ] **Step 1: Extract locale JSON without changing text**

Use English keys as the canonical key union:

```ts
import en from "./locales/en.json";
export type TranslationKey = keyof typeof en;
```

- [ ] **Step 2: Write locale parity tests**

Assert every locale has exactly the English key set, interpolation placeholders match by key, and unknown language codes fall back to English.

- [ ] **Step 3: Implement lazy locale loaders**

```ts
const loaders = {
  en: () => import("./locales/en.json"),
  ar: () => import("./locales/ar.json"),
  es: () => import("./locales/es.json"),
  nb: () => import("./locales/nb.json"),
} satisfies Record<LangCode, () => Promise<{ default: Translations }>>;
```

Keep English as the synchronous initial fallback and asynchronously replace with the selected locale.

- [ ] **Step 4: Type translation calls**

Use `TranslationKey` for static keys and a safe helper for template keys such as `chip.${chip}`.

- [ ] **Step 5: Verify locale chunks**

Run tests/build and inspect build output to confirm non-English locales are separate chunks.

---

## Task 11: Add resilient route-level failure handling

**Files:**

- Create: `src/app/error.tsx`
- Create: `src/app/global-error.tsx`
- Create: `src/app/not-found.tsx`
- Create: `tests/component/error-boundaries.test.tsx`

**Interfaces:**

- App Router error components accept documented Next.js 16 `error` and `reset` props.

- [ ] **Step 1: Write component tests**

Assert route error shows a safe message, retry calls `reset`, Safety remains reachable, and no raw error message/stack is rendered.

- [ ] **Step 2: Implement `error.tsx`**

Use `"use client"`, report only an opaque digest through the logger, and render localized retry/home/safety actions.

- [ ] **Step 3: Implement `global-error.tsx`**

Include `<html>` and `<body>` as required by Next.js. Use static safe fallback text because providers may be unavailable.

- [ ] **Step 4: Implement `not-found.tsx`**

Provide home and Safety links with no leaked route internals.

- [ ] **Step 5: Verify**

Run focused tests and build.

---

## Task 12: Harden Next.js runtime and production headers

**Files:**

- Modify: `next.config.ts`
- Create: `tests/unit/security-config.test.ts`
- Delete: `firebase.json`

**Interfaces:**

- Produces a dynamic Next.js deployment without `output: "export"`.

- [ ] **Step 1: Write a config test**

Import `next.config.ts` and assert:

- no static export
- `poweredByHeader: false`
- required headers exist
- CSP excludes `unsafe-eval` in production
- frame ancestors are denied
- camera, microphone, and geolocation are disabled

- [ ] **Step 2: Configure bundle analysis**

Wrap config with `@next/bundle-analyzer`, enabled by `ANALYZE=true`.

- [ ] **Step 3: Add production headers**

Return headers for `/:path*`:

```text
Content-Security-Policy
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

CSP must allow same-origin scripts/styles/images/connections and the minimum Next.js runtime requirements. Do not permit arbitrary origins.

- [ ] **Step 4: Remove static Firebase deployment**

Delete `firebase.json`, remove `firebase-tools` if unused, and retain `.firebase`/`out` ignores harmlessly or document their removal.

- [ ] **Step 5: Verify**

Run tests and build. Start production locally and use:

```powershell
curl.exe -I http://localhost:3000
```

Confirm every required header.

---

## Task 13: Add component and API regression coverage

**Files:**

- Create: `tests/helpers/render-with-providers.tsx`
- Create: `tests/component/role-picker.test.tsx`
- Create: `tests/component/header.test.tsx`
- Create: `tests/component/person-check-in.test.tsx`
- Create: `tests/component/ai-pages.test.tsx`
- Create: `tests/component/safety.test.tsx`
- Create: `tests/component/guards.test.tsx`

**Interfaces:**

- Produces a reusable provider renderer with configurable initial profile, moment, language, theme, and storage.

- [ ] **Step 1: Implement test renderer**

Use a memory-safe storage fake and mocked Next navigation.

- [ ] **Step 2: Cover critical workflows**

Tests must cover:

- role selection and destination
- role switch destination
- gated navigation and flash
- check-in validation and persistence
- high-risk CTA from live selection
- briefing persistence
- AI loading/success/error/retry
- clipboard success/failure
- speech language and cancellation
- guard redirects only inside effects

- [ ] **Step 3: Run coverage**

Run:

```powershell
npm run test:coverage
```

Add behavior-focused tests until thresholds pass; never exclude a failing business module only to raise the number.

---

## Task 14: Add deterministic end-to-end workflows

**Files:**

- Create: `src/features/ai/providers/fake-provider.ts`
- Create: `tests/e2e/recovery-workflows.spec.ts`
- Modify: provider composition root

**Interfaces:**

- `E2E_FAKE_AI=true` selects deterministic data only when `NODE_ENV !== "production"`.

- [ ] **Step 1: Implement guarded fake provider**

Throw during startup if `E2E_FAKE_AI=true` and `NODE_ENV=production`. Return schema-valid action-specific responses.

- [ ] **Step 2: Write E2E tests**

Cover:

1. Person role -> check-in -> intervention -> scripts.
2. Switch to caregiver -> briefing.
3. Learn personalization.
4. Deep-link without profile/moment -> safe redirect + flash.
5. Reload -> persisted role/moment.
6. Simulated AI error -> safe error + Safety link remains usable.

- [ ] **Step 3: Run Playwright**

Run:

```powershell
npx playwright install chromium
npm run test:e2e
```

Expected: all Chromium scenarios pass.

---

## Task 15: Add CI, dependency automation, and supply-chain controls

**Files:**

- Create: `.github/workflows/ci.yml`
- Create: `.github/dependabot.yml`
- Modify: `.gitignore`

**Interfaces:**

- Produces one required CI workflow with no production secrets.

- [ ] **Step 1: Create pinned CI workflow**

Jobs run on pull requests and pushes:

```text
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test:coverage
npm run build
npm audit --audit-level=high
npx playwright install --with-deps chromium
npm run test:e2e
```

Use:

```yaml
- uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
- uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
  with:
    node-version: 24.2.0
    cache: npm
```

Do not add artifact actions unless the workflow actually uploads an artifact; if added, resolve and pin their full immutable SHA before use. Set `E2E_FAKE_AI=true`; never inject Gemini or Upstash secrets.

- [ ] **Step 2: Configure Dependabot**

Weekly npm and GitHub Actions updates, grouped separately, with a reasonable open-PR limit.

- [ ] **Step 3: Ignore generated reports**

Add `coverage/`, `playwright-report/`, `test-results/`, and bundle-analysis output to `.gitignore`.

- [ ] **Step 4: Validate workflow syntax**

Run:

```powershell
node -e "const fs=require('node:fs'); require('yaml').parse(fs.readFileSync('.github/workflows/ci.yml','utf8')); console.log('valid workflow YAML')"
```

Expected: `valid workflow YAML`. Inspect every `uses:` value and confirm it ends with a 40-character commit SHA.

---

## Task 16: Update configuration and engineering documentation

**Files:**

- Create: `.env.example`
- Rewrite: `README.md`
- Create: `CONTRIBUTING.md`
- Create: `docs/architecture/ADR-001-server-side-ai-boundary.md`
- Create: `docs/ENGINEERING-AUDIT-REMEDIATION.md`

**Interfaces:**

- Documents required server variables:

```text
GEMINI_API_KEY
GEMINI_MODEL
AI_TIMEOUT_MS
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
AI_RATE_LIMIT_REQUESTS
AI_RATE_LIMIT_WINDOW_SECONDS
```

- [ ] **Step 1: Create safe environment template**

Use empty values and comments; never copy `.env.local` contents.

- [ ] **Step 2: Correct README**

Document Vercel, server-only Gemini, `@google/genai`, Upstash, setup, scripts, architecture, security, test workflows, and deployment. Remove Firebase/static-export/client-key claims.

- [ ] **Step 3: Add contribution and ADR docs**

Document `npm run verify`, branch/PR expectations, architecture boundaries, threat rationale, rejected alternatives, and rollback.

- [ ] **Step 4: Map audit findings to fixes**

In `ENGINEERING-AUDIT-REMEDIATION.md`, map every Critical/High/Medium/Low finding to files, tests, and status.

---

## Task 17: Remove dead code and enforce architecture boundaries

**Files:**

- Move: shared components into `src/shared/components/`
- Move: `src/hooks/useGuards.ts` to `src/shared/hooks/use-guards.ts`
- Move: `src/lib/learn-cards.ts` to `src/features/learning/cards.ts`
- Delete: compatibility barrels after consumers migrate
- Delete: unused modules and dependencies identified by analysis
- Modify: imports throughout `src/`

**Interfaces:**

- Final import direction follows the design dependency graph.

- [ ] **Step 1: Move files one concern at a time**

Update imports after each move and run `npm run typecheck`.

- [ ] **Step 2: Identify unused dependencies and exports**

Run:

```powershell
npx knip
```

Install Knip as a dev dependency only if it is retained as an ongoing `deadcode` script; otherwise run it through `npx` and remove identified dead code manually.

- [ ] **Step 3: Remove compatibility modules**

Delete `src/lib/types.ts`, `src/lib/schemas.ts`, old context/hook/lib files, and any no-longer-used deployment dependency.

- [ ] **Step 4: Search forbidden patterns**

Expect zero production matches for:

```text
NEXT_PUBLIC_GEMINI_API_KEY
@google/generative-ai
GoogleGenerativeAI
dangerouslySetInnerHTML
router.replace( inside render branches
as <AI response type>
```

- [ ] **Step 5: Verify**

Run `npm run verify`.

---

## Task 18: Measure performance and enforce budgets

**Files:**

- Create: `scripts/check-bundle-budget.mjs`
- Modify: `package.json`
- Update: `.github/workflows/ci.yml`
- Create: `docs/performance-baseline.md`

**Interfaces:**

- Produces `npm run check:bundle`.

- [ ] **Step 1: Capture post-refactor baseline**

Run production build and bundle analysis. Record route first-load JS and confirm the Gemini SDK is absent from browser chunks.

- [ ] **Step 2: Implement budget script**

Parse available Next build manifests and fail if:

- any client chunk contains `@google/genai`
- shared first-load JS grows more than 15% above the recorded baseline
- an individual route exceeds its recorded baseline by more than 20%

Store exact byte budgets in the script, not vague percentages without a baseline.

- [ ] **Step 3: Add budget to CI**

Run `npm run check:bundle` after build.

- [ ] **Step 4: Document measurements**

Record date, Node/Next versions, baseline bytes, and measurement command.

---

## Task 19: Full verification and engineering re-audit

**Files:**

- Update: `docs/ENGINEERING-AUDIT-REMEDIATION.md`

**Interfaces:**

- Produces a final evidence-backed scorecard and remaining-risk list.

- [ ] **Step 1: Run all local gates**

```powershell
nvm use 24.2.0
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test:coverage
npm run build
npm run check:bundle
npm audit --audit-level=high
npm run test:e2e
```

Expected: every command exits 0.

- [ ] **Step 2: Inspect IDE diagnostics**

Read lints for all changed source/config/test files and resolve introduced diagnostics.

- [ ] **Step 3: Re-audit**

Score architecture, code quality, maintainability, scalability, performance, security, and testability against the original rubric. Scores must cite concrete evidence; do not inflate scores to satisfy the requested number.

- [ ] **Step 4: Record residual risks**

Document free-tier quotas, lack of user authentication by product design, local-only persistence, and external-service availability.

---

## Task 20: Configure and verify Vercel production

**Files:**

- No source files unless deployment reveals a verified configuration defect.

**Interfaces:**

- Produces a public Vercel URL with server-only Gemini generation.

- [ ] **Step 1: Create free external resources**

The user creates or authorizes:

- Vercel Hobby project.
- Upstash Redis free-tier database.
- Gemini API key.

- [ ] **Step 2: Configure production secrets**

Set all `.env.example` server variables in Vercel. Never expose values in chat, logs, shell output, or source control.

- [ ] **Step 3: Deploy**

Use Vercel Git integration or authenticated CLI. Do not deploy until Task 19 passes.

- [ ] **Step 4: Verify production**

Check:

- home and every deep link return successfully
- required security headers are present
- browser source does not contain the Gemini key or SDK
- a real intervention request succeeds
- malformed API request is rejected safely
- repeated requests are rate limited
- error fallback retains Safety access

- [ ] **Step 5: Return deployment evidence**

Provide the public URL, verification command results, and any free-tier operational limits.
