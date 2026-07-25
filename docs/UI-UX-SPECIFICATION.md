# RecoverAI UI/UX Audit and Design System Specification

**Version:** 1.1  
**Date:** 2026-07-25  
**Scope:** Existing functionality and workflows only  
**Accessibility target:** WCAG 2.2 Level AA  
**Design direction:** Material Design 3 principles adapted for a calm, high-cognitive-load recovery product  
**Sources:** Deployed UI review + source-level audit across `src/app`, shared components, context, i18n, and Firebase config

## 1. Executive summary

RecoverAI has a clear functional foundation, but the visual system is assembled page by page rather than from shared layout and component primitives. The most visible symptom is a contradictory density model:

- Desktop content is constrained to `max-w-2xl` (about 672 px), leaving large unused areas.
- The same narrow width is applied to the header, forcing navigation to wrap into two or three rows.
- Pages use broad vertical gaps while controls within a component are often tightly packed.
- Buttons, cards, notices, and action links use several unrelated radii, paddings, and color treatments.

The redesign should preserve all workflows while introducing:

1. A responsive application shell with desktop, tablet, and mobile navigation patterns.
2. A token-driven visual system for spacing, typography, color, elevation, and shape.
3. Shared primitives for page headers, cards, buttons, form controls, feedback, and AI result states.
4. A focused “crisis mode” hierarchy that prioritizes the next safe action.
5. WCAG 2.2 AA behavior, including 44 px targets, keyboard-complete custom controls, visible focus, status announcements, and locale-aware safety information.

## 2. Audit method and coverage

The audit reviewed:

- The deployed Firebase application at `https://promtwar-2026.web.app`
- Desktop and 390 px mobile layouts
- Landing/role selection
- Person check-in
- Intervention
- Emergency scripts
- Caregiver
- Learn
- Safety
- Shared header, disclaimer, localization, theme, routing, and state
- Source implementation in `src/app`, `src/components`, `src/context`, and `firebase.json`

The current product contains no data tables, dialogs, sidebars, tabs, or pagination. Specifications for those components are included for future consistency, but they are not current audit findings.

## 3. Complete UI audit

### 3.1 Critical findings

#### C1. Firebase deep-link and client navigation behavior is unreliable

- **Evidence:** `firebase.json` rewrites every path to `/index.html`. In deployed testing, selecting “Intervene” did not leave `/person`; direct navigation to `/intervene` returned the root experience.
- **Why this is a problem:** A static Next.js export creates route-specific HTML files, but the catch-all rewrite bypasses those files.
- **UX impact:** Evaluators can become trapped on the check-in page and may conclude core workflows are broken.
- **Recommended solution:** Remove the catch-all rewrite or use clean-URL rewrites that resolve each exported route correctly. Test direct loads, refreshes, browser back/forward, and internal navigation for all seven routes.

#### C2. Safety resources are not locale-aware

- **Evidence:** `src/app/safety/page.tsx:5-9` always displays US resources while the interface supports Arabic, Spanish, and Norwegian.
- **Why this is a problem:** Crisis resources must be geographically relevant and must not imply global availability.
- **UX impact:** A user in another country may receive unusable emergency information at the moment of highest need.
- **Recommended solution:** Ask for country/region or use an explicit region selector. Store verified resources by country. Always show “contact local emergency services” and label country-specific numbers.

#### C3. Primary mobile navigation is not usable as a stable navigation system

- **Evidence:** `src/components/Header.tsx:13-69` puts logo, five links, role switch, language selector, and theme toggle into one wrapping flex row. At 390 px, it occupies several rows and pushes content below the fold.
- **Why this is a problem:** Controls shift position unpredictably and several targets are below the WCAG-recommended 44×44 px size.
- **UX impact:** Higher cognitive load, accidental taps, poor orientation, and reduced access to crisis actions.
- **Recommended solution:** Use a 64 px top app bar plus a four-item bottom navigation on mobile. Put role, language, theme, and secondary destinations in a menu/sheet. Keep desktop navigation single-row.

### 3.2 High-severity findings

#### H1. One narrow container is used for every context

