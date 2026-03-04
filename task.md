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

- Status: `done`` | `blocked` | `in_progress`
- Dev server check: `pass`` | `fail` | `not_run`
- Notes: short summary or blocker

## Current Status

- Overall status: `done`
- Active phase: `Completed`
- Active domain during migration: `event`
- Default client profile during migration: `default`

## Phase 1: Runtime Composition And Config Extraction

Goal: add runtime domain/client composition without breaking the current event flow.

### Task 1.1 Add domain and client config keys

Status: `done``
Dev server check: `pass``

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

Status: `done``
Dev server check: `pass``

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

Status: `done``
Dev server check: `pass``

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

Status: `done``
Dev server check: `pass``

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

Status: `done``
Dev server check: `pass``

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

Status: `done``
Dev server check: `pass``

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

Status: `done``
Dev server check: `pass``

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

Status: `done``
Dev server check: `pass``

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

Status: `done``
Dev server check: `pass``

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

Status: `done``
Dev server check: `pass``

Notes:

- Verified the Phase 1 runtime composition wiring is present end-to-end for `BOOKING_DOMAIN=event` and `CLIENT_PROFILE=default`.
- `npx prisma validate` passed during the stabilization review.
- No new Phase 1 blocker was identified from the composition, runtime-metadata, default-client, or Kafka-topic changes.
- Dev server boot was verified by the user with no startup errors.

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

Status: `done``
Dev server check: `pass``

Notes:

- Added the initial `bookings` module skeleton with controller, service, repository, and DTO structure under `src/modules/bookings`.
- Added `CreateBookingDto` as the future-facing booking input shape without moving reservation flow logic yet.
- Wired `BookingsModule` into `src/app.module.ts` so the kernel skeleton is part of the application boot path.
- Dev server boot was verified by the user with no startup errors.

Files to add:

- `src/modules/bookings/bookings.module.ts`
- `src/modules/bookings/bookings.controller.ts`
- `src/modules/bookings/bookings.service.ts`
- `src/modules/bookings/bookings.repository.ts`
- `src/modules/bookings/dto/create-booking.dto.ts`

### Task 2.2 Extract generic hold lifecycle from reservations

Status: `done``
Dev server check: `pass``

Notes:

- Moved the transitional event-seat hold persistence and expiry flow into `src/modules/bookings/bookings.repository.ts`.
- Expanded `src/modules/bookings/bookings.service.ts` so `bookings` now owns hold creation, hold lookup, and expiry processing for the current event flow.
- Updated `src/modules/reservations/reservations.service.ts` and `src/modules/reservations/reservations.repository.ts` to delegate to the `bookings` kernel instead of owning the lifecycle directly.
- Updated `src/workers/reservation-expiry.worker.ts` and `src/workers/workers.module.ts` to use `BookingsService` for expiry processing.
- Updated `src/modules/bookings/bookings.module.ts` and `src/modules/reservations/reservations.module.ts` for the new DI wiring.
- Batched releasable seat lookup/update during expiry inside `src/modules/bookings/bookings.repository.ts` to avoid per-seat persistence calls.
- Extracted reusable booking-hold types into `src/modules/bookings/types/booking-hold.types.ts` so module contracts are not buried inside service/repository files.
- Dev server boot was verified by the user with no startup errors.

Files to modify:

- `src/modules/bookings/bookings.service.ts`
- `src/modules/bookings/bookings.repository.ts`
- `src/modules/bookings/bookings.module.ts`
- `src/modules/bookings/types/booking-hold.types.ts`
- `src/modules/reservations/reservations.service.ts`
- `src/modules/reservations/reservations.repository.ts`
- `src/modules/reservations/reservations.module.ts`
- `src/workers/reservation-expiry.worker.ts`
- `src/workers/workers.module.ts`

### Task 2.3 Add booking persistence tables

Status: `done``
Dev server check: `pass``

Notes:

- Added additive booking-kernel persistence models in `prisma/schema.prisma`: `Booking`, `BookingItem`, and `Passenger`.
- Added Prisma enums for the new kernel tables: `BookingStatus`, `BookingItemStatus`, and `PassengerType`.
- Added `prisma/migrations/20260302051148_adding_booking_kernel/migration.sql` to keep the schema change committed and reproducible.
- Kept the current event-first reservation/order/payment flow intact; no destructive changes were made to existing commerce tables.
- `npx prisma validate` passed.
- Dev server boot was verified by the user with no startup errors.

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

