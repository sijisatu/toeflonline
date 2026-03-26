import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { TestsModule } from './modules/tests/tests.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { ProctoringModule } from './modules/proctoring/proctoring.module';
import { ReportsModule } from './modules/reports/reports.module';
import { DatabaseModule } from './shared/database/database.module';
import { RedisModule } from './shared/redis/redis.module';
import { appConfigSchema } from './shared/config/app-config.schema';
import { AppConfigService } from './shared/config/app-config.service';
import { DbModule } from './modules/db/db.module';
import { MediaModule } from './modules/media/media.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: (config) => appConfigSchema.parse(config),
    }),
    DatabaseModule,
    RedisModule,
    HealthModule,
    AuthModule,
    DbModule,
    TestsModule,
    SessionsModule,
    ProctoringModule,
    ReportsModule,
    MediaModule,
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppModule {}




