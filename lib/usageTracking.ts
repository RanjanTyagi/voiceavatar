/**
 * Usage Tracking System
 * Feature: ai-avatar-system
 * 
 * Tracks API usage, token consumption, and enforces usage caps.
 * Validates: Requirements 14.1, 14.2, 14.3, 14.4, 14.5
 * Task 12.1: Create usage tracking system
 */

const STORAGE_KEY = 'ai-avatar-usage';

export interface UsageMetrics {
  sessionId: string;
  apiCalls: number;
  totalTokens: number;
  dailyTokens: number;
  monthlyTokens: number;
  lastResetDate: string; // ISO date string
  lastResetMonth: string; // YYYY-MM format
  callHistory: UsageRecord[];
}

export interface UsageRecord {
  timestamp: number;
  tokensUsed: number;
  latency?: number;
  endpoint: string;
}

export interface UsageLimits {
  maxMessagesPerMinute: number;
  maxTokensPerDay: number;
  maxTokensPerMonth?: number;
}

const DEFAULT_LIMITS: UsageLimits = {
  maxMessagesPerMinute: 10,
  maxTokensPerDay: 10000,
  maxTokensPerMonth: 100000,
};

export class UsageTracker {
  private metrics: UsageMetrics;
  private limits: UsageLimits;

  constructor(limits?: Partial<UsageLimits>) {
    this.limits = { ...DEFAULT_LIMITS, ...limits };
    this.metrics = this.loadMetrics();
    this.checkAndResetPeriods();
  }

  /**
   * Load metrics from localStorage
   */
  private loadMetrics(): UsageMetrics {
    if (typeof window === 'undefined') {
      return this.createEmptyMetrics();
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load usage metrics:', error);
    }

    return this.createEmptyMetrics();
  }

