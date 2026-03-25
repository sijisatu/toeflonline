import { BadRequestException, Injectable } from '@nestjs/common';
import { QueryResultRow } from 'pg';
import { DatabaseService } from '../../shared/database/database.service';

type Filter =
  | { type: 'eq'; field: string; value: unknown }
  | { type: 'in'; field: string; values: unknown[] }
  | { type: 'gte'; field: string; value: number };

type TableConfig = {
  source: string;
  fields: Record<string, string>;
  selectAll: string[];
  writable: string[];
  defaultConflict?: string[];
};

const tableConfigs: Record<string, TableConfig> = {
  profiles: {
    source: 'users',
    fields: {
      id: 'id',
      full_name: 'full_name',
      email: 'email',
      role: 'role',
      created_at: 'created_at',
      avatar_url: 'NULL::text',
    },
    selectAll: ['id', 'full_name', 'email', 'role', 'created_at', 'avatar_url'],
    writable: ['id', 'full_name', 'email', 'role'],
    defaultConflict: ['id'],
  },
  test_packages: {
    source: 'test_packages',
    fields: {
      id: 'id',
      title: 'title',
      description: 'description',
      duration_minutes: 'duration_minutes',
      is_active: 'is_active',
      created_by: 'created_by',
      created_at: 'created_at',
      updated_at: 'updated_at',
    },
    selectAll: ['id', 'title', 'description', 'duration_minutes', 'is_active', 'created_by', 'created_at'],
    writable: ['id', 'title', 'description', 'duration_minutes', 'is_active', 'created_by'],
    defaultConflict: ['id'],
  },
  test_sections: {
    source: 'test_sections',
    fields: {
      id: 'id',
      package_id: 'package_id',
      title: 'title',
      section_order: 'section_order',
      total_questions: 'total_questions',
      duration_minutes: 'duration_minutes',
      created_at: 'created_at',
      updated_at: 'updated_at',
    },
    selectAll: ['id', 'package_id', 'title', 'section_order', 'total_questions', 'duration_minutes', 'created_at'],
    writable: ['id', 'package_id', 'title', 'section_order', 'total_questions', 'duration_minutes'],
    defaultConflict: ['id'],
  },
  questions: {
    source: 'questions',
    fields: {
      id: 'id',
      section_id: 'section_id',
      question_number: 'question_number',
      question_text: 'question_text',
      question_image_url: 'question_image_url',
      audio_url: 'audio_url',
      audio_duration_seconds: 'audio_duration_seconds',
      correct_answer: 'correct_answer',
      created_at: 'created_at',
      updated_at: 'updated_at',
    },
    selectAll: ['id', 'section_id', 'question_number', 'question_text', 'question_image_url', 'audio_url', 'audio_duration_seconds', 'correct_answer', 'created_at'],
    writable: ['id', 'section_id', 'question_number', 'question_text', 'question_image_url', 'audio_url', 'audio_duration_seconds', 'correct_answer'],
    defaultConflict: ['id'],
  },
  question_options: {
    source: 'question_options',
    fields: {
      id: 'id',
      question_id: 'question_id',
      option_label: 'option_label',
      option_text: 'option_text',
      created_at: 'created_at',
      updated_at: 'updated_at',
    },
    selectAll: ['id', 'question_id', 'option_label', 'option_text', 'created_at'],
    writable: ['id', 'question_id', 'option_label', 'option_text'],
    defaultConflict: ['question_id', 'option_label'],
  },
  test_sessions: {
    source: 'test_sessions',
    fields: {
      id: 'id',
      user_id: 'user_id',
      package_id: 'package_id',
      status: 'status',
      started_at: 'started_at',
      completed_at: 'completed_at',
      time_remaining_seconds: 'time_remaining_seconds',
      current_section_id: 'current_section_id',
      current_question_number: 'current_question_number',
      proctoring_enabled: 'proctoring_enabled',
    },
    selectAll: ['id', 'user_id', 'package_id', 'status', 'started_at', 'completed_at', 'time_remaining_seconds', 'current_section_id', 'current_question_number', 'proctoring_enabled'],
    writable: ['id', 'user_id', 'package_id', 'status', 'completed_at', 'time_remaining_seconds', 'current_section_id', 'current_question_number', 'proctoring_enabled'],
    defaultConflict: ['id'],
  },
  user_answers: {
    source: 'user_answers',
    fields: {
      id: 'id',
      session_id: 'session_id',
      question_id: 'question_id',
      selected_answer: 'selected_answer',
      is_flagged: 'is_flagged',
      time_spent_seconds: 'time_spent_seconds',
      answered_at: 'answered_at',
    },
    selectAll: ['id', 'session_id', 'question_id', 'selected_answer', 'is_flagged', 'time_spent_seconds', 'answered_at'],
    writable: ['id', 'session_id', 'question_id', 'selected_answer', 'is_flagged', 'time_spent_seconds', 'answered_at'],
    defaultConflict: ['session_id', 'question_id'],
  },
  certificates: {
    source: 'certificates',
    fields: {
      id: 'id',
      session_id: 'session_id',
      user_id: 'user_id',
      package_id: 'package_id',
      listening_score: 'listening_score',
      structure_score: 'structure_score',
      reading_score: 'reading_score',
      total_score: 'total_score',
      generated_at: 'generated_at',
    },
    selectAll: ['id', 'session_id', 'user_id', 'package_id', 'listening_score', 'structure_score', 'reading_score', 'total_score', 'generated_at'],
    writable: ['id', 'session_id', 'user_id', 'package_id', 'listening_score', 'structure_score', 'reading_score', 'total_score', 'generated_at'],
    defaultConflict: ['session_id'],
  },
  proctoring_logs: {
    source: 'proctoring_logs',
    fields: {
      id: 'id',
      session_id: 'session_id',
      event_type: 'event_type',
      event_data: 'event_data',
      timestamp: 'created_at',
      created_at: 'created_at',
    },
    selectAll: ['id', 'session_id', 'event_type', 'event_data', 'timestamp'],
    writable: ['id', 'session_id', 'event_type', 'event_data', 'timestamp'],
    defaultConflict: ['id'],
  },
};

