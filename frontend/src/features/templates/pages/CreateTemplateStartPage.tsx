import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { templatesApi } from '../api';
import { TemplateWizardLayout } from '../components/TemplateWizardLayout';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Spinner } from '@/shared/ui/Spinner';
import { Card, CardContent } from '@/shared/ui/Card';
import { Modal } from '@/shared/ui/Modal';
import { useToast } from '@/shared/ui/Toast';
import {
  normalizeHttpError,
  getErrorMessage,
} from '@/shared/errors/errorTypes';

const PRESET_CARDS = [
  { title: 'Industry Template', description: 'Start from a pre-built industry schema.', badge: 'Coming soon' },
  { title: 'Sector Template', description: 'Use a sector-specific template.', badge: 'Coming soon' },
] as const;

export default function CreateTemplateStartPage() {
  const navigate = useNavigate();
  const { showToast, showErrorToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [sectorCode, setSectorCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const openCreateModal = () => setModalOpen(true);
  const closeCreateModal = () => {
    if (!submitting) setModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedSector = sectorCode.trim();

    if (!trimmedName || !trimmedSector) {
      showErrorToast('Template Name and Sector Code are required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await templatesApi.create({
        name: trimmedName,
        sectorCode: trimmedSector,
        createdBy: 'system',
      });
      showToast('Template created successfully.', 'success');
      setModalOpen(false);
      navigate(`/templates/create/${res.templateId}`);
    } catch (e) {
      const err = normalizeHttpError(e);
      showErrorToast(getErrorMessage(err, true), {
        status: err.status,
        details: getErrorMessage(err, true),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <TemplateWizardLayout
      title="Create Template"
      description="Step 1: Choose how you want to create your template."
    >
      <Card className="border-border bg-neutral-50/50 shadow-sm">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground mb-6">
            Start from a preset or create a custom template with your own name and sector.
          </p>
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 240px), 1fr))' }}
          >
            {PRESET_CARDS.map((preset) => (
              <div
                key={preset.title}
                className="flex flex-col rounded-lg border border-neutral-200 bg-white p-4 opacity-60 cursor-not-allowed select-none"
                aria-disabled="true"
              >
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                  {preset.badge}
                </span>
                <h3 className="mt-2 text-sm font-semibold text-neutral-900">{preset.title}</h3>
                <p className="mt-1 text-xs text-neutral-600">{preset.description}</p>
              </div>
            ))}
            <button
              type="button"
              onClick={openCreateModal}
              className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-300 bg-white p-6 text-left transition-colors hover:border-primary hover:bg-primary/5 hover:border-solid focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Plus className="h-5 w-5" aria-hidden />
              </span>
              <span className="text-sm font-semibold text-neutral-900">Custom Template</span>
              <span className="text-xs text-neutral-600">Name and sector code</span>
            </button>
          </div>
        </CardContent>
      </Card>

      <Modal open={modalOpen} title="Create custom template" onClose={closeCreateModal}>
        <form id="create-template-form" onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
          <div>
            <label htmlFor="create-name" className="mb-1 block text-sm font-medium text-neutral-700">
              Template Name <span className="text-red-600">*</span>
            </label>
            <Input
              id="create-name"
              type="text"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              required
              maxLength={255}
              placeholder="Template name"
              disabled={submitting}
            />
          </div>
          <div>
            <label htmlFor="create-sectorCode" className="mb-1 block text-sm font-medium text-neutral-700">
              Sector Code <span className="text-red-600">*</span>
            </label>
            <Input
              id="create-sectorCode"
              type="text"
              value={sectorCode}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSectorCode(e.target.value)}
              required
              maxLength={64}
              placeholder="e.g. FIN"
              disabled={submitting}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeCreateModal} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Spinner className="h-4 w-4" />
                  Creating…
                </>
              ) : (
                'Create'
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </TemplateWizardLayout>
  );
}