- **Evidence:** `src/app/layout.tsx:25` and `src/components/Header.tsx:14` both use `max-w-2xl`.
- **Why:** A focused reading width is appropriate for prose, not for global navigation, role cards, dual scripts, or caregiver comparisons.
- **Impact:** Sparse desktop pages, wrapped header, underused screen space, and cramped two-column content.
- **Solution:** Use a 1200 px shell, 1120 px working container, 760 px focused content container, and 960 px comparison container.

#### H2. Navigation has no responsive adaptation

- **Evidence:** There is no breakpoint-specific structure in `Header.tsx`.
- **Why:** Shrinking and wrapping desktop navigation is not a mobile strategy.
- **Impact:** Poor hierarchy and unstable layouts across languages.
- **Solution:** Desktop top nav at ≥840 px; compact app bar plus bottom nav below 840 px; test longest Norwegian and Arabic labels.

#### H3. Route guards perform navigation during render

- **Evidence:** `src/app/page.tsx:14-16`, `person/page.tsx:16-18`, `intervene/page.tsx:17-19`, `scripts/page.tsx:17-19`, and `caregiver/page.tsx:20-22`.
- **Why:** Side effects during render can trigger React/Next development errors and blank transitions.
- **Impact:** Flashing, blank pages, hydration warnings, and unreliable evaluator flows.
- **Solution:** Move redirects into `useEffect`, use route-level loading states, or centralize access routing in a client gate.

#### H4. App hydration intentionally renders a blank full screen

- **Evidence:** `src/context/AppContext.tsx:110-112`.
- **Why:** Returning an empty `min-h-screen` provides no progress or orientation.
- **Impact:** Perceived slowness and possible “broken app” interpretation on slower devices.
- **Solution:** Render a branded skeleton shell with `aria-busy="true"` and a visually hidden “Loading application” status.

#### H5. Custom radio behavior is incomplete

- **Evidence:** Risk buttons use `role="radio"` in `person/page.tsx:51-66`, but do not implement arrow-key navigation or roving `tabIndex`.
- **Why:** ARIA roles require matching keyboard interaction.
- **Impact:** Keyboard and switch-device users must tab through every option and cannot use expected arrow keys.
- **Solution:** Prefer native radio inputs with styled labels, or implement ArrowLeft/Right/Up/Down, Home/End, and roving focus.

#### H6. AI loading and result changes are not announced

- **Evidence:** Intervention, scripts, caregiver, and learn pages change labels and inject results without `aria-live`, `aria-busy`, or a status region.
- **Why:** Visual change alone is not exposed to assistive technology.
- **Impact:** Screen-reader users cannot tell whether generation started, completed, or failed.
- **Solution:** Add a shared `AsyncPanel` with `aria-busy`, polite status announcements, error recovery, and focus management to the generated result heading.

#### H7. Localization is partial

- **Evidence:** Navigation and shell strings are localized, but education card content, resource names, API errors, and AI prompts/results are English.
- **Why:** A language selector creates an expectation of a fully localized experience.
- **Impact:** Mixed-language screens and weaker comprehension during high cognitive load.
- **Solution:** Localize all curated content and client errors. Pass the selected language to AI prompts and require output in that language.

#### H8. Persistent disclaimer uses `role="alert"`

- **Evidence:** `src/components/DisclaimerBanner.tsx:8-12`.
- **Why:** Alerts are intended for urgent, newly appearing content. A repeated persistent notice can be announced on every load.
- **Impact:** Screen-reader interruption and alert fatigue.
- **Solution:** Use a semantic `<aside>` or `role="note"`. Reserve assertive alerts for immediate, state-triggered danger.

### 3.3 Medium-severity findings

#### M1. Typography is page-local rather than tokenized

- **Evidence:** `text-3xl`, `text-2xl`, `text-lg`, `text-sm`, and `text-xs` are applied ad hoc across pages.
- **Impact:** Inconsistent hierarchy, especially between page titles, card titles, labels, and helper text.
- **Solution:** Define named typography tokens and components: display, page title, section title, card title, body, supporting, label, caption, button.

#### M2. Spacing is mathematically inconsistent

