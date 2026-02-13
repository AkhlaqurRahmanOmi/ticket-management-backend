# Ticketing Backend — Phase-wise SRS (Software Requirements Specification)

**Project:** Ticketing System Backend  
**Tech Stack:** NestJS, Prisma, PostgreSQL, Redis, Kafka, SSE, Pino, Joi, class-validator  
**AuthZ Model:** RBAC + ACL (Organization Membership) with Policy Guards (PBAC-ready)  
**Architecture:** Modular Monolith + Event-Driven Backbone (Outbox → Kafka)  
**Version:** 1.0  
**Date:** 2026-02-12

---

## 1. Purpose

Build a backend ticketing system that supports:
- Multi-tenant organizers (Organizations)
- Event creation and seat inventory
- High-concurrency reservations without double-booking
- Payment tracking with idempotent webhooks
- Ticket issuing after payment success
- Real-time seat updates via SSE
- Event-driven processing using Kafka with reliable publishing via Outbox

---

## 2. Scope

### In Scope
- IAM (AuthN + AuthZ): user registration/login, roles, org membership, policies
- Organizations, Events, Seats
- Reservations with TTL and safe concurrency handling
- Payment lifecycle (create intent, webhook updates)
- Ticket issuing after payment success (async consumer)
- Outbox publisher worker
- Expiry worker to release seats
- SSE endpoint for event seat updates
- Logging/observability basics

### Out of Scope (v1)
- Full seat-map graphical layout/venue builder
- Dynamic pricing, promo codes
- Refund automation (can be manual in v1)
- Fraud detection
- Full event sourcing (we use events, but state is stored in Postgres)
- Mobile push notifications

---

## 3. Definitions & Glossary

- **Org (Organization):** Tenant grouping for event organizers.
- **RBAC:** Role-based access control (e.g., ORG_ADMIN).
- **ACL:** Access control list, implemented via org membership mapping.
- **Policy:** A check that validates access to a resource (PBAC-ready).
- **Seat:** A unit of inventory.
- **Reservation:** Temporary hold on a seat with expiry.
- **Ticket/Order:** Final purchased entitlement.
- **Outbox:** DB table storing events to reliably publish to Kafka.
- **SSE:** Server-Sent Events stream for real-time updates.

---

## 4. Stakeholders & Users

### Actors
1. **USER** (customer): browse events, reserve seat, pay, view tickets
2. **ORG_STAFF**: manage events, seat inventory, view reservations/tickets in org
3. **ORG_ADMIN**: all staff permissions + manage org settings/members
4. **SUPPORT** (optional): read-only + manual interventions
5. **SUPER_ADMIN** (optional): platform-wide admin

---

## 5. Goals & Success Metrics

### Goals
- **No double booking** under high concurrency
- Payment webhook processing is **idempotent**
- Seat reservation TTL prevents seats being stuck in RESERVED
- Real-time updates improve seat map UX

### Metrics
- Reservation success rate vs conflict rate
- Average reserve latency
- Outbox pending count (should not grow unbounded)
- Kafka consumer lag
- Expired reservations processed per minute

---

## 6. System Overview

### High-level Components
- **API Process:** REST endpoints + SSE stream
- **Postgres:** source of truth for seats/reservations/payments/tickets/outbox
- **Redis:** pub/sub for realtime fanout, optional cache/rate-limit
- **Kafka:** async event bus for payments/tickets/notifications/read-models
- **Workers:**
    - Outbox Publisher
    - Reservation Expiry Worker
    - Kafka Consumers Worker (tickets module consumers)

---

## 7. Authorization Requirements (RBAC + ACL)

### 7.1 Roles
- `USER`
- `ORG_STAFF`
- `ORG_ADMIN`
- `SUPPORT` (optional)
- `SUPER_ADMIN` (optional)

### 7.2 ACL via Organization Membership
- A user has membership in an org with a role (`OrganizationMember`).
- An event belongs to an org (`Event.orgId`).
- Permissions for event management are granted if user is a member of the owning org and has an appropriate org role.

### 7.3 Policy-based Access
Policy guards enforce rules like:
- `Event:Manage`: user is ORG_ADMIN/ORG_STAFF **AND** member of event.orgId
- `Reservation:Read`: reservation belongs to user OR user is staff in event’s org
- `Ticket:Read`: ticket belongs to user OR user is staff in event’s org

---

## 8. Data Model Requirements (Conceptual)

### Entities
- **User:** identity and auth
- **Organization:** tenant
- **OrganizationMember:** membership and role in org
- **Event:** owned by org
- **Seat:** inventory (status, reservedUntil, version)
- **Reservation:** hold (expiresAt, status, idempotencyKey)
- **Payment:** payment records (providerRef unique)
- **Ticket/Order:** issued entitlement
- **OutboxEvent:** reliable event publishing

