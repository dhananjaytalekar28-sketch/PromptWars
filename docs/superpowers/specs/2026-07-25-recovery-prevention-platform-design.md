# Recovery and Prevention Platform — Design Spec

**Date:** 2026-07-25  
**Status:** Approved for implementation planning  
**Challenge:** PromptWars — multi-modal GenAI recovery & prevention platform  
**Architecture:** Approach 1 — Crisis Hub

---

## 1. Problem & success criteria

Build a GenAI-powered recovery and prevention web app for people navigating substance use disorders and their caregivers. Generative AI is a core engine (real Gemini API calls), not decoration.

**Must deliver (connected workflows):**

1. Zero-typing interventions (chips + optional voice; typing never required)
2. Personalized dual emergency scripts (person + caregiver for the same moment)
3. Educational resources (curated cards + AI personalization)
4. Contextual safety tools (grounding, helplines, share/copy scripts)
5. Risk check-in that adapts homes; caregiver briefing from the last check-in

**Evaluation / anti-DQ constraints:**

- No static/hardcoded “AI” outcomes; no mock data presented as live AI
- Every demoed feature works end-to-end
- Deployed URL must stay up
- Code assessment: quality, security, efficiency, testing, accessibility, problem alignment
- Security bar: no frontend API keys; sanitized input (XSS); no unsafe `innerHTML` / `dangerouslySetInnerHTML` for untrusted content
- Accessibility bar: WCAG 2.2 AA target, VPAT-style checklist, day/night mode, RTL support

**Success for review:** An evaluator can pick a role, complete a check-in, run intervene → dual scripts → caregiver briefing → learn personalization → safety tools, with visible real GenAI responses and no login wall — and can toggle day/night and LTR/RTL without breaking the flow.

---

## 2. Product decisions (locked)

| Decision             | Choice                                                         |
| -------------------- | -------------------------------------------------------------- |
| Primary audiences    | Both equally — role picker, parallel homes                     |
| Zero-typing          | Hybrid: chips + optional voice; typing optional never required |
| Emergency scripts    | Dual: person script + caregiver response script                |
| Stack                | Next.js (App Router) + TypeScript + React full-stack           |
| GenAI                | Google Gemini via server Route Handlers                        |
| Credentials          | `GEMINI_API_KEY` in env only (free AI Studio key)              |
| Auth                 | None — role + optional nickname                                |
| MVP breadth          | Fuller lean: hub flows + risk adaptation + caregiver briefing  |
| Architecture         | Crisis Hub — one Moment drives all GenAI features              |
| Theming              | Day / night mode (user toggle + system preference)             |
| International layout | Full RTL support (logical CSS, mirrored chrome)                |
| Accessibility bar    | WCAG 2.2 AA target + VPAT-oriented checklist in repo           |

---

## 3. Architecture

```text
Browser (Next.js React UI)
  ├── Role picker / Person home / Caregiver home
  ├── Intervene / Scripts / Learn / Safety
  └── Moment store (localStorage + React context)
           │
           ▼
Next.js Route Handlers (/api/*)
  ├── Zod validation
  ├── Gemini client (server-only key)
  └── Structured JSON responses
```

**Routes (UI):**

| Path         | Purpose                                      |
| ------------ | -------------------------------------------- |
| `/`          | Role picker + optional nickname + disclaimer |
| `/person`    | Person home; adapts to risk level            |
| `/caregiver` | Caregiver home; briefing + shared moment     |
| `/intervene` | Zero-typing intervention flow                |
| `/scripts`   | Dual emergency scripts                       |
| `/learn`     | Curated education + AI “why this helps”      |
| `/safety`    | Grounding, helplines, copy/share script      |

**API (all real Gemini):**

| Endpoint              | Input           | Output                              |
| --------------------- | --------------- | ----------------------------------- |
| `POST /api/intervene` | Moment          | `{ steps: [{ title, body }] }`      |
| `POST /api/scripts`   | Moment          | `{ personScript, caregiverScript }` |
| `POST /api/briefing`  | Moment          | `{ briefing, doSay[], dontSay[] }`  |
| `POST /api/learn`     | Moment + cardId | `{ blurb }`                         |

Keys never ship to the client. No production UI path returns canned success content when Gemini is down.

---

## 4. Crisis Hub data model

```ts
type Role = "person" | "caregiver";

type Profile = {
  role: Role;
  nickname?: string;
};

type Moment = {
  id: string;
  updatedAt: string; // ISO
  riskLevel: 1 | 2 | 3 | 4 | 5;
  chips: string[]; // allow-listed chip ids/labels
  voiceOrTextNote?: string; // max length enforced
  lastIntervention?: { steps: { title: string; body: string }[]; at: string };
  lastScripts?: {
    personScript: string;
    caregiverScript: string;
    at: string;
  };
  lastBriefing?: {
    briefing: string;
    doSay: string[];
    dontSay: string[];
    at: string;
  };
  lastLearnBlurb?: { cardId: string; blurb: string; at: string };
};
```

**Chip allow-list (MVP):** craving, triggered, alone, with-people, after-slip, anxious, angry, tired, need-to-leave (exact labels finalized in implementation; validation rejects unknown values).

