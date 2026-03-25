import { AppConfigService } from '../config/app-config.service';
import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './database.service';

@Global()
@Module({
  providers: [AppConfigService, DatabaseService],
  exports: [AppConfigService, DatabaseService],
})
export class DatabaseModule {}

