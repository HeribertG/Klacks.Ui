// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

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
