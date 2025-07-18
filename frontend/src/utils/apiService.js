import axios from 'axios';

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
  timeout: 30000, // 30 seconds timeout for image analysis
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

// Request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`);
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.data);
    return response;
  },
  (error) => {
    console.error('API Error:', error);
    
    // Handle different types of errors
    if (error.code === 'ECONNABORTED') {
      throw new Error('請求超時，請檢查網路連接或稍後再試');
    }
    
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          throw new Error(data.message || data.error || '請求格式錯誤');
        case 401:
          throw new Error(data.message || data.error || 'API Key 認證失敗，請檢查您的 API Key 是否正確');
        case 403:
          throw new Error(data.message || data.error || 'API Key 權限不足，請檢查您的 API Key 權限設定');
        case 413:
          throw new Error('檔案太大，請選擇小於 10MB 的圖片');
        case 429:
          throw new Error(data.message || data.error || 'API 請求過於頻繁，請稍後再試');
        case 500:
          throw new Error(data.message || data.error || '伺服器內部錯誤，請稍後再試');
        case 502:
        case 503:
        case 504:
          throw new Error('伺服器暫時無法使用，請稍後再試');
        default:
          throw new Error(data.message || data.error || `伺服器錯誤 (${status})`);
      }
    } else if (error.request) {
      // Network error
      throw new Error('無法連接到伺服器，請檢查網路連接');
    } else {
      // Other error
      throw new Error(error.message || '未知錯誤');
    }
  }
);

// API service functions
export const apiService = {
  // Health check
  async healthCheck() {
    try {
      const response = await apiClient.get('/health');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Analyze image with Gemini API
  async analyzeImage(imageFile, jsonSchema = '', selectedModel = null, userApiKey = null, customPrompt = null) {
    try {
      // Validate inputs
      if (!imageFile) {
        throw new Error('請先上傳圖片');
      }

      // Create FormData
      const formData = new FormData();
      formData.append('image', imageFile);
      
      if (jsonSchema && jsonSchema.trim()) {
        // Validate JSON schema
        try {
          JSON.parse(jsonSchema);
          formData.append('jsonStructure', jsonSchema);
        } catch (error) {
          throw new Error('JSON 結構格式錯誤，請檢查語法');
        }
      }
      
      // Add model parameter if specified
      if (selectedModel && selectedModel.trim()) {
        formData.append('model', selectedModel);
      }
      
      // Add user API key if provided
      if (userApiKey && userApiKey.trim()) {
        formData.append('userApiKey', userApiKey);
      }
      
      // Add custom prompt if provided
      if (customPrompt && customPrompt.trim()) {
        formData.append('customPrompt', customPrompt);
      }

      // Log request details
      console.log('Sending analyze request:', {
        fileName: imageFile.name,
        fileSize: imageFile.size,
        fileType: imageFile.type,
        hasJsonSchema: !!jsonSchema,
        hasCustomPrompt: !!customPrompt,
        selectedModel: selectedModel || 'default',
        hasUserApiKey: !!userApiKey
      });

      const response = await apiClient.post('/api/analyze', formData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Test connection to backend
  async testConnection() {
    try {
      const response = await apiClient.get('/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get available Gemini models
  async getAvailableModels() {
    try {
      console.log('Fetching available models...');
      
      const response = await apiClient.get('/api/models', {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Available models fetched successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch available models:', error);
      throw error;
    }
  },

  // Get information about a specific model
  async getModelInfo(modelName) {
    try {
      if (!modelName) {
        throw new Error('模型名稱不能為空');
      }
      
      console.log('Fetching model info for:', modelName);
      
      const response = await apiClient.get(`/api/models/${modelName}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Model info fetched successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch model info:', error);
      throw error;
    }
  }
};

// Utility functions for file validation
export const fileUtils = {
  // Validate image file
  validateImageFile(file) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!file) {
      throw new Error('請選擇檔案');
    }

    if (!allowedTypes.includes(file.type)) {
      throw new Error('不支援的檔案格式，請選擇 JPEG、PNG、WebP 或 GIF 格式');
    }

    if (file.size > maxSize) {
      throw new Error('檔案太大，請選擇小於 10MB 的圖片');
    }

    return true;
  },

  // Format file size for display
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Check if file is an image
  isImageFile(file) {
    return file && file.type.startsWith('image/');
  }
};

export default apiService;