@Injectable()
export class DbService {
  constructor(private readonly database: DatabaseService) {}

  async select(table: string, body: Record<string, unknown>) {
    const config = this.getConfig(table);
    const filters = this.getFilters(body.filters);
    const columns = this.resolveSelectColumns(config, typeof body.columns === 'string' ? body.columns : '*');
    const clauses = this.buildWhere(config, filters, 1);
    const order = this.buildOrder(config, body.orderByField, body.orderAscending);
    const limit = typeof body.limitValue === 'number' ? ` LIMIT ${body.limitValue}` : '';
    const countRequested = body.countMode === 'exact';
    const rows = await this.database.query<QueryResultRow>(
      `SELECT ${columns.join(', ')} FROM ${config.source}${clauses.sql}${order}${limit}`,
      clauses.values,
    );

    const resultRows = rows.rows;
    const count = countRequested
      ? (await this.database.query<{ count: string }>(
          `SELECT COUNT(*)::text as count FROM ${config.source}${clauses.sql}`,
          clauses.values,
        )).rows[0]
      : null;

    if (body.headMode) {
      return { data: null, error: null, count: count ? Number(count.count) : null };
    }

    return this.finalizeSingleMode(resultRows, body.singleMode, count ? Number(count.count) : null);
  }

  async insert(table: string, body: Record<string, unknown>) {
    const config = this.getConfig(table);
    const payloadRows = this.normalizePayload(body.payload);
    if (payloadRows.length === 0) {
      return { data: null, error: null };
    }

    const normalizedRows = payloadRows.map((row) => this.normalizeWritableRow(config, row));
    const columns = this.collectColumns(normalizedRows);
    const placeholders: string[] = [];
    const values: unknown[] = [];

    normalizedRows.forEach((row, rowIndex) => {
      const rowPlaceholders = columns.map((column, columnIndex) => {
        values.push(row[column] ?? null);
        return `$${rowIndex * columns.length + columnIndex + 1}`;
      });
      placeholders.push(`(${rowPlaceholders.join(', ')})`);
    });

    const returning = this.returningClause(config, body.columns);
    const result = await this.database.query<QueryResultRow>(
      `INSERT INTO ${config.source} (${columns.join(', ')}) VALUES ${placeholders.join(', ')}${returning}`,
      values,
    );

    return this.returnResult(result.rows, body);
  }

