import { getSupabaseClient, getSupabaseStatus } from './supabase.js';
import { ensureProfile, loadUserProgress, saveUserProgress, saveUserAchievements, saveUserStatistics, clearLocalProgress } from './database.js';
import { writeSession, clearSession } from './session.js';

function getClient() {
  return getSupabaseClient();
}

export async function initializeAuth({ onSessionReady, onError } = {}) {
  const client = getClient();
  if (!client) {
    const status = getSupabaseStatus();
    onError?.(status.reason || 'Supabase unavailable.');
    return { ready: false, status };
  }

  // Listen for auth state changes to keep session in sync
  client.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
      writeSession(session.user, { username: session.user.email?.split('@')[0] || 'Adventurer' });
    } else {
      clearSession();
    }
  });

  // getSession() only reads whatever was last cached in this browser's
  // storage - it does NOT prove the token is still valid. Relying on it
  // alone is exactly how a stale/expired/tampered session can make the
  // app *look* logged in when it isn't.
  const { data: { session }, error } = await client.auth.getSession();
  if (error) {
    clearSession();
    onError?.(error.message);
    return { ready: false, error };
  }

  if (!session?.user) {
    // No cached session at all - definitely logged out.
    clearSession();
    return { ready: false, session: null };
  }

  // Revalidate against the Supabase Auth server. getUser() makes a real
  // network request and confirms the access token is still valid (not
  // expired, not revoked, not forged). Never treat getSession()'s cached
  // result as "authenticated" on its own.
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) {
    // The cached session was stale/invalid - clear it and force login.
    clearSession();
    onError?.(userError?.message || 'Your session has expired. Please log in again.');
    return { ready: false, error: userError };
  }

  await ensureProfile(user, user.email || 'Adventurer');
  writeSession(user, { username: user.email?.split('@')[0] || 'Adventurer' });
  await onSessionReady?.(user);
  return { ready: true, user, session };
}

export async function signInWithEmail(email, password, { onSuccess, onError } = {}) {
  const client = getClient();
  if (!client) {
    onError?.('Supabase is not configured.');
    return null;
  }

  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    onError?.(error.message);
    return null;
  }

  if (data.user) {
    await ensureProfile(data.user, data.user.email || 'Adventurer');
    writeSession(data.user, { username: data.user.email?.split('@')[0] || 'Adventurer' });
    await onSuccess?.(data.user);
  }
  return data.user;
}

export async function signUpWithEmail(email, password, username, { onSuccess, onError } = {}) {
  const client = getClient();
  if (!client) {
    onError?.('Supabase is not configured.');
    return null;
  }

  const { data, error } = await client.auth.signUp({ email, password });
  if (error) {
    onError?.(error.message);
    return null;
  }

  const user = data.user;
  if (user) {
    await ensureProfile(user, username || email);
    writeSession(user, { username: username || email });
    await onSuccess?.(user);
  }

  return user;
}

export async function signOut({ onComplete } = {}) {
  const client = getClient();
  if (client) {
    try {
      await client.auth.signOut();
    } catch (e) {
      console.warn('SignOut error:', e);
    }
  }
  clearSession();
  clearLocalProgress();
  onComplete?.();
}

export async function syncGameProgress(state) {
  const payload = {
    score: state.score,
    best: state.best,
    coins: state.coins ?? 0,
    streak: state.streak ?? 0,
    highestStreak: state.highestStreak ?? 0,
    gamesPlayed: state.gamesPlayed ?? 0,
    difficulty: state.difficulty,
    theme: state.theme,
    sound: state.sound,
    completedLevels: Array.from(state.completedLevels || []),
    achievements: Array.from(state.achievements || []),
    statistics: state.statistics || {},
    preferences: state.preferences || {}
  };

  await saveUserProgress(payload);
  await saveUserAchievements(Array.from(state.achievements || []));
  await saveUserStatistics(state.statistics || {});
}

export async function loadPersistedGameData(state) {
  const data = await loadUserProgress();
  if (!data) return false;

  if (data.progress) {
    const progress = data.progress;
    state.score = Number(progress.score || 0);
    state.best = Number(progress.best_score || 0);
    state.coins = Number(progress.coins || 0);
    state.streak = Number(progress.streak || 0);
    state.highestStreak = Number(progress.highest_streak || 0);
    state.gamesPlayed = Number(progress.games_played || 0);
    state.difficulty = progress.selected_difficulty || state.difficulty;
    state.theme = progress.selected_theme || state.theme;
    state.sound = progress.sound_settings ?? state.sound;
    state.completedLevels = new Set(progress.completed_levels || []);
    state.achievements = new Set(progress.achievements || []);
    state.statistics = progress.statistics || {};
    state.preferences = progress.saved_preferences || {};
  }

  if (data.achievements?.unlocked_ids) {
    state.achievements = new Set(data.achievements.unlocked_ids);
  }

  if (data.stats?.stats) {
    state.statistics = data.stats.stats;
  }

  return true;
}
