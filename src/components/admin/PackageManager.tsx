import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { BookCopy, ChevronDown, ChevronUp, Eye, EyeOff, FolderPlus, Plus, Trash2, Pencil } from 'lucide-react';
import { supabase, TestPackage, TestSection } from '../../lib/supabase';

type SectionMap = Record<string, TestSection[]>;

type PackageFormState = {
  id?: string;
  title: string;
  description: string;
  duration_minutes: number;
};

type SectionFormState = {
  id?: string;
  package_id: string;
  title: string;
  section_order: number;
  total_questions: number;
  duration_minutes: number;
};

const emptyPackageForm: PackageFormState = {
  title: '',
  description: '',
  duration_minutes: 120,
};

export function PackageManager() {
  const [packages, setPackages] = useState<TestPackage[]>([]);
  const [sectionsByPackage, setSectionsByPackage] = useState<SectionMap>({});
  const [loading, setLoading] = useState(true);
  const [packageModalOpen, setPackageModalOpen] = useState(false);
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<PackageFormState | null>(null);
  const [editingSection, setEditingSection] = useState<SectionFormState | null>(null);
  const [expandedPackageId, setExpandedPackageId] = useState<string | null>(null);
  const [activePackageId, setActivePackageId] = useState<string | null>(null);

  useEffect(() => {
    void fetchPackages();
  }, []);

  const sortedPackages = useMemo(
    () => [...packages].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)),
    [packages]
  );

  const fetchPackages = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase.from('test_packages').select('*');

      if (error) throw error;
      setPackages(data || []);
    } catch (error) {
      console.error('Error fetching packages:', error);
      alert('Failed to load test packages.');
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

      setSectionsByPackage((prev) => ({
        ...prev,
        [packageId]: data || [],
      }));
    } catch (error) {
      console.error('Error fetching sections:', error);
      alert('Failed to load sections.');
    }
  };

  const togglePackage = async (packageId: string) => {
    const nextExpanded = expandedPackageId === packageId ? null : packageId;
    setExpandedPackageId(nextExpanded);

    if (nextExpanded) {
      await fetchSections(nextExpanded);
    }
  };

  const handleToggleActive = async (pkg: TestPackage) => {
    try {
      const { error } = await supabase
        .from('test_packages')
        .update({ is_active: !pkg.is_active })
        .eq('id', pkg.id);

      if (error) throw error;

      setPackages((prev) =>
        prev.map((item) => (item.id === pkg.id ? { ...item, is_active: !item.is_active } : item))
      );
    } catch (error) {
      console.error('Error toggling package:', error);
      alert('Failed to update package visibility.');
    }
  };

  const handleDeletePackage = async (packageId: string) => {
    if (!confirm('Delete this package and all its sections and questions?')) return;

    try {
      const { error } = await supabase.from('test_packages').delete().eq('id', packageId);

      if (error) throw error;

      setPackages((prev) => prev.filter((item) => item.id !== packageId));
      setSectionsByPackage((prev) => {
        const next = { ...prev };
        delete next[packageId];
        return next;
      });
      if (expandedPackageId === packageId) {
        setExpandedPackageId(null);
      }
    } catch (error) {
      console.error('Error deleting package:', error);
      alert('Failed to delete package.');
    }
  };

  const handleDeleteSection = async (sectionId: string, packageId: string) => {
    if (!confirm('Delete this section and all questions inside it?')) return;

    try {
      const { error } = await supabase.from('test_sections').delete().eq('id', sectionId);

      if (error) throw error;

      await fetchSections(packageId);
    } catch (error) {
      console.error('Error deleting section:', error);
      alert('Failed to delete section.');
    }
  };

  if (loading) {
    return <div className="admin-surface p-8 text-center">Loading packages...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Test Packages</h2>
          <p className="text-sm text-gray-600">Manage package metadata and section structure.</p>
        </div>
        <button
          onClick={() => {
            setEditingPackage(emptyPackageForm);
            setPackageModalOpen(true);
          }}
          className="primary-btn w-full sm:w-auto"
        >
          <FolderPlus className="h-4 w-4" />
          Add Package
        </button>
      </div>

      <div className="grid gap-4">
        {sortedPackages.map((pkg) => {
          const sections = sectionsByPackage[pkg.id] || [];
          const isExpanded = expandedPackageId === pkg.id;

          return (
            <div key={pkg.id} className="admin-surface render-lite overflow-hidden">
              <div className="flex flex-col gap-4 p-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-semibold text-gray-900">{pkg.title}</h3>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        pkg.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {pkg.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="max-w-3xl text-sm text-gray-600">
                    {pkg.description || 'No description provided yet.'}
                  </p>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    <span>Duration: {pkg.duration_minutes} minutes</span>
                    <span>Sections loaded: {sections.length}</span>
                    <span>Created: {new Date(pkg.created_at).toLocaleString()}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  <button
                    onClick={() => void handleToggleActive(pkg)}
                    className="rounded-lg border border-gray-200 p-2 text-gray-600 transition-colors hover:bg-gray-50"
                    title={pkg.is_active ? 'Hide from participants' : 'Show to participants'}
                  >
                    {pkg.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => {
                      setEditingPackage({
                        id: pkg.id,
                        title: pkg.title,
                        description: pkg.description || '',
                        duration_minutes: pkg.duration_minutes,
                      });
                      setPackageModalOpen(true);
                    }}
                    className="rounded-lg border border-blue-200 p-2 text-blue-600 transition-colors hover:bg-blue-50"
                    title="Edit package"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => void handleDeletePackage(pkg.id)}
                    className="rounded-lg border border-red-200 p-2 text-red-600 transition-colors hover:bg-red-50"
                    title="Delete package"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      void togglePackage(pkg.id);
                    }}
                    className="secondary-btn col-span-2 sm:col-span-1"
                  >
                    <BookCopy className="h-4 w-4" />
                    Manage Sections
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-[rgba(119,123,179,0.12)] bg-[#f8f9ff] p-6">
                  <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">Sections in this package</h4>
                      <p className="text-sm text-gray-600">Set order, question totals, and time allocation.</p>
                    </div>
                    <button
                      onClick={() => {
                        setActivePackageId(pkg.id);
                        setEditingSection({
                          package_id: pkg.id,
                          title: '',
                          section_order: sections.length + 1,
                          total_questions: 0,
                          duration_minutes: 30,
                        });
                        setSectionModalOpen(true);
                      }}
                      className="primary-btn w-full sm:w-auto"
                    >
                      <Plus className="h-4 w-4" />
                      Add Section
                    </button>
                  </div>

                  <div className="grid gap-3">
                    {sections.length === 0 && (
                      <div className="admin-soft-surface p-6 text-center text-sm text-gray-600">
                        No sections yet. Add at least Listening, Structure, and Reading before publishing.
                      </div>
                    )}

                    {sections.map((section) => (
                      <div key={section.id} className="admin-soft-surface p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div className="space-y-1">
                            <div className="text-base font-semibold text-gray-900">{section.title}</div>
                            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                              <span>Order: {section.section_order}</span>
                              <span>Questions: {section.total_questions}</span>
                              <span>Duration: {section.duration_minutes} minutes</span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setActivePackageId(pkg.id);
                                setEditingSection({
                                  id: section.id,
                                  package_id: pkg.id,
                                  title: section.title,
                                  section_order: section.section_order,
                                  total_questions: section.total_questions,
                                  duration_minutes: section.duration_minutes,
                                });
                                setSectionModalOpen(true);
                              }}
                              className="rounded-lg border border-blue-200 p-2 text-blue-600 transition-colors hover:bg-blue-50"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => void handleDeleteSection(section.id, pkg.id)}
                              className="rounded-lg border border-red-200 p-2 text-red-600 transition-colors hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {sortedPackages.length === 0 && (
          <div className="admin-surface p-10 text-center text-gray-600">
            No test packages yet. Start by creating one package and its sections.
          </div>
        )}
      </div>

      {packageModalOpen && editingPackage && (
        <PackageModal
          initialValues={editingPackage}
          onClose={() => {
            setPackageModalOpen(false);
            setEditingPackage(null);
          }}
          onSaved={async () => {
            setPackageModalOpen(false);
            setEditingPackage(null);
            await fetchPackages();
          }}
        />
      )}

      {sectionModalOpen && editingSection && activePackageId && (
        <SectionModal
          initialValues={editingSection}
          onClose={() => {
            setSectionModalOpen(false);
            setEditingSection(null);
            setActivePackageId(null);
          }}
          onSaved={async () => {
            setSectionModalOpen(false);
            setEditingSection(null);
            await fetchSections(activePackageId);
          }}
        />
      )}
    </div>
  );
}

