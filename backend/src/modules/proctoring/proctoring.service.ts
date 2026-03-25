import { Injectable } from '@nestjs/common';
import { ProctoringEventDto } from './dto/proctoring-event.dto';

@Injectable()
export class ProctoringService {
  async logEvent(dto: ProctoringEventDto) {
    return {
      message: 'Proctoring event scaffolded.',
      event: dto,
    };
  }
}
