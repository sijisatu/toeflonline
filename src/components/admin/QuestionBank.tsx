import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ImageIcon, Music4, Pencil, Plus, Trash2 } from 'lucide-react';
import { Question, QuestionOption, TestPackage, TestSection, supabase } from '../../lib/supabase';

type QuestionWithOptions = Question & {
  options: QuestionOption[];
};

type QuestionFormState = {
  id?: string;
  section_id: string;
  question_number: number;
  question_text: string;
  question_image_url: string;
  audio_url: string;
  audio_duration_seconds: number | '';
  correct_answer: 'A' | 'B' | 'C' | 'D';
  options: Record<'A' | 'B' | 'C' | 'D', string>;
};

const optionLabels: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];

export function QuestionBank() {
  const [packages, setPackages] = useState<TestPackage[]>([]);
  const [sections, setSections] = useState<TestSection[]>([]);
  const [questions, setQuestions] = useState<QuestionWithOptions[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionFormState | null>(null);

  useEffect(() => {
    void fetchPackages();
  }, []);

  useEffect(() => {
    if (!selectedPackageId) {
      setSections([]);
      setSelectedSectionId('');
      setQuestions([]);
      return;
    }

    void fetchSections(selectedPackageId);
  }, [selectedPackageId]);

  useEffect(() => {
    if (!selectedSectionId) {
      setQuestions([]);
      return;
    }

    void fetchQuestions(selectedSectionId);
  }, [selectedSectionId]);

  const currentSection = useMemo(
    () => sections.find((section) => section.id === selectedSectionId) || null,
    [sections, selectedSectionId]
  );

  const fetchPackages = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('test_packages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPackages(data || []);
      if (data?.[0]) {
        setSelectedPackageId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
      alert('Failed to load packages.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSections = async (packageId: string) => {
    try {
      const { data, error } = await supabase
        .from('test_sections')
        .select('*')
        .eq('package_id', packageId)
        .order('section_order');

      if (error) throw error;

      const nextSections = data || [];
      setSections(nextSections);
      setSelectedSectionId((prev) => {
        if (prev && nextSections.some((section) => section.id === prev)) return prev;
        return nextSections[0]?.id || '';
      });
    } catch (error) {
      console.error('Error fetching sections:', error);
      alert('Failed to load sections.');
    }
  };

  const fetchQuestions = async (sectionId: string) => {
    setLoadingQuestions(true);

    try {
      const { data: questionRows, error: questionError } = await supabase
        .from('questions')
        .select('*')
        .eq('section_id', sectionId)
        .order('question_number');

      if (questionError) throw questionError;

      const nextQuestions = await Promise.all(
        (questionRows || []).map(async (question) => {
          const { data: optionRows, error: optionError } = await supabase
            .from('question_options')
            .select('*')
            .eq('question_id', question.id)
            .order('option_label');

          if (optionError) throw optionError;

          return {
            ...question,
            options: optionRows || [],
          };
        })
      );

      setQuestions(nextQuestions);
    } catch (error) {
      console.error('Error fetching questions:', error);
      alert('Failed to load questions.');
    } finally {
      setLoadingQuestions(false);
    }
  };

  const buildEmptyForm = (sectionId: string): QuestionFormState => ({
    section_id: sectionId,
    question_number: questions.length + 1,
    question_text: '',
    question_image_url: '',
    audio_url: '',
    audio_duration_seconds: '',
    correct_answer: 'A',
    options: {
      A: '',
      B: '',
      C: '',
      D: '',
    },
  });

  const openNewQuestionModal = () => {
    if (!selectedSectionId) return;

    setEditingQuestion(buildEmptyForm(selectedSectionId));
    setModalOpen(true);
  };

  const openEditQuestionModal = (question: QuestionWithOptions) => {
    setEditingQuestion({
      id: question.id,
      section_id: question.section_id,
      question_number: question.question_number,
      question_text: question.question_text,
      question_image_url: question.question_image_url || '',
      audio_url: question.audio_url || '',
      audio_duration_seconds: question.audio_duration_seconds || '',
      correct_answer: question.correct_answer,
      options: {
        A: question.options.find((option) => option.option_label === 'A')?.option_text || '',
        B: question.options.find((option) => option.option_label === 'B')?.option_text || '',
        C: question.options.find((option) => option.option_label === 'C')?.option_text || '',
        D: question.options.find((option) => option.option_label === 'D')?.option_text || '',
      },
    });
    setModalOpen(true);
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Delete this question?')) return;

    try {
      const question = questions.find((item) => item.id === questionId);
      const { error } = await supabase.from('questions').delete().eq('id', questionId);
      if (error) throw error;
      if (question) {
        await syncSectionQuestionCount(question.section_id);
      }
      await fetchQuestions(selectedSectionId);
    } catch (error) {
      console.error('Error deleting question:', error);
      alert('Failed to delete question.');
    }
  };

  if (loading) {
    return <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">Loading question bank...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Question Bank</h2>
          <p className="text-sm text-gray-600">Create and maintain question content for every test section.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[520px]">
          <label className="text-sm font-medium text-gray-700">
            Package
            <select
              value={selectedPackageId}
              onChange={(event) => setSelectedPackageId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
            >
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.title}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium text-gray-700">
            Section
            <select
              value={selectedSectionId}
              onChange={(event) => setSelectedSectionId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
            >
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.section_order}. {section.title}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{currentSection?.title || 'Select a section'}</h3>
            <p className="text-sm text-gray-600">
              {currentSection
                ? `${questions.length} questions loaded for this section.`
                : 'Choose a package and section to begin.'}
            </p>
          </div>

          <button
            onClick={openNewQuestionModal}
            disabled={!selectedSectionId}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            <Plus className="h-4 w-4" />
            Add Question
          </button>
        </div>

        {loadingQuestions ? (
          <div className="py-12 text-center text-gray-600">Loading questions...</div>
        ) : questions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-600">
            No questions yet for this section.
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((question) => (
              <div key={question.id} className="rounded-lg border border-gray-200 p-5">
                <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                        Question {question.question_number}
                      </span>
                      <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                        Correct: {question.correct_answer}
                      </span>
                      {question.audio_url && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-700">
                          <Music4 className="h-3 w-3" />
                          Audio
                        </span>
                      )}
                      {question.question_image_url && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          <ImageIcon className="h-3 w-3" />
                          Image
                        </span>
                      )}
                    </div>
                    <p className="text-gray-900">{question.question_text}</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditQuestionModal(question)}
                      className="rounded-lg border border-blue-200 p-2 text-blue-600 transition-colors hover:bg-blue-50"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => void handleDeleteQuestion(question.id)}
                      className="rounded-lg border border-red-200 p-2 text-red-600 transition-colors hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  {question.options.map((option) => (
                    <div
                      key={option.id}
                      className={`rounded-lg border px-3 py-2 text-sm ${
                        option.option_label === question.correct_answer
                          ? 'border-green-200 bg-green-50 text-green-900'
                          : 'border-gray-200 bg-gray-50 text-gray-700'
                      }`}
                    >
                      <span className="font-semibold">{option.option_label}.</span> {option.option_text}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && editingQuestion && (
        <QuestionModal
          initialValues={editingQuestion}
          onClose={() => {
            setModalOpen(false);
            setEditingQuestion(null);
          }}
          onSaved={async () => {
            setModalOpen(false);
            setEditingQuestion(null);
            await fetchQuestions(selectedSectionId);
          }}
        />
      )}
    </div>
  );
}

type QuestionModalProps = {
  initialValues: QuestionFormState;
  onClose: () => void;
  onSaved: () => Promise<void>;
};

function QuestionModal({ initialValues, onClose, onSaved }: QuestionModalProps) {
  const [form, setForm] = useState<QuestionFormState>(initialValues);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

    try {
      let questionId = form.id;

      if (form.id) {
        const { error } = await supabase
          .from('questions')
          .update({
            section_id: form.section_id,
            question_number: form.question_number,
            question_text: form.question_text,
            question_image_url: form.question_image_url || null,
            audio_url: form.audio_url || null,
            audio_duration_seconds:
              form.audio_duration_seconds === '' ? null : Number(form.audio_duration_seconds),
            correct_answer: form.correct_answer,
          })
          .eq('id', form.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('questions')
          .insert({
            section_id: form.section_id,
            question_number: form.question_number,
            question_text: form.question_text,
            question_image_url: form.question_image_url || null,
            audio_url: form.audio_url || null,
            audio_duration_seconds:
              form.audio_duration_seconds === '' ? null : Number(form.audio_duration_seconds),
            correct_answer: form.correct_answer,
          })
          .select('id')
          .single();

        if (error) throw error;
        questionId = data.id;
      }

      if (!questionId) {
        throw new Error('Question ID missing after save.');
      }

      const optionPayload = optionLabels.map((label) => ({
        question_id: questionId,
        option_label: label,
        option_text: form.options[label],
      }));

      const { error: optionError } = await supabase.from('question_options').upsert(optionPayload, {
        onConflict: 'question_id,option_label',
      });

      if (optionError) throw optionError;

      await syncSectionQuestionCount(form.section_id);

      await onSaved();
    } catch (error) {
      console.error('Error saving question:', error);
      alert('Failed to save question.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">{form.id ? 'Edit Question' : 'New Question'}</h3>
          <button onClick={onClose} className="text-sm text-gray-500 transition-colors hover:text-gray-700">
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-sm font-medium text-gray-700">
              Number
              <input
                type="number"
                min="1"
                required
                value={form.question_number}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    question_number: Number.parseInt(event.target.value || '1', 10),
                  }))
                }
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>

            <label className="text-sm font-medium text-gray-700">
              Correct answer
              <select
                value={form.correct_answer}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    correct_answer: event.target.value as 'A' | 'B' | 'C' | 'D',
                  }))
                }
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
              >
                {optionLabels.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium text-gray-700">
              Audio duration (seconds)
              <input
                type="number"
                min="0"
                value={form.audio_duration_seconds}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    audio_duration_seconds: event.target.value === '' ? '' : Number(event.target.value),
                  }))
                }
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>
          </div>

          <label className="block text-sm font-medium text-gray-700">
            Question text
            <textarea
              rows={4}
              required
              value={form.question_text}
              onChange={(event) => setForm((prev) => ({ ...prev, question_text: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-gray-700">
              Image URL
              <input
                type="url"
                value={form.question_image_url}
                onChange={(event) => setForm((prev) => ({ ...prev, question_image_url: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>

            <label className="text-sm font-medium text-gray-700">
              Audio URL
              <input
                type="url"
                value={form.audio_url}
                onChange={(event) => setForm((prev) => ({ ...prev, audio_url: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold text-gray-900">Answer options</h4>
            <div className="grid gap-4 md:grid-cols-2">
              {optionLabels.map((label) => (
                <label key={label} className="text-sm font-medium text-gray-700">
                  Option {label}
                  <textarea
                    rows={3}
                    required
                    value={form.options[label]}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        options: {
                          ...prev.options,
                          [label]: event.target.value,
                        },
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {saving ? 'Saving...' : 'Save Question'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

async function syncSectionQuestionCount(sectionId: string) {
  const { count, error: countError } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('section_id', sectionId);

  if (countError) {
    throw countError;
  }

  const { error: updateError } = await supabase
    .from('test_sections')
    .update({ total_questions: count || 0 })
    .eq('id', sectionId);

  if (updateError) {
    throw updateError;
  }
}
