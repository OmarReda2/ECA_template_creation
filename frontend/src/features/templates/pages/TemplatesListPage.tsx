import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { templatesApi } from '../api';
import type { CreateTemplateResponse, TemplateSummary } from '../types';
import { ActionButton, IconView } from '@/shared/ui/ActionButtons';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { Spinner } from '@/shared/ui/Spinner';
import { TableLoadingOverlay } from '@/shared/ui/TableLoadingOverlay';
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

function templateStatusBadgeVariant(
  status: string
): 'default' | 'success' | 'warning' | 'neutral' {
  const s = status?.toLowerCase() ?? '';
  if (s === 'active' || s === 'draft') return 'success';
  if (s === 'read_only' || s === 'read only') return 'neutral';
  if (s.includes('error') || s.includes('invalid')) return 'warning';
  return 'default';
}

/** Form state lives here so parent re-renders on keystroke don't remount modal content and steal focus. */
function CreateTemplateForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: (res: CreateTemplateResponse) => void;
  onCancel: () => void;
}) {
  const { showToast, showErrorToast } = useToast();
  const [name, setName] = useState('');
  const [sectorCode, setSectorCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedSector = sectorCode.trim();
    if (!trimmedName || !trimmedSector) return;
    setSubmitting(true);
    try {
      const res = await templatesApi.create({
        name: trimmedName,
        sectorCode: trimmedSector,
        createdBy: 'system',
      });
      showToast('Template created successfully.', 'success');
      onSuccess(res);
    } catch (e) {
      const err = normalizeHttpError(e);
      showErrorToast(getErrorMessage(err, true), { status: err.status, details: getErrorMessage(err, true) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
  const { showErrorToast } = useToast();
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
      const err = normalizeHttpError(e);
      setError(err);
      showErrorToast(getErrorMessage(err, true), {
        status: err.status,
        details: getErrorMessage(err, true),
        onRetry: loadTemplates,
      });
    } finally {
      setLoading(false);
    }
  }, [showErrorToast]);

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
        rightActions={
          <Button type="button" onClick={openCreate} disabled={loading}>
            Create Template
          </Button>
        }
      />

      {error ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">Failed to load templates.</p>
          <Button variant="secondary" onClick={loadTemplates}>
            Retry
          </Button>
        </div>
      ) : (
      <Card>
        <CardContent className="pt-6">
          {templates.length === 0 && !loading ? (
            <EmptyState
              title="No templates yet"
              description="Create your first template to get started."
              action={
                <Button type="button" onClick={openCreate}>
                  Create Template
                </Button>
              }
            />
          ) : templates.length === 0 && loading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : (
            <TableLoadingOverlay loading={loading}>
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
                    <TableTd>
                      <Badge variant="neutral">{t.sectorCode}</Badge>
                    </TableTd>
                    <TableTd>
                      {t.latestVersion != null ? `v${t.latestVersion.versionNumber}` : '—'}
                    </TableTd>
                    <TableTd>
                      {t.latestVersion?.status != null && t.latestVersion.status !== '' ? (
                        <Badge variant={templateStatusBadgeVariant(t.latestVersion.status)}>
                          {t.latestVersion.status}
                        </Badge>
                      ) : (
                        '—'
                      )}
                    </TableTd>
                    <TableTd>
                      {t.latestVersion?.createdAt
                        ? formatIsoDate(t.latestVersion.createdAt)
                        : '—'}
                    </TableTd>
                    <TableTd>
                      <ActionButton
                        as="link"
                        to={`/templates/${t.templateId}`}
                        aria-label={`View template ${t.name}`}
                        label="View"
                      >
                        <IconView />
                      </ActionButton>
                    </TableTd>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </TableLoadingOverlay>
          )}
        </CardContent>
      </Card>
      )}

      <Modal open={createOpen} onClose={closeCreate} title="Create Template">
        <CreateTemplateForm onSuccess={handleCreateSuccess} onCancel={closeCreate} />
      </Modal>
    </div>
  );
}
