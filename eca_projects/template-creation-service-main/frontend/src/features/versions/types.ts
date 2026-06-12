/** Mirrors backend DTOs for versions. */

export interface CreateVersionRequest {
  createdBy: string;
}

export interface CreateVersionResponse {
  versionId: string;
  versionNumber: number;
}

export interface VersionDetail {
  id: string;
  templateId: string;
  versionNumber: number;
  status: string;
  schemaJson: unknown;
  schemaHash: string;
  createdAt: string;
  createdBy: string;
}
