export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  import.meta.env.VITE_API_URL?.replace('/api', '') ||
  (typeof window !== 'undefined' 
    ? window.location.origin.replace(':5173', ':3000') 
    : 'http://localhost:3000');

export const getAssetUrl = (path: string) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};
