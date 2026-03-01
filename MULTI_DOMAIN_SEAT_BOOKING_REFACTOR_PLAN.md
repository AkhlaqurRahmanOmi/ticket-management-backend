# Multi-Domain Seat Booking Refactor Plan

## Goal

Refactor the current event-centric backend into a modular monolith that supports:

- one shared seat-booking core
- one active domain per deployment at runtime
- optional client-specific business logic overlays
- attachable and detachable modules without corrupting core business logic

Target runtime examples:

- `BOOKING_DOMAIN=event` + `CLIENT_PROFILE=acme_events`
- `BOOKING_DOMAIN=air` + `CLIENT_PROFILE=skyjet`
- `BOOKING_DOMAIN=rail` + `CLIENT_PROFILE=railpro`
- `BOOKING_DOMAIN=event` + `CLIENT_PROFILE=default`

## Architectural Target

The final system should have 4 layers:

1. Core kernel
   - booking lifecycle
   - payment lifecycle
   - issuance
   - IAM
   - organization/tenant
   - health/metrics/outbox/realtime contracts
2. Domain pack
   - `events`
   - `air`
   - `rail`
3. Client pack
   - domain-specific overrides per customer
4. Composition root
   - loads one domain and one client profile at startup

Core rule:

- no client-specific `if/else` inside core services
- no domain-specific assumptions in core booking state transitions

Default rule:

- client customization is optional
- if no client-specific logic exists, the app must run with the default client pack
- every client extension point must have a default implementation

## Phase Order

1. Runtime composition and configuration extraction
2. Reservation -> booking kernel refactor
3. Payment -> booking finalization refactor
4. Ticket issuance refactor
5. Event domain isolation
6. Client customization layer
7. Rail domain add
8. Air domain add
9. Cleanup and removal of deprecated event-only code

## Phase 1

This is the first execution phase. It creates the runtime architecture without deleting working business flows immediately.

### Objectives

- add domain selection by config
- add client profile selection by config
- introduce domain contracts/tokens
- keep the existing event flow running during the transition
- isolate current event module behind domain-runtime composition

### Existing Files To Modify

#### `src/app.module.ts`

Modify:

- convert from static import list into a composition root
- stop directly treating `EventsModule`, `ReservationsModule`, `TicketsModule`, and `RealtimeModule` as permanent global business modules
- add `DomainRuntimeModule` and `ClientRuntimeModule`

Planned function/class changes:

- keep `AppModule`
- change `imports` to:
  - always-loaded core modules
  - runtime-loaded domain module
  - runtime-loaded client module

Notes:

- do not remove existing modules from the repo in Phase 1
- only change how they are wired

#### `src/config/env.ts`

Modify:

- add env keys:
  - `BOOKING_DOMAIN`
  - `CLIENT_PROFILE`

#### `src/config/configuration.ts`

Modify:

- add config mapping:
  - `app.bookingDomain`
  - `app.clientProfile`

#### `src/config/env.schema.ts`

Modify:

- validate:
  - `BOOKING_DOMAIN` in `event|rail|air`
  - `CLIENT_PROFILE` is non-empty when provided

#### `.env.example`

Modify:

- document:
  - `BOOKING_DOMAIN=event`
  - `CLIENT_PROFILE=default`

#### `prisma/schema.prisma`

Modify early in Phase 1:

- prepare Prisma transition groundwork before deeper runtime and module refactors
- keep current event tables intact
- add only additive schema direction needed for the migration path

Rules:

- no destructive rename or removal in Phase 1
- do not break current event flow persistence in Phase 1
- full `Booking`-centric replacement still happens later

#### `src/infra/kafka/kafka/kafka.service.ts`

Modify:

- remove hardcoded assumption that only current event-ish topics exist
- add support for topic registration driven by domain/client registries

Planned changes:

- replace `requiredTopics` constant with registry-driven aggregation
- keep producer/consumer implementation

#### `src/modules/health/providers/health.provider.ts`

Modify:

- include active domain and client profile in readiness details
- later use domain runtime status in health output

#### `src/modules/events/events.module.ts`

