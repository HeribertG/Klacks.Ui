export interface CanvasAvailable {
  isCanvasAvailable: () => boolean;
}

export function CanvasAvailable(
  errorHandling: 'warn' | 'throw' | 'queue' = 'warn'
) {
  return function <T extends CanvasAvailable>(
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<(...args: any[]) => any>
  ) {
    const originalMethod = descriptor.value;
    const methodQueue: Array<{ method: (...args: any[]) => any; args: any[] }> =
      [];

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
          console.log(`Queueing ${propertyKey} until canvas is available.`);
          methodQueue.push({ method: originalMethod!, args });
        }
      }
    };

    if (!target.hasOwnProperty('executeQueuedMethods')) {
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
