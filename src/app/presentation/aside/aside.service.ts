import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AsideService {
  private isVisible$ = new BehaviorSubject<boolean>(false);

  get isVisible() {
    return this.isVisible$.asObservable();
  }

  get isVisibleValue(): boolean {
    return this.isVisible$.value;
  }

  show(): void {
    console.log('AsideService: show() called');
    this.isVisible$.next(true);
  }

  hide(): void {
    console.log('AsideService: hide() called');
    this.isVisible$.next(false);
  }

  toggle(): void {
    const newValue = !this.isVisible$.value;
    console.log('AsideService: toggle() called - current:', this.isVisible$.value, 'new:', newValue);
    this.isVisible$.next(newValue);
  }
}
