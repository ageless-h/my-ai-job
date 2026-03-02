# AI Job Hunting

Tampermonkey userscript for BOSS job search automation. It provides batch push/collect workflows, AI-assisted chat replies, preference controls, and operation logs in a Vue 3 + Pinia + Element Plus panel.

## Key Features

- Batch push and batch collect on job list pages
- AI assistant replies based on resume and prompt settings
- Preference filters for salary, activity, company and push rules
- Runtime logs and counters for success/failure tracking
- AI config with provider/model settings and debug endpoints

## Tech Stack

- Vue 3
- Pinia
- Element Plus
- Vite + vite-plugin-monkey
- Axios + Protobuf

## Project Structure

```text
ai-job-hunting/
├─ src/
│  ├─ app/                               # bootstrap and root app shell
│  │  ├─ main.ts
│  │  └─ App.vue
│  ├─ features/                          # feature-focused UI modules
│  │  ├─ panel/
│  │  ├─ job-assistant/
│  │  ├─ preference/
│  │  ├─ ai-config/
│  │  ├─ run-record/
│  │  ├─ product/
│  │  └─ conversation-cleaner/
│  ├─ core/                              # business/runtime infrastructure
│  │  ├─ ai/ auth/ http/ platform/
│  │  ├─ engine/ realtime/ protocol/
│  │  └─ AGENTS.md
│  ├─ state/                             # pinia stores
│  └─ shared/                            # shared utils/errors/types
├─ docs/
│  ├─ README.md
│  └─ plans/
├─ package.json
└─ vite.config.ts
```

### Layering Rules

- `app` can depend on `features`, `core`, `state`, `shared`.
- `features` can depend on `core`, `state`, `shared`.
- `core` can depend on `state`, `shared` but should avoid direct UI ownership.
- `shared` should stay framework-light and reusable.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Build output:

- `dist/ai-job-hunting.user.js`

## Type Check

```bash
npm run type-check
```

## Notes

- This repo keeps source code. Do not commit generated `dist/` artifacts.
- The userscript runs on BOSS pages and depends on page runtime context.
