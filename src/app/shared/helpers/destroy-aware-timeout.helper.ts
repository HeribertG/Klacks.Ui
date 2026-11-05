// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Creates a setTimeout replacement bound to a DestroyRef: every callback still pending when the owner is destroyed is
 * cancelled, so deferred work never runs against (or emits from) a destroyed component.
 * @param destroyRef - Lifetime of the owning component or directive
 */

import { DestroyRef } from '@angular/core';

type DestroyAwareTimeout = (callback: () => void, delayMs: number) => void;

export function createDestroyAwareTimeout(destroyRef: DestroyRef): DestroyAwareTimeout {
  const pending = new Set<ReturnType<typeof setTimeout>>();
  destroyRef.onDestroy(() => {
    pending.forEach((handle) => clearTimeout(handle));
    pending.clear();
  });

  return (callback: () => void, delayMs: number): void => {
    const handle = setTimeout(() => {
      pending.delete(handle);
      callback();
    }, delayMs);
    pending.add(handle);
  };
}
