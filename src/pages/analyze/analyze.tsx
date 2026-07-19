import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { useApp } from '../../context/app-context';
import { mockDocuments, mockAnalysis, getFileExtension, type DocumentAnalysis } from '../../data/mock';
import UploadZone from '../../components/upload/upload-zone';
import DocumentViewer from './document-viewer';
import Inspector from './inspector';
import ProcessingStatus from './processing-status';
import Badge from '../../components/ui/badge';
import styles from './analyze.module.css';

type Mode = 'upload' | 'processing' | 'workspace';

export default function Analyze() {
  const [searchParams] = useSearchParams();
  const { setActiveDocument } = useApp();
  const [mode, setMode] = useState<Mode>('upload');
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState('');
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null);
  const [docName, setDocName] = useState('');

  // Check for doc param in URL (coming from dashboard)
  useEffect(() => {
    const docId = searchParams.get('doc');
    if (docId) {
      const doc = mockDocuments.find((d) => d.id === docId);
      if (doc && doc.status === 'completed') {
        setDocName(doc.filename);
        setFileType(doc.type);
        setAnalysis(mockAnalysis[doc.id] ?? null);
        setActiveDocument(doc);
        setMode('workspace');
      }
    }
  }, [searchParams, setActiveDocument]);

  const handleFileSelect = useCallback((file: File) => {
    setCurrentFile(file);
    setDocName(file.name);
    setFileType(getFileExtension(file.name));
    setMode('processing');
  }, []);

  const handleProcessingComplete = useCallback(() => {
    // Use doc-001 analysis as mock result
    setAnalysis(mockAnalysis['doc-001'] ?? null);
    setMode('workspace');
  }, []);

  if (mode === 'upload') {
    return (
      <div className={styles.page}>
        <div className={styles.uploadMode}>
          <div className={styles.uploadWrapper}>
            <h1 className={styles.uploadTitle}>Analyze a Document</h1>
            <p className={styles.uploadSubtitle}>
              Upload your document and OmniParse will analyze its layout, extract text, detect tables and images, and reconstruct the reading order.
            </p>
            <UploadZone onFileSelect={handleFileSelect} />
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'processing') {
    return (
      <div className={styles.page}>
        <ProcessingStatus onComplete={handleProcessingComplete} />
      </div>
    );
  }

  // Workspace mode
  return (
    <div className={styles.page}>
      <div className={styles.workspace}>
        {/* Left: Document Viewer */}
        <div className={styles.viewerPanel}>
          <div className={styles.toolbar}>
            <div className={styles.toolbarLeft}>
              <FileText size={14} style={{ color: 'var(--text-muted)' }} />
              <span className={styles.toolbarFilename}>{docName}</span>
            </div>
            <div className={styles.toolbarRight}>
              <Badge status="completed" />
            </div>
          </div>
          <DocumentViewer file={currentFile} fileType={fileType} />
        </div>

        {/* Right: Inspector */}
        <div className={styles.inspectorPanel}>
          <div className={styles.toolbar}>
            <div className={styles.toolbarLeft}>
              <span className={styles.toolbarFilename} style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-primary)', fontWeight: 500 }}>
                Inspector
              </span>
            </div>
          </div>
          <Inspector analysis={analysis} />
        </div>
      </div>
    </div>
  );
}
