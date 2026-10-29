// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Remembers which filter fields a navigation request overrode and what they held before, so that the filter
 * written to storage can carry the user's own values instead of the request's. A field the user changed after the
 * override is not reverted: it keeps the user's value.
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
    for (const key of keysOf(changes)) {
      const current = filter[key];
      const baselineStillValid = Object.hasOwn(this.baseline, key) && sameValue(current, this.applied[key]);
      if (!baselineStillValid) {
        this.baseline[key] = current;
      }
      const next = changes[key] as F[typeof key];
      this.applied[key] = next;
      filter[key] = next;
    }
  }

  revertedCopy(current: F): F {
    if (!this.isActive) {
      return current;
    }

    const copy = cloneObject(current);
    for (const key of keysOf(this.baseline)) {
      if (sameValue(current[key], this.applied[key])) {
        copy[key] = this.baseline[key] as F[typeof key];
      }
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
  return first === second;
}