Modify:

- keep module operational
- prepare it to become `events` domain implementation
- reduce direct app-level assumptions

#### `src/modules/reservations/reservations.module.ts`

Modify:

- keep operational in Phase 1
- mark as transitional event-booking flow until `bookings` kernel replaces it

#### `src/modules/tickets/tickets.module.ts`

Modify:

- keep operational in Phase 1
- prepare to export generic finalization providers later

#### `src/modules/realtime/realtime.module.ts`

Modify:

- keep event SSE flow intact
- prepare it to implement a domain-scoped realtime provider

### New Files To Add

#### `src/modules/domain-runtime/domain-runtime.module.ts`

Purpose:

- runtime selector for active domain pack

Responsibilities:

- read `app.bookingDomain`
- bind domain contracts
- import only the selected domain module

#### `src/modules/domain-runtime/domain-runtime.service.ts`

Purpose:

- expose active domain metadata to other modules

Functions:

- `getActiveDomain()`
- `isDomain(domain: BookingDomain)`

#### `src/modules/domain-runtime/domain.types.ts`

Purpose:

- shared domain union types

Content:

- `BookingDomain = 'event' | 'rail' | 'air'`

#### `src/modules/domain-runtime/domain.tokens.ts`

Purpose:

- DI tokens for domain-level contracts

Tokens:

- `SEAT_SEARCH_PROVIDER`
- `INVENTORY_PROVIDER`
- `BOOKING_FINALIZER`
- `ISSUANCE_PROVIDER`
- `REALTIME_PROVIDER`
- `DOMAIN_TOPIC_REGISTRY`

#### `src/modules/client-runtime/client-runtime.module.ts`

Purpose:

- runtime selector for client customization pack

Responsibilities:

- read `app.clientProfile`
- bind default or client-specific overrides

#### `src/modules/client-runtime/client-runtime.service.ts`

Purpose:

- expose active client profile metadata

Functions:

- `getClientProfile()`

#### `src/modules/client-runtime/client.tokens.ts`

Purpose:

- DI tokens for client-specific policies

Tokens:

- `BOOKING_RULES`
- `PRICING_POLICY`
- `PASSENGER_POLICY`
- `CANCELLATION_POLICY`
- `NOTIFICATION_POLICY`

#### `src/modules/domains/events/events-domain.module.ts`

Purpose:

- wrap current event implementation behind domain-runtime

Responsibilities:

- import current event-specific modules
- provide event implementations for domain contracts

#### `src/modules/clients/default/default-client.module.ts`

Purpose:

- base client behavior with no overrides

Responsibilities:

- default pricing/rules/policies
- guaranteed fallback when a client has no custom business logic

### Default Client Fallback Behavior

This behavior is mandatory.

If a deployment does not require any custom client logic:

- set `CLIENT_PROFILE=default`
- load the selected domain pack
- load the default client pack
- use only default policies and rules

This means the system must work in all of these cases:

- domain only, no custom client logic
- domain plus one custom client pack
- same domain reused by multiple clients with different overrides

The default client pack must provide implementations for:

- `BOOKING_RULES`
- `PRICING_POLICY`
- `PASSENGER_POLICY`
- `CANCELLATION_POLICY`
- `NOTIFICATION_POLICY`

Rules for fallback:

- core modules must never require a client-specific module to exist
- client runtime must resolve to `default` when no custom profile is selected
- custom client packs override only the contracts they need
- any contract not overridden must continue using the default implementation

### Files To Delete

Delete now:

- none

Delete later after migration:

- direct app-level business wiring that bypasses domain runtime
- old event-specific reservation core once `bookings` kernel is complete

### Phase 1 Result

At the end of Phase 1:

- app can start with `BOOKING_DOMAIN`
- app can start with `CLIENT_PROFILE`
- current event flow still works
- no major business logic has been rewritten yet
- new extension points exist for future domains and clients

## Phase 2

Refactor reservation logic into a seat-booking kernel.

### Existing Files To Modify

#### `src/modules/reservations/reservations.service.ts`

Modify:

