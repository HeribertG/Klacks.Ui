import { Injectable, NgZone } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ResizeService {
  private resizeSubject: Subject<void> = new Subject<void>();

  constructor(private ngZone: NgZone) {}

  observe(element: HTMLElement): Observable<void> {
    return new Observable((observer) => {
      const appResizeObserver = new ResizeObserver(() => {
        this.ngZone.run(() => {
          this.resizeSubject.next();
          observer.next();
        });
      });

      appResizeObserver.observe(element);

      return () => {
        appResizeObserver.disconnect();
      };
    });
  }

  onResize(): Observable<void> {
    return this.resizeSubject.asObservable();
  }
}
