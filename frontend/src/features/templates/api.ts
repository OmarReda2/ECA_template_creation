import { http } from '@/shared/lib/http';
import type { CreateTemplateRequest, CreateTemplateResponse, TemplateDetail, TemplateSummary } from './types';

const BASE = '/api/templates';

/** List all templates (GET /api/templates). Dashboard summary with latestVersion per template. */
export function listTemplates(): Promise<TemplateSummary[]> {
  return http.get<TemplateSummary[]>(BASE).then((r) => r.data);
}

export const templatesApi = {
  list: listTemplates,

  getById: (templateId: string): Promise<TemplateDetail> =>
    http.get(`${BASE}/${templateId}`).then((r) => r.data),

  create: (body: CreateTemplateRequest): Promise<CreateTemplateResponse> =>
    http.post(BASE, body).then((r) => r.data),
};
