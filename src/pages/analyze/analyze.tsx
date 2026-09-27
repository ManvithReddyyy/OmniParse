import { useAuth } from '../../context/auth-context';
import { useState, useCallback, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FileText, ArrowLeft, ArrowRight, Download } from 'lucide-react';
import { useApp } from '../../context/app-context';
import { ENGINE_CONFIG } from '../../config/engine';
import {
  getFileExtension,
  type Document,
  type DocumentAnalysis,
  type DocumentType,
  type TransformOutput,
  type ProcessingJob,
  type ExtractedImage,
} from '../../data/mock';
import {
  parseDocumentFile,
  createAnalysisFromLines,
  extractEmbeddedImagesFromFile,
  generateMarkdownWithImages,
  generateJsonWithImages,
  generatePlainTextWithImages,
} from '../../utils/document-parser';
import UploadZone from '../../components/upload/upload-zone';
import DocumentViewer from './document-viewer';
import Inspector from './inspector';
import Badge from '../../components/ui/badge';
import Button from '../../components/ui/button';
import styles from './analyze.module.css';

type Mode = 'upload' | 'workspace';

export default function Analyze() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [searchParams] = useSearchParams();
  const { state, addDocument, setActiveDocument } = useApp();
  const [mode, setMode] = useState<Mode>('upload');
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState('');
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null);
  const [docName, setDocName] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);

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
        setIsExtracting(false);
        setMode('workspace');
      }
    }
  }, [searchParams, state.documents, state.analysisStore, setActiveDocument]);

  const finishProcessing = useCallback(
    async (
      file: File,
      lines: string[],
      backendImages?: ExtractedImage[],
      pageImages: string[] = [],
      durationSec: number = 1.2
    ) => {
      let images = backendImages || [];
      if (!images || images.length === 0) {
        images = await extractEmbeddedImagesFromFile(file);
      }

      const liveAnalysis = createAnalysisFromLines(lines, file, images, pageImages);
      const docId = 'doc-' + Date.now();

      const ext = (getFileExtension(file.name) || 'pdf') as DocumentType;
      const liveDoc: Document = {
        id: docId,
        filename: file.name,
        type: ext,
        status: 'completed',
        uploadDate: new Date().toISOString(),
        fileSize: file.size,
        pages: liveAnalysis.metadata.pages,
      };

      const markdownText = generateMarkdownWithImages(lines, images, file.name);
      const jsonText = generateJsonWithImages(lines, images, file.name, liveAnalysis.metadata);
      const plainText = generatePlainTextWithImages(lines, images);
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
        documentName: file.name,
        status: 'completed',
        started: new Date().toISOString(),
        duration: `${durationSec.toFixed(1)}s`,
        outputFormat: 'markdown',
      };

      addDocument(liveDoc, liveAnalysis, liveTransform, liveJob);
      setAnalysis(liveAnalysis);
      setIsExtracting(false);
    },
    [addDocument]
  );

  const executeOcr = useCallback(
    async (fileToProcess: File) => {
      const startTime = Date.now();
      const isImage = fileToProcess.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp|tiff|gif)$/i.test(fileToProcess.name);

      // Direct OCR for images via Gradio
      if (isImage) {
        try {
          const pageImageDataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve((e.target?.result as string) || '');
            reader.onerror = () => resolve('');
            reader.readAsDataURL(fileToProcess);
          });

          const customUrl = localStorage.getItem('omniparse_api_url');
          const spaceTarget = customUrl && customUrl.includes('hf.space')
            ? customUrl
            : ENGINE_CONFIG.spaceTarget;

          const { Client, handle_file } = await import('@gradio/client');
          const client = await Client.connect(spaceTarget);
          const result = await client.predict('/gradio_ocr', {
            img: typeof handle_file === 'function' ? handle_file(fileToProcess) : fileToProcess,
          });

          const rawText = ((result.data as any)?.[0] as string) || '';
          const lines = rawText
            .split('\n')
            .map((l: string) => l.trim())
            .filter((l: string) => l.length > 0 && l !== '[No text detected in image]');

          const elapsedSec = Math.max((Date.now() - startTime) / 1000, 0.5);
          await finishProcessing(
            fileToProcess,
            lines.length > 0 ? lines : [rawText.trim() || '[No text detected in image]'],
            [],
            pageImageDataUrl ? [pageImageDataUrl] : [],
            elapsedSec
          );
          return;
        } catch (gradioErr) {
          console.warn('[OmniParse] Gradio cloud OCR note:', gradioErr);
        }
      }

      // REST API attempt (for PDFs/documents or local server)
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        const formData = new FormData();
        formData.append('file', fileToProcess);
        formData.append('ocr_lang', 'auto');

        const customApiUrl = localStorage.getItem('omniparse_api_url');
        const isCustomRemote = customApiUrl && !customApiUrl.includes('127.0.0.1') && !customApiUrl.includes('localhost');
        const endpoint = isCustomRemote ? `${customApiUrl.replace(/\/+$/, '')}/v1/vision/analyze` : '/api/v1/extract';

        const res = await fetch(endpoint, {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const elapsedSec = Math.max((Date.now() - startTime) / 1000, 0.4);

        if (res.ok) {
          const data = await res.json();
          if (
            data.payload?.extracted_text?.length > 0 ||
            data.payload?.extracted_images?.length > 0 ||
            data.payload?.page_images?.length > 0
          ) {
            await finishProcessing(
              fileToProcess,
              data.payload.extracted_text || [],
              data.payload.extracted_images || [],
              data.payload.page_images || [],
              elapsedSec
            );
            return;
          }
        }
      } catch (err) {
        console.warn('[OmniParse] Local/REST backend note:', err);
      }

      // Client-side extraction fallback (PDF.js, Office docx, PPTX)
      const elapsedSec = Math.max((Date.now() - startTime) / 1000, 0.4);
      const lines = await parseDocumentFile(fileToProcess);
      const images = await extractEmbeddedImagesFromFile(fileToProcess);
      await finishProcessing(
        fileToProcess,
        lines.length > 0 ? lines : [fileToProcess.name],
        images,
        [],
        elapsedSec
      );
    },
    [finishProcessing, token]
  );

  const handleFileSelect = useCallback(
    (file: File) => {
      setCurrentFile(file);
      setDocName(file.name);
      setFileType(getFileExtension(file.name));
      setAnalysis(null);
      setIsExtracting(true);
      setMode('workspace');

      // Start OCR extraction immediately
      executeOcr(file);
    },
    [executeOcr]
  );

  if (mode === 'upload') {
    return (
      <div className={styles.page}>
        <div className={styles.uploadMode}>
          <div className={styles.uploadWrapper}>
            <div className={styles.uploadHeader}>
              <h1 className={styles.uploadTitle}>Document Ingestion</h1>
              <p className={styles.uploadSubtitle}>
                Drop any PDF, PowerPoint presentation, Word document, or image to preview and extract OCR text.
              </p>
            </div>

            <UploadZone onFileSelect={handleFileSelect} />
          </div>
        </div>
      </div>
    );
  }

  // Workspace mode: Direct Document Preview (Left) & OCR Output (Right)
  return (
    <div className={styles.page}>
      {/* Top Workspace Action Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMode('upload')}
            title="Upload another document"
          >
            <ArrowLeft size={14} />
            <span>Ingest New</span>
          </Button>

          <span style={{ color: 'var(--border)' }}>|</span>

          <FileText size={15} style={{ color: 'var(--text-muted)' }} />
          <span className={styles.toolbarFilename} title={docName}>
            {docName}
          </span>
          <Badge status={isExtracting ? 'processing' : 'completed'} />
        </div>

        <div className={styles.toolbarRight}>
          {isExtracting ? (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className={styles.simpleSpinner} style={{ width: '12px', height: '12px', borderWidth: '1.5px' }} />
              Running OCR…
            </span>
          ) : (
            <>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (!analysis) return;
                  const text = analysis.textBlocks.map((b) => b.text).join('\n');
                  const blob = new Blob([text], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${docName.replace(/\.[^/.]+$/, '')}_raw.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download size={13} />
                <span>Raw Text</span>
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/transform')}
              >
                <span>Transform & Export</span>
                <ArrowRight size={13} />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Workspace Split Layout */}
      <div className={styles.workspace}>
        {/* Left: Document & Page Canvas Viewer (Instant Preview of Current Document) */}
        <div className={styles.viewerPanel}>
          <DocumentViewer file={currentFile} fileType={fileType} docName={docName} analysis={analysis} />
        </div>

        {/* Right: Output Preview of OCR (Minimal Spinner while extracting, Output Inspector on complete) */}
        <div className={styles.inspectorPanel}>
          {isExtracting ? (
            <div className={styles.extractingContainer}>
              <div className={styles.simpleSpinner} />
              <span className={styles.extractingText}>Extracting OCR text & layout…</span>
            </div>
          ) : (
            <Inspector analysis={analysis} />
          )}
        </div>
      </div>
    </div>
  );
}
