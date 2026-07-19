import { useState, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './document-viewer.module.css';

interface DocumentViewerProps {
  file: File | null;
  fileType: string;
  pageCount?: number;
  docName?: string;
}

export default function DocumentViewer({ file, fileType, pageCount = 1, docName }: DocumentViewerProps) {
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);

  const normalizedType = (fileType || '').toLowerCase().replace('.', '');

  useEffect(() => {
    if (!file) {
      setImageUrl(null);
      setTextContent(null);
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || normalizedType;

    if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg'].includes(ext)) {
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else if (ext === 'txt') {
      const reader = new FileReader();
      reader.onload = (e) => setTextContent(e.target?.result as string);
      reader.readAsText(file);
    } else {
      setImageUrl(null);
      setTextContent(null);
    }
  }, [file, normalizedType]);

  const handleZoom = (direction: 'in' | 'out' | 'fit') => {
    if (direction === 'fit') setZoom(100);
    else if (direction === 'in') setZoom((z) => Math.min(z + 25, 300));
    else setZoom((z) => Math.max(z - 25, 25));
  };

  // 1. Image File Preview (Uploaded image)
  if (imageUrl) {
    return (
      <div className={styles.viewer}>
        <div className={styles.imageContainer}>
          <img
            src={imageUrl}
            alt="Uploaded Document Preview"
            className={styles.image}
            style={{ transform: `scale(${zoom / 100})` }}
          />
        </div>
        <ZoomControls zoom={zoom} onZoom={handleZoom} />
      </div>
    );
  }

  // 2. Text File Content
  if (textContent !== null) {
    return (
      <div className={styles.viewer}>
        <pre className={styles.textContent}>{textContent}</pre>
      </div>
    );
  }

  // 3. PDF File Object Preview
  if (normalizedType === 'pdf' && file) {
    const url = URL.createObjectURL(file);
    return (
      <div className={styles.viewer}>
        <object data={url} type="application/pdf" className={styles.pdfEmbed}>
          <div className={styles.mockDocContainer}>
            <div className={styles.mockDocSheet} style={{ transform: `scale(${zoom / 100})` }}>
              <div className={styles.docHeader}>
                <div className={styles.docBadge}>PDF DOCUMENT</div>
                <h3 className={styles.docTitle}>{docName || file.name}</h3>
              </div>
              <div className={styles.docBody}>
                <div className={styles.skeletonLine} style={{ width: '85%' }}></div>
                <div className={styles.skeletonLine} style={{ width: '92%' }}></div>
                <div className={styles.skeletonLine} style={{ width: '70%' }}></div>
              </div>
            </div>
          </div>
        </object>
        <ZoomControls
          zoom={zoom}
          onZoom={handleZoom}
          pageCount={pageCount}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
        />
      </div>
    );
  }

  // 4. Default High-Fidelity Visual Canvas for Documents (No native preview missing errors)
  return (
    <div className={styles.viewer}>
      <div className={styles.mockDocContainer}>
        <div className={styles.mockDocSheet} style={{ transform: `scale(${zoom / 100})` }}>
          <div className={styles.docHeader}>
            <div className={styles.docBadge}>{(normalizedType || 'DOCUMENT').toUpperCase()} PREVIEW</div>
            <h3 className={styles.docTitle}>{docName || 'Original Document'}</h3>
          </div>
          <div className={styles.docBody}>
            <div className={styles.skeletonLine} style={{ width: '90%' }}></div>
            <div className={styles.skeletonLine} style={{ width: '95%' }}></div>
            <div className={styles.skeletonLine} style={{ width: '75%' }}></div>
            <div className={styles.skeletonTable}>
              <div className={styles.skeletonRow} style={{ opacity: 0.8 }}></div>
              <div className={styles.skeletonRow} style={{ opacity: 0.5 }}></div>
              <div className={styles.skeletonRow} style={{ opacity: 0.3 }}></div>
            </div>
            <div className={styles.skeletonLine} style={{ width: '88%' }}></div>
            <div className={styles.skeletonLine} style={{ width: '65%' }}></div>
          </div>
        </div>
      </div>
      <ZoomControls zoom={zoom} onZoom={handleZoom} />
    </div>
  );
}

function ZoomControls({
  zoom,
  onZoom,
  pageCount,
  currentPage,
  setCurrentPage,
}: {
  zoom: number;
  onZoom: (dir: 'in' | 'out' | 'fit') => void;
  pageCount?: number;
  currentPage?: number;
  setCurrentPage?: React.Dispatch<React.SetStateAction<number>>;
}) {
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

      {pageCount && pageCount > 1 && currentPage && setCurrentPage && (
        <div className={styles.pageNav}>
          <button
            className={styles.zoomBtn}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
          >
            <ChevronLeft size={14} />
          </button>
          <span className={styles.pageInfo}>
            {currentPage} / {pageCount}
          </span>
          <button
            className={styles.zoomBtn}
            onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
            disabled={currentPage >= pageCount}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