### Statuses
- `SeatStatus`: AVAILABLE | RESERVED | SOLD
- `ReservationStatus`: ACTIVE | CONFIRMED | EXPIRED | CANCELLED
- `PaymentStatus`: PENDING | SUCCEEDED | FAILED | REFUNDED

---

## 9. Eventing Requirements (Kafka + Outbox)

### 9.1 Topics (Minimum)
- `reservation.created`
- `reservation.expired`
- `reservation.cancelled` (optional v1)
- `payment.succeeded`
- `payment.failed`
- `ticket.issued` / `seat.sold`

### 9.2 Event Metadata (Required)
All events must include:
- `eventId` (domain event id, not concert id)
- `occurredAt` (ISO)
- `version` (schema version)
- `correlationId` (request id / trace id)
- `actor` (userId or system)

### 9.3 Idempotency
Consumers must be idempotent:
- Reprocessing the same event must not duplicate tickets or change state incorrectly.

### 9.4 Outbox
- Domain actions write to Postgres and insert `OutboxEvent` in the same transaction.
- Outbox worker publishes to Kafka and marks SENT.
- On Kafka failures, outbox retries with backoff.

---

## 10. Real-time Requirements (SSE + Redis Pub/Sub)

### 10.1 SSE Endpoint
- `GET /events/:eventId/stream`
- Must send:
    - initial `snapshot` of seat statuses
    - subsequent `seat.updated` events
    - periodic `heartbeat`

### 10.2 Redis Fanout
- When seat changes, publish to `realtime:event:{eventId}`
- All API instances subscribe and forward to SSE clients.

### 10.3 Correctness Note
Real-time is UX only; correctness is enforced by Postgres concurrency control.

---

## 11. API Requirements (High level)

### 11.1 Auth
- `POST /auth/register`
- `POST /auth/login`

### 11.2 Organizations
- `POST /orgs` (ORG_ADMIN or SUPER_ADMIN)
- `POST /orgs/:orgId/members` (ORG_ADMIN)

### 11.3 Events & Seats
- `POST /events` (ORG_STAFF/ORG_ADMIN)
- `PATCH /events/:eventId` (ORG_STAFF/ORG_ADMIN)
- `GET /events/:eventId/seats` (public or authenticated depending on product)

### 11.4 Reservations
- `POST /reservations` (USER)
- `GET /reservations/:reservationId` (owner or org staff)
- `POST /reservations/:reservationId/cancel` (owner or org staff) — optional

### 11.5 Payments
- `POST /payments` (USER)
- `POST /payments/webhook` (provider → system)

### 11.6 Tickets
- `GET /tickets/:ticketId` (owner or org staff)
- `GET /me/tickets` (USER)

---

## 12. Non-Functional Requirements (NFR)

### 12.1 Performance
- Reserve seat endpoint must be optimized for high contention:
    - Target p95 latency < 250ms (local env target; production depends on infra)
- Seat map reads should be cacheable (optional v1)

### 12.2 Reliability
- No seat sold twice under concurrent requests
- Outbox ensures no lost events between DB and Kafka
- Webhooks are idempotent and safe to retry

### 12.3 Security
- JWT-based authentication
- RBAC + ACL enforced on sensitive endpoints
- Webhook endpoint validates provider signature (if supported)
- Rate limiting on reserve/payment endpoints

### 12.4 Observability
- Pino structured logs in JSON
- Correlation/request IDs in logs
- Error logs contain resource ids (reservationId/seatId/eventId)

---

# Phase-wise Requirements

## Phase 0 — Project Setup & Baseline
### Objectives
- Base NestJS project with Prisma, Postgres, Redis, Kafka connectivity
- Joi env validation
- Pino logging setup
- DTO validation via class-validator

### Deliverables
- `.env.example` and `docker-compose.yml`
- `src/infra/*` initialized
- Global validation pipe enabled
- Health endpoints

### Acceptance Criteria
- App boots successfully using `.env`
- Prisma can connect and run migrations
- Redis and Kafka clients can connect
- Logs are structured JSON via Pino

---

## Phase 1 — IAM (AuthN + RBAC + ACL)
### Functional Requirements
- User register/login
- Create organizations
- Add members with roles
- Guards:
    - JWT auth guard
    - Roles guard
    - Policy guard for resource-level ACL checks

### Acceptance Criteria
- USER can register/login and receive JWT
- ORG_ADMIN can add ORG_STAFF members
- ORG_STAFF cannot add members
- Access to org-owned resources is denied without membership

---

## Phase 2 — Events & Seats
### Functional Requirements
- Create and manage events (ORG_STAFF/ORG_ADMIN)
- Create seat inventory for an event (seed or API)
- Query seat map for an event

