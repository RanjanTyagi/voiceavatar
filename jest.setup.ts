import '@testing-library/jest-dom';

// Mock Next.js server components for API route testing
if (typeof Request === 'undefined') {
  global.Request = class Request {
    constructor(public url: string, public init?: RequestInit) {}
  } as any;
}

if (typeof Response === 'undefined') {
  global.Response = class Response {
    constructor(public body?: BodyInit | null, public init?: ResponseInit) {}
    static json(data: any, init?: ResponseInit) {
      return new Response(JSON.stringify(data), {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...init?.headers,
        },
      });
    }
  } as any;
}

if (typeof Headers === 'undefined') {
  global.Headers = class Headers extends Map {
    constructor(init?: HeadersInit) {
      super();
      if (init) {
        if (Array.isArray(init)) {
          init.forEach(([key, value]) => this.set(key, value));
        } else if (init instanceof Headers) {
          init.forEach((value, key) => this.set(key, value));
        } else {
          Object.entries(init).forEach(([key, value]) => this.set(key, value));
        }
      }
    }
  } as any;
}
