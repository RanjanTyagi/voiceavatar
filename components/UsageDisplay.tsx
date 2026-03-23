'use client';

/**
 * Usage Display Component
 * Feature: ai-avatar-system
 * 
 * Displays usage metrics and limits to users.
 * Validates: Requirements 14.1, 14.3, 14.5
 */

import { useState, useEffect } from 'react';
import type { UsageTracker } from '@/lib/usageTracking';

interface UsageDisplayProps {
  usageTracker: UsageTracker | null;
}

export function UsageDisplay({ usageTracker }: UsageDisplayProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [summary, setSummary] = useState<ReturnType<UsageTracker['getUsageSummary']> | null>(null);

  useEffect(() => {
    if (!usageTracker) return;

    const updateSummary = () => {
      setSummary(usageTracker.getUsageSummary());
    };

    updateSummary();
    const interval = setInterval(updateSummary, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [usageTracker]);

  if (!summary) return null;

  const getDailyUsageColor = () => {
    if (summary.dailyPercentage >= 90) return 'text-red-600 dark:text-red-400';
    if (summary.dailyPercentage >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getRateColor = () => {
    const percentage = (summary.recentCallsPerMinute / summary.rateLimit) * 100;
    if (percentage >= 90) return 'text-red-600 dark:text-red-400';
    if (percentage >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  return (
    <div className="usage-display fixed bottom-4 right-4 z-40">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="usage-button p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        aria-label="Usage statistics"
        aria-expanded={isOpen}
      >
        <svg
          className="w-6 h-6 text-gray-700 dark:text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="usage-panel absolute bottom-14 right-0 w-80 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl p-4 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Usage Statistics
          </h3>

          {/* Daily Usage */}
          <div className="usage-metric">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Daily Tokens
              </span>
              <span className={`text-sm font-semibold ${getDailyUsageColor()}`}>
                {summary.dailyTokens.toLocaleString()} / {summary.dailyLimit.toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  summary.dailyPercentage >= 90
                    ? 'bg-red-600'
                    : summary.dailyPercentage >= 70
                    ? 'bg-yellow-600'
                    : 'bg-green-600'
                }`}
                style={{ width: `${Math.min(summary.dailyPercentage, 100)}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {summary.dailyPercentage.toFixed(1)}% used
            </span>
          </div>

          {/* Rate Limit */}
          <div className="usage-metric">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Rate (per minute)
              </span>
              <span className={`text-sm font-semibold ${getRateColor()}`}>
                {summary.recentCallsPerMinute} / {summary.rateLimit}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  (summary.recentCallsPerMinute / summary.rateLimit) * 100 >= 90
                    ? 'bg-red-600'
                    : (summary.recentCallsPerMinute / summary.rateLimit) * 100 >= 70
                    ? 'bg-yellow-600'
                    : 'bg-green-600'
                }`}
                style={{
                  width: `${Math.min((summary.recentCallsPerMinute / summary.rateLimit) * 100, 100)}%`,
                }}
              />
            </div>
          </div>

          {/* Monthly Usage (if enabled) */}
          {summary.monthlyLimit > 0 && (
            <div className="usage-metric">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Monthly Tokens
                </span>
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                  {summary.monthlyTokens.toLocaleString()} / {summary.monthlyLimit.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(summary.monthlyPercentage, 100)}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {summary.monthlyPercentage.toFixed(1)}% used
              </span>
            </div>
          )}

          {/* Total Stats */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Total API Calls:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {summary.apiCalls}
              </span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-600 dark:text-gray-400">Total Tokens:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {summary.totalTokens.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