### Acceptance Criteria
- Only org members can manage org’s events
- Seat map returns seat status + price + seatNo
- Seat uniqueness enforced (eventId + seatNo)

---

## Phase 3 — Reservations (Concurrency-safe)
### Functional Requirements
- `POST /reservations` holds a seat for TTL (e.g., 5 minutes)
- Must prevent double reservation/sale using Postgres concurrency control:
    - Optimistic locking with `Seat.version`
    - Conditional update requiring AVAILABLE or expired RESERVED

- Reservation idempotency via `idempotencyKey`

### Acceptance Criteria
- Under 50 concurrent reserve requests for same seat, only 1 succeeds
- Retry with same idempotencyKey returns same reservation
- Reservation includes `expiresAt`

---

## Phase 4 — Expiry Worker (Release Seats)
### Functional Requirements
- Scheduled worker finds expired ACTIVE reservations
- Marks them EXPIRED
- Releases seats back to AVAILABLE if appropriate
- Emits events (outbox) and realtime update

### Acceptance Criteria
- Reservation automatically expires after TTL
- Seat returns to AVAILABLE after expiry
- Worker is idempotent (safe on retries)

---

## Phase 5 — Payments (Idempotent Webhooks)
### Functional Requirements
- `POST /payments` creates payment record (PENDING) for reservation
- Webhook endpoint updates Payment:
    - SUCCEEDED → emit `payment.succeeded`
    - FAILED → emit `payment.failed`
- Unique constraint `(provider, providerRef)` prevents duplicates

### Acceptance Criteria
- Duplicate webhook calls do not produce duplicate payment rows
- Payment cannot be created for EXPIRED reservation
- Webhook is verified (signature) if provider supports

---

## Phase 6 — Tickets & Finalization (Kafka Consumer)
### Functional Requirements
- Consumer processes `payment.succeeded`
- In a transaction:
    - Confirm reservation (ACTIVE → CONFIRMED)
    - Seat RESERVED → SOLD
    - Create Ticket/Order
    - Emit `ticket.issued`

### Acceptance Criteria
- Processing event twice does not create duplicate tickets
- Seat becomes SOLD after payment success
- Confirm fails safely if reservation expired (business rule: manual action/refund)

---

## Phase 7 — Outbox Publisher (DB → Kafka Reliability)
### Functional Requirements
- Worker publishes all PENDING outbox events to Kafka
- Marks SENT on success
- Retries with backoff on failure

### Acceptance Criteria
- Kafka outage does not lose events
- When Kafka recovers, outbox drains successfully
- No duplicate publish side effects (consumer idempotency still required)

---

## Phase 8 — SSE Realtime Updates
### Functional Requirements
- SSE stream per event:
    - sends snapshot on connect
    - pushes seat updates from Redis pub/sub
    - includes heartbeat
- Seat updates are published when:
    - reserved
    - expired/released
    - sold

### Acceptance Criteria
- Client receives seat changes without polling
- Works with multiple API instances (Redis fanout)
- Reconnect returns fresh snapshot

---

## Phase 9 — Production Hardening
### Functional Requirements
- Rate limiting for:
    - reserve endpoints
    - payments endpoints
    - SSE connections
- Kafka consumer retry/DLQ strategy
- Metrics-ready logging fields

### Acceptance Criteria
- Abusive traffic is throttled
- Consumer does not crash the whole process on poison messages
- Logs include correlationId and resource identifiers

---

## Appendices

## A) Business Rules Summary
- A seat can be RESERVED by only one ACTIVE reservation at a time.
- Reservations have TTL; expired reservations release seats.
- Payment success is required to issue tickets.
- Webhooks and consumers must be idempotent.

## B) Key Technical Rules
- Postgres is the source of truth; Redis is not used for correctness.
- Outbox is the required mechanism for reliable Kafka publishing.
- Real-time is UX only; DB locking controls correctness.

## C) Suggested Environment Variables
- DATABASE_URL
- REDIS_URL
- KAFKA_BROKERS
- JWT_SECRET
- JWT_EXPIRES_IN
- PORT
- NODE_ENV

---

## Phase Checklist (Quick)
- [ ] Phase 0: bootstrap + infra + logging
- [ ] Phase 1: IAM (RBAC+ACL)
- [ ] Phase 2: Events + Seats
- [ ] Phase 3: Reservations concurrency
- [ ] Phase 4: Expiry worker
- [ ] Phase 5: Payments + webhook
- [ ] Phase 6: Tickets consumer finalization
- [ ] Phase 7: Outbox publisher
- [ ] Phase 8: SSE realtime
- [ ] Phase 9: Hardening
