/**
 * Speech Output Handler Tests
 * Feature: ai-avatar-system
 * 
 * Tests for speech output functionality including Web Speech API integration,
 * playback controls, event handlers, and OpenAI TTS fallback.
 * Validates: Requirements 4.1, 4.2, 4.4, 4.5, 12.3
 */

import { DefaultSpeechOutputHandler } from '../SpeechOutputHandler';

// Mock SpeechSynthesisUtterance
class MockSpeechSynthesisUtterance {
  text = '';
  onstart: ((event: Event) => void) | null = null;
  onend: ((event: Event) => void) | null = null;
  onerror: ((event: SpeechSynthesisErrorEvent) => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }

  // Helper methods for testing
  simulateStart(): void {
    if (this.onstart) {
      this.onstart(new Event('start'));
    }
  }

  simulateEnd(): void {
    if (this.onend) {
      this.onend(new Event('end'));
    }
  }

  simulateError(errorType: string): void {
    if (this.onerror) {
      const event = new Event('error') as SpeechSynthesisErrorEvent;
      (event as any).error = errorType;
      this.onerror(event);
    }
  }
}

// Mock SpeechSynthesis
class MockSpeechSynthesis {
  private utterances: MockSpeechSynthesisUtterance[] = [];
  private _paused = false;
  private _speaking = false;

  speak(utterance: MockSpeechSynthesisUtterance): void {
    this.utterances.push(utterance);
    this._speaking = true;
    // Simulate async start
    setTimeout(() => utterance.simulateStart(), 0);
  }

  cancel(): void {
    this.utterances = [];
    this._speaking = false;
    this._paused = false;
  }

  pause(): void {
    this._paused = true;
  }

  resume(): void {
    this._paused = false;
  }

  get paused(): boolean {
    return this._paused;
  }

  get speaking(): boolean {
    return this._speaking;
  }

  // Helper for testing
  getCurrentUtterance(): MockSpeechSynthesisUtterance | undefined {
    return this.utterances[this.utterances.length - 1];
  }

  // Helper to simulate completion
  completeCurrentUtterance(): void {
    const utterance = this.getCurrentUtterance();
    if (utterance) {
      this._speaking = false;
      utterance.simulateEnd();
    }
  }

  // Helper to simulate error
  errorCurrentUtterance(errorType: string): void {
    const utterance = this.getCurrentUtterance();
    if (utterance) {
      this._speaking = false;
      utterance.simulateError(errorType);
    }
  }
}

