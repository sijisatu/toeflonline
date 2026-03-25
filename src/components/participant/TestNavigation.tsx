type TestSection = {
  id: string;
  title: string;
  questions: { id: string }[];
};

type TestNavigationProps = {
  sections: TestSection[];
  currentSectionIndex: number;
  currentQuestionIndex: number;
  answers: Record<string, string>;
  flagged: Record<string, boolean>;
  onNavigate: (sectionIndex: number, questionIndex: number) => void;
};

export function TestNavigation({
  sections,
  currentSectionIndex,
  currentQuestionIndex,
  answers,
  flagged,
  onNavigate,
}: TestNavigationProps) {
  let questionCounter = 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 sticky top-24">
      <h3 className="font-semibold text-gray-900 mb-4">Question Navigation</h3>

      <div className="space-y-4">
        {sections.map((section, sectionIndex) => {
          const sectionStartNumber = questionCounter;
          const sectionQuestions = section.questions.map((q, idx) => {
            const absoluteNumber = questionCounter + 1;
            questionCounter++;
            return { ...q, absoluteNumber, sectionQuestionIndex: idx };
          });

          return (
            <div key={section.id} className="space-y-2">
              <div className="text-sm font-medium text-gray-700 pb-2 border-b border-gray-200">
                {section.title}
              </div>

              <div className="grid grid-cols-5 gap-2">
                {sectionQuestions.map((question) => {
                  const isAnswered = !!answers[question.id];
                  const isFlagged = !!flagged[question.id];
                  const isCurrent =
                    sectionIndex === currentSectionIndex &&
                    question.sectionQuestionIndex === currentQuestionIndex;

                  return (
                    <button
                      key={question.id}
                      onClick={() => onNavigate(sectionIndex, question.sectionQuestionIndex)}
                      className={`
                        aspect-square rounded-lg font-medium text-sm transition-all
                        ${
                          isCurrent
                            ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                            : isFlagged
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : isAnswered
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }
                      `}
                    >
                      {question.absoluteNumber}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200 space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-6 h-6 rounded bg-green-100 border border-green-200"></div>
          <span className="text-gray-600">Answered</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-6 h-6 rounded bg-red-100 border border-red-200"></div>
          <span className="text-gray-600">Flagged</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-6 h-6 rounded bg-gray-100 border border-gray-200"></div>
          <span className="text-gray-600">Not Answered</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-6 h-6 rounded bg-blue-600 border border-blue-700"></div>
          <span className="text-gray-600">Current</span>
        </div>
      </div>
    </div>
  );
}
