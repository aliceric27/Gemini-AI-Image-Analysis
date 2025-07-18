import { useState } from 'react';
import JSONPretty from 'react-json-pretty';

const ResultsDisplay = ({ results, isLoading, error }) => {
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopyToClipboard = async () => {
    try {
      const jsonString = JSON.stringify(results, null, 2);
      await navigator.clipboard.writeText(jsonString);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('複製到剪貼簿失敗:', err);
    }
  };

  const handleDownloadJSON = () => {
    try {
      const jsonString = JSON.stringify(results, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `gemini-analysis-${new Date().getTime()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('下載檔案失敗:', err);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="results-display">
        <div className="results-loading">
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
          <div className="loading-text">
            <h3>正在分析圖片...</h3>
            <p>請稍候，Gemini 正在處理您的請求</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="results-display">
        <div className="results-error">
          <div className="error-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <h3>分析失敗</h3>
          <p>{error}</p>
          <button className="retry-btn" onClick={() => window.location.reload()}>
            重新嘗試
          </button>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="results-display">
        <div className="results-empty">
          <div className="empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10,9 9,9 8,9"/>
            </svg>
          </div>
          <h3>等待分析結果</h3>
          <p>上傳圖片並點擊「開始分析」以查看結果</p>
        </div>
      </div>
    );
  }

  const jsonString = JSON.stringify(results, null, 2);
  const estimatedSize = new Blob([jsonString]).size;

  return (
    <div className="results-display">
      <div className="results-header">
        <div className="results-info">
          <h3>分析結果</h3>
          <div className="results-meta">
            <span className="result-size">{formatFileSize(estimatedSize)}</span>
            <span className="result-time">
              {new Date().toLocaleString('zh-TW', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        </div>
        
        <div className="results-actions">
          <button 
            className="copy-btn"
            onClick={handleCopyToClipboard}
            title="複製到剪貼簿"
          >
            {copySuccess ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20,6 9,17 4,12"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            )}
            {copySuccess ? '已複製' : '複製'}
          </button>
          
          <button 
            className="download-btn"
            onClick={handleDownloadJSON}
            title="下載 JSON 檔案"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7,10 12,15 17,10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            下載
          </button>
        </div>
      </div>

      <div className="results-content">
        <div className="json-display">
          <JSONPretty 
            id="json-pretty" 
            data={results}
            theme={{
              main: 'background: var(--white); color: var(--gray-800); line-height: 1.6;',
              error: 'background: #fef2f2; color: var(--error-color);',
              key: 'color: var(--primary-color); font-weight: 600;',
              string: 'color: var(--secondary-color);',
              value: 'color: var(--gray-700);',
              boolean: 'color: var(--accent-color); font-weight: 600;',
              number: 'color: #8b5cf6; font-weight: 600;'
            }}
          />
        </div>
      </div>

      {copySuccess && (
        <div className="copy-notification">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20,6 9,17 4,12"/>
          </svg>
          已複製到剪貼簿
        </div>
      )}
    </div>
  );
};

export default ResultsDisplay;