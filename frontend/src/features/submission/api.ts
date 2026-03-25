import { http } from '@/shared/lib/http';
import type { SubmissionHistoryItem, SubmissionIdentifyResponse, SubmissionValidationResponse } from './types';

export const submissionApi = {
  list: async (): Promise<SubmissionHistoryItem[]> => {
    const response = await http.get('/api/submissions');
    return response.data;
  },
  identify: async (file: File): Promise<SubmissionIdentifyResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await http.post('/api/submissions/identify', formData);
    return response.data;
  },
  validateWorkbook: async (file: File): Promise<SubmissionValidationResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await http.post('/api/submissions/validate', formData);
    return response.data;
  },
};
