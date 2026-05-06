/**
 * Simple device fingerprint utility.
 * Generates a consistent hash based on browser/screen properties.
 */
export const getDeviceFingerprint = () => {
  const navigator_info = window.navigator;
  const screen_info = window.screen;
  
  let uid = navigator_info.mimeTypes.length;
  uid += navigator_info.userAgent.replace(/\D+/g, '');
  uid += navigator_info.plugins.length;
  uid += screen_info.height || '';
  uid += screen_info.width || '';
  uid += screen_info.pixelDepth || '';
  uid += navigator_info.language || '';
  
  return btoa(uid).slice(0, 32); // Return a base64 encoded string
};
