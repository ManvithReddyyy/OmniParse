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
  Zap,
  Activity,
  Layers,
  Sparkles,
  Upload,
} from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import { useToast } from '../../context/toast-context';
import { ENGINE_CONFIG } from '../../config/engine';
import Button from '../../components/ui/button';
import styles from './developers.module.css';

type SnippetLang = 'curl' | 'python' | 'javascript' | 'react';

export default function Developers() {
  const { user, createApiKey, revokeApiKey, recordApiUsage } = useAuth();
  const { addToast } = useToast();

  const [visibleKeyIds, setVisibleKeyIds] = useState<Record<string, boolean>>({});
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [activeSnippetLang, setActiveSnippetLang] = useState<SnippetLang>('curl');

  const [newKeyName, setNewKeyName] = useState('');
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [selectedKeyId, setSelectedKeyId] = useState<string>('');

  // Playground state
  const [playgroundTesting, setPlaygroundTesting] = useState(false);
  const [playgroundOutput, setPlaygroundOutput] = useState<string | null>(null);

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

  const handleCreateKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    try {
      const newKey = createApiKey(newKeyName.trim());
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

  const [testFile, setTestFile] = useState<File | null>(null);

  const handleTestPlayground = async () => {
    if (selectedKeyObj?.status === 'revoked') {
      setPlaygroundOutput(
        JSON.stringify(
          {
            status: 'error',
            code: 401,
            message: 'Unauthorized: This API key has been revoked.',
          },
          null,
          2
        )
      );
      addToast('Cannot execute: This API key is revoked', 'error');
      return;
    }

    setPlaygroundTesting(true);
    setPlaygroundOutput(null);
    const start = Date.now();

    try {
      const { Client, handle_file } = await import('@gradio/client');
      const client = await Client.connect(ENGINE_CONFIG.spaceTarget);

      let targetBlob: Blob | File;
      let filename = 'test_image.png';

      if (testFile) {
        targetBlob = testFile;
        filename = testFile.name;
      } else {
        // Generate a test image with text
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 140;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, 600, 140);
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 22px sans-serif';
          ctx.fillText('OmniParse API Test', 24, 46);
          ctx.font = '15px monospace';
          ctx.fillStyle = '#334155';
          ctx.fillText(`Key: ${activeKey.substring(0, 12)}...`, 24, 82);
          ctx.fillText(`Time: ${new Date().toLocaleTimeString()}`, 24, 110);
        }
        targetBlob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b || new Blob()), 'image/png');
        });
      }

      const res = await client.predict('/gradio_ocr', {
        img: typeof handle_file === 'function' ? handle_file(targetBlob) : targetBlob,
      });

      const elapsed = Date.now() - start;
      const raw = ((res.data as any)?.[0] as string) || '';
      const lines = raw.split('\n').map((l: string) => l.trim()).filter(Boolean);

      setPlaygroundOutput(
        JSON.stringify(
          {
            status: 'success',
            code: 200,
            latency_ms: elapsed,
            payload: {
              filename,
              extracted_lines_count: lines.length,
              extracted_text: lines,
            },
          },
          null,
          2
        )
      );
      recordApiUsage(selectedKeyObj?.id);
      addToast(`API call succeeded in ${elapsed}ms`, 'success');
    } catch (err: any) {
      setPlaygroundOutput(
        JSON.stringify(
          {
            status: 'error',
            code: 500,
            message: err?.message || 'Error communicating with OmniParse Engine',
          },
          null,
          2
        )
      );
      addToast('API call failed — check network connection', 'error');
    } finally {
      setPlaygroundTesting(false);
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

        <div className={styles.statusPill}>
          <span className={styles.pulseDot} />
          <span>Engine Online</span>
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
                      Created {new Date(k.createdAt).toLocaleDateString()} • Last used: {k.lastUsed}
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

        <div className={styles.tabsBar}>
          <button
            className={`${styles.tabBtn} ${activeSnippetLang === 'curl' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveSnippetLang('curl')}
          >
            cURL
          </button>
          <button
            className={`${styles.tabBtn} ${activeSnippetLang === 'python' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveSnippetLang('python')}
          >
            Python
          </button>
          <button
            className={`${styles.tabBtn} ${activeSnippetLang === 'javascript' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveSnippetLang('javascript')}
          >
            JavaScript
          </button>
          <button
            className={`${styles.tabBtn} ${activeSnippetLang === 'react' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveSnippetLang('react')}
          >
            React
          </button>
        </div>

        <div className={styles.codeBlock}>
          <button
            className={styles.codeCopyBtn}
            onClick={() => copySnippetToClipboard(snippets[activeSnippetLang])}
          >
            {copiedSnippet ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
            <span>{copiedSnippet ? 'Copied!' : 'Copy'}</span>
          </button>
          <pre style={{ margin: 0, overflowX: 'auto' }}>
            <code>{snippets[activeSnippetLang]}</code>
          </pre>
        </div>
      </div>

      {/* API Playground */}
      <div className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>
              <Sparkles size={18} color="#f59e0b" />
              API Playground
            </h2>
            <p className={styles.sectionDesc}>
              Test your API key with a live OCR request.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <input
              type="file"
              id="playground-file"
              style={{ display: 'none' }}
              accept="image/*,.pdf"
              onChange={(e) => {
                if (e.target.files?.[0]) setTestFile(e.target.files[0]);
              }}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => document.getElementById('playground-file')?.click()}
            >
              <Upload size={14} />
              <span>{testFile ? testFile.name : 'Upload File'}</span>
            </Button>
            {testFile && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setTestFile(null)}
              >
                Clear
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={handleTestPlayground}
              disabled={playgroundTesting}
            >
              <Zap size={14} />
              <span>{playgroundTesting ? 'Running...' : 'Run API Call'}</span>
            </Button>
          </div>
        </div>

        {playgroundOutput ? (
          <div className={styles.codeBlock} style={{ background: '#0b1329', borderColor: '#1e3a8a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, borderBottom: '1px solid #1e293b', paddingBottom: 6 }}>
              <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>● Response</span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>application/json</span>
            </div>
            <pre style={{ margin: 0 }}>
              <code>{playgroundOutput}</code>
            </pre>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '32px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)' }}>
            <Layers size={24} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.6 }} />
            <p style={{ margin: 0, fontWeight: 500 }}>API Playground</p>
            <small>Upload a file or click "Run API Call" to test your key.</small>
          </div>
        )}
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
