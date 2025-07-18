import React, { createContext, useContext, useState, useMemo } from 'react';

const AnalysisContext = createContext();

export const useAnalysis = () => {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error('useAnalysis must be used within an AnalysisProvider');
  }
  return context;
};

export const AnalysisProvider = ({ children }) => {
  // Image state
  const [uploadedImage, setUploadedImage] = useState(null);
  
  // API configuration state
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [saveApiKey, setSaveApiKey] = useState(false);
  
  // JSON structure state
  const [jsonSchema, setJsonSchema] = useState(JSON.stringify({
    "description": "圖片的整體描述",
    "objects": ["識別到的物件列表"],
    "colors": ["主要顏色"],
    "scene": "場景類型",
    "mood": "圖片氛圍",
    "tags": ["相關標籤"]
  }, null, 2));
  
  // Results and UI state
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Image handlers
  const handleImageUpload = (imageData) => {
    setUploadedImage(imageData);
    setError(null);
  };

  const handleImageRemove = () => {
    setUploadedImage(null);
    setResults(null);
    setError(null);
  };

  // Configuration handlers
  const handleApiKeyChange = (key) => {
    setApiKey(key);
    setError(null);
    
    // Save to localStorage if user wants to save
    if (saveApiKey && key) {
      localStorage.setItem('userApiKey', key);
    } else if (!key) {
      localStorage.removeItem('userApiKey');
    }
  };

  const handleModelChange = (modelName) => {
    setSelectedModel(modelName);
    setError(null);
  };

  const handleSaveApiKeyChange = (shouldSave) => {
    setSaveApiKey(shouldSave);
    
    if (shouldSave && apiKey) {
      localStorage.setItem('userApiKey', apiKey);
    } else if (!shouldSave) {
      localStorage.removeItem('userApiKey');
    }
  };

  // JSON schema handlers
  const handleJsonSchemaChange = (schema) => {
    setJsonSchema(schema);
    setError(null);
  };

  // Results handlers
  const handleSetResults = (newResults) => {
    setResults(newResults);
  };

  const handleSetLoading = (loading) => {
    setIsLoading(loading);
  };

  const handleSetError = (errorMessage) => {
    setError(errorMessage);
  };

  // Clear all data
  const handleClearAll = () => {
    setUploadedImage(null);
    setResults(null);
    setError(null);
    setJsonSchema(JSON.stringify({
      "description": "圖片的整體描述",
      "objects": ["識別到的物件列表"],
      "colors": ["主要顏色"],
      "scene": "場景類型",
      "mood": "圖片氛圍",
      "tags": ["相關標籤"]
    }, null, 2));
  };

  // Load saved API key on mount
  React.useEffect(() => {
    const savedKey = localStorage.getItem('userApiKey');
    if (savedKey) {
      setApiKey(savedKey);
      setSaveApiKey(true);
    }
  }, []);

  const value = useMemo(() => ({
    // State
    uploadedImage,
    apiKey,
    selectedModel,
    saveApiKey,
    jsonSchema,
    results,
    isLoading,
    error,
    
    // Handlers
    handleImageUpload,
    handleImageRemove,
    handleApiKeyChange,
    handleModelChange,
    handleSaveApiKeyChange,
    handleJsonSchemaChange,
    handleSetResults,
    handleSetLoading,
    handleSetError,
    handleClearAll,
    
    // Computed values
    canAnalyze: !!uploadedImage && !isLoading,
    hasUserApiKey: !!apiKey.trim()
  }), [
    uploadedImage,
    apiKey,
    selectedModel,
    saveApiKey,
    jsonSchema,
    results,
    isLoading,
    error
  ]);

  return (
    <AnalysisContext.Provider value={value}>
      {children}
    </AnalysisContext.Provider>
  );
};

export default AnalysisContext;