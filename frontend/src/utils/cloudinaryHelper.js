/**
 * Helper to ensure Cloudinary non-image files are served as direct downloads
 * to avoid browser sandbox frame errors (e.g. PDF cross-origin frame blocking).
 */
export const getDownloadableUrl = (url) => {
  if (!url) return '';
  
  // If it's a Cloudinary URL and not an image, inject the 'fl_attachment' transformation flag
  if (url.includes('cloudinary.com')) {
    const isImage = /\.(jpg|jpeg|png|webp|gif|svg|bmp)$/i.test(url);
    if (!isImage && !url.includes('fl_attachment')) {
      return url.replace('/upload/', '/upload/fl_attachment/');
    }
  }
  return url;
};
