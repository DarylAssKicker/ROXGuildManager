// Utility function to get base URL
export const getBaseUrl = (): string => {
  // Get API base URL from environment variables
  const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:3001/api';
  
  // Remove trailing /api part, keep only base domain and port
  return apiBaseUrl.replace('/api', '');
};

// Function to get static resource URL
export const getStaticUrl = (path: string): string => {
  if (!path) return '';
  
  // If already a complete URL, return directly
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // For local development environment, return relative path directly (Vite handles automatically)
  return normalizedPath;
};