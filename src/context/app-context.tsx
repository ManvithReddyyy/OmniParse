import {
  createContext,
  useContext,
  useReducer,
  useState,
  useEffect,
  type ReactNode,
  useCallback,
} from 'react';
import {
  type Document,
  type OutputFormat,
  type DocumentAnalysis,
  type TransformOutput,
  type ProcessingJob,
} from '../data/mock';
import { useAuth } from './auth-context';
import {
  fetchUserDocumentsFromCloud,
  deleteDocumentFromCloud,
} from '../lib/documents';

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
  | {
      type: 'SET_CLOUD_DOCUMENTS';
      payload: {
        documents: Document[];
        analysisStore: Record<string, DocumentAnalysis>;
        transformStore: Record<string, TransformOutput>;
        jobs: ProcessingJob[];
      };
    }
  | { type: 'REMOVE_DOCUMENT'; payload: { id: string } }
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
  isSyncing: boolean;
  addDocument: (
    doc: Document,
    analysis?: DocumentAnalysis,
    transform?: TransformOutput,
    job?: ProcessingJob
  ) => void;
  deleteDocument: (id: string) => Promise<boolean>;
  refreshCloudDocuments: () => Promise<void>;
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
    // Strip heavy base64 payloads to stay safely within localStorage 5MB quota
    const sanitizedAnalysisStore: Record<string, Partial<DocumentAnalysis>> = {};
    for (const [key, analysis] of Object.entries(state.analysisStore)) {
      sanitizedAnalysisStore[key] = {
        documentId: analysis.documentId,
        metadata: analysis.metadata,
        textBlocks: analysis.textBlocks,
        layoutRegions: analysis.layoutRegions,
        tables: analysis.tables,
        readingOrder: analysis.readingOrder,
        pageImages: [],
        images: (analysis.images || []).map((img) => ({
          ...img,
          url: img.url && img.url.length > 500 ? '' : img.url,
        })),
      };
    }

    const dataToSave = {
      documents: state.documents.slice(0, 30),
      analysisStore: sanitizedAnalysisStore,
      transformStore: state.transformStore,
      jobs: state.jobs.slice(0, 30),
      settings: state.settings,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  } catch (err) {
    console.warn('LocalStorage save bypassed (quota or privacy):', err);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ settings: state.settings }));
    } catch {
      // Ignore
    }
  }
}

/* ── Initial State ───────────────────────────────────────── */

const persisted = loadPersistedState();

const initialState: AppState = {
  documents: persisted.documents || [],
  activeDocument: persisted.documents && persisted.documents.length > 0 ? persisted.documents[0] : null,
  sidebarCollapsed: false,
  settings: persisted.settings || {
    theme: 'light',
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
    case 'SET_CLOUD_DOCUMENTS': {
      const { documents, analysisStore, transformStore, jobs } = action.payload;
      const existingIds = new Set(documents.map((d) => d.id));
      const localOnly = state.documents.filter((d) => !existingIds.has(d.id));
      const mergedDocs = [...documents, ...localOnly];
      nextState = {
        ...state,
        documents: mergedDocs,
        activeDocument: state.activeDocument || mergedDocs[0] || null,
        analysisStore: { ...state.analysisStore, ...analysisStore },
        transformStore: { ...state.transformStore, ...transformStore },
        jobs: [...jobs, ...state.jobs.filter((j) => !existingIds.has(j.documentId))],
      };
      break;
    }
    case 'REMOVE_DOCUMENT': {
      const docId = action.payload.id;
      const remainingDocs = state.documents.filter((d) => d.id !== docId);
      const nextActive = state.activeDocument?.id === docId ? remainingDocs[0] || null : state.activeDocument;
      nextState = {
        ...state,
        documents: remainingDocs,
        activeDocument: nextActive,
        jobs: state.jobs.filter((j) => j.documentId !== docId),
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
  const { session } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);

  // Sync documents from Supabase when user has an active session
  const refreshCloudDocuments = useCallback(async () => {
    if (!session?.user?.id) return;
    setIsSyncing(true);
    try {
      const cloudData = await fetchUserDocumentsFromCloud(session.user.id);
      if (cloudData.documents.length > 0) {
        dispatch({ type: 'SET_CLOUD_DOCUMENTS', payload: cloudData });
      }
    } finally {
      setIsSyncing(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    refreshCloudDocuments();
  }, [refreshCloudDocuments]);

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

  const deleteDocument = useCallback(
    async (id: string): Promise<boolean> => {
      dispatch({ type: 'REMOVE_DOCUMENT', payload: { id } });
      if (session?.user?.id) {
        return await deleteDocumentFromCloud(id, session.user.id);
      }
      return true;
    },
    [session?.user?.id]
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
        isSyncing,
        addDocument,
        deleteDocument,
        refreshCloudDocuments,
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
