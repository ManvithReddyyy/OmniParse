import { useState, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize2, ChevronLeft, ChevronRight, Presentation, Image as ImageIcon } from 'lucide-react';
import { type DocumentAnalysis, type ExtractedImage } from '../../data/mock';
import styles from './document-viewer.module.css';

interface DocumentViewerProps {
  file: File | null;
  fileType: string;
  pageCount?: number;
  docName?: string;
  analysis?: DocumentAnalysis | null;
}

interface SlideData {
  number: number;
  header: string;
  lines: string[];
  images: ExtractedImage[];
}

function extractSlidesFromAnalysis(analysis: DocumentAnalysis | null): SlideData[] {
  if (!analysis || !analysis.textBlocks || analysis.textBlocks.length === 0) return [];

  const slides: SlideData[] = [];
  let currentSlide: SlideData | null = null;

  for (const block of analysis.textBlocks) {
    const text = block.text.trim();
    const slideMatch = text.match(/^(?:Slide|Page)\s+(\d+)/i);

    if (slideMatch) {
      const slideNum = parseInt(slideMatch[1], 10);
      currentSlide = {
        number: slideNum,
        header: text,
        lines: [],
        images: [],
      };
      slides.push(currentSlide);
    } else if (currentSlide) {
      currentSlide.lines.push(text);
    } else {
      if (slides.length === 0) {
        currentSlide = {
          number: 1,
          header: 'Slide 1',
          lines: [text],
          images: [],
        };
        slides.push(currentSlide);
      } else {
        currentSlide.lines.push(text);
      }
    }
  }

  // Attach images to slides based on label
  if (analysis.images && analysis.images.length > 0) {
    for (const img of analysis.images) {
      const labelMatch = img.label.match(/Slide\s+(\d+)/i);
      if (labelMatch) {
        const slideNum = parseInt(labelMatch[1], 10);
        const targetSlide = slides.find((s) => s.number === slideNum);
        if (targetSlide) {
          targetSlide.images.push(img);
          continue;
        }
      }
      if (slides.length > 0) {
        if (!slides[0].images.includes(img)) {
          slides[0].images.push(img);
        }
      }
    }
  }

  return slides;
}

