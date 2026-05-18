import { useEffect } from 'react';
import axios from 'axios';

/**
 * KeepAlive component pings the backend every 14 minutes
 * to prevent Render free tier from spinning down.
 */
const KeepAlive = () => {
  useEffect(() => {
    const ping = () => {
      const apiBase = import.meta.env.VITE_API_URL || '/api';
      const url = `${apiBase.replace(/\/$/, '')}/health`;
      axios.get(url).catch(() => {});
    };

    // Ping every 14 minutes (Render sleeps after 15m)
    const interval = setInterval(ping, 14 * 60 * 1000);
    ping(); // Initial ping

    return () => clearInterval(interval);
  }, []);

  return null;
};

export default KeepAlive;
