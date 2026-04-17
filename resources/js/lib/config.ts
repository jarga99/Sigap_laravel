export const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (typeof window !== 'undefined' 
    ? window.location.origin 
    : 'http://localhost:8000');

export const getAssetUrl = (path: string) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};
