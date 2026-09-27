import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Copy, Download, Sparkles, Upload, FileText, Image as ImageIcon } from 'lucide-react';
import { type OutputFormat } from '../../data/mock';
import { useApp } from '../../context/app-context';
import {
  generateMarkdownWithImages,
  generateJsonWithImages,
  generatePlainTextWithImages,
} from '../../utils/document-parser';
import Select from '../../components/ui/select';
import Button from '../../components/ui/button';
import { useToast } from '../../context/toast-context';
import styles from './transform.module.css';

const formatLabels: Record<OutputFormat, string> = {
  markdown: 'Markdown',
  json: 'JSON',
  plaintext: 'Plain Text',
};

const formatExtensions: Record<OutputFormat, string> = {
  markdown: '.md',
  json: '.json',
  plaintext: '.txt',
};

export default function Transform() {
  const navigate = useNavigate();
  const { state } = useApp();
  const completedDocs = state.documents.filter((d) => d.status === 'completed');
  const [selectedDocId, setSelectedDocId] = useState(completedDocs[0]?.id ?? '');
  const [format, setFormat] = useState<OutputFormat>('markdown');
  const { addToast } = useToast();

  const activeId = selectedDocId || completedDocs[0]?.id || '';
  const transform = state.transformStore[activeId];
  const analysis = state.analysisStore[activeId];
  const selectedDoc = completedDocs.find((d) => d.id === activeId);

  const getOutput = () => {
    if (!transform && !analysis) return '';

    // If analysis has extracted images and transform doesn't have inline image tags yet, dynamically generate with images
    if (analysis && analysis.images && analysis.images.length > 0) {
      if (format === 'markdown' && (!transform?.markdown || !transform.markdown.includes('!['))) {
        return generateMarkdownWithImages(
          analysis.textBlocks.map((b) => b.text),
          analysis.images,
          selectedDoc?.filename || 'document'
        );
      }
      if (format === 'json' && (!transform?.json || !transform.json.includes('"images": ['))) {
        return generateJsonWithImages(
          analysis.textBlocks.map((b) => b.text),
          analysis.images,
          selectedDoc?.filename || 'document',
          analysis.metadata
        );
      }
      if (format === 'plaintext' && (!transform?.plaintext || !transform.plaintext.includes('[Figure:'))) {
        return generatePlainTextWithImages(
          analysis.textBlocks.map((b) => b.text),
          analysis.images
        );
      }
    }

    if (!transform) return '';
    return transform[format];
  };

  const getTokens = () => {
    if (!transform) return 0;
    if (format === 'markdown') return transform.markdownTokens;
    if (format === 'json') return transform.jsonTokens;
    return transform.plaintextTokens;
  };

  const savings = transform && transform.originalTokens > 0
    ? Math.round(((transform.originalTokens - getTokens()) / transform.originalTokens) * 100)
    : 0;

  const handleCopy = () => {
    navigator.clipboard.writeText(getOutput());
    addToast('Copied to clipboard', 'success');
  };

  const handleDownload = () => {
    const blob = new Blob([getOutput()], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const baseName = selectedDoc?.filename.replace(/\.[^/.]+$/, '') ?? 'output';
    a.download = `${baseName}${formatExtensions[format]}`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('File downloaded', 'success');
  };

  if (completedDocs.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>Transform</h1>
          <p className={styles.subtitle}>
            Convert analyzed documents into AI-ready structured formats. Choose your output format and download the result.
          </p>
        </div>

        <div
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            maxWidth: '560px',
            margin: '40px auto 0 auto',
          }}
        >
          <FileText size={40} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
          <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
            No documents available for transformation
          </h3>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: '24px' }}>
            Upload and analyze a document first to convert it into Markdown, JSON, or Plain Text.
          </p>
          <Button variant="primary" size="lg" onClick={() => navigate('/analyze')}>
            <Upload size={16} />
            Analyze a Document
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Transform</h1>
        <p className={styles.subtitle}>
          Convert analyzed documents into AI-ready structured formats. Choose your output format and download the result.
        </p>
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        <Select
          label="Document"
          options={completedDocs.map((d) => ({ value: d.id, label: d.filename }))}
          value={activeId}
          onChange={(e) => setSelectedDocId(e.target.value)}
          className={styles.docSelect}
        />
        <div>
          <label style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
            Output Format
          </label>
          <div className={styles.formatBtns}>
            {(['markdown', 'json', 'plaintext'] as OutputFormat[]).map((f) => (
              <button
                key={f}
                className={`${styles.formatBtn} ${format === f ? styles.formatBtnActive : ''}`}
                onClick={() => setFormat(f)}
              >
                {formatLabels[f]}
                {f === 'markdown' && <span className={styles.recommended}>Recommended</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recommendation Note */}
      {format === 'markdown' && (
        <div className={styles.recommendNote}>
          <Sparkles size={16} className={styles.recommendIcon} />
          <span>
            <strong>Markdown is recommended for LLMs</strong> — reduces token usage while preserving document structure, headings, tables, and emphasis.
          </span>
        </div>
      )}

      {/* Token Comparison */}
      {transform && (
        <div className={styles.comparison}>
          <div className={styles.compCard}>
            <span className={styles.compLabel}>Original</span>
            <span className={styles.compValue}>{transform.originalTokens.toLocaleString()} tokens</span>
          </div>
          <div className={styles.compArrow}>
            <ArrowRight size={20} />
          </div>
          <div className={styles.compCard}>
            <span className={styles.compLabel}>{formatLabels[format]}</span>
            <span className={styles.compValue}>{getTokens().toLocaleString()} tokens</span>
          </div>
          <div className={styles.compArrow}>
            <ArrowRight size={20} />
          </div>
          <div className={`${styles.compCard} ${styles.compSavings}`}>
            <span className={styles.compLabel}>Savings</span>
            <span className={styles.compValue}>{savings}% fewer tokens</span>
          </div>
        </div>
      )}

      {/* Output */}
      {transform ? (
        <div className={styles.outputSection}>
          <div className={styles.outputHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 className={styles.outputTitle}>Generated Output</h3>
              {analysis && analysis.images && analysis.images.length > 0 && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    backgroundColor: '#EFF6FF',
                    color: '#2563EB',
                    border: '1px solid #BFDBFE',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <ImageIcon size={11} />
                  {analysis.images.length} {analysis.images.length === 1 ? 'Figure' : 'Figures'} Inline
                </span>
              )}
            </div>
            <div className={styles.outputActions}>
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                <Copy size={14} />
                Copy
              </Button>
              <Button variant="secondary" size="sm" onClick={handleDownload}>
                <Download size={14} />
                Download
              </Button>
            </div>
          </div>
          <div className={styles.codeBlock}>
            <div className={styles.codeHeader}>
              <span className={styles.codeLang}>{formatExtensions[format]}</span>
            </div>
            <div className={styles.codeContent}>
              <pre>{getOutput()}</pre>
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.emptyState}>
          <p>Select a processed document to view transform output.</p>
        </div>
      )}
    </div>
  );
}
