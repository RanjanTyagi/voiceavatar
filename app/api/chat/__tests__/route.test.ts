import { POST } from '../route';
import { NextRequest } from 'next/server';

// Mock environment variables
process.env.GROQ_API_KEY = 'test_groq_key';
process.env.OPENAI_API_KEY = 'test_openai_key';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
process.env.MAX_MESSAGES_PER_MINUTE = '10';

// Mock fetch
global.fetch = jest.fn();

describe('/api/chat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  const createMockRequest = (body: unknown, origin = 'http://localhost:3000') => {
    const headers = new Map([['origin', origin]]);
    return {
      headers: {
        get: (key: string) => headers.get(key),
      },
      json: async () => body,
    } as unknown as NextRequest;
  };

  describe('Request validation', () => {
    it('should reject requests from unauthorized origins', async () => {
      const req = createMockRequest(
        {
          message: 'Hello',
          conversationId: 'test-123',
          history: [],
          useCase: 'support',
        },
        'http://evil.com'
      );

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Unauthorized origin');
    });

    it('should accept requests from allowed origins', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response' } }],
          usage: { total_tokens: 50 },
        }),
      });

      const req = createMockRequest({
        message: 'Hello',
        conversationId: 'test-123',
        history: [],
        useCase: 'support',
      });

      const response = await POST(req);

      expect(response.status).toBe(200);
    });

    it('should reject requests with missing required fields', async () => {
      const req = createMockRequest({
        conversationId: 'test-123',
        history: [],
        useCase: 'support',
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });
  });

  describe('Rate limiting', () => {
    it('should enforce rate limits per IP', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response' } }],
          usage: { total_tokens: 50 },
        }),
      });

      const makeRequest = () =>
        POST(
          createMockRequest({
            message: 'Hello',
            conversationId: 'test-123',
            history: [],
            useCase: 'support',
          })
        );

      // Make 10 requests (should all succeed)
      for (let i = 0; i < 10; i++) {
        const response = await makeRequest();
        expect(response.status).toBe(200);
      }

      // 11th request should be rate limited
      const response = await makeRequest();
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Rate limit exceeded');
    });
  });

  describe('LLM service integration', () => {
    it('should call Groq API as primary service', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Groq response' } }],
          usage: { total_tokens: 50 },
        }),
      });

      const req = createMockRequest({
        message: 'Hello',
        conversationId: 'test-123',
        history: [],
        useCase: 'support',
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Groq response');
      expect(data.tokensUsed).toBe(50);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.groq.com/openai/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test_groq_key',
          }),
        })
      );
    });

    it('should fallback to OpenAI when Groq fails', async () => {
      // First call (Groq) fails
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 503,
      });

      // Second call (OpenAI) succeeds
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'OpenAI response' } }],
          usage: { total_tokens: 60 },
        }),
      });

      const req = createMockRequest({
        message: 'Hello',
        conversationId: 'test-123',
        history: [],
        useCase: 'support',
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('OpenAI response');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should return 503 when both services fail', async () => {
      // Both calls fail
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 503,
      });

      const req = createMockRequest({
        message: 'Hello',
        conversationId: 'test-123',
        history: [],
        useCase: 'support',
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toContain('LLM service temporarily unavailable');
    });
  });

  describe('Use case system prompts', () => {
    it('should include support system prompt', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response' } }],
          usage: { total_tokens: 50 },
        }),
      });

      const req = createMockRequest({
        message: 'Hello',
        conversationId: 'test-123',
        history: [],
        useCase: 'support',
      });

      await POST(req);

      const callArgs = (global.fetch as jest.Mock).mock.calls[0][1];
      const body = JSON.parse(callArgs.body);

      expect(body.messages[0].role).toBe('system');
      expect(body.messages[0].content).toContain('customer support');
    });

    it('should include education system prompt', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response' } }],
          usage: { total_tokens: 50 },
        }),
      });

      const req = createMockRequest({
        message: 'Hello',
        conversationId: 'test-123',
        history: [],
        useCase: 'education',
      });

      await POST(req);

      const callArgs = (global.fetch as jest.Mock).mock.calls[0][1];
      const body = JSON.parse(callArgs.body);

      expect(body.messages[0].role).toBe('system');
      expect(body.messages[0].content).toContain('educational');
    });
  });

  describe('Conversation history', () => {
    it('should include conversation history in request', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response' } }],
          usage: { total_tokens: 50 },
        }),
      });

      const req = createMockRequest({
        message: 'New message',
        conversationId: 'test-123',
        history: [
          { role: 'user', content: 'Previous message' },
          { role: 'assistant', content: 'Previous response' },
        ],
        useCase: 'support',
      });

      await POST(req);

      const callArgs = (global.fetch as jest.Mock).mock.calls[0][1];
      const body = JSON.parse(callArgs.body);

      expect(body.messages).toHaveLength(4); // system + 2 history + new message
      expect(body.messages[1].content).toBe('Previous message');
      expect(body.messages[2].content).toBe('Previous response');
      expect(body.messages[3].content).toBe('New message');
    });

    it('should limit history to last 10 exchanges', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response' } }],
          usage: { total_tokens: 50 },
        }),
      });

      const history = Array.from({ length: 20 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
      }));

      const req = createMockRequest({
        message: 'New message',
        conversationId: 'test-123',
        history,
        useCase: 'support',
      });

      await POST(req);

      const callArgs = (global.fetch as jest.Mock).mock.calls[0][1];
      const body = JSON.parse(callArgs.body);

      // system + 10 history + new message = 12
      expect(body.messages).toHaveLength(12);
    });
  });
});
