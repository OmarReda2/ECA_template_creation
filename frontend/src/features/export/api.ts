import { http } from '@/shared/lib/http';

/**
 * Response from POST /api/versions/{versionId}/export (blob + headers for filename).
 */
export interface ExportResult {
  blob: Blob;
  contentDisposition: string | null;
}

/**
 * Call POST /api/versions/{versionId}/export.
 * Returns the response blob and Content-Disposition header for download filename.
 */
export async function exportVersion(versionId: string): Promise<ExportResult> {
  const response = await http.post<Blob>(`/api/versions/${versionId}/export`, null, {
    responseType: 'blob',
  });
  const contentDisposition = response.headers['content-disposition'] ?? null;
  return {
    blob: response.data,
    contentDisposition: typeof contentDisposition === 'string' ? contentDisposition : null,
  };
}
