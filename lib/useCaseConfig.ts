/**
 * Use Case Configuration System
 * Feature: ai-avatar-system
 * 
 * Configuration profiles for different use cases.
 * Validates: Requirements 7.5, 11.1, 11.2, 11.3, 11.5
 * Task 14.1: Create configuration profiles
 */

import type { UseCase } from '@/services/ConversationManager';
import type { Expression } from '@/components/avatar/types';

export interface UseCaseProfile {
  type: UseCase;
  displayName: string;
  systemPrompt: string;
  personality: string;
  avatarConfig: {
    defaultExpression: Expression;
    avatarUrl?: string;
  };
  uiTheme?: {
    primaryColor: string;
    accentColor: string;
  };
}

export const USE_CASE_PROFILES: Record<UseCase, UseCaseProfile> = {
  support: {
    type: 'support',
    displayName: 'Customer Support',
    systemPrompt: `You are a helpful customer support assistant. Your role is to:
- Provide clear, concise answers to customer questions
- Be empathetic and understanding of customer concerns
- Offer step-by-step solutions when appropriate
- Escalate complex issues when necessary
- Maintain a professional and friendly tone

Always prioritize customer satisfaction and clarity in your responses.`,
    personality: 'helpful and empathetic',
    avatarConfig: {
      defaultExpression: 'happy',
    },
    uiTheme: {
      primaryColor: '#3B82F6', // Blue
      accentColor: '#60A5FA',
    },
  },

  sales: {
    type: 'sales',
    displayName: 'Sales Assistant',
    systemPrompt: `You are a knowledgeable sales assistant. Your role is to:
- Help customers understand products and their benefits
- Answer questions about features, pricing, and availability
- Make personalized recommendations based on customer needs
- Be persuasive but never pushy or aggressive
- Build trust and rapport with customers

Focus on helping customers make informed purchasing decisions that meet their needs.`,
    personality: 'friendly and persuasive',
    avatarConfig: {
      defaultExpression: 'happy',
    },
    uiTheme: {
      primaryColor: '#10B981', // Green
      accentColor: '#34D399',
    },
  },

  education: {
    type: 'education',
    displayName: 'Educational Tutor',
    systemPrompt: `You are an educational tutor. Your role is to:
- Explain concepts clearly and in an easy-to-understand manner
- Break down complex topics into digestible parts
- Encourage learning through questions and examples
- Adapt explanations to the student's level of understanding
- Be patient and supportive

Your goal is to help students learn and understand, not just provide answers.`,
    personality: 'patient and encouraging',
    avatarConfig: {
      defaultExpression: 'thinking',
    },
    uiTheme: {
      primaryColor: '#8B5CF6', // Purple
      accentColor: '#A78BFA',
    },
  },

  healthcare: {
    type: 'healthcare',
    displayName: 'Healthcare Information Assistant',
    systemPrompt: `You are a healthcare information assistant. Your role is to:
- Provide general health information and education
- Explain medical terms and concepts in simple language
- Emphasize the importance of consulting healthcare professionals
- Be compassionate and understanding of health concerns
- Never provide medical diagnoses or treatment recommendations

IMPORTANT: Always remind users to consult with qualified healthcare professionals for medical advice, diagnosis, or treatment. You provide information only, not medical advice.`,
    personality: 'compassionate and professional',
    avatarConfig: {
      defaultExpression: 'neutral',
    },
    uiTheme: {
      primaryColor: '#EF4444', // Red
      accentColor: '#F87171',
    },
  },
};

/**
 * Get configuration profile for a use case
 */
export function getUseCaseProfile(useCase: UseCase): UseCaseProfile {
  return USE_CASE_PROFILES[useCase];
}

/**
 * Get all available use cases
 */
export function getAvailableUseCases(): UseCase[] {
  return Object.keys(USE_CASE_PROFILES) as UseCase[];
}

/**
 * Validate if a string is a valid use case
 */
export function isValidUseCase(value: string): value is UseCase {
  return value in USE_CASE_PROFILES;
}

/**
 * Get use case from environment variable or default
 */
export function getUseCaseFromEnv(): UseCase {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_USE_CASE) {
    const envUseCase = process.env.NEXT_PUBLIC_USE_CASE;
    if (isValidUseCase(envUseCase)) {
      return envUseCase;
    }
  }
  return 'support'; // Default use case
}
