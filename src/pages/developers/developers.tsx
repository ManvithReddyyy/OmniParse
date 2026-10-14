import { useState } from 'react';
import {
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Code2,
  Terminal,
  FileCode,
  Activity,
} from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import { useToast } from '../../context/toast-context';
import { ENGINE_CONFIG } from '../../config/engine';
import Button from '../../components/ui/button';
import styles from './developers.module.css';

type SnippetLang = 'curl' | 'python' | 'javascript' | 'react';

function highlightCodeLine(line: string): React.ReactNode {
  const trimmed = line.trim();
  if (trimmed.startsWith('//') || (trimmed.startsWith('#') && !trimmed.startsWith('#!'))) {
    return <span style={{ color: '#52525b', fontStyle: 'italic' }}>{line}</span>;
  }

  const tokenRegex =
    /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:import|from|export|function|return|const|let|var|async|await|with|as|print|curl|requests|fetch|new|def|class|true|false|null)\b|(?:\-X|\-H|\-F|\bPOST\b|\bheaders\b|\bbody\b|\bmethod\b|\bFormData\b)|(?:op_live_[a-zA-Z0-9_\-\.]+))/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(line.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('"') || token.startsWith("'")) {
      parts.push(
        <span key={match.index} style={{ color: '#e4e4e7' }}>
          {token}
        </span>
      );
    } else if (token.startsWith('op_live_')) {
      parts.push(
        <span
          key={match.index}
          style={{
            color: '#f4f4f5',
            background: '#18181b',
            padding: '1px 5px',
            borderRadius: '4px',
            border: '1px solid #27272a',
            fontWeight: 600,
          }}
        >
          {token}
        </span>
      );
    } else if (/^(?:-X|-H|-F|POST|headers|body|method|FormData)$/.test(token)) {
      parts.push(
        <span key={match.index} style={{ color: '#a1a1aa', fontWeight: 600 }}>
          {token}
        </span>
      );
    } else {
      parts.push(
        <span key={match.index} style={{ color: '#ffffff', fontWeight: 600 }}>
          {token}
        </span>
      );
    }
    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < line.length) {
    parts.push(line.substring(lastIndex));
  }

  return parts;
}

const fileInfo: Record<SnippetLang, { filename: string; method: string; path: string }> = {
  curl: { filename: 'request.sh', method: 'POST', path: '/v1/vision/analyze' },
  python: { filename: 'extract_document.py', method: 'POST', path: '/v1/vision/analyze' },
  javascript: { filename: 'extract.mjs', method: 'POST', path: '/v1/vision/analyze' },
  react: { filename: 'DocumentScanner.tsx', method: 'POST', path: '/v1/vision/analyze' },
};

