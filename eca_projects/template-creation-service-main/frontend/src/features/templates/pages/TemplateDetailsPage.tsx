import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useBreadcrumb } from '@/app/layout/BreadcrumbContext';
import { templatesApi } from '../api';
import { versionsApi } from '@/features/versions/api';
import { exportVersion } from '@/features/export/api';
import type { TemplateDetail, VersionSummary } from '../types';
import { ActionButton, IconEdit, IconExport } from '@/shared/ui/ActionButtons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/Tooltip';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card, CardContent } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Spinner } from '@/shared/ui/Spinner';
import { TableLoadingOverlay } from '@/shared/ui/TableLoadingOverlay';
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
import { downloadBlobWithDisposition } from '@/shared/lib/download';

function shortHash(hash: string | null | undefined): string {
  if (!hash) return '—';
  return hash.length <= 10 ? hash : `${hash.slice(0, 8)}…`;
}

function badgeVariantForStatus(status: string): 'default' | 'success' | 'warning' | 'neutral' {
  const s = status?.toLowerCase() ?? '';
  if (s === 'active' || s === 'draft') return 'success';
  if (s === 'read_only' || s === 'read only') return 'neutral';
  if (s.includes('error') || s.includes('invalid')) return 'warning';
  return 'default';
}

export default function TemplateDetailsPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const { showToast, showErrorToast } = useToast();
  const breadcrumb = useBreadcrumb();
  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FrontendError | null>(null);
  const [creatingVersion, setCreatingVersion] = useState(false);
  const [exportingVersionId, setExportingVersionId] = useState<string | null>(null);

  const loadTemplate = useCallback(async () => {
    if (!templateId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await templatesApi.getById(templateId);
      setTemplate(data);
    } catch (e) {
      const err = normalizeHttpError(e);
      setError(err);
      setTemplate(null);
      showErrorToast(getErrorMessage(err, true), {
        status: err.status,
        details: getErrorMessage(err, true),
        onRetry: loadTemplate,
      });
    } finally {
      setLoading(false);
    }
  }, [templateId, showErrorToast]);

  useEffect(() => {
    loadTemplate();
  }, [loadTemplate]);

  useEffect(() => {
    if (template != null) {
      breadcrumb?.setBreadcrumb({ templateName: template.name, versionNumber: null });
    }
    return () => {
      breadcrumb?.setBreadcrumb({ templateName: null, versionNumber: null });
    };
  }, [template, breadcrumb]);

  const handleCreateVersion = async () => {
    if (!templateId) return;
    setCreatingVersion(true);
    try {
      await versionsApi.create(templateId, { createdBy: 'system' });
      showToast('New version created.', 'success');
      await loadTemplate();
    } catch (e) {
      const err = normalizeHttpError(e);
      showErrorToast(getErrorMessage(err, true), { status: err.status, details: getErrorMessage(err, true) });
    } finally {
      setCreatingVersion(false);
    }
  };

  const handleExport = useCallback(
    async (versionId: string, versionNumber: number) => {
      setExportingVersionId(versionId);
      try {
        const { blob, contentDisposition } = await exportVersion(versionId);
        const fallback = `${template?.name ?? 'template'}_v${versionNumber}.xlsx`;
        downloadBlobWithDisposition(blob, contentDisposition, fallback);
        showToast('Export downloaded.', 'success');
      } catch (e) {
        const err = normalizeHttpError(e);
        showErrorToast(getErrorMessage(err, true), { status: err.status, details: getErrorMessage(err, true) });
      } finally {
        setExportingVersionId(null);
      }
    },
    [template?.name, showToast, showErrorToast]
  );

  if (!templateId) {
    return (
      <div className="text-sm text-red-600">Missing template ID.</div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">Failed to load template.</p>
        <Button variant="secondary" onClick={loadTemplate}>
          Retry
        </Button>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="text-sm text-neutral-600">Template not found.</div>
    );
  }

  const versions = template.versions ?? [];
  const latestVersionNumber = versions.length > 0
    ? Math.max(...versions.map((v) => v.versionNumber))
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={template.name}
        description={
          <span className="flex items-center gap-1">
            {template.sectorCode}
            {template.status && (
              <>
                <Badge variant={badgeVariantForStatus(template.status)} className="align-middle">
                  {template.status}
                </Badge>
              </>
            )}
          </span>
        }
        rightActions={
          <Button
            type="button"
            onClick={handleCreateVersion}
            disabled={creatingVersion || loading || versions.length === 0}
            title={versions.length === 0 ? 'At least one version must exist to create another.' : undefined}
          >
            {creatingVersion ? (
              <>
                <Spinner className="h-4 w-4" />
                Creating…
              </>
            ) : (
              'Create New Version'
            )}
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <TableLoadingOverlay loading={loading}>
            {versions.length === 0 ? (
              <EmptyState
                title="No versions yet"
                description="Create a new version to get started."
                action={
                  <Button
                    type="button"
                    onClick={handleCreateVersion}
                    disabled={creatingVersion || loading}
                  >
                    {creatingVersion ? (
                      <>
                        <Spinner className="h-4 w-4" />
                        Creating…
                      </>
                    ) : (
                      'Create New Version'
                    )}
                  </Button>
                }
              />
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableTh>Version</TableTh>
                    <TableTh>Status</TableTh>
                    <TableTh>Created</TableTh>
                    <TableTh>Schema hash</TableTh>
                    <TableTh>Actions</TableTh>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {versions.map((v) => (
                    <VersionRow
                      key={v.id}
                      version={v}
                      templateId={templateId}
                      isLatest={latestVersionNumber !== null && v.versionNumber === latestVersionNumber}
                      isExporting={exportingVersionId === v.id}
                      onExport={() => handleExport(v.id, v.versionNumber)}
                    />
                  ))}
                </TableBody>
              </Table>
            )}
          </TableLoadingOverlay>
        </CardContent>
      </Card>
    </div>
  );
}

