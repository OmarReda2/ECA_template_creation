import { http } from '@/shared/lib/http';
import type { ExportRequest } from './types';

/**
 * Response from POST /api/versions/{versionId}/export (blob + headers for filename).
 */
export interface ExportResult {
  blob: Blob;
  contentDisposition: string | null;
}

/**
 * Call POST /api/versions/{versionId}/export with optional export settings.
 * Returns the response blob and Content-Disposition header for download filename.
 * Only XLSX format is supported; other formats return 400.
 */
export async function exportVersion(
  versionId: string,
  options?: ExportRequest | null
): Promise<ExportResult> {
  const body = options ?? null;
  const response = await http.post<Blob>(`/api/versions/${versionId}/export`, body, {
    responseType: 'blob',
  });
  const contentDisposition = response.headers['content-disposition'] ?? null;
  return {
    blob: response.data,
    contentDisposition: typeof contentDisposition === 'string' ? contentDisposition : null,
  };
}
