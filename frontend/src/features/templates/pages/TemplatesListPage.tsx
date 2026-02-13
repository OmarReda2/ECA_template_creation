import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { templatesApi } from '../api';
import type { CreateTemplateResponse, TemplateSummary } from '../types';
import { ActionButton, IconView } from '@/shared/ui/ActionButtons';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Input } from '@/shared/ui/Input';
import { ErrorPanel } from '@/shared/errors/ErrorPanel';
import { Modal } from '@/shared/ui/Modal';
import { Spinner } from '@/shared/ui/Spinner';
import { Card, CardContent } from '@/shared/ui/Card';
import { PageHeader } from '@/shared/ui/PageHeader';
import {
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
} from '@/shared/ui/Table';
import { useToast } from '@/shared/ui/Toast';
import {
  normalizeHttpError,
  getErrorMessage,
  type FrontendError,
} from '@/shared/errors/errorTypes';
import { formatIsoDate } from '@/shared/lib/format';

/** Form state lives here so parent re-renders on keystroke don't remount modal content and steal focus. */
function CreateTemplateForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: (res: CreateTemplateResponse) => void;
  onCancel: () => void;
}) {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [sectorCode, setSectorCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<FrontendError | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedSector = sectorCode.trim();
    if (!trimmedName || !trimmedSector) return;
    setSubmitting(true);
    setCreateError(null);
    try {
      const res = await templatesApi.create({
        name: trimmedName,
        sectorCode: trimmedSector,
        createdBy: 'system',
      });
      showToast('Template created successfully.', 'success');
      onSuccess(res);
    } catch (e) {
      setCreateError(normalizeHttpError(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {createError && (
        <ErrorPanel
          error={getErrorMessage(createError, true)}
          onDismiss={() => setCreateError(null)}
        />
      )}
      <div>
        <label htmlFor="create-name" className="mb-1 block text-sm font-medium text-neutral-700">
          Name <span className="text-red-600">*</span>
        </label>
        <Input
          id="create-name"
          type="text"
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          required
          maxLength={255}
          placeholder="Template name"
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
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
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
  );
}

export default function TemplatesListPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FrontendError | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await templatesApi.list();
      setTemplates(list);
    } catch (e) {
      setError(normalizeHttpError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const openCreate = () => setCreateOpen(true);

  const closeCreate = useCallback(() => setCreateOpen(false), []);

  const handleCreateSuccess = useCallback(
    (res: CreateTemplateResponse) => {
      closeCreate();
      navigate(`/templates/${res.templateId}`);
      loadTemplates();
    },
    [closeCreate, navigate, loadTemplates]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Templates"
        rightActions={
          <Button type="button" onClick={openCreate}>
            Create Template
          </Button>
        }
      />

      {error && (
        <ErrorPanel
          error={getErrorMessage(error, true)}
          onDismiss={() => setError(null)}
        />
      )}

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : templates.length === 0 ? (
            <EmptyState
              title="No templates yet"
              description="Create your first template to get started."
              action={
                <Button type="button" onClick={openCreate}>
                  Create Template
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableTh>Name</TableTh>
                  <TableTh>Sector Code</TableTh>
                  <TableTh>Latest Version</TableTh>
                  <TableTh>Latest Status</TableTh>
                  <TableTh>Last Updated</TableTh>
                  <TableTh>Actions</TableTh>
                </TableRow>
              </TableHead>
              <TableBody>
                {templates.map((t) => (
                  <TableRow key={t.templateId}>
                    <TableTd className="font-medium text-neutral-900">{t.name}</TableTd>
                    <TableTd>{t.sectorCode}</TableTd>
                    <TableTd>
                      {t.latestVersion != null ? `v${t.latestVersion.versionNumber}` : '—'}
                    </TableTd>
                    <TableTd>{t.latestVersion?.status ?? '—'}</TableTd>
                    <TableTd>
                      {t.latestVersion?.createdAt
                        ? formatIsoDate(t.latestVersion.createdAt)
                        : '—'}
                    </TableTd>
                    <TableTd>
                      <ActionButton as="link" to={`/templates/${t.templateId}`} aria-label={`View template ${t.name}`}>
                        <IconView />
                      </ActionButton>
                    </TableTd>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Modal open={createOpen} onClose={closeCreate} title="Create Template">
        <CreateTemplateForm onSuccess={handleCreateSuccess} onCancel={closeCreate} />
      </Modal>
    </div>
  );
}