interface VersionRowProps {
  version: VersionSummary;
  templateId: string;
  isLatest: boolean;
  isExporting: boolean;
  onExport: () => void;
}

function getEditSchemaDisabledReason(
  isLatest: boolean,
  status: string | undefined
): string {
  if (!isLatest) {
    return 'Only the latest version can be edited. Create a new version to edit.';
  }
  const s = (status ?? '').toLowerCase();
  if (s === 'read_only' || s === 'read only') {
    return 'Only versions with status DRAFT can be edited.';
  }
  return 'Only versions with status DRAFT can be edited.';
}

function VersionRow({
  version,
  templateId,
  isLatest,
  isExporting,
  onExport,
}: VersionRowProps) {
  const editSchemaPath = `/templates/${templateId}/versions/${version.id}/schema`;
  const isDraft = (version.status ?? '').toLowerCase() === 'draft';
  const canEditSchema = isLatest && isDraft;
  const editDisabledReason = canEditSchema
    ? null
    : getEditSchemaDisabledReason(isLatest, version.status);

  return (
    <TableRow>
      <TableTd className="font-medium">{version.versionNumber}</TableTd>
      <TableTd>
        <Badge variant={badgeVariantForStatus(version.status)}>
          {version.status ?? '—'}
        </Badge>
      </TableTd>
      <TableTd>{formatIsoDate(version.createdAt)}</TableTd>
      <TableTd className="font-mono text-xs text-neutral-600">
        {shortHash(version.schemaHash)}
      </TableTd>
      <TableTd>
        <span className="flex items-center gap-2">
          {canEditSchema ? (
            <ActionButton
              as="link"
              to={editSchemaPath}
              aria-label="Edit schema"
              label="Edit schema"
            >
              <IconEdit />
            </ActionButton>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="inline-flex h-8 cursor-not-allowed items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-neutral-400"
                  aria-disabled="true"
                  aria-label={editDisabledReason ?? 'Edit schema'}
                >
                  <IconEdit />
                  <span>Edit schema</span>
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" align="center">
                {editDisabledReason}
              </TooltipContent>
            </Tooltip>
          )}
          <ActionButton
            as="button"
            aria-label={isExporting ? 'Exporting…' : 'Export'}
            label="Export"
            onClick={onExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <Spinner className="h-5 w-5 text-neutral-500" />
            ) : (
              <IconExport />
            )}
          </ActionButton>
        </span>
      </TableTd>
    </TableRow>
  );
}
