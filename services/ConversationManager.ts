/**
 * Conversation Manager
 * Feature: ai-avatar-system
 * 
 * Orchestrates LLM interactions and maintains conversation context.
 * Validates: Requirements 2.2, 2.3, 2.5, 10.2, 10.3, 11.1, 11.2
 */

export type UseCase = 'support' | 'sales' | 'education' | 'healthcare';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface ConversationResponse {
  message: string;
  conversationId: string;
  tokensUsed: number;
  latency?: number; // Request/response latency in milliseconds
}

export interface ConversationManager {
  // Initialize with use case configuration
  initialize(useCase: UseCase): Promise<void>;
  
  // Send a message and get response
  sendMessage(message: string): Promise<ConversationResponse>;
  
  // Get conversation history
  getHistory(): Message[];
  
  // Clear conversation and start fresh
  reset(): void;
  
  // Save/restore session
  saveSession(): void;
  restoreSession(): Promise<boolean>;
}

interface UseCaseConfig {
  systemPrompt: string;
  personality: string;
}

const USE_CASE_CONFIGS: Record<UseCase, UseCaseConfig> = {
  support: {
    systemPrompt: 'You are a helpful customer support assistant. Provide clear, concise answers to customer questions. Be empathetic and professional.',
    personality: 'helpful and empathetic',
  },
  sales: {
    systemPrompt: 'You are a knowledgeable sales assistant. Help customers understand products and make informed purchasing decisions. Be persuasive but not pushy.',
    personality: 'friendly and persuasive',
  },
  education: {
    systemPrompt: 'You are an educational tutor. Explain concepts clearly and encourage learning. Break down complex topics into understandable parts.',
    personality: 'patient and encouraging',
  },
  healthcare: {
    systemPrompt: 'You are a healthcare information assistant. Provide general health information while emphasizing the importance of consulting healthcare professionals. Be compassionate and clear.',
    personality: 'compassionate and professional',
  },
};

const MAX_CONTEXT_EXCHANGES = 10; // Rolling window of last 10 exchanges
const SESSION_STORAGE_KEY = 'ai-avatar-session';
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

interface SessionData {
  conversationId: string;
  useCase: UseCase;
  messages: Message[];
  createdAt: number;
  lastAccessedAt: number;
}

export class DefaultConversationManager implements ConversationManager {
  private conversationId: string;
  private useCase: UseCase = 'support';
  private messages: Message[] = [];
  private apiEndpoint = '/api/chat';
  private initialized = false;
  
  // Exponential backoff configuration
  private retryAttempts = 0;
  private maxRetries = 3;
  private baseDelay = 1000; // 1 second
  private maxDelay = 8000; // 8 seconds

  constructor() {
    this.conversationId = this.generateConversationId();
  }

  async initialize(useCase: UseCase): Promise<void> {
    this.useCase = useCase;
    
    // Add system prompt as first message
    const config = USE_CASE_CONFIGS[useCase];
    const systemMessage: Message = {
      id: this.generateMessageId(),
      role: 'system',
      content: config.systemPrompt,
      timestamp: Date.now(),
    };
    
    this.messages = [systemMessage];
    this.initialized = true;
  }

  async sendMessage(message: string): Promise<ConversationResponse> {
    if (!this.initialized) {
      throw new Error('ConversationManager not initialized. Call initialize() first.');
    }

    if (!message || message.trim().length === 0) {
      throw new Error('Message cannot be empty');
    }

    // Add user message to history
    const userMessage: Message = {
      id: this.generateMessageId(),
      role: 'user',
      content: message.trim(),
      timestamp: Date.now(),
    };
    
    this.messages.push(userMessage);

    // Get context window (system message + last 10 exchanges)
    const contextMessages = this.getContextWindow();

    try {
      // Call API with exponential backoff
      const response = await this.sendWithRetry(userMessage.content, contextMessages);

      // Add assistant response to history
      const assistantMessage: Message = {
        id: this.generateMessageId(),
        role: 'assistant',
        content: response.message,
        timestamp: Date.now(),
      };
      
      this.messages.push(assistantMessage);

      // Save session after each exchange
      this.saveSession();

      // Reset retry attempts on success
      this.retryAttempts = 0;

      return response;
    } catch (error) {
      // Remove the user message if request failed
      this.messages.pop();
      throw error;
    }
  }

  getHistory(): Message[] {
    // Return all messages except system message
    return this.messages.filter(msg => msg.role !== 'system');
  }

  reset(): void {
    const systemMessage = this.messages.find(msg => msg.role === 'system');
    this.messages = systemMessage ? [systemMessage] : [];
    this.conversationId = this.generateConversationId();
    
    // Clear session storage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }

  saveSession(): void {
    if (typeof window === 'undefined') {
      return; // Not in browser environment
    }

    const sessionData: SessionData = {
      conversationId: this.conversationId,
      useCase: this.useCase,
      messages: this.messages,
      createdAt: this.messages[0]?.timestamp || Date.now(),
      lastAccessedAt: Date.now(),
    };

    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
    } catch (error) {
      console.error('Failed to save session to localStorage:', error);
    }
  }

