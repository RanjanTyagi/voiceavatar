import { GET } from '../route';

// Mock environment variables
process.env.GROQ_API_KEY = 'test_groq_key';
process.env.OPENAI_API_KEY = 'test_openai_key';

// Mock fetch
global.fetch = jest.fn();

describe('/api/health', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  describe('Service availability checks', () => {
    it('should return ok status when both services are available', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true }) // Groq
        .mockResolvedValueOnce({ ok: true }); // OpenAI

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data.services.groq).toBe(true);
      expect(data.services.openai).toBe(true);
    });

    it('should return ok status when only Groq is available', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true }) // Groq
        .mockResolvedValueOnce({ ok: false }); // OpenAI

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data.services.groq).toBe(true);
      expect(data.services.openai).toBe(false);
    });

    it('should return ok status when only OpenAI is available', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: false }) // Groq
        .mockResolvedValueOnce({ ok: true }); // OpenAI

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data.services.groq).toBe(false);
      expect(data.services.openai).toBe(true);
    });

    it('should return degraded status when both services are unavailable', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: false }) // Groq
        .mockResolvedValueOnce({ ok: false }); // OpenAI

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('degraded');
      expect(data.services.groq).toBe(false);
      expect(data.services.openai).toBe(false);
    });

    it('should check Groq API endpoint', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({ ok: true });

      await GET();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.groq.com/openai/v1/models',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer test_groq_key',
          }),
        })
      );
    });

    it('should check OpenAI API endpoint', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({ ok: true });

      await GET();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/models',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer test_openai_key',
          }),
        })
      );
    });
  });

  describe('API key configuration', () => {
    it('should return false for Groq when API key is not configured', async () => {
      const originalKey = process.env.GROQ_API_KEY;
      delete process.env.GROQ_API_KEY;

      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true }); // OpenAI

      const response = await GET();
      const data = await response.json();

      expect(data.services.groq).toBe(false);

      process.env.GROQ_API_KEY = originalKey;
    });

    it('should return false for OpenAI when API key is not configured', async () => {
      const originalKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true }); // Groq

      const response = await GET();
      const data = await response.json();

      expect(data.services.openai).toBe(false);

      process.env.OPENAI_API_KEY = originalKey;
    });
  });

  describe('Error handling', () => {
    it('should handle network errors for Groq', async () => {
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error')) // Groq
        .mockResolvedValueOnce({ ok: true }); // OpenAI

      const response = await GET();
      const data = await response.json();

      expect(data.services.groq).toBe(false);
      expect(data.services.openai).toBe(true);
    });

    it('should handle network errors for OpenAI', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true }) // Groq
        .mockRejectedValueOnce(new Error('Network error')); // OpenAI

      const response = await GET();
      const data = await response.json();

      expect(data.services.groq).toBe(true);
      expect(data.services.openai).toBe(false);
    });

    it('should return 503 when health check throws unexpected error', async () => {
      (global.fetch as jest.Mock).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe('degraded');
      expect(data.services.groq).toBe(false);
      expect(data.services.openai).toBe(false);
    });
  });

  describe('Timeout handling', () => {
    it('should timeout requests after 5 seconds', async () => {
      // Mock a slow response
      (global.fetch as jest.Mock).mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 10000))
      );

      const response = await GET();
      const data = await response.json();

      // Both should fail due to timeout
      expect(data.services.groq).toBe(false);
      expect(data.services.openai).toBe(false);
    });
  });
});
