import { http } from '@/shared/lib/http';
import type { SubmissionIdentifyResponse } from './types';

export const submissionApi = {
  identify: async (file: File): Promise<SubmissionIdentifyResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await http.post('/api/submissions/identify', formData, {
      headers: { 'Content-Type': undefined },
    });
    return response.data;
  },
};
