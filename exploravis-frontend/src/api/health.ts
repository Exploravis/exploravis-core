import axios from 'axios';
import type { HealthResponse } from '../types/health';

const API_URL: string = import.meta.env.VITE_API_URL || 'https://api.dev-exploravis.mywire.org';

export const healthApi = {
  getHealth: async (): Promise<HealthResponse> => {
    const { data } = await axios.get(`${API_URL}/health`);
    return data;
  },

};
