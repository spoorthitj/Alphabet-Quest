import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const DEFAULT_URL = 'https://gccgrqaissxytmnqyzyp.supabase.co';
const DEFAULT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjY2dycWFpc3N4eXRtbnF5enlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxMjk0OTIsImV4cCI6MjEwMDcwNTQ5Mn0.xAjXPuQJKqpJq83Kca-MV7Z4VUO7aq3ykXMvIrePeG4';

function getConfiguredSupabase() {
  const fromWindow = window?.__SUPABASE_CONFIG__ || {};
  const url = fromWindow.url || DEFAULT_URL;
  const anonKey = fromWindow.anonKey || DEFAULT_ANON_KEY;
  const hasRealConfig = Boolean(url && anonKey && !url.includes('example.supabase.co'));

  return { url, anonKey, hasRealConfig };
}

let client = null;
let status = { enabled: false, reason: 'Supabase is not configured yet.' };

function resolveCreateClient() {
  if (typeof createSupabaseClient === 'function') return createSupabaseClient;
  if (window?.supabase?.createClient) return window.supabase.createClient;
  return null;
}

export function getSupabaseConfig() {
  return getConfiguredSupabase();
}

export function getSupabaseStatus() {
  return status;
}

export function isSupabaseConfigured() {
  return Boolean(getSupabaseClient());
}

export function getSupabaseClient() {
  if (client) return client;

  const { url, anonKey, hasRealConfig } = getConfiguredSupabase();
  if (!hasRealConfig) {
    status = { enabled: false, reason: 'Set a real Supabase project URL and anon key in window.__SUPABASE_CONFIG__ to enable cloud sync.' };
    return null;
  }

  const createFn = resolveCreateClient();
  if (!createFn) {
    status = { enabled: false, reason: 'Supabase SDK createClient function unavailable.' };
    return null;
  }

  try {
    client = createFn(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    status = { enabled: true, reason: 'Supabase client ready.' };
    return client;
  } catch (error) {
    status = { enabled: false, reason: error.message };
    return null;
  }
}

export const supabase = getSupabaseClient();