export default function Developers() {
  const { user, createApiKey, revokeApiKey } = useAuth();
  const { addToast } = useToast();

  const [visibleKeyIds, setVisibleKeyIds] = useState<Record<string, boolean>>({});
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [activeSnippetLang, setActiveSnippetLang] = useState<SnippetLang>('curl');

  const [newKeyName, setNewKeyName] = useState('');
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [selectedKeyId, setSelectedKeyId] = useState<string>('');

  const selectedKeyObj =
    user?.keys?.find((k) => k.id === selectedKeyId) ||
    user?.keys?.find((k) => k.status === 'active') ||
    user?.keys?.[0];

  const activeKey = selectedKeyObj?.key || user?.apiKey || 'op_live_demo_key';
  const apiEndpoint = `${ENGINE_CONFIG.publicApiBase}/extract`;

  const toggleVisibility = (id: string) => {
    setVisibleKeyIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    addToast('API Key copied to clipboard', 'success');
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const copySnippetToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(true);
    addToast('Code snippet copied to clipboard', 'success');
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    try {
      const newKey = await createApiKey(newKeyName.trim());
      setSelectedKeyId(newKey.id);
      addToast(`Generated new API key: ${newKeyName.trim()}`, 'success');
      setNewKeyName('');
      setShowCreateInput(false);
    } catch {
      addToast('Failed to create key', 'error');
    }
  };

  const handleRevoke = (id: string, name: string) => {
    if (confirm(`Are you sure you want to revoke "${name}"? Apps using this key will immediately lose access.`)) {
      revokeApiKey(id);
      addToast(`Revoked key: ${name}`, 'info');
    }
  };

  // Code snippets pre-filled with the user's active API key
  const snippets: Record<SnippetLang, string> = {
    curl: `curl -X POST "${apiEndpoint}" \\
  -H "Authorization: Bearer ${activeKey}" \\
  -F "file=@document.pdf" \\
  -F "ocr_lang=auto"`,

    python: `import requests

url = "${apiEndpoint}"
headers = {
    "Authorization": "Bearer ${activeKey}"
}

with open("document.pdf", "rb") as f:
    files = {"file": f}
    data = {"ocr_lang": "auto"}
    response = requests.post(url, headers=headers, files=files, data=data)

result = response.json()
print("Extracted:", result["payload"]["extracted_text"])`,

    javascript: `const formData = new FormData();
formData.append("file", fileInput.files[0]);
formData.append("ocr_lang", "auto");

const response = await fetch("${apiEndpoint}", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ${activeKey}"
  },
  body: formData
});

const data = await response.json();
console.log("Result:", data.payload.extracted_text);`,

    react: `import { useState } from 'react';

export function DocumentScanner() {
  const [text, setText] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    const form = new FormData();
    form.append('file', file);

    const res = await fetch('${apiEndpoint}', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ${activeKey}' },
      body: form
    });

    const json = await res.json();
    setText(json.payload?.extracted_text || []);
    setLoading(false);
  };

  return (
    <div>
      <input type="file" onChange={handleUpload} />
      {loading ? <p>Processing...</p> : text.map((line, i) => <p key={i}>{line}</p>)}
    </div>
  );
}`,
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>
            <Code2 size={28} color="var(--color-primary)" />
            Developer Portal
          </h1>
          <p className={styles.subtitle}>
            Manage API keys and integrate OmniParse into your apps with the code snippets below.
          </p>
        </div>
      </div>

      {/* Stats Row — only real data */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span>Monthly Usage</span>
            <Activity size={16} className={styles.statIcon} />
          </div>
          <div className={styles.statValue}>
            {user?.monthlyUsage ?? 0} <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)' }}>/ {user?.monthlyLimit || 10000}</span>
          </div>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${Math.min(((user?.monthlyUsage ?? 0) / (user?.monthlyLimit || 10000)) * 100, 100)}%` }}
            />
          </div>
          <div className={styles.statSub}>{user?.tier || 'Free Tier'}</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span>Active Keys</span>
            <Key size={16} className={styles.statIcon} />
          </div>
          <div className={styles.statValue}>
            {user?.keys?.filter((k) => k.status === 'active').length || 0}
          </div>
          <div className={styles.statSub}>Max 10 keys on Free Tier</div>
        </div>
      </div>

      {/* API Keys Management */}
      <div className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>
              <Key size={18} />
              API Keys
            </h2>
            <p className={styles.sectionDesc}>
              Authenticate requests with <code>Authorization: Bearer &lt;key&gt;</code>.
            </p>
          </div>

          {!showCreateInput && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowCreateInput(true)}
            >
              <Plus size={14} />
              <span>Create New Key</span>
            </Button>
          )}
        </div>

        {/* Create Key Form */}
        {showCreateInput && (
          <form onSubmit={handleCreateKey} className={styles.createKeyForm}>
            <input
              type="text"
              placeholder="e.g. Production App, Python Script"
              className={styles.createKeyInput}
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              autoFocus
              required
            />
            <Button type="submit" variant="primary" size="sm">
              Generate Key
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowCreateInput(false)}
            >
              Cancel
            </Button>
          </form>
        )}

        {/* Keys List */}
        <div className={styles.keysList}>
          {user?.keys && user.keys.length > 0 ? (
            user.keys.map((k) => {
              const isVisible = visibleKeyIds[k.id];
              const isCopied = copiedKeyId === k.id;
              const displayVal = isVisible
                ? k.key
                : `${k.key.substring(0, 7)}${'•'.repeat(16)}${k.key.substring(k.key.length - 4)}`;

              return (
                <div key={k.id} className={styles.keyItem}>
                  <div className={styles.keyItemLeft}>
                    <div className={styles.keyNameRow}>
                      <span className={styles.keyName}>{k.name}</span>
                      <span className={k.status === 'active' ? styles.badgeActive : styles.badgeRevoked}>
                        {k.status === 'active' ? 'Active' : 'Revoked'}
                      </span>
                    </div>
                    <div className={styles.keyMeta}>
                      Created {new Date(k.created_at).toLocaleDateString()} • Last used: {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : 'Never'}
                    </div>
                  </div>

                  <div className={styles.keyItemRight}>
                    <div className={styles.keyBox}>
                      <span>{displayVal}</span>
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                        onClick={() => toggleVisibility(k.id)}
                        title={isVisible ? 'Hide key' : 'Show key'}
                      >
                        {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>

                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={() => copyToClipboard(k.key, k.id)}
                      title="Copy Key"
                    >
                      {isCopied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                      <span>{isCopied ? 'Copied' : 'Copy'}</span>
                    </button>

                    {k.status === 'active' && (
                      <button
                        type="button"
                        className={`${styles.actionBtn} ${styles.revokeBtn}`}
                        onClick={() => handleRevoke(k.id, k.name)}
                        title="Revoke Key"
                      >
                        <Trash2 size={14} />
                        <span>Revoke</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
              No API keys yet. Click "Create New Key" above to get started.
            </div>
          )}
        </div>
      </div>

      {/* Code Snippets */}
      <div className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>
              <Terminal size={18} />
              Code Snippets
            </h2>
            <p className={styles.sectionDesc}>
              Copy these examples into your project to start extracting documents.
            </p>
          </div>

          {user?.keys && user.keys.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Key:</span>
              <select
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '4px 8px',
                  fontSize: '12px',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                value={selectedKeyObj?.id || ''}
                onChange={(e) => setSelectedKeyId(e.target.value)}
              >
                {user.keys.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name} ({k.status})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Segmented language tabs */}
        <div>
          <div className={styles.tabsBar}>
            {(['curl', 'python', 'javascript', 'react'] as SnippetLang[]).map((lang) => (
              <button
                key={lang}
                type="button"
                className={`${styles.tabBtn} ${activeSnippetLang === lang ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveSnippetLang(lang)}
              >
                {lang === 'curl' ? 'cURL' : lang === 'python' ? 'Python' : lang === 'javascript' ? 'JavaScript' : 'React'}
              </button>
            ))}
          </div>
        </div>

        {/* Modern Code Window */}
        <div className={styles.codeWindow}>
          <div className={styles.codeWindowHeader}>
            <div className={styles.codeWindowHeaderLeft}>
              <span className={styles.codeFileName}>
                <Terminal size={13} style={{ color: '#a1a1aa' }} />
                {fileInfo[activeSnippetLang].filename}
              </span>
              <span className={styles.methodTag}>{fileInfo[activeSnippetLang].method}</span>
              <span className={styles.pathTag}>{fileInfo[activeSnippetLang].path}</span>
            </div>

            <div className={styles.codeWindowHeaderRight}>
              <button
                type="button"
                className={styles.codeCopyBtn}
                onClick={() => copySnippetToClipboard(snippets[activeSnippetLang])}
              >
                {copiedSnippet ? <Check size={13} color="#f4f4f5" /> : <Copy size={13} />}
                <span>{copiedSnippet ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div className={styles.codeBody}>
            <div className={styles.codeLineNumbers}>
              {snippets[activeSnippetLang].split('\n').map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <pre className={styles.codeContent}>
              {snippets[activeSnippetLang].split('\n').map((line, idx) => (
                <div key={idx} className={styles.codeLine}>
                  {highlightCodeLine(line)}
                </div>
              ))}
            </pre>
          </div>
        </div>
      </div>

      {/* Endpoints Reference */}
      <div className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>
              <FileCode size={18} />
              API Endpoints
            </h2>
          </div>
        </div>

        <div className={styles.endpointGrid}>
          <div className={styles.endpointRow}>
            <span className={styles.endpointMethod}>POST</span>
            <span className={styles.endpointPath}>/v1/extract</span>
            <span className={styles.endpointDesc}>
              Extract text, tables, and images from any document (PNG, JPG, PDF, DOCX, PPTX).
            </span>
          </div>

          <div className={styles.endpointRow}>
            <span className={styles.endpointMethod} style={{ background: '#059669' }}>POST</span>
            <span className={styles.endpointPath}>/v1/translate</span>
            <span className={styles.endpointDesc}>
              Translate extracted text into supported languages.
            </span>
          </div>

          <div className={styles.endpointRow}>
            <span className={styles.endpointMethod} style={{ background: '#7c3aed' }}>POST</span>
            <span className={styles.endpointPath}>/v1/transform</span>
            <span className={styles.endpointDesc}>
              Convert documents to Markdown, JSON, or plain text.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
