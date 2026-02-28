# CORE LAYER KNOWLEDGE

## Scope

Core layer contains infrastructure and business runtime modules:

- `core/ai/` - AI ask/filter and direct provider calls
- `core/auth/` - login and resume import flow
- `core/http/` - axios instance and request throttling
- `core/platform/` - platform adapters and factory
- `core/engine/` - push engine and log recorder
- `core/realtime/` - SSE client
- `core/protocol/` - message/mqtt/protobuf protocol logic

## Rules

- Keep core focused on runtime capabilities; avoid embedding UI concerns.
- Reuse `shared/utils` and `shared/errors` for common logic.
- Prefer absolute alias imports (`@/...`) over deep relative paths.

## High-Risk Files

- `src/core/platform/boss-platform.ts`
- `src/core/platform/boss-option.ts`
- `src/core/engine/push-engine.ts`

These files affect runtime behavior directly; validate with `npm run build` after edits.
