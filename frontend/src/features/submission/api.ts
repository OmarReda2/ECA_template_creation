import { http } from '@/shared/lib/http';
import type { SubmissionIdentifyResponse, SubmissionValidationResponse } from './types';

export const submissionApi = {
  identify: async (file: File): Promise<SubmissionIdentifyResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await http.post('/api/submissions/identify', formData, {
      headers: { 'Content-Type': undefined },
    });
    return response.data;
  },
  validateWorkbook: async (file: File): Promise<SubmissionValidationResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await http.post('/api/submissions/validate-structure', formData, {
      headers: { 'Content-Type': undefined },
    });
    return response.data;
  },
};
