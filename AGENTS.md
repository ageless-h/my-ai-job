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
├─ core/           # runtime and business infrastructure
│  ├─ platform/    # boss-platform.ts (1894 lines), boss-api-client.ts, boss-dom-adapter.ts
│  ├─ delivery/    # ai-delivery-builder.ts (投递逻辑构建)
│  ├─ ai/          # AI 能力封装
│  ├─ auth/        # 认证相关
│  ├─ http/        # HTTP 请求封装
│  ├─ engine/      # 推送引擎
│  ├─ protocol/    # 协议定义
│  └─ realtime/    # 实时通信
├─ state/          # pinia stores
├─ shared/         # shared utils/errors/types
│  └─ utils/       # tools.ts (234 lines), salary-utils.ts, url-utils.ts, security-utils.ts, config-manager.ts
└─ styles/
```

## Key Entry Points

- App bootstrap: `src/app/main.ts`
- Root component: `src/app/App.vue`
- Main panel: `src/features/panel/components/Panel.vue`
- Platform factory: `src/core/platform/platform-factory.ts`
- Core platform logic: `src/core/platform/boss-platform.ts` (1894 lines)
- API client: `src/core/platform/boss-api-client.ts` (6 core API methods)
- Delivery builder: `src/core/delivery/ai-delivery-builder.ts` (AI 投递逻辑)

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

- All `@ts-nocheck` directives have been removed; type safety is enforced across the codebase.
- Dynamic import and userscript runtime behavior must be validated on real BOSS pages after structural refactors.
- `tools.ts` has been modularized into specialized utility modules (salary-utils, url-utils, security-utils, config-manager).
- API calls are centralized in `boss-api-client.ts` for better maintainability.
