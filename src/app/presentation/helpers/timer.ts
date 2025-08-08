export class Timer {
  private timerId: number | undefined = undefined;

  start(callback: () => void, delay: number) {
    if (!this.timerId) {
      this.timerId = window.setInterval(callback, delay);
    }
  }

  stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = undefined;
    }
  }
}
