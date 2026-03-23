'use client';

/**
 * Chat Interface Component
 * Feature: ai-avatar-system
 * 
 * Main chat interface with message display, text input, and speech controls.
 * Validates: Requirements 2.4, 3.2, 4.4, 8.4, 8.5
 */

import { useState, useRef, useEffect } from 'react';
import type { Message } from '@/services/ConversationManager';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string) => Promise<void>;
  onStartListening: () => void;
  onStopListening: () => void;
  onPauseSpeech: () => void;
  onResumeSpeech: () => void;
  onStopSpeech: () => void;
  isListening: boolean;
  isSpeaking: boolean;
  isLoading: boolean;
  speechSupported: boolean;
  error?: string;
}

export function ChatInterface({
  messages,
  onSendMessage,
  onStartListening,
  onStopListening,
  onPauseSpeech,
  onResumeSpeech,
  onStopSpeech,
  isListening,
  isSpeaking,
  isLoading,
  speechSupported,
  error,
}: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('');
  const [showLoadingIndicator, setShowLoadingIndicator] = useState(false);
  const [showTimeoutMessage, setShowTimeoutMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle loading indicators with 1-second threshold
  useEffect(() => {
    if (isLoading) {
      // Show loading indicator after 1 second
      loadingTimerRef.current = setTimeout(() => {
        setShowLoadingIndicator(true);
      }, 1000);

      // Show timeout message after 10 seconds
      timeoutTimerRef.current = setTimeout(() => {
        setShowTimeoutMessage(true);
      }, 10000);
    } else {
      // Clear timers and hide indicators
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
      if (timeoutTimerRef.current) {
        clearTimeout(timeoutTimerRef.current);
        timeoutTimerRef.current = null;
      }
      setShowLoadingIndicator(false);
      setShowTimeoutMessage(false);
    }

    return () => {
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
    };
  }, [isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim() || isLoading) {
      return;
    }

    const message = inputValue.trim();
    setInputValue('');
    
    try {
      await onSendMessage(message);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleMicrophoneClick = () => {
    if (isListening) {
      onStopListening();
    } else {
      onStartListening();
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-interface flex flex-col h-full">
      {/* Message Display */}
      <div className="messages-container flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="empty-state text-center text-gray-500 py-8">
            <p>Start a conversation by typing a message or using voice input.</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.role === 'user' ? 'message-user' : 'message-assistant'} flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`message-bubble max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100'
              }`}
            >
              <p className="message-content whitespace-pre-wrap break-words">
                {message.content}
              </p>
              <span className="message-timestamp text-xs opacity-70 mt-1 block">
                {formatTimestamp(message.timestamp)}
              </span>
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {showLoadingIndicator && (
          <div className="loading-indicator flex justify-start">
            <div className="message-bubble max-w-[80%] rounded-lg p-3 bg-gray-200 dark:bg-gray-700">
              <div className="flex items-center space-x-2">
                <div className="animate-pulse flex space-x-1">
                  <div className="w-2 h-2 bg-gray-500 rounded-full" />
                  <div className="w-2 h-2 bg-gray-500 rounded-full" />
                  <div className="w-2 h-2 bg-gray-500 rounded-full" />
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Thinking...
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Timeout Message */}
        {showTimeoutMessage && (
          <div className="timeout-message flex justify-center">
            <div className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-lg p-3 text-sm">
              This is taking longer than expected. Please wait or try again.
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="error-message flex justify-center">
            <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-lg p-3 text-sm">
              {error}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Speech Playback Controls */}
      {isSpeaking && (
        <div className="speech-controls flex items-center justify-center gap-2 p-2 bg-gray-100 dark:bg-gray-800 border-t border-gray-300 dark:border-gray-700">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Speaking...
          </span>
          <button
            type="button"
            onClick={onPauseSpeech}
            className="control-button px-3 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600"
            aria-label="Pause speech"
          >
            Pause
          </button>
          <button
            type="button"
            onClick={onResumeSpeech}
            className="control-button px-3 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600"
            aria-label="Resume speech"
          >
            Resume
          </button>
          <button
            type="button"
            onClick={onStopSpeech}
            className="control-button px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
            aria-label="Stop speech"
          >
            Stop
          </button>
        </div>
      )}

      {/* Input Area */}
      <form
        onSubmit={handleSubmit}
        className="input-area flex items-center gap-2 p-4 bg-white dark:bg-gray-900 border-t border-gray-300 dark:border-gray-700"
      >
        {/* Microphone Button */}
        {speechSupported && (
          <button
            type="button"
            onClick={handleMicrophoneClick}
            className={`microphone-button p-3 rounded-full transition-colors ${
              isListening
                ? 'bg-red-600 text-white animate-pulse'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
            aria-label={isListening ? 'Stop listening' : 'Start voice input'}
            aria-pressed={isListening}
            disabled={isLoading}
          >
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}

        {/* Text Input */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={isListening ? 'Listening...' : 'Type your message...'}
          className="text-input flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          disabled={isLoading || isListening}
          aria-label="Message input"
        />

        {/* Send Button */}
        <button
          type="submit"
          disabled={!inputValue.trim() || isLoading}
          className="send-button px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          aria-label="Send message"
        >
          Send
        </button>
      </form>

      {/* Listening Indicator */}
      {isListening && (
        <div
          className="listening-indicator absolute top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2"
          role="status"
          aria-live="polite"
        >
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="text-sm font-medium">Listening...</span>
        </div>
      )}
    </div>
  );
}
