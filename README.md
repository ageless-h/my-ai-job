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

## Testing

### E2E Tests (Playwright)

```bash
# Run E2E tests
npm run test:e2e

# Run E2E tests in UI mode
npm run test:e2e:ui
```

### Unit Tests (Vitest)

```bash
# Run unit tests
npm run test

# Run tests with coverage
npm run test:coverage
```

### Test Documentation

- [Playwright Setup Guide](docs/playwright-setup.md) - Complete configuration guide
- [Test Coverage Final Report](docs/test-coverage-final-report.md) - **Latest coverage analysis**
- [Test Report](docs/test-report.md) - Test coverage and results
- [Test Issues](docs/test-issues.md) - Issues found during testing
- [Testing Complete Summary](docs/TESTING-COMPLETE.md) - Project completion summary
- [Delivery Checklist](DELIVERY-CHECKLIST.md) - Complete delivery checklist

### Test Coverage Status

**Current Status** (2026-03-09):
- ✅ **Unit Tests**: 41/41 passing (100%)
- ⚠️ **Code Coverage**: 8.74% (target: 80%)
- ⏳ **E2E Tests**: 32 test cases written, not yet executed

**Coverage Breakdown**:
- Lines: 8.74% | Functions: 27.02% | Branches: 52.66% | Statements: 8.74%

**High Coverage Modules** (>60%):
- `preference.ts`: 100%
- `push-result.ts`: 91.17%
- `logger.ts`: 84.84%
- `request-throttle.ts`: 75%

**Coverage Gap Analysis**:
- Vue components: 0% (8000+ lines) - requires E2E or component tests
- Business logic: 10-20% (4000+ lines) - requires extensive unit tests
- Network/Auth: 0-5% (1000+ lines) - requires HTTP mocking

See [Test Coverage Final Report](docs/test-coverage-final-report.md) for detailed analysis and improvement roadmap.

## Notes

- This repo keeps source code. Do not commit generated `dist/` artifacts.
- The userscript runs on BOSS pages and depends on page runtime context.
