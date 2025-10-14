import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { DomainEvent } from './domain-event.interface';

export interface IEventBus {
  emit<T>(eventType: string, payload: T): void;
  on<T>(eventType: string): Observable<T>;
  onAny(): Observable<DomainEvent>;
}

export const EVENT_BUS_TOKEN = new InjectionToken<IEventBus>('IEventBus');
