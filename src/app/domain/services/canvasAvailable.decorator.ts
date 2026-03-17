// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Decorator ensuring methods only execute when a canvas is available.
 * Uses per-instance queues via a Symbol key to avoid cross-instance contamination
 * and ensures all decorated methods' queued calls are drained by executeQueuedMethods.
 */

export interface CanvasAvailable {
  isCanvasAvailable: () => boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CANVAS_QUEUE = Symbol('canvasMethodQueue');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface QueueEntry { method: (...args: any[]) => any; args: any[] }

export function CanvasAvailable(
  errorHandling: 'warn' | 'throw' | 'queue' = 'warn'
) {
  return function <T extends CanvasAvailable>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    target: any,
    propertyKey: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    descriptor: TypedPropertyDescriptor<(...args: any[]) => any>
  ) {
    const originalMethod = descriptor.value;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    descriptor.value = function (this: T & { [CANVAS_QUEUE]?: QueueEntry[] }, ...args: any[]) {
      if (this.isCanvasAvailable()) {
        return originalMethod!.apply(this, args);
      } else {
        const message = `Method ${propertyKey} was called, but canvas is not available.`;
        if (errorHandling === 'throw') {
          throw new Error(message);
        } else if (errorHandling === 'warn') {
          console.warn(message);
        } else if (errorHandling === 'queue') {
          if (!this[CANVAS_QUEUE]) {
            this[CANVAS_QUEUE] = [];
          }
          this[CANVAS_QUEUE].push({ method: originalMethod!, args });
        }
      }
    };

    if (!Object.prototype.hasOwnProperty.call(target, 'executeQueuedMethods')) {
      Object.defineProperty(target, 'executeQueuedMethods', {
        value: function (this: T & { [CANVAS_QUEUE]?: QueueEntry[] }) {
          const queue = this[CANVAS_QUEUE];
          if (!queue || queue.length === 0) return;
          this[CANVAS_QUEUE] = [];
          for (const { method, args } of queue) {
            if (this.isCanvasAvailable()) {
              method.apply(this, args);
            }
          }
        },
        writable: false,
        configurable: true,
      });
    }

    return descriptor;
  };
}
