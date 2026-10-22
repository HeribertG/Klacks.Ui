// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Decorator ensuring methods only execute when a canvas is available.
 * Uses per-instance queues via a Symbol key to avoid cross-instance contamination
 * and ensures all decorated methods' queued calls are drained by executeQueuedMethods.
 */

import { QueueEntry } from './queue-entry.interface';

export interface CanvasAvailable {
  isCanvasAvailable: () => boolean;
}

const CANVAS_QUEUE = Symbol('canvasMethodQueue');

export function CanvasAvailable(
  errorHandling: 'warn' | 'throw' | 'queue' = 'warn'
) {
  return function <T extends CanvasAvailable, M extends (...args: never[]) => unknown>(
    target: object,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<M>
  ): TypedPropertyDescriptor<M> {
    const originalMethod = descriptor.value;
    descriptor.value = function (this: T & { [CANVAS_QUEUE]?: QueueEntry[] }, ...args: Parameters<M>) {
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
        return undefined;
      }
    } as M;

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
