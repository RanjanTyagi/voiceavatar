'use client';

/**
 * Use Case Selector Component
 * Feature: ai-avatar-system
 * 
 * Allows runtime switching between use case configurations.
 * Validates: Requirements 11.5
 * Task 14.1: Runtime configuration switching
 */

import { useState } from 'react';
import type { UseCase } from '@/services/ConversationManager';
import { USE_CASE_PROFILES, getAvailableUseCases } from '@/lib/useCaseConfig';

interface UseCaseSelectorProps {
  currentUseCase: UseCase;
  onUseCaseChange: (useCase: UseCase) => void;
  disabled?: boolean;
}

export function UseCaseSelector({
  currentUseCase,
  onUseCaseChange,
  disabled = false,
}: UseCaseSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const availableUseCases = getAvailableUseCases();
  const currentProfile = USE_CASE_PROFILES[currentUseCase];

  const handleSelect = (useCase: UseCase) => {
    if (useCase !== currentUseCase && !disabled) {
      onUseCaseChange(useCase);
      setIsOpen(false);
    }
  };

  return (
    <div className="use-case-selector relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="selector-button flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label="Select use case"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {currentProfile.displayName}
        </span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="selector-dropdown absolute top-12 left-0 w-64 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl z-50"
          role="listbox"
          aria-label="Use case options"
        >
          {availableUseCases.map((useCase) => {
            const profile = USE_CASE_PROFILES[useCase];
            const isSelected = useCase === currentUseCase;

            return (
              <button
                key={useCase}
                type="button"
                onClick={() => handleSelect(useCase)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                  isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
                role="option"
                aria-selected={isSelected}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {profile.displayName}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {profile.personality}
                    </div>
                  </div>
                  {isSelected && (
                    <svg
                      className="w-5 h-5 text-blue-600 dark:text-blue-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
