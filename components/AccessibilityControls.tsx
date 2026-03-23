'use client';

/**
 * Accessibility Controls Component
 * Feature: ai-avatar-system
 * 
 * Provides accessibility options for users.
 * Validates: Requirements 13.1, 13.2, 13.3, 13.4, 13.5
 * Task 11.2: Implement accessibility features
 */

import { useState, useEffect } from 'react';

interface AccessibilityControlsProps {
  onTextOnlyModeChange?: (enabled: boolean) => void;
  onAnimationDisableChange?: (disabled: boolean) => void;
}

const STORAGE_KEY_TEXT_ONLY = 'ai-avatar-text-only-mode';
const STORAGE_KEY_ANIMATIONS = 'ai-avatar-animations-disabled';

export function AccessibilityControls({
  onTextOnlyModeChange,
  onAnimationDisableChange,
}: AccessibilityControlsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [textOnlyMode, setTextOnlyMode] = useState(false);
  const [animationsDisabled, setAnimationsDisabled] = useState(false);

  // Load preferences from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const textOnly = localStorage.getItem(STORAGE_KEY_TEXT_ONLY) === 'true';
      const animDisabled = localStorage.getItem(STORAGE_KEY_ANIMATIONS) === 'true';
      
      setTextOnlyMode(textOnly);
      setAnimationsDisabled(animDisabled);
      
      // Apply preferences
      if (textOnly) {
        onTextOnlyModeChange?.(true);
      }
      if (animDisabled) {
        onAnimationDisableChange?.(true);
        document.body.classList.add('reduce-motion');
      }
    }
  }, [onTextOnlyModeChange, onAnimationDisableChange]);

  const handleTextOnlyToggle = () => {
    const newValue = !textOnlyMode;
    setTextOnlyMode(newValue);
    localStorage.setItem(STORAGE_KEY_TEXT_ONLY, String(newValue));
    onTextOnlyModeChange?.(newValue);
  };

  const handleAnimationToggle = () => {
    const newValue = !animationsDisabled;
    setAnimationsDisabled(newValue);
    localStorage.setItem(STORAGE_KEY_ANIMATIONS, String(newValue));
    onAnimationDisableChange?.(newValue);
    
    // Apply CSS class to disable animations
    if (newValue) {
      document.body.classList.add('reduce-motion');
    } else {
      document.body.classList.remove('reduce-motion');
    }
  };

  return (
    <div className="accessibility-controls fixed top-4 right-4 z-50">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="accessibility-button p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        aria-label="Accessibility options"
        aria-expanded={isOpen}
        aria-controls="accessibility-menu"
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
            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          id="accessibility-menu"
          className="accessibility-menu absolute top-14 right-0 w-72 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl p-4 space-y-4"
          role="menu"
          aria-label="Accessibility options menu"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Accessibility Options
          </h3>

          {/* Text-Only Mode */}
          <div className="option-item">
            <label
              htmlFor="text-only-toggle"
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  Text-Only Mode
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Disable speech features and use text only
                </div>
              </div>
              <div className="ml-4">
                <input
                  id="text-only-toggle"
                  type="checkbox"
                  checked={textOnlyMode}
                  onChange={handleTextOnlyToggle}
                  className="sr-only"
                  role="switch"
                  aria-checked={textOnlyMode}
                />
                <div
                  className={`toggle-switch w-12 h-6 rounded-full transition-colors ${
                    textOnlyMode ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <div
                    className={`toggle-thumb w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                      textOnlyMode ? 'translate-x-6' : 'translate-x-1'
                    } mt-0.5`}
                  />
                </div>
              </div>
            </label>
          </div>

          {/* Disable Animations */}
          <div className="option-item">
            <label
              htmlFor="animation-toggle"
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  Reduce Motion
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Disable animations and transitions
                </div>
              </div>
              <div className="ml-4">
                <input
                  id="animation-toggle"
                  type="checkbox"
                  checked={animationsDisabled}
                  onChange={handleAnimationToggle}
                  className="sr-only"
                  role="switch"
                  aria-checked={animationsDisabled}
                />
                <div
                  className={`toggle-switch w-12 h-6 rounded-full transition-colors ${
                    animationsDisabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <div
                    className={`toggle-thumb w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                      animationsDisabled ? 'translate-x-6' : 'translate-x-1'
                    } mt-0.5`}
                  />
                </div>
              </div>
            </label>
          </div>

          {/* Keyboard Shortcuts Info */}
          <div className="keyboard-shortcuts border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Keyboard Shortcuts
            </h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Tab</kbd>
                {' '}Navigate between elements
              </li>
              <li>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Enter</kbd>
                {' '}Activate buttons
              </li>
              <li>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Esc</kbd>
                {' '}Close menus
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
