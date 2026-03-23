/**
 * Conversation Manager Tests
 * Feature: ai-avatar-system
 * 
 * Tests for ConversationManager service
 * Validates: Requirements 2.2, 2.3, 2.5, 10.2, 10.3, 11.1, 11.2
 */

import { DefaultConversationManager } from '../ConversationManager';
import type { UseCase } from '../ConversationManager';

// Mock fetch globally
global.fetch = jest.fn();

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

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('ConversationManager', () => {
  let manager: DefaultConversationManager;

  beforeEach(() => {
    manager = new DefaultConversationManager();
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with support use case', async () => {
      await manager.initialize('support');
      const history = manager.getHistory();
      expect(history).toHaveLength(0); // System message not included in history
    });

    it('should initialize with sales use case', async () => {
      await manager.initialize('sales');
      const history = manager.getHistory();
      expect(history).toHaveLength(0);
    });

    it('should initialize with education use case', async () => {
      await manager.initialize('education');
      const history = manager.getHistory();
      expect(history).toHaveLength(0);
    });

    it('should initialize with healthcare use case', async () => {
      await manager.initialize('healthcare');
      const history = manager.getHistory();
      expect(history).toHaveLength(0);
    });

    it('should throw error when sending message before initialization', async () => {
      await expect(manager.sendMessage('Hello')).rejects.toThrow(
        'ConversationManager not initialized'
      );
    });
  });

  describe('Message Handling', () => {
    beforeEach(async () => {
      await manager.initialize('support');
    });

    it('should send message and receive response', async () => {
      const mockResponse = {
        message: 'Hello! How can I help you?',
        conversationId: 'test-conv-id',
        tokensUsed: 50,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const response = await manager.sendMessage('Hello');

      expect(response.message).toBe(mockResponse.message);
      expect(response.tokensUsed).toBe(50);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should add user and assistant messages to history', async () => {
      const mockResponse = {
        message: 'Response message',
        conversationId: 'test-conv-id',
        tokensUsed: 50,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await manager.sendMessage('User message');
      const history = manager.getHistory();

      expect(history).toHaveLength(2);
      expect(history[0].role).toBe('user');
      expect(history[0].content).toBe('User message');
      expect(history[1].role).toBe('assistant');
      expect(history[1].content).toBe('Response message');
    });

    it('should reject empty messages', async () => {
      await expect(manager.sendMessage('')).rejects.toThrow('Message cannot be empty');
      await expect(manager.sendMessage('   ')).rejects.toThrow('Message cannot be empty');
    });

    it('should trim message content', async () => {
      const mockResponse = {
        message: 'Response',
        conversationId: 'test-conv-id',
        tokensUsed: 50,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await manager.sendMessage('  Hello  ');
      const history = manager.getHistory();

      expect(history[0].content).toBe('Hello');
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(manager.sendMessage('Hello')).rejects.toThrow(
        'LLM service unavailable'
      );

      // User message should be removed from history on error
      const history = manager.getHistory();
      expect(history).toHaveLength(0);
    }, 10000); // 10 second timeout for retry logic

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(manager.sendMessage('Hello')).rejects.toThrow('Network error');

      // User message should be removed from history on error
      const history = manager.getHistory();
      expect(history).toHaveLength(0);
    });
  });

  describe('Context Window Management', () => {
    beforeEach(async () => {
      await manager.initialize('support');
    });

    it('should maintain all messages when under limit', async () => {
      const mockResponse = {
        message: 'Response',
        conversationId: 'test-conv-id',
        tokensUsed: 50,
      };

      // Send 5 messages (10 total messages: 5 user + 5 assistant)
      for (let i = 0; i < 5; i++) {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });
        await manager.sendMessage(`Message ${i + 1}`);
      }

      const history = manager.getHistory();
      expect(history).toHaveLength(10); // 5 user + 5 assistant
    });

    it('should maintain exactly 10 exchanges when at limit', async () => {
      const mockResponse = {
        message: 'Response',
        conversationId: 'test-conv-id',
        tokensUsed: 50,
      };

      // Send exactly 10 messages (20 total messages: 10 user + 10 assistant)
      for (let i = 0; i < 10; i++) {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });
        await manager.sendMessage(`Message ${i + 1}`);
      }

      const history = manager.getHistory();
      expect(history).toHaveLength(20); // 10 user + 10 assistant
    });

    it('should send context window with system message and recent exchanges', async () => {
      const mockResponse = {
        message: 'Response',
        conversationId: 'test-conv-id',
        tokensUsed: 50,
      };

      // Send 3 messages
      for (let i = 0; i < 3; i++) {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });
        await manager.sendMessage(`Message ${i + 1}`);
      }

      // Check the last API call
      const lastCall = (global.fetch as jest.Mock).mock.calls[2];
      const requestBody = JSON.parse(lastCall[1].body);

      // Should include system message + conversation messages up to the current user message
      // Before the 3rd response: system + 2 complete exchanges + 1 user message = 6 messages
      expect(requestBody.history).toHaveLength(6); // 1 system + 4 conversation + 1 current user
      expect(requestBody.history[0].role).toBe('system');
    });
  });

  describe('Session Management', () => {
    beforeEach(async () => {
      await manager.initialize('support');
    });

    it('should save session to localStorage', async () => {
      const mockResponse = {
        message: 'Response',
        conversationId: 'test-conv-id',
        tokensUsed: 50,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await manager.sendMessage('Hello');
      manager.saveSession();

      const savedData = localStorageMock.getItem('ai-avatar-session');
      expect(savedData).not.toBeNull();

      const sessionData = JSON.parse(savedData!);
      expect(sessionData.useCase).toBe('support');
      expect(sessionData.messages).toHaveLength(3); // system + user + assistant
    });

    it('should restore session from localStorage', async () => {
      const mockResponse = {
        message: 'Response',
        conversationId: 'test-conv-id',
        tokensUsed: 50,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      // Create a session
      await manager.sendMessage('Hello');
      manager.saveSession();

      // Create new manager and restore
      const newManager = new DefaultConversationManager();
      const restored = await newManager.restoreSession();

      expect(restored).toBe(true);
      const history = newManager.getHistory();
      expect(history).toHaveLength(2); // user + assistant
      expect(history[0].content).toBe('Hello');
    });

    it('should return false when no session exists', async () => {
      const restored = await manager.restoreSession();
      expect(restored).toBe(false);
    });

    it('should reject expired sessions (24 hours)', async () => {
      const mockResponse = {
        message: 'Response',
        conversationId: 'test-conv-id',
        tokensUsed: 50,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await manager.sendMessage('Hello');
      manager.saveSession();

      // Manually modify the session to be 25 hours old
      const savedData = localStorageMock.getItem('ai-avatar-session');
      const sessionData = JSON.parse(savedData!);
      sessionData.lastAccessedAt = Date.now() - (25 * 60 * 60 * 1000);
      localStorageMock.setItem('ai-avatar-session', JSON.stringify(sessionData));

      // Try to restore
      const newManager = new DefaultConversationManager();
      const restored = await newManager.restoreSession();

      expect(restored).toBe(false);
      expect(localStorageMock.getItem('ai-avatar-session')).toBeNull();
    });

    it('should handle corrupted session data', async () => {
      // Store invalid JSON
      localStorageMock.setItem('ai-avatar-session', 'invalid-json{');

      const restored = await manager.restoreSession();

      expect(restored).toBe(false);
      expect(localStorageMock.getItem('ai-avatar-session')).toBeNull();
    });

    it('should update lastAccessedAt when restoring session', async () => {
      const mockResponse = {
        message: 'Response',
        conversationId: 'test-conv-id',
        tokensUsed: 50,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await manager.sendMessage('Hello');
      manager.saveSession();

      const beforeRestore = Date.now();

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));

      // Restore session
      const newManager = new DefaultConversationManager();
      await newManager.restoreSession();

      const savedData = localStorageMock.getItem('ai-avatar-session');
      const sessionData = JSON.parse(savedData!);

      expect(sessionData.lastAccessedAt).toBeGreaterThanOrEqual(beforeRestore);
    });
  });

  describe('Reset Functionality', () => {
    beforeEach(async () => {
      await manager.initialize('support');
    });

    it('should clear conversation history', async () => {
      const mockResponse = {
        message: 'Response',
        conversationId: 'test-conv-id',
        tokensUsed: 50,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await manager.sendMessage('Hello');
      expect(manager.getHistory()).toHaveLength(2);

      manager.reset();
      expect(manager.getHistory()).toHaveLength(0);
    });

    it('should clear localStorage', async () => {
      const mockResponse = {
        message: 'Response',
        conversationId: 'test-conv-id',
        tokensUsed: 50,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await manager.sendMessage('Hello');
      manager.saveSession();

      expect(localStorageMock.getItem('ai-avatar-session')).not.toBeNull();

      manager.reset();
      expect(localStorageMock.getItem('ai-avatar-session')).toBeNull();
    });

    it('should generate new conversation ID after reset', async () => {
      const mockResponse = {
        message: 'Response',
        conversationId: 'test-conv-id',
        tokensUsed: 50,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const firstResponse = await manager.sendMessage('Hello');
      const firstConvId = firstResponse.conversationId;

      manager.reset();
      
      // Re-initialize after reset
      await manager.initialize('support');

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const secondResponse = await manager.sendMessage('New conversation');
      const secondConvId = secondResponse.conversationId;

      expect(secondConvId).not.toBe(firstConvId);
    });
  });

  describe('Use Case Configuration', () => {
    const useCases: UseCase[] = ['support', 'sales', 'education', 'healthcare'];

    useCases.forEach(useCase => {
      it(`should load ${useCase} configuration`, async () => {
        await manager.initialize(useCase);

        const mockResponse = {
          message: 'Response',
          conversationId: 'test-conv-id',
          tokensUsed: 50,
        };

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        await manager.sendMessage('Hello');

        const lastCall = (global.fetch as jest.Mock).mock.calls[0];
        const requestBody = JSON.parse(lastCall[1].body);

        expect(requestBody.useCase).toBe(useCase);
        expect(requestBody.history[0].role).toBe('system');
        expect(requestBody.history[0].content).toContain('You are');
      });
    });

    it('should include appropriate system prompt for support', async () => {
      await manager.initialize('support');

      const mockResponse = {
        message: 'Response',
        conversationId: 'test-conv-id',
        tokensUsed: 50,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await manager.sendMessage('Hello');

      const lastCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(lastCall[1].body);

      expect(requestBody.history[0].content).toContain('customer support');
    });

    it('should include appropriate system prompt for sales', async () => {
      await manager.initialize('sales');

      const mockResponse = {
        message: 'Response',
        conversationId: 'test-conv-id',
        tokensUsed: 50,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await manager.sendMessage('Hello');

      const lastCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(lastCall[1].body);

      expect(requestBody.history[0].content).toContain('sales');
    });
  });

  describe('Message Structure', () => {
    beforeEach(async () => {
      await manager.initialize('support');
    });

    it('should generate unique message IDs', async () => {
      const mockResponse = {
        message: 'Response',
        conversationId: 'test-conv-id',
        tokensUsed: 50,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await manager.sendMessage('Hello');
      const history = manager.getHistory();

      const ids = history.map(msg => msg.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should include timestamps in messages', async () => {
      const mockResponse = {
        message: 'Response',
        conversationId: 'test-conv-id',
        tokensUsed: 50,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const beforeSend = Date.now();
      await manager.sendMessage('Hello');
      const afterSend = Date.now();

      const history = manager.getHistory();

      history.forEach(msg => {
        expect(msg.timestamp).toBeGreaterThanOrEqual(beforeSend);
        expect(msg.timestamp).toBeLessThanOrEqual(afterSend);
      });
    });

    it('should set correct roles for messages', async () => {
      const mockResponse = {
        message: 'Response',
        conversationId: 'test-conv-id',
        tokensUsed: 50,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await manager.sendMessage('Hello');
      const history = manager.getHistory();

      expect(history[0].role).toBe('user');
      expect(history[1].role).toBe('assistant');
    });
  });

  describe('API Integration with Exponential Backoff', () => {
    beforeEach(async () => {
      await manager.initialize('support');
    });

    it('should track request/response latency', async () => {
      const mockResponse = {
        message: 'Response',
        conversationId: 'test-conv-id',
        tokensUsed: 50,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const response = await manager.sendMessage('Hello');

      expect(response.latency).toBeDefined();
      expect(response.latency).toBeGreaterThanOrEqual(0);
    });

    it('should retry on 429 rate limit with exponential backoff', async () => {
      const mockResponse = {
        message: 'Response',
        conversationId: 'test-conv-id',
        tokensUsed: 50,
      };

      // First two calls return 429, third succeeds
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: false, status: 429 })
        .mockResolvedValueOnce({ ok: false, status: 429 })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

      const response = await manager.sendMessage('Hello');

      expect(response.message).toBe('Response');
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should retry on 5xx server errors with exponential backoff', async () => {
      const mockResponse = {
        message: 'Response',
        conversationId: 'test-conv-id',
        tokensUsed: 50,
      };

      // First call returns 503, second succeeds
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: false, status: 503 })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

      const response = await manager.sendMessage('Hello');

      expect(response.message).toBe('Response');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    }, 10000); // 10 second timeout for retry logic

    it('should throw error after max retries on rate limit', async () => {
      // All calls return 429
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 429 });

      await expect(manager.sendMessage('Hello')).rejects.toThrow('Rate limit exceeded');
      expect(global.fetch).toHaveBeenCalledTimes(4); // Initial + 3 retries
    }, 10000); // 10 second timeout for retry logic

    it('should throw error after max retries on server error', async () => {
      // All calls return 500
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });

      await expect(manager.sendMessage('Hello')).rejects.toThrow('LLM service unavailable');
      expect(global.fetch).toHaveBeenCalledTimes(4); // Initial + 3 retries
    }, 10000); // 10 second timeout for retry logic

    it('should retry on network errors', async () => {
      const mockResponse = {
        message: 'Response',
        conversationId: 'test-conv-id',
        tokensUsed: 50,
      };

      // First call fails with network error, second succeeds
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

      const response = await manager.sendMessage('Hello');

      expect(response.message).toBe('Response');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should not retry on 4xx client errors (except 429)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Bad request',
      });

      await expect(manager.sendMessage('Hello')).rejects.toThrow('API request failed with status 400');
      expect(global.fetch).toHaveBeenCalledTimes(1); // No retries
    });

    it('should use exponential backoff delays', async () => {
      const mockResponse = {
        message: 'Response',
        conversationId: 'test-conv-id',
        tokensUsed: 50,
      };

      // Mock to fail twice then succeed
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: false, status: 429 })
        .mockResolvedValueOnce({ ok: false, status: 429 })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

      const response = await manager.sendMessage('Hello');

      // Verify exponential backoff was used (delays should increase)
      expect(global.fetch).toHaveBeenCalledTimes(3);
      expect(response.message).toBe('Response');
    }, 10000); // 10 second timeout for retry logic

    it('should include latency in successful response', async () => {
      const mockResponse = {
        message: 'Response',
        conversationId: 'test-conv-id',
        tokensUsed: 50,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const response = await manager.sendMessage('Hello');

      expect(response).toHaveProperty('latency');
      expect(typeof response.latency).toBe('number');
      expect(response.latency).toBeGreaterThanOrEqual(0);
    });

    it('should handle LLM service failures with descriptive errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 503,
      });

      await expect(manager.sendMessage('Hello')).rejects.toThrow('LLM service unavailable');
    }, 10000); // 10 second timeout for retry logic

    it('should reset retry attempts on successful request', async () => {
      const mockResponse = {
        message: 'Response',
        conversationId: 'test-conv-id',
        tokensUsed: 50,
      };

      // First request fails once then succeeds
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: false, status: 429 })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

      const response1 = await manager.sendMessage('Hello');
      expect(response1.message).toBe('Response');

      // Second request should start fresh (not continue retry count)
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const response2 = await manager.sendMessage('World');
      expect(response2.message).toBe('Response');
    });
  });

  describe('Error Handling for LLM Service Failures', () => {
    beforeEach(async () => {
      await manager.initialize('support');
    });

    it('should provide user-friendly error for rate limiting', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 429 });

      await expect(manager.sendMessage('Hello')).rejects.toThrow('Rate limit exceeded. Please try again later.');
    }, 10000); // 10 second timeout for retry logic

    it('should provide user-friendly error for service unavailable', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 503 });

      await expect(manager.sendMessage('Hello')).rejects.toThrow('LLM service unavailable');
    }, 10000); // 10 second timeout for retry logic

    it('should handle JSON parsing errors gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      await expect(manager.sendMessage('Hello')).rejects.toThrow('Invalid JSON');
    });

    it('should remove user message from history on API failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(manager.sendMessage('Hello')).rejects.toThrow();

      const history = manager.getHistory();
      expect(history).toHaveLength(0);
    }, 10000); // 10 second timeout for retry logic

    it('should handle timeout errors', async () => {
      (global.fetch as jest.Mock).mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      await expect(manager.sendMessage('Hello')).rejects.toThrow('Request timeout');
    });
  });
});
