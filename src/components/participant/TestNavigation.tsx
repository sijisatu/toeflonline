import { memo, ReactNode } from 'react';
import { CheckCircle2, Flag, HelpCircle, Radio } from 'lucide-react';

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

function TestNavigationComponent({
  sections,
  currentSectionIndex,
  currentQuestionIndex,
  answers,
  flagged,
  onNavigate,
}: TestNavigationProps) {
  let questionCounter = 0;

  return (
    <aside className="sticky top-24 overflow-hidden rounded-[24px] border border-[rgba(119,123,179,0.14)] bg-white p-5 shadow-[0_10px_22px_rgba(71,80,140,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-2xl font-extrabold">Question Navigation</h3>
          <p className="mt-1 text-sm text-[color:var(--ink-soft)]">Track current, answered, and flagged items.</p>
        </div>
      </div>

      <div className="mt-6 space-y-3 rounded-[22px] bg-[#f6f8ff] p-4">
        <LegendItem icon={<Radio className="h-4 w-4" />} label="Current" tone="text-[color:var(--blue-deep)]" />
        <LegendItem icon={<CheckCircle2 className="h-4 w-4" />} label="Answered" tone="text-[#12965a]" />
        <LegendItem icon={<Flag className="h-4 w-4" />} label="Flagged" tone="text-[#af6a00]" />
        <LegendItem icon={<HelpCircle className="h-4 w-4" />} label="Unanswered" tone="text-[color:var(--ink-soft)]" />
      </div>

      <div className="mt-6 space-y-5">
        {sections.map((section, sectionIndex) => {
          const sectionQuestions = section.questions.map((question, idx) => {
            questionCounter += 1;
            return {
              ...question,
              absoluteNumber: questionCounter,
              sectionQuestionIndex: idx,
            };
          });

          return (
            <section key={section.id} className="rounded-[22px] bg-[#f7f8ff] p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold uppercase tracking-[0.22em] text-[color:var(--ink-soft)]">
                    Section
                  </div>
                  <div className="mt-1 text-base font-extrabold text-[color:var(--ink-strong)]">{section.title}</div>
                </div>
                <div className="rounded-full bg-[color:var(--blue-soft)] px-3 py-1 text-xs font-bold text-[color:var(--blue-deep)]">
                  {section.questions.length} items
                </div>
              </div>

              <div className="grid grid-cols-5 gap-3">
                {sectionQuestions.map((question) => {
                  const isAnswered = !!answers[question.id];
                  const isFlagged = !!flagged[question.id];
                  const isCurrent =
                    sectionIndex === currentSectionIndex &&
                    question.sectionQuestionIndex === currentQuestionIndex;

                  let classes =
                    'bg-white text-[color:var(--ink-main)] border border-[rgba(122,128,182,0.16)] hover:border-[rgba(35,88,230,0.28)]';

                  if (isAnswered) {
                    classes = 'bg-[#dbfff0] text-[#127548] border border-[#b2f1d0]';
                  }

                  if (isFlagged) {
                    classes = 'bg-[#fff0d7] text-[#9a6204] border border-[#f4d39a]';
                  }

                  if (isCurrent) {
                    classes =
                      'bg-[linear-gradient(135deg,#2358e6,#2f76ff)] text-white border border-transparent shadow-[0_14px_26px_rgba(35,88,230,0.22)]';
                  }

                  return (
                    <button
                      key={question.id}
                      onClick={() => onNavigate(sectionIndex, question.sectionQuestionIndex)}
                      className={`aspect-square rounded-[20px] text-sm font-extrabold transition-all ${classes}`}
                    >
                      {question.absoluteNumber}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </aside>
  );
}

export const TestNavigation = memo(TestNavigationComponent);

function LegendItem({
  icon,
  label,
  tone,
}: {
  icon: ReactNode;
  label: string;
  tone: string;
}) {
  return (
    <div className={`flex items-center gap-3 text-sm font-semibold ${tone}`}>
      {icon}
      <span>{label}</span>
    </div>
  );
}
