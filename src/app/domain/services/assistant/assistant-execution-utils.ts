// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export function waitForElement(id: string, maxWaitMs = 3000): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const existing = document.getElementById(id);
    if (existing) {
      resolve(existing);
      return;
    }
    const interval = 200;
    let elapsed = 0;
    const timer = setInterval(() => {
      elapsed += interval;
      const el = document.getElementById(id);
      if (el) {
        clearInterval(timer);
        resolve(el);
      } else if (elapsed >= maxWaitMs) {
        clearInterval(timer);
        resolve(null);
      }
    }, interval);
  });
}
