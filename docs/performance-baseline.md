# Performance baseline

Captured: 2026-07-25  
Runtime: Node.js 24.2.0  
Framework: Next.js 16.2.11  
Command: `npm run build && npm run check:bundle`

The checker reads App Router client-reference manifests and sums unique, uncompressed JavaScript bytes referenced by each route. This is a deterministic regression guard, not a network-transfer estimate. Shared layout JavaScript is measured separately. Budgets are the measured baseline plus 15% for shared code and 20% for each route, rounded up.

| Scope         | Baseline bytes | Budget bytes |
| ------------- | -------------: | -----------: |
| Shared layout |        367,073 |      422,134 |
| `/`           |        375,801 |      450,962 |
| `/caregiver`  |        381,674 |      458,009 |
| `/intervene`  |        379,754 |      455,705 |
| `/learn`      |        381,843 |      458,212 |
| `/person`     |        377,638 |      453,166 |
| `/safety`     |        377,879 |      453,455 |
| `/scripts`    |        380,993 |      457,192 |

The script also scans every generated client JavaScript, CSS, source map, and client-reference manifest for `@google/genai` and related package/class markers. Any match fails the check. Baselines must only be changed after reviewing the bundle diff and confirming the Gemini provider remains server-only.
