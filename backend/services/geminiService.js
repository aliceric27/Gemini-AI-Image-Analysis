const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');
const logger = require('../utils/logger');

class GeminiService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: config.gemini.model });
  }

  /**
   * Analyze image with optional JSON structure specification and custom prompt
   * @param {Buffer} imageBuffer - The image buffer
   * @param {string} mimeType - The MIME type of the image
   * @param {string} jsonStructure - Optional JSON structure specification
   * @param {string} modelName - Optional specific model to use
   * @param {string} userApiKey - Optional user-provided API key
   * @param {string} customPrompt - Optional custom prompt to override default prompts
   * @returns {Promise<Object>} Analysis result
   */
  async analyzeImage(imageBuffer, mimeType, jsonStructure = null, modelName = null, userApiKey = null, customPrompt = null) {
    // Use the new analyzeImageWithModel method
    return this.analyzeImageWithModel(imageBuffer, mimeType, jsonStructure, modelName, userApiKey, customPrompt);
  }
  
  /**
   * Build prompt for structured JSON output
   * @param {string} jsonStructure - User-specified JSON structure
   * @returns {string} Formatted prompt
   */
  buildStructuredPrompt(jsonStructure) {
    return `請仔細分析這張圖片，並根據以下 JSON 結構返回結果。請確保返回的 JSON 格式正確且完整。

要求的 JSON 結構：
${jsonStructure}

請注意：
1. 必須返回有效的 JSON 格式
2. 所有字段都應該根據圖片內容填寫
3. 如果某個字段在圖片中無法確定，請填入 null 或適當的預設值
4. 數字類型字段請返回數字，不要用引號包圍
5. 布林類型字段請返回 true 或 false
6. 陣列字段請根據圖片內容填入適當的項目

請只返回 JSON 內容，不要包含其他說明文字。`;
  }
  
  /**
   * Build general analysis prompt
   * @returns {string} General prompt
   */
  buildGeneralPrompt() {
    return `請詳細分析這張圖片，並以 JSON 格式返回分析結果。請包含以下信息：

{
  "description": "圖片的整體描述",
  "objects": ["識別到的物件列表"],
  "colors": ["主要顏色"],
  "scene": "場景類型",
  "mood": "圖片氛圍",
  "text": "圖片中的文字內容（如果有）",
  "quality": "圖片品質評估",
  "tags": ["相關標籤"]
}

請只返回 JSON 內容，不要包含其他說明文字。`;
  }
  
  /**
   * Parse and validate Gemini response
   * @param {string} responseText - Raw response from Gemini
   * @param {string} expectedStructure - Expected JSON structure
   * @returns {Object} Parsed and validated response
   */
  parseResponse(responseText, expectedStructure = null) {
    try {
      // Clean response text (remove markdown code blocks if present)
      let cleanedText = responseText.trim();
      
      // Remove markdown JSON code blocks
      cleanedText = cleanedText.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
      
      // Try to parse JSON
      const parsedResult = JSON.parse(cleanedText);
      
      logger.info('Successfully parsed Gemini response');
      
      return {
        success: true,
        data: parsedResult,
        metadata: {
          hasStructure: !!expectedStructure,
          responseLength: responseText.length,
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (parseError) {
      logger.error('Failed to parse Gemini response as JSON:', parseError);
      
      // If JSON parsing fails, return the raw text with error info
      return {
        success: false,
        data: {
          rawResponse: responseText,
          error: 'JSON 解析失敗',
          description: '無法將 Gemini 回應解析為有效的 JSON 格式'
        },
        metadata: {
          hasStructure: !!expectedStructure,
          responseLength: responseText.length,
          timestamp: new Date().toISOString(),
          parseError: parseError.message
        }
      };
    }
  }
  
  /**
   * Get available Gemini models
   * @returns {Promise<Array>} Array of available models
   */
  async getAvailableModels() {
    try {
      logger.info('Fetching available Gemini models');
      
      // Try to list models using SDK
      try {
        // Note: In some SDK versions, listModels might not be available on the instance
        // Let's try different approaches
        let result;
        
        // Approach 1: Try instance method
        if (typeof this.genAI.listModels === 'function') {
          result = await this.genAI.listModels();
        } else {
          // Approach 2: Use static method if available
          const { GoogleGenerativeAI } = require('@google/generative-ai');
          if (typeof GoogleGenerativeAI.listModels === 'function') {
            result = await GoogleGenerativeAI.listModels(config.gemini.apiKey);
          } else {
            throw new Error('listModels method not available');
          }
        }
        
        if (result && result.models) {
          // Filter models that support generateContent
          const apiModels = result.models
            .filter(model => model.supportedGenerationMethods?.includes('generateContent'))
            .map(model => ({
              name: model.name,
              displayName: model.displayName || model.name.split('/').pop(),
              description: model.description || `Gemini ${model.name.split('/').pop()} model`,
              version: model.version || '1.0',
              supportedMethods: model.supportedGenerationMethods || [],
              inputTokenLimit: model.inputTokenLimit || null,
              outputTokenLimit: model.outputTokenLimit || null,
              source: 'api'
            }));
          
          // Get fallback models for merging
          const fallbackModels = this.getFallbackModels();
          
          // Merge API models with fallback models, avoiding duplicates
          const mergedModels = this.mergeModels(apiModels, fallbackModels);
          
          logger.info(`Found ${apiModels.length} models from API, ${fallbackModels.length} fallback models, ${mergedModels.length} total after merge`);
          return mergedModels;
        }
        
      } catch (sdkError) {
        logger.warn('SDK listModels failed, using fallback:', sdkError.message);
      }
      
      // Fallback: Return known Gemini models
      logger.info('Using fallback model list');
      return this.getFallbackModels();
      
    } catch (error) {
      logger.error('Error fetching available models:', error);
      // Return fallback models even on error
      logger.info('Returning fallback models due to error');
      return this.getFallbackModels();
    }
  }
  
  /**
   * Merge API models with fallback models, avoiding duplicates
   * @param {Array} apiModels - Models from API
   * @param {Array} fallbackModels - Fallback models
   * @returns {Array} Merged models array
   */
  mergeModels(apiModels, fallbackModels) {
    const apiModelNames = new Set(apiModels.map(model => model.name));
    
    // Add fallback models that are not in API results
    const uniqueFallbackModels = fallbackModels
      .filter(model => !apiModelNames.has(model.name))
      .map(model => ({ ...model, source: 'fallback' }));
    
    // Combine API models (prioritized) with unique fallback models
    const mergedModels = [...apiModels, ...uniqueFallbackModels];
    
    // Sort by priority: newest versions first, then by name
    mergedModels.sort((a, b) => {
      // Priority order: 2.5 > 2.0 > 1.5 > 1.0
      const versionPriority = { '2.5': 4, '2.0': 3, '1.5': 2, '1.0': 1 };
      const aPriority = versionPriority[a.version] || 0;
      const bPriority = versionPriority[b.version] || 0;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      return a.displayName.localeCompare(b.displayName);
    });
    
    return mergedModels;
  }

  /**
   * Get fallback list of known Gemini models
   * @returns {Array} Array of known models
   */
  getFallbackModels() {
    return [
      {
        name: 'gemini-2.5-pro',
        displayName: 'Gemini 2.5 Pro',
        description: 'Most capable model for complex reasoning, coding, and multimodal understanding',
        version: '2.5',
        supportedMethods: ['generateContent'],
        inputTokenLimit: 2000000,
        outputTokenLimit: 8192,
        pricing: {
          input: { normal: 1.25, large: 2.50 },
          output: { normal: 10.00, large: 15.00 },
          threshold: 200000
        },
        rateLimit: {
          rpm: 150,
          free: null
        },
        knowledgeCutoff: 'Jan 2025',
        bestFor: ['Coding', 'Reasoning', 'Multimodal understanding'],
        useCase: [
          'Reason over complex problems',
          'Tackle difficult code, math and STEM problems',
          'Use the long context for analyzing large datasets, codebases or documents'
        ],
        latency: 'standard'
      },
      {
        name: 'gemini-2.5-flash',
        displayName: 'Gemini 2.5 Flash',
        description: 'Fast model for large scale processing with thinking capabilities',
        version: '2.5',
        supportedMethods: ['generateContent'],
        inputTokenLimit: 1000000,
        outputTokenLimit: 8192,
        pricing: {
          input: { normal: 0.30 },
          output: { normal: 2.50 }
        },
        rateLimit: {
          rpm: 1000,
          free: { rpm: 10, daily: 500 }
        },
        knowledgeCutoff: 'Jan 2025',
        bestFor: ['Large scale processing', 'Low latency', 'High volume tasks', 'Agentic use cases'],
        useCase: [
          'Reason over complex problems',
          'Show the thinking process of the model',
          'Call tools natively'
        ],
        latency: 'fast'
      },
      {
        name: 'gemini-2.5-flash-lite-preview-06-17',
        displayName: 'Gemini 2.5 Flash-Lite Preview',
        description: 'Lightweight, cost-effective model for high-volume processing',
        version: '2.5',
        supportedMethods: ['generateContent'],
        inputTokenLimit: 1000000,
        outputTokenLimit: 8192,
        pricing: {
          input: { normal: 0.10 },
          output: { normal: 0.40 }
        },
        rateLimit: {
          rpm: 4000,
          free: { rpm: 15, daily: 500 }
        },
        knowledgeCutoff: 'Jan 2025',
        bestFor: ['Large scale processing', 'Low latency', 'High volume tasks', 'Lower cost'],
        useCase: [
          'Data transformation',
          'Translation',
          'Summarization'
        ],
        latency: 'very_fast'
      },
      {
        name: 'gemini-2.0-flash-exp',
        displayName: 'Gemini 2.0 Flash (Experimental)',
        description: 'Latest experimental Gemini 2.0 model with improved performance',
        version: '2.0',
        supportedMethods: ['generateContent'],
        inputTokenLimit: 1000000,
        outputTokenLimit: 8192,
        pricing: {
          input: { normal: 0.30 },
          output: { normal: 2.50 }
        },
        rateLimit: {
          rpm: 1000,
          free: { rpm: 10, daily: 500 }
        },
        knowledgeCutoff: 'Jan 2025',
        bestFor: ['Experimental features', 'Latest capabilities'],
        useCase: [
          'Testing new capabilities',
          'Experimental multimodal tasks'
        ],
        latency: 'fast'
      },
      {
        name: 'gemini-1.5-pro',
        displayName: 'Gemini 1.5 Pro',
        description: 'More capable model for complex reasoning tasks',
        version: '1.5',
        supportedMethods: ['generateContent'],
        inputTokenLimit: 2000000,
        outputTokenLimit: 8192,
        pricing: {
          input: { normal: 1.25, large: 2.50 },
          output: { normal: 5.00, large: 10.00 },
          threshold: 128000
        },
        rateLimit: {
          rpm: 360,
          free: { rpm: 2, daily: 50 }
        },
        knowledgeCutoff: 'Apr 2024',
        bestFor: ['Complex reasoning', 'Long context'],
        useCase: [
          'Complex document analysis',
          'Advanced reasoning tasks'
        ],
        latency: 'standard'
      },
      {
        name: 'gemini-1.5-flash',
        displayName: 'Gemini 1.5 Flash',
        description: 'Fast and efficient model for most tasks',
        version: '1.5',
        supportedMethods: ['generateContent'],
        inputTokenLimit: 1000000,
        outputTokenLimit: 8192,
        pricing: {
          input: { normal: 0.075, large: 0.15 },
          output: { normal: 0.30, large: 0.60 },
          threshold: 128000
        },
        rateLimit: {
          rpm: 1000,
          free: { rpm: 15, daily: 1500 }
        },
        knowledgeCutoff: 'Apr 2024',
        bestFor: ['General tasks', 'Fast processing'],
        useCase: [
          'General text processing',
          'Quick analysis tasks'
        ],
        latency: 'fast'
      }
    ];
  }
  
  /**
   * Get information about a specific model
   * @param {string} modelName - The name of the model
   * @returns {Promise<Object>} Model information
   */
  async getModelInfo(modelName) {
    try {
      logger.info('Fetching model information', { modelName });
      
      // Get model information
      const model = await this.genAI.getGenerativeModel({ model: modelName });
      
      // Since the SDK doesn't provide direct model info, we'll return basic info
      return {
        name: modelName,
        displayName: modelName.split('/').pop(),
        description: `Gemini ${modelName.split('/').pop()} model`,
        status: 'available',
        supportedMethods: ['generateContent'],
        capabilities: {
          textGeneration: true,
          imageAnalysis: true,
          multimodal: true
        }
      };
      
    } catch (error) {
      logger.error('Error fetching model information:', error);
      throw new Error(`無法獲取模型資訊: ${error.message}`);
    }
  }
  
  /**
   * Analyze image with specific model and custom prompt
   * @param {Buffer} imageBuffer - The image buffer
   * @param {string} mimeType - The MIME type of the image
   * @param {string} jsonStructure - Optional JSON structure specification
   * @param {string} modelName - Optional specific model to use
   * @param {string} userApiKey - Optional user-provided API key
   * @param {string} customPrompt - Optional custom prompt to override default prompts
   * @returns {Promise<Object>} Analysis result
   */
  async analyzeImageWithModel(imageBuffer, mimeType, jsonStructure = null, modelName = null, userApiKey = null, customPrompt = null) {
    try {
      logger.info('Starting image analysis with specific model', { 
        modelName, 
        hasUserApiKey: !!userApiKey 
      });
      
      // Determine which API key to use
      const apiKey = userApiKey || config.gemini.apiKey;
      
      if (!apiKey) {
        throw new Error('No API key available. Please provide a user API key or configure server API key.');
      }
      
      // Create GenAI instance with appropriate API key
      const genAI = userApiKey 
        ? new GoogleGenerativeAI(userApiKey)
        : this.genAI;
      
      // Use specific model if provided, otherwise use default
      const model = modelName 
        ? genAI.getGenerativeModel({ model: modelName })
        : (userApiKey ? genAI.getGenerativeModel({ model: config.gemini.model }) : this.model);
      
      // Convert buffer to base64
      const imageBase64 = imageBuffer.toString('base64');
      
      // Prepare image data for Gemini
      const imagePart = {
        inlineData: {
          data: imageBase64,
          mimeType: mimeType
        }
      };
      
      // Build prompt based on custom prompt or JSON structure
      let prompt;
      if (customPrompt && customPrompt.trim()) {
        // Use custom prompt if provided
        prompt = customPrompt.trim();
      } else if (jsonStructure) {
        // Use structured prompt with JSON structure
        prompt = this.buildStructuredPrompt(jsonStructure);
      } else {
        // Use general analysis prompt
        prompt = this.buildGeneralPrompt();
      }
      
      logger.info('Sending request to Gemini API', {
        hasJsonStructure: !!jsonStructure,
        hasCustomPrompt: !!customPrompt,
        imageSize: imageBuffer.length,
        modelName: modelName || config.gemini.model,
        apiKeySource: userApiKey ? 'user' : 'server'
      });
      
      // Generate content
      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();
      
      logger.info('Received response from Gemini API');
      
      // Parse and validate response
      return this.parseResponse(text, jsonStructure || customPrompt);
      
    } catch (error) {
      logger.error('Error in Gemini API analysis:', {
        message: error.message,
        statusCode: error.statusCode || error.status,
        hasUserApiKey: !!userApiKey
      });
      
      // Handle specific API key related errors
      if (error.message.includes('API key not valid') || error.message.includes('Invalid API key')) {
        throw new Error('API Key 無效，請檢查您的 API Key 是否正確');
      }
      
      if (error.message.includes('quota') || error.message.includes('exceeded')) {
        throw new Error('API Key 配額已用盡，請檢查您的 Google AI Platform 帳戶');
      }
      
      if (error.message.includes('permission') || error.message.includes('access')) {
        throw new Error('API Key 權限不足，請檢查您的 API Key 權限設定');
      }
      
      if (error.statusCode === 401 || error.status === 401) {
        throw new Error('API Key 認證失敗，請檢查您的 API Key 是否正確');
      }
      
      if (error.statusCode === 429 || error.status === 429) {
        throw new Error('API 請求過於頻繁，請稍後再試');
      }
      
      throw new Error(`Gemini API 分析失敗: ${error.message}`);
    }
  }
  
  /**
   * Test API connection
   * @returns {Promise<boolean>} Connection status
   */
  async testConnection() {
    try {
      // Create a simple test prompt
      const result = await this.model.generateContent('請回應 "API 連接正常"');
      const response = await result.response;
      const text = response.text();
      
      logger.info('Gemini API connection test successful');
      return true;
    } catch (error) {
      logger.error('Gemini API connection test failed:', error);
      return false;
    }
  }
}

module.exports = GeminiService;