Status: `done``
Dev server check: `pass``

Notes:

- Added transitional booking-target support to payments so payment creation now resolves the booking kernel first and uses `bookingId` as the primary target.
- Updated `src/modules/payments/dto/create-payment.dto.ts` and `src/modules/payments/interface/payment-provider.interface.ts` to move the payment contract toward `bookingId`, while keeping `reservationId` as a temporary fallback during migration.
- Updated `src/modules/payments/payments.service.ts`, `src/modules/payments/payments.repository.ts`, and `src/modules/payments/payments.module.ts` so the payment flow depends on `BookingsModule` and persists `bookingId` on `Payment`.
- Added transitional booking projection support in `src/modules/bookings/bookings.repository.ts` and `src/modules/bookings/bookings.service.ts` so event holds can be used as payment targets without deleting the legacy reservation flow.
- Moved repository-local payment types into `src/modules/payments/types/payment-repository.types.ts` and remaining booking repository row-shape types into `src/modules/bookings/types/booking-repository.types.ts`.
- Regenerated the Prisma client so `Payment.bookingId` is reflected in generated TypeScript types.
- `npx prisma validate` passed.
- `npx tsc -p tsconfig.json --noEmit --incremental false` passed.
- Dev server boot was verified by the user with no startup errors.

Files to modify:

- `src/modules/payments/payments.service.ts`
- `src/modules/payments/payments.repository.ts`

### Task 3.2 Add generic booking finalizer contract

Status: `done``
Dev server check: `pass``

Notes:

- Added `src/modules/payments/interface/booking-finalizer.interface.ts` as the shared payment-success finalization contract for the active domain.
- Added `src/modules/domains/events/providers/event-booking-finalizer.provider.ts` and wired `src/modules/domains/events/events-domain.module.ts` to resolve `BOOKING_FINALIZER` through the event domain pack.
- Kept the event domain as the active finalization implementation while removing the need for payment-success consumers to depend directly on ticketing internals.
- `npx prisma validate` passed.
- `npx tsc -p tsconfig.json --noEmit --incremental false` passed.
- Dev server boot was verified by the user with no startup errors.

Files to add:

- `src/modules/payments/interface/booking-finalizer.interface.ts`

### Task 3.3 Update payment success consumer to use finalizer contract

Status: `done``
Dev server check: `pass``

Notes:

- Updated `src/workers/payment-succeeded.consumer.worker.ts` to resolve the active-domain `BOOKING_FINALIZER` via DI instead of calling a ticket-specific payment consumer directly.
- Removed the old `src/modules/tickets/payment-succeeded.consumer.ts` path and updated module wiring so payment-success handling now flows through the generic finalizer contract.
- Updated `src/modules/tickets/tickets.service.ts` and `src/modules/tickets/tickets.repository.ts` so successful payment finalization also confirms the projected `Booking` and `BookingItem` rows.
- Dev server boot was verified by the user with no startup errors.

Files to modify:

- `src/workers/payment-succeeded.consumer.worker.ts`

## Phase 4: Ticketing To Generic Issuance

### Task 4.1 Add issuance module skeleton

Status: `done``
Dev server check: `pass``

Notes:

- Added `src/modules/issuance/issuance.module.ts`, `src/modules/issuance/issuance.service.ts`, and `src/modules/issuance/issuance.repository.ts` as the new core issuance boundary.
- Added `src/modules/issuance/types/issued-document.types.ts` with generic issued-document contracts and transitional ticket-backed projection types.
- Updated `src/modules/domains/events/events-domain.module.ts` so the active event domain now exposes `ISSUANCE_PROVIDER` through `IssuanceService` instead of ticket-specific method names.
- Wired `IssuanceModule` into `src/app.module.ts` as an always-on core module while keeping document issuance orchestration deferred to Phase 4.2.
- `npx tsc -p tsconfig.json --noEmit --incremental false` passed.
- Dev server boot was verified by the user with no startup errors.

Files to add:

