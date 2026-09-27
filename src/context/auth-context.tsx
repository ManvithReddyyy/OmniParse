import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

// ── Types ──────────────────────────────────────────────

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  key_prefix: string;
  status: 'active' | 'revoked' | 'expired';
  scopes: string[];
  last_used_at: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  role: 'super_admin' | 'admin' | 'member' | 'viewer';
  tier: 'free' | 'starter' | 'pro' | 'enterprise';
  monthly_limit: number;
  monthly_usage: number;
}

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: Profile['role'];
  tier: Profile['tier'];
  monthlyUsage: number;
  monthlyLimit: number;
  keys: ApiKey[];
  apiKey: string; // primary key for quick access
}

interface AuthContextType {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
  token: string;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  loginAsDev: () => void;
  logout: () => Promise<void>;
  createApiKey: (name: string) => Promise<ApiKey>;
  revokeApiKey: (id: string) => Promise<void>;
  recordApiUsage: (keyId?: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

// ── Helpers ────────────────────────────────────────────

function generateApiKey(): string {
  const chars = 'abcdef0123456789';
  let key = 'op_live_';
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

const DEV_USER: AppUser = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'admin@omniparse.local',
  name: 'OmniParse Admin (Dev)',
  role: 'super_admin',
  tier: 'enterprise',
  monthlyUsage: 18,
  monthlyLimit: 100000,
  keys: [
    {
      id: 'key-dev-admin-master',
      name: 'Master Production Key',
      key: 'op_live_f893e1a0b92c478df88310bc931',
      key_prefix: 'op_live_f893',
      status: 'active',
      scopes: ['read', 'write', 'admin'],
      last_used_at: new Date().toISOString(),
      created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
    {
      id: 'key-dev-read-only',
      name: 'ReadOnly Analytics',
      key: 'op_live_a1b2c3d4e5f67890abcdef12345',
      key_prefix: 'op_live_a1b2',
      status: 'active',
      scopes: ['read'],
      last_used_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      created_at: new Date(Date.now() - 86400000 * 20).toISOString(),
    },
  ],
  apiKey: 'op_live_f893e1a0b92c478df88310bc931',
};

// ── Context ────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Build AppUser from Supabase user + profile + keys
  const buildAppUser = useCallback(async (supabaseUser: SupabaseUser): Promise<AppUser | null> => {
    try {
      // Fetch profile safely using maybeSingle
      let { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .maybeSingle();

      // If profile does not exist yet (e.g. trigger delay), insert default
      if (!profile) {
        const { data: newProfile } = await supabase
          .from('profiles')
          .insert({
            id: supabaseUser.id,
            display_name: supabaseUser.user_metadata?.display_name || supabaseUser.email?.split('@')[0] || 'User',
            role: 'super_admin', // First registered user default
            tier: 'enterprise',
          })
          .select()
          .maybeSingle();
        profile = newProfile;
      }

      // Fetch API keys
      const { data: keys } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', supabaseUser.id)
        .order('created_at', { ascending: false });

      const apiKeys: ApiKey[] = (keys || []).map((k: any) => ({
        id: k.id,
        name: k.name,
        key: k.key_hash,
        key_prefix: k.key_prefix,
        status: k.status,
        scopes: k.scopes || ['read', 'write'],
        last_used_at: k.last_used_at,
        created_at: k.created_at,
      }));

      // If user has no API keys yet, create a default one
      if (apiKeys.length === 0) {
        const rawKey = generateApiKey();
        const keyPrefix = rawKey.substring(0, 12);
        const { data: createdKey } = await supabase
          .from('api_keys')
          .insert({
            user_id: supabaseUser.id,
            name: 'Default Production Key',
            key_prefix: keyPrefix,
            key_hash: rawKey,
            scopes: ['read', 'write'],
            status: 'active',
          })
          .select()
          .maybeSingle();

        if (createdKey) {
          apiKeys.push({
            id: createdKey.id,
            name: createdKey.name,
            key: rawKey,
            key_prefix: keyPrefix,
            status: 'active',
            scopes: createdKey.scopes || ['read', 'write'],
            last_used_at: null,
            created_at: createdKey.created_at,
          });
        }
      }

      const primaryKey = apiKeys.find(k => k.status === 'active');

      return {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: profile?.display_name || supabaseUser.email?.split('@')[0] || 'User',
        role: profile?.role || 'super_admin',
        tier: profile?.tier || 'enterprise',
        monthlyUsage: profile?.monthly_usage || 0,
        monthlyLimit: profile?.monthly_limit || 10000,
        keys: apiKeys,
        apiKey: primaryKey?.key || '',
      };
    } catch (err) {
      console.error('Failed to build user profile:', err);
      return null;
    }
  }, []);

  // Refresh user data from database
  const refreshUser = useCallback(async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (currentSession?.user) {
      const appUser = await buildAppUser(currentSession.user);
      setUser(appUser);
    }
  }, [buildAppUser]);

  // Listen for auth state changes
  useEffect(() => {
    let mounted = true;

    // Check dev bypass first
    const isDevMode = localStorage.getItem('omniparse_dev_mode') === 'true';

    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!mounted) return;
      setSession(initialSession);
      if (initialSession?.user) {
        const appUser = await buildAppUser(initialSession.user);
        if (mounted) setUser(appUser);
      } else if (isDevMode) {
        if (mounted) setUser(DEV_USER);
      }
      if (mounted) setLoading(false);
    }).catch(() => {
      if (mounted) {
        if (isDevMode) setUser(DEV_USER);
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        if (event === 'SIGNED_IN' && newSession?.user) {
          localStorage.removeItem('omniparse_dev_mode');
          const appUser = await buildAppUser(newSession.user);
          if (mounted) setUser(appUser);
        } else if (event === 'SIGNED_OUT') {
          if (localStorage.getItem('omniparse_dev_mode') === 'true') {
            if (mounted) setUser(DEV_USER);
          } else {
            if (mounted) setUser(null);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [buildAppUser]);

  // ── Auth Actions ───────────────────────────────────

  const login = async (email: string, password: string) => {
    localStorage.removeItem('omniparse_dev_mode');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw new Error(error.message);
    if (data.user) {
      const appUser = await buildAppUser(data.user);
      setUser(appUser);
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    localStorage.removeItem('omniparse_dev_mode');
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { display_name: name.trim() },
      },
    });
    if (error) throw new Error(error.message);
    if (data.user) {
      const appUser = await buildAppUser(data.user);
      setUser(appUser);
    }
  };

  const loginAsDev = () => {
    localStorage.setItem('omniparse_dev_mode', 'true');
    setUser(DEV_USER);
  };

  const logout = async () => {
    localStorage.removeItem('omniparse_dev_mode');
    await supabase.auth.signOut().catch(() => {});
    setUser(null);
    setSession(null);
  };

  // ── API Key Management ─────────────────────────────

  const createApiKey = async (name: string): Promise<ApiKey> => {
    if (!user) throw new Error('Not authenticated');

    const rawKey = generateApiKey();
    const keyPrefix = rawKey.substring(0, 12);
    const newKeyId = 'key_' + Math.random().toString(36).substring(2, 10);
    const now = new Date().toISOString();

    if (session?.user) {
      const { data, error } = await supabase
        .from('api_keys')
        .insert({
          user_id: session.user.id,
          name: name.trim(),
          key_prefix: keyPrefix,
          key_hash: rawKey,
          scopes: ['read', 'write'],
          status: 'active',
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      const newKey: ApiKey = {
        id: data.id,
        name: data.name,
        key: rawKey,
        key_prefix: keyPrefix,
        status: 'active',
        scopes: ['read', 'write'],
        last_used_at: null,
        created_at: data.created_at,
      };

      setUser(prev => prev ? {
        ...prev,
        keys: [newKey, ...prev.keys],
        apiKey: prev.apiKey || rawKey,
      } : null);

      return newKey;
    }

    // Dev mode key creation
    const newKey: ApiKey = {
      id: newKeyId,
      name: name.trim(),
      key: rawKey,
      key_prefix: keyPrefix,
      status: 'active',
      scopes: ['read', 'write'],
      last_used_at: null,
      created_at: now,
    };

    setUser(prev => prev ? {
      ...prev,
      keys: [newKey, ...prev.keys],
      apiKey: prev.apiKey || rawKey,
    } : null);

    return newKey;
  };

  const revokeApiKey = async (id: string) => {
    if (!user) return;

    if (session?.user) {
      const { error } = await supabase
        .from('api_keys')
        .update({ status: 'revoked' })
        .eq('id', id)
        .eq('user_id', session.user.id);

      if (error) throw new Error(error.message);
    }

    setUser(prev => {
      if (!prev) return null;
      const updatedKeys = prev.keys.map(k =>
        k.id === id ? { ...k, status: 'revoked' as const } : k
      );
      const activeKey = updatedKeys.find(k => k.status === 'active');
      return { ...prev, keys: updatedKeys, apiKey: activeKey?.key || '' };
    });
  };

  const recordApiUsage = async (keyId?: string) => {
    if (!user) return;

    if (session?.user) {
      try {
        await supabase.from('usage_logs').insert({
          user_id: session.user.id,
          api_key_id: keyId || null,
          endpoint: '/v1/extract',
          method: 'POST',
          status_code: 200,
        });

        if (keyId) {
          await supabase
            .from('api_keys')
            .update({ last_used_at: new Date().toISOString() })
            .eq('id', keyId);
        }

        try {
          await supabase.rpc('increment_usage', { user_uuid: session.user.id });
        } catch {
          await supabase
            .from('profiles')
            .update({ monthly_usage: (user.monthlyUsage || 0) + 1 })
            .eq('id', session.user.id);
        }
      } catch (err) {
        console.warn('Could not record usage in Supabase:', err);
      }
    }

    // Update local state
    setUser(prev => prev ? { ...prev, monthlyUsage: prev.monthlyUsage + 1 } : null);
  };

  const token = session?.access_token || user?.apiKey || '';

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        token,
        login,
        signup,
        loginAsDev,
        logout,
        createApiKey,
        revokeApiKey,
        recordApiUsage,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}