# Task Execution Plan

This file is the execution tracker for `MULTI_DOMAIN_SEAT_BOOKING_REFACTOR_PLAN.md`.

## Execution Rules

1. Do not rewrite the whole system in one pass.
2. Do not delete event-flow code before the replacement path is implemented and verified.
3. After each completed task, run the dev server and check for startup/runtime errors before marking the task done.
4. If the dev server fails for the current task, record the blocker under that task and do not mark it complete.
5. Prefer additive composition first, destructive cleanup later.
6. Core modules must not import client-specific modules directly.
7. Client-specific logic is optional. `CLIENT_PROFILE=default` must always work.

## Verification Rule After Each Task

Run after every completed task:

```bash
yarn start:dev
```

Verification checklist:

- app boots successfully
- config validation passes
- no DI resolution error at startup
- no new TypeScript/Nest module wiring error appears in boot logs
- stop the server after verification and record the result in this file

Suggested task result format:

- Status: `done` | `blocked` | `in_progress`
- Dev server check: `pass` | `fail` | `not_run`
- Notes: short summary or blocker

## Current Status

- Overall status: `in_progress`
- Active phase: `Phase 1`
- Active domain during migration: `event`
- Default client profile during migration: `default`

## Phase 1: Runtime Composition And Config Extraction

Goal: add runtime domain/client composition without breaking the current event flow.

### Task 1.1 Add domain and client config keys

Status: `done`
Dev server check: `pass`

Notes:

- Added `BOOKING_DOMAIN` and `CLIENT_PROFILE` to config mapping and env validation.
- Documented `CLIENT_PROFILE=default` in `.env.example`.
- Dev server boot was verified by the user with no startup errors.

Files to modify:

- `src/config/env.ts`
- `src/config/configuration.ts`
- `src/config/env.schema.ts`
- `.env.example`

Work:

- add `BOOKING_DOMAIN`
- add `CLIENT_PROFILE`
- validate allowed booking domains
- make `CLIENT_PROFILE=default` the documented fallback

Acceptance criteria:

- app config exposes `app.bookingDomain`
- app config exposes `app.clientProfile`
- invalid domain values fail fast
- default client behavior is documented

### Task 1.2 Add Prisma transition groundwork

Status: `done`
Dev server check: `pass`

Notes:

- Added additive Prisma groundwork in `prisma/schema.prisma` using `BookingDomain` and domain tagging on transitional commerce models.
- Kept current event-first tables and relations intact; no destructive rename or removal was introduced.
- `npx prisma validate` passed.
- Dev server boot was verified by the user with no startup errors.

Files to modify:

- `prisma/schema.prisma`

Files to add later in this task if needed:

- new Prisma migration files

Work:

- define the transition boundary between current event-specific tables and future core booking tables
- add only additive Prisma groundwork needed for the migration path
- do not remove or rename current event tables in this task
- do not break current event flow models in this task

Acceptance criteria:

- Prisma transition direction is reflected in schema work without destructive replacement
- current event models remain usable
- future `Booking`-centric migration is unblocked

### Task 1.3 Add domain runtime contracts and metadata

Status: `done`
Dev server check: `pass`

Notes:

- Added `src/modules/domain-runtime/domain.types.ts` with typed booking domains and shared domain metadata.
- Added `src/modules/domain-runtime/domain.tokens.ts` with future-facing domain DI tokens and active-domain metadata tokens.
- Added `src/modules/domain-runtime/domain-runtime.service.ts` and `src/modules/domain-runtime/domain-runtime.module.ts` to expose active domain metadata through DI.
- Wired `DomainRuntimeModule` into `src/app.module.ts` without moving any existing business logic.
- Dev server boot was verified by the user with no startup errors.

Files to add:

- `src/modules/domain-runtime/domain.types.ts`
- `src/modules/domain-runtime/domain.tokens.ts`
- `src/modules/domain-runtime/domain-runtime.service.ts`
- `src/modules/domain-runtime/domain-runtime.module.ts`

Work:

- define booking domain types
- define domain provider tokens
- expose active domain via service
- keep implementation minimal and additive

Acceptance criteria:

- runtime domain metadata can be injected
- no business logic moved yet
- selected domain is readable through DI

### Task 1.4 Add client runtime contracts and metadata

Status: `done`
Dev server check: `pass`

Notes:

- Added `src/modules/client-runtime/client.tokens.ts` with active-client tokens and future-facing client policy tokens.
- Added `src/modules/client-runtime/client-runtime.service.ts` with config-backed `CLIENT_PROFILE` resolution and `default` fallback.
- Added `src/modules/client-runtime/client-runtime.module.ts` to expose active client metadata through DI.
- Wired `ClientRuntimeModule` into `src/app.module.ts` without adding any client-specific business logic yet.
- Dev server boot was verified by the user with no startup errors.

Files to add:

- `src/modules/client-runtime/client.tokens.ts`
- `src/modules/client-runtime/client-runtime.service.ts`
- `src/modules/client-runtime/client-runtime.module.ts`

