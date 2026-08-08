import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { useApp } from '../../context/app-context';
import {
  getFileExtension,
  type Document,
  type DocumentAnalysis,
  type DocumentType,
  type TransformOutput,
  type ProcessingJob,
  type ExtractedImage,
} from '../../data/mock';
import { parseDocumentFile, createAnalysisFromLines, extractEmbeddedImagesFromFile } from '../../utils/document-parser';
import UploadZone from '../../components/upload/upload-zone';
import DocumentViewer from './document-viewer';
import Inspector from './inspector';
import ProcessingStatus from './processing-status';
import Badge from '../../components/ui/badge';
import styles from './analyze.module.css';

type Mode = 'upload' | 'processing' | 'workspace';

export default function Analyze() {
  const [searchParams] = useSearchParams();
  const { state, addDocument, setActiveDocument } = useApp();
  const [mode, setMode] = useState<Mode>('upload');
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState('');
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null);
  const [docName, setDocName] = useState('');
  const [ocrLanguage, setOcrLanguage] = useState<string>('en');

  // Check for doc param in URL (coming from dashboard)
  useEffect(() => {
    const docId = searchParams.get('doc');
    if (docId) {
      const doc = state.documents.find((d) => d.id === docId);
      if (doc) {
        setDocName(doc.filename);
        setFileType(doc.type);
        setAnalysis(state.analysisStore[doc.id] ?? null);
        setActiveDocument(doc);
        setMode('workspace');
      }
    }
  }, [searchParams, state.documents, state.analysisStore, setActiveDocument]);

  const handleFileSelect = useCallback((file: File) => {
    setCurrentFile(file);
    setDocName(file.name);
    setFileType(getFileExtension(file.name));
    setMode('processing');
  }, []);

  const finishProcessing = useCallback(
    async (lines: string[], backendImages?: ExtractedImage[], pageImages: string[] = [], durationSec: number = 1.2) => {
      if (!currentFile) return;

      let images = backendImages || [];
      if (!images || images.length === 0) {
        images = await extractEmbeddedImagesFromFile(currentFile);
      }

      const liveAnalysis = createAnalysisFromLines(lines, currentFile, images, pageImages);
      const docId = 'doc-' + Date.now();

      const ext = (getFileExtension(currentFile.name) || 'pdf') as DocumentType;
      const liveDoc: Document = {
        id: docId,
        filename: currentFile.name,
        type: ext,
        status: 'completed',
        uploadDate: new Date().toISOString(),
        fileSize: currentFile.size,
        pages: liveAnalysis.metadata.pages,
      };

      const markdownText = lines.map((l, i) => (i === 0 ? `# ${l}` : i === 1 ? `## ${l}` : l)).join('\n\n');
      const jsonText = JSON.stringify(
        {
          document: currentFile.name,
          ocrLanguage,
          extractedLines: lines,
          extractedImagesCount: images.length,
          renderedPagesCount: pageImages.length,
          metadata: liveAnalysis.metadata,
        },
        null,
        2
      );
      const plainText = lines.join('\n');
      const approxTokens = Math.round(plainText.length / 4);

      const liveTransform: TransformOutput = {
        documentId: docId,
        markdown: markdownText,
        json: jsonText,
        plaintext: plainText,
        originalTokens: approxTokens * 2,
        markdownTokens: Math.round(approxTokens * 0.75),
        jsonTokens: Math.round(approxTokens * 1.25),
        plaintextTokens: approxTokens,
      };

      const liveJob: ProcessingJob = {
        id: 'job-' + Date.now(),
        documentId: docId,
        documentName: currentFile.name,
        status: 'completed',
        started: new Date().toISOString(),
        duration: `${durationSec.toFixed(1)}s`,
        outputFormat: 'markdown',
      };

      addDocument(liveDoc, liveAnalysis, liveTransform, liveJob);
      setAnalysis(liveAnalysis);
      setMode('workspace');
    },
    [currentFile, addDocument, ocrLanguage]
  );

  const handleProcessingComplete = useCallback(async () => {
    const startTime = Date.now();
    if (currentFile) {
      // Try PaddleOCR backend first (120s timeout for large multi-page documents)
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000);

        const formData = new FormData();
        formData.append('file', currentFile);
        formData.append('ocr_lang', ocrLanguage);

        console.log(`[OmniParse] Sending ${currentFile.name} to PaddleOCR backend (lang: '${ocrLanguage}')...`);

        const res = await fetch('/api/v1/extract', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const elapsedSec = Math.max((Date.now() - startTime) / 1000, 0.4);

        if (res.ok) {
          const data = await res.json();
          console.log(`[OmniParse] PaddleOCR returned ${data.payload?.extracted_text?.length ?? 0} lines, ${data.payload?.extracted_images?.length ?? 0} images & ${data.payload?.page_images?.length ?? 0} slide page images`);
          if (data.payload?.extracted_text?.length > 0 || data.payload?.extracted_images?.length > 0 || data.payload?.page_images?.length > 0) {
            await finishProcessing(
              data.payload.extracted_text || [],
              data.payload.extracted_images || [],
              data.payload.page_images || [],
              elapsedSec
            );
            return;
          }
        }
      } catch (err) {
        console.warn('[OmniParse] PaddleOCR backend unavailable, falling back to client-side parsing.', err);
      }

      // Fallback: client-side extraction
      const elapsedSec = Math.max((Date.now() - startTime) / 1000, 0.4);
      const lines = await parseDocumentFile(currentFile);
      const images = await extractEmbeddedImagesFromFile(currentFile);
      if (lines.length > 0 || images.length > 0) {
        await finishProcessing(lines, images, [], elapsedSec);
        return;
      }
    }

    const elapsedSec = Math.max((Date.now() - startTime) / 1000, 0.4);
    await finishProcessing([currentFile?.name ?? 'Uploaded Document'], [], [], elapsedSec);
  }, [currentFile, finishProcessing, ocrLanguage]);

  const languages = [
    { code: 'en', label: '🇬🇧 English' },
    { code: 'japan', label: '🇯🇵 Japanese (日本語)' },
    { code: 'german', label: '🇩🇪 German (Deutsch)' },
    { code: 'french', label: '🇫🇷 French (Français)' },
    { code: 'es', label: '🇪🇸 Spanish (Español)' },
    { code: 'ch', label: '🇨🇳 Chinese (中文)' },
    { code: 'hi', label: '🇮🇳 Hindi (हिन्दी)' },
  ];

  if (mode === 'upload') {
    return (
      <div className={styles.page}>
        <div className={styles.uploadMode}>
          <div className={styles.uploadWrapper}>
            <h1 className={styles.uploadTitle}>Analyze a Document</h1>
            <p className={styles.uploadSubtitle}>
              Upload your document and OmniParse will analyze its layout, extract text, detect tables and images, and reconstruct the reading order.
            </p>

            {/* OCR Language Selector */}
            <div style={{ marginBottom: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                Select Document Language for PaddleOCR:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px' }}>
                {languages.map((lang) => {
                  const isActive = ocrLanguage === lang.code;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => setOcrLanguage(lang.code)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 600,
                        border: isActive ? '1px solid #6366f1' : '1px solid var(--border)',
                        backgroundColor: isActive ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-card)',
                        color: isActive ? '#818cf8' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {lang.label}
                    </button>
                  );
                })}
              </div>
            </div>

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
          <DocumentViewer file={currentFile} fileType={fileType} docName={docName} analysis={analysis} />
        </div>

        {/* Right: Inspector */}
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