  async update(table: string, body: Record<string, unknown>) {
    const config = this.getConfig(table);
    const payload = this.normalizeWritableRow(config, (body.payload as Record<string, unknown>) || {});
    const entries = Object.entries(payload);
    if (entries.length === 0) {
      throw new BadRequestException('Update payload is empty');
    }

    const values: unknown[] = [];
    const setSql = entries
      .map(([field, value], index) => {
        values.push(value ?? null);
        return `${field} = $${index + 1}`;
      })
      .join(', ');

    const filters = this.getFilters(body.filters);
    const where = this.buildWhere(config, filters, values.length + 1);
    const returning = this.returningClause(config, body.columns);
    const result = await this.database.query<QueryResultRow>(
      `UPDATE ${config.source} SET ${setSql}${where.sql}${returning}`,
      [...values, ...where.values],
    );

    return this.returnResult(result.rows, body);
  }

  async delete(table: string, body: Record<string, unknown>) {
    const config = this.getConfig(table);
    const filters = this.getFilters(body.filters);
    const where = this.buildWhere(config, filters, 1);
    await this.database.query(`DELETE FROM ${config.source}${where.sql}`, where.values);
    return { data: null, error: null };
  }

  async upsert(table: string, body: Record<string, unknown>) {
    const config = this.getConfig(table);
    const payloadRows = this.normalizePayload(body.payload);
    if (payloadRows.length === 0) {
      return { data: null, error: null };
    }

    const normalizedRows = payloadRows.map((row) => this.normalizeWritableRow(config, row));
    const columns = this.collectColumns(normalizedRows);
    const values: unknown[] = [];
    const placeholders = normalizedRows.map((row, rowIndex) => {
      const rowPlaceholders = columns.map((column, columnIndex) => {
        values.push(row[column] ?? null);
        return `$${rowIndex * columns.length + columnIndex + 1}`;
      });
      return `(${rowPlaceholders.join(', ')})`;
    });

    const conflictColumns = this.resolveConflictColumns(config, body.onConflictValue);
    const updateColumns = columns.filter((column) => !conflictColumns.includes(column));
    const updateSql = updateColumns.length
      ? ` DO UPDATE SET ${updateColumns.map((column) => `${column} = EXCLUDED.${column}`).join(', ')}`
      : ' DO NOTHING';
    const returning = this.returningClause(config, body.columns);

    const result = await this.database.query<QueryResultRow>(
      `INSERT INTO ${config.source} (${columns.join(', ')}) VALUES ${placeholders.join(', ')} ON CONFLICT (${conflictColumns.join(', ')})${updateSql}${returning}`,
      values,
    );

    return this.returnResult(result.rows, body);
  }

  private getConfig(table: string) {
    const config = tableConfigs[table];
    if (!config) {
      throw new BadRequestException(`Unsupported table: ${table}`);
    }
    return config;
  }

  private resolveSelectColumns(config: TableConfig, columns: string) {
    const requested = columns === '*'
      ? config.selectAll
      : columns.split(',').map((column) => column.trim()).filter(Boolean);

    return requested.map((column) => {
      const source = config.fields[column];
      if (!source) {
        throw new BadRequestException(`Unsupported column: ${column}`);
      }
      return source.includes(' ') || source.includes('(') || source.includes('::')
        ? `${source} AS ${column}`
        : `${source} AS ${column}`;
    });
  }

