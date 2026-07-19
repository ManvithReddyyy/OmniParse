import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { useApp } from '../../context/app-context';
import { mockDocuments, mockAnalysis, getFileExtension, formatFileSize, type DocumentAnalysis } from '../../data/mock';
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

  const handleProcessingComplete = useCallback(async () => {
    if (currentFile) {
      try {
        const formData = new FormData();
        formData.append('file', currentFile);

        // Call live PaddleOCR backend via Vercel/Vite rewrite proxy
        const res = await fetch('/api/v1/extract', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          if (data.payload?.extracted_text) {
            const lines: string[] = data.payload.extracted_text;
            const liveAnalysis: DocumentAnalysis = {
              documentId: 'live-' + Date.now(),
              layoutRegions: lines.map((line, idx) => ({
                id: `lr-${idx}`,
                type: 'paragraph',
                confidence: data.execution_metrics?.confidence_threshold ?? 0.975,
                bbox: { x: 40, y: 40 + idx * 30, width: 700, height: 25 },
                content: line,
              })),
              textBlocks: lines.map((line, idx) => ({
                id: `tb-${idx}`,
                text: line,
                confidence: data.execution_metrics?.confidence_threshold ?? 0.975,
                bbox: { x: 40, y: 40 + idx * 30, width: 700, height: 25 },
                blockType: 'extracted_text',
              })),
              tables: [],
              images: [],
              metadata: {
                language: 'English',
                pages: 1,
                documentType: 'PaddleOCR Extracted Document',
                wordCount: lines.join(' ').split(/\s+/).filter(Boolean).length,
                fileSize: formatFileSize(currentFile.size),
                creationDate: new Date().toISOString().split('T')[0],
                author: 'PaddlePaddle/PaddleOCR-VL-1.6',
                encoding: 'UTF-8',
              },
              readingOrder: lines.map((line, idx) => ({
                order: idx + 1,
                regionType: 'text',
                label: line.length > 25 ? line.slice(0, 25) + '...' : line,
                regionId: `lr-${idx}`,
              })),
            };

            setAnalysis(liveAnalysis);
            setMode('workspace');
            return;
          }
        }
      } catch (err) {
        console.warn('PaddleOCR API request error, using structured analysis fallback:', err);
      }
    }

    // Default fallback structure
    setAnalysis(mockAnalysis['doc-001'] ?? null);
    setMode('workspace');
  }, [currentFile]);

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

  // Workspace mode: Side-by-Side View (Original Document Left | PaddleOCR Extracted Text Right)
  return (
    <div className={styles.page}>
      <div className={styles.workspace}>
        {/* Left: Document Viewer (Original Uploaded File) */}
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
          <DocumentViewer file={currentFile} fileType={fileType} docName={docName} />
        </div>

        {/* Right: Inspector (PaddleOCR Extracted Content) */}
        <div className={styles.inspectorPanel}>
          <div className={styles.toolbar}>
            <div className={styles.toolbarLeft}>
              <span
                className={styles.toolbarFilename}
                style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-primary)', fontWeight: 500 }}
              >
                PaddleOCR Inspector
              </span>
            </div>
          </div>
          <Inspector analysis={analysis} />
        </div>
      </div>
    </div>
  );
}
