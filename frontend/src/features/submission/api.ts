import { http } from '@/shared/lib/http';
import type { SubmissionIdentifyResponse, SubmissionValidationResponse } from './types';

export const submissionApi = {
  identify: async (file: File): Promise<SubmissionIdentifyResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await http.post('/api/submissions/identify', formData);
    return response.data;
  },
  validateWorkbook: async (file: File): Promise<SubmissionValidationResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await http.post('/api/submissions/validate-structure', formData);
    return response.data;
  },
};
