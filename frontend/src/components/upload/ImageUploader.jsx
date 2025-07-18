import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

const ImageUploader = ({ onImageUpload, onImageRemove, uploadedImage, error }) => {
  const [dragError, setDragError] = useState(null);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    setDragError(null);
    
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      if (rejection.errors[0]?.code === 'file-too-large') {
        setDragError('檔案大小超過 10MB 限制');
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        setDragError('僅支援 JPEG, PNG, WebP, GIF 格式');
      } else {
        setDragError('檔案上傳失敗，請重試');
      }
      return;
    }

    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = {
          file: file,
          preview: e.target.result,
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified
        };
        onImageUpload(imageData);
      };
      reader.readAsDataURL(file);
    }
  }, [onImageUpload]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/gif': ['.gif']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false
  });

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleRemoveImage = () => {
    setDragError(null);
    onImageRemove();
  };

  return (
    <div className="image-uploader">
      {!uploadedImage ? (
        <div
          {...getRootProps()}
          className={`dropzone ${isDragActive ? 'dropzone-active' : ''} ${
            isDragReject ? 'dropzone-reject' : ''
          } ${error || dragError ? 'dropzone-error' : ''}`}
        >
          <input {...getInputProps()} />
          <div className="dropzone-content">
            <div className="dropzone-icon">
              <svg 
                width="48" 
                height="48" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21,15 16,10 5,21"/>
              </svg>
            </div>
            <div className="dropzone-text">
              {isDragActive ? (
                isDragReject ? (
                  <p className="dropzone-error-text">不支援的檔案格式</p>
                ) : (
                  <p className="dropzone-active-text">放開以上傳圖片</p>
                )
              ) : (
                <>
                  <p className="dropzone-main-text">
                    拖放圖片到此處，或 <span className="dropzone-browse">點擊瀏覽</span>
                  </p>
                  <p className="dropzone-sub-text">
                    支援 JPEG, PNG, WebP, GIF 格式，最大 10MB
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="image-preview">
          <div className="image-preview-container">
            <img 
              src={uploadedImage.preview} 
              alt={uploadedImage.name}
              className="preview-image"
            />
            <button 
              onClick={handleRemoveImage}
              className="remove-image-btn"
              title="移除圖片"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div className="image-info">
            <h4 className="image-name">{uploadedImage.name}</h4>
            <div className="image-details">
              <span className="image-size">{formatFileSize(uploadedImage.size)}</span>
              <span className="image-type">{uploadedImage.type}</span>
            </div>
            <div className="image-date">
              上傳時間：{formatDate(uploadedImage.lastModified)}
            </div>
          </div>
        </div>
      )}
      
      {(error || dragError) && (
        <div className="upload-error">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <span>{error || dragError}</span>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;