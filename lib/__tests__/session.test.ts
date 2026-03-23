import {
  initializeSession,
  saveSession,
  restoreSession,
  clearSession,
  getOrCreateSession,
  addMessageToSession,
  generateMessageId,
  type Session,
  type Message,
} from '../session';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('Session Management', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe('initializeSession', () => {
    it('should create a new session with default use case', () => {
      const session = initializeSession();

      expect(session.id).toMatch(/^session_/);
      expect(session.useCase).toBe('support');
      expect(session.conversationHistory).toEqual([]);
      expect(session.metadata.totalMessages).toBe(0);
      expect(session.metadata.totalTokens).toBe(0);
      expect(session.createdAt).toBeGreaterThan(0);
      expect(session.lastAccessedAt).toBeGreaterThan(0);
    });

    it('should create a new session with specified use case', () => {
      const session = initializeSession('education');

      expect(session.useCase).toBe('education');
    });
  });

  describe('saveSession and restoreSession', () => {
    it('should save and restore a session', () => {
      const session = initializeSession('sales');
      saveSession(session);

      const restored = restoreSession();

      expect(restored).not.toBeNull();
      expect(restored?.id).toBe(session.id);
      expect(restored?.useCase).toBe('sales');
    });

    it('should return null when no session exists', () => {
      const restored = restoreSession();

      expect(restored).toBeNull();
    });

    it('should return null and clear session when data is corrupted', () => {
      localStorage.setItem('ai_avatar_session', 'invalid json');

      const restored = restoreSession();

      expect(restored).toBeNull();
      expect(localStorage.getItem('ai_avatar_session')).toBeNull();
    });

    it('should return null and clear session when session has expired (24 hours)', () => {
      const session = initializeSession();
      const expiredTime = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
      session.lastAccessedAt = expiredTime;
      
      localStorage.setItem('ai_avatar_session', JSON.stringify(session));

      const restored = restoreSession();

      expect(restored).toBeNull();
      expect(localStorage.getItem('ai_avatar_session')).toBeNull();
    });

    it('should update lastAccessedAt when restoring session', () => {
      const session = initializeSession();
      const originalTime = session.lastAccessedAt;
      saveSession(session);

      // Wait a bit
      jest.advanceTimersByTime(100);

      const restored = restoreSession();

      expect(restored).not.toBeNull();
      expect(restored!.lastAccessedAt).toBeGreaterThanOrEqual(originalTime);
    });
  });

  describe('clearSession', () => {
    it('should remove session from localStorage', () => {
      const session = initializeSession();
      saveSession(session);

      expect(localStorage.getItem('ai_avatar_session')).not.toBeNull();

      clearSession();

      expect(localStorage.getItem('ai_avatar_session')).toBeNull();
    });
  });

  describe('getOrCreateSession', () => {
    it('should return existing session if available', () => {
      const session = initializeSession('healthcare');
      saveSession(session);

      const retrieved = getOrCreateSession();

      expect(retrieved.id).toBe(session.id);
      expect(retrieved.useCase).toBe('healthcare');
    });

    it('should create new session if none exists', () => {
      const session = getOrCreateSession('education');

      expect(session.id).toMatch(/^session_/);
      expect(session.useCase).toBe('education');
    });
  });

  describe('addMessageToSession', () => {
    it('should add message to conversation history', () => {
      const session = initializeSession();
      const message: Message = {
        id: generateMessageId(),
        role: 'user',
        content: 'Hello',
        timestamp: Date.now(),
      };

      const updated = addMessageToSession(session, message);

      expect(updated.conversationHistory).toHaveLength(1);
      expect(updated.conversationHistory[0]).toEqual(message);
      expect(updated.metadata.totalMessages).toBe(1);
    });

    it('should update token count when message has token metadata', () => {
      const session = initializeSession();
      const message: Message = {
        id: generateMessageId(),
        role: 'assistant',
        content: 'Hello back',
        timestamp: Date.now(),
        metadata: {
          tokensUsed: 50,
        },
      };

      const updated = addMessageToSession(session, message);

      expect(updated.metadata.totalTokens).toBe(50);
    });

    it('should save session after adding message', () => {
      const session = initializeSession();
      const message: Message = {
        id: generateMessageId(),
        role: 'user',
        content: 'Test',
        timestamp: Date.now(),
      };

      addMessageToSession(session, message);

      const restored = restoreSession();
      expect(restored?.conversationHistory).toHaveLength(1);
    });
  });

  describe('generateMessageId', () => {
    it('should generate unique message IDs', () => {
      const id1 = generateMessageId();
      const id2 = generateMessageId();

      expect(id1).toMatch(/^msg_/);
      expect(id2).toMatch(/^msg_/);
      expect(id1).not.toBe(id2);
    });
  });
});
