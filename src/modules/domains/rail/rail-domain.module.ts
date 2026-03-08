import { Module } from '@nestjs/common';
import {
  BOOKING_FINALIZER,
  DOMAIN_TOPIC_REGISTRY,
  INVENTORY_PROVIDER,
  ISSUANCE_PROVIDER,
  REALTIME_PROVIDER,
  SEAT_SEARCH_PROVIDER,
} from '@/modules/domain-runtime/domain.tokens';
import type { DomainTopicRegistry } from '@/modules/domain-runtime/domain-topic-registry.interface';
import { IssuanceModule } from '@/modules/issuance/issuance.module';
import { RailModule } from '@/modules/rail/rail.module';
import { RailBookingFinalizerProvider } from './providers/rail-booking-finalizer.provider';
import { RailInventoryProvider } from './providers/rail-inventory.provider';
import { RailIssuanceProvider } from './providers/rail-issuance.provider';
import { RailRealtimeProvider } from './providers/rail-realtime.provider';

const RAIL_DOMAIN_TOPICS = [
  'payment.succeeded',
  'payment.failed',
  'payment.succeeded.dlq',
  'ticket.issued',
] as const;

const railDomainTopicRegistry: DomainTopicRegistry = {
  getRequiredTopics: () => RAIL_DOMAIN_TOPICS,
};

@Module({
  imports: [RailModule, IssuanceModule],
  providers: [
    RailInventoryProvider,
    RailIssuanceProvider,
    RailBookingFinalizerProvider,
    RailRealtimeProvider,
    {
      provide: SEAT_SEARCH_PROVIDER,
      useExisting: RailInventoryProvider,
    },
    {
      provide: INVENTORY_PROVIDER,
      useExisting: RailInventoryProvider,
    },
    {
      provide: BOOKING_FINALIZER,
      useExisting: RailBookingFinalizerProvider,
    },
    {
      provide: ISSUANCE_PROVIDER,
      useExisting: RailIssuanceProvider,
    },
    {
      provide: REALTIME_PROVIDER,
      useExisting: RailRealtimeProvider,
    },
    {
      provide: DOMAIN_TOPIC_REGISTRY,
      useValue: railDomainTopicRegistry,
    },
  ],
  exports: [
    RailInventoryProvider,
    RailIssuanceProvider,
    RailBookingFinalizerProvider,
    RailRealtimeProvider,
    SEAT_SEARCH_PROVIDER,
    INVENTORY_PROVIDER,
    BOOKING_FINALIZER,
    ISSUANCE_PROVIDER,
    REALTIME_PROVIDER,
    DOMAIN_TOPIC_REGISTRY,
  ],
})
export class RailDomainModule {}
