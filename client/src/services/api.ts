import axios from 'axios';
import { GuildMember, AAInfo, GVGInfo, KVMInfo, OCRTemplate, GuildNameResource, CreateGuildNameRequest, UpdateGuildNameRequest } from '../types';

// Get API base URL from environment variables, use default value if not set
// Declare environment variable types
declare interface ImportMetaEnv {
  VITE_API_BASE_URL: string
}

const API_BASE_URL = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // Increase timeout for OCR requests
});

// Request interceptor - add authentication header
apiClient.interceptors.request.use(
  (config) => {
    console.log('Sending request:', config.method?.toUpperCase(), config.url);
    
    // Add authentication header
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    console.log('Received response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Guild member related API
export const guildMembersApi = {
  // Get all guild members
  getAll: () => apiClient.get('/guild/members'),
  
  // Get single guild member
  getById: (id: number) => apiClient.get(`/guild/members/${id}`),
  
  // Create guild member
  create: (member: any) => apiClient.post('/guild/members', member),
  
  // Update guild member
  update: (id: number, member: any) => apiClient.put(`/guild/members/${id}`, member),
  
  // Delete guild member
  delete: (id: number) => apiClient.delete(`/guild/members/${id}`),
  
  // Batch update guild members
  batchUpdate: (members: any[]) => apiClient.post('/guild/members/batch', { members }),
  
  // Search guild members
  search: (query: string) => apiClient.get(`/guild/members/search?q=${encodeURIComponent(query)}`),
  
  // Delete all guild members
  deleteAll: () => apiClient.delete('/guild/members'),
};

// Screenshot recognition related API
export const screenshotApi = {
  // Upload and analyze screenshot
  uploadScreenshot: async (file: File) => {
    const formData = new FormData();
    formData.append('screenshot', file);
    
    const response = await apiClient.post('/screenshot/analyze', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000, // OCR requests need more time
    });
    
    return response.data;
  },
};

// OCR related API
export const ocrApi = {
  // Get OCR service status
  getStatus: () => apiClient.get('/ocr/status'),
  
  // Reinitialize OCR service
  reinitialize: () => apiClient.post('/ocr/reinitialize'),
};

// AA related API
export const aaApi = {
  // Import AA data
  importData: (aaData: AAInfo[]) => apiClient.post('/aa/import', { aaData }),
  
  // Get AA data for specified date
  getByDate: (date: string) => apiClient.get(`/aa/date/${date}`),
  
  // Get AA data within date range
  getByDateRange: (startDate: string, endDate: string) => 
    apiClient.get(`/aa/range?startDate=${startDate}&endDate=${endDate}`),
  
  // Get date list of all AA data
  getAllDates: () => apiClient.get('/aa/dates'),
  
  // Delete AA data for specified date
  deleteByDate: (date: string) => apiClient.delete(`/aa/date/${date}`),
  
  // Get AA data statistics
  getStatistics: () => apiClient.get('/aa/statistics'),
  
  // Get AA image list for specified date
  getImages: (date: string) => apiClient.get(`/aa/images/${date}`),
  
  // Get member's AA participation
  getMemberParticipation: (memberName: string) => apiClient.get(`/aa/member/${encodeURIComponent(memberName)}/participation`),
  
  // Get all members' AA participation in one request
  getAllMembersParticipation: () => apiClient.get('/aa/members/participation'),
  
  // Get specific members' AA participation
  getMembersParticipation: (memberNames: string[]) => 
    apiClient.post('/aa/members/participation', { memberNames }),
  
  // Upload AA images for specified date
  uploadImages: (date: string, files: File[]) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('images', file);
    });
    return apiClient.post(`/aa/images/${date}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Delete AA image by filename
  deleteImage: (date: string, filename: string) => 
    apiClient.delete(`/aa/images/${date}/${encodeURIComponent(filename)}`),
};

// GVG related API
export const gvgApi = {
  // Import GVG data
  importData: (gvgData: GVGInfo[]) => apiClient.post('/gvg/import', { gvgData }),
  
  // Get GVG data for specified date
  getByDate: (date: string) => apiClient.get(`/gvg/date/${date}`),
  
  // Get GVG data within date range
  getByDateRange: (startDate: string, endDate: string) => 
    apiClient.get(`/gvg/range?startDate=${startDate}&endDate=${endDate}`),
  
  // Get date list of all GVG data
  getAllDates: () => apiClient.get('/gvg/dates'),
  
  // Delete GVG data for specified date
  deleteByDate: (date: string) => apiClient.delete(`/gvg/date/${date}`),
  
  // Get GVG data statistics
  getStatistics: () => apiClient.get('/gvg/statistics'),
  
  // Get GVG image list for specified date
  getImages: (date: string) => apiClient.get(`/gvg/images/${date}`),
  
  // Get member's GVG participation
  getMemberParticipation: (memberName: string) => apiClient.get(`/gvg/member/${encodeURIComponent(memberName)}/participation`),
  
  // Get all members' GVG participation in one request
  getAllMembersParticipation: () => apiClient.get('/gvg/members/participation'),
  
  // Get specific members' GVG participation
  getMembersParticipation: (memberNames: string[]) => 
    apiClient.post('/gvg/members/participation', { memberNames }),

  // Delete GVG image by filename
  deleteImage: (date: string, filename: string) => 
    apiClient.delete(`/gvg/images/${date}/${encodeURIComponent(filename)}`),
};

// KVM related API
export const kvmApi = {
  // Import KVM data
  importData: (kvmData: KVMInfo[]) => apiClient.post('/kvm/import', { kvmData }),
  
  // Get KVM data for specified date
  getByDate: (date: string) => apiClient.get(`/kvm/date/${date}`),
  
  // Get KVM data within date range
  getByDateRange: (startDate: string, endDate: string) => 
    apiClient.get(`/kvm/range?startDate=${startDate}&endDate=${endDate}`),
  
  // Get date list of all KVM data
  getAllDates: () => apiClient.get('/kvm/dates'),
  
  // Delete KVM data for specified date
  deleteByDate: (date: string) => apiClient.delete(`/kvm/date/${date}`),
  
  // Get KVM data statistics
  getStatistics: () => apiClient.get('/kvm/statistics'),
  
  // Get KVM image list for specified date
  getImages: (date: string) => apiClient.get(`/kvm/images/${date}`),
  
  // Get all members' KVM participation in one request
  getAllMembersParticipation: () => apiClient.get('/kvm/members/participation'),
  
  // Get specific members' KVM participation
  getMembersParticipation: (memberNames: string[]) => 
    apiClient.post('/kvm/members/participation', { memberNames }),
};

// Template related API
export const templateApi = {
  // Get template list
  getTemplates: (module?: string, isDefault?: boolean) => {
    const params = new URLSearchParams();
    if (module) params.append('module', module);
    if (isDefault !== undefined) params.append('isDefault', isDefault.toString());
    return apiClient.get(`/templates?${params.toString()}`);
  },
  
  // Get specified template
  getById: (id: string) => apiClient.get(`/templates/${id}`),
  
  // Create template
  create: (template: Partial<OCRTemplate>) => apiClient.post('/templates', template),
  
  // Update template
  update: (id: string, template: Partial<OCRTemplate>) => 
    apiClient.put(`/templates/${id}`, template),
  
  // Delete template
  delete: (id: string) => apiClient.delete(`/templates/${id}`),
  
  // Set default template
  setDefault: (id: string) => apiClient.post(`/templates/${id}/default`),
  
  // Get module default template
  getDefault: (module: string) => apiClient.get(`/templates/default/${module}`),
};

// Class related API
export const classesApi = {
  // Get all classes
  getAll: () => apiClient.get('/classes'),
  // Get class by ID
  getById: (id: string) => apiClient.get(`/classes/${id}`),
  // Create class
  create: (classData: any) => apiClient.post('/classes', classData),
  // Update class
  update: (id: string, classData: any) => apiClient.put(`/classes/${id}`, classData),
  // Delete class
  delete: (id: string) => apiClient.delete(`/classes/${id}`),
};

// Guild name resource related API
export const guildNameApi = {
  // Create guild name resource
  create: (data: CreateGuildNameRequest) => apiClient.post('/database/guild-name', data),
  
  // Save guild name resource (create or update)
  save: (data: CreateGuildNameRequest | UpdateGuildNameRequest) => apiClient.post('/database/guild-name', data),
  
  // Get guild name resource
  get: () => apiClient.get('/database/guild-name'),
  
  // Get all guild name resources (admin function)
  getAll: () => apiClient.get('/database/guild-names'),
  
  // Get specified guild's name resource (admin function)
  getByGuildId: (guildId: string) => apiClient.get(`/database/guild-names/${guildId}`),
  
  // Update guild name resource
  update: (data: UpdateGuildNameRequest) => apiClient.put('/database/guild-name', data),
  
  // Delete guild name resource
  delete: () => apiClient.delete('/database/guild-name'),
  
  // Upload background image
  uploadBackground: (file: File) => {
    const formData = new FormData();
    formData.append('backgroundImage', file);
    return apiClient.post('/database/upload/background', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  // Download images as zip
  downloadImages: () => {
    return apiClient.get('/database/images/download', {
      responseType: 'blob'
    });
  },

  // Upload images zip
  uploadImages: (file: File) => {
    const formData = new FormData();
    formData.append('imagesZip', file);
    return apiClient.post('/database/images/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }
};

// Export independent API functions
export const analyzeScreenshot = async (formData: FormData) => {
  const response = await apiClient.post('/screenshot/analyze', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 120000,
  });
  return response.data;
};

export const uploadScreenshot = async (formData: FormData) => {
  const response = await apiClient.post('/screenshot/analyze', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 120000,
  });
  return response.data;
};

export const saveGuildMembers = async (guildId: string, members: GuildMember[]) => {
  const response = await apiClient.post(`/database/guilds/${guildId}/members`, { members });
  return response.data;
};

export const getOCRStatus = async () => {
  const response = await apiClient.get('/ocr/status');
  return response.data;
};

export const reinitializeOCR = async () => {
  const response = await apiClient.post('/ocr/reinitialize');
  return response.data;
};

// Sub-account management API
export const subAccountApi = {
  // Get all sub-accounts
  getAll: () => apiClient.get('/sub-accounts'),
  
  // Create sub-account
  create: (data: {
    username: string;
    password: string;
    role: 'editor' | 'viewer';
    permissions?: Array<{
      resource: string;
      actions: string[];
    }>;
  }) => apiClient.post('/sub-accounts', data),
  
  // Update sub-account
  update: (id: string, data: {
    password?: string;
    role?: 'editor' | 'viewer';
    permissions?: Array<{
      resource: string;
      actions: string[];
    }>;
  }) => apiClient.put(`/sub-accounts/${id}`, data),
  
  // Delete sub-account
  delete: (id: string) => apiClient.delete(`/sub-accounts/${id}`),
  
  // Get current user permissions
  getMyPermissions: () => apiClient.get('/sub-accounts/me/permissions')
};

// Data export/import API
export const dataApi = {
  // Export all account guild data
  exportData: () => apiClient.get('/database/export'),
  
  // Clear and import account data
  importData: (data: any) => apiClient.post('/database/import', { data })
};

export default apiClient;