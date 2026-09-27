import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed: string;
  status: 'active' | 'revoked';
}

export interface User {
  id: string;
  name: string;
  email: string;
  apiKey: string;
  tier: string;
  monthlyUsage: number;
  monthlyLimit: number;
  keys: ApiKey[];
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  createApiKey: (name: string) => ApiKey;
  revokeApiKey: (id: string) => void;
  recordApiUsage: () => void;
}

function generateId(prefix: string = 'op_live_'): string {
  const chars = 'abcdef0123456789';
  let res = prefix;
  for (let i = 0; i < 24; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

const DEFAULT_DEV_KEY = 'op_live_9f8a3c1e2b4d5e6f7a8b9c0d';

const INITIAL_DEV_USER: User = {
  id: 'usr_dev_001',
  name: 'Developer',
  email: 'dev@omniparse.local',
  apiKey: DEFAULT_DEV_KEY,
  tier: 'Developer Free Tier',
  monthlyUsage: 0,
  monthlyLimit: 10000,
  keys: [
    {
      id: 'key_1',
      name: 'Default Key',
      key: DEFAULT_DEV_KEY,
      createdAt: new Date().toISOString(),
      lastUsed: 'Never',
      status: 'active',
    },
  ],
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('omniparse_current_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Clean out any old mock data
        if (parsed.keys && parsed.keys.length > 1 && parsed.keys[1]?.name === 'Mobile SDK Scanner') {
          parsed.keys = [parsed.keys[0]];
          parsed.monthlyUsage = 0;
          parsed.keys[0].createdAt = new Date().toISOString();
          parsed.keys[0].lastUsed = 'Never';
        }
        return parsed;
      }
    } catch {
      // fallback
    }
    return INITIAL_DEV_USER;
  });

  const [token, setToken] = useState<string | null>(
    localStorage.getItem('omniparse_token') || 'op_token_live'
  );
  const [loading, setLoading] = useState(false);

  // Sync current user to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('omniparse_current_user', JSON.stringify(user));
      localStorage.setItem('omniparse_api_key', user.apiKey);
    } else {
      localStorage.removeItem('omniparse_current_user');
      localStorage.removeItem('omniparse_api_key');
    }
  }, [user]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 400)); // Smooth UX transition

    try {
      // Check registered users in storage
      const usersRaw = localStorage.getItem('omniparse_registered_users');
      const users: Array<User & { password?: string }> = usersRaw ? JSON.parse(usersRaw) : [];

      const found = users.find(
        (u) => u.email.toLowerCase() === email.toLowerCase().trim()
      );

      if (found) {
        if (found.password && found.password !== password) {
          throw new Error('Incorrect password');
        }
        const userObj: User = {
          id: found.id,
          name: found.name,
          email: found.email,
          apiKey: found.apiKey,
          tier: found.tier || 'Developer Tier (Free)',
          monthlyUsage: found.monthlyUsage || 0,
          monthlyLimit: found.monthlyLimit || 10000,
          keys: found.keys || [],
        };
        setUser(userObj);
        setToken(`tok_${found.id}`);
        localStorage.setItem('omniparse_token', `tok_${found.id}`);
        return;
      }

      // Default demo login
      if (email.toLowerCase().includes('dev') || email.toLowerCase().includes('admin')) {
        setUser(INITIAL_DEV_USER);
        setToken('tok_dev');
        localStorage.setItem('omniparse_token', 'tok_dev');
        return;
      }

      // Automatically create the account on first login for seamless onboarding
      const newKey = generateId('op_live_');
      const newUser: User = {
        id: `usr_${Date.now()}`,
        name: email.split('@')[0],
        email: email.trim(),
        apiKey: newKey,
        tier: 'Developer Tier (Free)',
        monthlyUsage: 0,
        monthlyLimit: 10000,
        keys: [
          {
            id: `key_${Date.now()}`,
            name: 'Default Production Key',
            key: newKey,
            createdAt: new Date().toISOString(),
            lastUsed: 'Never',
            status: 'active',
          },
        ],
      };

      users.push({ ...newUser, password });
      localStorage.setItem('omniparse_registered_users', JSON.stringify(users));

      setUser(newUser);
      setToken(`tok_${newUser.id}`);
      localStorage.setItem('omniparse_token', `tok_${newUser.id}`);
    } finally {
      setLoading(false);
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 450));

    try {
      const usersRaw = localStorage.getItem('omniparse_registered_users');
      const users: Array<User & { password?: string }> = usersRaw ? JSON.parse(usersRaw) : [];

      const existing = users.find(
        (u) => u.email.toLowerCase() === email.toLowerCase().trim()
      );

      if (existing) {
        throw new Error('An account with this email already exists.');
      }

      const newKey = generateId('op_live_');
      const newUser: User = {
        id: `usr_${Date.now()}`,
        name: name.trim(),
        email: email.trim(),
        apiKey: newKey,
        tier: 'Developer Tier (Free)',
        monthlyUsage: 0,
        monthlyLimit: 10000,
        keys: [
          {
            id: `key_${Date.now()}`,
            name: 'Primary API Key',
            key: newKey,
            createdAt: new Date().toISOString(),
            lastUsed: 'Just now',
            status: 'active',
          },
        ],
      };

      users.push({ ...newUser, password });
      localStorage.setItem('omniparse_registered_users', JSON.stringify(users));

      setUser(newUser);
      setToken(`tok_${newUser.id}`);
      localStorage.setItem('omniparse_token', `tok_${newUser.id}`);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('omniparse_token');
    localStorage.removeItem('omniparse_current_user');
    setToken(null);
    setUser(null);
  };

  const createApiKey = (keyName: string): ApiKey => {
    if (!user) throw new Error('Not authenticated');

    const newKeyStr = generateId('op_live_');
    const newApiKey: ApiKey = {
      id: `key_${Date.now()}`,
      name: keyName.trim() || 'API Key',
      key: newKeyStr,
      createdAt: new Date().toISOString(),
      lastUsed: 'Never',
      status: 'active',
    };

    const updatedKeys = [newApiKey, ...(user.keys || [])];
    const updatedUser: User = {
      ...user,
      keys: updatedKeys,
    };

    setUser(updatedUser);

    // Sync to registered users in localStorage
    const usersRaw = localStorage.getItem('omniparse_registered_users');
    if (usersRaw) {
      const users: User[] = JSON.parse(usersRaw);
      const idx = users.findIndex((u) => u.id === user.id);
      if (idx !== -1) {
        users[idx].keys = updatedKeys;
        localStorage.setItem('omniparse_registered_users', JSON.stringify(users));
      }
    }

    return newApiKey;
  };

  const revokeApiKey = (keyId: string) => {
    if (!user) return;
    const updatedKeys = user.keys.map((k) =>
      k.id === keyId ? { ...k, status: 'revoked' as const } : k
    );
    const updatedUser: User = {
      ...user,
      keys: updatedKeys,
    };
    setUser(updatedUser);

    const usersRaw = localStorage.getItem('omniparse_registered_users');
    if (usersRaw) {
      const users: User[] = JSON.parse(usersRaw);
      const idx = users.findIndex((u) => u.id === user.id);
      if (idx !== -1) {
        users[idx].keys = updatedKeys;
        localStorage.setItem('omniparse_registered_users', JSON.stringify(users));
      }
    }
  };

  const recordApiUsage = (keyId?: string) => {
    if (!user) return;
    const updatedKeys = user.keys.map((k) => {
      if (keyId ? k.id === keyId : k.status === 'active') {
        return { ...k, lastUsed: 'Just now' };
      }
      return k;
    });

    const updatedUser = {
      ...user,
      monthlyUsage: (user.monthlyUsage || 0) + 1,
      keys: updatedKeys,
    };
    setUser(updatedUser);

    const usersRaw = localStorage.getItem('omniparse_registered_users');
    if (usersRaw) {
      const users: User[] = JSON.parse(usersRaw);
      const idx = users.findIndex((u) => u.id === user.id);
      if (idx !== -1) {
        users[idx].monthlyUsage = updatedUser.monthlyUsage;
        users[idx].keys = updatedKeys;
        localStorage.setItem('omniparse_registered_users', JSON.stringify(users));
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        signup,
        logout,
        createApiKey,
        revokeApiKey,
        recordApiUsage,
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