- `src/modules/issuance/issuance.module.ts`
- `src/modules/issuance/issuance.service.ts`
- `src/modules/issuance/issuance.repository.ts`
- `src/modules/issuance/issued-document.types.ts`

### Task 4.2 Remove event-only issuance logic from shared finalization path

Status: `done``
Dev server check: `pass``

Notes:

- Moved the payment-success issuance transaction out of `src/modules/tickets/tickets.repository.ts` into `src/modules/issuance/issuance.repository.ts`.
- Updated `src/modules/issuance/issuance.service.ts` so `issueDocuments()` is now the shared payment-success issuance path.
- Updated `src/modules/domains/events/providers/event-booking-finalizer.provider.ts` to finalize event bookings through `IssuanceService` instead of ticketing internals.
- Reduced `src/modules/tickets/tickets.service.ts` and `src/modules/tickets/tickets.repository.ts` back to issued-ticket read-model responsibilities.
- `npx tsc -p tsconfig.json --noEmit --incremental false` passed.
- `npx prisma validate` passed.
- Dev server boot was verified by the user with no startup errors.

Files to modify:

- `src/modules/tickets/tickets.service.ts`
- `src/modules/tickets/tickets.repository.ts`

## Phase 5: Event Domain Isolation

### Task 5.1 Move event inventory/finalization behind providers

Status: `done``
Dev server check: `pass``

Notes:

- Added `src/modules/domains/events/providers/event-inventory.provider.ts` to encapsulate event seat search, seat sync, hold creation, hold lookup, and hold expiry behind the event domain pack.
- Kept `src/modules/domains/events/providers/event-booking-finalizer.provider.ts` as the event-domain finalization entrypoint, now sitting alongside the other concrete event providers.
- Added `src/modules/domains/events/providers/event-realtime.provider.ts` to encapsulate event seat-update publishing and streaming behind the event domain pack.
- Updated `src/modules/domains/events/events-domain.module.ts` to resolve `SEAT_SEARCH_PROVIDER`, `INVENTORY_PROVIDER`, `BOOKING_FINALIZER`, and `REALTIME_PROVIDER` through concrete event provider classes instead of inline module glue.
- `npx tsc -p tsconfig.json --noEmit --incremental false` passed.
- Dev server boot was verified by the user with no startup errors.

Files to add:

- `src/modules/domains/events/providers/event-inventory.provider.ts`
- `src/modules/domains/events/providers/event-booking-finalizer.provider.ts`
- `src/modules/domains/events/providers/event-realtime.provider.ts`

### Task 5.2 Remove remaining event assumptions from core modules

Status: `done``
Dev server check: `pass``

Notes:

- Renamed event-specific booking-kernel method and type names in `src/modules/bookings/*` to generic seat-booking names such as `createSeatHold(...)`, `getPaymentTarget(...)`, `CreateSeatHoldInput`, and `BookingPaymentTarget`.
- Updated shared payment finalization contracts in `src/modules/payments/interface/booking-finalizer.interface.ts` to use generic fields such as `inventoryScopeId`, `issuedDocumentIds`, and `affectedInventoryRefIds`.
- Updated `src/modules/issuance/*` to return generic issuance/finalization result fields while keeping the current event-domain behavior intact.
- Added `src/modules/domain-runtime/realtime-provider.interface.ts` and updated `src/workers/reservation-expiry.worker.ts` to resolve realtime behavior through `REALTIME_PROVIDER` instead of depending directly on `RealtimeService`.
- Removed the direct `RealtimeModule` dependency from `src/workers/workers.module.ts`.
- Updated `src/modules/reservations/*` and `src/modules/payments/payments.service.ts` to consume the renamed generic booking-kernel methods.
- Kept legacy event-specific outbox payload naming in the event flow for now; that cleanup remains a later behavioral refactor rather than a core-surface decoupling task.
- `npx tsc -p tsconfig.json --noEmit --incremental false` passed.
- Dev server boot was verified by the user with no startup errors.

## Phase 6: Client Customization Layer

### Task 6.1 Add first real client pack example

Status: `done``
Dev server check: `pass``

Notes:

