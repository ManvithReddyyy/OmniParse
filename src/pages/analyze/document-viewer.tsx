import { useState } from 'react';
import { ZoomIn, ZoomOut, Maximize2, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import styles from './document-viewer.module.css';

interface DocumentViewerProps {
  file: File | null;
  fileType: string;
  pageCount?: number;
}

export default function DocumentViewer({ file, fileType, pageCount = 1 }: DocumentViewerProps) {
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);

  // Read file on mount
  useState(() => {
    if (!file) return;

    if (['png', 'jpg', 'jpeg', 'webp'].includes(fileType)) {
      const url = URL.createObjectURL(file);
      setImageUrl(url);
    } else if (fileType === 'txt') {
      const reader = new FileReader();
      reader.onload = (e) => setTextContent(e.target?.result as string);
      reader.readAsText(file);
    }
  });

  const handleZoom = (direction: 'in' | 'out' | 'fit') => {
    if (direction === 'fit') setZoom(100);
    else if (direction === 'in') setZoom((z) => Math.min(z + 25, 300));
    else setZoom((z) => Math.max(z - 25, 25));
  };

  // Image viewer
  if (imageUrl) {
    return (
      <div className={styles.viewer}>
        <div className={styles.imageContainer}>
          <img
            src={imageUrl}
            alt="Document preview"
            className={styles.image}
            style={{ transform: `scale(${zoom / 100})` }}
          />
        </div>
        <ZoomControls zoom={zoom} onZoom={handleZoom} />
      </div>
    );
  }

  // Text viewer
  if (textContent !== null) {
    return (
      <div className={styles.viewer}>
        <pre className={styles.textContent}>{textContent}</pre>
      </div>
    );
  }

  // PDF viewer
  if (fileType === 'pdf' && file) {
    const url = URL.createObjectURL(file);
    return (
      <div className={styles.viewer}>
        <object data={url} type="application/pdf" className={styles.pdfEmbed}>
          <div className={styles.placeholder}>
            <div className={styles.placeholderIcon}>
              <FileText size={24} strokeWidth={1.5} />
            </div>
            <div className={styles.placeholderTitle}>PDF Preview</div>
            <div className={styles.placeholderSubtitle}>
              Your browser's built-in PDF viewer will render this document
            </div>
          </div>
        </object>
        <div className={styles.zoomControls}>
          <div className={styles.pageNav}>
            <button
              className={styles.zoomBtn}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >
              <ChevronLeft size={14} />
            </button>
            <span className={styles.pageInfo}>{currentPage} / {pageCount}</span>
            <button
              className={styles.zoomBtn}
              onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
              disabled={currentPage >= pageCount}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Placeholder for unsupported formats
  return (
    <div className={styles.viewer}>
      <div className={styles.placeholder}>
        <div className={styles.placeholderIcon}>
          <FileText size={24} strokeWidth={1.5} />
        </div>
        <div className={styles.placeholderTitle}>
          {file ? `${fileType.toUpperCase()} Preview` : 'Document Preview'}
        </div>
        <div className={styles.placeholderSubtitle}>
          {file
            ? 'Native preview is not available for this format. Use the inspector panel to view extracted content.'
            : 'Upload a document to see the preview here.'}
        </div>
      </div>
    </div>
  );
}

/* Zoom Controls Sub-component */
function ZoomControls({ zoom, onZoom }: { zoom: number; onZoom: (dir: 'in' | 'out' | 'fit') => void }) {
  return (
    <div className={styles.zoomControls}>
      <button className={styles.zoomBtn} onClick={() => onZoom('out')} title="Zoom out">
        <ZoomOut size={14} />
      </button>
      <span className={styles.zoomLevel}>{zoom}%</span>
      <button className={styles.zoomBtn} onClick={() => onZoom('in')} title="Zoom in">
        <ZoomIn size={14} />
      </button>
      <button className={styles.zoomBtn} onClick={() => onZoom('fit')} title="Fit to view">
        <Maximize2 size={14} />
      </button>
    </div>
  );
}
