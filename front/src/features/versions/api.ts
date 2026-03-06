import { http } from '@/shared/lib/http';
import type {
  CreateVersionRequest,
  CreateVersionResponse,
  VersionDetail,
} from './types';
import type { UpdateSchemaResponse } from '@/features/schema/types';

export const versionsApi = {
  getById: (versionId: string): Promise<VersionDetail> =>
    http.get(`/api/versions/${versionId}`).then((r) => r.data),

  create: (templateId: string, body: CreateVersionRequest): Promise<CreateVersionResponse> =>
    http.post(`/api/templates/${templateId}/versions`, body).then((r) => r.data),

  updateSchema: (versionId: string, body: unknown): Promise<UpdateSchemaResponse> =>
    http.put(`/api/versions/${versionId}/schema`, body).then((r) => r.data),
};