- Added `src/modules/clients/acme-events/acme-events-client.module.ts` plus concrete override providers for booking rules, pricing policy, and notification policy.
- Refactored `src/modules/client-runtime/*` so client selection is runtime-driven and unresolved policies fall back to `default`.
- Updated `src/modules/bookings/bookings.service.ts` to resolve hold TTL from `BOOKING_RULES`, making the `acme-events` override affect a live core flow.
- Updated `src/modules/health/providers/health.provider.ts` to expose active client profile, override metadata, and default-client fallback visibility.
- Dev server boot was verified by the user with no startup errors.

### Task 6.2 Support partial override composition

Status: `done``
Dev server check: `pass``

Notes:

- Added `src/modules/client-runtime/interfaces/client-policy-override-registry.interface.ts` and `CLIENT_POLICY_OVERRIDE_REGISTRY` so client packs can declare only the policies they override.
- Updated `src/modules/client-runtime/client-runtime.module.ts` to resolve all client policy tokens through a shared partial-override fallback path instead of hardcoding per-policy client selection.
- Updated `src/modules/client-runtime/client-runtime.service.ts` so client metadata is derived from the active override registry at runtime.
- Updated `src/modules/clients/acme-events/acme-events-client.module.ts` to register only its override registry plus the concrete override providers.
- Kept non-overridden policies falling back to the default providers automatically.
- Fixed optional override-registry lookup so `CLIENT_PROFILE=default` does not fail startup when no custom registry is present.
- `npx tsc -p tsconfig.json --noEmit --incremental false` passed.
- Dev server boot was verified by the user with no startup errors.

Work:

- allow client packs to override only selected policies
- ensure all other policies still resolve from `default`

## Phase 7: Rail Domain

### Task 7.1 Add rail domain module and inventory provider

Status: `done``
Dev server check: `pass``

Notes:

- Added `src/modules/domains/rail/rail-domain.module.ts` as the first bootable rail domain pack.
- Added `src/modules/domains/rail/providers/rail-inventory.provider.ts` as the rail inventory/search/hold skeleton.
- Added `src/modules/domains/rail/providers/rail-issuance.provider.ts`, `src/modules/domains/rail/providers/rail-booking-finalizer.provider.ts`, and `src/modules/domains/rail/providers/rail-realtime.provider.ts` so the rail pack satisfies the full domain-runtime contract set.
- Wired `src/app.module.ts` so `BOOKING_DOMAIN=rail` now resolves `RailDomainModule` instead of failing startup.
- Kept the rail providers explicit about current status: the module boots cleanly, but rail seat search/holds/issuance are still not implemented and return clear skeleton behavior.
- `npx tsc -p tsconfig.json --noEmit --incremental false` passed.
- Dev server boot was verified with `BOOKING_DOMAIN=rail` on an alternate port, and the application started successfully.

### Task 7.2 Add rail persistence model and search APIs

Status: `done``
Dev server check: `pass``

Notes:

- Added additive rail inventory models in `prisma/schema.prisma`: `RailStation`, `RailTrip`, `RailCoach`, `RailSeat`, and `RailTripSeat`.
- Added `prisma/migrations/20260302143000_add_rail_domain_models/migration.sql` for the new rail persistence layer.
- Added the real rail feature module under `src/modules/rail` with controller, service, repository, DTOs, and reusable types.
- Added `GET /trips/search` and `GET /trips/:tripId/availability` backed by DB-level pagination and batched seat availability aggregation.
- Updated `src/modules/domains/rail/providers/rail-inventory.provider.ts` and `src/modules/domains/rail/rail-domain.module.ts` so the rail domain pack resolves seat-map reads through `RailService`.
- Query plan avoids N+1 by using one trip list query plus one grouped availability query for search results, and one paginated seat query for trip availability.
- `npx prisma validate` passed.
- `npx tsc -p tsconfig.json --noEmit --incremental false` passed.
- Dev server boot was verified by the user with no startup errors.

### Task 7.3 Add route and stop modeling for multi-stop rail trips

Status: `done``
Dev server check: `pass``

Notes:

- Added `RailRoute`, `RailRouteStop`, and `RailTripStop` to `prisma/schema.prisma`.
- Added `Organization.railRoutes` and `RailTrip.routeId` to link rail trips to route templates and explicit stop sequencing.
- Added the migration at `prisma/migrations/20260302091254_test/migration.sql` for the new route/stop schema.
- Kept existing rail search endpoints backward compatible while extending the persistence model.
- `npx prisma validate` passed.
- Dev server boot was verified by the user with no startup errors.

