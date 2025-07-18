const logger = require('./logger');

class JsonValidator {
  /**
   * Validate JSON string format
   * @param {string} jsonString - JSON string to validate
   * @returns {Object} Validation result
   */
  static validateJsonString(jsonString) {
    try {
      if (!jsonString || typeof jsonString !== 'string') {
        return {
          isValid: false,
          error: 'JSON 字串為空或格式不正確',
          parsedJson: null
        };
      }
      
      const trimmed = jsonString.trim();
      if (trimmed === '') {
        return {
          isValid: true,
          error: null,
          parsedJson: null
        };
      }
      
      const parsedJson = JSON.parse(trimmed);
      
      return {
        isValid: true,
        error: null,
        parsedJson
      };
    } catch (error) {
      return {
        isValid: false,
        error: `JSON 解析錯誤: ${error.message}`,
        parsedJson: null
      };
    }
  }
  
  /**
   * Validate JSON schema structure
   * @param {Object} jsonSchema - Parsed JSON schema object
   * @returns {Object} Validation result
   */
  static validateJsonSchema(jsonSchema) {
    try {
      if (!jsonSchema || typeof jsonSchema !== 'object') {
        return {
          isValid: false,
          error: 'JSON schema 必須是一個物件',
          issues: []
        };
      }
      
      const issues = [];
      const warnings = [];
      
      // Check for common schema issues
      this.checkSchemaStructure(jsonSchema, '', issues, warnings);
      
      return {
        isValid: issues.length === 0,
        error: issues.length > 0 ? issues[0] : null,
        issues,
        warnings
      };
    } catch (error) {
      return {
        isValid: false,
        error: `Schema 驗證錯誤: ${error.message}`,
        issues: [error.message]
      };
    }
  }
  
