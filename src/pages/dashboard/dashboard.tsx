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
  mockDocuments,
  mockJobs,
  supportedFormats,
  formatRelativeDate,
  formatFileSize,
} from '../../data/mock';
import { Card, CardBody } from '../../components/ui/card';
import Button from '../../components/ui/button';
import Badge from '../../components/ui/badge';
import Table from '../../components/ui/table';
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

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const jobColumns = [
    {
      key: 'documentName',
      header: 'Document',
      render: (row: (typeof mockJobs)[0]) => (
        <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}>
          {row.documentName}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: (typeof mockJobs)[0]) => <Badge status={row.status} />,
    },
    {
      key: 'started',
      header: 'Started',
      render: (row: (typeof mockJobs)[0]) => formatRelativeDate(row.started),
    },
    { key: 'duration', header: 'Duration' },
    {
      key: 'outputFormat',
      header: 'Format',
      render: (row: (typeof mockJobs)[0]) => (
        <span style={{ textTransform: 'capitalize' }}>{row.outputFormat}</span>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.greeting}>Welcome back, {state.settings.displayName}</h1>
        <p className={styles.date}>{today}</p>
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
          <h2 className={styles.sectionTitle}>Recent Documents</h2>
          <button className={styles.sectionAction} onClick={() => navigate('/analyze')}>
            View all →
          </button>
        </div>
        <div className={styles.docGrid}>
          {mockDocuments.slice(0, 6).map((doc) => {
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
      </div>

      {/* Recent Jobs */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Recent Processing Jobs</h2>
        </div>
        <Table
          columns={jobColumns}
          data={mockJobs}
          keyExtractor={(row) => row.id}
          compact
        />
      </div>

      {/* Supported Formats */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Supported Formats</h2>
        </div>
        <div className={styles.formatsRow}>
          {supportedFormats.map((fmt) => (
            <div key={fmt.extension} className={styles.formatChip}>
              <span className={styles.formatExt}>{fmt.extension}</span>
              <span className={styles.formatDesc}>{fmt.description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
