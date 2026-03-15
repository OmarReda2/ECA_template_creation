import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { templatesApi } from '../api';
import type { TemplateSummary } from '../types';
import { ActionButton, IconView } from '@/shared/ui/ActionButtons';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
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

export default function TemplatesListPage() {
  const navigate = useNavigate();
  const { showErrorToast } = useToast();
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FrontendError | null>(null);
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

  const goToCreate = () => navigate('/templates/create');

  const showTopCreateButton = templates.length > 0 && !loading;

  return (
    <div className="space-y-6">
      <PageHeader
        rightActions={
          showTopCreateButton ? (
            <Button type="button" onClick={goToCreate} disabled={loading}>
              Create Template
            </Button>
          ) : undefined
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
                <Button type="button" onClick={goToCreate}>
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
    </div>
  );
}
