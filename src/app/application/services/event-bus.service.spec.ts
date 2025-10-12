import { TestBed } from '@angular/core/testing';
import { EventBus, DomainEvent } from './event-bus.service';
import { take } from 'rxjs/operators';

describe('EventBus', () => {
  let service: EventBus;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [EventBus],
    });
    service = TestBed.inject(EventBus);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('emit', () => {
    it('should emit an event with correct type and payload', (done) => {
      const eventType = 'TEST_EVENT';
      const payload = { message: 'test message' };

      service.onAny().pipe(take(1)).subscribe((event: DomainEvent) => {
        expect(event.type).toBe(eventType);
        expect(event.payload).toEqual(payload);
        expect(event.timestamp).toBeInstanceOf(Date);
        done();
      });

      service.emit(eventType, payload);
    });

    it('should emit multiple events', (done) => {
      const events: DomainEvent[] = [];

      service.onAny().pipe(take(3)).subscribe({
        next: (event) => events.push(event),
        complete: () => {
          expect(events.length).toBe(3);
          expect(events[0].type).toBe('EVENT_1');
          expect(events[1].type).toBe('EVENT_2');
          expect(events[2].type).toBe('EVENT_3');
          done();
        },
      });

      service.emit('EVENT_1', { data: 1 });
      service.emit('EVENT_2', { data: 2 });
      service.emit('EVENT_3', { data: 3 });
    });
  });

  describe('on', () => {
    it('should subscribe to specific event type', (done) => {
      const eventType = 'SPECIFIC_EVENT';
      const payload = { value: 42 };

      service.on<typeof payload>(eventType).pipe(take(1)).subscribe((data) => {
        expect(data).toEqual(payload);
        done();
      });

      service.emit('OTHER_EVENT', { value: 1 });
      service.emit(eventType, payload);
      service.emit('ANOTHER_EVENT', { value: 2 });
    });

    it('should filter out unrelated events', (done) => {
      const receivedEvents: unknown[] = [];

      service.on('TARGET_EVENT').pipe(take(2)).subscribe({
        next: (data) => receivedEvents.push(data),
        complete: () => {
          expect(receivedEvents.length).toBe(2);
          expect(receivedEvents[0]).toEqual({ id: 1 });
          expect(receivedEvents[1]).toEqual({ id: 2 });
          done();
        },
      });

      service.emit('OTHER_EVENT', { id: 99 });
      service.emit('TARGET_EVENT', { id: 1 });
      service.emit('UNRELATED_EVENT', { id: 98 });
      service.emit('TARGET_EVENT', { id: 2 });
    });

    it('should handle multiple subscribers to same event', (done) => {
      const eventType = 'SHARED_EVENT';
      const payload = { message: 'shared' };
      let subscriber1Received = false;
      let subscriber2Received = false;

      service.on<typeof payload>(eventType).pipe(take(1)).subscribe((data) => {
        expect(data).toEqual(payload);
        subscriber1Received = true;
        checkBothReceived();
      });

      service.on<typeof payload>(eventType).pipe(take(1)).subscribe((data) => {
        expect(data).toEqual(payload);
        subscriber2Received = true;
        checkBothReceived();
      });

      function checkBothReceived() {
        if (subscriber1Received && subscriber2Received) {
          done();
        }
      }

      service.emit(eventType, payload);
    });
  });

  describe('onAny', () => {
    it('should receive all events', (done) => {
      const events: DomainEvent[] = [];

      service.onAny().pipe(take(3)).subscribe({
        next: (event) => events.push(event),
        complete: () => {
          expect(events.length).toBe(3);
          expect(events.map(e => e.type)).toEqual(['TYPE_A', 'TYPE_B', 'TYPE_C']);
          done();
        },
      });

      service.emit('TYPE_A', { a: 1 });
      service.emit('TYPE_B', { b: 2 });
      service.emit('TYPE_C', { c: 3 });
    });

    it('should provide full event objects with timestamp', (done) => {
      const beforeEmit = new Date();

      service.onAny().pipe(take(1)).subscribe((event) => {
        expect(event.type).toBe('TIMED_EVENT');
        expect(event.payload).toEqual({ data: 'test' });
        expect(event.timestamp).toBeInstanceOf(Date);
        expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(beforeEmit.getTime());
        done();
      });

      service.emit('TIMED_EVENT', { data: 'test' });
    });
  });

  describe('event isolation', () => {
    it('should not emit to completed subscribers', (done) => {
      let receivedCount = 0;

      const subscription = service.on('TEST_EVENT').pipe(take(1)).subscribe(() => {
        receivedCount++;
      });

      service.emit('TEST_EVENT', {});

      setTimeout(() => {
        service.emit('TEST_EVENT', {});

        setTimeout(() => {
          expect(receivedCount).toBe(1);
          done();
        }, 50);
      }, 50);
    });

    it('should allow unsubscribe', (done) => {
      let receivedCount = 0;

      const subscription = service.on('UNSUB_EVENT').subscribe(() => {
        receivedCount++;
      });

      service.emit('UNSUB_EVENT', {});

      setTimeout(() => {
        subscription.unsubscribe();
        service.emit('UNSUB_EVENT', {});

        setTimeout(() => {
          expect(receivedCount).toBe(1);
          done();
        }, 50);
      }, 50);
    });
  });

  describe('type safety', () => {
    interface CustomPayload {
      id: number;
      name: string;
    }

    it('should handle typed payloads', (done) => {
      const payload: CustomPayload = { id: 1, name: 'Test' };

      service.on<CustomPayload>('TYPED_EVENT').pipe(take(1)).subscribe((data) => {
        expect(data.id).toBe(1);
        expect(data.name).toBe('Test');
        done();
      });

      service.emit('TYPED_EVENT', payload);
    });
  });

  describe('edge cases', () => {
    it('should handle null payload', (done) => {
      service.on<null>('NULL_EVENT').pipe(take(1)).subscribe((data) => {
        expect(data).toBeNull();
        done();
      });

      service.emit('NULL_EVENT', null);
    });

    it('should handle undefined payload', (done) => {
      service.on<undefined>('UNDEFINED_EVENT').pipe(take(1)).subscribe((data) => {
        expect(data).toBeUndefined();
        done();
      });

      service.emit('UNDEFINED_EVENT', undefined);
    });

    it('should handle empty string as event type', (done) => {
      service.on<string>('').pipe(take(1)).subscribe((data) => {
        expect(data).toBe('test');
        done();
      });

      service.emit('', 'test');
    });

    it('should handle complex nested payloads', (done) => {
      const complexPayload = {
        user: {
          id: 1,
          profile: {
            name: 'John',
            meta: { role: 'admin' },
          },
        },
        timestamp: new Date(),
      };

      service.on<typeof complexPayload>('COMPLEX_EVENT').pipe(take(1)).subscribe((data) => {
        expect(data).toEqual(complexPayload);
        done();
      });

      service.emit('COMPLEX_EVENT', complexPayload);
    });
  });
});
