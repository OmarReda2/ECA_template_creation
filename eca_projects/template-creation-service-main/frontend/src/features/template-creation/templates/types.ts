/** Mirrors backend DTOs for templates. */

export interface CreateTemplateRequest {
  name: string;
  sectorCode: string;
  createdBy: string;
}

export interface CreateTemplateResponse {
  templateId: string;
  versionId: string;
  versionNumber: number;
}

/** Latest version summary in GET /api/templates response. */
export interface LatestVersionSummary {
  versionId: string;
  versionNumber: number;
  status: string;
  createdAt: string;
  createdBy: string;
  schemaHash: string;
}

/** Template summary for GET /api/templates (dashboard list). */
export interface TemplateSummary {
  templateId: string;
  name: string;
  sectorCode: string;
  status: string;
  createdAt: string;
  createdBy: string;
  latestVersion: LatestVersionSummary | null;
}

export interface VersionSummary {
  id: string;
  versionNumber: number;
  status: string;
  createdAt: string;
  /** Present when backend includes it in template detail response. */
  schemaHash?: string | null;
}

export interface TemplateDetail {
  id: string;
  name: string;
  sectorCode: string;
  status: string;
  createdAt: string;
  createdBy: string;
  versions: VersionSummary[];
}