**Home adaptation rules:**

- Risk 1–2: emphasize Learn + prevention; Intervene available
- Risk 3: balance Intervene + Scripts + Learn
- Risk 4–5: promote Scripts + Safety + Intervene; helplines always visible

Person and Caregiver share one Moment in `localStorage` so role switching demonstrates a connected workflow without a backend DB.

---

## 5. Components & UX

**Shared:** `RolePicker`, `MomentBar`, `DisclaimerBanner`, `PrimaryCtaStack`.

**Person home:** risk slider/buttons (1–5) + situation chips → save Moment → adaptive CTAs.

**Caregiver home:** read shared Moment; empty state if none; generate/view briefing; open Scripts/Safety.

**Intervene:** chip grid → optional Web Speech API note → optional text → GenAI step cards → CTA to generate dual scripts.

**Scripts:** two panels (Person | Caregiver); copy, share (Web Share API when available), read-aloud (speechSynthesis).

**Learn:** 3–5 curated markdown/JSON cards in-repo (real educational content). “Personalize why this helps” calls `/api/learn`.

**Safety:** grounding exercise, allow-listed helpline links, copy last scripts, switch-role helper. Usable offline without AI.

**Voice:** `SpeechRecognition` (where supported) writes into `voiceOrTextNote`; unsupported browsers hide voice and keep chips.

**Visual posture:** large crisis CTAs; calm, high-legibility recovery aesthetic via CSS variables (not purple-gradient “AI SaaS” chrome). Theme tokens must work in both day and night modes.

**Theme (day / night):**

- CSS variables for color, surface, text, focus ring, borders
- `data-theme="light" | "dark"` on `<html>` (or equivalent)
- Default follows `prefers-color-scheme`; user toggle persists in `localStorage`
- Both themes meet contrast requirements for text and interactive controls

**RTL:**

- Set `dir` from locale / manual LTR↔RTL toggle for demo (persist preference)
- Layout uses logical properties only (`inset-inline`, `margin-inline`, `padding-inline`, `text-align: start`, flex/grid without physical left/right assumptions)
- Icons that imply direction (back chevrons, progress) mirror in RTL
- Do not hardcode left/right paddings that break mirrored layout

---

## 6. Data flow (evaluator walkthrough)

1. Open `/` → choose **Person** (nickname optional)
2. Check-in on `/person` (risk + chips) → Moment persisted
3. `/intervene` → `POST /api/intervene` → step cards
4. `/scripts` → `POST /api/scripts` → dual scripts saved on Moment
5. Return `/` or switch control → choose **Caregiver**
6. `/caregiver` → `POST /api/briefing` → briefing + do/don’t say
7. `/learn` → open a card → optional `POST /api/learn`
8. `/safety` → grounding + helplines + copy script

This single path exercises every GenAI endpoint and both roles.

---

## 7. GenAI prompt & safety rails

**System posture (all endpoints):** supportive, non-judgmental, short actionable language, no medical dosing or detox instructions, encourage professional/emergency help when risk is high, never claim to be a clinician.

**Output:** schema-constrained / JSON-mode responses validated with Zod before UI render.

**Product disclaimer (always visible in app chrome):** This tool is not medical care. If you or someone else is in immediate danger, contact local emergency services.

**High risk (4–5):** UI prioritizes Safety + Scripts regardless of AI success.

---

## 8. Error handling

| Condition                | Behavior                                                        |
| ------------------------ | --------------------------------------------------------------- |
| Missing `GEMINI_API_KEY` | API `503`; UI “AI unavailable” — no fake scripts                |
| Gemini timeout/error     | Banner + Retry; keep last good Moment                           |
| Invalid model JSON       | One repair retry; then fail honestly                            |
| Rate limit               | Friendly wait + retry                                           |
| Validation failure       | `400` with generic client message; log details server-side only |
| Offline / network        | Curated Learn + Safety still work; AI panels show retry         |
| `localStorage` corrupt   | Reset Moment with user-visible notice                           |

Fail closed: never present placeholder text as if it were a successful AI generation.

---

## 9. Security considerations

### 9.1 No API keys in the frontend

- `GEMINI_API_KEY` exists only in server environment variables (e.g. Vercel env / `.env.local` gitignored)
- All model calls go through Next.js Route Handlers; the browser never receives or embeds the key
- Client bundles must be audited so no `NEXT_PUBLIC_*` secret leaks the Gemini credential
- Missing key → honest `503` / “AI unavailable”; never fall back to canned “success” copy

### 9.2 User input sanitized to prevent XSS

- All user-provided strings (nickname, optional note, chip-derived context) validated with Zod on the server (type, allow-list, max length) before Gemini or persistence paths trust them
- Client display of user text and model text uses React text nodes / escaped rendering only — treat GenAI output as untrusted text, not HTML
- If any curated Learn content needs limited markup later, it must go through a strict sanitizer allow-list; MVP Learn cards prefer plain text / safe React elements authored in code
- Do not interpolate user or model strings into `href`, `src`, or event handlers without validation (helplines remain constant allow-listed URLs)

