import { useState, type ReactNode } from 'react';
import styles from './tabs.module.css';

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  variant?: 'underline' | 'pill';
  compact?: boolean;
  className?: string;
}

export default function Tabs({
  tabs,
  defaultTab,
  activeTab: controlledActiveTab,
  onTabChange,
  variant = 'underline',
  compact = false,
  className = '',
}: TabsProps) {
  const [internalActiveTab, setInternalActiveTab] = useState(defaultTab ?? tabs[0]?.id ?? '');
  const activeTab = controlledActiveTab ?? internalActiveTab;

  const handleTabClick = (tabId: string) => {
    setInternalActiveTab(tabId);
    onTabChange?.(tabId);
  };

  const activeContent = tabs.find((t) => t.id === activeTab)?.content;

  const containerClasses = [
    styles.tabs,
    variant === 'pill' ? styles.pill : '',
    compact ? styles.compact : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      <div className={styles.tabList} role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
            onClick={() => handleTabClick(tab.id)}
          >
            {tab.icon && <span style={{ marginRight: '6px', display: 'inline-flex' }}>{tab.icon}</span>}
            {tab.label}
          </button>
        ))}
      </div>
      <div className={styles.tabContent} role="tabpanel">
        {activeContent}
      </div>
    </div>
  );
}
