const GeminiService = require('../services/geminiService');
const logger = require('../utils/logger');
const config = require('../config');

class AnalysisController {
  constructor() {
    this.geminiService = new GeminiService();
  }
  
  /**
   * Handle image analysis request
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async analyzeImage(req, res) {
    const startTime = Date.now();
    
    try {
      // Validate request
      if (!req.file) {
        logger.warn('Image analysis request without file');
        return res.status(400).json({
          success: false,
          error: '未提供圖片檔案',
          message: '請上傳一張圖片進行分析'
        });
      }
      
      // Get JSON structure, model, custom prompt, and optional user API key from request body
      const jsonStructure = req.body.jsonStructure;
      const modelName = req.body.model;
      const userApiKey = req.body.userApiKey;
      const customPrompt = req.body.customPrompt;
      
      // Validate JSON structure if provided
      if (jsonStructure) {
        try {
          JSON.parse(jsonStructure);
        } catch (error) {
          logger.warn('Invalid JSON structure provided:', error.message);
          return res.status(400).json({
            success: false,
            error: 'JSON 結構格式錯誤',
            message: `JSON 格式不正確: ${error.message}`
          });
        }
      }
      
      logger.info('Starting image analysis', {
        filename: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        hasJsonStructure: !!jsonStructure,
        hasCustomPrompt: !!customPrompt,
        modelName: modelName || 'default',
        hasUserApiKey: !!userApiKey,
        clientIP: req.ip
      });
      
      // Perform analysis using Gemini service
      const analysisResult = await this.geminiService.analyzeImage(
        req.file.buffer,
        req.file.mimetype,
        jsonStructure,
        modelName,
        userApiKey,
        customPrompt
      );
      
      const processingTime = Date.now() - startTime;
      
      logger.info('Image analysis completed', {
        success: analysisResult.success,
        processingTime: `${processingTime}ms`,
        filename: req.file.originalname
      });
      
      // Return successful response
      res.json({
        success: true,
        data: analysisResult.data,
        metadata: {
          ...analysisResult.metadata,
          processingTime: `${processingTime}ms`,
          filename: req.file.originalname,
          fileSize: req.file.size,
          mimeType: req.file.mimetype
        }
      });
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error('Image analysis failed', {
        error: error.message,
        stack: error.stack,
        processingTime: `${processingTime}ms`,
        filename: req.file?.originalname,
        hasUserApiKey: !!req.body.userApiKey,
        hasCustomPrompt: !!req.body.customPrompt,
        clientIP: req.ip
      });
      
      // Determine appropriate HTTP status code based on error type
      let statusCode = 500;
      let errorCategory = '圖片分析失敗';
      
      if (error.message.includes('API Key 無效') || error.message.includes('認證失敗')) {
        statusCode = 401;
        errorCategory = 'API Key 認證錯誤';
      } else if (error.message.includes('配額已用盡')) {
        statusCode = 429;
        errorCategory = 'API 配額不足';
      } else if (error.message.includes('權限不足')) {
        statusCode = 403;
        errorCategory = 'API Key 權限不足';
      } else if (error.message.includes('請求過於頻繁')) {
        statusCode = 429;
        errorCategory = '請求頻率限制';
      }
      
      // Return error response
      res.status(statusCode).json({
        success: false,
        error: errorCategory,
        message: error.message,
        metadata: {
          processingTime: `${processingTime}ms`,
          timestamp: new Date().toISOString()
        }
      });
    }
  }
  
  /**
   * Health check endpoint
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async healthCheck(req, res) {
    try {
      // Test Gemini API connection
      const geminiStatus = await this.geminiService.testConnection();
      
      const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
          gemini: geminiStatus ? 'connected' : 'disconnected',
          server: 'running'
        },
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime()
      };
      
      logger.info('Health check requested', { 
        geminiStatus,
        clientIP: req.ip 
      });
      
      res.json(health);
      
    } catch (error) {
      logger.error('Health check failed:', error);
      
      res.status(503).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message,
        services: {
          gemini: 'unknown',
          server: 'running'
        }
      });
    }
  }
  
  /**
   * Get API information
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  getApiInfo(req, res) {
    res.json({
      name: 'Gemini Pro 2.5 Image Analysis API',
      version: '1.0.0',
      description: '一個基於 Gemini Pro 2.5 API 的圖像分析服務',
      endpoints: {
        analyze: {
          method: 'POST',
          path: '/api/analyze',
          description: '分析圖片並返回結果',
          parameters: {
            image: '必需 - 圖片檔案 (multipart/form-data)',
            jsonStructure: '可選 - 指定返回的 JSON 結構',
            model: '可選 - 指定要使用的 Gemini 模型',
            userApiKey: '可選 - 用戶自定義的 Gemini API Key',
            customPrompt: '可選 - 自定義的分析提示詞'
          }
        },
        models: {
          method: 'GET',
          path: '/api/models',
          description: '獲取可用的 Gemini 模型列表'
        },
        health: {
          method: 'GET',
          path: '/health',
          description: '檢查服務健康狀態'
        }
      },
      limits: {
        maxFileSize: `${config.upload.maxFileSize / 1024 / 1024}MB`,
        allowedTypes: config.upload.allowedFileTypes,
        rateLimit: `${config.security.rateLimitMaxRequests} 請求每 ${config.security.rateLimitWindowMs / 60000} 分鐘`
      },
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = AnalysisController;