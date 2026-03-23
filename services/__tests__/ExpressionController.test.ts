/**
 * Expression Controller Unit Tests
 * Feature: ai-avatar-system
 */

import { DefaultExpressionController } from '../ExpressionController';
import type { Expression } from '@/components/avatar/types';

describe('ExpressionController', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('State to Expression Mapping', () => {
    it('should map idle state to neutral expression', () => {
      const controller = new DefaultExpressionController();
      controller.setStateExpression('idle');
      expect(controller.getCurrentExpression()).toBe('neutral');
    });

    it('should map listening state to listening expression', () => {
      const controller = new DefaultExpressionController();
      controller.setStateExpression('listening');
      expect(controller.getCurrentExpression()).toBe('listening');
    });

    it('should map thinking state to thinking expression', () => {
      const controller = new DefaultExpressionController();
      controller.setStateExpression('thinking');
      expect(controller.getCurrentExpression()).toBe('thinking');
    });

    it('should map speaking state to speaking expression', () => {
      const controller = new DefaultExpressionController();
      controller.setStateExpression('speaking');
      expect(controller.getCurrentExpression()).toBe('speaking');
    });
  });

  describe('Expression Priority Handling', () => {
    it('should prioritize speaking over listening', () => {
      const controller = new DefaultExpressionController();
      controller.setStateExpression('listening');
      controller.setStateExpression('speaking');
      expect(controller.getCurrentExpression()).toBe('speaking');
    });

    it('should prioritize speaking over thinking', () => {
      const controller = new DefaultExpressionController();
      controller.setStateExpression('thinking');
      controller.setStateExpression('speaking');
      expect(controller.getCurrentExpression()).toBe('speaking');
    });

    it('should prioritize listening over thinking', () => {
      const controller = new DefaultExpressionController();
      controller.setStateExpression('thinking');
      controller.setStateExpression('listening');
      expect(controller.getCurrentExpression()).toBe('listening');
    });

    it('should prioritize listening over idle', () => {
      const controller = new DefaultExpressionController();
      controller.setStateExpression('idle');
      controller.setStateExpression('listening');
      expect(controller.getCurrentExpression()).toBe('listening');
    });

    it('should not downgrade from speaking to listening', () => {
      const controller = new DefaultExpressionController();
      controller.setStateExpression('speaking');
      controller.setStateExpression('listening');
      expect(controller.getCurrentExpression()).toBe('speaking');
    });

    it('should not downgrade from listening to thinking', () => {
      const controller = new DefaultExpressionController();
      controller.setStateExpression('listening');
      controller.setStateExpression('thinking');
      expect(controller.getCurrentExpression()).toBe('listening');
    });
  });

  describe('Idle Timeout', () => {
    it('should reset to neutral after 3 seconds of idle', () => {
      const controller = new DefaultExpressionController();
      controller.setStateExpression('thinking');
      expect(controller.getCurrentExpression()).toBe('thinking');

      jest.advanceTimersByTime(3000);
      expect(controller.getCurrentExpression()).toBe('neutral');
    });

    it('should reset to neutral after 3 seconds when listening ends', () => {
      const controller = new DefaultExpressionController();
      controller.setStateExpression('listening');
      expect(controller.getCurrentExpression()).toBe('listening');

      jest.advanceTimersByTime(3000);
      expect(controller.getCurrentExpression()).toBe('neutral');
    });

    it('should not reset to neutral while speaking', () => {
      const controller = new DefaultExpressionController();
      controller.setStateExpression('speaking');
      expect(controller.getCurrentExpression()).toBe('speaking');

      jest.advanceTimersByTime(3000);
      expect(controller.getCurrentExpression()).toBe('speaking');
    });

    it('should reset idle timer when state changes', () => {
      const controller = new DefaultExpressionController();
      controller.setStateExpression('thinking');

      jest.advanceTimersByTime(2000);
      controller.setStateExpression('listening');

      jest.advanceTimersByTime(2000);
      expect(controller.getCurrentExpression()).toBe('listening');

      jest.advanceTimersByTime(1000);
      expect(controller.getCurrentExpression()).toBe('neutral');
    });
  });

  describe('Manual Expression Setting', () => {
    it('should allow manual expression override', () => {
      const controller = new DefaultExpressionController();
      controller.setExpression('happy');
      expect(controller.getCurrentExpression()).toBe('happy');
    });

    it('should accept any valid expression', () => {
      const controller = new DefaultExpressionController();
      const expressions: Expression[] = ['neutral', 'happy', 'thinking', 'speaking', 'listening'];
      
      expressions.forEach(expr => {
        controller.setExpression(expr);
        expect(controller.getCurrentExpression()).toBe(expr);
      });
    });
  });

  describe('Expression Change Callback', () => {
    it('should call callback when expression changes', () => {
      const callback = jest.fn();
      const controller = new DefaultExpressionController(callback);
      
      controller.setStateExpression('listening');
      expect(callback).toHaveBeenCalledWith('listening');
    });

    it('should not call callback when expression stays the same', () => {
      const callback = jest.fn();
      const controller = new DefaultExpressionController(callback);
      
      controller.setStateExpression('listening');
      callback.mockClear();
      
      controller.setStateExpression('listening');
      expect(callback).not.toHaveBeenCalled();
    });

    it('should call callback on idle timeout', () => {
      const callback = jest.fn();
      const controller = new DefaultExpressionController(callback);
      
      controller.setStateExpression('thinking');
      callback.mockClear();

      jest.advanceTimersByTime(3000);
      expect(callback).toHaveBeenCalledWith('neutral');
    });
  });

  describe('Cleanup', () => {
    it('should clear idle timer on dispose', () => {
      const controller = new DefaultExpressionController();
      controller.setStateExpression('thinking');
      
      controller.dispose();
      jest.advanceTimersByTime(3000);
      
      // Expression should not change after dispose
      expect(controller.getCurrentExpression()).toBe('thinking');
    });

    it('should clear callback reference on dispose', () => {
      const callback = jest.fn();
      const controller = new DefaultExpressionController(callback);
      
      controller.dispose();
      controller.setExpression('happy');
      
      expect(callback).not.toHaveBeenCalled();
    });
  });
});
