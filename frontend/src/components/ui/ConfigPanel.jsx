import { useState, useEffect } from 'react';
import { useAnalysis } from '../../context/AnalysisContext';
import { apiService } from '../../utils/apiService';

const ConfigPanel = () => {
  const {
    apiKey,
    selectedModel,
    saveApiKey,
    handleApiKeyChange,
    handleModelChange,
    handleSaveApiKeyChange,
    isLoading
  } = useAnalysis();

  const [models, setModels] = useState([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState(null);
  const [showApiKey, setShowApiKey] = useState(false);

  // Fetch available models on component mount
  useEffect(() => {
    fetchAvailableModels();
  }, []);

  const fetchAvailableModels = async () => {
    try {
      setIsLoadingModels(true);
      setModelsError(null);
      
      console.log('Fetching available models...');
      const response = await apiService.getAvailableModels();
      
      if (response.success && response.data.models) {
        setModels(response.data.models);
        console.log('Models loaded successfully:', response.data.models);
        
        // If no model is selected and we have models, select the first one
        if (!selectedModel && response.data.models.length > 0) {
          const defaultModel = response.data.models[0];
          handleModelChange(defaultModel.name);
        }
      } else {
        throw new Error('無法獲取模型列表');
      }
    } catch (err) {
      console.error('Failed to fetch models:', err);
      setModelsError(err.message || '載入模型列表失敗');
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleApiKeyInputChange = (event) => {
    handleApiKeyChange(event.target.value);
  };

  const handleModelSelectChange = (event) => {
    const modelName = event.target.value;
    handleModelChange(modelName);
  };

  const handleSaveApiKeyToggle = (event) => {
    handleSaveApiKeyChange(event.target.checked);
  };


  const handleRefreshModels = () => {
    fetchAvailableModels();
  };

  const toggleApiKeyVisibility = () => {
    setShowApiKey(!showApiKey);
  };

  const getModelDisplayName = (model) => {
    return model.displayName || model.name.split('/').pop() || model.name;
  };

  const getModelDescription = (model) => {
    if (model.description && model.description !== model.name) {
      return model.description;
    }
    return `${getModelDisplayName(model)} - 多模態圖像分析模型`;
  };

  const getCurrentModel = () => {
    return models.find(m => m.name === selectedModel);
  };

  return (
    <div className="config-panel">
      <h2 className="config-panel-title">配置設定</h2>
      
      {/* API Key Section */}
      <div className="config-section">
        <h3 className="config-section-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
          </svg>
          API Key 設定
        </h3>
        <div className="api-key-container">
          <div className="api-key-input-group">
            <label htmlFor="api-key-input" className="api-key-label">
              Gemini API Key
            </label>
            <div className="api-key-input-wrapper">
              <input
                id="api-key-input"
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={handleApiKeyInputChange}
                placeholder="輸入您的 Gemini API Key"
                className="api-key-input"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={toggleApiKeyVisibility}
                className="api-key-visibility-btn"
                title={showApiKey ? '隱藏 API Key' : '顯示 API Key'}
              >
                {showApiKey ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
          
          <div className="api-key-options">
            <label className="api-key-save-checkbox">
              <input
                type="checkbox"
                checked={saveApiKey}
                onChange={handleSaveApiKeyToggle}
                disabled={isLoading}
              />
              <span className="checkmark"></span>
              儲存 API Key 到本地瀏覽器
            </label>
            <p className="api-key-warning">
              ⚠️ 儲存的 API Key 會以明文形式保存在瀏覽器中。如果您使用的是共用電腦，建議不要儲存。
            </p>
          </div>
          
          <div className="api-key-status">
            {apiKey ? (
              <div className="api-key-status-item status-has-key">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>已設定 API Key</span>
              </div>
            ) : (
              <div className="api-key-status-item status-no-key">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                <span>未設定 API Key（將使用伺服器預設 Key）</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Model Selection Section */}
      <div className="config-section">
        <h3 className="config-section-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <polyline points="7.5 4.21 12 6.81 16.5 4.21"></polyline>
            <polyline points="7.5 19.79 7.5 14.6 3 12"></polyline>
            <polyline points="21 12 16.5 14.6 16.5 19.79"></polyline>
          </svg>
          模型選擇
        </h3>
        <div className="model-selector-container">
          <div className="model-selector-header">
            <label htmlFor="model-select" className="model-selector-label">
              選擇 AI 模型
            </label>
            <button
              onClick={handleRefreshModels}
              className="model-refresh-btn"
              disabled={isLoadingModels}
              title="重新載入模型列表"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="m3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
            </button>
          </div>

          {isLoadingModels ? (
            <div className="model-selector-loading">
              <div className="loading-spinner">
                <div className="spinner"></div>
              </div>
              <span>載入模型列表中...</span>
            </div>
          ) : modelsError ? (
            <div className="model-selector-error">
              <div className="error-content">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                <span>{modelsError}</span>
              </div>
              <button onClick={handleRefreshModels} className="error-retry-btn">
                重試
              </button>
            </div>
          ) : (
            <div className="model-selector-content">
              <select
                id="model-select"
                value={selectedModel || ''}
                onChange={handleModelSelectChange}
                disabled={isLoading || models.length === 0}
                className="model-select"
              >
                {models.length === 0 ? (
                  <option value="">無可用模型</option>
                ) : (
                  <>
                    <option value="">選擇模型...</option>
                    {models.map((model) => (
                      <option key={model.name} value={model.name}>
                        {getModelDisplayName(model)}
                      </option>
                    ))}
                  </>
                )}
              </select>

              {selectedModel && models.length > 0 && (() => {
                const currentModel = getCurrentModel();
                if (!currentModel) return null;
                
                return (
                  <div className="model-info">
                    <div className="model-details">
                      <h4 className="model-title">{getModelDisplayName(currentModel)}</h4>
                      <p className="model-description">
                        {getModelDescription(currentModel)}
                      </p>
                      
                      <div className="model-meta">
                        {currentModel.version && (
                          <span className="model-version">版本: {currentModel.version}</span>
                        )}
                        {currentModel.knowledgeCutoff && (
                          <span className="model-cutoff">知識截止: {currentModel.knowledgeCutoff}</span>
                        )}
                        {currentModel.latency && (
                          <span className={`model-latency latency-${currentModel.latency}`}>
                            {currentModel.latency === 'very_fast' ? '極快' : 
                             currentModel.latency === 'fast' ? '快速' : '標準'}
                          </span>
                        )}
                      </div>

                      {currentModel.bestFor && currentModel.bestFor.length > 0 && (
                        <div className="model-best-for">
                          <span className="best-for-label">最適用於:</span>
                          <div className="best-for-list">
                            {currentModel.bestFor.map((use, index) => (
                              <span key={index} className="best-for-tag">{use}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {models.length > 0 && (
                <div className="model-stats">
                  <span className="model-count">可用模型: {models.length} 個</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default ConfigPanel;