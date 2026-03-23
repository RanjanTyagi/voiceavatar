import { ErrorHandler, handleComponentError, type SystemError } from '../errorHandler';

describe('ErrorHandler', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('handleError', () => {
    it('should handle network errors', () => {
      const error: SystemError = {
        category: 'network',
        code: 'CONNECTION_FAILED',
        message: 'Network connection failed',
        component: 'ConversationManager',
        recoverable: true,
      };

      const response = ErrorHandler.handleError(error);

      expect(response.userMessage).toContain('Network connection issue');
      expect(response.retryable).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should handle rate limit exceeded errors', () => {
      const error: SystemError = {
        category: 'service',
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded',
        component: 'API',
        recoverable: true,
      };

      const response = ErrorHandler.handleError(error);

      expect(response.userMessage).toContain('wait a moment');
      expect(response.retryable).toBe(true);
    });

    it('should handle LLM service unavailable errors', () => {
      const error: SystemError = {
        category: 'service',
        code: 'LLM_UNAVAILABLE',
        message: 'LLM service is down',
        component: 'ConversationManager',
        recoverable: true,
      };

      const response = ErrorHandler.handleError(error);

      expect(response.userMessage).toContain('AI service is temporarily unavailable');
      expect(response.retryable).toBe(true);
    });

    it('should handle speech input unsupported errors with fallback', () => {
      const error: SystemError = {
        category: 'browser',
        code: 'SPEECH_INPUT_UNSUPPORTED',
        message: 'Speech recognition not supported',
        component: 'SpeechInputHandler',
        recoverable: false,
      };

      const response = ErrorHandler.handleError(error);

      expect(response.userMessage).toContain('Voice input is unavailable');
      expect(response.fallbackAction).toBeDefined();
      expect(response.retryable).toBe(false);
    });

    it('should handle speech output failed errors with fallback', () => {
      const error: SystemError = {
        category: 'browser',
        code: 'SPEECH_OUTPUT_FAILED',
        message: 'Speech synthesis failed',
        component: 'SpeechOutputHandler',
        recoverable: false,
      };

      const response = ErrorHandler.handleError(error);

      expect(response.userMessage).toContain('Voice output is unavailable');
      expect(response.fallbackAction).toBeDefined();
      expect(response.retryable).toBe(false);
    });

    it('should handle avatar load failed errors with fallback', () => {
      const error: SystemError = {
        category: 'rendering',
        code: 'AVATAR_LOAD_FAILED',
        message: 'Failed to load avatar',
        component: 'AvatarRenderer',
        recoverable: false,
      };

      const response = ErrorHandler.handleError(error);

      expect(response.userMessage).toContain('Avatar display unavailable');
      expect(response.fallbackAction).toBeDefined();
      expect(response.retryable).toBe(false);
    });

    it('should handle session corrupted errors with fallback', () => {
      const error: SystemError = {
        category: 'data',
        code: 'SESSION_CORRUPTED',
        message: 'Session data is corrupted',
        component: 'SessionManager',
        recoverable: false,
      };

      const response = ErrorHandler.handleError(error);

      expect(response.userMessage).toContain('Starting a fresh conversation');
      expect(response.fallbackAction).toBeDefined();
      expect(response.retryable).toBe(false);
    });

    it('should log all errors to console', () => {
      const error: SystemError = {
        category: 'network',
        code: 'TEST_ERROR',
        message: 'Test error message',
        component: 'TestComponent',
        recoverable: true,
      };

      ErrorHandler.handleError(error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ErrorHandler]',
        expect.objectContaining({
          component: 'TestComponent',
          category: 'network',
          code: 'TEST_ERROR',
          message: 'Test error message',
          recoverable: true,
        })
      );
    });
  });

  describe('createError', () => {
    it('should create a SystemError object', () => {
      const error = ErrorHandler.createError(
        'network',
        'TEST_CODE',
        'Test message',
        'TestComponent',
        true,
        new Error('Original error')
      );

      expect(error.category).toBe('network');
      expect(error.code).toBe('TEST_CODE');
      expect(error.message).toBe('Test message');
      expect(error.component).toBe('TestComponent');
      expect(error.recoverable).toBe(true);
      expect(error.originalError).toBeInstanceOf(Error);
    });
  });

  describe('handleComponentError', () => {
    it('should handle Error instances', () => {
      const originalError = new Error('Test error');
      const response = handleComponentError(originalError, 'TestComponent', 'network');

      expect(response.userMessage).toBeDefined();
      expect(response.retryable).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should handle non-Error objects', () => {
      const response = handleComponentError('String error', 'TestComponent', 'service');

      expect(response.userMessage).toBeDefined();
      expect(response.retryable).toBe(true);
    });

    it('should use default category if not specified', () => {
      const response = handleComponentError(new Error('Test'), 'TestComponent');

      expect(response.userMessage).toContain('Network connection issue');
    });
  });

  describe('fallback actions', () => {
    it('should execute fallback action for session corrupted error', () => {
      const localStorageMock = {
        removeItem: jest.fn(),
      };
      Object.defineProperty(global, 'localStorage', {
        value: localStorageMock,
        writable: true,
      });

      const error: SystemError = {
        category: 'data',
        code: 'SESSION_CORRUPTED',
        message: 'Session corrupted',
        component: 'SessionManager',
        recoverable: false,
      };

      const response = ErrorHandler.handleError(error);
      response.fallbackAction?.();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('ai_avatar_session');
    });
  });
});
