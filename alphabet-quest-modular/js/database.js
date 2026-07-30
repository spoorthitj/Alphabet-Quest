import { getSupabaseClient } from './supabase.js';

const STORAGE_KEY = 'alphabet_quest_user_progress';

function getClient() {
  return getSupabaseClient();
}

async function getUserId() {
  const client = getClient();
  if (!client) return null;
  try {
    const { data: { session } } = await client.auth.getSession();
    return session?.user?.id || null;
  } catch (error) {
    return null;
  }
}

function safeParse(value) {
  if (!value) return null;
  try { return JSON.parse(value); } catch { return null; }
}

export async function ensureProfile(user, fallbackName) {
  const client = getClient();
  if (!client || !user?.id) return null;

  const username = (fallbackName || user.email || 'Adventurer').trim();
  const { data, error } = await client.from('profiles').select('id').eq('user_id', user.id).maybeSingle();
  if (error) throw error;

  if (!data) {
    const { error: insertError } = await client.from('profiles').insert({
      user_id: user.id,
      username,
      email: user.email,
      created_at: new Date().toISOString()
    });
    if (insertError) throw insertError;
  }

  // Ensure initial user_progress row exists
  const { data: progData, error: progError } = await client.from('user_progress').select('id').eq('user_id', user.id).maybeSingle();
  if (!progError && !progData) {
    await client.from('user_progress').insert({
      user_id: user.id,
      score: 0,
      best_score: 0,
      coins: 0,
      streak: 0,
      highest_streak: 0,
      games_played: 0,
      selected_difficulty: 'medium',
      selected_theme: 'light',
      sound_settings: true,
      completed_levels: [],
      achievements: [],
      statistics: {},
      saved_preferences: {},
      updated_at: new Date().toISOString()
    });
  }

  return { id: user.id };
}

export async function loadUserProgress() {
  const client = getClient();
  if (!client) return null;

  const userId = await getUserId();
  if (!userId) return null;

  const [progressRes, achievementsRes, statsRes] = await Promise.all([
    client.from('user_progress').select('*').eq('user_id', userId).maybeSingle(),
    client.from('achievements').select('*').eq('user_id', userId).maybeSingle(),
    client.from('game_statistics').select('*').eq('user_id', userId).maybeSingle()
  ]);

  if (progressRes.error) throw progressRes.error;
  if (achievementsRes.error) throw achievementsRes.error;
  if (statsRes.error) throw statsRes.error;

  let progressData = progressRes.data;
  if (!progressData) {
    const defaultProgress = {
      user_id: userId,
      score: 0,
      best_score: 0,
      coins: 0,
      streak: 0,
      highest_streak: 0,
      games_played: 0,
      selected_difficulty: 'medium',
      selected_theme: 'light',
      sound_settings: true,
      completed_levels: [],
      achievements: [],
      statistics: {},
      saved_preferences: {},
      updated_at: new Date().toISOString()
    };
    const { data: inserted, error: insertErr } = await client.from('user_progress').insert(defaultProgress).select('*').maybeSingle();
    if (!insertErr && inserted) {
      progressData = inserted;
    } else {
      progressData = defaultProgress;
    }
  }

  return {
    progress: progressData,
    achievements: achievementsRes.data || null,
    stats: statsRes.data || null
  };
}

export async function saveUserProgress(payload) {
  const client = getClient();
  if (!client) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return { savedLocally: true };
  }

  const userId = await getUserId();
  if (!userId) return { savedLocally: false };

  const progressPayload = {
    user_id: userId,
    score: payload.score ?? 0,
    best_score: payload.best ?? 0,
    coins: payload.coins ?? 0,
    streak: payload.streak ?? 0,
    highest_streak: payload.highestStreak ?? 0,
    games_played: payload.gamesPlayed ?? 0,
    selected_difficulty: payload.difficulty ?? 'medium',
    selected_theme: payload.theme ?? 'light',
    sound_settings: payload.sound ?? true,
    completed_levels: payload.completedLevels ?? [],
    achievements: payload.achievements ?? [],
    statistics: payload.statistics ?? {},
    saved_preferences: payload.preferences ?? {},
    updated_at: new Date().toISOString()
  };

  const { error } = await client.from('user_progress').upsert(progressPayload, { onConflict: 'user_id' });
  if (error) throw error;

  return { savedLocally: false };
}

export async function saveUserAchievements(achievements) {
  const client = getClient();
  if (!client) return { savedLocally: true };

  const userId = await getUserId();
  if (!userId) return { savedLocally: false };

  const { error } = await client.from('achievements').upsert({
    user_id: userId,
    unlocked_ids: achievements,
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id' });

  if (error) throw error;
  return { savedLocally: false };
}

export async function saveUserStatistics(statistics) {
  const client = getClient();
  if (!client) return { savedLocally: true };

  const userId = await getUserId();
  if (!userId) return { savedLocally: false };

  const { error } = await client.from('game_statistics').upsert({
    user_id: userId,
    stats: statistics,
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id' });

  if (error) throw error;
  return { savedLocally: false };
}

export function loadLocalProgress() {
  return safeParse(localStorage.getItem(STORAGE_KEY));
}

export function clearLocalProgress() {
  localStorage.removeItem(STORAGE_KEY);
}