### 9.3 Safe DOM manipulation (no unsafe `innerHTML`)

- No `dangerouslySetInnerHTML`, no raw `element.innerHTML = …` for user or AI content
- Prefer React declarative rendering and `textContent`-equivalent patterns
- Copy/share/read-aloud operate on strings already held in state, not on HTML scraped from the DOM
- Any third-party UI helper that injects HTML is disallowed unless reviewed and unused for untrusted content

### 9.4 Additional hardening

- Helpline URLs are constants (no user-controlled server-side fetch → no SSRF)
- Security headers via Next.js config as applicable (`Content-Security-Policy` tight enough to block inline script injection where practical; `X-Content-Type-Options`, `Referrer-Policy`, frame protections)
- No PII required; nickname optional and local-only
- Do not log full user notes, tokens, or API keys
- Never commit `.env` / `.env.local`

---

## 10. Accessibility: WCAG, VPAT, theme, RTL

### 10.1 WCAG 2.2 AA (target)

- Perceivable: contrast in both day and night themes; text alternatives for icon-only controls; no information by color alone (risk level also numeric/text)
- Operable: full keyboard path for role pick → check-in → intervene → scripts → caregiver briefing; visible focus; large crisis tap targets; no keyboard traps; respect `prefers-reduced-motion`
- Understandable: clear labels/instructions; consistent navigation; error messages that name the field and recovery action (Retry)
- Robust: semantic landmarks/headings; correct names/roles/states for chips (`aria-pressed`), dialogs, and live regions for AI loading/errors (`aria-live` polite/assertive as appropriate)

### 10.2 VPAT-oriented evidence

Ship a lightweight accessibility conformance checklist in-repo (e.g. `docs/accessibility/VPAT-checklist.md`) mapped to WCAG 2.2 AA criteria touched by this app. For each applicable row: Supports / Partially Supports / Does Not Support + short notes. This is an internal VPAT-style artifact for reviewers — not a formal third-party certification.

Manual spot-checks before submit: keyboard-only walkthrough, one screen reader pass (Narrator or VoiceOver), day and night contrast check, LTR and RTL layout check.

### 10.3 Day / night mode

- ThemeProvider (or equivalent) applies CSS variables; toggle in chrome; persists preference
- Crisis CTAs remain high-contrast in both themes
- AI loading/error banners remain readable in both themes

### 10.4 RTL support

- Document and demo LTR/RTL toggle (or locale `dir`)
- Logical CSS only; mirrored directional affordances
- Dual-script panels stack/order correctly under `dir="rtl"` (person/caregiver labels remain clear)

---

## 11. Testing & quality

**Automated:**

- Unit: Moment helpers, risk→home adaptation, Zod schemas, XSS-sensitive render helpers (ensure strings escape / no HTML path)
- Route tests with mocked Gemini client proving the call path (and error paths); assert key is read only server-side in client config tests where applicable
- Component tests for RolePicker, check-in, dual-script panels, theme toggle, `dir` switching smoke test
- TypeScript strict + ESLint (include rule discouraging `dangerouslySetInnerHTML` / flagging it)

**Accessibility checks:** keyboard path through check-in → intervene → scripts; screen-reader labels on chips and copy actions; axe-core (or equivalent) on primary pages; contrast check for light and dark tokens.

**README for evaluators:** no login; env var required; 8-step walkthrough; how to toggle day/night and RTL; deploy instructions (e.g. Vercel); pointer to VPAT checklist.

---

## 12. Out of scope (YAGNI)

- Authentication / multi-user cloud sync
- Clinical assessment or diagnosis
- Image multimodal trigger analysis
- History analytics dashboard
- Native mobile apps
- OpenAI provider adapter (Gemini only for MVP)
- Formal third-party VPAT certification / legal accessibility audit (in-repo checklist only)
- Full i18n translation of all strings (RTL layout yes; multi-language copy packs optional later)

---

## 13. Implementation sequencing (preview)

1. Scaffold Next.js app + Moment store + role routes + disclaimer + theme/RTL shell + CSP-minded headers
2. Check-in + home adaptation (no AI yet)
3. Gemini client + `/api/intervene` + Intervene UI (safe text rendering)
4. `/api/scripts` + Scripts UI + copy/share
5. Caregiver home + `/api/briefing`
6. Learn cards + `/api/learn`
7. Safety panel + helplines
8. Voice optional path + WCAG pass + VPAT checklist + day/night & RTL verification
9. Tests, README, deploy with `GEMINI_API_KEY`

Detailed task breakdown belongs in the implementation plan (next step after spec sign-off).

---

## 14. Spec self-review notes

- No unresolved TBD placeholders for MVP scope
- Architecture, APIs, and walkthrough are consistent (single Moment hub)
- Security section explicitly covers no frontend keys, XSS sanitization/validation, and no unsafe `innerHTML`
- WCAG 2.2 AA target, VPAT-style checklist, day/night mode, and RTL are in scope for implementation
- Scope still fits one implementation plan; formal certification and full i18n remain out of scope
- Ambiguities resolved: no auth; Gemini-only; dual scripts; hybrid zero-typing; localStorage persistence
