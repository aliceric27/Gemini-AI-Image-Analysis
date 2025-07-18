import { useState, useEffect } from 'react';
import { apiService } from '../../utils/apiService';

const ModelSelector = ({ selectedModel, onModelChange, disabled = false }) => {
  const [models, setModels] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch available models on component mount
  useEffect(() => {
    fetchAvailableModels();
  }, []);

  const fetchAvailableModels = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Fetching available models...');
      const response = await apiService.getAvailableModels();
      
      if (response.success && response.data.models) {
        setModels(response.data.models);
        console.log('Models loaded successfully:', response.data.models);
        
        // If no model is selected and we have models, select the first one
        if (!selectedModel && response.data.models.length > 0) {
          const defaultModel = response.data.models[0];
          onModelChange(defaultModel.name);
        }
      } else {
        throw new Error('無法獲取模型列表');
      }
    } catch (err) {
      console.error('Failed to fetch models:', err);
      setError(err.message || '載入模型列表失敗');
    } finally {
      setIsLoading(false);
    }
  };

  const handleModelChange = (event) => {
    const modelName = event.target.value;
    onModelChange(modelName);
  };

  const handleRefresh = () => {
    fetchAvailableModels();
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

  return (
    <div className="model-selector">
      <div className="model-selector-header">
        <label htmlFor="model-select" className="model-selector-label">
          選擇 AI 模型
        </label>
        <button
          onClick={handleRefresh}
          className="model-refresh-btn"
          disabled={isLoading}
          title="重新載入模型列表"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="m3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
        </button>
      </div>

      {isLoading ? (
        <div className="model-selector-loading">
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
          <span>載入模型列表中...</span>
        </div>
      ) : error ? (
        <div className="model-selector-error">
          <div className="error-content">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <span>{error}</span>
          </div>
          <button onClick={handleRefresh} className="error-retry-btn">
            重試
          </button>
        </div>
      ) : (
        <div className="model-selector-content">
          <select
            id="model-select"
            value={selectedModel || ''}
            onChange={handleModelChange}
            disabled={disabled || models.length === 0}
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

          {selectedModel && models.length > 0 && (
            <div className="model-info">
              {(() => {
                const currentModel = models.find(m => m.name === selectedModel);
                if (!currentModel) return null;
                
                return (
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

                    {currentModel.pricing && (
                      <div className="model-pricing">
                        <span className="pricing-label">定價 (每百萬 tokens):</span>
                        <div className="pricing-details">
                          <span className="pricing-input">
                            輸入: ${currentModel.pricing.input.normal}
                            {currentModel.pricing.input.large && 
                              ` / $${currentModel.pricing.input.large}`}
                          </span>
                          <span className="pricing-output">
                            輸出: ${currentModel.pricing.output.normal}
                            {currentModel.pricing.output.large && 
                              ` / $${currentModel.pricing.output.large}`}
                          </span>
                        </div>
                      </div>
                    )}

                    {currentModel.rateLimit && (
                      <div className="model-rate-limit">
                        <span className="rate-limit-label">速率限制:</span>
                        <div className="rate-limit-details">
                          <span className="rate-limit-rpm">{currentModel.rateLimit.rpm} RPM</span>
                          {currentModel.rateLimit.free && (
                            <span className="rate-limit-free">
                              免費: {currentModel.rateLimit.free.rpm} RPM / {currentModel.rateLimit.free.daily} 次/日
                            </span>
                          )}
                        </div>
                      </div>
                    )}

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

                    {currentModel.supportedMethods && currentModel.supportedMethods.length > 0 && (
                      <div className="model-capabilities">
                        <span className="capabilities-label">支援功能:</span>
                        <div className="capabilities-list">
                          {currentModel.supportedMethods.includes('generateContent') && (
                            <span className="capability-tag">文本生成</span>
                          )}
                          <span className="capability-tag">圖像分析</span>
                          <span className="capability-tag">多模態</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {models.length > 0 && (
            <div className="model-stats">
              <span className="model-count">可用模型: {models.length} 個</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ModelSelector;