import { Injectable } from '@nestjs/common';
import { CreateSessionDto } from './dto/create-session.dto';

@Injectable()
export class SessionsService {
  async getSession(sessionId: string) {
    return {
      sessionId,
      message: 'Sessions module scaffolded.',
    };
  }

  async createSession(dto: CreateSessionDto) {
    return {
      message: 'Session creation scaffolded.',
      payload: dto,
    };
  }
}
