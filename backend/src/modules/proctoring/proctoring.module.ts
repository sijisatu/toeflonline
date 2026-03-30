import { Module } from '@nestjs/common';
import { ProctoringController } from './proctoring.controller';
import { ProctoringGateway } from './proctoring.gateway';
import { ProctoringService } from './proctoring.service';

@Module({
  controllers: [ProctoringController],
  providers: [ProctoringService, ProctoringGateway],
})
export class ProctoringModule {}
