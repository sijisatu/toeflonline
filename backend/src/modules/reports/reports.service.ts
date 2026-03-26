import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../shared/database/database.service';

type SectionKind = 'listening' | 'structure' | 'reading';

type ConvertedRange = {
  minRaw: number;
  maxRaw: number;
  minScaled: number;
  maxScaled: number;
};

type ScoreProfile = {
  id: 'toefl_itp_level_1' | 'toefl_itp_level_2';
  officialQuestionCounts: Record<SectionKind, number>;
  sectionRanges: Record<SectionKind, { min: number; max: number }>;
  conversionTables: Partial<Record<SectionKind, ConvertedRange[]>>;
};

const LEVEL_1_TABLES: Record<SectionKind, ConvertedRange[]> = {
  listening: [
    { minRaw: 48, maxRaw: 50, minScaled: 64, maxScaled: 68 },
    { minRaw: 45, maxRaw: 47, minScaled: 59, maxScaled: 62 },
    { minRaw: 42, maxRaw: 44, minScaled: 56, maxScaled: 58 },
    { minRaw: 39, maxRaw: 41, minScaled: 54, maxScaled: 56 },
    { minRaw: 36, maxRaw: 38, minScaled: 52, maxScaled: 54 },
    { minRaw: 33, maxRaw: 35, minScaled: 51, maxScaled: 52 },
    { minRaw: 30, maxRaw: 32, minScaled: 49, maxScaled: 50 },
    { minRaw: 27, maxRaw: 29, minScaled: 48, maxScaled: 49 },
    { minRaw: 24, maxRaw: 26, minScaled: 46, maxScaled: 47 },
    { minRaw: 21, maxRaw: 23, minScaled: 45, maxScaled: 46 },
    { minRaw: 18, maxRaw: 20, minScaled: 43, maxScaled: 44 },
    { minRaw: 15, maxRaw: 17, minScaled: 40, maxScaled: 42 },
    { minRaw: 12, maxRaw: 14, minScaled: 36, maxScaled: 39 },
    { minRaw: 9, maxRaw: 11, minScaled: 32, maxScaled: 33 },
    { minRaw: 0, maxRaw: 8, minScaled: 31, maxScaled: 31 },
  ],
  structure: [
    { minRaw: 36, maxRaw: 40, minScaled: 63, maxScaled: 68 },
    { minRaw: 33, maxRaw: 35, minScaled: 59, maxScaled: 61 },
    { minRaw: 30, maxRaw: 32, minScaled: 56, maxScaled: 58 },
    { minRaw: 27, maxRaw: 29, minScaled: 53, maxScaled: 55 },
    { minRaw: 24, maxRaw: 26, minScaled: 50, maxScaled: 52 },
    { minRaw: 21, maxRaw: 23, minScaled: 48, maxScaled: 49 },
    { minRaw: 18, maxRaw: 20, minScaled: 45, maxScaled: 47 },
    { minRaw: 15, maxRaw: 17, minScaled: 42, maxScaled: 44 },
    { minRaw: 12, maxRaw: 14, minScaled: 38, maxScaled: 40 },
    { minRaw: 9, maxRaw: 11, minScaled: 32, maxScaled: 36 },
    { minRaw: 0, maxRaw: 8, minScaled: 31, maxScaled: 31 },
  ],
  reading: [
    { minRaw: 48, maxRaw: 50, minScaled: 65, maxScaled: 67 },
    { minRaw: 45, maxRaw: 47, minScaled: 62, maxScaled: 64 },
    { minRaw: 42, maxRaw: 44, minScaled: 59, maxScaled: 61 },
    { minRaw: 39, maxRaw: 41, minScaled: 57, maxScaled: 58 },
    { minRaw: 36, maxRaw: 38, minScaled: 55, maxScaled: 56 },
    { minRaw: 33, maxRaw: 35, minScaled: 53, maxScaled: 54 },
    { minRaw: 30, maxRaw: 32, minScaled: 51, maxScaled: 52 },
    { minRaw: 27, maxRaw: 29, minScaled: 49, maxScaled: 50 },
    { minRaw: 24, maxRaw: 26, minScaled: 47, maxScaled: 48 },
    { minRaw: 21, maxRaw: 23, minScaled: 44, maxScaled: 46 },
    { minRaw: 18, maxRaw: 20, minScaled: 41, maxScaled: 43 },
    { minRaw: 15, maxRaw: 17, minScaled: 37, maxScaled: 40 },
    { minRaw: 12, maxRaw: 14, minScaled: 31, maxScaled: 35 },
    { minRaw: 9, maxRaw: 11, minScaled: 31, maxScaled: 31 },
    { minRaw: 0, maxRaw: 8, minScaled: 31, maxScaled: 31 },
  ],
};

