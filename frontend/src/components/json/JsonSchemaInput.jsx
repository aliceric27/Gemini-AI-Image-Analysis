import { useState, useEffect } from 'react';

const JsonSchemaInput = ({ value, onChange, error }) => {
  const [localValue, setLocalValue] = useState(value || '');
  const [validationError, setValidationError] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);

  // Predefined JSON templates
  const templates = [
    {
      name: '產品描述分析',
      description: '分析產品圖片，提取名稱、價格、特徵等資訊',
      schema: {
        productName: "string",
        price: "number",
        currency: "string",
        features: ["string"],
        category: "string",
        brand: "string",
        condition: "string"
      }
    },
    {
      name: '文件內容擷取',
      description: '從文件圖片中提取文字和結構化資訊',
      schema: {
        documentType: "string",
        title: "string",
        content: "string",
        keyInformation: {
          dates: ["string"],
          numbers: ["string"],
          names: ["string"]
        },
        language: "string"
      }
    },
    {
      name: '物件辨識',
      description: '識別圖片中的物件及其屬性',
      schema: {
        objects: [
          {
            name: "string",
            confidence: "number",
            position: {
              x: "number",
              y: "number",
              width: "number",
              height: "number"
            },
            attributes: ["string"]
          }
        ],
        totalObjects: "number",
        imageDescription: "string"
      }
    },
    {
      name: '場景分析',
      description: '分析圖片場景、環境和氛圍',
      schema: {
        sceneType: "string",
        environment: "string",
        lighting: "string",
        weather: "string",
        mood: "string",
        colors: ["string"],
        activities: ["string"],
        timeOfDay: "string"
      }
    },
    {
      name: '自定義結構',
      description: '建立您自己的 JSON 結構',
      schema: {
        customField1: "string",
        customField2: "number",
        customArray: ["string"],
        customObject: {
          subField1: "string",
          subField2: "boolean"
        }
      }
    }
  ];

  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  const validateJSON = (jsonString) => {
    if (!jsonString.trim()) {
      setValidationError(null);
      return true;
    }

    try {
      JSON.parse(jsonString);
      setValidationError(null);
      return true;
    } catch (error) {
      setValidationError(`JSON 格式錯誤: ${error.message}`);
      return false;
    }
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    validateJSON(newValue);
    onChange(newValue);
  };

  const handleTemplateSelect = (template) => {
    const formattedJSON = JSON.stringify(template.schema, null, 2);
    setLocalValue(formattedJSON);
    validateJSON(formattedJSON);
    onChange(formattedJSON);
    setShowTemplates(false);
  };

  const formatJSON = () => {
    try {
      const parsed = JSON.parse(localValue);
      const formatted = JSON.stringify(parsed, null, 2);
      setLocalValue(formatted);
      onChange(formatted);
      setValidationError(null);
    } catch (error) {
      setValidationError(`無法格式化: ${error.message}`);
    }
  };

  const clearInput = () => {
    setLocalValue('');
    onChange('');
    setValidationError(null);
  };

  return (
    <div className="json-schema-input">
      <div className="json-header">
        <div className="json-actions">
          <div className="template-dropdown">
            <button 
              className="template-btn"
              onClick={() => setShowTemplates(!showTemplates)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="9" y1="9" x2="15" y2="9"/>
                <line x1="9" y1="12" x2="15" y2="12"/>
                <line x1="9" y1="15" x2="13" y2="15"/>
              </svg>
              模板
            </button>
            
            {showTemplates && (
              <div className="template-menu">
                {templates.map((template, index) => (
                  <div 
                    key={index}
                    className="template-item"
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <div className="template-name">{template.name}</div>
                    <div className="template-desc">{template.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <button 
            className="format-btn"
            onClick={formatJSON}
            disabled={!localValue.trim()}
            title="格式化 JSON"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="16,18 22,12 16,6"/>
              <polyline points="8,6 2,12 8,18"/>
            </svg>
            格式化
          </button>
          
          <button 
            className="clear-btn"
            onClick={clearInput}
            disabled={!localValue.trim()}
            title="清除內容"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            清除
          </button>
        </div>
      </div>

      <div className="json-input-container">
        <textarea
          className={`json-textarea ${validationError ? 'json-error' : ''} ${localValue && !validationError ? 'json-valid' : ''}`}
          value={localValue}
          onChange={handleInputChange}
          placeholder="請輸入期望的 JSON 結構，或選擇上方模板..."
          rows={15}
          spellCheck={false}
        />
        
        {localValue && (
          <div className="json-status">
            {validationError ? (
              <div className="json-status-error">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                格式錯誤
              </div>
            ) : (
              <div className="json-status-valid">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
                格式正確
              </div>
            )}
          </div>
        )}
      </div>

      {(validationError || error) && (
        <div className="json-error-message">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <span>{validationError || error}</span>
        </div>
      )}

      <div className="json-help">
        <details>
          <summary>JSON 格式說明</summary>
          <div className="json-help-content">
            <p><strong>基本格式：</strong></p>
            <ul>
              <li>使用雙引號 "" 包圍字串</li>
              <li>數字不需要引號</li>
              <li>布林值：true 或 false</li>
              <li>陣列：["item1", "item2"]</li>
              <li>物件：{`{"key": "value"}`}</li>
            </ul>
            <p><strong>範例：</strong></p>
            <pre className="json-example">
{`{
  "name": "字串值",
  "count": 123,
  "isActive": true,
  "items": ["項目1", "項目2"],
  "details": {
    "description": "說明"
  }
}`}
            </pre>
          </div>
        </details>
      </div>
    </div>
  );
};

export default JsonSchemaInput;