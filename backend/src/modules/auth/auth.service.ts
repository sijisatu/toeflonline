import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../../shared/database/database.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(private readonly database: DatabaseService) {}

  async login(dto: LoginDto) {
    const result = await this.database.query<{
      id: string;
      email: string;
      role: 'admin' | 'participant';
      password_hash: string;
    }>(
      'SELECT id, email, role, password_hash FROM users WHERE email = $1 AND is_active = true LIMIT 1',
      [dto.email],
    );

    const user = result.rows[0];
    if (!user || user.password_hash !== dto.password) {
      throw new UnauthorizedException('Invalid login credentials');
    }

    return {
      access_token: `demo-token:${user.id}`,
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }

  async register(dto: RegisterDto) {
    const existing = await this.database.query<{ id: string }>('SELECT id FROM users WHERE email = $1 LIMIT 1', [dto.email]);
    if (existing.rows[0]) {
      throw new ConflictException('User already registered');
    }

    const inserted = await this.database.query<{ id: string; email: string }>(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email`,
      [dto.email, dto.password, dto.fullName, dto.role || 'participant'],
    );

    const user = inserted.rows[0];
    return {
      user,
      session: {
        access_token: `demo-token:${user.id}`,
        user,
      },
    };
  }
}
