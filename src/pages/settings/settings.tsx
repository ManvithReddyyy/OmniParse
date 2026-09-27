import { useState } from 'react';
import {
  Cpu,
  Key,
  User,
  Copy,
  Check,
  RefreshCw,
  Activity,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/app-context';
import { useAuth } from '../../context/auth-context';
import { useToast } from '../../context/toast-context';
import { ENGINE_CONFIG } from '../../config/engine';
import Input from '../../components/ui/input';
import Button from '../../components/ui/button';
import Select from '../../components/ui/select';
import styles from './settings.module.css';

type SubNavTab = 'ocr' | 'api' | 'appearance';

export default function Settings() {
  const { state, updateSettings } = useApp();
  const { user } = useAuth();
  const { addToast } = useToast();
  const { settings } = state;

  const [activeTab, setActiveTab] = useState<SubNavTab>('ocr');

  // OCR Settings
  const [defaultLanguage, setDefaultLanguage] = useState(settings.language || 'en');
  const [defaultOutputFormat, setDefaultOutputFormat] = useState(settings.defaultOutputFormat || 'markdown');

  // API Settings
  const [apiUrl, setApiUrl] = useState(() => 
    localStorage.getItem('omniparse_api_url') || ENGINE_CONFIG.publicApiBase
  );
  const [apiStatus, setApiStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle');
  const [apiKey, setApiKey] = useState(user?.apiKey || '');
  const [copiedKey, setCopiedKey] = useState(false);

  // Appearance Settings
  const [displayName, setDisplayName] = useState(user?.name || settings.displayName || 'Developer');
  const [userEmail, setUserEmail] = useState(user?.email || settings.email || '');
  const [theme, setTheme] = useState(settings.theme || 'light');

  const navItems = [
    { id: 'ocr' as SubNavTab, label: 'OCR & Output', icon: Cpu },
    { id: 'api' as SubNavTab, label: 'API Credentials', icon: Key },
    { id: 'appearance' as SubNavTab, label: 'Appearance & Profile', icon: User },
  ];

  const handleSaveOcr = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({ language: defaultLanguage, defaultOutputFormat: defaultOutputFormat as any });
    addToast('OCR settings updated', 'success');
  };

  const handleTestConnection = async () => {
    setApiStatus('testing');
    try {
      const { Client } = await import('@gradio/client');
      const client = await Client.connect(ENGINE_CONFIG.spaceTarget);
      if (client) {
        setApiStatus('connected');
        addToast('Connected to OmniParse Engine', 'success');
        return;
      }
      setApiStatus('error');
      addToast('Could not reach OmniParse Engine', 'error');
    } catch {
      setApiStatus('error');
      addToast('Could not reach OmniParse Engine', 'error');
    }
  };

  const handleSaveApi = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = apiUrl.trim().replace(/\/+$/, '');
    localStorage.setItem('omniparse_api_url', cleanUrl);
    addToast(`API URL saved: ${cleanUrl}`, 'success');
  };

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText(user?.apiKey || apiKey);
    setCopiedKey(true);
    addToast('API key copied to clipboard', 'success');
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleRegenerateApiKey = () => {
    const newKey = `op_live_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
    setApiKey(newKey);
    addToast('New API key generated', 'success');
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({ displayName, email: userEmail, theme: theme as any });
    addToast('Profile settings updated', 'success');
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.subtitle}>
          Configure OCR, API connectivity, and display preferences.
        </p>
      </div>

      {/* Tabs */}
      <nav className={styles.tabsNav}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`${styles.tabBtn} ${isActive ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={14} className={styles.tabIcon} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Content */}
      <div className={styles.contentArea}>
        {/* OCR & Output */}
        {activeTab === 'ocr' && (
          <form onSubmit={handleSaveOcr} className={styles.settingsCard}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>OCR & Output</h2>
              <p className={styles.cardDescription}>
                Set the default language and output format for document processing.
              </p>
            </div>

            <div className={styles.cardBody}>
              <div className={styles.settingRow}>
                <div className={styles.settingInfo}>
                  <span className={styles.settingLabel}>Default Language</span>
                  <span className={styles.settingDescription}>
                    Language used for OCR text extraction.
                  </span>
                </div>
                <div className={styles.settingControl}>
                  <Select
                    value={defaultLanguage}
                    onChange={(e) => setDefaultLanguage(e.target.value)}
                    options={[
                      { value: 'en', label: 'English' },
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

              <div className={styles.settingRow}>
                <div className={styles.settingInfo}>
                  <span className={styles.settingLabel}>Default Output Format</span>
                  <span className={styles.settingDescription}>
                    Format generated when documents finish processing.
                  </span>
                </div>
                <div className={styles.settingControl}>
                  <Select
                    value={defaultOutputFormat}
                    onChange={(e) => setDefaultOutputFormat(e.target.value as any)}
                    options={[
                      { value: 'markdown', label: 'Markdown' },
                      { value: 'json', label: 'JSON' },
                      { value: 'plaintext', label: 'Plain Text' },
                    ]}
                  />
                </div>
              </div>
            </div>

            <div className={styles.cardFooter}>
              <Button type="submit" variant="primary" size="sm">
                Save Preferences
              </Button>
            </div>
          </form>
        )}

        {/* API Credentials */}
        {activeTab === 'api' && (
          <form onSubmit={handleSaveApi} className={styles.settingsCard}>
            <div className={styles.cardHeader}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h2 className={styles.cardTitle}>API Credentials</h2>
                  <p className={styles.cardDescription}>
                    Manage your API endpoint and authentication key.
                  </p>
                </div>
                <Link
                  to="/api-keys"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    color: '#6366f1',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '13px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                  }}
                >
                  <Key size={14} />
                  <span>Developer Portal →</span>
                </Link>
              </div>
            </div>

            <div className={styles.cardBody}>
              <div className={styles.settingRow}>
                <div className={styles.settingInfo}>
                  <span className={styles.settingLabel}>Engine URL</span>
                  <span className={styles.settingDescription}>
                    The remote OCR engine endpoint.
                  </span>
                </div>
                <div className={styles.settingControl} style={{ minWidth: '320px', gap: '8px' }}>
                  <Input
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    placeholder="https://api.omniparse.dev/v1"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={handleTestConnection}
                    disabled={apiStatus === 'testing'}
                  >
                    <Activity size={14} />
                    <span>{apiStatus === 'testing' ? 'Testing...' : 'Test Connection'}</span>
                  </Button>
                </div>
              </div>

              <div className={styles.settingRow}>
                <div className={styles.settingInfo}>
                  <span className={styles.settingLabel}>API Key</span>
                  <span className={styles.settingDescription}>
                    Include as <code>Authorization: Bearer &lt;key&gt;</code> in your requests.
                  </span>
                </div>
                <div className={styles.settingControl} style={{ minWidth: '320px' }}>
                  <div className={styles.apiKeyInputGroup}>
                    <Input
                      value={user?.apiKey || apiKey}
                      readOnly
                      mono
                    />
                    <Button type="button" variant="secondary" size="md" onClick={handleCopyApiKey} title="Copy API Key">
                      {copiedKey ? <Check size={14} style={{ color: 'var(--status-success)' }} /> : <Copy size={14} />}
                    </Button>
                    <Button type="button" variant="secondary" size="md" onClick={handleRegenerateApiKey} title="Generate New Key">
                      <RefreshCw size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.cardFooter}>
              <Button type="submit" variant="primary" size="sm">
                Save API Settings
              </Button>
            </div>
          </form>
        )}

        {/* Appearance & Profile */}
        {activeTab === 'appearance' && (
          <form onSubmit={handleSaveProfile} className={styles.settingsCard}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Appearance & Profile</h2>
              <p className={styles.cardDescription}>
                Update your display name, email, and theme.
              </p>
            </div>

            <div className={styles.cardBody}>
              <div className={styles.settingRow}>
                <div className={styles.settingInfo}>
                  <span className={styles.settingLabel}>Display Name</span>
                  <span className={styles.settingDescription}>
                    Shown in the top bar and user menu.
                  </span>
                </div>
                <div className={styles.settingControl}>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
              </div>

              <div className={styles.settingRow}>
                <div className={styles.settingInfo}>
                  <span className={styles.settingLabel}>Email Address</span>
                  <span className={styles.settingDescription}>
                    Your account email.
                  </span>
                </div>
                <div className={styles.settingControl}>
                  <Input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div className={styles.settingRow}>
                <div className={styles.settingInfo}>
                  <span className={styles.settingLabel}>Theme</span>
                  <span className={styles.settingDescription}>
                    Choose between light, dark, or system theme.
                  </span>
                </div>
                <div className={styles.settingControl}>
                  <Select
                    value={theme}
                    onChange={(val) => setTheme(val as any)}
                    options={[
                      { value: 'light', label: 'Light' },
                      { value: 'system', label: 'System' },
                      { value: 'dark', label: 'Dark' },
                    ]}
                  />
                </div>
              </div>
            </div>

            <div className={styles.cardFooter}>
              <Button type="submit" variant="primary" size="sm">
                Save Profile
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
