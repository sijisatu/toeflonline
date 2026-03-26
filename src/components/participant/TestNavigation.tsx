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
    <aside className="overflow-hidden rounded-[22px] border border-[rgba(119,123,179,0.14)] bg-white p-4 shadow-[0_10px_22px_rgba(71,80,140,0.08)] xl:sticky xl:top-24 xl:rounded-[24px] xl:p-5">
      <div>
        <h3 className="text-xl font-extrabold sm:text-2xl">Question Navigation</h3>
        <p className="mt-1 text-sm text-[color:var(--ink-soft)]">Track current, answered, and flagged items.</p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 rounded-[20px] bg-[#f6f8ff] p-4 sm:grid-cols-4 xl:grid-cols-1">
        <LegendItem icon={<Radio className="h-4 w-4" />} label="Current" tone="text-[color:var(--blue-deep)]" />
        <LegendItem icon={<CheckCircle2 className="h-4 w-4" />} label="Answered" tone="text-[#12965a]" />
        <LegendItem icon={<Flag className="h-4 w-4" />} label="Flagged" tone="text-[#af6a00]" />
        <LegendItem icon={<HelpCircle className="h-4 w-4" />} label="Unanswered" tone="text-[color:var(--ink-soft)]" />
      </div>

      <div className="mt-5 space-y-4">
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
            <section key={section.id} className="rounded-[20px] bg-[#f7f8ff] p-4">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--ink-soft)]">Section</div>
                  <div className="mt-1 text-sm font-extrabold text-[color:var(--ink-strong)] sm:text-base">{section.title}</div>
                </div>
                <div className="w-fit rounded-full bg-[color:var(--blue-soft)] px-3 py-1 text-xs font-bold text-[color:var(--blue-deep)]">
                  {section.questions.length} items
                </div>
              </div>

              <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 xl:grid-cols-5 xl:gap-3">
                {sectionQuestions.map((question) => {
                  const isAnswered = !!answers[question.id];
                  const isFlagged = !!flagged[question.id];
                  const isCurrent = sectionIndex === currentSectionIndex && question.sectionQuestionIndex === currentQuestionIndex;

                  let classes = 'border border-[rgba(122,128,182,0.16)] bg-white text-[color:var(--ink-main)] hover:border-[rgba(35,88,230,0.28)]';
                  if (isAnswered) classes = 'border border-[#b2f1d0] bg-[#dbfff0] text-[#127548]';
                  if (isFlagged) classes = 'border border-[#f4d39a] bg-[#fff0d7] text-[#9a6204]';
                  if (isCurrent) classes = 'border border-transparent bg-[linear-gradient(135deg,#2358e6,#2f76ff)] text-white shadow-[0_14px_26px_rgba(35,88,230,0.22)]';

                  return (
                    <button
                      key={question.id}
                      onClick={() => onNavigate(sectionIndex, question.sectionQuestionIndex)}
                      className={`aspect-square rounded-[16px] text-sm font-extrabold transition-all sm:rounded-[18px] xl:rounded-[20px] ${classes}`}
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

function LegendItem({ icon, label, tone }: { icon: ReactNode; label: string; tone: string }) {
  return (
    <div className={`flex items-center gap-2 text-xs font-semibold sm:text-sm ${tone}`}>
      {icon}
      <span>{label}</span>
    </div>
  );
}
