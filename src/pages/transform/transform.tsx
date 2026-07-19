import { useState } from 'react';
import { ArrowRight, Copy, Download, Sparkles } from 'lucide-react';
import {
  mockDocuments,
  mockTransforms,
  type OutputFormat,
} from '../../data/mock';
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
  const completedDocs = mockDocuments.filter((d) => d.status === 'completed');
  const [selectedDocId, setSelectedDocId] = useState(completedDocs[0]?.id ?? '');
  const [format, setFormat] = useState<OutputFormat>('markdown');
  const { addToast } = useToast();

  const transform = mockTransforms[selectedDocId];
  const selectedDoc = completedDocs.find((d) => d.id === selectedDocId);

  const getOutput = () => {
    if (!transform) return '';
    return transform[format];
  };

  const getTokens = () => {
    if (!transform) return 0;
    if (format === 'markdown') return transform.markdownTokens;
    if (format === 'json') return transform.jsonTokens;
    return transform.plaintextTokens;
  };

  const savings = transform
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
          value={selectedDocId}
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
            <h3 className={styles.outputTitle}>Generated Output</h3>
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
