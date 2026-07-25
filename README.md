# RecoverAI — Recovery & Prevention Platform

A GenAI-powered support platform for individuals navigating substance use disorders and their caregivers. Built for the PromptWars challenge.

## Features

- **Zero-typing interventions** — tap emotion/situation chips → real Gemini AI generates actionable steps
- **Dual emergency scripts** — personalized crisis scripts for both the person and their caregiver
- **Caregiver briefings** — AI-generated "what to say / not say" guidance
- **Educational resources** — curated recovery science + AI personalization
- **Safety tools** — grounding exercises, helpline links, copy/share scripts
- **Day/Night mode** — toggle or follows system preference
- **RTL support** — toggle LTR ↔ RTL layout for accessibility
- **WCAG 2.2 AA** — semantic HTML, focus visible, keyboard navigable, screen-reader compatible

## Quick Start

```bash
# Install dependencies
npm install

# Set your Gemini API key (free from https://aistudio.google.com/)
# Create .env.local with:
GEMINI_API_KEY=your-key-here

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Evaluator Walkthrough (no login required)

1. Open the app → choose **Person** role
2. On Person home: set urge intensity + tap situation chips → **Check in**
3. Go to **Intervene** → tap "Get Steps Now" → see real AI-generated steps
4. Go to **Scripts** → "Generate Scripts" → see dual person + caregiver scripts
5. Go back, switch to **Caregiver** role (button in header)
6. On Caregiver home → "Get Caregiver Briefing" → see do/don't say lists
7. Visit **Learn** → expand a card → "Personalize for me" → AI explains relevance
8. Visit **Safety** → grounding exercise + helplines + copy scripts

## Tech Stack

- **Next.js 16** (App Router) + TypeScript + React 19
- **Tailwind CSS** for styling with CSS variable-based theming
- **Google Gemini 2.0 Flash** for all GenAI (real API calls, server-only)
- **Zod** for input validation on all API routes

## Security

- API key is server-side only — never exposed to the browser
- All user input validated with Zod schemas (allow-listed chips, max lengths)
- No `dangerouslySetInnerHTML` — all AI/user text rendered as safe React text nodes
- Helpline URLs are constants (no user-controlled fetches)
- No PII stored; optional nickname in localStorage only

## Accessibility

- Semantic landmarks and headings
- `aria-pressed`, `aria-expanded`, `aria-label` on interactive elements
- Visible focus rings on all controls
- Large touch targets for crisis actions
- `prefers-reduced-motion` respected
- Day/Night theme meets contrast requirements
- Full RTL layout via logical CSS properties

## Deploy (Vercel)

```bash
# Push to GitHub, then:
# 1. Import repo on vercel.com
# 2. Add GEMINI_API_KEY as environment variable
# 3. Deploy
```

Or via CLI:
```bash
npx vercel --prod
```

## Disclaimer

This tool is **not medical care**. If you or someone else is in immediate danger, contact local emergency services.
