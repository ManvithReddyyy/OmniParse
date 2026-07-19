import { useState } from 'react';
import { Bell, MessageSquare, BellOff, Shield, Key, Copy, Check } from 'lucide-react';
import { useApp } from '../../context/app-context';
import { useToast } from '../../context/toast-context';
import { Card, CardBody, CardFooter } from '../../components/ui/card';
import Input from '../../components/ui/input';
import Button from '../../components/ui/button';
import Checkbox from '../../components/ui/checkbox';
import Select from '../../components/ui/select';
import Toggle from '../../components/ui/toggle';
import styles from './settings.module.css';

type SubNavTab = 'General' | 'Appearance' | 'Security';

type NotificationPreference = 'everything' | 'available' | 'ignoring';

export default function Settings() {
  const { state, updateSettings } = useApp();
  const { addToast } = useToast();
  const { settings } = state;

  const [activeTab, setActiveTab] = useState<SubNavTab>('General');
  const [projectName, setProjectName] = useState(settings.displayName || 'OmniParse IDP');
  const [rootDir, setRootDir] = useState('/web');
  const [includeOutsideFiles, setIncludeOutsideFiles] = useState(true);
  const [notificationPref, setNotificationPref] = useState<NotificationPreference>('available');
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [shareUsageData, setShareUsageData] = useState(true);
  const [thirdPartyCookies, setThirdPartyCookies] = useState(false);
  const [apiKey, setApiKey] = useState('op_live_9f8a3c1e2b4d5e6f7a8b9c0d');
  const [copiedKey, setCopiedKey] = useState(false);
  const [twoFactor, setTwoFactor] = useState(true);

  const navItems: SubNavTab[] = ['General', 'Appearance', 'Security'];

  const handleSaveProjectName = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({ displayName: projectName });
    addToast('Project name updated successfully', 'success');
  };

  const handleSaveRootDir = (e: React.FormEvent) => {
    e.preventDefault();
    addToast('Root directory updated successfully', 'success');
  };

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    addToast('API key copied to clipboard', 'success');
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleRegenerateApiKey = () => {
    const newKey = `op_live_${Math.random().toString(36).substring(2, 14)}${Math.random().toString(36).substring(2, 14)}`;
    setApiKey(newKey);
    addToast('New API key generated', 'success');
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Settings</h1>

      <div className={styles.layoutGrid}>
        {/* Left Sub-Navigation */}
        <nav className={styles.subNav}>
          {navItems.map((item) => (
            <button
              key={item}
              className={`${styles.navItem} ${activeTab === item ? styles.navItemActive : ''}`}
              onClick={() => setActiveTab(item)}
            >
              {item}
            </button>
          ))}
        </nav>

        {/* Right Main Content Area */}
        <div className={styles.contentColumn}>
          {/* GENERAL TAB CONTENT */}
          {(activeTab === 'General') && (
            <>
              {/* Project Name Card */}
              <Card>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Project Name</div>
                  <div className={styles.cardDescription}>Used to identify your project in the dashboard.</div>
                </div>
                <form onSubmit={handleSaveProjectName}>
                  <CardBody className={styles.cardBody}>
                    <Input
                      placeholder="Project Name"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                    />
                  </CardBody>
                  <CardFooter className={styles.cardFooter}>
                    <Button type="submit" variant="primary" size="sm">
                      Save
                    </Button>
                  </CardFooter>
                </form>
              </Card>

              {/* Root Directory Card */}
              <Card>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Root Directory</div>
                  <div className={styles.cardDescription}>The directory within your project, in which your code is located.</div>
                </div>
                <form onSubmit={handleSaveRootDir}>
                  <CardBody className={styles.cardBody}>
                    <Input
                      placeholder="Root Directory"
                      value={rootDir}
                      onChange={(e) => setRootDir(e.target.value)}
                    />
                    <Checkbox
                      id="include-files"
                      label="Include files from outside of the Root Directory"
                      checked={includeOutsideFiles}
                      onChange={(checked) => setIncludeOutsideFiles(checked)}
                    />
                  </CardBody>
                  <CardFooter className={styles.cardFooter}>
                    <Button type="submit" variant="primary" size="sm">
                      Save
                    </Button>
                  </CardFooter>
                </form>
              </Card>

              {/* Notifications Card */}
              <Card>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Notifications</div>
                  <div className={styles.cardDescription}>Choose what you want to be notified about.</div>
                </div>
                <CardBody className={styles.cardBody}>
                  <div className={styles.notificationGroup}>
                    {/* Everything Option */}
                    <div
                      className={`${styles.notificationOption} ${notificationPref === 'everything' ? styles.notificationOptionSelected : ''}`}
                      onClick={() => {
                        setNotificationPref('everything');
                        addToast('Notification preference set to Everything', 'info');
                      }}
                    >
                      <Bell size={18} className={styles.optionIcon} />
                      <div className={styles.optionText}>
                        <span className={styles.optionTitle}>Everything</span>
                        <span className={styles.optionDesc}>Email digest, mentions & all activity.</span>
                      </div>
                    </div>

                    {/* Available Option */}
                    <div
                      className={`${styles.notificationOption} ${notificationPref === 'available' ? styles.notificationOptionSelected : ''}`}
                      onClick={() => {
                        setNotificationPref('available');
                        addToast('Notification preference set to Available', 'info');
                      }}
                    >
                      <MessageSquare size={18} className={styles.optionIcon} />
                      <div className={styles.optionText}>
                        <span className={styles.optionTitle}>Available</span>
                        <span className={styles.optionDesc}>Only mentions and comments.</span>
                      </div>
                    </div>

                    {/* Ignoring Option */}
                    <div
                      className={`${styles.notificationOption} ${notificationPref === 'ignoring' ? styles.notificationOptionSelected : ''}`}
                      onClick={() => {
                        setNotificationPref('ignoring');
                        addToast('Notification preference set to Ignoring', 'info');
                      }}
                    >
                      <BellOff size={18} className={styles.optionIcon} />
                      <div className={styles.optionText}>
                        <span className={styles.optionTitle}>Ignoring</span>
                        <span className={styles.optionDesc}>Turn off all notifications.</span>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Privacy Card */}
              <Card>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Privacy</div>
                  <div className={styles.cardDescription}>Manage your privacy settings.</div>
                </div>
                <CardBody className={styles.cardBody}>
                  <div className={styles.settingRow}>
                    <div className={styles.settingInfo}>
                      <span className={styles.settingLabel}>Share Usage Data</span>
                      <span className={styles.settingDescription}>
                        Help us improve the product by sharing anonymous usage data.
                      </span>
                    </div>
                    <Toggle
                      checked={shareUsageData}
                      onChange={(checked) => {
                        setShareUsageData(checked);
                        addToast(`Share usage data ${checked ? 'enabled' : 'disabled'}`, 'info');
                      }}
                    />
                  </div>

                  <div className={styles.settingRow}>
                    <div className={styles.settingInfo}>
                      <span className={styles.settingLabel}>Allow Third-Party Cookies</span>
                      <span className={styles.settingDescription}>
                        Enable third-party cookies for personalized content.
                      </span>
                    </div>
                    <Toggle
                      checked={thirdPartyCookies}
                      onChange={(checked) => {
                        setThirdPartyCookies(checked);
                        addToast(`Third-party cookies ${checked ? 'enabled' : 'disabled'}`, 'info');
                      }}
                    />
                  </div>
                </CardBody>
              </Card>
            </>
          )}

          {/* APPEARANCE TAB CONTENT */}
          {(activeTab === 'Appearance') && (
            <Card>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>Appearance</div>
                <div className={styles.cardDescription}>Choose your preferred theme and font size.</div>
              </div>
              <CardBody className={styles.cardBody}>
                <div className={styles.settingRow}>
                  <div className={styles.settingInfo}>
                    <span className={styles.settingLabel}>Theme</span>
                    <span className={styles.settingDescription}>Choose between light, dark, and system theme.</span>
                  </div>
                  <div className={styles.settingControl}>
                    <Select
                      options={[
                        { value: 'light', label: 'Light' },
                        { value: 'dark', label: 'Dark' },
                        { value: 'system', label: 'System' },
                      ]}
                      value={settings.theme}
                      onChange={(e) => {
                        const newTheme = e.target.value as 'light' | 'dark' | 'system';
                        updateSettings({ theme: newTheme });
                        addToast(`Theme set to ${newTheme}`, 'success');
                      }}
                    />
                  </div>
                </div>

                <div className={styles.settingRow}>
                  <div className={styles.settingInfo}>
                    <span className={styles.settingLabel}>Font Size</span>
                    <span className={styles.settingDescription}>Adjust the font size to your preference.</span>
                  </div>
                  <div className={styles.settingControl}>
                    <Select
                      options={[
                        { value: 'small', label: 'Small' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'large', label: 'Large' },
                      ]}
                      value={fontSize}
                      onChange={(e) => {
                        const size = e.target.value as 'small' | 'medium' | 'large';
                        setFontSize(size);
                        addToast(`Font size set to ${size}`, 'info');
                      }}
                    />
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* SECURITY TAB CONTENT */}
          {(activeTab === 'Security') && (
            <>
              <Card>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>API Keys</div>
                  <div className={styles.cardDescription}>Manage your secret keys for accessing OmniParse IDP APIs.</div>
                </div>
                <CardBody className={styles.cardBody}>
                  <div className={styles.settingRow}>
                    <div className={styles.settingInfo} style={{ flex: 1 }}>
                      <span className={styles.settingLabel}>Live API Key</span>
                      <span className={styles.settingDescription}>Use this key to authenticate backend requests.</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <Button variant="ghost" size="sm" onClick={handleCopyApiKey}>
                        {copiedKey ? <Check size={14} /> : <Copy size={14} />}
                        {copiedKey ? 'Copied' : 'Copy Key'}
                      </Button>
                      <Button variant="secondary" size="sm" onClick={handleRegenerateApiKey}>
                        <Key size={14} />
                        Roll Key
                      </Button>
                    </div>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Security Preferences</div>
                  <div className={styles.cardDescription}>Manage authentication & session settings.</div>
                </div>
                <CardBody className={styles.cardBody}>
                  <div className={styles.settingRow}>
                    <div className={styles.settingInfo}>
                      <span className={styles.settingLabel}>Two-Factor Authentication</span>
                      <span className={styles.settingDescription}>
                        Require 2FA verification when logging in.
                      </span>
                    </div>
                    <Toggle
                      checked={twoFactor}
                      onChange={(checked) => {
                        setTwoFactor(checked);
                        addToast(`Two-factor authentication ${checked ? 'enabled' : 'disabled'}`, 'info');
                      }}
                    />
                  </div>

                  <div className={styles.settingRow}>
                    <div className={styles.settingInfo}>
                      <span className={styles.settingLabel}>Authentication Provider</span>
                      <span className={styles.settingDescription}>Managed via WorkOS AuthKit Enterprise Single Sign-On.</span>
                    </div>
                    <Shield size={18} style={{ color: 'var(--status-success)' }} />
                  </div>
                </CardBody>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
