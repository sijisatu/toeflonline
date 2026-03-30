import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { AppConfigService } from '../config/app-config.service';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly pool: Pool;

  constructor(config: AppConfigService) {
    this.pool = new Pool(config.postgres);
  }

  async query<T extends QueryResultRow>(text: string, values: unknown[] = []) {
    return this.pool.query<T>(text, values);
  }

  async transaction<T>(handler: (client: PoolClient) => Promise<T>) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const result = await handler(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async ping(): Promise<QueryResult<{ now: string }>> {
    return this.pool.query<{ now: string }>('select now()');
  }

  async onModuleDestroy() {
    this.logger.log('Closing PostgreSQL pool');
    await this.pool.end();
  }
}

