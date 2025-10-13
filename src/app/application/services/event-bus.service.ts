import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';

export interface DomainEvent<T = unknown> {
  type: string;
  payload: T;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root',
})
export class EventBus {
  private eventSubject = new Subject<DomainEvent>();

  emit<T>(eventType: string, payload: T): void {
    const event: DomainEvent<T> = {
      type: eventType,
      payload,
      timestamp: new Date(),
    };
    this.eventSubject.next(event);
  }

  on<T>(eventType: string): Observable<T> {
    return this.eventSubject.asObservable().pipe(
      filter((event) => event.type === eventType),
      map((event) => event.payload as T)
    );
  }

  onAny(): Observable<DomainEvent> {
    return this.eventSubject.asObservable();
  }
}
