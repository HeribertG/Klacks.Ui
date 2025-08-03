/* eslint-disable @typescript-eslint/no-explicit-any */
export function CheckContext(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;

  descriptor.value = function (...args: any[]) {
    const instance = this as any;

    if (instance && instance.ctx) {
      return originalMethod.apply(this, args);
    }
  };

  return descriptor;
}