- **Evidence:** Page `gap-6`, role selection `gap-8`, cards `p-4`, grounding `p-5`, empty state `p-6`, and action groups `gap-2`/`gap-3` appear without shared semantic rules.
- **Impact:** Some groups feel disconnected while unrelated controls feel crowded.
- **Solution:** Adopt the spacing rules in Section 5 and expose semantic tokens such as `--space-page`, `--space-section`, and `--space-control`.

#### M3. Card shapes and borders vary by use case without a hierarchy

- **Evidence:** Cards use `rounded-lg`, `rounded-xl`, one- or two-pixel borders, tinted fills, or plain links.
- **Impact:** Users cannot infer which surfaces are selectable, informational, generated, or safety-critical.
- **Solution:** Define `Card`, `ActionCard`, `SelectableCard`, `ResultCard`, and `SafetyCallout`.

#### M4. Button system is inconsistent

- **Evidence:** Primary actions are pill-shaped; utility actions are rounded rectangles; navigation active states use small filled rectangles; action links mimic cards.
- **Impact:** Action priority is unclear and repeated patterns do not build familiarity.
- **Solution:** Standardize filled, tonal, outlined, text, and icon buttons with three sizes and a single 10–12 px radius family.

#### M5. Button feedback is incomplete

- **Evidence:** Copy actions provide no success confirmation; speech playback has no stop/pause state.
- **Impact:** Users repeat actions because they cannot confirm completion.
- **Solution:** Show an inline “Copied” status for 2–3 seconds; expose play/pause/stop and current playback state.

#### M6. Role selection is not responsive

- **Evidence:** `src/app/page.tsx:30` uses a non-wrapping flex row.
- **Impact:** Long translated labels compress the cards or overflow on small devices.
- **Solution:** Use one column below 600 px and two equal columns above; ensure each card has a minimum 160 px height.

#### M7. High-risk hierarchy is only color-based and conditional

- **Evidence:** `person/page.tsx:100-106` promotes safety with a red treatment, but no explicit risk status or next-step explanation.
- **Impact:** Users may not understand why the interface changed.
- **Solution:** Add a concise status callout: “Your check-in suggests you may need immediate support,” with Safety as the first button and Intervene second.

#### M8. Learn cards lack clear disclosure affordance

- **Evidence:** `learn/page.tsx:47-57` makes the whole header clickable but shows no chevron or “Expand” cue.
- **Impact:** Users may not realize cards open.
- **Solution:** Add a trailing chevron, persistent focus treatment, and an `aria-controls` relationship.

#### M9. Generated text uses small muted styling

- **Evidence:** Script text is `text-sm` and muted in `scripts/page.tsx:113`; caregiver output is also small/muted.
- **Impact:** Critical scripts are harder to scan and read aloud under stress.
- **Solution:** Render scripts at 16 px/26 px, normal foreground color, with short paragraphs, numbered steps, and optional large-text mode.

### 3.4 Low-severity findings

#### L1. Emoji are used as the primary icon system

- **Impact:** Platform-dependent appearance, inconsistent baseline/alignment, and unclear tone.
- **Solution:** Use one outlined SVG icon family with 20/24 px sizes; mark decorative icons `aria-hidden`.

#### L2. External-link behavior is invisible

- **Evidence:** Safety links open a new tab but do not announce it.
- **Impact:** Minor disorientation for keyboard and screen-reader users.
- **Solution:** Add an external-link icon and accessible text “opens in a new tab.”

### 3.5 Functional UX defects affecting evaluation flows

These were confirmed in source review and must be fixed alongside visual redesign. They do not change business workflows; they restore intended connected flows.

#### F1. Scripts and Intervene links fail silently before check-in — Critical

- **Evidence:** `scripts/page.tsx` redirects to `/` with no message; `intervene/page.tsx` redirects to `/person` with no message.
- **Impact:** Header navigation looks broken; evaluators leave the intended path.
- **Solution:** Disable or hide gated links until a Moment exists, or redirect to the role home with a localized banner: “Complete a check-in first.” Standardize both routes on one `requireMoment` helper.

#### F2. Role switch does not navigate to the matching home — High

- **Evidence:** `Header.tsx` calls `switchRole` only; `AppContext.switchRole` updates storage but does not route.
- **Impact:** User remains on the wrong page until a later guard redirects, causing flashes and confusion.
- **Solution:** After role switch, navigate to `/person` or `/caregiver`. Logo should also deep-link to the current role home, not always `/`.

