'use client';

/**
 * Avatar Chat Container
 * Feature: ai-avatar-system
 * 
 * Main container that wires all components together.
 * Validates: Requirements 2.1, 2.4, 3.4, 4.2, 5.1, 5.2, 5.3
 * Task 15.1: Wire all components together
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Avatar } from './avatar/Avatar';
import { ChatInterface } from './chat/ChatInterface';
import { DefaultConversationManager, type UseCase, type Message } from '@/services/ConversationManager';
import { DefaultSpeechInputHandler } from '@/services/SpeechInputHandler';
import { DefaultSpeechOutputHandler } from '@/services/SpeechOutputHandler';
import { DefaultExpressionController, type SystemState } from '@/services/ExpressionController';
import type { Expression } from './avatar/types';

interface AvatarChatProps {
  useCase?: UseCase;
  enableFallbackTTS?: boolean;
}

export function AvatarChat({ 
  useCase = 'support',
  enableFallbackTTS = false 
}: AvatarChatProps) {
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentExpression, setCurrentExpression] = useState<Expression>('neutral');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [speechSupported, setSpeechSupported] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Service instances
  const conversationManagerRef = useRef<DefaultConversationManager | null>(null);
  const speechInputHandlerRef = useRef<DefaultSpeechInputHandler | null>(null);
  const speechOutputHandlerRef = useRef<DefaultSpeechOutputHandler | null>(null);
  const expressionControllerRef = useRef<DefaultExpressionController | null>(null);

  // Initialize services
  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Initialize Conversation Manager
        const conversationManager = new DefaultConversationManager();
        
        // Try to restore session first
        const restored = await conversationManager.restoreSession();
        
        if (!restored) {
          // No session to restore, initialize with use case
          await conversationManager.initialize(useCase);
        }
        
        conversationManagerRef.current = conversationManager;
        
        // Load conversation history
        setMessages(conversationManager.getHistory());

        // Initialize Speech Input Handler
        const speechInputHandler = new DefaultSpeechInputHandler();
        speechInputHandlerRef.current = speechInputHandler;
        setSpeechSupported(speechInputHandler.isSupported());

        // Set up speech input callbacks
        speechInputHandler.onSpeechDetected((text) => {
          handleSendMessage(text);
        });

        speechInputHandler.onError((error) => {
          console.error('Speech input error:', error);
          setError(error.message);
          setIsListening(false);
        });

        speechInputHandler.onListeningStateChange((listening) => {
          setIsListening(listening);
          if (listening) {
            updateSystemState('listening');
          } else {
            updateSystemState('idle');
          }
        });

        // Initialize Speech Output Handler
        const speechOutputHandler = new DefaultSpeechOutputHandler(enableFallbackTTS);
        speechOutputHandlerRef.current = speechOutputHandler;

        // Set up speech output callbacks
        speechOutputHandler.onSpeechStart(() => {
          setIsSpeaking(true);
          updateSystemState('speaking');
        });

        speechOutputHandler.onSpeechEnd(() => {
          setIsSpeaking(false);
          updateSystemState('idle');
        });

        speechOutputHandler.onError((error) => {
          console.error('Speech output error:', error);
          setError(error.message);
          setIsSpeaking(false);
        });

        // Initialize Expression Controller
        const expressionController = new DefaultExpressionController((expression) => {
          setCurrentExpression(expression);
        });
        expressionControllerRef.current = expressionController;

        setInitialized(true);
      } catch (error) {
        console.error('Failed to initialize services:', error);
        setError('Failed to initialize the avatar system. Please refresh the page.');
      }
    };

    initializeServices();

    // Cleanup
    return () => {
      expressionControllerRef.current?.dispose();
    };
  }, [useCase, enableFallbackTTS]);

  // Update system state and expression
  const updateSystemState = useCallback((state: SystemState) => {
    expressionControllerRef.current?.setStateExpression(state);
  }, []);

  // Handle sending messages
  const handleSendMessage = useCallback(async (message: string) => {
    if (!conversationManagerRef.current || isLoading) {
      return;
    }

    setError(undefined);
    setIsLoading(true);
    updateSystemState('thinking');

    try {
      // Send message to conversation manager
      const response = await conversationManagerRef.current.sendMessage(message);

      // Update messages
      setMessages(conversationManagerRef.current.getHistory());

      // Speak the response if speech output is supported
      if (speechOutputHandlerRef.current?.isSupported()) {
        try {
          await speechOutputHandlerRef.current.speak(response.message);
        } catch (speechError) {
          console.error('Speech output failed:', speechError);
          // Continue even if speech fails - text is still displayed
        }
      }

      setIsLoading(false);
      updateSystemState('idle');
    } catch (error) {
      console.error('Failed to send message:', error);
      setError(error instanceof Error ? error.message : 'Failed to send message. Please try again.');
      setIsLoading(false);
      updateSystemState('idle');
    }
  }, [isLoading, updateSystemState]);

  // Speech input controls
  const handleStartListening = useCallback(() => {
    if (!speechInputHandlerRef.current) {
      setError('Speech input is not available.');
      return;
    }

    setError(undefined);
    speechInputHandlerRef.current.startListening();
  }, []);

  const handleStopListening = useCallback(() => {
    speechInputHandlerRef.current?.stopListening();
  }, []);

  // Speech output controls
  const handlePauseSpeech = useCallback(() => {
    speechOutputHandlerRef.current?.pause();
  }, []);

  const handleResumeSpeech = useCallback(() => {
    speechOutputHandlerRef.current?.resume();
  }, []);

  const handleStopSpeech = useCallback(() => {
    speechOutputHandlerRef.current?.stop();
    setIsSpeaking(false);
    updateSystemState('idle');
  }, [updateSystemState]);

  if (!initialized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Initializing avatar system...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="avatar-chat-container flex flex-col lg:flex-row h-screen bg-[#1a2332]">
      {/* Avatar Section */}
      <div className="avatar-section flex items-center justify-center lg:w-2/5 p-8 lg:p-12 bg-[#243447] border-b lg:border-b-0 lg:border-r border-[#334155]">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <h1 className="text-3xl lg:text-4xl font-bold text-blue-400 mb-2">
              AI Avatar
            </h1>
            <p className="text-gray-400 text-sm">
              Your intelligent conversation partner
            </p>
          </div>
          <Avatar
            expression={currentExpression}
            onError={(error) => {
              console.error('Avatar error:', error);
              // Continue with static fallback
            }}
          />
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#2d3f56] shadow-lg border border-[#334155]">
              <div className={`w-2 h-2 rounded-full ${
                isListening ? 'bg-red-500 animate-pulse' :
                isSpeaking ? 'bg-green-500 animate-pulse' :
                isLoading ? 'bg-yellow-500 animate-pulse' :
                'bg-gray-400'
              }`} />
              <span className="text-sm font-medium text-gray-300">
                {isListening ? 'Listening' :
                 isSpeaking ? 'Speaking' :
                 isLoading ? 'Thinking' :
                 'Ready'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Section */}
      <div className="chat-section flex-1 flex flex-col bg-[#1e2936]">
        <ChatInterface
          messages={messages}
          onSendMessage={handleSendMessage}
          onStartListening={handleStartListening}
          onStopListening={handleStopListening}
          onPauseSpeech={handlePauseSpeech}
          onResumeSpeech={handleResumeSpeech}
          onStopSpeech={handleStopSpeech}
          isListening={isListening}
          isSpeaking={isSpeaking}
          isLoading={isLoading}
          speechSupported={speechSupported}
          error={error}
        />
      </div>
    </div>
  );
}
