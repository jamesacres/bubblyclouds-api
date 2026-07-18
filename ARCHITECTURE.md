# Architecture

Bubbly Clouds API is a **single-application NestJS service**. There are no
workspace packages — everything lives under `src/`, organised into NestJS
feature modules and a set of cross-cutting modules. The `deploy/` directory is a
separate, self-contained AWS CDK app (its own `package.json`) that provisions
and deploys this service to AWS Lambda.

The app runs in two shapes from one codebase:

- **Local / server** — `src/main.ts` boots an Express server on `:3000`.
- **AWS Lambda** — `src/lambda.ts` wraps the same app in
  `@codegenie/serverless-express` and caches the server across warm invocations.

Both paths call the single `build()` factory in `src/app.build.ts`, so global
guards, pipes, filters, Helmet, CORS and Swagger are configured in exactly one
place.

## Module Hierarchy

Modules are wired through NestJS dependency injection, not a package graph. The
layering below is the *dependency direction*: higher layers depend on lower
ones, never the reverse.

```
┌─────────────────────────────────────────────────────────────────────┐
│ Entry points                                                          │
│   main.ts (Express server)   ·   lambda.ts (serverless handler)       │
│                        both → app.build.ts → AppModule                │
└─────────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────────┐
│ Feature modules  (Controller + Service + Repository + Entity + DTOs)  │
│   AccountModule    — delete a user's account and all owned data        │
│   PartiesModule    — parties (groups); entitlement logic               │
│   InvitesModule    — invites to join a party                           │
│   MembersModule    — party membership                                  │
│   SessionsModule   — per-app game/session state                        │
│   SudokuModule     — sudoku puzzle generation + book seeds             │
│   AgentModule      — Bedrock inline agent + local MCP tool server      │
│   RevenuecatModule — RevenueCat entitlement lookups (no controller)    │
└─────────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────────┐
│ Cross-cutting (global) modules & providers                            │
│   AuthGuard (APP_GUARD)  — JWT / API-key auth on every route           │
│   DatePipe, ValidationPipe (global)                                    │
│   AllExceptionsFilter (global)                                         │
│   ConfigModule            — loads AppConfig via fetchAppConfig         │
│   JwtModule               — RS256 verification                         │
└─────────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────────┐
│ Persistence foundation                                                │
│   DynamoDBModule (global)                                              │
│     └─ DynamoDBAdapterFactory → DynamoDBAdapter<T>                     │
│        single-table design: PK modelId, SK owner, GSI ownerIndex      │
└─────────────────────────────────────────────────────────────────────┘
```

`DynamoDBModule` and `ConfigModule` are registered as **global**, so feature
modules inject `DynamoDBAdapterFactory` and `ConfigService` without importing
them. `AuthGuard` is registered once as an `APP_GUARD` in `AppModule` and runs
on every route unless opted out.

## The DynamoDB single-table pattern

All persistence goes through one DynamoDB table and one adapter. Understand this
before touching any repository.

- Table shape (documented at the top of `src/dynamodb/dynamodb-adapter.ts`):
  - Partition key `modelId` = `"<modelName>-<id>"` (e.g. `party-sudoku-abc123`)
  - Sort key `owner` = `"<ownerType>-<ownerId>"` (e.g. `user-user123`)
  - GSI `ownerIndex` flips these (PK `owner`, SK `modelId`) to list everything a
    user owns of a given model.
  - TTL attribute `expiresAt` (stored as unix seconds; adapter converts to/from
    `Date`).
- `DynamoDBAdapterFactory.createAdapter(Model.X)` returns a
  `DynamoDBAdapter<T>` bound to one model name. Each repository creates its
  adapter in its constructor.
- The adapter owns marshalling, `createdAt`/`updatedAt`/`expiresAt` conversion,
  `ownerIndex` queries, pagination (`MAX_PAGES`) and batch deletes. Reads use
  `exponential-backoff` (`MAX_RETRIES`) to absorb eventual consistency; pass
  `disableBackoff` to skip it.

New models are added to the `Model` enum in `src/types/enums/model.ts`.

## The Repository / Entity / DTO pattern

Every feature module follows the same four-part shape. Parties is the canonical
example:

- **DTO interface** (`dto/party.ts`) — a plain `interface Party` describing the
  persisted record. This is the `T` for `DynamoDBAdapter<T>`.
- **DTO class** (`dto/party.dto.ts`) — a `class PartyDto` with
  `class-validator` + `@ApiProperty` decorators. This is the HTTP
  request/response contract and the source of truth for Swagger. Create/Update
  DTOs are derived from it with `@nestjs/swagger` mapped types
  (`OmitType`, `IntersectionType`, `PartialType`).
- **Entity** (`entities/party.entity.ts`) — a class implementing the interface,
  holding defaults (e.g. `DEFAULT_MAX_SIZE`) and domain behaviour
  (e.g. `findMembers()`). Repositories return entities, not raw records.