#### F3. High-risk Safety CTA uses stale stored risk — High

- **Evidence:** `person/page.tsx` computes `isHighRisk` from `moment?.riskLevel ?? risk` but only shows quick actions after `moment` exists, so selecting 4–5 before re-check-in does not promote Safety.
- **Impact:** Safety is not promoted when the user’s current selection indicates high urge.
- **Solution:** Derive promotion from the live `risk` control for the next-action panel; after check-in, keep Safety first when `risk >= 4`.

#### F4. Caregiver briefing is not persisted — High

- **Evidence:** `caregiver/page.tsx` sets local state only; `Moment.lastBriefing` is unused.
- **Impact:** Briefing disappears on refresh; caregiver/person handoff loses continuity.
- **Solution:** Call `updateMoment({ lastBriefing: { ...data, at: ISO } })` after successful generation and hydrate UI from that field.

#### F5. Route guards run during render — Medium

- **Evidence:** Multiple pages call `router.replace` during render.
- **Impact:** React/Next warnings, blank frames, and double navigations.
- **Solution:** Move redirects into `useEffect` or a shared client gate with an explicit loading/redirect state.

#### F6. Missing skip link, page titles, and English-only a11y strings — Medium

- **Evidence:** Single global `metadata.title`; no skip-to-content; hardcoded labels such as `"Quick actions"`, language/theme aria strings, and `"Something went wrong"`.
- **Impact:** WCAG 2.4.1 / 2.4.2 gaps and mixed-language assistive experience.
- **Solution:** Add skip link to `<main>`, per-route titles via `t(...)`, and i18n keys for all a11y/error strings.

#### F7. Read-aloud and clipboard lack status and language — Medium

- **Evidence:** Speech synthesis does not set `utterance.lang`; copy actions have no success/failure feedback; helplines lack `tel:` links.
- **Impact:** Silent failures and incorrect TTS language for non-English UI.
- **Solution:** Map locale to speech language, announce copy status, expose play/stop, and add `tel:` where appropriate.

#### F8. Theme system is dual-tracked — Low / Medium

- **Evidence:** `[data-theme="dark"]` CSS variables coexist with Tailwind `dark:` utility classes on banners and error surfaces.
- **Impact:** Surfaces can drift between light/dark tokens.
- **Solution:** Standardize on CSS variables for semantic surfaces; reserve Tailwind only for layout.

## 4. Design principles

1. **One clear next action:** Every page has one primary action. Secondary actions are visibly subordinate.
2. **Calm density:** Use space to group content, not to create large empty fields.
3. **Progressive disclosure:** Show guidance when needed; keep generated details collapsible after first reading.
4. **Safety is never hidden:** Emergency support remains reachable without an AI request.
5. **Same component, same behavior:** A primary button, status message, card, or chip must look and behave consistently everywhere.
6. **Language changes layout and content:** Locale affects direction, copy, AI output, resource region, and date/number formatting.

## 5. Design system specification

### 5.1 Responsive grid and containers

#### Mobile: 0–599 px

- Grid: 4 columns
- Outer padding: 16 px
- Gutter: 16 px
- Top app bar: 64 px
- Bottom navigation: 64–72 px plus safe-area inset
- Content spans all 4 columns

#### Tablet: 600–839 px

- Grid: 8 columns
- Outer padding: 24 px
- Gutter: 24 px
- Content: 8 columns for forms; 4+4 for paired cards
- Navigation: compact app bar plus bottom navigation or overflow menu

#### Laptop: 840–1199 px

- Grid: 12 columns
- Outer padding: 32 px
- Gutter: 24 px
- Shell maximum: 1120 px
- Focused forms: columns 3–10 (approximately 720–760 px)
- Paired results: 6+6 columns

#### Desktop: 1200 px and above

- Grid: 12 columns
- Shell maximum: 1200 px
- Outer padding: 40 px up to 1440 px viewport; 48 px above
- Gutter: 24 px
- Focused content maximum: 760 px
- Comparison content maximum: 960 px
- Global header and dashboard content: 1120–1200 px

### 5.2 Semantic layout spacing