  async restoreSession(): Promise<boolean> {
    if (typeof window === 'undefined') {
      return false; // Not in browser environment
    }

    try {
      const storedData = localStorage.getItem(SESSION_STORAGE_KEY);
      
      if (!storedData) {
        return false;
      }

      const sessionData: SessionData = JSON.parse(storedData);

      // Check if session has expired (24 hours)
      const now = Date.now();
      const sessionAge = now - sessionData.lastAccessedAt;
      
      if (sessionAge > SESSION_EXPIRY_MS) {
        // Session expired, clear it
        localStorage.removeItem(SESSION_STORAGE_KEY);
        return false;
      }

      // Restore session data
      this.conversationId = sessionData.conversationId;
      this.useCase = sessionData.useCase;
      this.messages = sessionData.messages;
      this.initialized = true;

      // Update last accessed time
      this.saveSession();

      return true;
    } catch (error) {
      console.error('Failed to restore session from localStorage:', error);
      // Clear corrupted data
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return false;
    }
  }

  /**
   * Get context window for API call
   * Returns system message + last 10 exchanges (20 messages: 10 user + 10 assistant)
   */
  private getContextWindow(): Message[] {
    const systemMessage = this.messages.find(msg => msg.role === 'system');
    const conversationMessages = this.messages.filter(msg => msg.role !== 'system');
    
    // Take last N exchanges (each exchange = user + assistant message)
    // We want last 10 exchanges, which is up to 20 messages
    const maxMessages = MAX_CONTEXT_EXCHANGES * 2;
    const recentMessages = conversationMessages.slice(-maxMessages);
    
    return systemMessage ? [systemMessage, ...recentMessages] : recentMessages;
  }

  /**
   * Send API request with exponential backoff retry logic
   * Implements retry for rate limiting (429) and server errors (5xx)
   */
  private async sendWithRetry(
    message: string,
    history: Message[]
  ): Promise<ConversationResponse> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        // Track request latency
        const startTime = Date.now();

        const response = await fetch(this.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message,
            conversationId: this.conversationId,
            history,
            useCase: this.useCase,
          }),
        });

        const latency = Date.now() - startTime;

        // Handle rate limiting (429) with exponential backoff
        if (response.status === 429) {
          if (attempt < this.maxRetries) {
            const delay = this.calculateBackoffDelay(attempt);
            console.warn(`Rate limited. Retrying in ${delay}ms (attempt ${attempt + 1}/${this.maxRetries})`);
            await this.sleep(delay);
            continue;
          }
          throw new Error('Rate limit exceeded. Please try again later.');
        }

        // Handle server errors (5xx) with exponential backoff
        if (response.status >= 500 && response.status < 600) {
          if (attempt < this.maxRetries) {
            const delay = this.calculateBackoffDelay(attempt);
            console.warn(`Server error (${response.status}). Retrying in ${delay}ms (attempt ${attempt + 1}/${this.maxRetries})`);
            await this.sleep(delay);
            continue;
          }
          throw new Error(`LLM service unavailable (status ${response.status}). Please try again later.`);
        }

        // Handle other error responses
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`API request failed with status ${response.status}: ${errorText}`);
        }

        // Success - parse response
        const data = await response.json();

        return {
          message: data.message,
          conversationId: this.conversationId,
          tokensUsed: data.tokensUsed || 0,
          latency,
        };
      } catch (error) {
        lastError = error as Error;

        // Network errors - retry with backoff
        if (error instanceof TypeError && error.message.includes('fetch')) {
          if (attempt < this.maxRetries) {
            const delay = this.calculateBackoffDelay(attempt);
            console.warn(`Network error. Retrying in ${delay}ms (attempt ${attempt + 1}/${this.maxRetries})`);
            await this.sleep(delay);
            continue;
          }
        }

        // Non-retryable errors - throw immediately
        throw error;
      }
    }

    // All retries exhausted
    throw lastError || new Error('Request failed after all retry attempts');
  }

  /**
   * Calculate exponential backoff delay with jitter
   * Formula: min(maxDelay, baseDelay * 2^attempt) + random jitter
   */
  private calculateBackoffDelay(attempt: number): number {
    const exponentialDelay = this.baseDelay * Math.pow(2, attempt);
    const cappedDelay = Math.min(exponentialDelay, this.maxDelay);
    
    // Add random jitter (0-25% of delay) to prevent thundering herd
    const jitter = Math.random() * cappedDelay * 0.25;
    
    return Math.floor(cappedDelay + jitter);
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateConversationId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}