- **Repository** (`repository/party.repository.ts`) — `@Injectable`, wraps a
  `DynamoDBAdapter`, exposes `insert/update/find/findAll…/destroy/batchDestroy`
  and maps adapter results into entities.

The service orchestrates repositories and enforces business rules; the
controller only validates the `app` query param, extracts `req.user.sub`, and
delegates.

## Authentication & authorization

- `AuthGuard` (`src/guards/auth.guard.ts`) runs on every route as the global
  `APP_GUARD`.
- Default: a `Bearer` JWT is required, verified RS256 against the JWKS at
  `https://auth.bubblyclouds.com/jwks` (cached in-process by
  `fetchPublicKey`), with fixed `audience`/`issuer`. The decoded `User` is
  attached as `req.user` and the raw token as `req.authToken`.
- Opt-outs via metadata decorators (`src/decorators/`):
  - `@Public()` — allow the route when no token is present.
  - `@ApiKey()` — allow HTTP Basic auth matched against `AppConfig.apiKeys`.
  - `@RequirePermissions(Permission.X, …)` — require scopes in the JWT `scope`
    claim; can be applied at controller or handler level.

## Configuration

`AppConfig` (`src/types/interfaces/appConfig.ts`) is loaded once at startup by
`fetchAppConfig` (`src/utils/fetchAppConfig.ts`) and read via `ConfigService`.
In Lambda it comes from the AWS AppConfig extension layer; locally it falls back
to env vars. It carries `apiKeys`, `adminUsers`, entitlement `codes` and the
RevenueCat key — secrets, so never hard-code them.

## Decision tree: where does new code go?

```
Adding an HTTP endpoint to an existing resource?
  → add a handler to that module's controller, logic to its service.

New persisted resource / model?
  1. Add it to the Model enum (src/types/enums/model.ts).
  2. nest g module/controller/service <name>  (or copy the parties module).
  3. Add dto interface + dto class, entity, repository (adapter via factory).
  4. Register the module in AppModule.imports.

Reusable logic with no HTTP surface?
  → a util in src/utils/ (pure function + .spec.ts).

Cross-cutting request behaviour?
  → guard (src/guards/), pipe (src/pipes/), filter (src/exceptionFilters/),
    or metadata decorator (src/decorators/).

Shared type/enum/interface used across modules?
  → src/types/enums/ or src/types/interfaces/.

Infrastructure / deployment change?
  → the deploy/ CDK app (separate package), not src/.
```

## Import guidelines

Path alias `@/*` maps to `src/*` (see `tsconfig.json` and the Jest
`moduleNameMapper`). Use it for anything outside the current feature folder;
use relative paths within a feature.

```ts
// ✅ cross-module / shared code — absolute alias
import { Model } from '@/types/enums/model';
import { DynamoDBAdapter } from '@/dynamodb/dynamodb-adapter';
import { MemberRepository } from '@/members/repository/member.repository';

// ✅ within the same feature folder — relative
import { PartyEntity } from '../entities/party.entity';
import { CreatePartyDto } from './dto/create-party.dto';

// ❌ don't reach into another feature with a relative path
import { MemberRepository } from '../../members/repository/member.repository';
```

`nanoid` is imported dynamically (`const { nanoid } = await import('nanoid')`)
because it is ESM-only; the pattern is already established in
`party.repository.ts` and is mocked in tests.

## Testing strategy

Three layers, each with its own runner (see README for commands):

- **Unit** (`*.spec.ts`, co-located in `src/`) — dependencies mocked; enforces
  coverage thresholds (95% statements/functions/lines, 85% branches). Modules,
  DTOs, `main.ts`/`lambda.ts`/`app.build.ts` and the vendored qqwing lib are
  excluded from coverage.
- **Integration** (`test/integration/**`) — real DynamoDB Local; exercises the
  repository + adapter slice only (marshalling, `ownerIndex`, TTL, pagination,
  batch delete).
- **E2E** (`test/e2e/**`) — full app via `build()` over HTTP against DynamoDB
  Local, with a real RSA-signed JWT; proves auth → routing → validation →
  service → repository → response.

## Architectural principles

1. **One build factory.** All global config lives in `app.build.ts`; entry
   points (`main.ts`, `lambda.ts`) only bootstrap it. Don't configure guards or
   pipes elsewhere.
2. **One table, one adapter.** Repositories never talk to the AWS SDK directly —
   they go through `DynamoDBAdapter` via the factory.
3. **Repositories return entities, services return DTOs.** Keep raw table
   records inside the repository layer.
4. **The DTO class is the API contract.** Validation and Swagger derive from it;
   derive create/update variants with mapped types rather than duplicating.
5. **Auth is deny-by-default.** Every route is guarded; opting out is explicit
   via `@Public` / `@ApiKey` / `@RequirePermissions`.
6. **Feature modules are self-contained.** Cross-feature use goes through a
   module's exported service/repository via the `@/` alias, not deep relative
   imports.
