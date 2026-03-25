import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get(':sessionId')
  async getSession(@Param('sessionId') sessionId: string) {
    return this.sessionsService.getSession(sessionId);
  }

  @Post()
  async createSession(@Body() dto: CreateSessionDto) {
    return this.sessionsService.createSession(dto);
  }
}