- Page top/bottom: 24 px mobile, 32 px tablet, 40 px laptop/desktop
- Page title to supporting copy: 8 px
- Page introduction to first section: 24 px
- Between sections: 32 px mobile, 40 px desktop
- Card grid gap: 16 px mobile, 24 px desktop
- Card internal padding: 16 px compact, 24 px standard, 32 px emphasis
- Control stack gap: 16 px
- Label to field: 8 px
- Inline action gap: 8 px
- Dense metadata gap: 4 px

### 5.3 Eight-pixel spacing scale

- **4 px:** icon-to-label micro-spacing, metadata, focus offset
- **8 px:** label-to-control, inline actions, chip gaps, compact card rows
- **12 px:** compact button horizontal padding and small status interiors
- **16 px:** mobile page padding, standard control gaps, compact card padding
- **24 px:** standard card padding, page introduction spacing, desktop grid gutters
- **32 px:** section separation and emphasis card padding
- **48 px:** large page-region separation on desktop
- **64 px:** mobile app bars, major landing-page separation only

Do not use 20 px or 28 px unless required by an icon/control geometry. Prefer semantic tokens instead of arbitrary Tailwind classes.

### 5.4 Typography

#### Families

- Latin: `Inter Variable`, fallback `system-ui, sans-serif`
- Arabic: `Noto Sans Arabic Variable`, fallback `Tahoma, Arial, sans-serif`
- Use locale-aware font switching with `[lang="ar"]`

#### Scale

- Display/landing title: 40/48 px, weight 700; mobile 32/40
- Page title/H1: 32/40 px, weight 700; mobile 28/36
- Section title/H2: 24/32 px, weight 650
- Card title/H3: 18/26 px, weight 650
- Body large: 18/28 px, weight 400
- Body: 16/24 px, weight 400
- Supporting: 14/20 px, weight 400
- Label: 14/20 px, weight 600
- Caption: 12/16 px, weight 500
- Button: 14/20 px, weight 650; large button 16/24

Body content must not fall below 16 px in crisis scripts or primary instructions.

### 5.5 Color tokens

#### Light theme

- Primary: `#2557D6`
- Primary hover: `#1946B8`
- On primary: `#FFFFFF`
- Secondary/teal: `#0F766E`
- Success: `#15803D`
- Warning: `#9A5800`
- Error: `#B42318`
- Background: `#F6F8FB`
- Surface: `#FFFFFF`
- Surface subtle: `#EEF3F8`
- Border: `#CBD5E1`
- Text primary: `#172033`
- Text secondary: `#526071`
- Focus: `#1D4ED8`

#### Dark theme

- Primary: `#8DB3FF`
- On primary: `#0B1A35`
- Secondary/teal: `#5EEAD4`
- Success: `#6EE7A0`
- Warning: `#F7C66A`
- Error: `#FF9B91`
- Background: `#0D1424`
- Surface: `#151F32`
- Surface subtle: `#1D2940`
- Border: `#40506A`
- Text primary: `#F7F9FC`
- Text secondary: `#B5C0D0`
- Focus: `#A8C5FF`

Validate every text/background pair with automated contrast tests. Target 4.5:1 for normal text, 3:1 for large text and component boundaries, and never encode risk by color alone.

### 5.6 Shape and elevation

- Small controls: 8 px radius
- Buttons and inputs: 10 px radius
- Cards and dialogs: 16 px radius
- Chips: 999 px radius
- Use one-pixel neutral borders for most cards
- Use Material-style elevation sparingly:
  - Level 0: flat default cards
  - Level 1: sticky app bar and active popovers
  - Level 2: dialogs/sheets only
- Do not mix two-pixel decorative borders with shadows.

## 6. Component library guidelines

### Buttons

- Small: 32 px height, 12 px horizontal padding; utility only
- Medium: 40 px height, 16 px horizontal padding
- Large: 48 px height, 24 px horizontal padding; primary crisis actions
- Variants: filled, tonal, outlined, text, icon
- Hover: darken/lighten fill by one state token
- Focus: 2 px focus ring plus 2 px offset
- Active: subtle pressed overlay and 1 px visual compression
- Disabled: disabled colors, not opacity alone; `cursor: not-allowed`
- Loading: preserve width, show progress indicator, set `aria-busy`

