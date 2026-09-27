import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  FileText,
  FileImage,
  FileType,
  Presentation,
  ArrowRight,
  CheckCircle2,
  Key,
  Copy,
  Code2,
} from 'lucide-react';
import { useApp } from '../../context/app-context';
import { useAuth } from '../../context/auth-context';
import { useToast } from '../../context/toast-context';
import {
  formatRelativeDate,
  formatFileSize,
  type ProcessingJob,
} from '../../data/mock';
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
  const { user } = useAuth();
  const { addToast } = useToast();
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const filteredDocs = selectedFormat
    ? state.documents.filter((doc) => doc.type.toLowerCase() === selectedFormat)
    : state.documents;

  const filteredJobs = selectedFormat
    ? state.jobs.filter((job) => job.documentName.toLowerCase().endsWith('.' + selectedFormat))
    : state.jobs;

  const jobColumns = [
    {
      key: 'documentName',
      header: 'Document Name',
      render: (row: ProcessingJob) => (
        <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 500 }}>
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
      header: 'Ingested',
      render: (row: ProcessingJob) => formatRelativeDate(row.started),
    },
    { key: 'duration', header: 'Duration' },
    {
      key: 'outputFormat',
      header: 'Format',
      render: (row: ProcessingJob) => (
        <span style={{ textTransform: 'capitalize', fontSize: 'var(--text-xs)' }}>{row.outputFormat}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row: ProcessingJob) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/analyze?doc=${row.documentId}`)}
        >
          View &rarr;
        </Button>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.greeting}>
            Dashboard
          </h1>
          <p className={styles.date}>
            {today} • Welcome{user?.name ? `, ${user.name}` : ''}
          </p>
        </div>

        <div className={styles.quickActions}>
          <Button variant="secondary" size="md" onClick={() => navigate('/transform')}>
            <ArrowRight size={15} />
            Transform
          </Button>
          <Button variant="primary" size="md" onClick={() => navigate('/analyze')}>
            <Upload size={15} />
            Upload Document
          </Button>
        </div>
      </div>

      {/* API Key Quick Card */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        flexWrap: 'wrap',
        gap: '14px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(99, 102, 241, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6366f1',
          }}>
            <Key size={20} />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Your API Key:</span>
              <code style={{ backgroundColor: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '4px', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
                {user?.apiKey ? `${user.apiKey.substring(0, 10)}••••••••••••` : 'op_live_••••••••'}
              </code>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Use this key to connect your apps and scripts to the OmniParse API.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (user?.apiKey) {
                navigator.clipboard.writeText(user.apiKey);
                addToast('API Key copied to clipboard', 'success');
              }
            }}
          >
            <Copy size={13} />
            <span>Copy Key</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/api-keys')}
          >
            <Code2 size={13} />
            <span>API Docs →</span>
          </Button>
        </div>
      </div>

      {/* Upload Banner */}
      <div className={styles.dropzoneBanner}>
        <div className={styles.dropzoneBannerLeft}>
          <div className={styles.dropzoneIconBox}>
            <Upload size={20} strokeWidth={2} />
          </div>
          <div>
            <div className={styles.dropzoneTitle}>Upload Documents</div>
            <div className={styles.dropzoneSub}>
              Drop PDF, PowerPoint, Word, or image files to extract text, tables, and structured data.
            </div>
          </div>
        </div>

        <div className={styles.dropzonePills}>
          <span className={styles.formatPill}>.PDF</span>
          <span className={styles.formatPill}>.PPTX</span>
          <span className={styles.formatPill}>.DOCX</span>
          <span className={styles.formatPill}>.PNG / .JPG</span>
          <Button variant="primary" size="sm" onClick={() => navigate('/analyze')}>
            Upload File
          </Button>
        </div>
      </div>

      {/* Recent Documents */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Recent Documents</h2>

          {/* Filter Pills */}
          <div className={styles.filterBar}>
            <button
              className={`${styles.filterChip} ${selectedFormat === null ? styles.filterChipActive : ''}`}
              onClick={() => setSelectedFormat(null)}
            >
              All Files ({state.documents.length})
            </button>
            {['pdf', 'pptx', 'docx', 'png'].map((fmt) => (
              <button
                key={fmt}
                className={`${styles.filterChip} ${selectedFormat === fmt ? styles.filterChipActive : ''}`}
                onClick={() => setSelectedFormat(selectedFormat === fmt ? null : fmt)}
              >
                .{fmt.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {filteredDocs.length === 0 ? (
          <div className={styles.emptyState}>
            <CheckCircle2 size={32} style={{ color: 'var(--text-muted)' }} />
            <div className={styles.emptyTitle}>No documents yet</div>
            <div className={styles.emptySub}>
              Upload a document to get started, or clear your filter.
            </div>
            <Button variant="secondary" size="sm" onClick={() => setSelectedFormat(null)}>
              Clear Filter
            </Button>
          </div>
        ) : (
          <div className={styles.docGrid}>
            {filteredDocs.slice(0, 6).map((doc) => {
              const Icon = fileIcons[doc.type] ?? FileText;
              return (
                <div
                  key={doc.id}
                  className={styles.docCard}
                  onClick={() => navigate(`/analyze?doc=${doc.id}`)}
                >
                  <div className={styles.docCardTop}>
                    <div className={styles.docIcon}>
                      <Icon size={16} strokeWidth={1.8} />
                    </div>
                    <Badge status={doc.status} />
                  </div>
                  <div className={styles.docFilename} title={doc.filename}>
                    {doc.filename}
                  </div>
                  <div className={styles.docMeta}>
                    <span className={styles.docType}>{doc.type}</span>
                    <span className={styles.docDot} />
                    <span>{formatFileSize(doc.fileSize)}</span>
                    <span className={styles.docDot} />
                    <span>{formatRelativeDate(doc.uploadDate)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Processing Jobs Table */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Processing Jobs</h2>
          {filteredJobs.length > 0 && (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {filteredJobs.length} job{filteredJobs.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {filteredJobs.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyTitle}>No processing jobs</div>
            <div className={styles.emptySub}>
              Jobs will appear here when you upload and process files.
            </div>
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
    </div>
  );
}
