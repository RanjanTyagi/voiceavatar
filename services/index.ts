/**
 * Services Module Exports
 * Feature: ai-avatar-system
 */

export { DefaultExpressionController } from './ExpressionController';
export type { ExpressionController, SystemState } from './ExpressionController';

export { DefaultSpeechInputHandler } from './SpeechInputHandler';
export type { SpeechInputHandler, SpeechError as SpeechInputError } from './SpeechInputHandler';

export { DefaultSpeechOutputHandler } from './SpeechOutputHandler';
export type { SpeechOutputHandler, SpeechError as SpeechOutputError } from './SpeechOutputHandler';

export { DefaultConversationManager } from './ConversationManager';
export type { ConversationManager, Message, ConversationResponse, UseCase } from './ConversationManager';
