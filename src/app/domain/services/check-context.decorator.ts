// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

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
