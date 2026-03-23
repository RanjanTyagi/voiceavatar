/**
 * Expression Controller
 * Feature: ai-avatar-system
 * 
 * Manages avatar facial expressions based on system state.
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5
 */

import type { Expression } from '@/components/avatar/types';

export type SystemState = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface ExpressionController {
  // Set expression based on system state
  setStateExpression(state: SystemState): void;
  
  // Manually set expression
  setExpression(expression: Expression): void;
  
  // Get current expression
  getCurrentExpression(): Expression;
  
  // Clean up resources
  dispose(): void;
}

/**
 * Expression priority (highest to lowest):
 * 1. speaking
 * 2. listening
 * 3. thinking
 * 4. idle (neutral)
 */
const STATE_TO_EXPRESSION_MAP: Record<SystemState, Expression> = {
  idle: 'neutral',
  listening: 'listening',
  thinking: 'thinking',
  speaking: 'speaking',
};

const EXPRESSION_PRIORITY: Record<SystemState, number> = {
  speaking: 4,
  listening: 3,
  thinking: 2,
  idle: 1,
};

const IDLE_TIMEOUT_MS = 3000; // 3 seconds

export class DefaultExpressionController implements ExpressionController {
  private currentExpression: Expression = 'neutral';
  private currentState: SystemState = 'idle';
  private idleTimer: NodeJS.Timeout | null = null;
  private onExpressionChange?: (expression: Expression) => void;

  constructor(onExpressionChange?: (expression: Expression) => void) {
    this.onExpressionChange = onExpressionChange;
  }

  setStateExpression(state: SystemState): void {
    // Clear any existing idle timer
    this.clearIdleTimer();

    // Check if new state has higher or equal priority than current state
    const newPriority = EXPRESSION_PRIORITY[state];
    const currentPriority = EXPRESSION_PRIORITY[this.currentState];

    // Update state and expression if priority is higher or equal
    if (newPriority >= currentPriority) {
      this.currentState = state;
      const newExpression = STATE_TO_EXPRESSION_MAP[state];
      this.updateExpression(newExpression);
    }

    // Start idle timer if not in speaking state
    if (state !== 'speaking') {
      this.startIdleTimer();
    }
  }

  setExpression(expression: Expression): void {
    this.updateExpression(expression);
  }

  getCurrentExpression(): Expression {
    return this.currentExpression;
  }

  dispose(): void {
    this.clearIdleTimer();
    this.onExpressionChange = undefined;
  }

  private updateExpression(expression: Expression): void {
    if (this.currentExpression !== expression) {
      this.currentExpression = expression;
      if (this.onExpressionChange) {
        this.onExpressionChange(expression);
      }
    }
  }

  private startIdleTimer(): void {
    this.idleTimer = setTimeout(() => {
      this.currentState = 'idle';
      this.updateExpression('neutral');
    }, IDLE_TIMEOUT_MS);
  }

  private clearIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }
}
