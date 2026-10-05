import apiClient from '../api/client';

const parseFilename = (disposition, fallback) => {
  if (!disposition) return fallback;
  const match = disposition.match(/filename="?([^"]+)"?/);
  return match ? decodeURIComponent(match[1]) : fallback;
};

export async function downloadAuthenticatedFile(url, fallbackFilename) {
  const response = await apiClient.get(url, { responseType: 'blob' });
  const filename = parseFilename(response.headers['content-disposition'], fallbackFilename);

  const blobUrl = window.URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}
