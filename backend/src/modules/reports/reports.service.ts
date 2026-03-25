import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../shared/database/database.service';

@Injectable()
export class ReportsService {
  constructor(private readonly database: DatabaseService) {}

  async overview() {
    const result = await this.database.query<{ total: string }>('SELECT COUNT(*)::text as total FROM certificates');
    return {
      message: 'Reports overview',
      metrics: {
        certificates: Number(result.rows[0]?.total || 0),
      },
    };
  }

  async calculateScore(sessionId: string) {
    const sessionResult = await this.database.query<{
      id: string;
      user_id: string;
      package_id: string;
    }>('SELECT id, user_id, package_id FROM test_sessions WHERE id = $1 LIMIT 1', [sessionId]);

    const session = sessionResult.rows[0];
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const sectionsResult = await this.database.query<{
      id: string;
      title: string;
      section_order: number;
    }>('SELECT id, title, section_order FROM test_sections WHERE package_id = $1 ORDER BY section_order ASC', [session.package_id]);

    const scores = {
      listening: 0,
      structure: 0,
      reading: 0,
    };

    for (const section of sectionsResult.rows) {
      const questions = await this.database.query<{
        id: string;
        correct_answer: string;
      }>('SELECT id, correct_answer FROM questions WHERE section_id = $1', [section.id]);

      let correctCount = 0;
      for (const question of questions.rows) {
        const answer = await this.database.query<{ selected_answer: string | null }>(
          'SELECT selected_answer FROM user_answers WHERE session_id = $1 AND question_id = $2 LIMIT 1',
          [sessionId, question.id],
        );

        if (answer.rows[0]?.selected_answer === question.correct_answer) {
          correctCount += 1;
        }
      }

      const percentage = questions.rows.length ? correctCount / questions.rows.length : 0;
      const scaledScore = Math.round(31 + percentage * 37);
      const title = section.title.toLowerCase();

      if (title.includes('listening')) scores.listening = scaledScore;
      else if (title.includes('structure')) scores.structure = scaledScore;
      else scores.reading = scaledScore;
    }

    const totalScore = Math.round(((scores.listening + scores.structure + scores.reading) / 3) * 10);

    const certificate = await this.database.query<{
      id: string;
      session_id: string;
      user_id: string;
      package_id: string;
      listening_score: number;
      structure_score: number;
      reading_score: number;
      total_score: number;
      generated_at: string;
    }>(
      `INSERT INTO certificates (
        session_id, user_id, package_id, listening_score, structure_score, reading_score, total_score
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (session_id) DO UPDATE SET
        listening_score = EXCLUDED.listening_score,
        structure_score = EXCLUDED.structure_score,
        reading_score = EXCLUDED.reading_score,
        total_score = EXCLUDED.total_score,
        generated_at = now()
      RETURNING id, session_id, user_id, package_id, listening_score, structure_score, reading_score, total_score, generated_at`,
      [sessionId, session.user_id, session.package_id, scores.listening, scores.structure, scores.reading, totalScore],
    );

    return {
      certificate: certificate.rows[0],
    };
  }
}
