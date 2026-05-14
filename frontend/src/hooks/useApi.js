import { useState, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

export const useApi = () => {
  const [loading, setLoading] = useState(false);

  const request = useCallback(async (method, url, data = null, config = {}) => {
    setLoading(true);
    try {
      const response = await api({ method, url, data, ...config });
      return response.data;
    } catch (error) {
      let message = error.response?.data?.message || 'Something went wrong';
      const errors = error.response?.data?.errors;
      
      if (errors && Array.isArray(errors)) {
        message = errors.map(e => e.message || e).join('; ');
      } else if (error.response?.data?.error) {
        message = error.response.data.error;
      }
      
      if (error.response?.status !== 401) {
        toast.error(message);
      }
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, request };
};
