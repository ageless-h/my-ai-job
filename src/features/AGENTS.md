# FEATURES LAYER KNOWLEDGE

## Scope

Feature modules are organized by user-facing capability:

- `features/panel/` - main shell and tab switching
- `features/job-assistant/` - push/collect/chat main workflow
- `features/preference/` - preference forms
- `features/ai-config/` - provider/model/prompt/debug tooling
- `features/run-record/` - operation logs view
- `features/product/` - purchase/pay related UI
- `features/conversation-cleaner/` - conversation cleanup UI and feature service

## Rules

- Keep feature-local helper components within the feature directory.
- Feature code can consume `core`, `state`, and `shared`, but should not reach into `app`.
- Preserve existing runtime behavior before visual or structural cleanup.

## Validation

- Build: `npm run build`
- Type check: `npm run type-check`
