export class Timer {
  private timerId: NodeJS.Timeout | undefined = undefined;

  start(callback: () => void, delay: number) {
    if (!this.timerId) {
      this.timerId = setInterval(callback, delay);
    }
  }

  stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = undefined;
    }
  }
}
