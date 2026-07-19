import { createContext, useContext, useReducer, type ReactNode, useCallback } from 'react';
import { mockDocuments, type Document, type OutputFormat } from '../data/mock';

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
}

type AppAction =
  | { type: 'ADD_DOCUMENT'; payload: Document }
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
  addDocument: (doc: Document) => void;
  setActiveDocument: (doc: Document | null) => void;
  updateDocumentStatus: (id: string, status: Document['status']) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  updateSettings: (settings: Partial<Settings>) => void;
  toggleCommandPalette: () => void;
  setCommandPalette: (open: boolean) => void;
}


/* ── Reducer ────────────────────────────────────────────── */

const initialState: AppState = {
  documents: mockDocuments,
  activeDocument: null,
  sidebarCollapsed: false,
  settings: {
    theme: 'dark',
    language: 'English',
    defaultOutputFormat: 'markdown',
    displayName: 'Manvith',
    email: 'manvith@omniparse.dev',
  },
  commandPaletteOpen: false,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ADD_DOCUMENT':
      return { ...state, documents: [action.payload, ...state.documents] };
    case 'SET_ACTIVE_DOCUMENT':
      return { ...state, activeDocument: action.payload };
    case 'UPDATE_DOCUMENT_STATUS':
      return {
        ...state,
        documents: state.documents.map((d) =>
          d.id === action.payload.id ? { ...d, status: action.payload.status } : d
        ),
      };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };
    case 'SET_SIDEBAR_COLLAPSED':
      return { ...state, sidebarCollapsed: action.payload };
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'TOGGLE_COMMAND_PALETTE':
      return { ...state, commandPaletteOpen: !state.commandPaletteOpen };
    case 'SET_COMMAND_PALETTE':
      return { ...state, commandPaletteOpen: action.payload };
    default:
      return state;
  }
}


/* ── Context ────────────────────────────────────────────── */

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const addDocument = useCallback((doc: Document) => {
    dispatch({ type: 'ADD_DOCUMENT', payload: doc });
  }, []);

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