- split event-specific reservation logic from generic booking hold lifecycle

#### `src/modules/reservations/reservations.repository.ts`

Modify:

- stop treating `eventSeatId` as the permanent core concept
- extract generic hold creation contract

#### `src/workers/reservation-expiry.worker.ts`

Modify:

- convert to generic booking hold expiry worker

### New Files To Add

#### `src/modules/bookings/bookings.module.ts`

Purpose:

- new seat-booking kernel

#### `src/modules/bookings/bookings.controller.ts`

Routes:

- `POST /bookings`
- `GET /bookings/:bookingId`
- `POST /bookings/:bookingId/cancel`

#### `src/modules/bookings/bookings.service.ts`

Functions:

- `createBookingHold()`
- `getBooking()`
- `cancelBooking()`
- `processExpiredBookings()`

#### `src/modules/bookings/bookings.repository.ts`

Functions:

- `createHold()`
- `findBookingById()`
- `findByUserAndIdempotencyKey()`
- `expireBookingAndReleaseInventory()`

#### `src/modules/bookings/dto/create-booking.dto.ts`

Purpose:

- generic booking request DTO

Expected shape:

- `inventoryItems`
- `passengers`
- `idempotencyKey`

### Files To Delete

Delete later:

- `src/modules/reservations/dto/create-reservation.dto.ts`
- event-only reservation assumptions after event domain adapter is finished

## Phase 3

Refactor payments to target generic bookings instead of event reservations.

### Existing Files To Modify

#### `src/modules/payments/payments.service.ts`

Modify:

- use `bookingId` instead of `reservationId`
- delegate finalization to `BOOKING_FINALIZER`

#### `src/modules/payments/payments.repository.ts`

Modify:

- load payment target from booking tables
- keep idempotent webhook processing

#### `src/workers/payment-succeeded.consumer.worker.ts`

Modify:

- call generic booking finalizer provider

### New Files To Add

#### `src/modules/payments/interface/booking-finalizer.interface.ts`

Purpose:

- generic finalization contract

Functions:

- `finalizePaymentSucceeded(input)`

### Files To Delete

Delete later:

- direct event-only finalization assumptions in payment success path

## Phase 4

Refactor ticket generation into generic issuance.

### Existing Files To Modify

#### `src/modules/tickets/tickets.service.ts`

Modify:

- split read model and issuance orchestration

#### `src/modules/tickets/tickets.repository.ts`

Modify:

- move domain-specific ticket issuance rules out

### New Files To Add

#### `src/modules/issuance/issuance.module.ts`

#### `src/modules/issuance/issuance.service.ts`

Functions:

- `issueDocuments()`
- `getIssuedDocument()`

#### `src/modules/issuance/issuance.repository.ts`

#### `src/modules/issuance/issued-document.types.ts`

Purpose:

- support:
  - event ticket
  - rail ticket
  - airline e-ticket/PNR

### Files To Delete

Delete later:

- event-only ticket issuance logic from current tickets finalizer

## Phase 5

Isolate current event business logic as a proper domain pack.

### Existing Files To Modify

#### `src/modules/events/*`

Modify:

- keep event catalog/admin/search logic here
- remove cross-domain assumptions from shared services

#### `src/modules/realtime/*`

Modify:

- keep event SSE as event-domain implementation of realtime provider

### New Files To Add

#### `src/modules/domains/events/providers/event-inventory.provider.ts`

Functions:

- `searchSeats()`
- `holdSeats()`
- `releaseSeats()`
- `confirmSeats()`

#### `src/modules/domains/events/providers/event-booking-finalizer.provider.ts`

#### `src/modules/domains/events/providers/event-realtime.provider.ts`

### Files To Delete

Delete later:

- any event-specific logic that remains inside core bookings/payments/issuance

## Phase 6

Add client customization without touching core business logic.

### New Files To Add

#### `src/modules/clients/default/*`

Purpose:

- default no-op policies

#### `src/modules/clients/<client-code>/*`

Purpose:

- isolated customer-specific overrides

Examples:

