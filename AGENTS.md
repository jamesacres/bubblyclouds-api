Architecture:

- Single NestJS app under `src/`, organised into feature modules; `deploy/` is a
  separate AWS CDK app. See ARCHITECTURE.md for the module hierarchy and the
  decision tree for where new code goes.
- All persistence goes through `DynamoDBAdapter` (single table: PK `modelId`, SK
  `owner`, GSI `ownerIndex`) via `DynamoDBAdapterFactory`. Never call the AWS SDK
  directly from a repository, and never add a second table.
- Global config (guards, pipes, filters, Swagger) lives only in `app.build.ts`.
  `main.ts` and `lambda.ts` just bootstrap it — don't configure globals elsewhere.

Rules:

- New persisted model: add it to the `Model` enum (`src/types/enums/model.ts`)
  and follow the parties module shape — dto interface + dto class, entity,
  repository, then register in `AppModule`.
- Repositories return entities; services return DTOs. Keep raw records inside the
  repository layer.
- The `*.dto.ts` class (class-validator + `@ApiProperty`) is the API contract.
  Derive create/update variants with `@nestjs/swagger` mapped types
  (`OmitType`/`PartialType`/`IntersectionType`), don't duplicate fields.
- Auth is deny-by-default via the global `AuthGuard`. Opt out only with
  `@Public()`, `@ApiKey()`, or `@RequirePermissions(...)`.
- Imports: use the `@/` alias for anything outside the current feature folder,
  relative paths within it. No deep `../../otherFeature` imports.
- `nanoid` is ESM-only: import it dynamically (`const { nanoid } = await import('nanoid')`).
- Secrets come from `AppConfig` via `ConfigService` — never hard-code apiKeys,
  adminUsers, codes or the RevenueCat key.
- Do not commit `dist/` or `coverage/` (build/test output, gitignored).
  `wasm/`, `sudoku-seeds/` and `src/lib/qqwing/` are vendored code checked
  into git and required at runtime — never delete or gitignore them.
- Co-locate a `*.spec.ts` with every new source file; unit coverage thresholds
  are enforced (95% statements/functions/lines, 85% branches).
- When moving or changing files, update the co-located test files.
- At the end of a task, ONLY if it was complex, run `npm run build:nest` and
  `npm test` and fix all issues. If you touched persistence or app wiring, also
  run `npm run test:integration` and `npm run test:e2e` (start DynamoDB first
  with `npm run dynamodb:start`).
- At the end of a task, run `npm run lint` to fix linting issues.
- Ensure md files are updated if they reference something which is no longer true.
