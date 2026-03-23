// Session interfaces
export interface Session {
  id: string;
  createdAt: number;
  lastAccessedAt: number;
  useCase: 'support' | 'sales' | 'education' | 'healthcare';
  conversationHistory: Message[];
  metadata: {
    totalMessages: number;
    totalTokens: number;
  };
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: {
    tokensUsed?: number;
    processingTime?: number;
    error?: string;
  };
}

const SESSION_KEY = 'ai_avatar_session';
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Initialize a new session
 */
export function initializeSession(useCase: 'support' | 'sales' | 'education' | 'healthcare' = 'support'): Session {
  const now = Date.now();
  return {
    id: generateSessionId(),
    createdAt: now,
    lastAccessedAt: now,
    useCase,
    conversationHistory: [],
    metadata: {
      totalMessages: 0,
      totalTokens: 0,
    },
  };
}

/**
 * Check if a session has expired (older than 24 hours)
 */
function isSessionExpired(session: Session): boolean {
  const now = Date.now();
  return now - session.lastAccessedAt > SESSION_EXPIRY_MS;
}

/**
 * Save session to Local Storage
 */
export function saveSession(session: Session): void {
  if (typeof window === 'undefined') {
    return; // Server-side, skip
  }

  try {
    session.lastAccessedAt = Date.now();
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    console.error('Failed to save session to localStorage:', error);
  }
}

/**
 * Restore session from Local Storage
 */
export function restoreSession(): Session | null {
  if (typeof window === 'undefined') {
    return null; // Server-side, skip
  }

  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) {
      return null;
    }

    const session: Session = JSON.parse(stored);

    // Check if session has expired
    if (isSessionExpired(session)) {
      clearSession();
      return null;
    }

    // Update last accessed time
    session.lastAccessedAt = Date.now();
    saveSession(session);

    return session;
  } catch (error) {
    console.error('Failed to restore session from localStorage:', error);
    clearSession(); // Clear corrupted data
    return null;
  }
}

/**
 * Clear session from Local Storage
 */
export function clearSession(): void {
  if (typeof window === 'undefined') {
    return; // Server-side, skip
  }

  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.error('Failed to clear session from localStorage:', error);
  }
}

/**
 * Get or create a session
 */
export function getOrCreateSession(useCase?: 'support' | 'sales' | 'education' | 'healthcare'): Session {
  const existing = restoreSession();
  if (existing) {
    return existing;
  }
  return initializeSession(useCase);
}

/**
 * Add a message to the session
 */
export function addMessageToSession(session: Session, message: Message): Session {
  const updatedSession = {
    ...session,
    conversationHistory: [...session.conversationHistory, message],
    metadata: {
      totalMessages: session.metadata.totalMessages + 1,
      totalTokens: session.metadata.totalTokens + (message.metadata?.tokensUsed || 0),
    },
  };
  
  saveSession(updatedSession);
  return updatedSession;
}

/**
 * Generate a unique message ID
 */
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
