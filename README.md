<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Installation

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Test

The suite is layered into three complementary levels:

| Level           | Command                    | Wired to                    | What it proves |
| --------------- | -------------------------- | --------------------------- | -------------- |
| **Unit**        | `npm test`                 | Mocked dependencies         | Each service / controller / repository / guard / util behaves correctly in isolation. Runs fast, no external services. Enforces coverage thresholds. |
| **Integration** | `npm run test:integration` | **Real DynamoDB Local**     | The data layer (repositories + `DynamoDBAdapter`) actually reads/writes DynamoDB — marshalling, the `ownerIndex` GSI, TTL/expiry, pagination and batch deletes. No HTTP, no guards. |
| **E2E**         | `npm run test:e2e`         | **Full app over HTTP + DynamoDB Local** | A real HTTP client driving the whole application (`build()` → all modules, global `AuthGuard`, `ValidationPipe`, `DatePipe`, exception filter) with a real RSA-signed JWT. Proves auth → routing → validation → service → repository → DynamoDB → response works end-to-end. |

**Integration vs E2E:** integration tests target *only the persistence slice* and are the fast way to catch DynamoDB schema/query regressions. E2E tests exercise *every layer through the network boundary* exactly as a client would, catching wiring, auth, validation and serialization issues that a slice test can't see.

```bash
# unit tests
$ npm run test

# unit test coverage (enforces thresholds)
$ npm run test:cov

# start local DynamoDB (required for integration + e2e)
$ npm run dynamodb:start   # docker, listens on :8000

# integration tests (real DynamoDB Local)
$ npm run test:integration

# e2e tests (full HTTP app + real DynamoDB Local)
$ npm run test:e2e

# lint / typecheck
$ npm run lint
$ npm run typecheck
```

CI (`.github/workflows/ci.yml`) runs lint, typecheck, build, unit (with coverage), integration and e2e on every push/PR, with a `amazon/dynamodb-local` service container. Husky hooks run lint + typecheck on commit, and the full suite (incl. DynamoDB) on push.

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://kamilmysliwiec.com)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](LICENSE).
