// Error interfaces
export type ErrorCategory = 'network' | 'service' | 'browser' | 'rendering' | 'data';

export interface SystemError {
  category: ErrorCategory;
  code: string;
  message: string;
  component: string;
  recoverable: boolean;
  originalError?: unknown;
}

export interface ErrorResponse {
  userMessage: string;
  fallbackAction?: () => void;
  retryable: boolean;
  logDetails: Record<string, unknown>;
}

/**
 * Centralized error handler
 */
export class ErrorHandler {
  /**
   * Handle a system error and return user-friendly response
   */
  static handleError(error: SystemError): ErrorResponse {
    // Log error to console
    this.logError(error);

    // Generate user-friendly response based on error category
    switch (error.category) {
      case 'network':
        return this.handleNetworkError(error);
      case 'service':
        return this.handleServiceError(error);
      case 'browser':
        return this.handleBrowserError(error);
      case 'rendering':
        return this.handleRenderingError(error);
      case 'data':
        return this.handleDataError(error);
      default:
        return this.handleUnknownError(error);
    }
  }

  /**
   * Handle network errors (failed API calls, timeout, connection issues)
   */
  private static handleNetworkError(error: SystemError): ErrorResponse {
    return {
      userMessage: 'Network connection issue. Please check your internet connection and try again.',
      retryable: true,
      logDetails: {
        category: error.category,
        code: error.code,
        component: error.component,
      },
    };
  }

  /**
   * Handle service errors (LLM service unavailable, rate limits exceeded)
   */
  private static handleServiceError(error: SystemError): ErrorResponse {
    if (error.code === 'RATE_LIMIT_EXCEEDED') {
      return {
        userMessage: 'Please wait a moment before sending another message.',
        retryable: true,
        logDetails: {
          category: error.category,
          code: error.code,
          component: error.component,
        },
      };
    }

    if (error.code === 'LLM_UNAVAILABLE') {
      return {
        userMessage: 'The AI service is temporarily unavailable. Please try again in a moment.',
        retryable: true,
        logDetails: {
          category: error.category,
          code: error.code,
          component: error.component,
        },
      };
    }

    return {
      userMessage: 'Service temporarily unavailable. Please try again later.',
      retryable: true,
      logDetails: {
        category: error.category,
        code: error.code,
        component: error.component,
      },
    };
  }

  /**
   * Handle browser API errors (Speech API not supported or failed)
   */
  private static handleBrowserError(error: SystemError): ErrorResponse {
    if (error.code === 'SPEECH_INPUT_UNSUPPORTED') {
      return {
        userMessage: 'Voice input is unavailable. Switching to text mode.',
        fallbackAction: () => {
          // Fallback to text input mode
          console.log('Switching to text-only mode');
        },
        retryable: false,
        logDetails: {
          category: error.category,
          code: error.code,
          component: error.component,
        },
      };
    }

    if (error.code === 'SPEECH_OUTPUT_FAILED') {
      return {
        userMessage: 'Voice output is unavailable. Displaying text response instead.',
        fallbackAction: () => {
          // Fallback to text-only output
          console.log('Switching to text-only output');
        },
        retryable: false,
        logDetails: {
          category: error.category,
          code: error.code,
          component: error.component,
        },
      };
    }

    return {
      userMessage: 'Browser feature unavailable. Some functionality may be limited.',
      retryable: false,
      logDetails: {
        category: error.category,
        code: error.code,
        component: error.component,
      },
    };
  }

  /**
   * Handle rendering errors (Avatar failed to load, animation errors)
   */
  private static handleRenderingError(error: SystemError): ErrorResponse {
    if (error.code === 'AVATAR_LOAD_FAILED') {
      return {
        userMessage: 'Avatar display unavailable. Continuing with text interaction.',
        fallbackAction: () => {
          // Display static avatar or continue without avatar
          console.log('Using fallback avatar display');
        },
        retryable: false,
        logDetails: {
          category: error.category,
          code: error.code,
          component: error.component,
        },
      };
    }

    return {
      userMessage: 'Display issue detected. Functionality continues normally.',
      retryable: false,
      logDetails: {
        category: error.category,
        code: error.code,
        component: error.component,
      },
    };
  }

  /**
   * Handle data errors (Invalid session data, corrupted local storage)
   */
  private static handleDataError(error: SystemError): ErrorResponse {
    if (error.code === 'SESSION_CORRUPTED') {
      return {
        userMessage: 'Starting a fresh conversation.',
        fallbackAction: () => {
          // Clear corrupted session data
          if (typeof window !== 'undefined') {
            localStorage.removeItem('ai_avatar_session');
          }
        },
        retryable: false,
        logDetails: {
          category: error.category,
          code: error.code,
          component: error.component,
        },
      };
    }

    return {
      userMessage: 'Data issue detected. Starting fresh.',
      retryable: false,
      logDetails: {
        category: error.category,
        code: error.code,
        component: error.component,
      },
    };
  }

  /**
   * Handle unknown errors
   */
  private static handleUnknownError(error: SystemError): ErrorResponse {
    return {
      userMessage: 'An unexpected error occurred. Please try again.',
      retryable: true,
      logDetails: {
        category: error.category,
        code: error.code,
        component: error.component,
        message: error.message,
      },
    };
  }

  /**
   * Log error to console with comprehensive details
   */
  private static logError(error: SystemError): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      component: error.component,
      category: error.category,
      code: error.code,
      message: error.message,
      recoverable: error.recoverable,
      originalError: error.originalError,
    };

    console.error('[ErrorHandler]', logEntry);
  }

  /**
   * Create a SystemError from a generic error
   */
  static createError(
    category: ErrorCategory,
    code: string,
    message: string,
    component: string,
    recoverable: boolean,
    originalError?: unknown
  ): SystemError {
    return {
      category,
      code,
      message,
      component,
      recoverable,
      originalError,
    };
  }
}

/**
 * Helper function to handle errors in components
 */
export function handleComponentError(
  error: unknown,
  component: string,
  category: ErrorCategory = 'network'
): ErrorResponse {
  const systemError = ErrorHandler.createError(
    category,
    'UNKNOWN_ERROR',
    error instanceof Error ? error.message : 'Unknown error occurred',
    component,
    true,
    error
  );

  return ErrorHandler.handleError(systemError);
}
