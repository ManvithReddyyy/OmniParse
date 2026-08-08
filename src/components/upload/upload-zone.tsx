import { useState, useRef, type DragEvent } from 'react';
import { Upload } from 'lucide-react';
import { UploadCard } from '@/components/ui/upload-ui';
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
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const processFile = (file: File) => {
    setSelectedFile(file);
    setUploadState('uploading');
    setProgress(25);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          setUploadState('success');
          return 100;
        }
        return prev + 25;
      });
    }, 200);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && isValidFile(file)) {
      processFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
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
    setUploadState('idle');
    setProgress(0);
    if (inputRef.current) inputRef.current.value = '';
  };

  if (selectedFile && uploadState !== 'idle') {
    return (
      <div className={`${styles.zone} ${compact ? styles.compact : ''} ${className}`} style={{ border: 'none', background: 'transparent', padding: 0, display: 'flex', justifyContent: 'center' }}>
        <UploadCard
          status={uploadState === 'uploading' ? 'uploading' : uploadState === 'success' ? 'success' : 'error'}
          progress={progress}
          title={uploadState === 'uploading' ? 'Just a minute...' : 'Your file was uploaded!'}
          description={
            uploadState === 'uploading'
              ? 'Your file is uploading right now. Just give us a second to finish your upload.'
              : `Successfully uploaded ${selectedFile.name} (${formatFileSize(selectedFile.size)}). Ready for OCR extraction.`
          }
          primaryButtonText={uploadState === 'uploading' ? 'Cancel' : 'Process Document'}
          onPrimaryButtonClick={uploadState === 'uploading' ? clearFile : handleProcess}
          secondaryButtonText={uploadState !== 'uploading' ? 'Remove' : undefined}
          onSecondaryButtonClick={uploadState !== 'uploading' ? clearFile : undefined}
          onClose={clearFile}
        />
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