### Cards

- Standard padding: 24 px; compact: 16 px
- Radius: 16 px; border: 1 px neutral
- Header/body gap: 12 px
- Selectable card: full-card hit target, selected icon/check, 2 px primary outline
- Result card: primary text color, 16/24 minimum, actions separated by divider
- Safety card: semantic icon, heading, supporting text, and action; color is supplemental

### Forms and inputs

- Field height: 48 px
- Horizontal padding: 16 px
- Label above field, 8 px gap
- Helper/error below field, 4 px gap
- Error ties to field with `aria-describedby` and `aria-invalid`
- Focus uses tokenized 2 px outline
- Inputs remain 16 px on mobile to avoid browser zoom

### Dropdowns

- 48 px minimum height; visible label
- Locale selector shows language in its own script
- Do not use a 32 px desktop control on touch layouts
- Selected language updates `<html lang>` and `dir`

### Checkboxes and radios

- Native input preferred
- Visual control: 20–24 px; complete row target: at least 44 px
- Radio groups support arrows, Home/End, and one tab stop
- Group with `<fieldset>` and `<legend>`

### Chips

- Height: 40 px minimum; 12–16 px horizontal padding
- Gap: 8 px
- Selected state includes check icon and fill change
- Ensure label remains readable in dark mode and RTL

### Navigation bars

- Desktop: 64 px single-row app bar; logo left/start, primary destinations center/start, utilities end
- Mobile: 64 px app bar for title and utilities; 64–72 px bottom nav for Home, Intervene, Learn, Safety
- Role switch belongs in profile/menu, not primary navigation
- Active state uses icon + label + tonal indicator, not color alone

### Tabs

- 48 px height
- Use for Person/Caregiver script switching on mobile
- Support arrow keys and `aria-controls`
- Keep both scripts side by side at ≥840 px

### Tables

- No current tables.
- Future tables: 48 px rows, sticky header, 16 px cell padding, visible column labels
- Below 600 px, convert dense records to labeled cards or horizontal scroll with an instruction

### Dialogs and modals

- Use only for destructive confirmation, privacy consent, or critical interruption
- Width: min(560 px, viewport − 32 px)
- Padding: 24 px; action gap: 8 px
- Trap focus, restore focus on close, Escape closes unless action is safety-critical

### Sidebars

- No persistent sidebar for current scope
- If future desktop navigation grows, use 240–280 px navigation rail at ≥1200 px; collapse to bottom nav on mobile

### Pagination

- Not needed for current data volume
- Future target size: 40 px; include previous/next labels and current-page announcement

### Badges

- Use for status, not actions
- Height: 24 px; padding 4×8 px; radius 999 px
- Pair color with text/icon

### Notifications

- Inline status near the related action is preferred
- Toasts: confirmation only; 4–6 second duration; pause on hover/focus
- Errors persist until resolved or dismissed
- Crisis warnings are page content, not transient toasts

### Tooltips

- Supplemental labels only; never hide required instructions
- Delay 500 ms pointer, immediate keyboard focus
- Dismiss on Escape

### Loading indicators

- Initial hydration: shell skeleton
- AI generation: progress indicator plus “Generating…” status
- Preserve layout to prevent jumps
- If generation exceeds 8 seconds, show reassurance and Cancel/Retry options

### Empty states

- State what is missing, why it matters, and one action
- Example: caregiver empty state links directly to Person check-in or explains role switching
- Keep illustrations optional and non-essential

### Error states

- Human-readable, localized, and action-oriented
- Never expose raw provider errors
- Include Retry and a non-AI fallback when safety-related
- Move focus to the error summary after submission failure

## 7. Responsive layout specifications

### Desktop

- Keep the header to one row within 1200 px.
- Use centered 760 px forms for check-in/intervention setup.
- Use 960–1120 px for dual scripts and caregiver comparisons.
- Place page title and primary action in a shared page-header row when space allows.

### Laptop

- Maintain 12-column grid with 32 px outer padding.
- Use two columns only when each card remains at least 360 px.
- Keep AI result text in readable 60–75 character lines.

### Tablet

