import { http } from '@/shared/lib/http';
import type {
  SubmissionDetails,
  SubmissionHistoryItem,
  SubmissionIdentifyResponse,
  SubmissionValidationResponse,
} from './types';

export const submissionApi = {
  list: async (): Promise<SubmissionHistoryItem[]> => {
    const response = await http.get('/api/submissions');
    return response.data;
  },
  getById: async (submissionId: string): Promise<SubmissionDetails> => {
    const response = await http.get(`/api/submissions/${submissionId}`);
    return response.data;
  },
  identify: async (file: File): Promise<SubmissionIdentifyResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await http.post('/api/submissions/identify', formData);
    return response.data;
  },
  validateWorkbook: async (
    file: File,
    options?: { templateId?: string | null }
  ): Promise<SubmissionValidationResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.templateId) {
      formData.append('templateId', options.templateId);
    }
    const response = await http.post('/api/submissions/validate', formData);
    return response.data;
  },
};
