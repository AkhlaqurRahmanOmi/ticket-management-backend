import {
  Controller,
  MessageEvent,
  Param,
  ParseUUIDPipe,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { RateLimit } from '@/common/decorators/rate-limit.decorator';
import { RateLimitGuard } from '@/common/guards/rate-limit.guard';
import { RealtimeService } from './realtime.service';

@Controller('events')
export class RealtimeController {
  constructor(private readonly realtimeService: RealtimeService) {}

  @Sse(':eventId/stream')
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 30, windowSeconds: 60, keyPrefix: 'realtime:sse' })
  streamEventSeats(
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): Observable<MessageEvent> {
    return this.realtimeService.streamEventSeats(eventId);
  }
}
