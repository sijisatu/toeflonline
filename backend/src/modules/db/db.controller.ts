import { Body, Controller, Param, Post } from '@nestjs/common';
import { DbService } from './db.service';

@Controller('db')
export class DbController {
  constructor(private readonly dbService: DbService) {}

  @Post(':table/select')
  async select(@Param('table') table: string, @Body() body: Record<string, unknown>) {
    return this.dbService.select(table, body);
  }

  @Post(':table/insert')
  async insert(@Param('table') table: string, @Body() body: Record<string, unknown>) {
    return this.dbService.insert(table, body);
  }

  @Post(':table/update')
  async update(@Param('table') table: string, @Body() body: Record<string, unknown>) {
    return this.dbService.update(table, body);
  }

  @Post(':table/delete')
  async delete(@Param('table') table: string, @Body() body: Record<string, unknown>) {
    return this.dbService.delete(table, body);
  }

  @Post(':table/upsert')
  async upsert(@Param('table') table: string, @Body() body: Record<string, unknown>) {
    return this.dbService.upsert(table, body);
  }
}
