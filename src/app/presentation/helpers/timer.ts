// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export class Timer {
  private timerId: number | undefined = undefined;

  start(callback: () => void, delay: number) {
    if (!this.timerId) {
      this.timerId = window.setTimeout(callback, delay);
    }
  }

  stop() {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = undefined;
    }
  }
}
