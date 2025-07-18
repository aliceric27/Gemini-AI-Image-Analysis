import { useState } from 'react';
import { useAnalysis } from '../../context/AnalysisContext';
import JsonSchemaInput from '../json/JsonSchemaInput';

const AnalysisInstructions = () => {
  const [activeTab, setActiveTab] = useState('json');
  const {
    jsonSchema,
    customPrompt,
    handleJsonSchemaChange,
    handleCustomPromptChange,
    isLoading
  } = useAnalysis();

  const handleCustomPromptInputChange = (event) => {
    handleCustomPromptChange(event.target.value);
  };

  const handleClearCustomPrompt = () => {
    handleCustomPromptChange('');
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  return (
    <div className="analysis-instructions">
      <div className="analysis-instructions-header">
        <h2 className="analysis-instructions-title">分析指令設定</h2>
        <div className="analysis-tabs">
          <button
            className={`analysis-tab ${activeTab === 'json' ? 'active' : ''}`}
            onClick={() => handleTabChange('json')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            JSON 結構
          </button>
          <button
            className={`analysis-tab ${activeTab === 'prompt' ? 'active' : ''}`}
            onClick={() => handleTabChange('prompt')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
            自訂提示詞
          </button>
        </div>
      </div>

      <div className="analysis-instructions-content">
        {activeTab === 'json' && (
          <div className="analysis-tab-content">
            <JsonSchemaInput 
              value={jsonSchema}
              onChange={handleJsonSchemaChange}
            />
          </div>
        )}

        {activeTab === 'prompt' && (
          <div className="analysis-tab-content">
            <div className="custom-prompt-section">
              <div className="custom-prompt-input-group">
                <label htmlFor="custom-prompt-input" className="custom-prompt-label">
                  自定義分析提示詞
                </label>
                <div className="custom-prompt-input-wrapper">
                  <textarea
                    id="custom-prompt-input"
                    value={customPrompt}
                    onChange={handleCustomPromptInputChange}
                    placeholder="輸入您的自定義分析提示詞，例如：請詳細分析這張圖片中的人物情緒和肢體語言..."
                    className="custom-prompt-input"
                    disabled={isLoading}
                    rows="12"
                  />
                  {customPrompt && (
                    <button
                      type="button"
                      onClick={handleClearCustomPrompt}
                      className="custom-prompt-clear-btn"
                      title="清除提示詞"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  )}
                </div>
                <div className="custom-prompt-meta">
                  <span className="custom-prompt-counter">
                    {customPrompt.length} 字元
                  </span>
                  {customPrompt.length > 1000 && (
                    <span className="custom-prompt-warning">
                      ⚠️ 提示詞過長可能影響性能
                    </span>
                  )}
                </div>
              </div>
              
              <div className="custom-prompt-info">
                <div className="custom-prompt-status">
                  {customPrompt.trim() ? (
                    <div className="custom-prompt-status-item status-has-prompt">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <span>已設定自訂提示詞（將優先使用此提示詞）</span>
                    </div>
                  ) : (
                    <div className="custom-prompt-status-item status-no-prompt">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                      <span>使用系統預設提示詞</span>
                    </div>
                  )}
                </div>
                
                <div className="custom-prompt-help">
                  <p className="custom-prompt-description">
                    自訂提示詞允許您精確控制 AI 分析的內容和方式。當設定自訂提示詞時，將優先使用您的提示詞而非 JSON 結構定義。
                  </p>
                  <p className="custom-prompt-tip">
                    提示：您可以在自訂提示詞中要求特定的 JSON 格式輸出，實現更靈活的分析控制。
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="analysis-instructions-footer">
        <div className="analysis-mode-indicator">
          {activeTab === 'json' ? (
            <div className="mode-indicator json-mode">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <span>使用 JSON 結構定義分析格式</span>
            </div>
          ) : (
            <div className="mode-indicator prompt-mode">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
              <span>使用自訂提示詞進行分析</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalysisInstructions;