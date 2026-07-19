import { useState, useRef, type DragEvent } from 'react';
import { Upload, File, X } from 'lucide-react';
import Button from '../ui/button';
import { formatFileSize } from '../../data/mock';
import styles from './upload-zone.module.css';

const ACCEPTED_TYPES = ['.pdf', '.docx', '.pptx', '.txt', '.png', '.jpg', '.jpeg', '.webp'];
const ACCEPTED_MIME = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/webp',
];

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  compact?: boolean;
  className?: string;
}

export default function UploadZone({ onFileSelect, compact, className = '' }: UploadZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && isValidFile(file)) {
      setSelectedFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const isValidFile = (file: File): boolean => {
    return ACCEPTED_MIME.includes(file.type) ||
      ACCEPTED_TYPES.some((ext) => file.name.toLowerCase().endsWith(ext));
  };

  const handleProcess = () => {
    if (selectedFile) {
      onFileSelect(selectedFile);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  if (selectedFile) {
    return (
      <div className={`${styles.zone} ${compact ? styles.compact : ''} ${className}`}>
        <div className={styles.selectedFile}>
          <div className={styles.icon}>
            <File size={compact ? 18 : 24} strokeWidth={1.5} />
          </div>
          <div className={styles.fileName}>{selectedFile.name}</div>
          <div className={styles.fileSize}>{formatFileSize(selectedFile.size)}</div>
          <div className={styles.fileActions}>
            <Button variant="ghost" size="sm" onClick={clearFile}>
              <X size={14} />
              Remove
            </Button>
            <Button variant="primary" size="sm" onClick={handleProcess}>
              <Upload size={14} />
              Process Document
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${styles.zone} ${dragOver ? styles.dragOver : ''} ${compact ? styles.compact : ''} ${className}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <div className={styles.icon}>
        <Upload size={compact ? 18 : 24} strokeWidth={1.5} />
      </div>
      <div className={styles.title}>
        {compact ? 'Upload a document' : 'Drop your document here'}
      </div>
      <div className={styles.subtitle}>
        {compact
          ? 'Click to browse or drag and drop'
          : 'Drag and drop your document, or click to browse. OmniParse will analyze the layout, extract text, tables, and images.'}
      </div>
      <div className={styles.formats}>
        {ACCEPTED_TYPES.map((ext) => (
          <span key={ext} className={styles.format}>{ext}</span>
        ))}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        onChange={handleFileChange}
        className={styles.fileInput}
      />
    </div>
  );
}
