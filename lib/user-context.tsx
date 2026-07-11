'use client';
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export type TrackData = { label: string; color: string; glow: string };
export type TracksMap = Record<string, TrackData>;

export const FALLBACK_TRACKS: TracksMap = {
  AI: { label: 'Artificial Intelligence', color: '#D59C10', glow: 'rgba(213,156,16,0.15)' },
  DA: { label: 'Data Analytics',          color: '#4E8FD4', glow: 'rgba(78,143,212,0.15)' },
  SE: { label: 'Software Engineering',    color: '#4CAF7D', glow: 'rgba(76,175,125,0.15)' },
  DO: { label: 'Data Operations',         color: '#9B6FD4', glow: 'rgba(155,111,212,0.15)' },
};

function hexToGlow(hex: string): string {
  try {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},0.15)`;
  } catch { return 'rgba(107,114,128,0.15)'; }
}

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
  tracks: TracksMap;
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
  user: null, loading: true, tracks: FALLBACK_TRACKS,
  setUser: () => {}, setAvatarUrl: () => {},
  signOut: async () => {}, refresh: async () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<UserData | null>(readCache);
  const [loading, setLoading] = useState(!readCache());
  const [tracks, setTracks] = useState<TracksMap>(FALLBACK_TRACKS);

  const load = useCallback(async () => {
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();

    const { data: tracksData } = await supabase.from('tracks').select('code, label, color');
    if (tracksData && tracksData.length > 0) {
      const map: TracksMap = {};
      for (const t of tracksData) {
        map[t.code] = { label: t.label, color: t.color, glow: hexToGlow(t.color) };
      }
      setTracks(map);
    }

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
    <UserContext.Provider value={{ user, loading, tracks, setUser, setAvatarUrl, signOut, refresh: load }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}

export async function updateStreak(userId: string): Promise<number> {
  const { createClient } = await import('@/lib/supabase');
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data: profile } = await supabase
    .from('profiles')
    .select('streak, last_active_date')
    .eq('id', userId)
    .single();
  if (!profile) return 0;
  const lastActive = profile.last_active_date as string | null;
  if (lastActive === today) return profile.streak as number || 0;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const newStreak = lastActive === yesterday ? (profile.streak as number || 0) + 1 : 1;
  await supabase.from('profiles').update({ streak: newStreak, last_active_date: today }).eq('id', userId);
  return newStreak;
}
