export function CheckContext(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  descriptor.value = function (...args: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const instance = this as any;

    if (instance && instance.ctx) {
      return originalMethod.apply(this, args);
    }
  };

  return descriptor;
}