- Use 8 columns and 24 px padding.
- Navigation moves to compact mode.
- Two cards may remain side by side only in landscape.
- Role cards use 4+4 columns; otherwise stack.

### Mobile

- Use 16 px padding and one-column content.
- Bottom navigation remains reachable above the safe area.
- Full-width primary actions; secondary actions may share rows only when each retains 44 px targets.
- Dual scripts become tabs or stacked accordions.
- Risk options may use a five-segment control that fits 100% width.
- Do not allow horizontal overflow in Arabic or Norwegian.

## 8. Accessibility review and checklist

### Required WCAG 2.2 AA fixes

- All interactive targets are at least 44×44 px or have equivalent spacing.
- Keyboard focus is visible at 3:1 contrast and never obscured by sticky navigation.
- Custom radios implement expected keyboard interaction.
- Every page has one H1; headings do not skip levels.
- AI loading, success, copy confirmation, and errors use appropriate live regions.
- Persistent disclaimers use `role="note"`, not `alert`.
- Color is never the only indicator of risk, selected state, success, or error.
- Text zoom to 200% does not clip, overlap, or hide actions.
- Layout reflows at 320 CSS px without horizontal scrolling.
- `lang` and `dir` match selected language before meaningful content is announced.
- Arabic uses an Arabic-optimized font and mirrored directional icons.
- Icon-only buttons have localized accessible names.
- New-tab links expose that behavior.
- Generated scripts use readable text size and support browser zoom.
- Motion respects `prefers-reduced-motion`.
- High-risk actions remain available when AI fails.

### Test matrix

- Keyboard only: Chrome/Edge
- Screen reader: Narrator + Edge on Windows
- Zoom: 200% and 400%
- Viewports: 320, 390, 768, 1024, 1440 px
- Themes: light, dark, Windows high contrast
- Locales: English, Arabic RTL, Spanish, Norwegian
- Reduced motion enabled
- Slow 3G simulation for hydration and AI states

## 9. Page-by-page redesign recommendations

### Landing / role selection

**Current problems**

- Excessive vertical gaps and a fixed side-by-side role layout
- Role cards depend on emoji and lack a strong selected indicator
- The primary action is visually detached below the fold at some viewport heights

**Recommended layout**

- Focused 760 px container
- Title/supporting copy, then a 2-column role grid that stacks below 600 px
- Nickname field and Continue grouped in one form surface
- Continue remains visible without scrolling at 768 px height

**Priority:** High

### Person check-in

**Current problems**

- Header dominates mobile
- H1 wraps awkwardly
- Risk selector and chips are visually separate but have equal emphasis
- Quick actions appear only after check-in without a transition or status explanation

**Recommended layout**

- Page header with greeting and “Last check-in” metadata
- One standard check-in card: risk group, situation chips, primary Check in button
- After submit, show a status summary and a 2×2 action grid; at high risk, Safety spans full width first
- On desktop, check-in uses 7 columns and action panel uses 5 columns

**Priority:** Critical because it gates all workflows

### Intervention

**Current problems**

- Sparse empty state with one detached button
- Generated steps are repetitive bordered cards
- No AI progress status or non-AI fallback

**Recommended layout**

- Context summary at top: risk and selected situations
- Primary action inside a prepared intervention panel
- Loading skeleton occupies final result space
- Results use a vertical stepper rather than identical cards
- Sticky mobile footer offers “Safety” and “Create scripts”

**Priority:** High

### Emergency scripts

**Current problems**

- Two-column layout begins at `md` despite narrow global container
- Script body is small and muted
- Copy/read controls are undersized and provide no confirmation

**Recommended layout**

- 960 px comparison container
- Desktop: equal 6+6 columns
- Mobile: accessible Person/Caregiver tabs
- 16/26 script text, paragraph structure, prominent Copy and Read buttons
- Inline confirmation and playback controls

**Priority:** High

### Caregiver

**Current problems**

- Last check-in summary and generation action feel disconnected
- “Do say” and “Avoid saying” depend heavily on green/red
- Empty state has guidance but no direct action

**Recommended layout**

- Dashboard header with loved-one status and timestamp
- Two-column desktop layout: current moment/status (4 columns), briefing (8 columns)
- Do/Avoid panels use icon + heading + neutral text, with color as reinforcement
- Empty state includes “Switch to Person check-in” button

