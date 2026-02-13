# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project commands
- Install dependencies: `yarn install`
- Start in watch mode: `yarn start:dev`
- Build production bundle: `yarn build`
- Run app in production (after build): `yarn start:prod`
- Format source/tests: `yarn format`
- Lint TypeScript (fixes applied): `yarn lint`

## Tests (Jest)
- Unit tests: `yarn test`
- Watch a single test file: `yarn test -- test/app.controller.spec.ts`
- Filter by test name: `yarn test -- --testNamePattern "<regex>"`
- Coverage: `yarn test:cov`
- E2E tests: `yarn test:e2e` (config at `test/jest-e2e.json`)

## Local services
- Bring up Postgres, Redis, and Kafka for local dev: `docker compose up -d`
- Stop services: `docker compose down`
- Current mapped ports: Postgres `5555`, Redis `6379`, Kafka `9092`
## Architecture snapshot
- App is organized as a modular monolith in NestJS. `src/app.module.ts` composes infra modules (`PrismaModule`, `RedisModule`, `KafkaModule`, `OutboxModule`) and domain modules (`Organizations`, `Events`, `Reservations`, `Payments`, `Tickets`, `Realtime`) plus `WorkersModule`.
- System intent (from `SRS.md` + `Folder_structure.txt`): Postgres as source of truth, Redis for realtime fanout, Kafka for async domain events, Outbox pattern for reliable DB→Kafka publishing, scheduled/worker flows for reservation expiry and consumer processing.
- Concurrency & reliability goals: Postgres as source of truth; Outbox → Kafka; reservations enforce optimistic locking + idempotency keys; webhooks/consumers must be idempotent; SSE is UX-only with Redis fanout.
- Environment expectations (from SRS Appendix C): requires env vars like `DATABASE_URL`, `REDIS_URL`, `KAFKA_BROKERS`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`, `NODE_ENV`. Keep them in `.env`/`.env.example` when added.

## SOLID + DI/provider conventions
- Keep controllers thin: only transport concerns (DTOs, auth decorators, status codes). Put business rules in services/use-cases.
- Depend on abstractions, not concrete infra classes. Use provider tokens/interfaces for external systems (payment gateway, cache, broker, clock, id generator, repositories).
- Register concrete implementations in module `providers` and inject via constructor.
- Export services/providers from a module only when other modules must consume them; otherwise keep them private to the module.
- For swappable integrations (especially `payments/providers`), expose an interface token and bind one implementation (e.g., Stripe) in the module, so implementations can be replaced without changing service logic.
