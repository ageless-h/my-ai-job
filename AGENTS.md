# PROJECT KNOWLEDGE BASE

## Overview

AI Job Hunting is a Tampermonkey userscript project for BOSS job automation.
Tech stack: Vue 3 + Pinia + Element Plus + Vite + vite-plugin-monkey.
Build output is a single userscript file: `dist/ai-job-hunting.user.js`.

## Source Layout

```text
src/
├─ app/            # app bootstrap and root shell
├─ features/       # user-facing feature modules (panel, ai-config, preference, job-assistant...)
├─ core/           # runtime and business infrastructure (platform/auth/http/engine/protocol)
├─ state/          # pinia stores
├─ shared/         # shared utils/errors/types
└─ styles/
```

## Key Entry Points

- App bootstrap: `src/app/main.ts`
- Root component: `src/app/App.vue`
- Main panel: `src/features/panel/Panel.vue`
- Platform factory: `src/core/platform/platform-factory.ts`
- Core platform logic: `src/core/platform/boss-platform.ts`

## Dependency Rules

- `app` -> `features | core | state | shared`
- `features` -> `core | state | shared`
- `core` -> `state | shared` (avoid direct UI ownership when possible)
- `state` -> `shared`
- `shared` -> no business-layer dependencies

## Build & Verify

```bash
npm run build
npm run type-check
```

## Notes

- Some large components use `@ts-nocheck`; this is legacy and should be reduced gradually.
- Dynamic import and userscript runtime behavior must be validated on real BOSS pages after structural refactors.
