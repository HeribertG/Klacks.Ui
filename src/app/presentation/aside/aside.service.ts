import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AsideService {
  public isVisible = signal<boolean>(false);

  show(): void {
    console.log('AsideService: show() called');
    this.isVisible.set(true);
  }

  hide(): void {
    console.log('AsideService: hide() called');
    this.isVisible.set(false);
  }

  toggle(): void {
    const newValue = !this.isVisible();
    console.log('AsideService: toggle() called - current:', this.isVisible(), 'new:', newValue);
    this.isVisible.set(newValue);
  }
}