Work:

- define client policy tokens
- expose active client profile via service
- make runtime default to `default`

Acceptance criteria:

- runtime client metadata can be injected
- app can resolve `default` client profile without custom logic

### Task 1.5 Add default client pack

Status: `done`
Dev server check: `pass`

Notes:

- Added `src/modules/clients/default/default-client.module.ts` to bind all client-policy tokens through a guaranteed fallback pack.
- Added default providers for booking rules, pricing policy, passenger policy, cancellation policy, and notification policy.
- Updated `src/modules/client-runtime/client-runtime.module.ts` to import and export the default client pack so core modules can resolve fallback policies without custom client logic.
- Dev server boot was verified by the user with no startup errors.

Files to add:

- `src/modules/clients/default/default-client.module.ts`
- `src/modules/clients/default/providers/default-booking-rules.provider.ts`
- `src/modules/clients/default/providers/default-pricing-policy.provider.ts`
- `src/modules/clients/default/providers/default-passenger-policy.provider.ts`
- `src/modules/clients/default/providers/default-cancellation-policy.provider.ts`
- `src/modules/clients/default/providers/default-notification-policy.provider.ts`

Work:

- provide no-op or base implementations for all client extension points
- ensure partial client overrides are possible later

Acceptance criteria:

- system runs with no custom client pack
- all client tokens resolve through `default` implementations

### Task 1.6 Wrap the existing event system as a domain pack

Status: `done`
Dev server check: `pass`

Notes:

- Added `src/modules/domains/events/events-domain.module.ts` as a thin event-domain wrapper over the existing event, reservation, ticket, and realtime modules.
- Bound transitional domain tokens to current event-flow services so later phases can consume them through DI without moving business logic yet.
- Updated `src/modules/events/events.module.ts` to export `EventsService` for domain-pack composition.
- Kept existing event endpoints and service flow intact.
- Dev server boot was verified by the user with no startup errors.

Files to add:

- `src/modules/domains/events/events-domain.module.ts`

Files to modify:

- `src/modules/events/events.module.ts`
- `src/modules/reservations/reservations.module.ts`
- `src/modules/tickets/tickets.module.ts`
- `src/modules/realtime/realtime.module.ts`

Work:

- create a domain module wrapper for the current event flow
- keep current event modules operational
- prepare provider bindings for later core extraction

Acceptance criteria:

- current event flow remains bootable
- event domain can be imported via runtime composition

### Task 1.7 Refactor `AppModule` into a composition root

Status: `done`
Dev server check: `pass`

Notes:

- Refactored `src/app.module.ts` so always-on core modules stay direct while domain-specific modules are selected through a small composition resolver.
- Replaced direct app-level imports of event-specific modules with `EventsDomainModule` as the active Phase 1 domain pack.
- Added explicit startup failure for unsupported `BOOKING_DOMAIN` values whose domain packs are not wired yet.
- Dev server boot was verified by the user with no startup errors.

Files to modify:

- `src/app.module.ts`

Work:

- import always-on core modules
- import `DomainRuntimeModule`
- import `ClientRuntimeModule`
- stop assuming event modules are always the permanent application shape

Acceptance criteria:

- app boots with `BOOKING_DOMAIN=event`
- app boots with `CLIENT_PROFILE=default`
- no existing event endpoints are unintentionally removed in Phase 1

### Task 1.8 Make Kafka topic registration domain-aware

Status: `done`
Dev server check: `pass`

Notes:

- Added `src/modules/domain-runtime/domain-topic-registry.interface.ts` as the contract for domain-provided Kafka topics.
- Updated `src/modules/domains/events/events-domain.module.ts` to expose the event-domain topic registry through `DOMAIN_TOPIC_REGISTRY`.
- Updated `src/infra/kafka/kafka/kafka.service.ts` to resolve the active domain topic registry via `ModuleRef` and merge it with core required topics.
- Kept the producer and consumer flow intact while removing the event-only topic assumption from Kafka startup.
- Dev server boot was verified by the user with no startup errors.

Files to modify:

- `src/infra/kafka/kafka/kafka.service.ts`

Files to add if needed:

- `src/modules/domain-runtime/domain-topic-registry.interface.ts`

Work:

- replace hardcoded required topic assumptions with domain-provided topic registration
- keep producer and consumer behavior intact

Acceptance criteria:

- topic list can come from active domain pack
- current event topics still work

### Task 1.9 Add active domain/client info to health visibility

Status: `done`
Dev server check: `pass`

Notes:

- Updated `src/modules/health/providers/health.provider.ts` to inject runtime metadata services.
- Added a non-blocking `runtime.composition` readiness check that exposes active booking domain, inventory model, client profile, and default-client status.
- Kept existing health semantics intact by reporting runtime composition as visibility metadata rather than a new failure source.
- Dev server boot was verified by the user with no startup errors.

Files to modify:

- `src/modules/health/providers/health.provider.ts`

Work:

