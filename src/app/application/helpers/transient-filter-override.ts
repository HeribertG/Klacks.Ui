// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Remembers which filter fields a navigation request overrode and what they held before, so that the filter
 * written to storage carries the user's own values instead of the request's. The override is all or nothing: as long
 * as every overridden field still holds the request's value, all of them are reverted; once the user changed any one
 * of them (typically the validity date of the window), the user has taken the view over and every overridden field is
 * kept, so the stored filter is never a mix of the request's and the user's values.
 * @param baseline - Value each overridden field held before the request
 * @param applied - Value each overridden field was set to by the request
 */

import { cloneObject } from '../../domain/helpers/object.helper';

export class TransientFilterOverride<F extends object> {
  private readonly baseline: Partial<F> = {};
  private readonly applied: Partial<F> = {};

  get isActive(): boolean {
    return Object.keys(this.baseline).length > 0;
  }

  apply(filter: F, changes: Partial<F>): void {
    if (this.isTakenOver(filter)) {
      this.commit();
    }

    for (const key of keysOf(changes)) {
      if (!Object.hasOwn(this.baseline, key)) {
        this.baseline[key] = filter[key];
      }
      const next = changes[key] as F[typeof key];
      this.applied[key] = next;
      filter[key] = next;
    }
  }

  isTakenOver(current: F): boolean {
    return keysOf(this.applied).some(key => !sameValue(current[key], this.applied[key]));
  }

  revertedCopy(current: F): F {
    if (!this.isActive || this.isTakenOver(current)) {
      return current;
    }

    const copy = cloneObject(current);
    for (const key of keysOf(this.baseline)) {
      copy[key] = this.baseline[key] as F[typeof key];
    }
    return copy;
  }

  commit(): void {
    for (const key of keysOf(this.baseline)) {
      delete this.baseline[key];
      delete this.applied[key];
    }
  }
}

function keysOf<T extends object>(value: Partial<T>): (keyof T)[] {
  return Object.keys(value) as (keyof T)[];
}

function sameValue(first: unknown, second: unknown): boolean {
  if (first instanceof Date && second instanceof Date) {
    return first.getTime() === second.getTime();
  }
  if (first == null && second == null) {
    return true;
  }
  return first === second;
}
