import { AppConfigService } from '../config/app-config.service';
import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [AppConfigService, RedisService],
  exports: [AppConfigService, RedisService],
})
export class RedisModule {}

