/**
 * 2D Sprite-based Avatar Renderer
 * Feature: ai-avatar-system
 * 
 * Implements a cost-optimized 2D avatar renderer using CSS animations
 * Supports 5 expressions with smooth transitions (300ms)
 */

import type { AvatarRenderer, AvatarConfig, AvatarState, Expression } from './types';

export class AvatarRenderer2D implements AvatarRenderer {
  private config: AvatarConfig | null = null;
  private state: AvatarState = {
    isLoaded: false,
    currentExpression: 'neutral',
    fps: 0,
  };
  
  private container: HTMLElement | null = null;
  private fpsInterval: NodeJS.Timeout | null = null;
  private frameCount = 0;
  private lastFrameTime = 0;
  private transitionTimeout: NodeJS.Timeout | null = null;
  private loadError: Error | null = null;
  private isStaticFallback = false;

  /**
   * Initialize the avatar renderer with configuration
   * Requirement 1.3: Load and display avatar within 3 seconds
   * Requirement 12.4: Error handling for failed avatar loads with static fallback
   */
  async initialize(config: AvatarConfig): Promise<void> {
    this.config = config;
    this.loadError = null;
    this.isStaticFallback = false;
    
    // Simulate loading time for avatar assets
    return new Promise((resolve, reject) => {
      const loadTimeout = setTimeout(() => {
        const error = new Error('Avatar load timeout after 3 seconds');
        this.loadError = error;
        this.enableStaticFallback();
        reject(error);
      }, 3000);

      // Simulate asset loading
      // In a real implementation, this would load sprite sheets or 3D models
      this.loadAvatarAssets(config)
        .then(() => {
          clearTimeout(loadTimeout);
          this.state.isLoaded = true;
          this.startFPSMonitoring();
          resolve();
        })
        .catch((error) => {
          clearTimeout(loadTimeout);
          this.loadError = error;
          this.enableStaticFallback();
          reject(error);
        });
    });
  }

  /**
   * Load avatar assets (sprite sheets, textures, etc.)
   * This is a placeholder for actual asset loading logic
   */
  private async loadAvatarAssets(config: AvatarConfig): Promise<void> {
    // Simulate asset loading with a small delay
    return new Promise((resolve) => {
      setTimeout(() => {
        // In production, this would:
        // - Load sprite sheets from avatarUrl
        // - Validate asset integrity
        // - Prepare animation frames
        resolve();
      }, 100);
    });
  }

  /**
   * Enable static fallback mode when avatar loading fails
   * Requirement 12.4: Static fallback for failed avatar loads
   */
  private enableStaticFallback(): void {
    this.isStaticFallback = true;
    this.state.isLoaded = true; // Mark as loaded to allow expression changes
    this.state.currentExpression = 'neutral';
    
    // Apply static fallback class to container if available
    if (this.container) {
      this.container.classList.add('avatar-static-fallback');
    }
    
    console.warn('Avatar renderer using static fallback mode due to load failure');
  }

  /**
   * Check if renderer is in static fallback mode
   */
  isUsingStaticFallback(): boolean {
    return this.isStaticFallback;
  }

  /**
   * Get the last load error if any
   */
  getLoadError(): Error | null {
    return this.loadError;
  }

  /**
   * Set the current expression with smooth transition
   * Requirement 1.2: Support 5 basic expressions
   * Requirement 5.5: Smooth transitions over 300ms
   */
  setExpression(expression: Expression): void {
    if (!this.state.isLoaded) {
      console.warn('Avatar not loaded, cannot set expression');
      return;
    }

    // Clear any pending transition
    if (this.transitionTimeout) {
      clearTimeout(this.transitionTimeout);
    }

    // Update state immediately
    const previousExpression = this.state.currentExpression;
    this.state.currentExpression = expression;

    // Trigger transition animation (300ms)
    if (this.container) {
      this.applyExpressionTransition(previousExpression, expression);
    }
  }

  /**
   * Apply CSS-based expression transition
   * Uses CSS transitions for smooth 300ms interpolation
   */
  private applyExpressionTransition(from: Expression, to: Expression): void {
    if (!this.container) return;

    // Remove previous expression class
    this.container.classList.remove(`expression-${from}`);
    
    // Add transition class
    this.container.classList.add('transitioning');
    
    // Add new expression class
    this.container.classList.add(`expression-${to}`);

    // Remove transition class after 300ms
    this.transitionTimeout = setTimeout(() => {
      this.container?.classList.remove('transitioning');
    }, 300);
  }

  /**
   * Get current avatar state
   */
  getState(): AvatarState {
    return { ...this.state };
  }

  /**
   * Start FPS monitoring
   * Requirement 1.4: Render at minimum 24 FPS
   */
  private startFPSMonitoring(): void {
    this.lastFrameTime = performance.now();
    this.frameCount = 0;

    // Update FPS every second
    this.fpsInterval = setInterval(() => {
      const currentTime = performance.now();
      const elapsed = currentTime - this.lastFrameTime;
      
      if (elapsed > 0) {
        this.state.fps = Math.round((this.frameCount * 1000) / elapsed);
      }
      
      this.frameCount = 0;
      this.lastFrameTime = currentTime;
    }, 1000);

    // Simulate frame rendering
    this.renderLoop();
  }

  /**
   * Render loop for FPS calculation
   */
  private renderLoop = (): void => {
    if (!this.state.isLoaded) return;

    this.frameCount++;
    
    // Check if requestAnimationFrame is available (not in test environment)
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(this.renderLoop);
    }
  };

  /**
   * Set the container element for the avatar
   */
  setContainer(element: HTMLElement): void {
    this.container = element;
    
    // Apply static fallback class if in fallback mode
    if (this.isStaticFallback) {
      element.classList.add('avatar-static-fallback');
    }
    
    if (this.state.isLoaded) {
      this.applyExpressionTransition('neutral', this.state.currentExpression);
    }
  }

  /**
   * Get current expression
   */
  getCurrentExpression(): Expression {
    return this.state.currentExpression;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.fpsInterval) {
      clearInterval(this.fpsInterval);
      this.fpsInterval = null;
    }
    
    if (this.transitionTimeout) {
      clearTimeout(this.transitionTimeout);
      this.transitionTimeout = null;
    }

    this.state.isLoaded = false;
    this.container = null;
  }
}
