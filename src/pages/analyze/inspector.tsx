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
} from 'lucide-react';
import Tabs from '../../components/ui/tabs';
import { type DocumentAnalysis } from '../../data/mock';
import styles from './inspector.module.css';

interface InspectorProps {
  analysis: DocumentAnalysis | null;
}

export default function Inspector({ analysis }: InspectorProps) {
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

  const tabs = [
    {
      id: 'text',
      label: 'Text',
      icon: <Type size={14} />,
      content: (
        <div>
          {analysis.textBlocks.map((block) => (
            <div key={block.id} className={styles.textBlock}>
              <div className={styles.textBlockHeader}>
                <span className={styles.textBlockType}>{block.blockType}</span>
                <span className={styles.textBlockConfidence}>{(block.confidence * 100).toFixed(1)}%</span>
              </div>
              <div className={styles.textBlockContent}>{block.text}</div>
              <div className={styles.textBlockBbox}>
                [{block.bbox.x}, {block.bbox.y}, {block.bbox.width}, {block.bbox.height}]
              </div>
            </div>
          ))}
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
      label: 'Images',
      icon: <Image size={14} />,
      content: (
        <div className={styles.imageGrid}>
          {analysis.images.map((img) => (
            <div key={img.id} className={styles.imageCard}>
              <div className={styles.imagePlaceholder}>
                <ImageIcon size={20} strokeWidth={1.5} />
              </div>
              <div className={styles.imageInfo}>
                <div className={styles.imageLabel}>{img.label}</div>
                <div className={styles.imageDims}>{img.width}×{img.height} {img.format}</div>
              </div>
            </div>
          ))}
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
              <span className={styles.metadataKey}>{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</span>
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
