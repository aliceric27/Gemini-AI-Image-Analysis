const express = require('express');
const cors = require('cors');
const multer = require('multer');
const morgan = require('morgan');

// Import configuration and utilities
const config = require('./config');
const logger = require('./utils/logger');

// Import controllers
const AnalysisController = require('./controllers/analysisController');
const ModelsController = require('./controllers/modelsController');

// Import middleware
const {
  createRateLimiter,
  securityHeaders,
  validateFileUpload,
  validateJsonStructure,
  requestLogger,
  sanitizeInput,
  errorHandler,
  notFoundHandler
} = require('./middleware/security');

// Validate configuration on startup
try {
  config.validate();
  logger.info('Configuration validation passed');
} catch (error) {
  logger.error('Configuration validation failed:', error.message);
  process.exit(1);
}

const app = express();

// Trust proxy for accurate IP addresses (for rate limiting)
app.set('trust proxy', 1);

// Security headers
app.use(securityHeaders);

// CORS configuration
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request logging
if (config.isDevelopment()) {
  app.use(morgan('dev'));
}
app.use(requestLogger);

// Body parsing middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Input sanitization
app.use(sanitizeInput);

// Rate limiting
const generalRateLimit = createRateLimiter();
const analysisRateLimit = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10, // limit each IP to 10 analysis requests per windowMs
  message: '圖片分析請求過於頻繁，請稍後再試'
});

app.use(generalRateLimit);

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: config.upload.maxFileSize,
    fieldSize: 1024 * 1024, // 1MB for text fields
    fields: 10, // max 10 fields
    files: 1 // max 1 file
  },
  fileFilter: (req, file, cb) => {
    if (config.upload.allowedFileTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`不支援的檔案格式: ${file.mimetype}`), false);
    }
  },
});

// Initialize controllers
const analysisController = new AnalysisController();
const modelsController = new ModelsController();

// Routes
app.get('/', (req, res) => {
  analysisController.getApiInfo(req, res);
});

app.get('/health', (req, res) => {
  analysisController.healthCheck(req, res);
});

// Models endpoint
app.get('/api/models', generalRateLimit, (req, res) => {
  modelsController.getAvailableModels(req, res);
});

// Specific model info endpoint
app.get('/api/models/:modelName', generalRateLimit, (req, res) => {
  modelsController.getModelInfo(req, res);
});

// Image analysis endpoint with enhanced middleware stack
app.post('/api/analyze',
  analysisRateLimit,                    // Specific rate limit for analysis
  upload.single('image'),               // File upload handling
  validateFileUpload,                   // File validation
  validateJsonStructure,                // JSON structure validation
  (req, res) => {                       // Analysis handler
    analysisController.analyzeImage(req, res);
  }
);

// Handle multer errors
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    logger.warn('Multer error:', {
      code: error.code,
      message: error.message,
      field: error.field
    });
    
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          error: '檔案太大',
          message: `檔案大小不能超過 ${config.upload.maxFileSize / 1024 / 1024}MB`
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          error: '檔案數量過多',
          message: '一次只能上傳一個檔案'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          error: '不允許的檔案欄位',
          message: '請使用 "image" 欄位上傳檔案'
        });
      default:
        return res.status(400).json({
          success: false,
          error: '檔案上傳錯誤',
          message: error.message
        });
    }
  }
  
  // Pass other errors to general error handler
  next(error);
});

// 404 handler
app.use(notFoundHandler);

// General error handler (must be last)
app.use(errorHandler);

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  logger.info(`🚀 Server started successfully`, {
    port: PORT,
    environment: config.nodeEnv,
    cors: config.cors.origin,
    maxFileSize: `${config.upload.maxFileSize / 1024 / 1024}MB`,
    rateLimit: `${config.security.rateLimitMaxRequests} requests per ${config.security.rateLimitWindowMs / 60000} minutes`
  });
  
  if (config.isDevelopment()) {
    logger.info('📖 API Documentation available at http://localhost:' + PORT);
    logger.info('🔍 Health check available at http://localhost:' + PORT + '/health');
  }
});