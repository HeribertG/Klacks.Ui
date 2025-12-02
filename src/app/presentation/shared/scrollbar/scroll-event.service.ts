import { Injectable, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';

export interface ScrollPosition {
  horizontal: number;
  vertical: number;
}

@Injectable({
  providedIn: 'root'
})
export class ScrollEventService {
  public scrollPosition = signal<ScrollPosition>({ horizontal: 0, vertical: 0 });
  public scroll$ = toObservable(this.scrollPosition);

  public emitScroll(horizontal: number, vertical: number): void {
    this.scrollPosition.set({ horizontal, vertical });
  }
}
