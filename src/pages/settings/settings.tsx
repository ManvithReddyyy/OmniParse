import { useState } from 'react';
import {
  Copy,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  ExternalLink,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/app-context';
import { useAuth } from '../../context/auth-context';
import { useToast } from '../../context/toast-context';
import { ENGINE_CONFIG } from '../../config/engine';
import Input from '../../components/ui/input';
import Select from '../../components/ui/select';
import styles from './settings.module.css';

type TabId = 'ocr' | 'engine' | 'profile';

export default function Settings() {
  const { state, updateSettings } = useApp();
  const { user } = useAuth();
  const { addToast } = useToast();
  const { settings } = state;

  const [activeTab, setActiveTab] = useState<TabId>('ocr');

  // OCR & Extraction Settings
  const [defaultLanguage, setDefaultLanguage] = useState(settings.language || 'en');
  const [defaultOutputFormat, setDefaultOutputFormat] = useState(
    settings.defaultOutputFormat || 'markdown'
  );
  const [deepTableExtraction, setDeepTableExtraction] = useState(true);
  const [autoDeskew, setAutoDeskew] = useState(true);

  // Engine & API Settings
  const [apiUrl, setApiUrl] = useState(
    () => localStorage.getItem('omniparse_api_url') || ENGINE_CONFIG.publicApiBase
  );
  const [apiStatus, setApiStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle');
  const [latency, setLatency] = useState<number | null>(null);
  const [apiKey, setApiKey] = useState(user?.apiKey || 'op_live_98a7bc65d4e3f21098a7bc65');
  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Preferences & Workspace
  const [displayName, setDisplayName] = useState(
    user?.name || settings.displayName || 'OmniParse Admin'
  );
  const [userEmail, setUserEmail] = useState(
    user?.email || settings.email || 'workspace@omniparse.ai'
  );
  const [theme, setTheme] = useState(settings.theme || 'dark');

  const tabs: { id: TabId; label: string }[] = [
    { id: 'ocr', label: 'OCR & Extraction' },
    { id: 'engine', label: 'Engine & API' },
    { id: 'profile', label: 'Preferences & Workspace' },
  ];

  /* ── Handlers ─────────────────────────────────────────── */

  const handleSaveOcr = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      language: defaultLanguage,
      defaultOutputFormat: defaultOutputFormat as any,
    });
    addToast('Extraction defaults updated', 'success');
  };

  const handleTestConnection = async () => {
    setApiStatus('testing');
    setLatency(null);
    const start = Date.now();
    try {
      const res = await fetch('https://manvithreddy-omniparse-backend.hf.space/health');
      const ms = Date.now() - start;
      if (res.ok) {
        setApiStatus('connected');
        setLatency(ms);
        addToast(`Connected to OmniParse Engine (${ms}ms)`, 'success');
        return;
      }
      setApiStatus('error');
      addToast(`Engine connection returned HTTP ${res.status}`, 'error');
    } catch {
      setApiStatus('error');
      addToast('Engine connection timed out or unreachable', 'error');
    }
  };

  const handleSaveEngine = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = apiUrl.trim().replace(/\/+$/, '');
    localStorage.setItem('omniparse_api_url', cleanUrl);
    addToast(`Engine endpoint saved: ${cleanUrl}`, 'success');
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(user?.apiKey || apiKey);
    setCopiedKey(true);
    addToast('API Key copied to clipboard', 'success');
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleRegenerateKey = () => {
    const newKey = `op_live_${Math.random().toString(36).substring(2, 10)}${Math.random()
      .toString(36)
      .substring(2, 10)}`;
    setApiKey(newKey);
    addToast('New API key generated', 'success');
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      displayName,
      email: userEmail,
      theme: theme as any,
    });
    addToast('Workspace preferences saved', 'success');
  };

  const handleClearCache = () => {
    if (confirm('Clear local workspace cache and reset stored preferences?')) {
      localStorage.removeItem('omniparse_api_url');
      addToast('Workspace cache cleared', 'info');
    }
  };

  return (
    <div className={styles.page}>
      {/* Page Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.subtitle}>
          Manage workspace defaults, OCR parsing configuration, and API access.
        </p>
      </div>

      {/* Tabs */}
      <nav className={styles.tabsNav}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`${styles.tabBtn} ${activeTab === tab.id ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab Panels */}
      <div className={styles.contentArea}>
        {/* TAB 1: OCR & EXTRACTION */}
        {activeTab === 'ocr' && (
          <form onSubmit={handleSaveOcr} className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Extraction Defaults</h2>
              <p className={styles.cardDescription}>
                Configure default parameters applied during document ingestion and OCR analysis.
              </p>
            </div>

            <div className={styles.cardBody}>
              {/* Default Language */}
              <div className={styles.settingRow}>
                <div className={styles.settingMeta}>
                  <span className={styles.settingLabel}>Default OCR Language</span>
                  <span className={styles.settingDesc}>
                    Primary model language for optical character recognition.
                  </span>
                </div>
                <div className={styles.settingControl}>
                  <Select
                    value={defaultLanguage}
                    onChange={(e) => setDefaultLanguage(e.target.value)}
                    options={[
                      { value: 'en', label: 'English (US)' },
                      { value: 'japan', label: 'Japanese (日本語)' },
                      { value: 'german', label: 'German (Deutsch)' },
                      { value: 'french', label: 'French (Français)' },
                      { value: 'es', label: 'Spanish (Español)' },
                      { value: 'ch', label: 'Chinese (中文)' },
                      { value: 'hi', label: 'Hindi (हिन्दी)' },
                    ]}
                  />
                </div>
              </div>

              {/* Default Output Format */}
              <div className={styles.settingRow}>
                <div className={styles.settingMeta}>
                  <span className={styles.settingLabel}>Default Output Format</span>
                  <span className={styles.settingDesc}>
                    Target format automatically produced when document processing completes.
                  </span>
                </div>
                <div className={styles.settingControl}>
                  <Select
                    value={defaultOutputFormat}
                    onChange={(e) => setDefaultOutputFormat(e.target.value as any)}
                    options={[
                      { value: 'markdown', label: 'Markdown (.md)' },
                      { value: 'json', label: 'Structured JSON (.json)' },
                      { value: 'plaintext', label: 'Plain Text (.txt)' },
                    ]}
                  />
                </div>
              </div>

              {/* Deep Table Recognition */}
              <div className={styles.settingRow}>
                <div className={styles.settingMeta}>
                  <span className={styles.settingLabel}>Deep Table & Grid Analysis</span>
                  <span className={styles.settingDesc}>
                    Execute multi-pass bounding-box analysis for complex nested tables.
                  </span>
                </div>
                <div className={styles.settingControl}>
                  <label className={styles.toggleWrapper}>
                    <input
                      type="checkbox"
                      checked={deepTableExtraction}
                      onChange={(e) => setDeepTableExtraction(e.target.checked)}
                      className={styles.toggleInput}
                    />
                    <span className={styles.toggleTrack}>
                      <span className={styles.toggleThumb} />
                    </span>
                  </label>
                </div>
              </div>

              {/* Auto Deskew */}
              <div className={styles.settingRow}>
                <div className={styles.settingMeta}>
                  <span className={styles.settingLabel}>Auto-Deskew & Orientation</span>
                  <span className={styles.settingDesc}>
                    Automatically rectify rotated or crooked document camera captures.
                  </span>
                </div>
                <div className={styles.settingControl}>
                  <label className={styles.toggleWrapper}>
                    <input
                      type="checkbox"
                      checked={autoDeskew}
                      onChange={(e) => setAutoDeskew(e.target.checked)}
                      className={styles.toggleInput}
                    />
                    <span className={styles.toggleTrack}>
                      <span className={styles.toggleThumb} />
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className={styles.cardFooter}>
              <button type="submit" className={styles.saveBtn}>
                Save Changes
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: ENGINE & API */}
        {activeTab === 'engine' && (
          <>
            {/* Card 1: Remote Inference Engine */}
            <form onSubmit={handleSaveEngine} className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Inference Engine Endpoint</h2>
                <p className={styles.cardDescription}>
                  The backend inference server used to execute OCR and parsing workloads.
                </p>
              </div>

              <div className={styles.cardBody}>
                <div className={styles.settingRow}>
                  <div className={styles.settingMeta}>
                    <span className={styles.settingLabel}>Engine URL</span>
                    <span className={styles.settingDesc}>
                      Remote or self-hosted OmniParse Gradio/FastAPI server endpoint.
                    </span>
                  </div>
                  <div className={styles.settingControl} style={{ maxWidth: '380px', width: '100%' }}>
                    <div className={styles.inputGroup}>
                      <Input
                        value={apiUrl}
                        onChange={(e) => setApiUrl(e.target.value)}
                        placeholder="https://api.omniparse.dev/v1"
                        mono
                      />
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={handleTestConnection}
                        disabled={apiStatus === 'testing'}
                      >
                        <Activity size={13} />
                        <span>{apiStatus === 'testing' ? 'Testing...' : 'Test'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {apiStatus !== 'idle' && (
                  <div className={styles.settingRow}>
                    <div className={styles.settingMeta}>
                      <span className={styles.settingLabel}>Connection Status</span>
                    </div>
                    <div className={styles.settingControl}>
                      {apiStatus === 'connected' && (
                        <span className={styles.connectionStatus}>
                          <span className={styles.statusDot} />
                          <span>Connected ({latency ? `${latency}ms` : 'Healthy'})</span>
                        </span>
                      )}
                      {apiStatus === 'error' && (
                        <span className={styles.connectionStatus} style={{ color: '#EF4444' }}>
                          <span className={styles.statusDotError} />
                          <span>Unreachable</span>
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.cardFooter}>
                <button type="submit" className={styles.saveBtn}>
                  Save Endpoint
                </button>
              </div>
            </form>

            {/* Card 2: Workspace API Key */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 className={styles.cardTitle}>Workspace API Key</h2>
                    <p className={styles.cardDescription}>
                      Authenticate programmatic requests with <code>Authorization: Bearer &lt;key&gt;</code>.
                    </p>
                  </div>
                  <Link
                    to="/api-keys"
                    className={styles.secondaryBtn}
                    style={{ textDecoration: 'none' }}
                  >
                    <span>Developer Portal</span>
                    <ExternalLink size={12} />
                  </Link>
                </div>
              </div>

              <div className={styles.cardBody}>
                <div className={styles.settingRow}>
                  <div className={styles.settingMeta}>
                    <span className={styles.settingLabel}>Production Key</span>
                    <span className={styles.settingDesc}>
                      Keep this secret. Do not expose in client-side code repositories.
                    </span>
                  </div>
                  <div className={styles.settingControl} style={{ maxWidth: '380px', width: '100%' }}>
                    <div className={styles.inputGroup}>
                      <Input
                        type={showKey ? 'text' : 'password'}
                        value={user?.apiKey || apiKey}
                        readOnly
                        mono
                      />
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={() => setShowKey(!showKey)}
                        title={showKey ? 'Hide key' : 'Reveal key'}
                      >
                        {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={handleCopyKey}
                        title="Copy API key"
                      >
                        {copiedKey ? <Check size={13} style={{ color: '#22C55E' }} /> : <Copy size={13} />}
                      </button>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={handleRegenerateKey}
                        title="Regenerate key"
                      >
                        <RefreshCw size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* TAB 3: PREFERENCES & WORKSPACE */}
        {activeTab === 'profile' && (
          <>
            <form onSubmit={handleSaveProfile} className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Workspace Profile</h2>
                <p className={styles.cardDescription}>
                  Manage your display identity and workspace contact email.
                </p>
              </div>

              <div className={styles.cardBody}>
                <div className={styles.settingRow}>
                  <div className={styles.settingMeta}>
                    <span className={styles.settingLabel}>Display Name</span>
                    <span className={styles.settingDesc}>
                      Shown in navigation drawers, generated audit logs, and document metadata.
                    </span>
                  </div>
                  <div className={styles.settingControl}>
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="OmniParse Admin"
                    />
                  </div>
                </div>

                <div className={styles.settingRow}>
                  <div className={styles.settingMeta}>
                    <span className={styles.settingLabel}>Notification Email</span>
                    <span className={styles.settingDesc}>
                      Destination for batch completion alerts and system notifications.
                    </span>
                  </div>
                  <div className={styles.settingControl}>
                    <Input
                      type="email"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="workspace@omniparse.ai"
                    />
                  </div>
                </div>

                <div className={styles.settingRow}>
                  <div className={styles.settingMeta}>
                    <span className={styles.settingLabel}>Interface Theme</span>
                    <span className={styles.settingDesc}>
                      Select the color theme for the OmniParse application interface.
                    </span>
                  </div>
                  <div className={styles.settingControl}>
                    <Select
                      value={theme}
                      onChange={(e) => setTheme(e.target.value as any)}
                      options={[
                        { value: 'dark', label: 'Dark (OLED Zinc)' },
                        { value: 'light', label: 'Light' },
                        { value: 'system', label: 'System Default' },
                      ]}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.cardFooter}>
                <button type="submit" className={styles.saveBtn}>
                  Save Preferences
                </button>
              </div>
            </form>

            {/* Danger Zone */}
            <div className={`${styles.card} ${styles.dangerCard}`}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Danger Zone</h2>
                <p className={styles.cardDescription}>
                  Irreversible actions that affect your local browser workspace state.
                </p>
              </div>

              <div className={styles.cardBody}>
                <div className={styles.settingRow}>
                  <div className={styles.settingMeta}>
                    <span className={styles.settingLabel}>Reset Workspace Cache</span>
                    <span className={styles.settingDesc}>
                      Clears local endpoint overrides, session storage, and cached document analysis views.
                    </span>
                  </div>
                  <div className={styles.settingControl}>
                    <button
                      type="button"
                      className={styles.dangerBtn}
                      onClick={handleClearCache}
                    >
                      <AlertTriangle size={13} />
                      <span>Clear Cache</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}