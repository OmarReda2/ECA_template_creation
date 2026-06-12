import { http } from '@/shared/lib/http';
import type { SchemaDefinition, UpdateSchemaResponse } from './types';

export const schemaApi = {
  update: (versionId: string, body: SchemaDefinition): Promise<UpdateSchemaResponse> =>
    http.put(`/api/versions/${versionId}/schema`, body).then((r) => r.data),
};