describe('DefaultSpeechOutputHandler', () => {
  let originalSpeechSynthesis: any;
  let originalSpeechSynthesisUtterance: any;
  let mockSynthesis: MockSpeechSynthesis;

  beforeEach(() => {
    // Save originals
    originalSpeechSynthesis = (window as any).speechSynthesis;
    originalSpeechSynthesisUtterance = (window as any).SpeechSynthesisUtterance;

    // Setup mocks
    mockSynthesis = new MockSpeechSynthesis();
    (window as any).speechSynthesis = mockSynthesis;
    (window as any).SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;
  });

  afterEach(() => {
    // Restore originals
    if (originalSpeechSynthesis) {
      (window as any).speechSynthesis = originalSpeechSynthesis;
    } else {
      delete (window as any).speechSynthesis;
    }
    if (originalSpeechSynthesisUtterance) {
      (window as any).SpeechSynthesisUtterance = originalSpeechSynthesisUtterance;
    } else {
      delete (window as any).SpeechSynthesisUtterance;
    }
  });

  describe('Browser Compatibility Detection (Requirement 4.1)', () => {
    it('should detect when speech synthesis is supported', () => {
      const handler = new DefaultSpeechOutputHandler();
      expect(handler.isSupported()).toBe(true);
    });

    it('should detect when speech synthesis is not supported', () => {
      delete (window as any).speechSynthesis;
      const handler = new DefaultSpeechOutputHandler();
      expect(handler.isSupported()).toBe(false);
    });

    it('should report supported when fallback is enabled even without Web Speech', () => {
      delete (window as any).speechSynthesis;
      const handler = new DefaultSpeechOutputHandler(true);
      expect(handler.isSupported()).toBe(true);
    });

    it('should handle initialization errors gracefully', () => {
      Object.defineProperty(window, 'speechSynthesis', {
        get: () => {
          throw new Error('Initialization failed');
        },
        configurable: true,
      });

      const handler = new DefaultSpeechOutputHandler();
      expect(handler.isSupported()).toBe(false);
    });
  });

  describe('Text to Speech Conversion (Requirement 4.2)', () => {
    it('should convert text to speech using Web Speech API', async () => {
      const handler = new DefaultSpeechOutputHandler();
      const speakPromise = handler.speak('Hello world');

      // Wait for async start
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const utterance = mockSynthesis.getCurrentUtterance();
      expect(utterance).toBeDefined();
      expect(utterance?.text).toBe('Hello world');

      // Complete the utterance
      mockSynthesis.completeCurrentUtterance();
      await speakPromise;
    });

    it('should handle empty text gracefully', async () => {
      const handler = new DefaultSpeechOutputHandler();
      await handler.speak('');
      
      expect(mockSynthesis.getCurrentUtterance()).toBeUndefined();
    });

    it('should handle whitespace-only text gracefully', async () => {
      const handler = new DefaultSpeechOutputHandler();
      await handler.speak('   ');
      
      expect(mockSynthesis.getCurrentUtterance()).toBeUndefined();
    });

    it('should stop current speech before starting new speech', async () => {
      const handler = new DefaultSpeechOutputHandler();
      const cancelSpy = jest.spyOn(mockSynthesis, 'cancel');

      handler.speak('First message');
      await new Promise(resolve => setTimeout(resolve, 10));
      
      handler.speak('Second message');
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(cancelSpy).toHaveBeenCalled();
    });
  });

  describe('Speech Event Handlers (Requirement 4.2)', () => {
    it('should call onSpeechStart when speech begins', async () => {
      const handler = new DefaultSpeechOutputHandler();
      const startCallback = jest.fn();
      handler.onSpeechStart(startCallback);

      handler.speak('Test message');
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(startCallback).toHaveBeenCalled();
    });

    it('should call onSpeechEnd when speech completes', async () => {
      const handler = new DefaultSpeechOutputHandler();
      const endCallback = jest.fn();
      handler.onSpeechEnd(endCallback);

      const speakPromise = handler.speak('Test message');
      await new Promise(resolve => setTimeout(resolve, 10));

      mockSynthesis.completeCurrentUtterance();
      await speakPromise;

      expect(endCallback).toHaveBeenCalled();
    });

    it('should update isSpeaking state correctly', async () => {
      const handler = new DefaultSpeechOutputHandler();

      expect(handler.isSpeaking()).toBe(false);

      handler.speak('Test message');
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(handler.isSpeaking()).toBe(true);

      mockSynthesis.completeCurrentUtterance();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(handler.isSpeaking()).toBe(false);
    });
  });

  describe('Playback Controls (Requirement 4.4)', () => {
    it('should pause speech playback', async () => {
      const handler = new DefaultSpeechOutputHandler();
      const pauseSpy = jest.spyOn(mockSynthesis, 'pause');

      handler.speak('Test message');
      await new Promise(resolve => setTimeout(resolve, 10));

      handler.pause();
      expect(pauseSpy).toHaveBeenCalled();
    });

    it('should resume paused speech', async () => {
      const handler = new DefaultSpeechOutputHandler();
      const resumeSpy = jest.spyOn(mockSynthesis, 'resume');

      handler.speak('Test message');
      await new Promise(resolve => setTimeout(resolve, 10));

      handler.pause();
      handler.resume();

      expect(resumeSpy).toHaveBeenCalled();
    });

    it('should stop speech playback', async () => {
      const handler = new DefaultSpeechOutputHandler();
      const cancelSpy = jest.spyOn(mockSynthesis, 'cancel');

      handler.speak('Test message');
      await new Promise(resolve => setTimeout(resolve, 10));

      handler.stop();

      expect(cancelSpy).toHaveBeenCalled();
      expect(handler.isSpeaking()).toBe(false);
    });

    it('should not pause if not speaking', () => {
      const handler = new DefaultSpeechOutputHandler();
      const pauseSpy = jest.spyOn(mockSynthesis, 'pause');

      handler.pause();
      expect(pauseSpy).not.toHaveBeenCalled();
    });

    it('should not resume if not paused', () => {
      const handler = new DefaultSpeechOutputHandler();
      const resumeSpy = jest.spyOn(mockSynthesis, 'resume');

      handler.resume();
      expect(resumeSpy).not.toHaveBeenCalled();
    });

    it('should handle stop when not speaking', () => {
      const handler = new DefaultSpeechOutputHandler();
      expect(() => handler.stop()).not.toThrow();
    });
  });

  describe('Error Handling (Requirement 12.3)', () => {
    it('should handle speech synthesis errors', async () => {
      const handler = new DefaultSpeechOutputHandler();
      const errorCallback = jest.fn();
      handler.onError(errorCallback);

      const speakPromise = handler.speak('Test message');
      await new Promise(resolve => setTimeout(resolve, 10));

      mockSynthesis.errorCurrentUtterance('synthesis-failed');

      await expect(speakPromise).rejects.toThrow();
      expect(errorCallback).toHaveBeenCalledWith({
        code: 'synthesis-failed',
        message: expect.stringContaining('failed'),
      });
      expect(handler.isSpeaking()).toBe(false);
    });

    it('should handle audio-busy error', async () => {
      const handler = new DefaultSpeechOutputHandler();
      const errorCallback = jest.fn();
      handler.onError(errorCallback);

      const speakPromise = handler.speak('Test message');
      await new Promise(resolve => setTimeout(resolve, 10));

      mockSynthesis.errorCurrentUtterance('audio-busy');

      await expect(speakPromise).rejects.toThrow();
      expect(errorCallback).toHaveBeenCalledWith({
        code: 'audio-busy',
        message: expect.stringContaining('busy'),
      });
    });

    it('should handle network error', async () => {
      const handler = new DefaultSpeechOutputHandler();
      const errorCallback = jest.fn();
      handler.onError(errorCallback);

      const speakPromise = handler.speak('Test message');
      await new Promise(resolve => setTimeout(resolve, 10));

      mockSynthesis.errorCurrentUtterance('network');

      await expect(speakPromise).rejects.toThrow();
      expect(errorCallback).toHaveBeenCalledWith({
        code: 'network',
        message: expect.stringContaining('Network error'),
      });
    });

    it('should handle not-allowed error', async () => {
      const handler = new DefaultSpeechOutputHandler();
      const errorCallback = jest.fn();
      handler.onError(errorCallback);

      const speakPromise = handler.speak('Test message');
      await new Promise(resolve => setTimeout(resolve, 10));

      mockSynthesis.errorCurrentUtterance('not-allowed');

      await expect(speakPromise).rejects.toThrow();
      expect(errorCallback).toHaveBeenCalledWith({
        code: 'not-allowed',
        message: expect.stringContaining('not allowed'),
      });
    });

    it('should handle unknown errors with generic message', async () => {
      const handler = new DefaultSpeechOutputHandler();
      const errorCallback = jest.fn();
      handler.onError(errorCallback);

      const speakPromise = handler.speak('Test message');
      await new Promise(resolve => setTimeout(resolve, 10));

      mockSynthesis.errorCurrentUtterance('unknown-error');

      await expect(speakPromise).rejects.toThrow();
      expect(errorCallback).toHaveBeenCalledWith({
        code: 'unknown-error',
        message: expect.stringContaining('unknown-error'),
      });
    });

    it('should throw error when speech synthesis not supported', async () => {
      delete (window as any).speechSynthesis;
      const handler = new DefaultSpeechOutputHandler();
      const errorCallback = jest.fn();
      handler.onError(errorCallback);

      await expect(handler.speak('Test')).rejects.toThrow();
      expect(errorCallback).toHaveBeenCalledWith({
        code: 'not-supported',
        message: expect.stringContaining('not supported'),
      });
    });
  });

  describe('OpenAI TTS Fallback (Requirement 4.5)', () => {
    beforeEach(() => {
      // Mock fetch for fallback tests
      global.fetch = jest.fn();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should use fallback when Web Speech API fails and fallback is enabled', async () => {
      const handler = new DefaultSpeechOutputHandler(true);
      
      // Mock successful TTS API response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ audioUrl: 'https://example.com/audio.mp3' }),
      });

      // Mock Audio playback
      const mockAudio = {
        play: jest.fn().mockResolvedValue(undefined),
        onloadstart: null as any,
        onended: null as any,
        onerror: null as any,
      };
      global.Audio = jest.fn(() => {
        // Trigger events asynchronously
        setTimeout(() => {
          if (mockAudio.onloadstart) mockAudio.onloadstart();
          if (mockAudio.onended) mockAudio.onended();
        }, 0);
        return mockAudio;
      }) as any;

      const speakPromise = handler.speak('Test message');
      await new Promise(resolve => setTimeout(resolve, 10));

      // Simulate Web Speech failure
      mockSynthesis.errorCurrentUtterance('synthesis-failed');

      await speakPromise;

      expect(global.fetch).toHaveBeenCalledWith('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Test message' }),
      });
    });

    it('should use fallback directly when Web Speech not supported', async () => {
      delete (window as any).speechSynthesis;
      const handler = new DefaultSpeechOutputHandler(true);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ audioUrl: 'https://example.com/audio.mp3' }),
      });

      const mockAudio = {
        play: jest.fn().mockResolvedValue(undefined),
        onloadstart: null as any,
        onended: null as any,
        onerror: null as any,
      };
      global.Audio = jest.fn(() => {
        // Trigger events asynchronously
        setTimeout(() => {
          if (mockAudio.onloadstart) mockAudio.onloadstart();
          if (mockAudio.onended) mockAudio.onended();
        }, 0);
        return mockAudio;
      }) as any;

      await handler.speak('Test message');

      expect(global.fetch).toHaveBeenCalled();
    });

    it('should handle fallback API errors', async () => {
      const handler = new DefaultSpeechOutputHandler(true);
      const errorCallback = jest.fn();
      handler.onError(errorCallback);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const speakPromise = handler.speak('Test message');
      await new Promise(resolve => setTimeout(resolve, 10));

      mockSynthesis.errorCurrentUtterance('synthesis-failed');

      await expect(speakPromise).rejects.toThrow();
      expect(errorCallback).toHaveBeenCalledWith({
        code: 'fallback-failed',
        message: expect.stringContaining('failed'),
      });
    });

    it('should handle missing audioUrl in fallback response', async () => {
      const handler = new DefaultSpeechOutputHandler(true);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const speakPromise = handler.speak('Test message');
      await new Promise(resolve => setTimeout(resolve, 10));

      mockSynthesis.errorCurrentUtterance('synthesis-failed');

      await expect(speakPromise).rejects.toThrow();
    });

    it('should call speech start/end callbacks with fallback', async () => {
      delete (window as any).speechSynthesis;
      const handler = new DefaultSpeechOutputHandler(true);
      const startCallback = jest.fn();
      const endCallback = jest.fn();
      handler.onSpeechStart(startCallback);
      handler.onSpeechEnd(endCallback);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ audioUrl: 'https://example.com/audio.mp3' }),
      });

      const mockAudio = {
        play: jest.fn().mockResolvedValue(undefined),
        onloadstart: null as any,
        onended: null as any,
        onerror: null as any,
      };
      global.Audio = jest.fn(() => {
        // Trigger events asynchronously
        setTimeout(() => {
          if (mockAudio.onloadstart) mockAudio.onloadstart();
          if (mockAudio.onended) mockAudio.onended();
        }, 0);
        return mockAudio;
      }) as any;

      await handler.speak('Test message');
      
      expect(startCallback).toHaveBeenCalled();
      expect(endCallback).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple callback registrations', async () => {
      const handler = new DefaultSpeechOutputHandler();
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      handler.onSpeechStart(callback1);
      handler.onSpeechStart(callback2);

      handler.speak('Test');
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('should handle pause/resume without synthesis', () => {
      delete (window as any).speechSynthesis;
      const handler = new DefaultSpeechOutputHandler();

      expect(() => handler.pause()).not.toThrow();
      expect(() => handler.resume()).not.toThrow();
      expect(() => handler.stop()).not.toThrow();
    });

    it('should handle speak errors during synthesis.speak call', async () => {
      const handler = new DefaultSpeechOutputHandler();
      const errorCallback = jest.fn();
      handler.onError(errorCallback);

      jest.spyOn(mockSynthesis, 'speak').mockImplementation(() => {
        throw new Error('Speak failed');
      });

      await expect(handler.speak('Test')).rejects.toThrow();
    });
  });
});
