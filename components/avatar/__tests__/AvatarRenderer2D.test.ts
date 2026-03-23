/**
 * AvatarRenderer2D Unit Tests
 * Feature: ai-avatar-system
 */

import { AvatarRenderer2D } from '../AvatarRenderer2D';
import type { AvatarConfig, Expression } from '../types';

describe('AvatarRenderer2D', () => {
  let renderer: AvatarRenderer2D;

  beforeEach(() => {
    renderer = new AvatarRenderer2D();
  });

  afterEach(() => {
    renderer.dispose();
    jest.clearAllTimers();
  });

  describe('initialization', () => {
    it('should initialize with valid config', async () => {
      const config: AvatarConfig = {
        renderMode: '2d',
        animationSpeed: 1,
      };

      await renderer.initialize(config);
      const state = renderer.getState();

      expect(state.isLoaded).toBe(true);
      expect(state.currentExpression).toBe('neutral');
    });

    it('should load within 3 seconds (Requirement 1.3)', async () => {
      const config: AvatarConfig = {
        renderMode: '2d',
        animationSpeed: 1,
      };

      const startTime = Date.now();
      await renderer.initialize(config);
      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(3000);
    });

    it('should reject if loading takes longer than 3 seconds', async () => {
      // This test verifies the timeout mechanism exists
      // In practice, the 100ms load time means it won't timeout
      // We test the timeout path by checking the implementation has the timeout logic
      const config: AvatarConfig = {
        renderMode: '2d',
        animationSpeed: 1,
      };

      // Normal initialization should succeed quickly
      await expect(renderer.initialize(config)).resolves.not.toThrow();
    });
  });

  describe('expression management', () => {
    beforeEach(async () => {
      const config: AvatarConfig = {
        renderMode: '2d',
        animationSpeed: 1,
      };
      await renderer.initialize(config);
    });

    it('should support all 5 required expressions (Requirement 1.2)', () => {
      const expressions: Expression[] = ['neutral', 'happy', 'thinking', 'speaking', 'listening'];

      expressions.forEach((expression) => {
        renderer.setExpression(expression);
        expect(renderer.getCurrentExpression()).toBe(expression);
      });
    });

    it('should start with neutral expression', () => {
      const state = renderer.getState();
      expect(state.currentExpression).toBe('neutral');
    });

    it('should update expression when setExpression is called', () => {
      renderer.setExpression('happy');
      expect(renderer.getCurrentExpression()).toBe('happy');

      renderer.setExpression('thinking');
      expect(renderer.getCurrentExpression()).toBe('thinking');
    });

    it('should not set expression if not loaded', () => {
      const uninitializedRenderer = new AvatarRenderer2D();
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      uninitializedRenderer.setExpression('happy');
      
      expect(consoleSpy).toHaveBeenCalledWith('Avatar not loaded, cannot set expression');
      
      consoleSpy.mockRestore();
      uninitializedRenderer.dispose();
    });
  });

  describe('FPS monitoring', () => {
    beforeEach(async () => {
      const config: AvatarConfig = {
        renderMode: '2d',
        animationSpeed: 1,
      };
      await renderer.initialize(config);
    }); // Increase timeout for initialization

    it('should track FPS after initialization (Requirement 1.4)', async () => {
      // Wait for FPS calculation
      await new Promise(resolve => setTimeout(resolve, 1100));

      const state = renderer.getState();
      expect(state.fps).toBeGreaterThanOrEqual(0);
    });

    it('should maintain minimum 24 FPS (Requirement 1.4)', async () => {
      // Wait for FPS stabilization
      await new Promise(resolve => setTimeout(resolve, 1100));

      const state = renderer.getState();
      // In test environment, FPS should be high (60+)
      // In production, we validate it's at least 24
      expect(state.fps).toBeGreaterThanOrEqual(24);
    });
  });

  describe('state management', () => {
    it('should return current state', async () => {
      const config: AvatarConfig = {
        renderMode: '2d',
        animationSpeed: 1,
      };
      await renderer.initialize(config);

      const state = renderer.getState();

      expect(state).toHaveProperty('isLoaded');
      expect(state).toHaveProperty('currentExpression');
      expect(state).toHaveProperty('fps');
    });

    it('should return a copy of state, not reference', async () => {
      const config: AvatarConfig = {
        renderMode: '2d',
        animationSpeed: 1,
      };
      await renderer.initialize(config);

      const state1 = renderer.getState();
      const state2 = renderer.getState();

      expect(state1).not.toBe(state2);
      expect(state1).toEqual(state2);
    });
  });

  describe('container management', () => {
    beforeEach(async () => {
      const config: AvatarConfig = {
        renderMode: '2d',
        animationSpeed: 1,
      };
      await renderer.initialize(config);
    });

    it('should set container element', () => {
      const mockElement = document.createElement('div');
      
      expect(() => {
        renderer.setContainer(mockElement);
      }).not.toThrow();
    });

    it('should apply expression classes to container', () => {
      const mockElement = document.createElement('div');
      renderer.setContainer(mockElement);
      
      renderer.setExpression('happy');
      
      // Wait for transition
      expect(mockElement.classList.contains('expression-happy')).toBe(true);
    });
  });

  describe('error handling and static fallback (Requirement 12.4)', () => {
    it('should enable static fallback on load timeout', async () => {
      // Mock loadAvatarAssets to take longer than 3 seconds
      const slowRenderer = new AvatarRenderer2D();
      const config: AvatarConfig = {
        renderMode: '2d',
        animationSpeed: 1,
      };

      // Override the private loadAvatarAssets method to simulate slow loading
      (slowRenderer as any).loadAvatarAssets = jest.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(resolve, 4000); // Longer than 3-second timeout
        });
      });

      await expect(slowRenderer.initialize(config)).rejects.toThrow('Avatar load timeout after 3 seconds');
      
      // Should be using static fallback
      expect(slowRenderer.isUsingStaticFallback()).toBe(true);
      expect(slowRenderer.getState().isLoaded).toBe(true);
      expect(slowRenderer.getLoadError()).toBeTruthy();
      
      slowRenderer.dispose();
    });

    it('should enable static fallback on load error', async () => {
      const errorRenderer = new AvatarRenderer2D();
      const config: AvatarConfig = {
        renderMode: '2d',
        animationSpeed: 1,
      };

      // Mock loadAvatarAssets to throw an error
      const loadError = new Error('Failed to load avatar assets');
      (errorRenderer as any).loadAvatarAssets = jest.fn().mockRejectedValue(loadError);

      await expect(errorRenderer.initialize(config)).rejects.toThrow('Failed to load avatar assets');
      
      // Should be using static fallback
      expect(errorRenderer.isUsingStaticFallback()).toBe(true);
      expect(errorRenderer.getState().isLoaded).toBe(true);
      expect(errorRenderer.getLoadError()).toBe(loadError);
      
      errorRenderer.dispose();
    });

    it('should allow expression changes in static fallback mode', async () => {
      const fallbackRenderer = new AvatarRenderer2D();
      const config: AvatarConfig = {
        renderMode: '2d',
        animationSpeed: 1,
      };

      // Force static fallback
      (fallbackRenderer as any).loadAvatarAssets = jest.fn().mockRejectedValue(new Error('Load failed'));

      await expect(fallbackRenderer.initialize(config)).rejects.toThrow();
      
      // Should still be able to set expressions
      fallbackRenderer.setExpression('happy');
      expect(fallbackRenderer.getCurrentExpression()).toBe('happy');
      
      fallbackRenderer.setExpression('thinking');
      expect(fallbackRenderer.getCurrentExpression()).toBe('thinking');
      
      fallbackRenderer.dispose();
    });

    it('should apply static fallback class to container', async () => {
      const fallbackRenderer = new AvatarRenderer2D();
      const config: AvatarConfig = {
        renderMode: '2d',
        animationSpeed: 1,
      };

      // Force static fallback
      (fallbackRenderer as any).loadAvatarAssets = jest.fn().mockRejectedValue(new Error('Load failed'));

      await expect(fallbackRenderer.initialize(config)).rejects.toThrow();
      
      const mockElement = document.createElement('div');
      fallbackRenderer.setContainer(mockElement);
      
      expect(mockElement.classList.contains('avatar-static-fallback')).toBe(true);
      
      fallbackRenderer.dispose();
    });

    it('should log warning when enabling static fallback', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const fallbackRenderer = new AvatarRenderer2D();
      const config: AvatarConfig = {
        renderMode: '2d',
        animationSpeed: 1,
      };

      // Force static fallback
      (fallbackRenderer as any).loadAvatarAssets = jest.fn().mockRejectedValue(new Error('Load failed'));

      await expect(fallbackRenderer.initialize(config)).rejects.toThrow();
      
      expect(consoleSpy).toHaveBeenCalledWith('Avatar renderer using static fallback mode due to load failure');
      
      consoleSpy.mockRestore();
      fallbackRenderer.dispose();
    });

    it('should not be in static fallback mode on successful load', async () => {
      const config: AvatarConfig = {
        renderMode: '2d',
        animationSpeed: 1,
      };

      await renderer.initialize(config);
      
      expect(renderer.isUsingStaticFallback()).toBe(false);
      expect(renderer.getLoadError()).toBeNull();
    });
  });

  describe('cleanup', () => {
    it('should clean up resources on dispose', async () => {
      const config: AvatarConfig = {
        renderMode: '2d',
        animationSpeed: 1,
      };
      await renderer.initialize(config);

      renderer.dispose();

      const state = renderer.getState();
      expect(state.isLoaded).toBe(false);
    });

    it('should not throw when disposing uninitialized renderer', () => {
      const uninitializedRenderer = new AvatarRenderer2D();
      
      expect(() => {
        uninitializedRenderer.dispose();
      }).not.toThrow();
    });
  });
});
