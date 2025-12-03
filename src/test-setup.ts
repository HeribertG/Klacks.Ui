/* eslint-disable @typescript-eslint/no-explicit-any */
// Global test setup for Vitest
// This file is loaded before any test file runs

// Force override ResizeObserver - must be defined as a proper class
(window as any).ResizeObserver = class ResizeObserver {
    callback: ResizeObserverCallback;

    constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
    }

    observe(_target: Element, _options?: ResizeObserverOptions): void {
        // Optionally trigger callback with empty entries
    }

    unobserve(_target: Element): void {}

    disconnect(): void {}
};

// Also set on globalThis for Node.js environments
(globalThis as any).ResizeObserver = (window as any).ResizeObserver;

// Mock matchMedia which is not available in jsdom
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
    }),
});

// Force override IntersectionObserver - must be defined as a proper class
(window as any).IntersectionObserver = class IntersectionObserver {
    readonly root: Element | Document | null = null;
    readonly rootMargin: string = '';
    readonly thresholds: readonly number[] = [];
    private callback: IntersectionObserverCallback;

    constructor(callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {
        this.callback = callback;
    }

    observe(_target: Element): void {}
    unobserve(_target: Element): void {}
    disconnect(): void {}
    takeRecords(): IntersectionObserverEntry[] { return []; }
};

(globalThis as any).IntersectionObserver = (window as any).IntersectionObserver;

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
    writable: true,
    configurable: true,
    value: () => {},
});

// Mock HTMLElement.prototype.scrollIntoView
HTMLElement.prototype.scrollIntoView = function() {};

// Mock Element.prototype.animate for WAAPI
Element.prototype.animate = function() {
    return {
        finished: Promise.resolve(),
        cancel: () => {},
        pause: () => {},
        play: () => {},
        reverse: () => {},
        onfinish: null,
        oncancel: null,
        finish: () => {},
    } as unknown as Animation;
};
