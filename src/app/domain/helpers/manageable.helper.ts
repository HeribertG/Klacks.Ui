// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Type guards for the optional capabilities of the manageable service behind a workplace page.
 * @param value - Any value, typically the active manager of the workplace or a refreshable target
 */
import { ISaveable } from 'src/app/domain/interfaces/manageable.interface';

export function isSaveable(value: unknown): value is ISaveable {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Partial<ISaveable>;
  return typeof candidate.areObjectsDirty === 'function' && typeof candidate.save === 'function';
}