### Task 7.4 Make rail availability segment-aware

Status: `done``
Dev server check: `pass``

Notes:

- Updated `src/modules/rail/rail.repository.ts` to search trips by `RailTripStop` ordering rather than only `RailTrip.originStationId` and `RailTrip.destinationStationId`.
- Added requested boarding/drop segment support to `src/modules/rail/rail.service.ts` and `src/modules/rail/dto/get-rail-trip-availability.query.dto.ts`.
- Extended rail search result types with `requestedSegment` metadata in `src/modules/rail/types/rail-search.types.ts`.
- Added repository helper types in `src/modules/rail/types/rail-repository.types.ts` for stop-aware batched queries.
- Kept the query path batched with DB-level pagination and no per-trip seat lookup loop.
- `npx tsc -p tsconfig.json --noEmit --incremental false` passed.
- Dev server boot was verified by the user with no startup errors.

### Task 7.5 Add rail seat allocation and hold lifecycle

Status: `done``
Dev server check: `pass``

Notes:

- Added `RailSeatAllocation` in `prisma/schema.prisma` with the supporting booking, booking-item, trip, trip-seat, and stop relations, backed by `prisma/migrations/20260302094711_new_data_for_rail/migration.sql`.
- Added rail hold contracts in `src/modules/bookings/types/rail-booking-hold.types.ts` and expanded `src/modules/bookings/types/booking-repository.types.ts` for rail hold and expiry query shapes.
- Updated `src/modules/bookings/bookings.service.ts` and `src/modules/bookings/bookings.repository.ts` so the booking kernel now creates, reads, and expires rail holds using stop-range overlap checks and `RailSeatAllocation`.
- Updated `src/modules/rail/rail.controller.ts`, `src/modules/rail/rail.service.ts`, and `src/modules/rail/dto/create-rail-hold.dto.ts` to expose `POST /trips/:tripId/holds` and `GET /trips/holds/:holdId`.
- Updated `src/modules/rail/rail.repository.ts` so trip availability now reflects active overlapping rail allocations for the requested segment instead of only whole-trip `RailTripSeat.status`.
- Updated `src/modules/domains/rail/providers/rail-inventory.provider.ts` to use the real rail hold lifecycle instead of placeholder behavior.
- `npx tsc -p tsconfig.json --noEmit --incremental false` passed.
- `npx prisma validate` passed.
- Dev server boot was verified by the user with no startup errors.

### Task 7.6 Add rail payment finalization and issuance path

Status: `done``
Dev server check: `pass``

Notes:

- Added `RailIssuedDocument` in `prisma/schema.prisma` and committed the schema change through `prisma/migrations/20260302104528_rail_releted_documents/migration.sql`.
- Updated `src/modules/payments/*` and `src/modules/bookings/*` so payment creation/finalization now carries the booking `domainType`, allowing rail payments to remain rail-scoped instead of defaulting to event behavior.
- Updated `src/modules/issuance/issuance.service.ts`, `src/modules/issuance/issuance.repository.ts`, and `src/modules/issuance/types/issued-document.types.ts` so rail payment success now confirms the booking, confirms `RailSeatAllocation`, persists `RailIssuedDocument` rows, and exposes rail issued-document reads through the issuance boundary.
- Updated `src/modules/domains/rail/providers/rail-issuance.provider.ts` and `src/modules/domains/rail/providers/rail-booking-finalizer.provider.ts` so the rail domain now has a real finalization and issuance path instead of skeleton responses.
- Updated `src/modules/domains/rail/rail-domain.module.ts` to import `IssuanceModule` and register the rail-domain Kafka topics needed by the finalization flow.
- `npx tsc -p tsconfig.json --noEmit --incremental false` passed.
- `npx prisma validate` passed.
- Dev server boot was verified by the user with no startup errors.
## Phase 8: Air Domain

### Task 8.1 Add air domain module and inventory provider

Status: `done`
Dev server check: `pass`

Notes:

- Added `src/modules/domains/air-domain.module.ts` as the first bootable air domain pack, containing skeleton air inventory, issuance, finalizer, and realtime providers.
- Updated `src/app.module.ts` so `BOOKING_DOMAIN=air` now loads `AirDomainModule` instead of failing startup.
- Kept the air providers explicit about current status: the module boots cleanly, but air search, holds, and issuance remain skeleton behavior until the real feature module lands in Phase 8.2 and later.
- `npx tsc -p tsconfig.json --noEmit --incremental false` passed.
- Dev server boot was verified by the user with no startup errors.

Files to add:

- `src/modules/domains/air/air-domain.module.ts`
- `src/modules/domains/air/providers/air-inventory.provider.ts`
- `src/modules/domains/air/providers/air-issuance.provider.ts`
- `src/modules/domains/air/providers/air-booking-finalizer.provider.ts`
- `src/modules/domains/air/providers/air-realtime.provider.ts`

Files to modify:

- `src/app.module.ts`

Work:

- add the first bootable air domain pack
- make `BOOKING_DOMAIN=air` load `AirDomainModule`
- satisfy the full domain-runtime contract set for air
- keep the providers explicit about skeleton status until the real persistence/search flow lands

Acceptance criteria:

- app boots with `BOOKING_DOMAIN=air`
- `SEAT_SEARCH_PROVIDER`, `INVENTORY_PROVIDER`, `BOOKING_FINALIZER`, `ISSUANCE_PROVIDER`, and `REALTIME_PROVIDER` resolve for air
- no event or rail module is required for the air domain pack to boot

### Task 8.2 Add air persistence model and search APIs

Status: `done`
Dev server check: `pass`

Notes:

- Added the first air persistence layer in `prisma/schema.prisma` for `Airport`, `Carrier`, `FlightService`, `FlightInstance`, and `FlightCabinInventory`, backed by `prisma/migrations/20260303053126_air_domain/migration.sql`.
- Added the air feature module under `src/modules/air/*` with `GET /flights/search` and `GET /flights/:flightInstanceId/availability`.
- Implemented the search and availability query paths in `src/modules/air/air.repository.ts` with DB-level pagination and grouped inventory aggregation instead of per-flight lookup loops.
- Updated `src/modules/domains/air-domain.module.ts` so the air inventory provider now delegates availability reads to the real `AirService` instead of returning only skeleton behavior.
- `npx tsc -p tsconfig.json --noEmit --incremental false` passed.
- `npx prisma validate` passed.
- Dev server boot was verified by the user with no startup errors.

Files to modify:

- `prisma/schema.prisma`
- new Prisma migration files

Files to add:

- `src/modules/air/air.module.ts`
- `src/modules/air/air.controller.ts`
- `src/modules/air/air.service.ts`
- `src/modules/air/air.repository.ts`
- `src/modules/air/dto/*`
- `src/modules/air/types/*`

Work:

- add the first air persistence layer for airports, carriers, flight services, flight instances, and cabin/seat inventory
- add the air feature module with search and availability APIs
- wire the air domain inventory provider to the real air service instead of skeleton behavior
- keep query paths batched and DB-paginated

Acceptance criteria:

- air search endpoint returns flight instances for a requested origin, destination, and departure date
- air availability endpoint returns cabin/seat availability for one flight instance
- query plan avoids N+1 lookups for leg or inventory summaries
- Prisma schema and generated types remain valid

### Task 8.3 Add airport, service, and leg modeling for multi-leg flights

Status: `done`
Dev server check: `pass`

Notes:

- Added explicit leg modeling in `prisma/schema.prisma` with `FlightServiceLeg` and `FlightLegInstance`, backed by `prisma/migrations/20260303061725_air_domain_relations/migration.sql`.
- Updated `src/modules/air/air.repository.ts` so air search now resolves ordered `FlightLegInstance` ranges instead of assuming only direct origin/destination matching.
- Updated `src/modules/air/air.service.ts` and `src/modules/air/dto/get-flight-availability.query.dto.ts` so flight availability can validate optional leg-range input through `originCode` and `destinationCode`.
- Extended `src/modules/air/types/air-search.types.ts` and `src/modules/air/types/air-repository.types.ts` with leg summaries and requested-leg-range metadata for the API response surface.
- Kept cabin inventory on the flight-instance level for now; true leg-aware inventory math remains planned for `Task 8.4`.
- `npx tsc -p tsconfig.json --noEmit --incremental false` passed.
- `npx prisma validate` passed.
- Dev server boot was verified by the user with no startup errors.

