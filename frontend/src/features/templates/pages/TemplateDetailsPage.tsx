import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { templatesApi } from '../api';
import { versionsApi } from '@/features/versions/api';
import { exportVersion } from '@/features/export/api';
import type { TemplateDetail, VersionSummary } from '../types';
import { ActionButton, IconEdit, IconExport } from '@/shared/ui/ActionButtons';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorPanel } from '@/shared/errors/ErrorPanel';
import { Spinner } from '@/shared/ui/Spinner';
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
  const { showToast } = useToast();
  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FrontendError | null>(null);
  const [creatingVersion, setCreatingVersion] = useState(false);
  const [createError, setCreateError] = useState<FrontendError | null>(null);
  const [exportingVersionId, setExportingVersionId] = useState<string | null>(null);

  const loadTemplate = useCallback(async () => {
    if (!templateId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await templatesApi.getById(templateId);
      setTemplate(data);
    } catch (e) {
      setError(normalizeHttpError(e));
      setTemplate(null);
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    loadTemplate();
  }, [loadTemplate]);

  const handleCreateVersion = async () => {
    if (!templateId) return;
    setCreatingVersion(true);
    setCreateError(null);
    try {
      await versionsApi.create(templateId, { createdBy: 'system' });
      showToast('New version created.', 'success');
      await loadTemplate();
    } catch (e) {
      setCreateError(normalizeHttpError(e));
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
        showToast(getErrorMessage(err, true), 'error');
      } finally {
        setExportingVersionId(null);
      }
    },
    [template?.name, showToast]
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
      <div className="space-y-4">
        <ErrorPanel
          error={getErrorMessage(error, true)}
          onDismiss={() => setError(null)}
        />
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
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">{template.name}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {template.sectorCode}
            {template.status && (
              <>
                {' · '}
                <Badge variant={badgeVariantForStatus(template.status)} className="align-middle">
                  {template.status}
                </Badge>
              </>
            )}
          </p>
        </div>
        <Button
          type="button"
          onClick={handleCreateVersion}
          disabled={creatingVersion || versions.length === 0}
          title={versions.length === 0 ? 'At least one version must exist to create another.' : undefined}
        >
          {creatingVersion ? 'Creating…' : 'Create New Version'}
        </Button>
      </div>

      {createError && (
        <ErrorPanel
          error={getErrorMessage(createError, true)}
          onDismiss={() => setCreateError(null)}
        />
      )}

      {/* Versions table */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-neutral-700">Versions</h2>
        {versions.length === 0 ? (
          <EmptyState
            title="No versions yet"
            description="Create a new version to get started."
            action={
              <Button
                type="button"
                onClick={handleCreateVersion}
                disabled={creatingVersion}
              >
                Create New Version
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
      </div>
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

function VersionRow({
  version,
  templateId,
  isLatest,
  isExporting,
  onExport,
}: VersionRowProps) {
  const editSchemaPath = `/templates/${templateId}/versions/${version.id}/schema`;
  const editDisabled = !isLatest;
  const editTitle = isLatest
    ? 'Edit schema'
    : 'Only the latest version can be edited. Create a new version to edit.';

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
          {editDisabled ? (
            <span
              title={editTitle}
              className="inline-flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-md text-neutral-400"
              aria-disabled="true"
              aria-label={editTitle}
            >
              <IconEdit />
            </span>
          ) : (
            <ActionButton as="link" to={editSchemaPath} aria-label="Edit schema">
              <IconEdit />
            </ActionButton>
          )}
          <ActionButton
            as="button"
            aria-label={isExporting ? 'Exporting…' : 'Export'}
            onClick={onExport}
            disabled={isExporting}
          >
            <IconExport />
          </ActionButton>
        </span>
      </TableTd>
    </TableRow>
  );
}
