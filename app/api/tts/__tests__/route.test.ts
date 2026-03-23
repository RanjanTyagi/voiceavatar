import { POST } from '../route';
import { NextRequest } from 'next/server';

// Mock environment variables
process.env.OPENAI_API_KEY = 'test_openai_key';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';

// Mock fetch
global.fetch = jest.fn();

describe('/api/tts', () => {
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
        { text: 'Hello world' },
        'http://evil.com'
      );

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Unauthorized origin');
    });

    it('should reject requests with missing text field', async () => {
      const req = createMockRequest({});

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required field: text');
    });
  });

  describe('OpenAI TTS integration', () => {
    it('should call OpenAI TTS API with correct parameters', async () => {
      const mockAudioData = new Uint8Array([1, 2, 3, 4]);
      const mockBlob = new Blob([mockAudioData], { type: 'audio/mpeg' });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
      });

      const req = createMockRequest({
        text: 'Hello world',
        voice: 'nova',
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.audioUrl).toMatch(/^data:audio\/mpeg;base64,/);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/audio/speech',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test_openai_key',
          }),
        })
      );

      const callArgs = (global.fetch as jest.Mock).mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      expect(body.model).toBe('tts-1');
      expect(body.input).toBe('Hello world');
      expect(body.voice).toBe('nova');
    });

    it('should use default voice when not specified', async () => {
      const mockAudioData = new Uint8Array([1, 2, 3, 4]);
      const mockBlob = new Blob([mockAudioData], { type: 'audio/mpeg' });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
      });

      const req = createMockRequest({
        text: 'Hello world',
      });

      await POST(req);

      const callArgs = (global.fetch as jest.Mock).mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      expect(body.voice).toBe('alloy');
    });

    it('should return 503 when OpenAI API fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      });

      const req = createMockRequest({
        text: 'Hello world',
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toContain('TTS service temporarily unavailable');
    });

    it('should return 503 when API key is not configured', async () => {
      const originalKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      const req = createMockRequest({
        text: 'Hello world',
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toContain('TTS service not configured');

      process.env.OPENAI_API_KEY = originalKey;
    });
  });

  describe('Error handling', () => {
    it('should handle network errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      const req = createMockRequest({
        text: 'Hello world',
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});
