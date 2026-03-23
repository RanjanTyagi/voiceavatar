/**
 * Speech Input Handler Tests
 * Feature: ai-avatar-system
 * 
 * Tests for speech input functionality including browser compatibility,
 * error handling, and graceful fallback to text mode.
 * Validates: Requirements 3.1, 3.2, 3.3, 3.5, 12.2
 */

import { DefaultSpeechInputHandler } from '../SpeechInputHandler';
import type { SpeechError } from '../SpeechInputHandler';

// Mock SpeechRecognition API
class MockSpeechRecognition {
  continuous = false;
  interimResults = false;
  lang = 'en-US';
  onstart: ((ev: Event) => void) | null = null;
  onend: ((ev: Event) => void) | null = null;
  onresult: ((ev: any) => void) | null = null;
  onerror: ((ev: any) => void) | null = null;

  start(): void {
    if (this.onstart) {
      this.onstart(new Event('start'));
    }
  }

  stop(): void {
    if (this.onend) {
      this.onend(new Event('end'));
    }
  }

  abort(): void {
    if (this.onend) {
      this.onend(new Event('end'));
    }
  }

  // Helper method for testing
  simulateResult(transcript: string, isFinal = true): void {
    if (this.onresult) {
      const event = {
        results: [
          {
            0: { transcript, confidence: 0.9 },
            length: 1,
            isFinal,
            item: (index: number) => ({ transcript, confidence: 0.9 }),
          },
        ],
        resultIndex: 0,
      };
      this.onresult(event);
    }
  }

  // Helper method for testing
  simulateError(errorCode: string, message = ''): void {
    if (this.onerror) {
      const event = {
        error: errorCode,
        message,
      };
      this.onerror(event);
    }
  }
}

