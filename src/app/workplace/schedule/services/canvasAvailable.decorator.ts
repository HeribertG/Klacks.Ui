type CanvasAvailableType = {
  isCanvasAvailable: () => boolean;
};

export function CanvasAvailable(errorHandling: 'warn' | 'throw' = 'warn') {
  return function <T extends CanvasAvailableType>(
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<(...args: any[]) => any>
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (this: T, ...args: any[]) {
      if (this.isCanvasAvailable()) {
        return originalMethod!.apply(this, args);
      } else {
        const message = `Method ${propertyKey} was called, but canvas is not available.`;
        if (errorHandling === 'throw') {
          throw new Error(message);
        } else {
          console.warn(message);
        }
        return;
      }
    };

    return descriptor;
  };
}