const SCORE_PROFILES: Record<ScoreProfile['id'], ScoreProfile> = {
  toefl_itp_level_1: {
    id: 'toefl_itp_level_1',
    officialQuestionCounts: {
      listening: 50,
      structure: 40,
      reading: 50,
    },
    sectionRanges: {
      listening: { min: 31, max: 68 },
      structure: { min: 31, max: 68 },
      reading: { min: 31, max: 67 },
    },
    conversionTables: LEVEL_1_TABLES,
  },
  toefl_itp_level_2: {
    id: 'toefl_itp_level_2',
    officialQuestionCounts: {
      listening: 30,
      structure: 25,
      reading: 40,
    },
    sectionRanges: {
      listening: { min: 20, max: 50 },
      structure: { min: 20, max: 50 },
      reading: { min: 20, max: 50 },
    },
    conversionTables: {},
  },
};

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

    const sections = sectionsResult.rows;
    const sectionIds = sections.map((section) => section.id);
    const profile = detectScoreProfile(sections.map((section) => section.title));

    const questionResult = sectionIds.length
      ? await this.database.query<{
          id: string;
          section_id: string;
          correct_answer: string;
        }>('SELECT id, section_id, correct_answer FROM questions WHERE section_id = ANY($1::uuid[])', [sectionIds])
      : { rows: [] };

    const questions = questionResult.rows;
    const questionIds = questions.map((question) => question.id);
    const answerResult = questionIds.length
      ? await this.database.query<{
          question_id: string;
          selected_answer: string | null;
        }>('SELECT question_id, selected_answer FROM user_answers WHERE session_id = $1 AND question_id = ANY($2::uuid[])', [sessionId, questionIds])
      : { rows: [] };

    const answersByQuestionId = new Map(answerResult.rows.map((row) => [row.question_id, row.selected_answer]));
    const questionsBySectionId = new Map<string, typeof questions>();

    for (const question of questions) {
      const current = questionsBySectionId.get(question.section_id) || [];
      current.push(question);
      questionsBySectionId.set(question.section_id, current);
    }

    const scores: Record<SectionKind, number> = {
      listening: profile.sectionRanges.listening.min,
      structure: profile.sectionRanges.structure.min,
      reading: profile.sectionRanges.reading.min,
    };

    const scoringBreakdown: Record<SectionKind, Record<string, number | string>> = {
      listening: {},
      structure: {},
      reading: {},
    };

    for (const section of sections) {
      const sectionKind = resolveSectionKind(section.title);
      const sectionQuestions = questionsBySectionId.get(section.id) || [];
      const actualQuestionCount = sectionQuestions.length;
      const actualCorrect = sectionQuestions.reduce((count, question) => {
        return count + (answersByQuestionId.get(question.id) === question.correct_answer ? 1 : 0);
      }, 0);

      const scaled = scaleSectionScore({
        profile,
        sectionKind,
        actualCorrect,
        actualQuestionCount,
      });

      scores[sectionKind] = scaled.scaled;
      scoringBreakdown[sectionKind] = {
        sectionTitle: section.title,
        actualQuestionCount,
        actualCorrect,
        normalizedRaw: scaled.normalizedRaw,
        scaledMin: scaled.scaledRange.min,
        scaledMax: scaled.scaledRange.max,
        scaledScore: scaled.scaled,
      };
    }

    const totalScore = roundLikeEts((scores.listening + scores.structure + scores.reading) * 10 / 3);

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
      scoring: {
        profile: profile.id,
        method: profile.id === 'toefl_itp_level_1' ? 'ETS official practice-test converted-score ranges (midpoint estimate)' : 'official scale range with linear fallback',
        breakdown: scoringBreakdown,
      },
    };
  }
}

function detectScoreProfile(sectionTitles: string[]) {
  const normalized = sectionTitles.map((title) => title.toLowerCase());
  if (normalized.some((title) => title.includes('level 2') || title.includes('vocabulary'))) {
    return SCORE_PROFILES.toefl_itp_level_2;
  }

  return SCORE_PROFILES.toefl_itp_level_1;
}

function resolveSectionKind(title: string): SectionKind {
  const normalized = title.toLowerCase();
  if (normalized.includes('listening')) return 'listening';
  if (normalized.includes('structure') || normalized.includes('written')) return 'structure';
  return 'reading';
}

function scaleSectionScore(input: {
  profile: ScoreProfile;
  sectionKind: SectionKind;
  actualCorrect: number;
  actualQuestionCount: number;
}) {
  const { profile, sectionKind, actualCorrect, actualQuestionCount } = input;
  const officialQuestionCount = profile.officialQuestionCounts[sectionKind];
  const normalizedRaw =
    actualQuestionCount > 0
      ? clamp(Math.round((actualCorrect / actualQuestionCount) * officialQuestionCount), 0, officialQuestionCount)
      : 0;

  const table = profile.conversionTables[sectionKind];
  if (!table || table.length === 0) {
    const range = profile.sectionRanges[sectionKind];
    const ratio = officialQuestionCount > 0 ? normalizedRaw / officialQuestionCount : 0;
    const scaled = clamp(Math.round(range.min + ratio * (range.max - range.min)), range.min, range.max);
    return {
      normalizedRaw,
      scaled,
      scaledRange: { min: scaled, max: scaled },
    };
  }

  const matchedRange = table.find((entry) => normalizedRaw >= entry.minRaw && normalizedRaw <= entry.maxRaw) || table[table.length - 1];
  const scaled = Math.round((matchedRange.minScaled + matchedRange.maxScaled) / 2);

  return {
    normalizedRaw,
    scaled,
    scaledRange: {
      min: matchedRange.minScaled,
      max: matchedRange.maxScaled,
    },
  };
}

function roundLikeEts(value: number) {
  const rounded = Math.round(value);
  if (Math.abs(value - rounded) < 0.000001) return rounded;

  const fractional = value - Math.floor(value);
  if (fractional <= 0.34) return Math.floor(value);
  if (fractional >= 0.65) return Math.ceil(value);
  return rounded;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
