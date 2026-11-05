// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { DestroyRef } from '@angular/core';
import { createDestroyAwareTimeout } from './destroy-aware-timeout.helper';

function createDestroyRef(): { ref: DestroyRef; destroy: () => void } {
  const callbacks: (() => void)[] = [];
  const ref = {
    onDestroy: (callback: () => void) => {
      callbacks.push(callback);
      return () => undefined;
    },
    destroyed: false,
  } as unknown as DestroyRef;
  return { ref, destroy: () => callbacks.forEach((callback) => callback()) };
}

describe('createDestroyAwareTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs the callback after the delay while the owner is alive', () => {
    const { ref } = createDestroyRef();
    const callback = vi.fn();

    createDestroyAwareTimeout(ref)(callback, 100);
    vi.advanceTimersByTime(99);
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('cancels every pending callback when the owner is destroyed', () => {
    const { ref, destroy } = createDestroyRef();
    const first = vi.fn();
    const second = vi.fn();
    const schedule = createDestroyAwareTimeout(ref);

    schedule(first, 100);
    schedule(second, 300);
    destroy();
    vi.advanceTimersByTime(1000);

    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();
  });
});
