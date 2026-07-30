const SESSION_KEY = 'aq_session';

export function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

export function writeSession(user, profile) {
  const session = {
    userId: user?.id || null,
    name: profile?.username || user?.email || 'Adventurer',
    email: user?.email || null,
    ts: Date.now()
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
