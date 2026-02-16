import { Injectable } from '@nestjs/common';

@Injectable()
export class ReservationsService {
  getReservation(reservationId: string) {
    return {
      reservationId,
      message: 'Reservation read authorization passed.',
    };
  }
}
