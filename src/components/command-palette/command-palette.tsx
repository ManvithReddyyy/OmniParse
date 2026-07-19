import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  LayoutDashboard,
  ArrowRightLeft,
  Settings,
  FileText,
  Upload,
} from 'lucide-react';
import { useApp } from '../../context/app-context';
import styles from './command-palette.module.css';

interface CommandItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  section: string;
  action: () => void;
  shortcut?: string;
}

export default function CommandPalette() {
  const { state, setCommandPalette } = useApp();
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const close = useCallback(() => {
    setCommandPalette(false);
    setQuery('');
    setHighlightedIndex(0);
  }, [setCommandPalette]);

  const commands: CommandItem[] = [
    {
      id: 'dashboard',
      label: 'Go to Dashboard',
      icon: <LayoutDashboard size={16} />,
      section: 'Pages',
      action: () => { navigate('/'); close(); },
    },
    {
      id: 'analyze',
      label: 'Go to Analyze',
      icon: <Search size={16} />,
      section: 'Pages',
      action: () => { navigate('/analyze'); close(); },
    },
    {
      id: 'transform',
      label: 'Go to Transform',
      icon: <ArrowRightLeft size={16} />,
      section: 'Pages',
      action: () => { navigate('/transform'); close(); },
    },
    {
      id: 'settings',
      label: 'Go to Settings',
      icon: <Settings size={16} />,
      section: 'Pages',
      action: () => { navigate('/settings'); close(); },
    },
    {
      id: 'upload',
      label: 'Upload Document',
      icon: <Upload size={16} />,
      section: 'Actions',
      action: () => { navigate('/analyze'); close(); },
    },
    ...state.documents.slice(0, 5).map((doc) => ({
      id: doc.id,
      label: doc.filename,
      icon: <FileText size={16} />,
      section: 'Recent Documents',
      action: () => { navigate(`/analyze?doc=${doc.id}`); close(); },
    })),
  ];

  const filtered = query.trim()
    ? commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()))
    : commands;

  const sections = Array.from(new Set(filtered.map((c) => c.section)));

  // Keyboard handler
  useEffect(() => {
    if (!state.commandPaletteOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        filtered[highlightedIndex]?.action();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [state.commandPaletteOpen, close, filtered, highlightedIndex]);

  // Global Ctrl+K
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPalette(!state.commandPaletteOpen);
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [state.commandPaletteOpen, setCommandPalette]);

  // Auto-focus input
  useEffect(() => {
    if (state.commandPaletteOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [state.commandPaletteOpen]);

  // Reset highlight on query change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [query]);

  if (!state.commandPaletteOpen) return null;

  let itemIndex = -1;

  return (
    <div className={styles.overlay} onClick={close}>
      <div className={styles.palette} onClick={(e) => e.stopPropagation()}>
        <div className={styles.inputWrapper}>
          <Search size={16} />
          <input
            ref={inputRef}
            className={styles.input}
            placeholder="Type a command or search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className={styles.results}>
          {filtered.length === 0 ? (
            <div className={styles.empty}>No results found.</div>
          ) : (
            sections.map((section) => (
              <div key={section}>
                <div className={styles.section}>{section}</div>
                {filtered
                  .filter((c) => c.section === section)
                  .map((cmd) => {
                    itemIndex++;
                    const currentIndex = itemIndex;

                    return (
                      <button
                        key={cmd.id}
                        className={`${styles.item} ${currentIndex === highlightedIndex ? styles.itemHighlighted : ''}`}
                        onClick={cmd.action}
                        onMouseEnter={() => setHighlightedIndex(currentIndex)}
                      >
                        <span className={styles.itemIcon}>{cmd.icon}</span>
                        <span>{cmd.label}</span>
                        {cmd.shortcut && <span className={styles.itemShortcut}>{cmd.shortcut}</span>}
                      </button>
                    );
                  })}
              </div>
            ))
          )}
        </div>

        <div className={styles.footer}>
          <div className={styles.footerKeys}>
            <span className={styles.footerKey}><kbd>↑↓</kbd> navigate</span>
            <span className={styles.footerKey}><kbd>↵</kbd> select</span>
            <span className={styles.footerKey}><kbd>esc</kbd> close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
