export type SubmissionIdentifyStatus =
  | 'EXACT_MATCH'
  | 'METADATA_MISSING'
  | 'METADATA_INVALID'
  | 'VERSION_NOT_FOUND'
  | 'HASH_MISMATCH'
  | 'UNSUPPORTED_FILE';

export interface SubmissionMetadata {
  templateId: string | null;
  versionId: string | null;
  versionNumber: string | null;
  schemaHash: string | null;
  generatedAt: string | null;
  generatorVersion: string | null;
}

export interface SubmissionResolvedVersion {
  templateId: string;
  templateName: string;
  versionId: string;
  versionNumber: number;
  schemaHash: string;
}

export interface SubmissionIdentifyResponse {
  status: SubmissionIdentifyStatus;
  metadata: SubmissionMetadata | null;
  resolvedVersion: SubmissionResolvedVersion | null;
  messages: string[];
}
