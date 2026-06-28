'use client';
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

type UserData = {
  id: string;
  name: string;
  email: string;
  track: string;
  avatarUrl: string;
  isAdmin: boolean;
  streak: number;
  bio: string;
  position: string;
};

type UserContextType = {
  user: UserData | null;
  loading: boolean;
  setUser: (u: Partial<UserData>) => void;
  setAvatarUrl: (url: string) => void;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const CACHE_KEY = 'dm_user_cache';
const AVATAR_CACHE_KEY = 'dm_avatar_url';
const AVATAR_CACHE_EXPIRY = 'dm_avatar_expiry';

function readCache(): UserData | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writeCache(u: UserData) {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(u)); } catch {}
}

function readAvatarCache(): string {
  try {
    const expiry = sessionStorage.getItem(AVATAR_CACHE_EXPIRY);
    if (expiry && Date.now() > Number(expiry)) return '';
    return sessionStorage.getItem(AVATAR_CACHE_KEY) || '';
  } catch { return ''; }
}

function writeAvatarCache(url: string) {
  try {
    sessionStorage.setItem(AVATAR_CACHE_KEY, url);
    sessionStorage.setItem(AVATAR_CACHE_EXPIRY, String(Date.now() + 50 * 60 * 1000));
  } catch {}
}

const UserContext = createContext<UserContextType>({
  user: null, loading: true,
  setUser: () => {}, setAvatarUrl: () => {},
  signOut: async () => {}, refresh: async () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<UserData | null>(readCache);
  const [loading, setLoading] = useState(!readCache());

  const load = useCallback(async () => {
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { setLoading(false); return; }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, track, is_admin, streak, bio, position, avatar_url')
      .eq('id', authUser.id)
      .single();

    let avatarUrl = readAvatarCache();
    if (!avatarUrl && profile?.avatar_url) {
      const path = profile.avatar_url.split('/avatars/').pop() || profile.avatar_url;
      const { data: signed } = await supabase.storage.from('avatars').createSignedUrl(path, 3600);
      avatarUrl = signed?.signedUrl || '';
      if (avatarUrl) writeAvatarCache(avatarUrl);
    }

    const userData: UserData = {
      id: authUser.id,
      name: profile?.full_name || authUser.email || 'Student',
      email: authUser.email || '',
      track: profile?.track || 'AI',
      avatarUrl,
      isAdmin: !!profile?.is_admin,
      streak: profile?.streak || 0,
      bio: profile?.bio || '',
      position: profile?.position || '',
    };
    setUserState(userData);
    writeCache(userData);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const setUser = useCallback((partial: Partial<UserData>) => {
    setUserState(prev => {
      if (!prev) return prev;
      const next = { ...prev, ...partial };
      writeCache(next);
      return next;
    });
  }, []);

  const setAvatarUrl = useCallback((url: string) => {
    writeAvatarCache(url);
    setUser({ avatarUrl: url });
  }, [setUser]);

  const signOut = useCallback(async () => {
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    await supabase.auth.signOut();
    sessionStorage.removeItem(CACHE_KEY);
    sessionStorage.removeItem(AVATAR_CACHE_KEY);
    sessionStorage.removeItem(AVATAR_CACHE_EXPIRY);
    window.location.href = '/signin';
  }, []);

  return (
    <UserContext.Provider value={{ user, loading, setUser, setAvatarUrl, signOut, refresh: load }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
