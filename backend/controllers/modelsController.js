const GeminiService = require('../services/geminiService');
const logger = require('../utils/logger');

class ModelsController {
  constructor() {
    this.geminiService = new GeminiService();
  }
  
  /**
   * Get available Gemini models
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAvailableModels(req, res) {
    const startTime = Date.now();
    
    try {
      logger.info('Fetching available Gemini models', {
        clientIP: req.ip
      });
      
      // Get available models from Gemini service
      // This method now includes fallback logic and should not throw
      const models = await this.geminiService.getAvailableModels();
      
      const processingTime = Date.now() - startTime;
      
      logger.info('Successfully fetched available models', {
        modelCount: models.length,
        processingTime: `${processingTime}ms`,
        clientIP: req.ip,
        modelNames: models.map(m => m.name)
      });
      
      // Determine source based on whether we got real API data or fallback
      const source = models.length > 0 && models[0].inputTokenLimit ? 'Gemini API' : 'Fallback Models';
      
      // Return successful response
      res.json({
        success: true,
        data: {
          models: models,
          totalCount: models.length
        },
        metadata: {
          processingTime: `${processingTime}ms`,
          timestamp: new Date().toISOString(),
          source: source
        }
      });
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error('Critical error in getAvailableModels', {
        error: error.message,
        stack: error.stack,
        processingTime: `${processingTime}ms`,
        clientIP: req.ip
      });
      
      // Even if there's a critical error, try to return fallback models
      try {
        const fallbackModels = this.geminiService.getFallbackModels();
        logger.info('Returning fallback models due to critical error');
        
        res.json({
          success: true,
          data: {
            models: fallbackModels,
            totalCount: fallbackModels.length
          },
          metadata: {
            processingTime: `${processingTime}ms`,
            timestamp: new Date().toISOString(),
            source: 'Emergency Fallback',
            warning: 'Using fallback models due to service error'
          }
        });
      } catch (fallbackError) {
        logger.error('Even fallback failed', fallbackError);
        
        // Last resort: return minimal error response
        res.status(500).json({
          success: false,
          error: '無法獲取可用模型',
          message: error.message,
          metadata: {
            processingTime: `${processingTime}ms`,
            timestamp: new Date().toISOString()
          }
        });
      }
    }
  }
  
  /**
   * Get information about a specific model
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getModelInfo(req, res) {
    const startTime = Date.now();
    const modelName = req.params.modelName;
    
    try {
      if (!modelName) {
        return res.status(400).json({
          success: false,
          error: '模型名稱不能為空',
          message: '請提供有效的模型名稱'
        });
      }
      
      logger.info('Fetching model information', {
        modelName,
        clientIP: req.ip
      });
      
      // Get model information from Gemini service
      const modelInfo = await this.geminiService.getModelInfo(modelName);
      
      const processingTime = Date.now() - startTime;
      
      logger.info('Successfully fetched model information', {
        modelName,
        processingTime: `${processingTime}ms`,
        clientIP: req.ip
      });
      
      // Return successful response
      res.json({
        success: true,
        data: modelInfo,
        metadata: {
          processingTime: `${processingTime}ms`,
          timestamp: new Date().toISOString(),
          modelName: modelName
        }
      });
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error('Failed to fetch model information', {
        modelName,
        error: error.message,
        stack: error.stack,
        processingTime: `${processingTime}ms`,
        clientIP: req.ip
      });
      
      // Return error response
      res.status(404).json({
        success: false,
        error: '模型資訊獲取失敗',
        message: error.message,
        metadata: {
          processingTime: `${processingTime}ms`,
          timestamp: new Date().toISOString(),
          modelName: modelName
        }
      });
    }
  }
}

module.exports = ModelsController;