export interface CanvasAvailable {
  isCanvasAvailable: () => boolean;
}

/**
 * @description
 * This decorator ensures that a method is executed only when a canvas is available.
 *
 * Prerequisite: The target class must implement the `CanvasAvailable` interface,
 * which provides the `isCanvasAvailable()` method.
 *
 * Behavior:
 * - If `isCanvasAvailable()` returns true, the original method is executed as usual.
 * - Otherwise, the behavior is determined by the `errorHandling` parameter:
 *   - 'throw': An error is thrown.
 *   - 'warn': A warning is logged to the console.
 *   - 'queue': The method call is enqueued to be executed later.
 *
 * Additionally, the method `executeQueuedMethods` is added to the class prototype,
 * which processes all queued method calls.
 *
 * @param errorHandling - Determines the behavior when the canvas is not available.
 *                        Possible values: 'warn', 'throw', or 'queue'.
 * @returns The modified method descriptor implementing the described behavior.
 */
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/array-type
    const methodQueue: Array<{ method: (...args: any[]) => any; args: any[] }> =
      [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    descriptor.value = function (this: T, ...args: any[]) {
      if (this.isCanvasAvailable()) {
        return originalMethod!.apply(this, args);
      } else {
        const message = `Method ${propertyKey} was called, but canvas is not available.`;
        if (errorHandling === 'throw') {
          throw new Error(message);
        } else if (errorHandling === 'warn') {
          console.warn(message);
        } else if (errorHandling === 'queue') {
          methodQueue.push({ method: originalMethod!, args });
        }
      }
    };

    if (!Object.prototype.hasOwnProperty.call(target, 'executeQueuedMethods')) {
      Object.defineProperty(target, 'executeQueuedMethods', {
        value: function (this: T) {
          while (methodQueue.length > 0) {
            const { method, args } = methodQueue.shift()!;
            method.apply(this, args);
          }
        },
        writable: false,
        configurable: true,
      });
    }

    return descriptor;
  };
}