type PackageModalProps = {
  initialValues: PackageFormState;
  onClose: () => void;
  onSaved: () => Promise<void>;
};

function PackageModal({ initialValues, onClose, onSaved }: PackageModalProps) {
  const [form, setForm] = useState<PackageFormState>(initialValues);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

    try {
      if (form.id) {
        const { error } = await supabase
          .from('test_packages')
          .update({
            title: form.title,
            description: form.description,
            duration_minutes: form.duration_minutes,
          })
          .eq('id', form.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('test_packages').insert({
          title: form.title,
          description: form.description,
          duration_minutes: form.duration_minutes,
          is_active: false,
        });

        if (error) throw error;
      }

      await onSaved();
    } catch (error) {
      console.error('Error saving package:', error);
      alert('Failed to save package.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title={form.id ? 'Edit Package' : 'New Package'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">
          Title
          <input
            type="text"
            required
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </label>

        <label className="block text-sm font-medium text-gray-700">
          Description
          <textarea
            rows={4}
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </label>

        <label className="block text-sm font-medium text-gray-700">
          Duration (minutes)
          <input
            type="number"
            min="1"
            required
            value={form.duration_minutes}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                duration_minutes: Number.parseInt(event.target.value || '0', 10),
              }))
            }
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </label>

        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
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
            {saving ? 'Saving...' : 'Save Package'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

type SectionModalProps = {
  initialValues: SectionFormState;
  onClose: () => void;
  onSaved: () => Promise<void>;
};

function SectionModal({ initialValues, onClose, onSaved }: SectionModalProps) {
  const [form, setForm] = useState<SectionFormState>(initialValues);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

    try {
      if (form.id) {
        const { error } = await supabase
          .from('test_sections')
          .update({
            title: form.title,
            section_order: form.section_order,
            total_questions: form.total_questions,
            duration_minutes: form.duration_minutes,
          })
          .eq('id', form.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('test_sections').insert({
          package_id: form.package_id,
          title: form.title,
          section_order: form.section_order,
          total_questions: form.total_questions,
          duration_minutes: form.duration_minutes,
        });

        if (error) throw error;
      }

      await onSaved();
    } catch (error) {
      console.error('Error saving section:', error);
      alert('Failed to save section.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title={form.id ? 'Edit Section' : 'New Section'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">
          Section title
          <input
            type="text"
            required
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="block text-sm font-medium text-gray-700">
            Order
            <input
              type="number"
              min="1"
              required
              value={form.section_order}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  section_order: Number.parseInt(event.target.value || '1', 10),
                }))
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Total questions
            <input
              type="number"
              min="0"
              required
              value={form.total_questions}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  total_questions: Number.parseInt(event.target.value || '0', 10),
                }))
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Duration
            <input
              type="number"
              min="1"
              required
              value={form.duration_minutes}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  duration_minutes: Number.parseInt(event.target.value || '1', 10),
                }))
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>
        </div>

        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
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
            {saving ? 'Saving...' : 'Save Section'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

type ModalShellProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

function ModalShell({ title, onClose, children }: ModalShellProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center sm:p-4">
      <div className="admin-surface max-h-[90vh] w-full max-w-xl overflow-y-auto p-4 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-sm text-gray-500 transition-colors hover:text-gray-700">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