Files to modify:

- `prisma/schema.prisma`
- new Prisma migration files
- `src/modules/air/air.repository.ts`
- `src/modules/air/air.service.ts`
- `src/modules/air/dto/*`

Work:

- add explicit airport/service/instance/leg modeling for air routes
- support one flight service having multiple dated instances
- support multi-leg or stop-based flights through ordered leg instances
- keep the air schema aligned with the agreed instance-based transport model

Acceptance criteria:

- one flight number can have multiple dated flight instances
- one flight instance can have one or more ordered legs
- air search and availability can target a leg range instead of assuming a single direct leg only

### Task 8.4 Make air availability leg-aware and cabin-aware

Status: `done`
Dev server check: `pass`

Notes:

- Updated `src/modules/air/air.repository.ts` so air search now supports DB-level `cabinCode` and `fareClassCode` filtering while preserving ordered leg-range matching.
- Updated `src/modules/air/air.service.ts` so flight availability always returns an effective requested leg range, defaulting to the full flight span when the caller does not specify a narrower leg range.
- Extended `src/modules/air/dto/search-flights.query.dto.ts` and `src/modules/air/types/air-search.types.ts` so the API now exposes the active air inventory model explicitly as cabin/fare-scoped with optional seat assignment.
- Kept air inventory at the cabin/fare level for this phase; per-seat assignment remains intentionally separate from the first-pass availability model.
- `npx tsc -p tsconfig.json --noEmit --incremental false` passed.
- `npx prisma validate` passed.
- Dev server boot was verified by the user with no startup errors.

Files to modify:

- `src/modules/air/air.repository.ts`
- `src/modules/air/air.service.ts`
- `src/modules/air/dto/*`
- `src/modules/air/types/*`

Work:

- make air availability aware of the requested leg range
- model availability primarily at cabin/fare inventory level
- keep optional seat assignment separate from the first-pass availability model
- expose requested leg metadata in air search and availability responses

Acceptance criteria:

- requested origin/destination is resolved to a valid leg range for the flight instance
- unavailable overlapping leg inventory is not shown as open inventory
- availability output is keyed by the requested leg range and cabin/fare data

### Task 8.5 Add air hold lifecycle

Status: `done`
Dev server check: `pass`

Notes:

- Added `AirCabinAllocation` in `prisma/schema.prisma` and wired the required booking, booking-item, flight-instance, cabin-inventory, and leg-instance relations for air hold persistence.
- Expanded `src/modules/bookings/*` with air hold contracts and repository/service flow so the booking kernel now creates, reads, and expires air cabin holds with overlap-aware leg-range checks.
- Added `POST /flights/:flightInstanceId/holds` and `GET /flights/holds/:holdId` through `src/modules/air/*`.
- Split the air data-access layer into a hybrid shape:
  - `src/modules/air/repositories/air-read.repository.ts` for search, leg resolution, and availability reads
  - `src/modules/bookings/bookings.repository.ts` for transaction-safe hold creation and expiry on source-of-truth tables
- Kept air inventory seat-assignment-optional by holding cabin/fare inventory over a requested leg range instead of forcing seat assignment in the first hold flow.
- Updated local Redis defaults in `.env`, `.env.example`, and `docker-compose.yml` from `6379` to `6380` so this project can boot beside another local Redis stack.
- `npx tsc -p tsconfig.json --noEmit --incremental false` passed.
- `npx prisma validate` passed.
- Dev server boot was verified by the user with no startup errors.

Files to modify:

- `prisma/schema.prisma`
- new Prisma migration files
- `src/modules/bookings/*`
- `src/modules/air/*`
- `src/modules/domains/air/providers/air-inventory.provider.ts`

Work:

- add the air hold model needed for flight-instance and leg-aware booking holds
- create air hold logic through the shared booking kernel
- release expired air holds cleanly through the existing expiry worker flow
- keep seat assignment optional so the first air hold flow can work at cabin/fare level if needed

Acceptance criteria:

