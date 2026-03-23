'use client';

/**
 * Avatar Component
 * Feature: ai-avatar-system
 * 
 * React component wrapper for the AvatarRenderer
 * Requirement 1.5: Responsive scaling for viewport widths 320px to 2560px
 */

import { useEffect, useRef, useState } from 'react';
import { AvatarRenderer2D } from './AvatarRenderer2D';
import type { Expression, AvatarConfig } from './types';

interface AvatarProps {
  config?: Partial<AvatarConfig>;
  expression?: Expression;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

export function Avatar({ 
  config = {}, 
  expression = 'neutral',
  onLoad,
  onError 
}: AvatarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<AvatarRenderer2D | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isStaticFallback, setIsStaticFallback] = useState(false);

  // Initialize renderer
  useEffect(() => {
    const renderer = new AvatarRenderer2D();
    rendererRef.current = renderer;

    const defaultConfig: AvatarConfig = {
      renderMode: '2d',
      animationSpeed: 1,
      ...config,
    };

    renderer.initialize(defaultConfig)
      .then(() => {
        if (containerRef.current) {
          renderer.setContainer(containerRef.current);
        }
        setIsLoaded(true);
        setIsStaticFallback(renderer.isUsingStaticFallback());
        onLoad?.();
      })
      .catch((err) => {
        // Even on error, check if static fallback is enabled
        const usingFallback = renderer.isUsingStaticFallback();
        setError(err);
        setIsStaticFallback(usingFallback);
        
        if (usingFallback) {
          // Static fallback is active, so we can still use the avatar
          setIsLoaded(true);
          if (containerRef.current) {
            renderer.setContainer(containerRef.current);
          }
        }
        
        onError?.(err);
      });

    return () => {
      renderer.dispose();
    };
  }, []);

  // Update expression when prop changes
  useEffect(() => {
    if (isLoaded && rendererRef.current) {
      rendererRef.current.setExpression(expression);
    }
  }, [expression, isLoaded]);

  // Update container reference
  useEffect(() => {
    if (containerRef.current && rendererRef.current && isLoaded) {
      rendererRef.current.setContainer(containerRef.current);
    }
  }, [isLoaded]);

  // Show error only if static fallback is not available
  if (error && !isStaticFallback) {
    return (
      <div className="avatar-error" role="alert">
        <p>Failed to load avatar</p>
        <p className="error-details">{error.message}</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`avatar-container expression-${expression} ${isLoaded ? 'loaded' : 'loading'} ${isStaticFallback ? 'static-fallback' : ''}`}
      role="img"
      aria-label={`Avatar with ${expression} expression${isStaticFallback ? ' (static)' : ''}`}
    >
      {!isLoaded && (
        <div className="avatar-loading">
          <span>Loading avatar...</span>
        </div>
      )}
      {isStaticFallback && (
        <div className="avatar-fallback-indicator" aria-live="polite">
          Using static avatar
        </div>
      )}
      <div className="avatar-sprite" />
    </div>
  );
}
