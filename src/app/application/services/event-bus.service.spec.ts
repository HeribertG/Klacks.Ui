import { TestBed } from '@angular/core/testing';
import { EventBus } from './event-bus.service';
import { DomainEvent } from '../../domain/interfaces/domain-event.interface';
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
        it('should emit an event with correct type and payload', async () => {
            const eventType = 'TEST_EVENT';
            const payload = { message: 'test message' };

            service.onAny().pipe(take(1)).subscribe((event: DomainEvent) => {
                expect(event.type).toBe(eventType);
                expect(event.payload).toEqual(payload);
                expect(event.timestamp).toBeInstanceOf(Date);
                ;
            });

            service.emit(eventType, payload);
        });

        it('should emit multiple events', async () => {
            const events: DomainEvent[] = [];

            service.onAny().pipe(take(3)).subscribe({
                next: (event) => events.push(event),
                complete: () => {
                    expect(events.length).toBe(3);
                    expect(events[0].type).toBe('EVENT_1');
                    expect(events[1].type).toBe('EVENT_2');
                    expect(events[2].type).toBe('EVENT_3');
                    ;
                },
            });

            service.emit('EVENT_1', { data: 1 });
            service.emit('EVENT_2', { data: 2 });
            service.emit('EVENT_3', { data: 3 });
        });
    });

    describe('on', () => {
        it('should subscribe to specific event type', async () => {
            const eventType = 'SPECIFIC_EVENT';
            const payload = { value: 42 };

            service.on<typeof payload>(eventType).pipe(take(1)).subscribe((data) => {
                expect(data).toEqual(payload);
                ;
            });

            service.emit('OTHER_EVENT', { value: 1 });
            service.emit(eventType, payload);
            service.emit('ANOTHER_EVENT', { value: 2 });
        });

        it('should filter out unrelated events', async () => {
            const receivedEvents: unknown[] = [];

            service.on('TARGET_EVENT').pipe(take(2)).subscribe({
                next: (data) => receivedEvents.push(data),
                complete: () => {
                    expect(receivedEvents.length).toBe(2);
                    expect(receivedEvents[0]).toEqual({ id: 1 });
                    expect(receivedEvents[1]).toEqual({ id: 2 });
                    ;
                },
            });

            service.emit('OTHER_EVENT', { id: 99 });
            service.emit('TARGET_EVENT', { id: 1 });
            service.emit('UNRELATED_EVENT', { id: 98 });
            service.emit('TARGET_EVENT', { id: 2 });
        });

        it('should handle multiple subscribers to same event', async () => {
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
                    ;
                }
            }

            service.emit(eventType, payload);
        });
    });

    describe('onAny', () => {
        it('should receive all events', async () => {
            const events: DomainEvent[] = [];

            service.onAny().pipe(take(3)).subscribe({
                next: (event) => events.push(event),
                complete: () => {
                    expect(events.length).toBe(3);
                    expect(events.map(e => e.type)).toEqual(['TYPE_A', 'TYPE_B', 'TYPE_C']);
                    ;
                },
            });

            service.emit('TYPE_A', { a: 1 });
            service.emit('TYPE_B', { b: 2 });
            service.emit('TYPE_C', { c: 3 });
        });

        it('should provide full event objects with timestamp', async () => {
            const beforeEmit = new Date();

            service.onAny().pipe(take(1)).subscribe((event) => {
                expect(event.type).toBe('TIMED_EVENT');
                expect(event.payload).toEqual({ data: 'test' });
                expect(event.timestamp).toBeInstanceOf(Date);
                expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(beforeEmit.getTime());
                ;
            });

            service.emit('TIMED_EVENT', { data: 'test' });
        });
    });

    describe('event isolation', () => {
        it('should not emit to completed subscribers', async () => {
            let receivedCount = 0;

            service.on('TEST_EVENT').pipe(take(1)).subscribe(() => {
                receivedCount++;
            });

            service.emit('TEST_EVENT', {});

            await new Promise(resolve => setTimeout(resolve, 50));
            service.emit('TEST_EVENT', {});

            await new Promise(resolve => setTimeout(resolve, 50));
            expect(receivedCount).toBe(1);
        });

        it('should allow unsubscribe', async () => {
            let receivedCount = 0;

            const subscription = service.on('UNSUB_EVENT').subscribe(() => {
                receivedCount++;
            });

            service.emit('UNSUB_EVENT', {});

            await new Promise(resolve => setTimeout(resolve, 50));
            subscription.unsubscribe();
            service.emit('UNSUB_EVENT', {});

            await new Promise(resolve => setTimeout(resolve, 50));
            expect(receivedCount).toBe(1);
        });
    });

    describe('type safety', () => {
        interface CustomPayload {
            id: number;
            name: string;
        }

        it('should handle typed payloads', async () => {
            const payload: CustomPayload = { id: 1, name: 'Test' };

            service.on<CustomPayload>('TYPED_EVENT').pipe(take(1)).subscribe((data) => {
                expect(data.id).toBe(1);
                expect(data.name).toBe('Test');
                ;
            });

            service.emit('TYPED_EVENT', payload);
        });
    });

    describe('edge cases', () => {
        it('should handle null payload', async () => {
            service.on<null>('NULL_EVENT').pipe(take(1)).subscribe((data) => {
                expect(data).toBeNull();
                ;
            });

            service.emit('NULL_EVENT', null);
        });

        it('should handle undefined payload', async () => {
            service.on<undefined>('UNDEFINED_EVENT').pipe(take(1)).subscribe((data) => {
                expect(data).toBeUndefined();
                ;
            });

            service.emit('UNDEFINED_EVENT', undefined);
        });

        it('should handle empty string as event type', async () => {
            service.on<string>('').pipe(take(1)).subscribe((data) => {
                expect(data).toBe('test');
                ;
            });

            service.emit('', 'test');
        });

        it('should handle complex nested payloads', async () => {
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
                ;
            });

            service.emit('COMPLEX_EVENT', complexPayload);
        });
    });
});
