const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const config = require('../config');
const logger = require('../utils/logger');
const ImageProcessor = require('../utils/imageProcessor');
const JsonValidator = require('../utils/jsonValidator');

/**
 * Rate limiting middleware
 */
const createRateLimiter = (options = {}) => {
  const {
    windowMs = config.security.rateLimitWindowMs,
    max = config.security.rateLimitMaxRequests,
    message = '請求過於頻繁，請稍後再試',
    standardHeaders = true,
    legacyHeaders = false
  } = options;
  
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders,
    legacyHeaders,
    skip: (req) => {
      // Skip rate limiting for health checks in development
      if (config.isDevelopment() && req.path === '/health') {
        return true;
      }
      return false;
    },
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method
      });
      
      res.status(429).json({
        success: false,
        error: message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

/**
 * Security headers middleware
 */
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false // Allow image uploads
});

/**
 * File upload validation middleware
 */
const validateFileUpload = (req, res, next) => {
  try {
    // Skip if no file uploaded
    if (!req.file) {
      return next();
    }
    
    logger.info('Validating uploaded file', {
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
    
    // Validate image using ImageProcessor
    const validation = ImageProcessor.validateImage(req.file);
    
    if (!validation.isValid) {
      logger.warn('File validation failed', {
        filename: req.file.originalname,
        errors: validation.errors
      });
      
      return res.status(400).json({
        success: false,
        error: '檔案驗證失敗',
        details: validation.errors
      });
    }
    
    logger.info('File validation passed', {
      filename: req.file.originalname
    });
    
    next();
  } catch (error) {
    logger.error('File validation error:', error);
    res.status(500).json({
      success: false,
      error: '檔案驗證錯誤',
      message: error.message
    });
  }
};

/**
 * JSON structure validation middleware
 */
const validateJsonStructure = (req, res, next) => {
  try {
    const { jsonStructure } = req.body;
    
    // Skip if no JSON structure provided
    if (!jsonStructure) {
      return next();
    }
    
    logger.info('Validating JSON structure');
    
    // Sanitize JSON string
    const sanitizedJson = JsonValidator.sanitizeJsonString(jsonStructure);
    
    // Validate JSON format
    const validation = JsonValidator.validateJsonString(sanitizedJson);
    
    if (!validation.isValid) {
      logger.warn('JSON structure validation failed:', validation.error);
      
      return res.status(400).json({
        success: false,
        error: 'JSON 結構格式錯誤',
        message: validation.error
      });
    }
    
    // Validate schema structure if JSON is valid
    if (validation.parsedJson) {
      const schemaValidation = JsonValidator.validateJsonSchema(validation.parsedJson);
      
      if (!schemaValidation.isValid) {
        logger.warn('JSON schema validation failed:', schemaValidation.error);
        
        return res.status(400).json({
          success: false,
          error: 'JSON Schema 驗證失敗',
          message: schemaValidation.error,
          issues: schemaValidation.issues
        });
      }
      
      // Log warnings if any
      if (schemaValidation.warnings && schemaValidation.warnings.length > 0) {
        logger.info('JSON schema warnings:', schemaValidation.warnings);
      }
    }
    
    // Update request body with sanitized JSON
    req.body.jsonStructure = sanitizedJson;
    
    logger.info('JSON structure validation passed');
    next();
  } catch (error) {
    logger.error('JSON validation error:', error);
    res.status(500).json({
      success: false,
      error: 'JSON 驗證錯誤',
      message: error.message
    });
  }
};

/**
 * Request logging middleware
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log request
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length')
  });
  
  // Log response when finished
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;
    
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    });
    
    originalSend.call(this, data);
  };
  
  next();
};

/**
 * Input sanitization middleware
 */
const sanitizeInput = (req, res, next) => {
  try {
    // Sanitize query parameters
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = req.query[key].trim();
        
        // Remove potentially harmful characters
        req.query[key] = req.query[key].replace(/[<>"'&]/g, '');
      }
    }
    
    // Sanitize body parameters (except file data)
    if (req.body && typeof req.body === 'object') {
      for (const key in req.body) {
        if (key !== 'jsonStructure' && typeof req.body[key] === 'string') {
          req.body[key] = req.body[key].trim();
          
          // Remove potentially harmful characters for non-JSON fields
          req.body[key] = req.body[key].replace(/[<>"'&]/g, '');
        }
      }
    }
    
    next();
  } catch (error) {
    logger.error('Input sanitization error:', error);
    res.status(500).json({
      success: false,
      error: '輸入處理錯誤',
      message: error.message
    });
  }
};

/**
 * Error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });
  
  // Don't leak error details in production
  const errorMessage = config.isDevelopment() ? err.message : '內部伺服器錯誤';
  
  res.status(500).json({
    success: false,
    error: '伺服器錯誤',
    message: errorMessage,
    timestamp: new Date().toISOString()
  });
};

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res) => {
  logger.warn('404 - Route not found', {
    path: req.path,
    method: req.method,
    ip: req.ip
  });
  
  res.status(404).json({
    success: false,
    error: '路徑不存在',
    message: `找不到路徑: ${req.method} ${req.path}`,
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  createRateLimiter,
  securityHeaders,
  validateFileUpload,
  validateJsonStructure,
  requestLogger,
  sanitizeInput,
  errorHandler,
  notFoundHandler
};