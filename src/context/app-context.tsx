import { createContext, useContext, useReducer, type ReactNode, useCallback } from 'react';
import {
  type Document,
  type OutputFormat,
  type DocumentAnalysis,
  type TransformOutput,
  type ProcessingJob,
} from '../data/mock';

/* ── Types ──────────────────────────────────────────────── */

interface Settings {
  theme: 'dark' | 'light' | 'system';
  language: string;
  defaultOutputFormat: OutputFormat;
  displayName: string;
  email: string;
}

interface AppState {
  documents: Document[];
  activeDocument: Document | null;
  sidebarCollapsed: boolean;
  settings: Settings;
  commandPaletteOpen: boolean;
  analysisStore: Record<string, DocumentAnalysis>;
  transformStore: Record<string, TransformOutput>;
  jobs: ProcessingJob[];
}

type AppAction =
  | {
      type: 'ADD_DOCUMENT';
      payload: {
        document: Document;
        analysis?: DocumentAnalysis;
        transform?: TransformOutput;
        job?: ProcessingJob;
      };
    }
  | { type: 'SET_ACTIVE_DOCUMENT'; payload: Document | null }
  | { type: 'UPDATE_DOCUMENT_STATUS'; payload: { id: string; status: Document['status'] } }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_SIDEBAR_COLLAPSED'; payload: boolean }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<Settings> }
  | { type: 'TOGGLE_COMMAND_PALETTE' }
  | { type: 'SET_COMMAND_PALETTE'; payload: boolean };

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  addDocument: (
    doc: Document,
    analysis?: DocumentAnalysis,
    transform?: TransformOutput,
    job?: ProcessingJob
  ) => void;
  setActiveDocument: (doc: Document | null) => void;
  updateDocumentStatus: (id: string, status: Document['status']) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  updateSettings: (settings: Partial<Settings>) => void;
  toggleCommandPalette: () => void;
  setCommandPalette: (open: boolean) => void;
}

/* ── LocalStorage Persistence Helpers ───────────────────── */

const STORAGE_KEY = 'omniparse_app_state_v1';

function loadPersistedState(): Partial<AppState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        documents: parsed.documents || [],
        analysisStore: parsed.analysisStore || {},
        transformStore: parsed.transformStore || {},
        jobs: parsed.jobs || [],
        settings: parsed.settings || undefined,
      };
    }
  } catch (err) {
    console.warn('Failed to load persisted state from localStorage:', err);
  }
  return {};
}

function savePersistedState(state: AppState) {
  try {
    const dataToSave = {
      documents: state.documents,
      analysisStore: state.analysisStore,
      transformStore: state.transformStore,
      jobs: state.jobs,
      settings: state.settings,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  } catch (err) {
    console.warn('Failed to save state to localStorage:', err);
  }
}

/* ── Initial State ───────────────────────────────────────── */

const persisted = loadPersistedState();

const initialState: AppState = {
  documents: persisted.documents || [],
  activeDocument: persisted.documents && persisted.documents.length > 0 ? persisted.documents[0] : null,
  sidebarCollapsed: false,
  settings: persisted.settings || {
    theme: 'dark',
    language: 'English',
    defaultOutputFormat: 'markdown',
    displayName: 'User',
    email: 'user@omniparse.dev',
  },
  commandPaletteOpen: false,
  analysisStore: persisted.analysisStore || {},
  transformStore: persisted.transformStore || {},
  jobs: persisted.jobs || [],
};

function appReducer(state: AppState, action: AppAction): AppState {
  let nextState: AppState;

  switch (action.type) {
    case 'ADD_DOCUMENT': {
      const { document: doc, analysis, transform, job } = action.payload;
      const filteredDocs = state.documents.filter((d) => d.id !== doc.id && d.filename !== doc.filename);
      nextState = {
        ...state,
        documents: [doc, ...filteredDocs],
        activeDocument: doc,
        analysisStore: analysis ? { ...state.analysisStore, [doc.id]: analysis } : state.analysisStore,
        transformStore: transform ? { ...state.transformStore, [doc.id]: transform } : state.transformStore,
        jobs: job ? [job, ...state.jobs.filter((j) => j.id !== job.id)] : state.jobs,
      };
      break;
    }
    case 'SET_ACTIVE_DOCUMENT':
      nextState = { ...state, activeDocument: action.payload };
      break;
    case 'UPDATE_DOCUMENT_STATUS':
      nextState = {
        ...state,
        documents: state.documents.map((d) =>
          d.id === action.payload.id ? { ...d, status: action.payload.status } : d
        ),
      };
      break;
    case 'TOGGLE_SIDEBAR':
      nextState = { ...state, sidebarCollapsed: !state.sidebarCollapsed };
      break;
    case 'SET_SIDEBAR_COLLAPSED':
      nextState = { ...state, sidebarCollapsed: action.payload };
      break;
    case 'UPDATE_SETTINGS':
      nextState = { ...state, settings: { ...state.settings, ...action.payload } };
      break;
    case 'TOGGLE_COMMAND_PALETTE':
      nextState = { ...state, commandPaletteOpen: !state.commandPaletteOpen };
      break;
    case 'SET_COMMAND_PALETTE':
      nextState = { ...state, commandPaletteOpen: action.payload };
      break;
    default:
      return state;
  }

  savePersistedState(nextState);
  return nextState;
}

/* ── Context ────────────────────────────────────────────── */

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const addDocument = useCallback(
    (
      doc: Document,
      analysis?: DocumentAnalysis,
      transform?: TransformOutput,
      job?: ProcessingJob
    ) => {
      dispatch({ type: 'ADD_DOCUMENT', payload: { document: doc, analysis, transform, job } });
    },
    []
  );

  const setActiveDocument = useCallback((doc: Document | null) => {
    dispatch({ type: 'SET_ACTIVE_DOCUMENT', payload: doc });
  }, []);

  const updateDocumentStatus = useCallback((id: string, status: Document['status']) => {
    dispatch({ type: 'UPDATE_DOCUMENT_STATUS', payload: { id, status } });
  }, []);

  const toggleSidebar = useCallback(() => {
    dispatch({ type: 'TOGGLE_SIDEBAR' });
  }, []);

  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    dispatch({ type: 'SET_SIDEBAR_COLLAPSED', payload: collapsed });
  }, []);

  const updateSettings = useCallback((settings: Partial<Settings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
  }, []);

  const toggleCommandPalette = useCallback(() => {
    dispatch({ type: 'TOGGLE_COMMAND_PALETTE' });
  }, []);

  const setCommandPalette = useCallback((open: boolean) => {
    dispatch({ type: 'SET_COMMAND_PALETTE', payload: open });
  }, []);

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        addDocument,
        setActiveDocument,
        updateDocumentStatus,
        toggleSidebar,
        setSidebarCollapsed,
        updateSettings,
        toggleCommandPalette,
        setCommandPalette,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