- include active domain and client profile in readiness details
- prepare health visibility for future runtime composition debugging

Acceptance criteria:

- readiness output exposes domain/client metadata
- no change to existing health semantics

### Task 1.10 Phase 1 stabilization and review

Status: `pending`
Dev server check: `not_run`

Work:

- run app with `BOOKING_DOMAIN=event`
- run app with `CLIENT_PROFILE=default`
- verify Nest module resolution and basic startup logs
- update this file with any Phase 1 blockers

Acceptance criteria:

- Phase 1 runtime composition is stable
- current event flow still boots
- no client-specific logic is required to run the app

## Phase 2: Reservation To Booking Kernel Refactor

Goal: introduce a seat-booking core without deleting the event flow immediately.

### Task 2.1 Add booking kernel module skeleton

Status: `planned`
Dev server check: `not_run`

Files to add:

- `src/modules/bookings/bookings.module.ts`
- `src/modules/bookings/bookings.controller.ts`
- `src/modules/bookings/bookings.service.ts`
- `src/modules/bookings/bookings.repository.ts`
- `src/modules/bookings/dto/create-booking.dto.ts`

### Task 2.2 Extract generic hold lifecycle from reservations

Status: `planned`
Dev server check: `not_run`

Files to modify:

- `src/modules/reservations/reservations.service.ts`
- `src/modules/reservations/reservations.repository.ts`
- `src/workers/reservation-expiry.worker.ts`

### Task 2.3 Add booking persistence tables

Status: `planned`
Dev server check: `not_run`

Files to modify:

- `prisma/schema.prisma`
- new Prisma migration files

Tables to add:

- `Booking`
- `BookingItem`
- `Passenger`
- `IssuedDocument` later or in Phase 4 depending on migration strategy

## Phase 3: Payments To Booking Finalization

### Task 3.1 Change payment target from reservation to booking

Status: `planned`
Dev server check: `not_run`

Files to modify:

- `src/modules/payments/payments.service.ts`
- `src/modules/payments/payments.repository.ts`

### Task 3.2 Add generic booking finalizer contract

Status: `planned`
Dev server check: `not_run`

Files to add:

- `src/modules/payments/interface/booking-finalizer.interface.ts`

### Task 3.3 Update payment success consumer to use finalizer contract

Status: `planned`
Dev server check: `not_run`

Files to modify:

- `src/workers/payment-succeeded.consumer.worker.ts`

## Phase 4: Ticketing To Generic Issuance

### Task 4.1 Add issuance module skeleton

Status: `planned`
Dev server check: `not_run`

Files to add:

- `src/modules/issuance/issuance.module.ts`
- `src/modules/issuance/issuance.service.ts`
- `src/modules/issuance/issuance.repository.ts`
- `src/modules/issuance/issued-document.types.ts`

### Task 4.2 Remove event-only issuance logic from shared finalization path

Status: `planned`
Dev server check: `not_run`

Files to modify:

- `src/modules/tickets/tickets.service.ts`
- `src/modules/tickets/tickets.repository.ts`

## Phase 5: Event Domain Isolation

### Task 5.1 Move event inventory/finalization behind providers

Status: `planned`
Dev server check: `not_run`

Files to add:

- `src/modules/domains/events/providers/event-inventory.provider.ts`
- `src/modules/domains/events/providers/event-booking-finalizer.provider.ts`
- `src/modules/domains/events/providers/event-realtime.provider.ts`

### Task 5.2 Remove remaining event assumptions from core modules

Status: `planned`
Dev server check: `not_run`

## Phase 6: Client Customization Layer

### Task 6.1 Add first real client pack example

Status: `planned`
Dev server check: `not_run`

Files to add:

- `src/modules/clients/<client-code>/*`

### Task 6.2 Support partial override composition

Status: `planned`
Dev server check: `not_run`

Work:

- allow client packs to override only selected policies
- ensure all other policies still resolve from `default`

## Phase 7: Rail Domain

### Task 7.1 Add rail domain module and inventory provider

Status: `planned`
Dev server check: `not_run`

### Task 7.2 Add rail persistence model and search APIs

Status: `planned`
Dev server check: `not_run`

## Phase 8: Air Domain

### Task 8.1 Add air domain module and inventory provider

Status: `planned`
Dev server check: `not_run`

### Task 8.2 Add air persistence model and search APIs

Status: `planned`
Dev server check: `not_run`

## Cleanup Phase

### Task 9.1 Remove deprecated event-only reservation core

Status: `planned`
Dev server check: `not_run`

Files to delete later:

- legacy reservation DTOs and event-only flow pieces once fully replaced

### Task 9.2 Remove direct app wiring that bypasses runtime composition

Status: `planned`
Dev server check: `not_run`

## Working Notes

- Start implementation from `Phase 1`, `Task 1.1`, then `Task 1.2` before runtime wiring gets deeper
- Do not start schema replacement before runtime composition exists
- Do not start rail or air before event domain isolation is stable
- Update this file after every task completion












