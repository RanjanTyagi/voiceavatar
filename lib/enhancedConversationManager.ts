/**
 * Enhanced Conversation Manager with Usage Tracking and Caching
 * Feature: ai-avatar-system
 * 
 * Wraps ConversationManager with usage tracking and caching capabilities.
 * Task 12.1, 12.4: Usage tracking and client-side caching integration
 */

import { DefaultConversationManager, type UseCase, type Message, type ConversationResponse } from '@/services/ConversationManager';
import { UsageTracker, getUsageLimitsFromEnv } from './usageTracking';
import { getApiCache } from './apiCache';

export class EnhancedConversationManager {
  private conversationManager: DefaultConversationManager;
  private usageTracker: UsageTracker;
  private cache = getApiCache();

  constructor() {
    this.conversationManager = new DefaultConversationManager();
    this.usageTracker = new UsageTracker(getUsageLimitsFromEnv());
  }

  async initialize(useCase: UseCase): Promise<void> {
    return this.conversationManager.initialize(useCase);
  }

  async sendMessage(message: string): Promise<ConversationResponse> {
    // Check usage caps before sending
    const usageCheck = this.usageTracker.isUsageCapExceeded();
    if (usageCheck.exceeded) {
      throw new Error(usageCheck.reason || 'Usage limit exceeded');
    }

    // Check cache for identical recent requests (unlikely but possible)
    const cacheKey = { message, history: this.getHistory() };
    const cached = this.cache.get<ConversationResponse>('/api/chat', cacheKey);
    
    if (cached) {
      console.log('Returning cached response');
      return cached;
    }

    // Send message
    const startTime = Date.now();
    const response = await this.conversationManager.sendMessage(message);
    const latency = Date.now() - startTime;

    // Track usage
    this.usageTracker.recordApiCall(response.tokensUsed, '/api/chat', latency);

    // Cache response (short validity for conversation context)
    this.cache.set('/api/chat', cacheKey, response);

    return response;
  }

  getHistory(): Message[] {
    return this.conversationManager.getHistory();
  }

  reset(): void {
    this.conversationManager.reset();
    this.cache.clear();
  }

  saveSession(): void {
    this.conversationManager.saveSession();
  }

  async restoreSession(): Promise<boolean> {
    return this.conversationManager.restoreSession();
  }

  getUsageTracker(): UsageTracker {
    return this.usageTracker;
  }

  getUsageSummary() {
    return this.usageTracker.getUsageSummary();
  }
}
