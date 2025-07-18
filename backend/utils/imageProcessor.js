const sharp = require('sharp');
const config = require('../config');
const logger = require('./logger');

class ImageProcessor {
  /**
   * Validate image file type and size
   * @param {Object} file - Multer file object
   * @returns {Object} Validation result
   */
  static validateImage(file) {
    const errors = [];
    
    // Check file exists
    if (!file) {
      errors.push('未提供圖片檔案');
      return { isValid: false, errors };
    }
    
    // Check file size
    if (file.size > config.upload.maxFileSize) {
      const maxSizeMB = config.upload.maxFileSize / 1024 / 1024;
      errors.push(`檔案大小超過限制 (${maxSizeMB}MB)`);
    }
    
    // Check file type
    if (!config.upload.allowedFileTypes.includes(file.mimetype)) {
      errors.push(`不支援的檔案格式: ${file.mimetype}`);
    }
    
    // Additional MIME type validation using file buffer
    const isValidImageBuffer = this.validateImageBuffer(file.buffer);
    if (!isValidImageBuffer) {
      errors.push('檔案內容不是有效的圖片格式');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Validate image buffer by checking magic bytes
   * @param {Buffer} buffer - Image buffer
   * @returns {boolean} Is valid image
   */
  static validateImageBuffer(buffer) {
    if (!buffer || buffer.length < 4) {
      return false;
    }
    
    // Check magic bytes for common image formats
    const magicBytes = buffer.slice(0, 4);
    
    // JPEG: FF D8 FF
    if (magicBytes[0] === 0xFF && magicBytes[1] === 0xD8 && magicBytes[2] === 0xFF) {
      return true;
    }
    
    // PNG: 89 50 4E 47
    if (magicBytes[0] === 0x89 && magicBytes[1] === 0x50 && 
        magicBytes[2] === 0x4E && magicBytes[3] === 0x47) {
      return true;
    }
    
    // WebP: 52 49 46 46 (RIFF)
    if (magicBytes[0] === 0x52 && magicBytes[1] === 0x49 && 
        magicBytes[2] === 0x46 && magicBytes[3] === 0x46) {
      // Check for WebP signature at offset 8
      if (buffer.length >= 12) {
        const webpSig = buffer.slice(8, 12);
        if (webpSig.toString() === 'WEBP') {
          return true;
        }
      }
    }
    
    // GIF: 47 49 46 38
    if (magicBytes[0] === 0x47 && magicBytes[1] === 0x49 && 
        magicBytes[2] === 0x46 && magicBytes[3] === 0x38) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Optimize image for analysis (compress and resize if needed)
   * @param {Buffer} imageBuffer - Original image buffer
   * @param {string} mimeType - Original MIME type
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processed image info
   */
  static async optimizeForAnalysis(imageBuffer, mimeType, options = {}) {
    try {
      const {
        maxWidth = 2048,
        maxHeight = 2048,
        quality = 85,
        format = 'jpeg'
      } = options;
      
      logger.info('Starting image optimization', {
        originalSize: imageBuffer.length,
        originalMimeType: mimeType,
        targetFormat: format
      });
      
      // Get image metadata
      const metadata = await sharp(imageBuffer).metadata();
      
      let processedBuffer = imageBuffer;
      let needsProcessing = false;
      
      // Check if image needs resizing
      if (metadata.width > maxWidth || metadata.height > maxHeight) {
        needsProcessing = true;
        logger.info('Image needs resizing', {
          originalDimensions: `${metadata.width}x${metadata.height}`,
          maxDimensions: `${maxWidth}x${maxHeight}`
        });
      }
      
      // Check if image needs compression (larger than 1MB)
      if (imageBuffer.length > 1024 * 1024) {
        needsProcessing = true;
        logger.info('Image needs compression', {
          originalSize: `${(imageBuffer.length / 1024 / 1024).toFixed(2)}MB`
        });
      }
      
      // Process image if needed
      if (needsProcessing) {
        let sharpInstance = sharp(imageBuffer)
          .resize(maxWidth, maxHeight, {
            fit: 'inside',
            withoutEnlargement: true
          });
        
        // Convert to target format with quality settings
        if (format === 'jpeg') {
          sharpInstance = sharpInstance.jpeg({ quality, progressive: true });
        } else if (format === 'png') {
          sharpInstance = sharpInstance.png({ quality, progressive: true });
        } else if (format === 'webp') {
          sharpInstance = sharpInstance.webp({ quality });
        }
        
        processedBuffer = await sharpInstance.toBuffer();
        
        logger.info('Image optimization completed', {
          originalSize: imageBuffer.length,
          processedSize: processedBuffer.length,
          compressionRatio: `${((1 - processedBuffer.length / imageBuffer.length) * 100).toFixed(1)}%`
        });
      } else {
        logger.info('Image optimization skipped - no processing needed');
      }
      
      // Get final metadata
      const finalMetadata = await sharp(processedBuffer).metadata();
      
      return {
        buffer: processedBuffer,
        mimeType: `image/${format}`,
        metadata: {
          width: finalMetadata.width,
          height: finalMetadata.height,
          format: finalMetadata.format,
          size: processedBuffer.length,
          channels: finalMetadata.channels,
          hasAlpha: finalMetadata.hasAlpha
        },
        optimization: {
          wasProcessed: needsProcessing,
          originalSize: imageBuffer.length,
          finalSize: processedBuffer.length,
          compressionRatio: needsProcessing ? 
            `${((1 - processedBuffer.length / imageBuffer.length) * 100).toFixed(1)}%` : '0%'
        }
      };
      
    } catch (error) {
      logger.error('Image optimization failed:', error);
      throw new Error(`圖片處理失敗: ${error.message}`);
    }
  }
  
  /**
   * Extract image metadata without processing
   * @param {Buffer} imageBuffer - Image buffer
   * @returns {Promise<Object>} Image metadata
   */
  static async getImageMetadata(imageBuffer) {
    try {
      const metadata = await sharp(imageBuffer).metadata();
      
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: imageBuffer.length,
        channels: metadata.channels,
        hasAlpha: metadata.hasAlpha,
        density: metadata.density,
        isAnimated: metadata.pages > 1
      };
    } catch (error) {
      logger.error('Failed to extract image metadata:', error);
      throw new Error(`無法讀取圖片資訊: ${error.message}`);
    }
  }
  
  /**
   * Convert image to base64 data URL
   * @param {Buffer} imageBuffer - Image buffer
   * @param {string} mimeType - MIME type
   * @returns {string} Base64 data URL
   */
  static toDataURL(imageBuffer, mimeType) {
    const base64 = imageBuffer.toString('base64');
    return `data:${mimeType};base64,${base64}`;
  }
  
  /**
   * Get file size in human readable format
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted file size
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

module.exports = ImageProcessor;