- air holds can be created against the requested flight instance and leg range
- expired air holds release inventory safely
- the shared booking kernel can target air inventory without rail or event assumptions

### Task 8.6 Add air payment finalization and issuance path

Status: `done`
Dev server check: `pass`

Notes:

- Added `AirIssuedDocument` in `prisma/schema.prisma` and committed the schema change through `prisma/migrations/20260304080629_air_ticketing_update/migration.sql`.
- Updated `src/modules/issuance/issuance.service.ts`, `src/modules/issuance/issuance.repository.ts`, and `src/modules/issuance/types/issued-document.types.ts` so air payment success now confirms the booking, confirms `AirCabinAllocation`, persists `AirIssuedDocument` rows, and exposes air issued-document reads through the issuance boundary.
- Updated `src/modules/domains/air-domain.module.ts` so the air issuance provider and booking finalizer now use the real issuance path instead of skeleton responses.
- Kept the hybrid split intact:
  - `src/modules/air/repositories/air-read.repository.ts` for search and availability reads
  - `src/modules/issuance/issuance.repository.ts` for transactional payment finalization and document issuance
- Fixed the Nest runtime class-order issue in `src/modules/domains/air-domain.module.ts` by moving `AirRealtimeProvider` above `AirBookingFinalizerProvider`.
- `npx tsc -p tsconfig.json --noEmit --incremental false` passed.
- `npx prisma validate` passed.
- Dev server boot was verified by the user with no startup errors.

Files to modify:

- `src/modules/domains/air/providers/air-booking-finalizer.provider.ts`
- `src/modules/domains/air/providers/air-issuance.provider.ts`
- `src/modules/issuance/*`
- `src/modules/air/*`
- `prisma/schema.prisma`
- new Prisma migration files

Work:

- confirm air bookings after payment success
- persist issued air travel documents such as e-ticket or booking reference records
- expose air issued-document reads through the issuance boundary
- keep air finalization isolated behind the domain provider contract

Acceptance criteria:

- successful air payment confirms the booking
- issued air documents can be retrieved through the issuance boundary
- air finalization does not depend on event-specific or rail-specific order/ticket tables

## Cleanup Phase

### Task 9.1 Remove deprecated event-only reservation core

Status: `done`
Dev server check: `pass`

Notes:

- Moved the event reservation HTTP/service adapter into `src/modules/events/*` through:
  - `src/modules/events/event-reservations.controller.ts`
  - `src/modules/events/event-reservations.service.ts`
  - `src/modules/events/dto/create-event-reservation.dto.ts`
- Updated `src/modules/events/events.module.ts` so the event domain now owns its reservation adapter directly.
- Updated `src/modules/domains/events/providers/event-inventory.provider.ts` and `src/modules/domains/events/events-domain.module.ts` so the event domain no longer depends on the deprecated `ReservationsModule`.
- Deleted the event-only wrapper layer under `src/modules/reservations/*`.
- Added `RedisModule` to `src/modules/events/events.module.ts` after the move so `RateLimitGuard` can resolve `RedisService` in the new module context.
- `npx tsc -p tsconfig.json --noEmit --incremental false` passed.
- `npx prisma validate` passed.
- Dev server boot was verified by the user with no startup errors.

Files to delete later:

- legacy reservation DTOs and event-only flow pieces once fully replaced

### Task 9.2 Remove direct app wiring that bypasses runtime composition

Status: `done`
Dev server check: `pass`

Notes:

- Reviewed `src/app.module.ts` and confirmed the application root now loads core modules directly and selects domain modules only through `resolveDomainModules()`.
- No remaining app-root imports were found that bypass runtime composition for `event`, `rail`, or `air`.
- Kept always-on core modules such as `WorkersModule`, `HealthModule`, `PaymentsModule`, `BookingsModule`, and infra modules in place because they are part of the shared kernel rather than domain bypasses.
- No code change was required for this task beyond the existing composition-root refactor.
- Dev server boot was verified by the user with no startup errors.

## Working Notes

- Start implementation from `Phase 1`, `Task 1.1`, then `Task 1.2` before runtime wiring gets deeper
- Do not start schema replacement before runtime composition exists
- Do not start rail or air before event domain isolation is stable
- Update this file after every task completion




























