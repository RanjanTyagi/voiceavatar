/**
 * Avatar System Type Definitions
 * Feature: ai-avatar-system
 */

export type Expression = 'neutral' | 'happy' | 'thinking' | 'speaking' | 'listening';

export interface AvatarConfig {
  avatarUrl?: string;  // Ready Player Me URL or sprite sheet URL
  renderMode: '2d' | '3d';
  animationSpeed: number;
}

export interface AvatarState {
  isLoaded: boolean;
  currentExpression: Expression;
  fps: number;
}

export interface AvatarRenderer {
  // Initialize the avatar with configuration
  initialize(config: AvatarConfig): Promise<void>;
  
  // Update the current expression
  setExpression(expression: Expression): void;
  
  // Get current rendering state
  getState(): AvatarState;
  
  // Clean up resources
  dispose(): void;
}
