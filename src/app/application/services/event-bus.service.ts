import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { IEventBus } from '../../domain/interfaces/event-bus.interface';
import { DomainEvent } from '../../domain/interfaces/domain-event.interface';

@Injectable({
  providedIn: 'root',
})
export class EventBus implements IEventBus {
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
