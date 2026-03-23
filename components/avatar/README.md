# Avatar Renderer Component

## Overview

The Avatar Renderer is a cost-optimized 2D sprite-based avatar system that displays visual representations with different expressions. It's designed for the AI Avatar System to provide engaging user interactions.

## Features

- **5 Expression States**: neutral, happy, thinking, speaking, listening
- **Smooth Transitions**: 300ms CSS-based interpolation between expressions
- **Responsive Design**: Scales appropriately for viewport widths 320px to 2560px
- **Performance Monitoring**: Built-in FPS tracking (target: 24+ FPS)
- **Fast Loading**: Loads within 3 seconds
- **Accessibility**: ARIA labels, keyboard navigation, reduced motion support

## Usage

### Basic Usage

```tsx
import { Avatar } from '@/components/avatar';

export default function MyPage() {
  return <Avatar expression="neutral" />;
}
```

### With Configuration

```tsx
import { Avatar } from '@/components/avatar';

export default function MyPage() {
  const config = {
    renderMode: '2d' as const,
    animationSpeed: 1,
  };

  return (
    <Avatar 
      config={config}
      expression="happy"
      onLoad={() => console.log('Avatar loaded')}
      onError={(error) => console.error('Avatar error:', error)}
    />
  );
}
```

### Dynamic Expression Changes

```tsx
'use client';

import { useState } from 'react';
import { Avatar } from '@/components/avatar';
import type { Expression } from '@/components/avatar';

export default function InteractiveAvatar() {
  const [expression, setExpression] = useState<Expression>('neutral');

  return (
    <div>
      <Avatar expression={expression} />
      
      <div>
        <button onClick={() => setExpression('happy')}>Happy</button>
        <button onClick={() => setExpression('thinking')}>Thinking</button>
        <button onClick={() => setExpression('speaking')}>Speaking</button>
        <button onClick={() => setExpression('listening')}>Listening</button>
        <button onClick={() => setExpression('neutral')}>Neutral</button>
      </div>
    </div>
  );
}
```

## API Reference

### Avatar Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `config` | `Partial<AvatarConfig>` | `{ renderMode: '2d', animationSpeed: 1 }` | Avatar configuration |
| `expression` | `Expression` | `'neutral'` | Current expression to display |
| `onLoad` | `() => void` | `undefined` | Callback when avatar loads successfully |
| `onError` | `(error: Error) => void` | `undefined` | Callback when avatar fails to load |

### Expression Types

```typescript
type Expression = 'neutral' | 'happy' | 'thinking' | 'speaking' | 'listening';
```

### AvatarConfig

```typescript
interface AvatarConfig {
  avatarUrl?: string;        // Optional custom sprite URL
  renderMode: '2d' | '3d';   // Render mode (currently only 2D supported)
  animationSpeed: number;    // Animation speed multiplier
}
```

### AvatarState

```typescript
interface AvatarState {
  isLoaded: boolean;         // Whether avatar has loaded
  currentExpression: Expression;  // Current expression
  fps: number;               // Current frames per second
}
```

## Styling

The avatar component uses CSS classes that can be customized:

- `.avatar-container` - Main container
- `.avatar-sprite` - Sprite element
- `.expression-{name}` - Expression-specific styles
- `.avatar-loading` - Loading state
- `.avatar-error` - Error state

Import the CSS in your layout or page:

```tsx
import '@/components/avatar/avatar.css';
```

## Requirements Satisfied

- **Requirement 1.1**: Visual avatar representation (2D sprite-based)
- **Requirement 1.2**: 5 basic expressions support
- **Requirement 1.3**: Loads within 3 seconds
- **Requirement 1.4**: Renders at 24+ FPS
- **Requirement 1.5**: Responsive scaling (320px to 2560px)

## Testing

Run tests with:

```bash
npm test -- components/avatar
```

## Performance

- Initial load: < 100ms (2D sprites)
- Expression transition: 300ms
- Target FPS: 24+ (typically 60 in modern browsers)
- Memory footprint: Minimal (CSS-based animations)