- `acme-events-pricing.policy.ts`
- `skyjet-passenger.policy.ts`
- `railpro-cancellation.policy.ts`

### Rules

- client packs may override:
  - validation rules
  - pricing rules
  - cancellation rules
  - notification formatting
  - issuance metadata
- client packs may not override:
  - DB concurrency guarantees
  - payment idempotency
  - booking state machine safety

### Example Deployment Modes

- `BOOKING_DOMAIN=event`, `CLIENT_PROFILE=default`
  - event booking with no client-specific customization
- `BOOKING_DOMAIN=event`, `CLIENT_PROFILE=acme_events`
  - same event domain with custom pricing and cancellation logic
- `BOOKING_DOMAIN=air`, `CLIENT_PROFILE=default`
  - air booking with only core and domain behavior
- `BOOKING_DOMAIN=air`, `CLIENT_PROFILE=skyjet`
  - air booking with passenger-field and ticket-format overrides

## Phase 7

Add rail domain.

### New Files To Add

#### `src/modules/domains/rail/rail-domain.module.ts`

#### `src/modules/domains/rail/rail-search.controller.ts`

#### `src/modules/domains/rail/rail.service.ts`

#### `src/modules/domains/rail/rail.repository.ts`

#### `src/modules/domains/rail/providers/rail-inventory.provider.ts`

#### `src/modules/domains/rail/providers/rail-booking-finalizer.provider.ts`

### Persistence Additions

- `Station`
- `Train`
- `Trip`
- `Coach`
- `TripSeat`
- `TripSegment`
- `RailInventory`

## Phase 8

Add air domain.

### New Files To Add

#### `src/modules/domains/air/air-domain.module.ts`

#### `src/modules/domains/air/air-search.controller.ts`

#### `src/modules/domains/air/air.service.ts`

#### `src/modules/domains/air/air.repository.ts`

#### `src/modules/domains/air/providers/air-inventory.provider.ts`

#### `src/modules/domains/air/providers/air-booking-finalizer.provider.ts`

### Persistence Additions

- `Airport`
- `Carrier`
- `Flight`
- `FlightSegment`
- `CabinInventory`
- `FareClass`
- `AirInventory`

## Persistence Refactor Strategy

Do not rewrite everything in one migration.

### Step 1

Keep current event tables alive.

### Step 2

Add core tables:

- `Booking`
- `BookingItem`
- `Passenger`
- `IssuedDocument`

### Step 3

Migrate event booking flow from:

- `Reservation`
- `ReservationItem`

to:

- `Booking`
- `BookingItem`

### Step 4

After stable migration, deprecate old event-only reservation core.

## Anti-Corruption Rules

These rules protect the core:

- core modules cannot import client modules directly
- core modules depend only on provider interfaces/tokens
- domain modules implement contracts
- client modules decorate or replace contracts
- no client-specific branching inside `bookings`, `payments`, or `issuance`

## N+1 Safety Notes

Likely hotspots:

- booking details with items, passengers, payments, documents
- rail search with segment and fare loading
- air search with segment and fare-class loading
- client-specific policies triggering per-item reads

Protection strategy:

- use `include` or explicit joins for booking details
- batch inventory reads by ids using `WHERE id IN (...)`
- keep pagination in DB
- avoid service loops that call repositories per item

Expected query targets:

- booking detail: 1-2 queries
- event seat map: 1 query plus pagination/count only when needed
- rail or air search: 1 main query + 1 batched enrichment query
- payment finalization: 1 transactional workflow with batched reads

## Execution Checklist

### Immediate

- add runtime domain config
- add runtime client config
- add runtime modules and contracts
- keep event flow alive

### Next

- create `bookings` kernel
- switch payments to booking-based finalization
- create issuance module

### Later

- isolate event domain
- add client packs
- add rail domain
- add air domain
- remove deprecated event-only reservation core

## Definition Of Done

The architecture refactor is complete when:

- one deployment can run `event` only
- one deployment can run `rail` only
- one deployment can run `air` only
- each deployment can load a client-specific policy pack
- core booking/payment/issuance logic remains unchanged across clients
- deprecated event-only core paths are removed

