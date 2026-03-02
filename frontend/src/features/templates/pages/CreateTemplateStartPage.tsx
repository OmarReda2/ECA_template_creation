import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { templatesApi } from '../api';
import { TemplateWizardLayout } from '../components/TemplateWizardLayout';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Spinner } from '@/shared/ui/Spinner';
import { Card, CardContent } from '@/shared/ui/Card';
import { useToast } from '@/shared/ui/Toast';
import {
  normalizeHttpError,
  getErrorMessage,
} from '@/shared/errors/errorTypes';

export default function CreateTemplateStartPage() {
  const navigate = useNavigate();
  const { showToast, showErrorToast } = useToast();
  const [name, setName] = useState('');
  const [sectorCode, setSectorCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
      description="Step 1: Enter template name and sector code."
    >
      <Card>
        <CardContent className="pt-6">
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
            <div className="flex justify-end pt-2">
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
        </CardContent>
      </Card>
    </TemplateWizardLayout>
  );
}
