import api from './axios';

/**
 * Robustly trigger a file download in the browser.
 * Supports both raw content (Blob/string) and remote URLs (fetched as Blob).
 */
export async function downloadFile(
  source: string | Blob, 
  fileName: string, 
  mimeType: string = 'application/octet-stream'
) {
  let url: string;
  let isFromUrl = false;

  if (typeof source === 'string' && (source.startsWith('http') || source.startsWith('/'))) {
    // It's a URL - fetch it via Axios to ensure headers and auth are handled correctly
    try {
      const response = await api.get(source, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: response.headers['content-type'] || mimeType });
      url = window.URL.createObjectURL(blob);
      isFromUrl = true;
    } catch (error) {
      console.error('Failed to download file from URL:', error);
      throw error;
    }
  } else {
    // It's raw content
    const blob = source instanceof Blob ? source : new Blob([source], { type: mimeType });
    url = window.URL.createObjectURL(blob);
  }

  // Create temporary link and trigger download
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  
  // CRITICAL: Append to body to ensure it works in all browsers (e.g., Firefox)
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  document.body.removeChild(link);
  if (isFromUrl || !(source instanceof Blob)) {
    // We created a temporary URL, revoke it later to avoid memory leaks
    setTimeout(() => window.URL.revokeObjectURL(url), 100);
  }
}
