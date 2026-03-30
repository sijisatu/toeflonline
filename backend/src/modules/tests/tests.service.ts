import { Injectable } from '@nestjs/common';

@Injectable()
export class TestsService {
  async listPackages() {
    return {
      items: [],
      message: 'Tests module scaffolded. Package queries will be backed by PostgreSQL.',
    };
  }
}
