# AI Avatar System - Project Structure

## Directory Organization

This document outlines the project structure and organization for the AI Avatar System.

### Root Directory

```
.
├── app/                    # Next.js App Router (pages and API routes)
├── components/             # React components
├── services/               # Business logic and API integrations
├── __tests__/             # Test files
├── public/                # Static assets
├── node_modules/          # Dependencies (generated)
├── .next/                 # Next.js build output (generated)
├── .git/                  # Git repository
├── .kiro/                 # Kiro specs and configuration
```

### App Directory (`app/`)

Next.js 16 App Router structure:

```
app/
├── api/                   # API routes (serverless functions)
│   ├── chat/             # LLM conversation endpoint
│   ├── tts/              # Text-to-speech fallback endpoint
│   └── health/           # Health check endpoint
├── layout.tsx            # Root layout component
├── page.tsx              # Home page
└── globals.css           # Global styles
```

### Components Directory (`components/`)

React components organized by feature:

```
components/
├── avatar/
│   ├── AvatarRenderer.tsx          # Main avatar display component
│   └── AvatarRenderer.test.tsx     # Unit tests
├── conversation/
│   ├── ChatInterface.tsx           # Main chat UI
│   ├── MessageList.tsx             # Message display
│   ├── MessageInput.tsx            # Text input field
│   └── *.test.tsx                  # Unit tests
├── speech/
│   ├── SpeechInputButton.tsx       # Microphone button
│   ├── SpeechControls.tsx          # Playback controls
│   └── *.test.tsx                  # Unit tests
└── ui/
    ├── LoadingIndicator.tsx        # Loading spinner
    ├── ErrorMessage.tsx            # Error display
    └── *.test.tsx                  # Unit tests
```

### Services Directory (`services/`)

Business logic and API integrations:

```
services/
├── avatar/
│   ├── AvatarRenderer.ts           # Avatar rendering logic
│   ├── ExpressionController.ts     # Expression management
│   └── *.test.ts                   # Unit and property tests
├── conversation/
│   ├── ConversationManager.ts      # Conversation orchestration
│   ├── SessionManager.ts           # Session persistence
│   └── *.test.ts                   # Unit and property tests
├── speech/
│   ├── SpeechInputHandler.ts       # Speech recognition
│   ├── SpeechOutputHandler.ts      # Text-to-speech
│   └── *.test.ts                   # Unit and property tests
├── api/
│   ├── llmClient.ts                # LLM API client
│   ├── rateLimiter.ts              # Rate limiting logic
│   └── *.test.ts                   # Unit tests
├── config/
│   ├── useCaseConfig.ts            # Use case configurations
│   └── systemConfig.ts             # System configuration
└── utils/
    ├── errorHandler.ts             # Error handling utilities
    ├── cache.ts                    # Client-side caching
    └── *.test.ts                   # Unit tests
```

### Test Directory (`__tests__/`)

Integration and end-to-end tests:

```
__tests__/
├── setup.test.ts                   # Setup verification
├── integration/
│   ├── conversation-flow.test.ts   # Full conversation flow
│   ├── session-persistence.test.ts # Session save/restore
│   └── fallback-behavior.test.ts   # Service fallback tests
└── properties/
    ├── avatar.properties.test.ts   # Avatar property tests
    ├── conversation.properties.test.ts
    ├── speech.properties.test.ts
    └── api.properties.test.ts
```

### Configuration Files

```
.
├── package.json              # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
├── jest.config.ts           # Jest configuration
├── jest.setup.ts            # Jest setup file
├── next.config.ts           # Next.js configuration
├── tailwind.config.ts       # Tailwind CSS configuration
├── postcss.config.mjs       # PostCSS configuration
├── biome.json               # Biome linter configuration
├── vercel.json              # Vercel deployment settings
├── .env.local               # Local environment variables (gitignored)
├── .env.example             # Environment variables template
├── .gitignore               # Git ignore rules
└── README.md                # Project documentation
```

## File Naming Conventions

### Components
- **React Components**: PascalCase with `.tsx` extension
  - Example: `AvatarRenderer.tsx`, `ChatInterface.tsx`
- **Component Tests**: Same name with `.test.tsx` suffix
  - Example: `AvatarRenderer.test.tsx`

### Services
- **Service Classes**: PascalCase with `.ts` extension
  - Example: `ConversationManager.ts`, `SpeechInputHandler.ts`
- **Service Tests**: Same name with `.test.ts` suffix
  - Example: `ConversationManager.test.ts`
- **Property Tests**: Same name with `.properties.test.ts` suffix
  - Example: `ConversationManager.properties.test.ts`

### API Routes
- **API Handlers**: `route.ts` in feature directory
  - Example: `app/api/chat/route.ts`

### Utilities
- **Utility Functions**: camelCase with `.ts` extension
  - Example: `errorHandler.ts`, `cache.ts`

## Import Aliases

The project uses TypeScript path aliases for cleaner imports:

```typescript
// Configured in tsconfig.json
{
  "paths": {
    "@/*": ["./*"]
  }
}
```

Usage examples:
```typescript
import { AvatarRenderer } from '@/components/avatar/AvatarRenderer';
import { ConversationManager } from '@/services/conversation/ConversationManager';
import { systemConfig } from '@/services/config/systemConfig';
```

## Testing Organization

### Unit Tests
- Co-located with source files using `.test.ts` or `.test.tsx` suffix
- Focus on specific functions, classes, and components
- Example: `services/avatar/AvatarRenderer.test.ts`

### Property-Based Tests
- Co-located with source files using `.properties.test.ts` suffix
- Verify universal properties across all inputs
- Use fast-check library with 100+ iterations
- Example: `services/conversation/ConversationManager.properties.test.ts`

### Integration Tests
- Located in `__tests__/integration/` directory
- Test complete flows and component interactions
- Example: `__tests__/integration/conversation-flow.test.ts`

## Build Output

### Development
- `.next/` directory contains development build artifacts
- Hot module replacement enabled
- Source maps included

### Production
- `.next/` directory contains optimized production build
- Static pages pre-rendered
- Serverless functions bundled separately
- Assets optimized and minified

## Environment Variables

### Local Development
- `.env.local` - Local environment variables (gitignored)
- Loaded automatically by Next.js

### Production (Vercel)
- Set in Vercel dashboard or via CLI
- Never committed to repository
- Accessed via `process.env` in serverless functions

## Best Practices

1. **Component Organization**: Group related components in feature directories
2. **Service Layer**: Keep business logic separate from UI components
3. **Test Co-location**: Place tests next to the code they test
4. **Type Safety**: Use TypeScript interfaces for all data structures
5. **Import Aliases**: Use `@/` prefix for absolute imports
6. **API Routes**: Keep API handlers thin, delegate to services
7. **Configuration**: Centralize configuration in `services/config/`
8. **Error Handling**: Use centralized error handler from `services/utils/`

## Next Steps

As the project grows, consider:
- Adding `lib/` directory for shared utilities
- Creating `hooks/` directory for custom React hooks
- Adding `types/` directory for shared TypeScript types
- Implementing `middleware.ts` for request processing
- Adding `instrumentation.ts` for observability
