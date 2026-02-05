import { Injectable, NgZone, inject, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ResizeService {
  public resizeTrigger = signal<number>(0);
  private ngZone: NgZone = inject(NgZone);
  private resizeSubject$ = toObservable(this.resizeTrigger);

  observe(element: HTMLElement): Observable<void> {
    return new Observable((observer) => {
      const appResizeObserver = new ResizeObserver(() => {
        this.ngZone.run(() => {
          this.resizeTrigger.update((v) => v + 1);
          observer.next();
        });
      });

      appResizeObserver.observe(element);

      return () => {
        appResizeObserver.disconnect();
      };
    });
  }

  onResize(): Observable<number> {
    return this.resizeSubject$;
  }
}
