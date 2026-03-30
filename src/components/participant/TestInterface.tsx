import { startTransition, useEffect, useState, useRef } from 'react';
import { calculateScore, supabase, TestSection, Question, QuestionOption } from '../../lib/supabase';
import { TestNavigation } from './TestNavigation';
import { TestTimer } from './TestTimer';
import { QuestionDisplay } from './QuestionDisplay';
import { ProctoringMonitor } from './ProctoringMonitor';
import { AlertTriangle, ArrowLeft, ArrowRight, Flag } from 'lucide-react';

type TestInterfaceProps = {
  packageId: string;
  sessionId: string;
};

type QuestionWithOptions = Question & {
  options: QuestionOption[];
};

type SectionWithQuestions = TestSection & {
  questions: QuestionWithOptions[];
};

export function TestInterface({ packageId, sessionId }: TestInterfaceProps) {
  const [sections, setSections] = useState<SectionWithQuestions[]>([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    void fetchTestData();
  }, [packageId]);

  const fetchTestData = async () => {
    try {
      const [sectionsResult, sessionResult, answersResult] = await Promise.all([
        supabase.from('test_sections').select('*').eq('package_id', packageId).order('section_order'),
        supabase
          .from('test_sessions')
          .select('time_remaining_seconds, current_section_id, current_question_number')
          .eq('id', sessionId)
          .single(),
        supabase.from('user_answers').select('question_id, selected_answer, is_flagged').eq('session_id', sessionId),
      ]);

      const { data: sectionsData, error: sectionsError } = sectionsResult;
      if (sectionsError) throw sectionsError;

      const rawSections = (sectionsData || []) as TestSection[];
      const sectionIds = rawSections.map((section) => section.id);
      const questionsBySection = new Map<string, QuestionWithOptions[]>();

      if (sectionIds.length > 0) {
        const { data: questionsData, error: questionsError } = await supabase
          .from('questions')
          .select('*')
          .in('section_id', sectionIds)
          .order('question_number');

        if (questionsError) throw questionsError;

        const rawQuestions = (questionsData || []) as Question[];
        const questionIds = rawQuestions.map((question) => question.id);
        const optionsByQuestion = new Map<string, QuestionOption[]>();

        if (questionIds.length > 0) {
          const { data: optionsData, error: optionsError } = await supabase
            .from('question_options')
            .select('*')
            .in('question_id', questionIds)
            .order('option_label');

          if (optionsError) throw optionsError;

          for (const option of (optionsData || []) as QuestionOption[]) {
            const current = optionsByQuestion.get(option.question_id) || [];
            current.push(option);
            optionsByQuestion.set(option.question_id, current);
          }
        }

        for (const question of rawQuestions) {
          const current = questionsBySection.get(question.section_id) || [];
          current.push({
            ...question,
            options: optionsByQuestion.get(question.id) || [],
          });
          questionsBySection.set(question.section_id, current);
        }
      }

      const sectionsWithQuestions = rawSections.map((section) => ({
        ...section,
        questions: questionsBySection.get(section.id) || [],
      }));

      setSections(sectionsWithQuestions);

      const { data: sessionData } = sessionResult;
      if (sessionData) {
        setTimeRemaining(sessionData.time_remaining_seconds);

        if (sessionData.current_section_id) {
          const sectionIndex = sectionsWithQuestions.findIndex((section) => section.id === sessionData.current_section_id);
          if (sectionIndex >= 0) {
            setCurrentSectionIndex(sectionIndex);
            setCurrentQuestionIndex(Math.max((sessionData.current_question_number || 1) - 1, 0));
          }
        }
      }

      const { data: existingAnswers } = answersResult;
      if (existingAnswers) {
        const answersMap: Record<string, string> = {};
        const flaggedMap: Record<string, boolean> = {};

        existingAnswers.forEach((answer: { question_id: string; selected_answer?: string; is_flagged: boolean }) => {
          if (answer.selected_answer) answersMap[answer.question_id] = answer.selected_answer;
          if (answer.is_flagged) flaggedMap[answer.question_id] = true;
        });

        setAnswers(answersMap);
        setFlagged(flaggedMap);
      }
    } catch (error) {
      console.error('Error fetching test data:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentSection = sections[currentSectionIndex];
  const currentQuestion = currentSection?.questions[currentQuestionIndex];
  const totalQuestions = sections.reduce((sum, section) => sum + section.questions.length, 0);
  const completedQuestions = Object.keys(answers).length;
  const progressPercent = totalQuestions === 0 ? 0 : Math.round((completedQuestions / totalQuestions) * 100);

  const handleAnswer = async (answer: string) => {
    if (!currentQuestion) return;

    const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
    startTimeRef.current = Date.now();

    startTransition(() => {
      setAnswers((prev) => ({ ...prev, [currentQuestion.id]: answer }));
    });

    try {
      const { error } = await supabase
        .from('user_answers')
        .upsert({
          session_id: sessionId,
          question_id: currentQuestion.id,
          selected_answer: answer,
          time_spent_seconds: timeSpent,
          is_flagged: flagged[currentQuestion.id] || false,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving answer:', error);
    }
  };

  const handleFlag = async () => {
    if (!currentQuestion) return;

    const newFlaggedState = !flagged[currentQuestion.id];
    startTransition(() => {
      setFlagged((prev) => ({ ...prev, [currentQuestion.id]: newFlaggedState }));
    });

    try {
      const { error } = await supabase
        .from('user_answers')
        .upsert({
          session_id: sessionId,
          question_id: currentQuestion.id,
          selected_answer: answers[currentQuestion.id],
          is_flagged: newFlaggedState,
          time_spent_seconds: 0,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error flagging question:', error);
    }
  };

  const navigateToQuestion = (sectionIndex: number, questionIndex: number) => {
    startTransition(() => {
      setCurrentSectionIndex(sectionIndex);
      setCurrentQuestionIndex(questionIndex);
    });
    startTimeRef.current = Date.now();

    const nextSection = sections[sectionIndex];
    if (nextSection) {
      void supabase
        .from('test_sessions')
        .update({
          current_section_id: nextSection.id,
          current_question_number: questionIndex + 1,
        })
        .eq('id', sessionId);
    }
  };

  const handleFinish = async () => {
    if (finishing) return;
    setFinishing(true);

    try {
      const { error } = await supabase
        .from('test_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (error) throw error;

      await calculateScore(sessionId);
      window.location.href = '/results';
    } catch (error) {
      console.error('Error finishing test:', error);
      const message = error instanceof Error ? error.message : 'Failed to finish the test. Please try again.';
      alert(message);
    } finally {
      setFinishing(false);
    }
  };

  const handlePrevious = () => {
    navigateToQuestion(
      currentQuestionIndex > 0 ? currentSectionIndex : Math.max(currentSectionIndex - 1, 0),
      currentQuestionIndex > 0 ? currentQuestionIndex - 1 : Math.max((sections[currentSectionIndex - 1]?.questions.length || 1) - 1, 0),
    );
  };

  const handleNext = () => {
    const isLastQuestionInSection = currentQuestionIndex === currentSection.questions.length - 1;
    const isLastSection = currentSectionIndex === sections.length - 1;

    if (isLastQuestionInSection) {
      if (!isLastSection) {
        navigateToQuestion(currentSectionIndex + 1, 0);
      }
      return;
    }

    navigateToQuestion(currentSectionIndex, currentQuestionIndex + 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f3f6ff] flex items-center justify-center px-4">
        <div className="glass-card-strong w-full max-w-md p-8 text-center sm:p-10">
          <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-[#d7e1ff] border-t-[color:var(--blue)]" />
          <p className="mt-6 text-sm text-[color:var(--ink-soft)]">Loading test sections and saved answers...</p>
        </div>
      </div>
    );
  }

  if (sections.length === 0 || !currentQuestion) {
    return (
      <div className="min-h-screen bg-[#f3f6ff] flex items-center justify-center p-4">
        <div className="glass-card-strong max-w-xl p-8 text-center sm:p-10">
          <h2 className="text-2xl font-extrabold sm:text-3xl">Test content not available</h2>
          <p className="mt-4 text-sm leading-7 text-[color:var(--ink-soft)]">
            This package does not have complete sections or questions yet. Please contact the admin.
          </p>
          <button onClick={() => (window.location.href = '/')} className="primary-btn mt-8 w-full sm:w-auto">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f6ff] pb-28 pt-3 sm:pt-4">
      <ProctoringMonitor sessionId={sessionId} />

      <div className="mx-auto w-full max-w-7xl space-y-4 px-3 sm:px-5 lg:px-8">
        <header className="z-20 rounded-[22px] border border-[rgba(119,123,179,0.14)] bg-white px-4 py-4 shadow-[0_10px_22px_rgba(71,80,140,0.08)] sm:px-5 sm:py-5 lg:sticky lg:top-0">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <h1 className="truncate text-2xl font-extrabold sm:text-3xl lg:text-4xl">The Lucid Scholar</h1>
                <span className="status-pill w-fit bg-[color:var(--blue-soft)] text-[color:var(--blue-deep)]">
                  {currentSection?.title}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-semibold text-[color:var(--ink-soft)] sm:text-sm">
                <span>
                  Question {currentQuestion.question_number} of {totalQuestions}
                </span>
                <span className="hidden text-[rgba(107,118,149,0.5)] sm:inline">•</span>
                <span>{completedQuestions} answered</span>
                <span className="hidden text-[rgba(107,118,149,0.5)] sm:inline">•</span>
                <span>{progressPercent}% complete</span>
              </div>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#eef2ff] sm:h-3">
                <div className="h-full rounded-full bg-[linear-gradient(90deg,#2358e6,#5a90ff)] transition-all" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>

            <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] lg:w-auto lg:grid-cols-none lg:auto-cols-max lg:grid-flow-col lg:items-center">
              <TestTimer initialSeconds={timeRemaining} onTimeUp={() => setShowFinishModal(true)} sessionId={sessionId} />
              <button
                onClick={() => setShowFinishModal(true)}
                className="primary-btn w-full bg-[linear-gradient(135deg,#e5a600,#cf8200)] shadow-[0_18px_30px_rgba(207,130,0,0.22)] sm:w-auto"
              >
                Selesai
              </button>
            </div>
          </div>
        </header>

        <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)] xl:gap-5">
          <div className="order-2 xl:order-1">
            <TestNavigation
              sections={sections}
              currentSectionIndex={currentSectionIndex}
              currentQuestionIndex={currentQuestionIndex}
              answers={answers}
              flagged={flagged}
              onNavigate={navigateToQuestion}
            />
          </div>

          <main className="order-1 xl:order-2 min-w-0">
            <div className="rounded-[24px] border border-[rgba(119,123,179,0.14)] bg-white p-4 shadow-[0_12px_28px_rgba(71,80,140,0.08)] sm:p-6 lg:rounded-[28px] lg:p-8">
              <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="eyebrow">Section {currentSectionIndex + 1}</div>
                  <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">{currentSection.title}</h2>
                  <p className="mt-2 text-sm leading-7 text-[color:var(--ink-soft)]">
                    Move through the section with the navigation panel and use flagging when you need review.
                  </p>
                </div>

                <button
                  onClick={handleFlag}
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-all md:w-auto ${
                    flagged[currentQuestion.id]
                      ? 'bg-[#fff0d7] text-[#9a6204] shadow-[0_14px_24px_rgba(169,103,0,0.14)]'
                      : 'border border-[rgba(119,123,179,0.18)] bg-white text-[color:var(--ink-main)]'
                  }`}
                >
                  <Flag className="h-4 w-4" />
                  {flagged[currentQuestion.id] ? 'Flagged for review' : 'Flag question'}
                </button>
              </div>

              <QuestionDisplay question={currentQuestion} selectedAnswer={answers[currentQuestion.id]} onSelectAnswer={handleAnswer} />
            </div>
          </main>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[rgba(119,123,179,0.12)] bg-white/95 px-3 py-3 shadow-[0_-8px_20px_rgba(71,80,140,0.06)] backdrop-blur sm:px-4 sm:py-4">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-3 md:flex md:items-center md:justify-between">
          <div className="col-span-2 order-3 text-center text-xs font-semibold text-[color:var(--ink-soft)] md:order-none md:flex-1 md:text-sm">
            Change the answer anytime before you finish the session.
          </div>

          <button
            onClick={handlePrevious}
            disabled={currentSectionIndex === 0 && currentQuestionIndex === 0}
            className="secondary-btn w-full disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </button>

          <button
            onClick={handleNext}
            disabled={currentSectionIndex === sections.length - 1 && currentQuestionIndex === currentSection.questions.length - 1}
            className="primary-btn w-full disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {showFinishModal && (
        <div className="modal-scrim">
          <div className="modal-card max-w-lg">
            <div className="flex items-start gap-3 sm:items-center">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#fff0d7] text-[#a96700]">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold sm:text-2xl">Finish Test?</h3>
                <p className="mt-1 text-sm text-[color:var(--ink-soft)]">
                  You have answered {completedQuestions} out of {totalQuestions} questions.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-[24px] bg-[#f8f8ff] p-4 text-sm leading-7 text-[color:var(--ink-main)]">
              Finishing will submit the current session, calculate the score, and take you to the result screen.
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button onClick={() => setShowFinishModal(false)} disabled={finishing} className="secondary-btn w-full disabled:opacity-50">
                Cancel
              </button>
              <button onClick={() => void handleFinish()} disabled={finishing} className="primary-btn w-full disabled:opacity-50">
                {finishing ? 'Finishing...' : 'Finish Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
