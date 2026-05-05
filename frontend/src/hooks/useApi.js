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
      const message = error.response?.data?.message || 'Something went wrong';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, request };
};
