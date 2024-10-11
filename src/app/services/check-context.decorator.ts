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
    } else {
      console.warn(
        `Method ${propertyKey} was not executed because ‘ctx’ is null or undefined.`
      );
    }
  };

  return descriptor;
}
