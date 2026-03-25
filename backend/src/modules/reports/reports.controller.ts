import { Controller, Get, Param, Post } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('overview')
  async overview() {
    return this.reportsService.overview();
  }

  @Post('calculate/:sessionId')
  async calculate(@Param('sessionId') sessionId: string) {
    return this.reportsService.calculateScore(sessionId);
  }
}
