import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  FileText,
  FileImage,
  FileType,
  Presentation,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../../context/app-context';
import {
  supportedFormats,
  formatRelativeDate,
  formatFileSize,
  type ProcessingJob,
} from '../../data/mock';
import { Card, CardBody } from '../../components/ui/card';
import Button from '../../components/ui/button';
import Badge from '../../components/ui/badge';
import Table from '../../components/ui/table';
import Typewriter from '../../components/ui/typewriter';
import styles from './dashboard.module.css';

const fileIcons: Record<string, React.ElementType> = {
  pdf: FileText,
  docx: FileType,
  pptx: Presentation,
  txt: FileText,
  png: FileImage,
  jpg: FileImage,
  jpeg: FileImage,
  webp: FileImage,
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { state } = useApp();
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const [subtitle, setSubtitle] = useState<string>(
    `${today} • Let us ship to production before sprint review`
  );

  useEffect(() => {
    fetch('/api/v1/trends')
      .then((res) => res.json())
      .then((data) => {
        if (data.quote) {
          setSubtitle(`${today} • ${data.quote}`);
        }
      })
      .catch(() => {});
  }, [today]);

  const handleFormatClick = (ext: string) => {
    const norm = ext.toLowerCase();
    setSelectedFormat((prev) => (prev === norm ? null : norm));
  };

  const filteredDocs = selectedFormat
    ? state.documents.filter((doc) => doc.type.toLowerCase() === selectedFormat)
    : state.documents;

  const filteredJobs = selectedFormat
    ? state.jobs.filter((job) => job.documentName.toLowerCase().endsWith('.' + selectedFormat))
    : state.jobs;

  const jobColumns = [
    {
      key: 'documentName',
      header: 'Document',
      render: (row: ProcessingJob) => (
        <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}>
          {row.documentName}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: ProcessingJob) => <Badge status={row.status} />,
    },
    {
      key: 'started',
      header: 'Started',
      render: (row: ProcessingJob) => formatRelativeDate(row.started),
    },
    { key: 'duration', header: 'Duration' },
    {
      key: 'outputFormat',
      header: 'Format',
      render: (row: ProcessingJob) => (
        <span style={{ textTransform: 'capitalize' }}>{row.outputFormat}</span>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.greeting}>
          <Typewriter text={`Welcome back, ${state.settings.displayName}`} speed={40} delay={150} />
        </h1>
        <p className={styles.date}>
          <Typewriter
            key={subtitle}
            text={subtitle}
            speed={25}
            delay={600}
            loop={false}
          />
        </p>
        <div className={styles.quickActions}>
          <Button variant="primary" size="lg" onClick={() => navigate('/analyze')}>
            <Upload size={16} />
            Upload Document
          </Button>
          <Button variant="secondary" size="lg" onClick={() => navigate('/transform')}>
            <ArrowRight size={16} />
            Transform
          </Button>
        </div>
      </div>

      {/* Recent Documents */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2 className={styles.sectionTitle}>Recent Documents</h2>
            {selectedFormat && (
              <button className={styles.filterBadge} onClick={() => setSelectedFormat(null)}>
                Filter: .{selectedFormat.toUpperCase()} <span className={styles.filterClear}>✕ Clear</span>
              </button>
            )}
          </div>
          {filteredDocs.length > 0 && (
            <button className={styles.sectionAction} onClick={() => navigate('/analyze')}>
              View all →
            </button>
          )}
        </div>
        {filteredDocs.length === 0 ? (
          <div
            style={{
              padding: '32px 24px',
              textAlign: 'center',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)',
            }}
          >
            <FileText size={32} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
              {selectedFormat ? `No .${selectedFormat.toUpperCase()} documents found` : 'No documents analyzed yet'}
            </h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: '16px' }}>
              {selectedFormat
                ? `Click another format button below or clear the filter to see all files.`
                : `Upload your first document (PDF, PNG, DOCX, TXT, PPTX) to parse layout, OCR text, and tables.`}
            </p>
            {selectedFormat ? (
              <Button variant="secondary" onClick={() => setSelectedFormat(null)}>
                Show All Formats
              </Button>
            ) : (
              <Button variant="primary" onClick={() => navigate('/analyze')}>
                <Upload size={16} />
                Upload First Document
              </Button>
            )}
          </div>
        ) : (
          <div className={styles.docGrid}>
            {filteredDocs.slice(0, 6).map((doc) => {
              const Icon = fileIcons[doc.type] ?? FileText;
              return (
                <Card
                  key={doc.id}
                  interactive
                  onClick={() => navigate(`/analyze?doc=${doc.id}`)}
                >
                  <CardBody className={styles.docCard}>
                    <div className={styles.docCardTop}>
                      <div className={styles.docIcon}>
                        <Icon size={18} strokeWidth={1.5} />
                      </div>
                      <Badge status={doc.status} />
                    </div>
                    <div className={styles.docFilename}>{doc.filename}</div>
                    <div className={styles.docMeta}>
                      <span className={styles.docType}>{doc.type}</span>
                      <span className={styles.docDot} />
                      <span>{formatFileSize(doc.fileSize)}</span>
                      <span className={styles.docDot} />
                      <span>{formatRelativeDate(doc.uploadDate)}</span>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Jobs */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            Recent Processing Jobs {selectedFormat ? `(.${selectedFormat.toUpperCase()})` : ''}
          </h2>
        </div>
        {filteredJobs.length === 0 ? (
          <div
            style={{
              padding: '24px',
              textAlign: 'center',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
              fontSize: 'var(--text-sm)',
            }}
          >
            {selectedFormat ? `No recent processing jobs for .${selectedFormat.toUpperCase()} files.` : 'No active or recent processing jobs.'}
          </div>
        ) : (
          <Table
            columns={jobColumns}
            data={filteredJobs}
            keyExtractor={(row) => row.id}
            compact
          />
        )}
      </div>

      {/* Supported Formats */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Filter by Format</h2>
          {selectedFormat && (
            <button className={styles.sectionAction} onClick={() => setSelectedFormat(null)}>
              Reset filter
            </button>
          )}
        </div>
        <div className={styles.formatsRow}>
          {supportedFormats.map((fmt) => {
            const isActive = selectedFormat === fmt.extension.toLowerCase();
            return (
              <button
                key={fmt.extension}
                className={`${styles.formatChip} ${isActive ? styles.formatChipActive : ''}`}
                onClick={() => handleFormatClick(fmt.extension)}
                title={`Click to filter dashboard by .${fmt.extension}`}
              >
                <span className={styles.formatExt}>{fmt.extension}</span>
                <span className={styles.formatDesc}>{fmt.description}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