  /**
   * Recursively check JSON schema structure
   * @param {any} obj - Object to check
   * @param {string} path - Current path in object
   * @param {Array} issues - Array to collect issues
   * @param {Array} warnings - Array to collect warnings
   */
  static checkSchemaStructure(obj, path, issues, warnings) {
    if (obj === null || obj === undefined) {
      return; // null/undefined values are acceptable
    }
    
    if (Array.isArray(obj)) {
      if (obj.length === 0) {
        warnings.push(`空陣列於 ${path || 'root'}`);
      } else {
        // Check array elements
        obj.forEach((item, index) => {
          this.checkSchemaStructure(item, `${path}[${index}]`, issues, warnings);
        });
      }
    } else if (typeof obj === 'object') {
      const keys = Object.keys(obj);
      
      if (keys.length === 0) {
        warnings.push(`空物件於 ${path || 'root'}`);
      }
      
      // Check for valid key names
      keys.forEach(key => {
        if (typeof key !== 'string') {
          issues.push(`無效的屬性名稱: ${key} 於 ${path}`);
          return;
        }
        
        // Check key naming convention
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
          warnings.push(`建議使用駝峰命名: ${key} 於 ${path}`);
        }
        
        const newPath = path ? `${path}.${key}` : key;
        this.checkSchemaStructure(obj[key], newPath, issues, warnings);
      });
    } else if (typeof obj === 'string') {
      // Check for valid type specifications
      const validTypes = ['string', 'number', 'boolean', 'array', 'object', 'null'];
      if (!validTypes.includes(obj.toLowerCase())) {
        warnings.push(`未知的類型指定: "${obj}" 於 ${path}`);
      }
    }
  }
  
  /**
   * Sanitize JSON string (remove potentially harmful content)
   * @param {string} jsonString - JSON string to sanitize
   * @returns {string} Sanitized JSON string
   */
  static sanitizeJsonString(jsonString) {
    if (typeof jsonString !== 'string') {
      return '';
    }
    
    // Remove potential script injection attempts
    let sanitized = jsonString
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/eval\s*\(/gi, '')
      .replace(/Function\s*\(/gi, '');
    
    // Limit length to prevent DoS
    const maxLength = 100000; // 100KB
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
      logger.warn('JSON string truncated due to length limit');
    }
    
    return sanitized;
  }
  
  /**
   * Generate sample JSON based on schema
   * @param {Object} schema - JSON schema object
   * @returns {Object} Sample JSON
   */
  static generateSampleFromSchema(schema) {
    try {
      return this.generateValueFromType(schema);
    } catch (error) {
      logger.error('Failed to generate sample from schema:', error);
      return { error: 'Unable to generate sample' };
    }
  }
  
  /**
   * Generate value based on type specification
   * @param {any} type - Type specification
   * @returns {any} Generated value
   */
  static generateValueFromType(type) {
    if (typeof type === 'string') {
      switch (type.toLowerCase()) {
        case 'string':
          return 'sample text';
        case 'number':
          return 123;
        case 'boolean':
          return true;
        case 'array':
          return ['sample item'];
        case 'object':
          return { key: 'value' };
        case 'null':
          return null;
        default:
          return `example_${type}`;
      }
    } else if (Array.isArray(type)) {
      return type.map(item => this.generateValueFromType(item));
    } else if (typeof type === 'object' && type !== null) {
      const result = {};
      Object.keys(type).forEach(key => {
        result[key] = this.generateValueFromType(type[key]);
      });
      return result;
    } else {
      return type; // Return as-is for primitive values
    }
  }
  
  /**
   * Check if response matches expected schema structure
   * @param {Object} response - Response to validate
   * @param {Object} expectedSchema - Expected schema
   * @returns {Object} Validation result
   */
  static validateResponseAgainstSchema(response, expectedSchema) {
    try {
      const mismatches = [];
      
      this.compareStructures(response, expectedSchema, '', mismatches);
      
      return {
        isValid: mismatches.length === 0,
        mismatches,
        matchPercentage: this.calculateMatchPercentage(response, expectedSchema)
      };
    } catch (error) {
      return {
        isValid: false,
        mismatches: [error.message],
        matchPercentage: 0
      };
    }
  }
  
  /**
   * Compare two structures recursively
   * @param {any} actual - Actual value
   * @param {any} expected - Expected value/type
   * @param {string} path - Current path
   * @param {Array} mismatches - Array to collect mismatches
   */
  static compareStructures(actual, expected, path, mismatches) {
    const actualType = this.getValueType(actual);
    const expectedType = this.getExpectedType(expected);
    
    if (actualType !== expectedType) {
      mismatches.push({
        path: path || 'root',
        expected: expectedType,
        actual: actualType,
        message: `類型不匹配: 期望 ${expectedType}, 實際 ${actualType}`
      });
      return;
    }
    
    if (typeof expected === 'object' && expected !== null && !Array.isArray(expected)) {
      Object.keys(expected).forEach(key => {
        const newPath = path ? `${path}.${key}` : key;
        if (!(key in actual)) {
          mismatches.push({
            path: newPath,
            expected: 'present',
            actual: 'missing',
            message: `缺少屬性: ${key}`
          });
        } else {
          this.compareStructures(actual[key], expected[key], newPath, mismatches);
        }
      });
    }
  }
  
  /**
   * Get type of actual value
   * @param {any} value - Value to check
   * @returns {string} Type name
   */
  static getValueType(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }
  
  /**
   * Get expected type from schema specification
   * @param {any} spec - Type specification
   * @returns {string} Expected type
   */
  static getExpectedType(spec) {
    if (typeof spec === 'string') {
      return spec.toLowerCase();
    }
    if (Array.isArray(spec)) {
      return 'array';
    }
    if (typeof spec === 'object' && spec !== null) {
      return 'object';
    }
    return typeof spec;
  }
  
  /**
   * Calculate match percentage between response and schema
   * @param {Object} response - Response object
   * @param {Object} schema - Schema object
   * @returns {number} Match percentage (0-100)
   */
  static calculateMatchPercentage(response, schema) {
    try {
      const expectedKeys = this.getAllKeys(schema);
      const actualKeys = this.getAllKeys(response);
      
      if (expectedKeys.length === 0) return 100;
      
      const matchingKeys = expectedKeys.filter(key => actualKeys.includes(key));
      return Math.round((matchingKeys.length / expectedKeys.length) * 100);
    } catch (error) {
      return 0;
    }
  }
  
  /**
   * Get all keys from nested object
   * @param {Object} obj - Object to extract keys from
   * @param {string} prefix - Key prefix
   * @returns {Array} Array of all keys
   */
  static getAllKeys(obj, prefix = '') {
    let keys = [];
    
    if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
      Object.keys(obj).forEach(key => {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        keys.push(fullKey);
        keys = keys.concat(this.getAllKeys(obj[key], fullKey));
      });
    }
    
    return keys;
  }
}

module.exports = JsonValidator;