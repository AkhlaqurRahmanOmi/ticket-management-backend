import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DefaultClientModule } from '@/modules/clients/default/default-client.module';
import {
  ACTIVE_CLIENT_METADATA,
  ACTIVE_CLIENT_PROFILE,
} from './client.tokens';
import { ClientRuntimeService } from './client-runtime.service';

@Global()
@Module({
  imports: [ConfigModule, DefaultClientModule],
  providers: [
    ClientRuntimeService,
    {
      provide: ACTIVE_CLIENT_PROFILE,
      useFactory: (clientRuntimeService: ClientRuntimeService) =>
        clientRuntimeService.getClientProfile(),
      inject: [ClientRuntimeService],
    },
    {
      provide: ACTIVE_CLIENT_METADATA,
      useFactory: (clientRuntimeService: ClientRuntimeService) =>
        clientRuntimeService.getClientProfileMetadata(),
      inject: [ClientRuntimeService],
    },
  ],
  exports: [
    ClientRuntimeService,
    ACTIVE_CLIENT_PROFILE,
    ACTIVE_CLIENT_METADATA,
    DefaultClientModule,
  ],
})
export class ClientRuntimeModule {}
