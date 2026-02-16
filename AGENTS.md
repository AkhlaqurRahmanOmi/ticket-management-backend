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
- System intent (from `SRS.md` + `Folder_structure.txt`): Postgres as source of truth, Redis for realtime fanout, Kafka for async domain events, Outbox pattern for reliable DB->Kafka publishing, scheduled/worker flows for reservation expiry and consumer processing.
- Concurrency and reliability goals: Postgres as source of truth; Outbox -> Kafka; reservations enforce optimistic locking + idempotency keys; webhooks/consumers must be idempotent; SSE is UX-only with Redis fanout.
- Environment expectations (from SRS Appendix C): requires env vars like `DATABASE_URL`, `REDIS_URL`, `KAFKA_BROKERS`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`, `NODE_ENV`. Keep them in `.env`/`.env.example` when added.

## Common + config module conventions
- Reusable, cross-cutting code belongs in `src/common` (guards, interceptors, filters, decorators, pipes, shared DTO helpers, constants, error utilities).
- Environment loading, validation, and typed app settings belong in `src/config`.
- Keep domain/business rules inside feature modules under `src/modules`; `common` and `config` should not absorb domain-specific logic.
- Prefer typed config access over direct `process.env` usage in services/controllers.
- When adding new env variables, update both config validation/schema and `.env.example`.

## Response structure + filtering rules
- Use a global response structure from `src/common` (for example via interceptor/filter) so success/error payloads stay consistent.
- Standard API envelope shape:
  - Success: `{ "success": true, "message": string, "data": any, "meta"?: object }`
  - Error: `{ "success": false, "message": string, "errors"?: any, "meta"?: object }`
- Field usage rules:
  - `success`: required boolean for every response.
  - `message`: required short human-readable summary.
  - `data`: only for successful responses; include filtered payload only.
  - `meta`: optional request/pagination/timestamp details only.
  - `errors`: only for failed responses; validation or domain error details.
- Apply response filtering to include only required fields and metadata; avoid leaking internal objects (ORM internals, stack traces, secret config).
- When implementing or changing response structure logic, limit edits to necessary files first:
  - Primary scope: `src/common` response/filter/interceptor files and `src/config` if behavior is environment-driven.
  - Secondary scope: only the specific controller/service/DTO files impacted by that response change.
- Do not refactor unrelated modules while changing response structure.
- Add/update focused tests only for affected behavior (unit/e2e as needed).

## SOLID + DI/provider conventions
- Keep controllers thin: only transport concerns (DTOs, auth decorators, status codes). Put business rules in services/use-cases.
- Depend on abstractions, not concrete infra classes. Use provider tokens/interfaces for external systems (payment gateway, cache, broker, clock, id generator, repositories).
- Register concrete implementations in module `providers` and inject via constructor.
- Export services/providers from a module only when other modules must consume them; otherwise keep them private to the module.
- For swappable integrations (especially `payments/providers`), expose an interface token and bind one implementation (e.g., Stripe) in the module, so implementations can be replaced without changing service logic.

## OOP + folder structure enforcement
- Follow OOP strictly: encapsulate domain behavior in classes/services, keep single responsibility per class, prefer composition over inheritance except for shared infra abstractions (for example base repository).
- Follow repository folder structure strictly; do not place files in arbitrary locations.
- Group files by module and file type. Use dedicated subfolders where applicable:
  - `dto/` for request/response DTOs
  - `providers/` for concrete provider implementations
  - `contracts/` (or `interfaces/`) for abstractions/tokens-facing contracts
  - `repositories/` for persistence classes
  - `policies/` for policy handlers/guards integrations
  - `types/` for module-local types
  - `constants/` for module constants/tokens
- If a module grows, split by domain concern under that module while preserving the file-type grouping.
- New code must align with both `Folder_structure.txt` and current module boundaries before introducing new folders/files.

