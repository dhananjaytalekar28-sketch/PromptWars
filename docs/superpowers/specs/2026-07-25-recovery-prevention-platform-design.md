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

**Success for review:** An evaluator can pick a role, complete a check-in, run intervene → dual scripts → caregiver briefing → learn personalization → safety tools, with visible real GenAI responses and no login wall.

---

## 2. Product decisions (locked)

| Decision | Choice |
| --- | --- |
| Primary audiences | Both equally — role picker, parallel homes |
| Zero-typing | Hybrid: chips + optional voice; typing optional never required |
| Emergency scripts | Dual: person script + caregiver response script |
| Stack | Next.js (App Router) + TypeScript + React full-stack |
| GenAI | Google Gemini via server Route Handlers |
| Credentials | `GEMINI_API_KEY` in env only (free AI Studio key) |
| Auth | None — role + optional nickname |
| MVP breadth | Fuller lean: hub flows + risk adaptation + caregiver briefing |
| Architecture | Crisis Hub — one Moment drives all GenAI features |

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

| Path | Purpose |
| --- | --- |
| `/` | Role picker + optional nickname + disclaimer |
| `/person` | Person home; adapts to risk level |
| `/caregiver` | Caregiver home; briefing + shared moment |
| `/intervene` | Zero-typing intervention flow |
| `/scripts` | Dual emergency scripts |
| `/learn` | Curated education + AI “why this helps” |
| `/safety` | Grounding, helplines, copy/share script |

**API (all real Gemini):**

| Endpoint | Input | Output |
| --- | --- | --- |
| `POST /api/intervene` | Moment | `{ steps: [{ title, body }] }` |
| `POST /api/scripts` | Moment | `{ personScript, caregiverScript }` |
| `POST /api/briefing` | Moment | `{ briefing, doSay[], dontSay[] }` |
| `POST /api/learn` | Moment + cardId | `{ blurb }` |

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

**Visual / a11y posture:** large crisis CTAs, semantic HTML, focus visible, contrast-safe, `prefers-reduced-motion`, labeled icon buttons. Avoid generic purple-gradient “AI SaaS” chrome; calm, high-legibility recovery aesthetic with CSS variables.

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

| Condition | Behavior |
| --- | --- |
| Missing `GEMINI_API_KEY` | API `503`; UI “AI unavailable” — no fake scripts |
| Gemini timeout/error | Banner + Retry; keep last good Moment |
| Invalid model JSON | One repair retry; then fail honestly |
| Rate limit | Friendly wait + retry |
| Validation failure | `400` with generic client message; log details server-side only |
| Offline / network | Curated Learn + Safety still work; AI panels show retry |
| `localStorage` corrupt | Reset Moment with user-visible notice |

Fail closed: never present placeholder text as if it were a successful AI generation.

---

## 9. Security

- Secrets only in environment variables; never commit `.env`
- Server-only Gemini calls
- Zod allow-lists for chips; max length on free text
- Helpline URLs are constants (no user-controlled server fetch)
- Security headers via Next.js defaults / config as applicable
- No PII required; nickname optional and local-only
- Do not log full user notes or API keys

---

## 10. Testing & quality

**Automated:**

- Unit: Moment helpers, risk→home adaptation, Zod schemas
- Route tests with mocked Gemini client proving the call path (and error paths)
- Component tests for RolePicker, check-in, dual-script panels
- TypeScript strict + ESLint

**Accessibility checks:** keyboard path through check-in → intervene → scripts; screen-reader labels on chips and copy actions.

**README for evaluators:** no login; env var required; 8-step walkthrough; deploy instructions (e.g. Vercel).

---

## 11. Out of scope (YAGNI)

- Authentication / multi-user cloud sync
- Clinical assessment or diagnosis
- Image multimodal trigger analysis
- History analytics dashboard
- Native mobile apps
- OpenAI provider adapter (Gemini only for MVP)

---

## 12. Implementation sequencing (preview)

1. Scaffold Next.js app + Moment store + role routes + disclaimer
2. Check-in + home adaptation (no AI yet)
3. Gemini client + `/api/intervene` + Intervene UI
4. `/api/scripts` + Scripts UI + copy/share
5. Caregiver home + `/api/briefing`
6. Learn cards + `/api/learn`
7. Safety panel + helplines
8. Voice optional path + a11y pass
9. Tests, README, deploy with `GEMINI_API_KEY`

Detailed task breakdown belongs in the implementation plan (next step after spec sign-off).

---

## 13. Spec self-review notes

- No TBD placeholders remaining for MVP scope
- Architecture, APIs, and walkthrough are consistent (single Moment hub)
- Scope fits one implementation plan; out-of-scope explicitly listed
- Ambiguities resolved: no auth; Gemini-only; dual scripts; hybrid zero-typing; localStorage persistence
