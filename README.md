# Ticket Booking Backend

Production-ready modular monolith backend for a multi-tenant ticketing system.

Built with NestJS, Prisma, PostgreSQL, Redis, and Kafka using an outbox-driven event architecture.

## Tech Stack

- Runtime: Node.js, NestJS 11, TypeScript
- Database: PostgreSQL (source of truth)
- ORM: Prisma
- Realtime: Redis Pub/Sub + SSE
- Event backbone: Kafka (KRaft) + Outbox pattern
- Scheduling/workers: `@nestjs/schedule`
- Validation/config: `class-validator`, `@nestjs/config`

## System Architecture

- API process serves REST + SSE.
- PostgreSQL stores all transactional state.
- Redis handles fanout/rate-limit primitives.
- Outbox table stores domain events in the same DB transaction as state changes.
- Outbox publisher worker reliably publishes outbox events to Kafka.
- Kafka consumers process async domain flows (for example payment success -> ticket finalization).

## Core Modules

- `src/modules/iam`: authentication and authorization (RBAC + policy guard integration)
- `src/modules/organizations`: organization and membership management
- `src/modules/events`: event management and inventory access
- `src/modules/reservations`: concurrency-safe seat reservation with TTL
- `src/modules/payments`: payment creation + idempotent webhook processing
- `src/modules/tickets`: payment success finalization and ticket issuance flow
- `src/modules/realtime`: SSE stream + Redis-backed seat update fanout
- `src/modules/health`: live/ready/alerts endpoints

Infra modules:
- `src/infra/prisma`
- `src/infra/redis`
- `src/infra/kafka`
- `src/infra/outbox`

Workers:
- `src/workers/outbox-publisher.worker.ts`
- `src/workers/reservation-expiry.worker.ts`
- `src/workers/payment-succeeded.consumer.worker.ts`

## Reliability and Concurrency

- Postgres is the correctness boundary.
- Seat reservation uses optimistic checks with bounded fallback locking logic in repository flow.
- Reservation TTL expiry worker releases seats safely.
- Payment webhook processing is idempotent.
- Outbox guarantees DB -> Kafka publish reliability.
- Kafka consumers are retry-safe and DLQ-aware.

## Observability and Operations

- Structured application logs with correlation context.
- Metrics endpoint: `GET /metrics` (Prometheus exposition format).
- Health endpoints:
  - `GET /health/live`
  - `GET /health/ready`
  - `GET /health/alerts`
- Alert rules evaluate readiness and metric-derived thresholds (outbox failure ratio, webhook failure ratio, DLQ/retry growth).

## API Response Envelope

Global response structure is enforced through common interceptors/filters:

- Success: `{ "success": true, "message": "...", "data": ..., "meta"?: ... }`
- Error: `{ "success": false, "message": "...", "errors"?: ..., "meta"?: ... }`

SSE (`text/event-stream`) and `/metrics` are intentionally not wrapped.

## Local Development

## Prerequisites

- Node.js 20+ (recommended LTS)
- Yarn 1.x
- Docker Desktop

## 1) Install dependencies

```bash
yarn install
```

## 2) Configure environment

Create `.env` from `.env.example` and set values for your machine.

Minimum required app values:
- `DATABASE_URL`
- `REDIS_URL`
- `KAFKA_BROKERS`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `PORT`
- `NODE_ENV`

## 3) Start local infrastructure

```bash
docker compose up -d
```

Default service ports in this repo:
- Postgres: `5555`
- Redis: `6379`
- Kafka: configured through `.env` (`KAFKA_PORT`)

## 4) Start app

```bash
yarn start:dev
```

## 5) Build production bundle

```bash
yarn build
yarn start:prod
```

## Useful Commands

- Lint: `yarn lint`
- Format: `yarn format`
- Unit tests: `yarn test`
- Coverage: `yarn test:cov`
- E2E tests: `yarn test:e2e`

## Kafka Notes (Important)

- The app now ensures required topics at startup (idempotent), including:
  - `reservation.created`
  - `reservation.expired`
  - `payment.succeeded`
  - `payment.failed`
  - `payment.succeeded.dlq`
- If Kafka host ports are blocked on Windows, choose a non-excluded host port and set:
  - `.env` -> `KAFKA_PORT=<safe_port>`
  - `.env` -> `KAFKA_BROKERS=localhost:<safe_port>`
- Recreate Kafka after listener changes:

```bash
docker compose down -v
docker compose up -d kafka
```

## Health and Readiness Semantics

- `live`: process is up.
- `ready`: dependencies + worker readiness checks pass.
- `alerts`: warning/critical operational rule evaluation.
- `ready` and `alerts` return HTTP `503` when critical conditions are active.

## Project Structure

- `src/common`: cross-cutting concerns (guards, decorators, interceptors, filters, helpers)
- `src/config`: environment mapping and validation
- `src/infra`: infrastructure adapters/providers
- `src/modules`: domain modules
- `src/workers`: scheduled and consumer workers
- `prisma`: schema and migrations

## Security and Auth

- JWT authentication for protected endpoints.
- Role and policy-based authorization in guards/decorators.
- Payment webhook signature verification path supported by provider abstraction.
- Rate limit guard in place for critical endpoints.

## Status

Current implementation includes end-to-end reservation/payment/ticket flows, Redis SSE fanout, Kafka outbox publishing, consumer retries/DLQ, metrics, health/readiness/alerts, and production hardening slices aligned with `SRS.md`.
