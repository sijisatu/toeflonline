import { Controller, Get } from '@nestjs/common';
import { DatabaseService } from '../shared/database/database.service';
import { RedisService } from '../shared/redis/redis.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly database: DatabaseService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  async check() {
    await this.database.ping();
    await this.redis.ping();

    return {
      status: 'ok',
      database: 'connected',
      redis: 'connected',
      timestamp: new Date().toISOString(),
    };
  }
}
