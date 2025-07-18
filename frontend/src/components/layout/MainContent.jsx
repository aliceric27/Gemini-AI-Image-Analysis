import { useAnalysis } from '../../context/AnalysisContext';
import ImageUploader from '../upload/ImageUploader';
import JsonSchemaInput from '../json/JsonSchemaInput';
import ResultsDisplay from '../results/ResultsDisplay';
import ConfigPanel from '../ui/ConfigPanel';
import { apiService, fileUtils } from '../../utils/apiService';

const MainContent = () => {
  const {
    uploadedImage,
    apiKey,
    selectedModel,
    jsonSchema,
    customPrompt,
    results,
    isLoading,
    error,
    canAnalyze,
    handleImageUpload,
    handleImageRemove,
    handleJsonSchemaChange,
    handleSetResults,
    handleSetLoading,
    handleSetError
  } = useAnalysis();

  const handleAnalyze = async () => {
    if (!canAnalyze) {
      return;
    }

    try {
      // Validate the uploaded image
      fileUtils.validateImageFile(uploadedImage.file);

      // Set loading state
      handleSetLoading(true);
      handleSetError(null);
      handleSetResults(null);

      console.log('Starting image analysis...', {
        imageName: uploadedImage.name,
        imageSize: uploadedImage.size,
        hasJsonSchema: !!jsonSchema.trim(),
        hasCustomPrompt: !!customPrompt.trim(),
        selectedModel: selectedModel || 'default',
        hasUserApiKey: !!apiKey
      });

      // Call the API with selected model, user API key, and custom prompt
      const response = await apiService.analyzeImage(
        uploadedImage.file, 
        jsonSchema, 
        selectedModel,
        apiKey,
        customPrompt
      );
      
      // Set the results
      handleSetResults(response);
      console.log('Analysis completed successfully');

    } catch (err) {
      console.error('Analysis failed:', err);
      handleSetError(err.message || '分析失敗，請重試');
      handleSetResults(null);
    } finally {
      handleSetLoading(false);
    }
  };

  return (
    <main className="main-content">
      <div className="main-container">
        {/* Left-Right Layout */}
        <div className="layout-container">
          {/* Left Column - Upload & Configuration */}
          <div className="left-column">
            {/* Image Upload Section */}
            <div className="section-card image-upload-section animate-in">
              <h2 className="section-title">圖片上傳</h2>
              <div className="section-content">
                <ImageUploader 
                  onImageUpload={handleImageUpload}
                  onImageRemove={handleImageRemove}
                  uploadedImage={uploadedImage}
                  error={error}
                />
              </div>
            </div>

            {/* Configuration Panel */}
            <div className="section-card config-section animate-in-delay-1">
              <ConfigPanel />
            </div>
          </div>

          {/* Right Column - JSON Schema & Results */}
          <div className="right-column">
            {/* JSON Structure Editor */}
            <div className="section-card json-section animate-in-delay-2">
              <h2 className="section-title">JSON 結構定義</h2>
              <div className="section-content">
                <JsonSchemaInput 
                  value={jsonSchema}
                  onChange={handleJsonSchemaChange}
                  error={error}
                />
              </div>
            </div>

            {/* Results Display */}
            <div className="section-card results-section animate-in-delay-3">
              <h2 className="section-title">分析結果</h2>
              <div className="section-content">
                <ResultsDisplay 
                  results={results}
                  isLoading={isLoading}
                  error={error}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="action-section">
          <button 
            className="analyze-btn"
            disabled={!canAnalyze}
            onClick={handleAnalyze}
          >
            {isLoading ? '分析中...' : '開始分析'}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="error-section">
            <div className="error-message">
              {error}
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default MainContent;