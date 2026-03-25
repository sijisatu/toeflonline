import { useEffect, useState, useRef } from 'react';
import { calculateScore, supabase, TestSection, Question, QuestionOption } from '../../lib/supabase';
import { TestNavigation } from './TestNavigation';
import { TestTimer } from './TestTimer';
import { QuestionDisplay } from './QuestionDisplay';
import { ProctoringMonitor } from './ProctoringMonitor';
import { Flag, AlertTriangle } from 'lucide-react';

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
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('test_sections')
        .select('*')
        .eq('package_id', packageId)
        .order('section_order');

      if (sectionsError) throw sectionsError;

      const sectionsWithQuestions = await Promise.all(
        (sectionsData || []).map(async (section: TestSection) => {
          const { data: questions, error: questionsError } = await supabase
            .from('questions')
            .select('*')
            .eq('section_id', section.id)
            .order('question_number');

          if (questionsError) throw questionsError;

          const questionsWithOptions = await Promise.all(
            (questions || []).map(async (question: Question) => {
              const { data: options, error: optionsError } = await supabase
                .from('question_options')
                .select('*')
                .eq('question_id', question.id)
                .order('option_label');

              if (optionsError) throw optionsError;

              return { ...question, options: options || [] };
            })
          );

          return { ...section, questions: questionsWithOptions };
        })
      );

      setSections(sectionsWithQuestions);

      const { data: sessionData } = await supabase
        .from('test_sessions')
        .select('time_remaining_seconds, current_section_id, current_question_number')
        .eq('id', sessionId)
        .single();

      if (sessionData) {
        setTimeRemaining(sessionData.time_remaining_seconds);

        if (sessionData.current_section_id) {
          const sectionIndex = sectionsWithQuestions.findIndex(
            (section) => section.id === sessionData.current_section_id
          );

          if (sectionIndex >= 0) {
            setCurrentSectionIndex(sectionIndex);
            setCurrentQuestionIndex(Math.max((sessionData.current_question_number || 1) - 1, 0));
          }
        }
      }

      const { data: existingAnswers } = await supabase
        .from('user_answers')
        .select('question_id, selected_answer, is_flagged')
        .eq('session_id', sessionId);

      if (existingAnswers) {
        const answersMap: Record<string, string> = {};
        const flaggedMap: Record<string, boolean> = {};

        existingAnswers.forEach((answer: { question_id: string; selected_answer?: string; is_flagged: boolean }) => {
          if (answer.selected_answer) {
            answersMap[answer.question_id] = answer.selected_answer;
          }
          if (answer.is_flagged) {
            flaggedMap[answer.question_id] = true;
          }
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

  const handleAnswer = async (answer: string) => {
    if (!currentQuestion) return;

    const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
    startTimeRef.current = Date.now();

    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: answer }));

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
    setFlagged((prev) => ({ ...prev, [currentQuestion.id]: newFlaggedState }));

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
    setCurrentSectionIndex(sectionIndex);
    setCurrentQuestionIndex(questionIndex);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading test...</p>
        </div>
      </div>
    );
  }

  if (sections.length === 0 || !currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-lg rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900">Test content not available</h2>
          <p className="mt-3 text-gray-600">
            This package does not have complete sections or questions yet. Please contact the admin.
          </p>
          <button
            onClick={() => (window.location.href = '/')}
            className="mt-6 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ProctoringMonitor sessionId={sessionId} />

      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-xl font-bold text-gray-900">TOEFL ITP Prediction</h1>
              <p className="text-sm text-gray-600">
                {currentSection?.title} - Soal {currentQuestionIndex + 1} of {currentSection?.questions.length}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <TestTimer
                initialSeconds={timeRemaining}
                onTimeUp={() => setShowFinishModal(true)}
                sessionId={sessionId}
              />
              <button
                onClick={() => setShowFinishModal(true)}
                className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {currentSection?.title}
                </h2>
                <button
                  onClick={handleFlag}
                  className={`flex items-center gap-2 px-3 py-1 rounded-lg transition-colors ${
                    flagged[currentQuestion?.id]
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Flag className="w-4 h-4" />
                  Ragu
                </button>
              </div>

              {currentQuestion && (
                <QuestionDisplay
                  question={currentQuestion}
                  selectedAnswer={answers[currentQuestion.id]}
                  onSelectAnswer={handleAnswer}
                />
              )}

              <div className="mt-6 flex flex-col gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:justify-between">
                <button
                  onClick={() =>
                    navigateToQuestion(
                      currentQuestionIndex > 0 ? currentSectionIndex : Math.max(currentSectionIndex - 1, 0),
                      currentQuestionIndex > 0
                        ? currentQuestionIndex - 1
                        : Math.max((sections[currentSectionIndex - 1]?.questions.length || 1) - 1, 0)
                    )
                  }
                  disabled={currentSectionIndex === 0 && currentQuestionIndex === 0}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>

                <button
                  onClick={() => {
                    const isLastQuestionInSection =
                      currentQuestionIndex === currentSection.questions.length - 1;
                    const isLastSection = currentSectionIndex === sections.length - 1;

                    if (isLastQuestionInSection) {
                      if (!isLastSection) {
                        navigateToQuestion(currentSectionIndex + 1, 0);
                      }
                      return;
                    }

                    navigateToQuestion(currentSectionIndex, currentQuestionIndex + 1);
                  }}
                  disabled={
                    currentSectionIndex === sections.length - 1 &&
                    currentQuestionIndex === currentSection.questions.length - 1
                  }
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <TestNavigation
              sections={sections}
              currentSectionIndex={currentSectionIndex}
              currentQuestionIndex={currentQuestionIndex}
              answers={answers}
              flagged={flagged}
              onNavigate={navigateToQuestion}
            />
          </div>
        </div>
      </div>

      {showFinishModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-yellow-500" />
              <h3 className="text-xl font-bold text-gray-900">Finish Test?</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to finish the test? You have answered{' '}
              {Object.keys(answers).length} out of {totalQuestions} questions.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowFinishModal(false)}
                disabled={finishing}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleFinish()}
                disabled={finishing}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {finishing ? 'Finishing...' : 'Finish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
