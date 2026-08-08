import { useState } from 'react';
import {
  Type,
  LayoutPanelTop,
  Table2,
  Image,
  FileCode,
  List,
  Heading,
  AlignLeft,
  Frame,
  ImageIcon,
  Minus,
  Copy,
  Check,
  FileText,
  Boxes,
} from 'lucide-react';
import Tabs from '../../components/ui/tabs';
import { type DocumentAnalysis } from '../../data/mock';
import styles from './inspector.module.css';

interface InspectorProps {
  analysis: DocumentAnalysis | null;
}

const regionIcons: Record<string, React.ElementType> = {
  header: Heading,
  title: Type,
  paragraph: AlignLeft,
  table: Table2,
  figure: ImageIcon,
  footer: Minus,
  list: List,
  caption: AlignLeft,
};

export default function Inspector({ analysis }: InspectorProps) {
  const [viewMode, setViewMode] = useState<'formatted' | 'raw'>('formatted');
  const [copied, setCopied] = useState(false);
  const [translatedLines, setTranslatedLines] = useState<string[] | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [activeTabLang, setActiveTabLang] = useState<'original' | 'translated'>('original');

  if (!analysis) {
    return (
      <div className={styles.inspector}>
        <div className={styles.emptyState}>
          <Type size={24} className={styles.emptyIcon} />
          <p>No analysis data available.</p>
          <small>Upload and process a document to see extracted content.</small>
        </div>
      </div>
    );
  }

  const handleTranslate = async (targetLangCode: string) => {
    setIsTranslating(true);
    try {
      const lines = analysis.textBlocks.map((b) => b.text);
      const res = await fetch('/api/v1/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines, target_lang: targetLangCode }),
      });
      if (res.ok) {
        const data = await res.json();
        setTranslatedLines(data.translated_lines || []);
        setActiveTabLang('translated');
      }
    } catch (err) {
      console.warn('Translation error:', err);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleCopyText = () => {
    const textToCopy =
      activeTabLang === 'translated' && translatedLines
        ? translatedLines.join('\n\n')
        : analysis.textBlocks.map((b) => b.text).join('\n\n');
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs = [
    {
      id: 'text',
      label: 'Text',
      icon: <Type size={14} />,
      content: (
        <div className={styles.textTabContainer}>
          {/* Header controls: View Toggle + Translation Bar + Copy */}
          <div className={styles.textControls} style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div className={styles.viewToggleGroup}>
                <button
                  className={`${styles.viewToggleBtn} ${viewMode === 'formatted' ? styles.viewToggleBtnActive : ''}`}
                  onClick={() => setViewMode('formatted')}
                >
                  <FileText size={12} style={{ marginRight: 4 }} />
                  Formatted Document
                </button>
                <button
                  className={`${styles.viewToggleBtn} ${viewMode === 'raw' ? styles.viewToggleBtnActive : ''}`}
                  onClick={() => setViewMode('raw')}
                >
                  <Boxes size={12} style={{ marginRight: 4 }} />
                  Raw BBoxes
                </button>
              </div>
              <button className={styles.copyBtn} onClick={handleCopyText}>
                {copied ? <Check size={12} color="var(--color-success)" /> : <Copy size={12} />}
                <span>{copied ? 'Copied!' : 'Copy Text'}</span>
              </button>
            </div>

            {/* Translation Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--bg-secondary)', padding: '6px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                <span>Translate to:</span>
                <button
                  style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}
                  onClick={() => handleTranslate('en')}
                  disabled={isTranslating}
                >
                  🇬🇧 EN
                </button>
                <span>|</span>
                <button
                  style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}
                  onClick={() => handleTranslate('de')}
                  disabled={isTranslating}
                >
                  🇩🇪 DE
                </button>
                <span>|</span>
                <button
                  style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}
                  onClick={() => handleTranslate('ja')}
                  disabled={isTranslating}
                >
                  🇯🇵 JP
                </button>
                <span>|</span>
                <button
                  style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}
                  onClick={() => handleTranslate('fr')}
                  disabled={isTranslating}
                >
                  🇫🇷 FR
                </button>
                <span>|</span>
                <button
                  style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}
                  onClick={() => handleTranslate('es')}
                  disabled={isTranslating}
                >
                  🇪🇸 ES
                </button>
              </div>

              {translatedLines && (
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    className={`${styles.viewToggleBtn} ${activeTabLang === 'original' ? styles.viewToggleBtnActive : ''}`}
                    onClick={() => setActiveTabLang('original')}
                    style={{ fontSize: '11px', padding: '2px 8px' }}
                  >
                    Original
                  </button>
                  <button
                    className={`${styles.viewToggleBtn} ${activeTabLang === 'translated' ? styles.viewToggleBtnActive : ''}`}
                    onClick={() => setActiveTabLang('translated')}
                    style={{ fontSize: '11px', padding: '2px 8px' }}
                  >
                    Translated
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* View Mode 1: Clean Formatted Document View */}
          {viewMode === 'formatted' ? (
            <div className={styles.documentDocView}>
              {activeTabLang === 'translated' && translatedLines ? (
                translatedLines.map((line, idx) => (
                  <p key={idx} className={styles.docParagraph}>
                    {line}
                  </p>
                ))
              ) : (
                analysis.textBlocks.map((block) => {
                  if (block.blockType === 'header') {
                    return (
                      <h2 key={block.id} className={styles.docHeader}>
                        {block.text}
                      </h2>
                    );
                  } else if (block.blockType === 'title') {
                    return (
                      <h3 key={block.id} className={styles.docTitle}>
                        {block.text}
                      </h3>
                    );
                  } else if (block.blockType === 'list') {
                    const listItems = block.text.split('\n');
                    return (
                      <ul key={block.id} className={styles.docList}>
                        {listItems.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    );
                  } else {
                    return (
                      <p key={block.id} className={styles.docParagraph}>
                        {block.text}
                      </p>
                    );
                  }
                })
              )}
            </div>
          ) : (
            /* View Mode 2: Granular Raw BBoxes */
            <div>
              {analysis.textBlocks.map((block) => (
                <div key={block.id} className={styles.textBlock}>
                  <div className={styles.textBlockHeader}>
                    <span className={styles.textBlockType}>{block.blockType}</span>
                    <span className={styles.textBlockConfidence}>{(block.confidence * 100).toFixed(1)}%</span>
                  </div>
                  <div className={styles.textBlockContent}>{block.text}</div>
                  <div className={styles.textBlockBbox}>
                    BBox: [{block.bbox.x}, {block.bbox.y}, {block.bbox.width}, {block.bbox.height}]
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'layout',
      label: 'Layout',
      icon: <LayoutPanelTop size={14} />,
      content: (
        <div>
          {analysis.layoutRegions.map((region) => {
            const Icon = regionIcons[region.type] ?? Frame;
            return (
              <div key={region.id} className={styles.layoutRegion}>
                <div className={styles.regionIcon}>
                  <Icon size={16} strokeWidth={1.5} />
                </div>
                <div className={styles.regionInfo}>
                  <div className={styles.regionType}>{region.type}</div>
                  {region.content && <div className={styles.regionContent}>{region.content}</div>}
                </div>
                <span className={styles.regionConfidence}>{(region.confidence * 100).toFixed(1)}%</span>
              </div>
            );
          })}
        </div>
      ),
    },
    {
      id: 'tables',
      label: 'Tables',
      icon: <Table2 size={14} />,
      content: (
        <div>
          {analysis.tables.map((table, i) => (
            <div key={table.id} className={styles.extractedTable}>
              <div className={styles.tableLabel}>
                <span>Table {i + 1}</span>
                <span className={styles.tableConfidence}>{(table.confidence * 100).toFixed(1)}%</span>
              </div>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    {table.headers.map((h, j) => (
                      <th key={j}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, ri) => (
                    <tr key={ri}>
                      {row.map((cell, ci) => (
                        <td key={ci}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 'images',
      label: `Images (${analysis.images.length})`,
      icon: <Image size={14} />,
      content: (
        <div className={styles.imageTabContainer}>
          {analysis.images.length === 0 ? (
            <div className={styles.emptyState}>
              <ImageIcon size={24} className={styles.emptyIcon} />
              <p>No embedded images found in document.</p>
              <small>Upload a document with embedded pictures or figures to view them here.</small>
            </div>
          ) : (
            <div className={styles.imageGrid}>
              {analysis.images.map((img) => (
                <div key={img.id} className={styles.imageCard}>
                  <div className={styles.imagePreviewWrapper}>
                    {img.url ? (
                      <img src={img.url} alt={img.label} className={styles.imageThumbnail} loading="lazy" />
                    ) : (
                      <div className={styles.imagePlaceholder}>
                        <ImageIcon size={28} strokeWidth={1.5} />
                      </div>
                    )}
                  </div>
                  <div className={styles.imageInfo}>
                    <div className={styles.imageLabel} title={img.label}>{img.label}</div>
                    <div className={styles.imageMetaRow}>
                      <span className={styles.imageTag}>{img.width}×{img.height}</span>
                      <span className={styles.imageTag}>{img.format}</span>
                      {img.size && <span className={styles.imageTag}>{img.size}</span>}
                    </div>
                    {img.url && (
                      <a
                        href={img.url}
                        download={`${img.label.replace(/[^a-z0-9]/gi, '_')}.${img.format.toLowerCase()}`}
                        className={styles.imageDownloadBtn}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Download Image
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'metadata',
      label: 'Metadata',
      icon: <FileCode size={14} />,
      content: (
        <div className={styles.metadataList}>
          {Object.entries(analysis.metadata).map(([key, value]) => (
            <div key={key} className={styles.metadataItem}>
              <span className={styles.metadataKey}>
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
              </span>
              <span className={styles.metadataValue}>{String(value)}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 'reading-order',
      label: 'Reading Order',
      icon: <List size={14} />,
      content: (
        <div>
          {analysis.readingOrder.map((item) => (
            <div key={item.regionId} className={styles.readingOrderItem}>
              <span className={styles.orderNumber}>{item.order}</span>
              <span className={styles.orderLabel}>{item.label}</span>
              <span className={styles.orderType}>{item.regionType}</span>
            </div>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className={styles.inspector}>
      <Tabs tabs={tabs} compact />
    </div>
  );
}
