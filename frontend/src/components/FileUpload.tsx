import React, { useState } from 'react';
import { CSVRecord } from '../App';

interface FileUploadProps {
  onFileUpload: (data: CSVRecord[], headers: string[]) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('ファイルサイズが10MBを超えています');
      return;
    }

    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:8080/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        onFileUpload(data.records, data.headers);
      } else {
        const error = await response.json();
        alert(error.error || 'ファイルのアップロードに失敗しました');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('サーバーとの通信エラーが発生しました');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  return (
    <div className="file-upload">
      <h2>CSVファイルをアップロード</h2>
      <p>マネーフォワードMEから出力した「収入・支出詳細」のCSVファイルを選択してください。</p>
      
      <div
        className={`drop-zone ${isDragOver ? 'drag-over' : ''} ${isUploading ? 'uploading' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {isUploading ? (
          <div className="upload-status">
            <div className="spinner"></div>
            <p>アップロード中...</p>
          </div>
        ) : (
          <>
            <div className="upload-icon">📁</div>
            <p>CSVファイルをここにドラッグ&ドロップ</p>
            <p>または</p>
            <label className="file-input-button">
              ファイルを選択
              <input
                type="file"
                accept=".csv"
                onChange={handleFileInputChange}
                style={{ display: 'none' }}
              />
            </label>
          </>
        )}
      </div>

      <div className="file-requirements">
        <h3>ファイル要件</h3>
        <ul>
          <li>ファイル形式: CSV (.csv)</li>
          <li>最大サイズ: 10MB</li>
          <li>エンコーディング: Shift_JIS</li>
          <li>必須カラム: 計算対象、日付、内容、金額（円）、保有金融機関、大項目、中項目、メモ、振替、ID</li>
        </ul>
      </div>
    </div>
  );
};

export default FileUpload;