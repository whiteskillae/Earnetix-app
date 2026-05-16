let scriptLoaded = false;

/**
 * Dynamically loads the reCAPTCHA Enterprise script.
 * @param {string} siteKey - The reCAPTCHA Enterprise site key
 * @returns {Promise<boolean>}
 */
const loadEnterpriseScript = (siteKey) => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }

    if (window.grecaptcha && window.grecaptcha.enterprise) {
      resolve(true);
      return;
    }

    if (scriptLoaded) {
      const interval = setInterval(() => {
        if (window.grecaptcha && window.grecaptcha.enterprise) {
          clearInterval(interval);
          resolve(true);
        }
      }, 100);
      return;
    }

    scriptLoaded = true;
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/enterprise.js?render=${siteKey}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      scriptLoaded = false;
      resolve(false);
    };
    document.head.appendChild(script);
  });
};

/**
 * Executes reCAPTCHA Enterprise and returns a token.
 * @param {string} action - The action name (e.g., 'login', 'register', 'withdrawal')
 * @returns {Promise<string|null>} - The captcha token or null if failed
 */
export const executeCaptcha = async (action = 'default') => {
  const defaultKey = '6LfFT-0sAAAAAOvHuu6YX5HvY6fTHBSgNVnmjOzQ';
  const siteKey = import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY || defaultKey;

  const loaded = await loadEnterpriseScript(siteKey);
  if (!loaded) {
    console.error('Failed to load reCAPTCHA Enterprise script');
    return null;
  }

  return new Promise((resolve) => {
    window.grecaptcha.enterprise.ready(async () => {
      try {
        const token = await window.grecaptcha.enterprise.execute(siteKey, { action });
        resolve(token);
      } catch (error) {
        console.error('reCAPTCHA execution error:', error);
        resolve(null);
      }
    });
  });
};
