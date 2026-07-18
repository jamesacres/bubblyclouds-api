# Bubbly Clouds API

The API that powers Bubbly Clouds projects (starting with Sudoku). It's a
[NestJS](https://nestjs.com/) service backed by a single **DynamoDB** table,
built to run both as a local Express server and as an **AWS Lambda** function
behind a serverless-express adapter. It handles auth (RS256 JWT + API keys),
parties/members/invites, per-app session state, sudoku puzzle generation, and an
AI agent endpoint (AWS Bedrock inline agents + a local MCP tool server).

## Architecture overview

Everything lives in a single application under `src/`, organised into NestJS
feature modules (`parties`, `members`, `invites`, `sessions`, `sudoku`,
`account`, `agent`, `revenuecat`) plus cross-cutting modules for auth, config
and persistence. All data access goes through one `DynamoDBAdapter` over a
single-table design (PK `modelId`, SK `owner`, GSI `ownerIndex`). Both the
Express and Lambda entry points share one `build()` factory so global guards,
pipes, filters and Swagger are configured in exactly one place.

Deployment is handled by a separate AWS CDK app in `deploy/`.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the module hierarchy, the DynamoDB
pattern, the repository/entity/DTO convention, and where new code should go.

## Quick start

Prerequisites:

- **Node.js 24** (see `.nvmrc`)
- **npm** (repo uses `package-lock.json` / `npm ci`)
- **Docker** (for local DynamoDB, required by integration and e2e tests)

```bash
npm install          # or: npm ci
npm run start:dev    # watch-mode Express server on http://localhost:3000
```

Swagger UI is served at `http://localhost:3000/api`.

## Available commands

| Task | Command |
| --- | --- |
| Dev server (watch) | `npm run start:dev` |
| Dev server | `npm run start` |
| Production (from `dist/`) | `npm run start:prod` |
| Build (NestJS) | `npm run build:nest` |
| Build (Lambda bundle) | `npm run build:lambda` |
| Unit tests | `npm test` |
| Unit tests (coverage, enforces thresholds) | `npm run test:cov` |
| Start local DynamoDB | `npm run dynamodb:start` |
| Integration tests (real DynamoDB Local) | `npm run test:integration` |
| E2E tests (full HTTP app + DynamoDB Local) | `npm run test:e2e` |
| Lint (auto-fix) | `npm run lint` |
| Lint (check only, CI) | `npm run lint:check` |
| Type-check | `npm run typecheck` |
| Format | `npm run format` |

Integration and e2e tests need DynamoDB Local — start it with
`npm run dynamodb:start` (listens on `:8000`) in a separate terminal first.

## Testing

The suite is layered into three complementary levels:

| Level | Command | Wired to | What it proves |
| --- | --- | --- | --- |
| **Unit** | `npm test` | Mocked dependencies | Each service / controller / repository / guard / util behaves correctly in isolation. Fast, no external services. Enforces coverage thresholds. |
| **Integration** | `npm run test:integration` | **Real DynamoDB Local** | The data layer (repositories + `DynamoDBAdapter`) actually reads/writes DynamoDB — marshalling, the `ownerIndex` GSI, TTL/expiry, pagination and batch deletes. No HTTP, no guards. |
| **E2E** | `npm run test:e2e` | **Full app over HTTP + DynamoDB Local** | A real HTTP client driving the whole application (`build()` → all modules, global `AuthGuard`, `ValidationPipe`, `DatePipe`, exception filter) with a real RSA-signed JWT. Proves auth → routing → validation → service → repository → DynamoDB → response end-to-end. |

CI (`.github/workflows/ci.yml`) runs lint, typecheck, build, unit (with
coverage), integration and e2e on every push/PR, with an
`amazon/dynamodb-local` service container, then builds and tests the `deploy/`
CDK app. Husky runs lint + typecheck on commit, and the full suite (spinning up
DynamoDB in Docker) on push.

## Modules

| Module | Responsibility |
| --- | --- |
| `account` | Delete a user's account and cascade-delete all owned data. |
| `parties` | Parties (groups) — creation, listing, entitlement duration logic. |
| `invites` | Invites to join a party. |
| `members` | Party membership records. |
| `sessions` | Per-app game/session state (e.g. saved sudoku games). |
| `sudoku` | Sudoku puzzle generation (qqwing wasm) and puzzle-book seeds. |
| `agent` | AWS Bedrock inline agent endpoint + in-memory MCP tool server. |
| `revenuecat` | RevenueCat entitlement lookups (service only, no controller). |
| `dynamodb` | Single-table adapter + factory (global). |
| `guards` / `decorators` / `pipes` / `exceptionFilters` | Cross-cutting request handling. |
| `types` / `utils` | Shared enums, interfaces and pure helpers. |

## Project structure

```
.
├── src/
│   ├── main.ts               # Express entry point (local/server)
│   ├── lambda.ts             # AWS Lambda handler (serverless-express)
│   ├── app.build.ts          # shared build() factory: guards, pipes, Swagger
│   ├── app.module.ts         # root module — wires all feature modules
│   ├── <feature>/            # controller + service + repository + entities + dto
│   ├── dynamodb/             # DynamoDBAdapter + factory (single-table access)
│   ├── guards/ decorators/ pipes/ exceptionFilters/   # cross-cutting
│   ├── config/ lib/ utils/   # config, vendored qqwing wasm, pure helpers
│   └── types/                # enums/ and interfaces/
├── test/
│   ├── e2e/                  # full HTTP app tests (+ shared harness/mocks)
│   ├── integration/          # repository/adapter tests against DynamoDB Local
│   └── mocks/                # nanoid, qqwing test doubles
├── deploy/                   # AWS CDK app (separate package) — infra + deploy
├── sudoku-seeds/ wasm/       # bundled assets copied into dist/ on build
└── docs/                     # supplementary docs (e.g. analytics-backfill)
```

## Tech stack

- **Framework:** NestJS 11 (Express platform)
- **Language:** TypeScript 5 (strict null checks, `noImplicitAny`)
- **Data store:** AWS DynamoDB (single-table) via `@aws-sdk/lib-dynamodb`
- **Auth:** RS256 JWT (`@nestjs/jwt`, JWKS from auth.bubblyclouds.com) + API keys
- **AI:** AWS Bedrock inline agents + Model Context Protocol (`@modelcontextprotocol/sdk`)
- **Docs:** Swagger / OpenAPI (`@nestjs/swagger`) at `/api`
- **Tests:** Jest + ts-jest, Supertest (e2e), DynamoDB Local
- **Lint/format:** ESLint (typescript-eslint) + Prettier
- **Deployment:** AWS Lambda, provisioned by AWS CDK (`deploy/`)

## Contributing

1. Branch off `main`.
2. Make your change; follow the module conventions in
   [ARCHITECTURE.md](./ARCHITECTURE.md) and update co-located `*.spec.ts` tests.
3. Run `npm run lint` and `npm run typecheck`.
4. Run `npm test` (and integration/e2e if you touched persistence or wiring —
   start DynamoDB with `npm run dynamodb:start` first).
5. Open a PR against `main`. CI must pass; Husky enforces the same checks locally.