**Priority:** High

### Learn

**Current problems**

- Cards lack chevrons and clear expandable affordance
- Content remains English in localized interfaces
- Every card has equal visual weight

**Recommended layout**

- Filter chips for immediate need: cravings, triggers, grounding, connection
- Featured recommendation based on the active moment
- Remaining articles in a responsive 2-column grid
- Expand inline or open a focused detail panel; localize all content

**Priority:** Medium

### Safety

**Current problems**

- US-only resources appear globally
- Resource links look like generic cards rather than urgent actions
- Grounding is passive text rather than a guided interaction

**Recommended layout**

- Safety header with local emergency guidance and region selector
- First section: emergency services and crisis lines with call/text actions
- Second section: guided 5-4-3-2-1 stepper with progress
- Third section: saved scripts and trusted contact actions
- Keep all safety functions available offline where possible

**Priority:** Critical

## 10. Performance and UX recommendations

- Replace blank hydration with a stable shell skeleton.
- Prevent layout shifts by reserving AI result areas.
- Lazy-load nonessential education content, but never safety content.
- Keep client-side generated output parsing defensive and show localized recovery states.
- Reduce header work and repaint by using one responsive navigation component rather than wrapping.
- Use `Intl.DateTimeFormat` for locale-correct timestamps.
- Preserve check-in draft state so navigation does not discard selections.
- Add a compact “Current moment” summary across intervention, scripts, and caregiver pages to reduce memory burden.
- Avoid animations longer than 200 ms; use opacity/position sparingly and disable under reduced motion.

## 11. UI consistency checklist

- One page shell and responsive grid
- One page-header pattern
- One typography scale
- One 8 px spacing system
- One radius family
- Five button variants only
- Shared card primitives
- Shared async/loading/error components
- Shared form field, radio group, chip group, and select
- Shared status/safety callouts
- Shared icon library
- Locale-complete copy and formatting
- Light/dark tokens tested together
- RTL tested at every breakpoint
- All route transitions and direct links verified

## 12. Implementation roadmap

### Quick wins: 1–2 days

1. Fix Firebase route handling and direct-link tests.
2. Fix functional blockers: pre-check-in nav messaging, role-switch navigation, live high-risk Safety CTA, persist caregiver briefing.
3. Move route guards into `useEffect` / shared gate; add skip link and per-route titles.
4. Increase global shell width and separate focused/comparison containers.
5. Replace wrapping mobile header with compact app bar and bottom nav.
6. Normalize H1/H2/body/button typography; standardize primary/secondary/card/input primitives.
7. Change persistent disclaimer from alert to note.
8. Add copy confirmation, speech `lang`, and AI live regions.

### Medium effort: 3–5 days

1. Build token files for color, spacing, type, radius, elevation, and breakpoints.
2. Refactor all pages to shared `PageHeader`, `Card`, `Button`, `AsyncPanel`, and form components.
3. Implement native/keyboard-complete risk radio group and chip group.
4. Redesign scripts as responsive comparison/tabs.
5. Add locale-complete curated content and localized AI output.
6. Add region-aware safety resources.
7. Add skeleton, empty, error, and offline states.

### Long term: 1–2 weeks

1. Guided interactive grounding flow with offline support.
2. Accessibility regression suite using axe plus manual screen-reader scripts.
3. Visual regression tests across four locales, two themes, and five viewports.
4. Formal VPAT/ACR evidence collection.
5. Usability testing with people in recovery and caregivers, with trauma-informed research safeguards.

## 13. Definition of done

- All seven routes load directly, refresh correctly, and navigate correctly.
- Header never wraps at supported widths.
- No interactive target is below 44×44 px on touch layouts.
- All current pages use shared design-system primitives.
- English, Arabic, Spanish, and Norwegian screens contain no unintended English UI.
- Arabic layout, font, icons, and generated output are RTL-correct.
- Safety resources match the selected region.
- Axe reports no serious/critical findings on primary states.
- Keyboard and Narrator walkthroughs complete all workflows.
- Light/dark contrast passes WCAG 2.2 AA.
- At 320 px and 400% zoom, no essential content or action is lost.
