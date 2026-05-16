/**
 * Executes reCAPTCHA Enterprise and returns a token.
 * @param {string} action - The action name (e.g., 'login', 'register', 'withdrawal')
 * @returns {Promise<string|null>} - The captcha token or null if failed
 */
export const executeCaptcha = (action = 'default') => {
  return new Promise((resolve) => {
    if (typeof window.grecaptcha === 'undefined' || typeof window.grecaptcha.enterprise === 'undefined') {
      console.error('reCAPTCHA Enterprise not loaded');
      resolve(null);
      return;
    }

    window.grecaptcha.enterprise.ready(async () => {
      try {
        const siteKey = import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY;
        const token = await window.grecaptcha.enterprise.execute(siteKey, { action });
        resolve(token);
      } catch (error) {
        console.error('reCAPTCHA execution error:', error);
        resolve(null);
      }
    });
  });
};