  private buildWhere(config: TableConfig, filters: Filter[], startIndex: number) {
    if (filters.length === 0) {
      return { sql: '', values: [] as unknown[] };
    }

    const values: unknown[] = [];
    const clauses = filters.map((filter) => {
      const column = config.fields[filter.field];
      if (!column) {
        throw new BadRequestException(`Unsupported filter field: ${filter.field}`);
      }

      if (filter.type === 'eq') {
        values.push(filter.value);
        return `${column} = $${startIndex + values.length - 1}`;
      }

      if (filter.type === 'gte') {
        values.push(filter.value);
        return `${column} >= $${startIndex + values.length - 1}`;
      }

      if (filter.type === 'in') {
        if (filter.values.length === 0) {
          return '1 = 0';
        }

        const placeholders = filter.values.map((value) => {
          values.push(value);
          return `$${startIndex + values.length - 1}`;
        });
        return `${column} IN (${placeholders.join(', ')})`;
      }

      throw new BadRequestException('Unsupported filter type');
    });

    return { sql: ` WHERE ${clauses.join(' AND ')}`, values };
  }

  private buildOrder(config: TableConfig, field: unknown, ascending: unknown) {
    if (typeof field !== 'string' || !field.trim()) {
      return '';
    }

    const column = config.fields[field];
    if (!column) {
      throw new BadRequestException(`Unsupported order field: ${field}`);
    }

    return ` ORDER BY ${column} ${(ascending === false ? 'DESC' : 'ASC')}`;
  }

  private normalizePayload(payload: unknown) {
    if (!payload) return [];
    return Array.isArray(payload) ? payload as Record<string, unknown>[] : [payload as Record<string, unknown>];
  }

  private normalizeWritableRow(config: TableConfig, row: Record<string, unknown>) {
    const next: Record<string, unknown> = {};
    for (const field of config.writable) {
      if (field in row) {
        const mappedField = config.fields[field];
        if (!mappedField || mappedField.includes(' ') || mappedField.includes('(') || mappedField.includes('::')) {
          continue;
        }
        next[mappedField] = row[field];
      }
    }
    return next;
  }

  private collectColumns(rows: Record<string, unknown>[]) {
    const columns = new Set<string>();
    rows.forEach((row) => Object.keys(row).forEach((key) => columns.add(key)));
    return [...columns];
  }

  private resolveConflictColumns(config: TableConfig, onConflictValue: unknown) {
    if (typeof onConflictValue === 'string' && onConflictValue.trim()) {
      return onConflictValue.split(',').map((field) => field.trim()).filter(Boolean);
    }

    if (config.defaultConflict && config.defaultConflict.length > 0) {
      return config.defaultConflict;
    }

    return ['id'];
  }

  private returningClause(config: TableConfig, columns: unknown) {
    return ` RETURNING ${this.resolveSelectColumns(config, typeof columns === 'string' ? columns : '*').join(', ')}`;
  }

  private returnResult(rows: QueryResultRow[], body: Record<string, unknown>) {
    if (!body.returnRows) {
      return { data: null, error: null };
    }

    return this.finalizeSingleMode(rows, body.singleMode, null);
  }

  private finalizeSingleMode(rows: QueryResultRow[], singleMode: unknown, count: number | null) {
    if (singleMode === 'single') {
      if (rows.length !== 1) {
        return { data: null, error: { message: 'Expected exactly one row' }, count };
      }
      return { data: rows[0], error: null, count };
    }

    if (singleMode === 'maybeSingle') {
      return { data: rows[0] || null, error: null, count };
    }

    return { data: rows, error: null, count };
  }

  private getFilters(raw: unknown) {
    if (!Array.isArray(raw)) {
      return [];
    }

    return raw as Filter[];
  }
}

