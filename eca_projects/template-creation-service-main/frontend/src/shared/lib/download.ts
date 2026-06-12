/**
 * Parse filename from Content-Disposition header (attachment; filename="..."; filename*=UTF-8''...).
 * Returns null if not found or unparseable.
 */
export function parseFilenameFromContentDisposition(header: string | null | undefined): string | null {
  if (!header || typeof header !== 'string') return null;
  // filename*=UTF-8''encoded (RFC 5987) takes precedence
  const starMatch = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (starMatch) {
    try {
      return decodeURIComponent(starMatch[1].replace(/"/g, ''));
    } catch {
      // ignore decode errors
    }
  }
  // filename="..." or filename=...
  const quoted = header.match(/filename="([^"]*)"/i);
  if (quoted) return quoted[1].trim() || null;
  const unquoted = header.match(/filename=([^;]+)/i);
  if (unquoted) return unquoted[1].trim().replace(/^"|"$/g, '') || null;
  return null;
}

/**
 * Trigger a file download from a Blob (e.g. XLSX export).
 * Creates an object URL, triggers download with the given filename, then revokes the URL.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download a blob using filename from Content-Disposition when present,
 * otherwise use fallbackFilename (e.g. "templateName_v1.xlsx").
 */
export function downloadBlobWithDisposition(
  blob: Blob,
  contentDisposition: string | null | undefined,
  fallbackFilename: string
): void {
  const filename = parseFilenameFromContentDisposition(contentDisposition) ?? fallbackFilename;
  downloadBlob(blob, filename);
}