  /**
   * Save metrics to localStorage
   */
  private saveMetrics(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.metrics));
    } catch (error) {
      console.error('Failed to save usage metrics:', error);
    }
  }

  /**
   * Create empty metrics object
   */
  private createEmptyMetrics(): UsageMetrics {
    const now = new Date();
    return {
      sessionId: this.generateSessionId(),
      apiCalls: 0,
      totalTokens: 0,
      dailyTokens: 0,
      monthlyTokens: 0,
      lastResetDate: now.toISOString().split('T')[0],
      lastResetMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      callHistory: [],
    };
  }

  /**
   * Check if daily or monthly periods need to be reset
   */
  private checkAndResetPeriods(): void {
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let needsSave = false;

    // Reset daily tokens if date changed
    if (this.metrics.lastResetDate !== currentDate) {
      this.metrics.dailyTokens = 0;
      this.metrics.lastResetDate = currentDate;
      needsSave = true;
    }

    // Reset monthly tokens if month changed
    if (this.metrics.lastResetMonth !== currentMonth) {
      this.metrics.monthlyTokens = 0;
      this.metrics.lastResetMonth = currentMonth;
      needsSave = true;
    }

    if (needsSave) {
      this.saveMetrics();
    }
  }

  /**
   * Record an API call with token usage
   */
  recordApiCall(tokensUsed: number, endpoint: string, latency?: number): void {
    const record: UsageRecord = {
      timestamp: Date.now(),
      tokensUsed,
      latency,
      endpoint,
    };

    this.metrics.apiCalls++;
    this.metrics.totalTokens += tokensUsed;
    this.metrics.dailyTokens += tokensUsed;
    this.metrics.monthlyTokens += tokensUsed;
    this.metrics.callHistory.push(record);

    // Keep only last 100 records to prevent storage bloat
    if (this.metrics.callHistory.length > 100) {
      this.metrics.callHistory = this.metrics.callHistory.slice(-100);
    }

    this.saveMetrics();
  }

  /**
   * Check if rate limit is exceeded (messages per minute)
   */
  isRateLimitExceeded(): boolean {
    const oneMinuteAgo = Date.now() - 60000;
    const recentCalls = this.metrics.callHistory.filter(
      (record) => record.timestamp > oneMinuteAgo
    );

    return recentCalls.length >= this.limits.maxMessagesPerMinute;
  }

  /**
   * Check if daily token limit is exceeded
   */
  isDailyLimitExceeded(): boolean {
    return this.metrics.dailyTokens >= this.limits.maxTokensPerDay;
  }

  /**
   * Check if monthly token limit is exceeded
   */
  isMonthlyLimitExceeded(): boolean {
    if (!this.limits.maxTokensPerMonth) {
      return false;
    }
    return this.metrics.monthlyTokens >= this.limits.maxTokensPerMonth;
  }

  /**
   * Check if any usage cap is exceeded
   */
  isUsageCapExceeded(): { exceeded: boolean; reason?: string } {
    if (this.isRateLimitExceeded()) {
      return {
        exceeded: true,
        reason: `Rate limit exceeded. Please wait before sending another message. (Limit: ${this.limits.maxMessagesPerMinute} messages per minute)`,
      };
    }

    if (this.isDailyLimitExceeded()) {
      return {
        exceeded: true,
        reason: `Daily usage limit reached. Please try again tomorrow. (Limit: ${this.limits.maxTokensPerDay} tokens per day)`,
      };
    }

    if (this.isMonthlyLimitExceeded()) {
      return {
        exceeded: true,
        reason: `Monthly usage limit reached. Please try again next month. (Limit: ${this.limits.maxTokensPerMonth} tokens per month)`,
      };
    }

    return { exceeded: false };
  }

  /**
   * Get current usage metrics
   */
  getMetrics(): UsageMetrics {
    this.checkAndResetPeriods();
    return { ...this.metrics };
  }

  /**
   * Get usage summary
   */
  getUsageSummary(): {
    apiCalls: number;
    totalTokens: number;
    dailyTokens: number;
    dailyLimit: number;
    dailyPercentage: number;
    monthlyTokens: number;
    monthlyLimit: number;
    monthlyPercentage: number;
    recentCallsPerMinute: number;
    rateLimit: number;
  } {
    this.checkAndResetPeriods();

    const oneMinuteAgo = Date.now() - 60000;
    const recentCalls = this.metrics.callHistory.filter(
      (record) => record.timestamp > oneMinuteAgo
    ).length;

    return {
      apiCalls: this.metrics.apiCalls,
      totalTokens: this.metrics.totalTokens,
      dailyTokens: this.metrics.dailyTokens,
      dailyLimit: this.limits.maxTokensPerDay,
      dailyPercentage: (this.metrics.dailyTokens / this.limits.maxTokensPerDay) * 100,
      monthlyTokens: this.metrics.monthlyTokens,
      monthlyLimit: this.limits.maxTokensPerMonth || 0,
      monthlyPercentage: this.limits.maxTokensPerMonth
        ? (this.metrics.monthlyTokens / this.limits.maxTokensPerMonth) * 100
        : 0,
      recentCallsPerMinute: recentCalls,
      rateLimit: this.limits.maxMessagesPerMinute,
    };
  }

  /**
   * Reset all metrics (for testing or manual reset)
   */
  reset(): void {
    this.metrics = this.createEmptyMetrics();
    this.saveMetrics();
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}

/**
 * Get usage limits from environment variables
 */
export function getUsageLimitsFromEnv(): UsageLimits {
  const limits: UsageLimits = { ...DEFAULT_LIMITS };

  if (typeof process !== 'undefined') {
    if (process.env.MAX_MESSAGES_PER_MINUTE) {
      limits.maxMessagesPerMinute = Number.parseInt(process.env.MAX_MESSAGES_PER_MINUTE, 10);
    }
    if (process.env.MAX_TOKENS_PER_DAY) {
      limits.maxTokensPerDay = Number.parseInt(process.env.MAX_TOKENS_PER_DAY, 10);
    }
    if (process.env.MAX_TOKENS_PER_MONTH) {
      limits.maxTokensPerMonth = Number.parseInt(process.env.MAX_TOKENS_PER_MONTH, 10);
    }
  }

  return limits;
}