describe('DefaultSpeechInputHandler', () => {
  let originalSpeechRecognition: any;
  let originalWebkitSpeechRecognition: any;

  beforeEach(() => {
    // Save originals
    originalSpeechRecognition = (window as any).SpeechRecognition;
    originalWebkitSpeechRecognition = (window as any).webkitSpeechRecognition;
  });

  afterEach(() => {
    // Restore originals
    if (originalSpeechRecognition) {
      (window as any).SpeechRecognition = originalSpeechRecognition;
    } else {
      delete (window as any).SpeechRecognition;
    }
    if (originalWebkitSpeechRecognition) {
      (window as any).webkitSpeechRecognition = originalWebkitSpeechRecognition;
    } else {
      delete (window as any).webkitSpeechRecognition;
    }
  });

  function setupMockSpeechRecognition(): MockSpeechRecognition {
    const mock = new MockSpeechRecognition();
    // Set on the actual window object that jsdom provides
    (window as any).SpeechRecognition = function() {
      return mock;
    };
    return mock;
  }

  describe('Browser Compatibility Detection (Requirement 3.1, 3.5)', () => {
    it('should detect when speech recognition is supported', () => {
      setupMockSpeechRecognition();
      const handler = new DefaultSpeechInputHandler();
      expect(handler.isSupported()).toBe(true);
    });

    it('should detect when speech recognition is not supported', () => {
      delete (window as any).SpeechRecognition;
      delete (window as any).webkitSpeechRecognition;
      const handler = new DefaultSpeechInputHandler();
      expect(handler.isSupported()).toBe(false);
    });

    it('should support webkit prefixed API', () => {
      delete (window as any).SpeechRecognition;
      const mock = new MockSpeechRecognition();
      (window as any).webkitSpeechRecognition = function() {
        return mock;
      };

      const handler = new DefaultSpeechInputHandler();
      expect(handler.isSupported()).toBe(true);
    });

    it('should handle initialization errors gracefully', () => {
      (window as any).SpeechRecognition = function() {
        throw new Error('Initialization failed');
      };

      const handler = new DefaultSpeechInputHandler();
      expect(handler.isSupported()).toBe(false);
    });
  });

  describe('Speech Capture (Requirement 3.2)', () => {
    it('should start listening when startListening is called', () => {
      const mock = setupMockSpeechRecognition();
      const handler = new DefaultSpeechInputHandler();
      const startSpy = jest.spyOn(mock, 'start');

      handler.startListening();

      expect(startSpy).toHaveBeenCalled();
    });

    it('should update listening state when started', () => {
      setupMockSpeechRecognition();
      const handler = new DefaultSpeechInputHandler();
      
      handler.startListening();
      expect(handler.isListening()).toBe(true);
    });

    it('should stop listening when stopListening is called', () => {
      const mock = setupMockSpeechRecognition();
      const handler = new DefaultSpeechInputHandler();
      const stopSpy = jest.spyOn(mock, 'stop');

      handler.startListening();
      handler.stopListening();

      expect(stopSpy).toHaveBeenCalled();
      expect(handler.isListening()).toBe(false);
    });

    it('should not start if already listening', () => {
      const mock = setupMockSpeechRecognition();
      const handler = new DefaultSpeechInputHandler();
      const startSpy = jest.spyOn(mock, 'start');

      handler.startListening();
      startSpy.mockClear();
      handler.startListening();

      expect(startSpy).not.toHaveBeenCalled();
    });
  });

  describe('Visual Feedback for Listening State (Requirement 3.3)', () => {
    it('should notify when listening state changes to true', () => {
      setupMockSpeechRecognition();
      const handler = new DefaultSpeechInputHandler();
      const callback = jest.fn();
      handler.onListeningStateChange(callback);

      handler.startListening();

      expect(callback).toHaveBeenCalledWith(true);
    });

    it('should notify when listening state changes to false', () => {
      setupMockSpeechRecognition();
      const handler = new DefaultSpeechInputHandler();
      const callback = jest.fn();
      handler.onListeningStateChange(callback);

      handler.startListening();
      callback.mockClear();
      handler.stopListening();

      expect(callback).toHaveBeenCalledWith(false);
    });

    it('should provide current listening state', () => {
      setupMockSpeechRecognition();
      const handler = new DefaultSpeechInputHandler();

      expect(handler.isListening()).toBe(false);
      handler.startListening();
      expect(handler.isListening()).toBe(true);
      handler.stopListening();
      expect(handler.isListening()).toBe(false);
    });
  });

  describe('Speech to Text Conversion (Requirement 3.4)', () => {
    it('should convert detected speech to text', () => {
      const mock = setupMockSpeechRecognition();
      const handler = new DefaultSpeechInputHandler();
      const callback = jest.fn();
      handler.onSpeechDetected(callback);

      handler.startListening();
      mock.simulateResult('Hello world');

      expect(callback).toHaveBeenCalledWith('Hello world');
    });

    it('should only process final results', () => {
      const mock = setupMockSpeechRecognition();
      const handler = new DefaultSpeechInputHandler();
      const callback = jest.fn();
      handler.onSpeechDetected(callback);

      handler.startListening();
      mock.simulateResult('Hello', false); // interim result

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle multiple speech results', () => {
      const mock = setupMockSpeechRecognition();
      const handler = new DefaultSpeechInputHandler();
      const callback = jest.fn();
      handler.onSpeechDetected(callback);

      handler.startListening();
      mock.simulateResult('First phrase');
      mock.simulateResult('Second phrase');

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenNthCalledWith(1, 'First phrase');
      expect(callback).toHaveBeenNthCalledWith(2, 'Second phrase');
    });
  });

  describe('Error Handling and Fallback (Requirement 3.5, 12.2)', () => {
    it('should handle unsupported browser with error callback', () => {
      delete (window as any).SpeechRecognition;
      delete (window as any).webkitSpeechRecognition;
      const handler = new DefaultSpeechInputHandler();
      const errorCallback = jest.fn();
      handler.onError(errorCallback);

      handler.startListening();

      expect(errorCallback).toHaveBeenCalledWith({
        code: 'not-supported',
        message: expect.stringContaining('not supported'),
      });
    });

    it('should handle no-speech error', () => {
      const mock = setupMockSpeechRecognition();
      const handler = new DefaultSpeechInputHandler();
      const errorCallback = jest.fn();
      handler.onError(errorCallback);

      handler.startListening();
      mock.simulateError('no-speech');

      expect(errorCallback).toHaveBeenCalledWith({
        code: 'no-speech',
        message: 'No speech was detected. Please try again.',
      });
      expect(handler.isListening()).toBe(false);
    });

    it('should handle microphone access denied error', () => {
      const mock = setupMockSpeechRecognition();
      const handler = new DefaultSpeechInputHandler();
      const errorCallback = jest.fn();
      handler.onError(errorCallback);

      handler.startListening();
      mock.simulateError('not-allowed');

      expect(errorCallback).toHaveBeenCalledWith({
        code: 'not-allowed',
        message: expect.stringContaining('denied'),
      });
    });

    it('should handle audio-capture error', () => {
      const mock = setupMockSpeechRecognition();
      const handler = new DefaultSpeechInputHandler();
      const errorCallback = jest.fn();
      handler.onError(errorCallback);

      handler.startListening();
      mock.simulateError('audio-capture');

      expect(errorCallback).toHaveBeenCalledWith({
        code: 'audio-capture',
        message: expect.stringContaining('microphone'),
      });
    });

    it('should handle network error', () => {
      const mock = setupMockSpeechRecognition();
      const handler = new DefaultSpeechInputHandler();
      const errorCallback = jest.fn();
      handler.onError(errorCallback);

      handler.startListening();
      mock.simulateError('network');

      expect(errorCallback).toHaveBeenCalledWith({
        code: 'network',
        message: expect.stringContaining('Network error'),
      });
    });

    it('should handle unknown errors with generic message', () => {
      const mock = setupMockSpeechRecognition();
      const handler = new DefaultSpeechInputHandler();
      const errorCallback = jest.fn();
      handler.onError(errorCallback);

      handler.startListening();
      mock.simulateError('unknown-error');

      expect(errorCallback).toHaveBeenCalledWith({
        code: 'unknown-error',
        message: expect.stringContaining('unknown-error'),
      });
    });

    it('should update listening state to false on error', () => {
      const mock = setupMockSpeechRecognition();
      const handler = new DefaultSpeechInputHandler();
      const stateCallback = jest.fn();
      handler.onListeningStateChange(stateCallback);

      handler.startListening();
      stateCallback.mockClear();
      mock.simulateError('no-speech');

      expect(stateCallback).toHaveBeenCalledWith(false);
      expect(handler.isListening()).toBe(false);
    });

    it('should handle start failure gracefully', () => {
      const mock = setupMockSpeechRecognition();
      const handler = new DefaultSpeechInputHandler();
      const errorCallback = jest.fn();
      handler.onError(errorCallback);

      jest.spyOn(mock, 'start').mockImplementation(() => {
        throw new Error('Start failed');
      });

      handler.startListening();

      expect(errorCallback).toHaveBeenCalledWith({
        code: 'start-failed',
        message: expect.stringContaining('Failed to start'),
      });
    });
  });

  describe('Configuration', () => {
    it('should configure speech recognition with correct settings', () => {
      const mock = setupMockSpeechRecognition();
      new DefaultSpeechInputHandler();

      expect(mock.continuous).toBe(false);
      expect(mock.interimResults).toBe(false);
      expect(mock.lang).toBe('en-US');
    });
  });

  describe('Edge Cases', () => {
    it('should handle stopListening when not listening', () => {
      setupMockSpeechRecognition();
      const handler = new DefaultSpeechInputHandler();
      
      expect(() => handler.stopListening()).not.toThrow();
    });

    it('should handle speech result with no alternatives', () => {
      const mock = setupMockSpeechRecognition();
      const handler = new DefaultSpeechInputHandler();
      const callback = jest.fn();
      handler.onSpeechDetected(callback);

      handler.startListening();
      
      if (mock.onresult) {
        mock.onresult({
          results: [],
          resultIndex: 0,
        });
      }

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle multiple callback registrations', () => {
      const mock = setupMockSpeechRecognition();
      const handler = new DefaultSpeechInputHandler();
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      handler.onSpeechDetected(callback1);
      handler.onSpeechDetected(callback2);

      handler.startListening();
      mock.simulateResult('Test');

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledWith('Test');
    });
  });
});