export default function DocumentViewer({
  file,
  fileType,
  pageCount = 1,
  docName,
  analysis,
}: DocumentViewerProps) {
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);

  const normalizedType = (fileType || '').toLowerCase().replace('.', '');
  const isPptx = normalizedType === 'pptx' || normalizedType === 'ppt' || (file?.name.toLowerCase().endsWith('.pptx') ?? false);

  const slides = isPptx ? extractSlidesFromAnalysis(analysis) : [];

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

  // 1. Image File Preview
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

  // 2. High-Res Original Page/Slide Images (Rendered by Office COM / PyMuPDF)
  if (analysis?.pageImages && analysis.pageImages.length > 0) {
    const totalPages = analysis.pageImages.length;
    const pageIdx = Math.min(Math.max(0, currentPage - 1), totalPages - 1);
    const activePageImg = analysis.pageImages[pageIdx];

    return (
      <div className={styles.viewer}>
        <div className={styles.pptxContainer}>
          {/* Main Slide Frame displaying Original Visual Image */}
          <div className={styles.slideCanvas} style={{ transform: `scale(${zoom / 100})` }}>
            <div className={styles.slideHeaderBar}>
              <div className={styles.slideBadge}>
                <Presentation size={12} style={{ marginRight: 4 }} />
                SLIDE {pageIdx + 1} OF {totalPages}
              </div>
              <span className={styles.slideFileName}>{docName || file?.name}</span>
            </div>

            <div className={styles.slideOriginalImageWrapper}>
              <img src={activePageImg} alt={`Page ${pageIdx + 1}`} className={styles.slideOriginalImg} />
            </div>
          </div>

          {/* Slide Selector Thumbnail Strip */}
          {totalPages > 1 && (
            <div className={styles.thumbnailStrip}>
              {analysis.pageImages.map((imgUrl, idx) => (
                <button
                  key={idx}
                  className={`${styles.thumbnailCard} ${idx === pageIdx ? styles.thumbnailCardActive : ''}`}
                  onClick={() => setCurrentPage(idx + 1)}
                >
                  <img src={imgUrl} alt={`Thumbnail Slide ${idx + 1}`} className={styles.thumbnailImg} />
                  <div className={styles.thumbnailHeader}>Slide {idx + 1}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <ZoomControls
          zoom={zoom}
          onZoom={handleZoom}
          pageCount={totalPages}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
        />
      </div>
    );
  }

  // 3. Text File Content
  if (textContent !== null) {
    return (
      <div className={styles.viewer}>
        <pre className={styles.textContent}>{textContent}</pre>
      </div>
    );
  }

  // 4. PDF File Object Preview
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

  // 5. Fallback PPTX Slide Deck Layout (if offline/no COM)
  if (isPptx && slides.length > 0) {
    const activeSlideIndex = Math.min(Math.max(0, currentPage - 1), Math.max(0, slides.length - 1));
    const activeSlide = slides[activeSlideIndex];

    return (
      <div className={styles.viewer}>
        <div className={styles.pptxContainer}>
          <div className={styles.slideCanvas} style={{ transform: `scale(${zoom / 100})` }}>
            <div className={styles.slideHeaderBar}>
              <div className={styles.slideBadge}>
                <Presentation size={12} style={{ marginRight: 4 }} />
                SLIDE {activeSlide ? activeSlide.number : currentPage} OF {slides.length}
              </div>
              <span className={styles.slideFileName}>{docName || file?.name}</span>
            </div>

            <div className={styles.slideBody}>
              {activeSlide ? (
                <>
                  <div className={styles.slideTextGroup}>
                    {activeSlide.lines.map((line, idx) => {
                      if (idx === 0) {
                        return (
                          <h2 key={idx} className={styles.slideTitleText}>
                            {line}
                          </h2>
                        );
                      } else if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
                        return (
                          <div key={idx} className={styles.slideBulletItem}>
                            <span className={styles.bulletDot}>•</span>
                            <span>{line.replace(/^[\•\-\*]\s*/, '')}</span>
                          </div>
                        );
                      } else {
                        return (
                          <p key={idx} className={styles.slideParagraph}>
                            {line}
                          </p>
                        );
                      }
                    })}
                  </div>

                  {activeSlide.images && activeSlide.images.length > 0 && (
                    <div className={styles.slideImagesGrid}>
                      {activeSlide.images.map((img) => (
                        <div key={img.id} className={styles.slideImageWrapper}>
                          {img.url ? (
                            <img src={img.url} alt={img.label} className={styles.slideImg} />
                          ) : (
                            <div className={styles.slideImgPlaceholder}>
                              <ImageIcon size={24} />
                              <span>{img.label}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className={styles.emptySlideState}>
                  <p>No content on slide {currentPage}</p>
                </div>
              )}
            </div>
          </div>

          <div className={styles.thumbnailStrip}>
            {slides.map((s, idx) => (
              <button
                key={s.number}
                className={`${styles.thumbnailCard} ${idx === activeSlideIndex ? styles.thumbnailCardActive : ''}`}
                onClick={() => setCurrentPage(idx + 1)}
              >
                <div className={styles.thumbnailHeader}>Slide {s.number}</div>
                <div className={styles.thumbnailSnippet}>
                  {s.lines[0] || (s.images.length > 0 ? '[Visual Image]' : 'Slide Content')}
                </div>
              </button>
            ))}
          </div>
        </div>

        <ZoomControls
          zoom={zoom}
          onZoom={handleZoom}
          pageCount={slides.length}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
        />
      </div>
    );
  }

  // 6. Default High-Fidelity Visual Canvas
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
