import { Body, Controller, Post } from '@nestjs/common';
import { ProctoringService } from './proctoring.service';
import { ProctoringEventDto } from './dto/proctoring-event.dto';

@Controller('proctoring')
export class ProctoringController {
  constructor(private readonly proctoringService: ProctoringService) {}

  @Post('events')
  async logEvent(@Body() dto: ProctoringEventDto) {
    return this.proctoringService.logEvent(dto);
  }
}
