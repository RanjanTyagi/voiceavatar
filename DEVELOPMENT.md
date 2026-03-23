# Development Guide

## Quick Start

### Initial Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local and add your API keys
   ```

3. **Run development server**:
   ```bash
   npm run dev
   ```

4. **Run tests**:
   ```bash
   npm test
   ```

## Development Workflow

### Running the Application

```bash
# Development mode (with hot reload)
npm run dev

# Production build
npm run build

# Start production server
npm start
```

The application will be available at [http://localhost:3000](http://localhost:3000)

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode (auto-rerun on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Code Quality

```bash
# Check code with Biome linter
npm run lint

# Format code with Biome
npm run format
```

## Project Structure

See [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) for detailed information about the project organization.

### Key Directories

- `app/` - Next.js App Router (pages and API routes)
- `components/` - React components
- `services/` - Business logic and API integrations
- `__tests__/` - Test files

## Creating New Components

### React Component Template

```typescript
// components/feature/ComponentName.tsx
import React from 'react';

interface ComponentNameProps {
  // Define props
}

export function ComponentName({ }: ComponentNameProps) {
  return (
    <div>
      {/* Component content */}
    </div>
  );
}
```

### Component Test Template

```typescript
// components/feature/ComponentName.test.tsx
import { render, screen } from '@testing-library/react';
import { ComponentName } from './ComponentName';

describe('ComponentName', () => {
  it('should render correctly', () => {
    render(<ComponentName />);
    // Add assertions
  });
});
```

## Creating New Services

### Service Class Template

```typescript
// services/feature/ServiceName.ts
export interface ServiceNameConfig {
  // Configuration options
}

export class ServiceName {
  constructor(private config: ServiceNameConfig) {}

  // Service methods
}
```

### Service Test Template

```typescript
// services/feature/ServiceName.test.ts
import { ServiceName } from './ServiceName';

describe('ServiceName', () => {
  it('should initialize correctly', () => {
    const service = new ServiceName({ /* config */ });
    // Add assertions
  });
});
```

### Property-Based Test Template

```typescript
// services/feature/ServiceName.properties.test.ts
import fc from 'fast-check';
import { ServiceName } from './ServiceName';

// Feature: ai-avatar-system, Property X: Property Description
describe('ServiceName Properties', () => {
  it('should satisfy property X', () => {
    fc.assert(
      fc.property(
        fc.string(), // Generator for test inputs
        (input) => {
          // Test logic
          const result = someFunction(input);
          return result; // Should return true
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

## Creating API Routes

### API Route Template

```typescript
// app/api/feature/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Process request
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Handle GET requests
}
```

## Environment Variables

### Required Variables

- `GROQ_API_KEY` - Groq API key for LLM service
- `OPENAI_API_KEY` - OpenAI API key (optional, for fallback)
- `NEXT_PUBLIC_APP_URL` - Application URL

### Optional Variables

- `MAX_MESSAGES_PER_MINUTE` - Rate limit (default: 10)
- `MAX_TOKENS_PER_DAY` - Daily token cap (default: 10000)
- `ENABLE_FALLBACK_TTS` - Enable OpenAI TTS fallback (default: false)

### Accessing Environment Variables

```typescript
// Server-side (API routes, server components)
const apiKey = process.env.GROQ_API_KEY;

// Client-side (must be prefixed with NEXT_PUBLIC_)
const appUrl = process.env.NEXT_PUBLIC_APP_URL;
```

## Testing Guidelines

### Unit Tests

- Test specific functions and components
- Focus on edge cases and error conditions
- Use descriptive test names
- Keep tests isolated and independent

### Property-Based Tests

- Test universal properties that should hold for all inputs
- Use fast-check generators to create test data
- Run at least 100 iterations per property
- Tag tests with feature and property number

### Integration Tests

- Test complete user flows
- Test component interactions
- Test API endpoint behavior
- Use realistic test data

## Common Tasks

### Adding a New Feature

1. Create component in `components/feature/`
2. Create service in `services/feature/`
3. Add tests for both component and service
4. Update API routes if needed
5. Update documentation

### Debugging

```bash
# Run tests for specific file
npm test -- ComponentName.test.tsx

# Run tests in watch mode
npm run test:watch

# Check TypeScript errors
npx tsc --noEmit

# Check for linting issues
npm run lint
```

### Performance Optimization

- Use React.memo for expensive components
- Implement code splitting with dynamic imports
- Optimize images with Next.js Image component
- Use client-side caching for API responses
- Monitor bundle size with `npm run build`

## Deployment

### Vercel Deployment

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```

4. **Set environment variables**:
   ```bash
   vercel env add GROQ_API_KEY
   vercel env add OPENAI_API_KEY
   ```

### Manual Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Test the production build locally:
   ```bash
   npm start
   ```

3. Deploy the `.next` folder to your hosting provider

## Troubleshooting

### Common Issues

**Tests failing with module not found**:
- Check that all dependencies are installed: `npm install`
- Verify import paths use `@/` alias correctly

**Build errors**:
- Check TypeScript errors: `npx tsc --noEmit`
- Verify all environment variables are set

**API routes not working**:
- Check that environment variables are set in `.env.local`
- Verify API route file is named `route.ts`
- Check that request/response types are correct

**Hot reload not working**:
- Restart the development server
- Clear `.next` folder: `rm -rf .next`

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [fast-check Documentation](https://fast-check.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Vercel Documentation](https://vercel.com/docs)

## Getting Help

- Check the [README.md](./README.md) for project overview
- Review [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) for organization
- Check the spec files in `.kiro/specs/ai-avatar-system/`
- Open an issue on the repository
