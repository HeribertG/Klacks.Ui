// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { EventBus } from './event-bus.service';
import { DomainEventHandler } from 'src/app/presentation/handlers/domain-event.handler';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { DomainEventType, ErrorEvent, SuccessEvent, WarningEvent, InfoEvent, NavigationEvent, } from 'src/app/domain/events/domain-events';

describe('EventBus Integration Tests', () => {
    let eventBus: EventBus;
    let mockToastService: any;
    let mockRouter: any;

    beforeEach(() => {
        const toastServiceSpy = {
            showError: vi.fn(),
            showSuccess: vi.fn(),
            showInfo: vi.fn()
        };
        const routerSpy = {
            navigate: vi.fn()
        };

        TestBed.configureTestingModule({
            providers: [
                EventBus,
                DomainEventHandler,
                { provide: ToastShowService, useValue: toastServiceSpy },
                { provide: Router, useValue: routerSpy },
            ],
        });

        eventBus = TestBed.inject(EventBus);
        TestBed.inject(DomainEventHandler);
        mockToastService = TestBed.inject(ToastShowService) as any;
        mockRouter = TestBed.inject(Router) as any;
    });

    describe('ERROR Event Flow', () => {
        it('should propagate ERROR event from Domain to Toast', async () => {
            const errorEvent: ErrorEvent = {
                message: 'Test error message',
                code: 'TEST_ERROR',
                context: 'TestService.testMethod',
            };

            eventBus.emit(DomainEventType.ERROR, errorEvent);

            await new Promise(resolve => setTimeout(resolve, 110));
            expect(mockToastService.showError).toHaveBeenCalledWith(errorEvent.message, errorEvent.code);
        });

        it('should handle ERROR event without code', async () => {
            const errorEvent: ErrorEvent = {
                message: 'Error without code',
            };

            eventBus.emit(DomainEventType.ERROR, errorEvent);

            await new Promise(resolve => setTimeout(resolve, 110));
            expect(mockToastService.showError).toHaveBeenCalledWith(errorEvent.message, 'Error');
        });

        it('should handle multiple ERROR events', async () => {
            eventBus.emit(DomainEventType.ERROR, { message: 'Error 1', code: 'ERR1' });
            eventBus.emit(DomainEventType.ERROR, { message: 'Error 2', code: 'ERR2' });
            eventBus.emit(DomainEventType.ERROR, { message: 'Error 3', code: 'ERR3' });

            await new Promise(resolve => setTimeout(resolve, 110));
            expect(mockToastService.showError).toHaveBeenCalledTimes(3);
            expect(mockToastService.showError).toHaveBeenCalledWith('Error 1', 'ERR1');
            expect(mockToastService.showError).toHaveBeenCalledWith('Error 2', 'ERR2');
            expect(mockToastService.showError).toHaveBeenCalledWith('Error 3', 'ERR3');
        });
    });

    describe('SUCCESS Event Flow', () => {
        it('should propagate SUCCESS event from Domain to Toast', async () => {
            const successEvent: SuccessEvent = {
                message: 'Operation successful',
                context: 'ShiftService.saveShift',
            };

            eventBus.emit(DomainEventType.SUCCESS, successEvent);

            await new Promise(resolve => setTimeout(resolve, 110));
            expect(mockToastService.showSuccess).toHaveBeenCalledWith(successEvent.message, successEvent.context || '', '');
        });

        it('should handle SUCCESS event without context', async () => {
            const successEvent: SuccessEvent = {
                message: 'Success!',
            };

            eventBus.emit(DomainEventType.SUCCESS, successEvent);

            await new Promise(resolve => setTimeout(resolve, 110));
            expect(mockToastService.showSuccess).toHaveBeenCalledWith(successEvent.message, '', '');
        });
    });

    describe('WARNING Event Flow', () => {
        it('should propagate WARNING event from Domain to Toast (as Info)', async () => {
            const warningEvent: WarningEvent = {
                message: 'Warning message',
                context: 'TestService',
            };

            eventBus.emit(DomainEventType.WARNING, warningEvent);

            await new Promise(resolve => setTimeout(resolve, 110));
            expect(mockToastService.showInfo).toHaveBeenCalledWith(warningEvent.message, warningEvent.context || '', '');
        });
    });

    describe('INFO Event Flow', () => {
        it('should propagate INFO event from Domain to Toast', async () => {
            const infoEvent: InfoEvent = {
                message: 'Information message',
                context: 'TestService',
            };

            eventBus.emit(DomainEventType.INFO, infoEvent);

            await new Promise(resolve => setTimeout(resolve, 110));
            expect(mockToastService.showInfo).toHaveBeenCalledWith(infoEvent.message, infoEvent.context || '', '');
        });
    });

    describe('NAVIGATE Event Flow', () => {
        it('should propagate NAVIGATE event from Domain to Router', async () => {
            const navigationEvent: NavigationEvent = {
                route: '/workplace/shift',
            };

            eventBus.emit(DomainEventType.NAVIGATE, navigationEvent);

            await new Promise(resolve => setTimeout(resolve, 110));
            expect(mockRouter.navigate).toHaveBeenCalledWith([navigationEvent.route]);
        });

        it('should handle multiple navigation events', async () => {
            eventBus.emit(DomainEventType.NAVIGATE, { route: '/route1' });
            eventBus.emit(DomainEventType.NAVIGATE, { route: '/route2' });

            await new Promise(resolve => setTimeout(resolve, 110));
            expect(mockRouter.navigate).toHaveBeenCalledTimes(2);
            expect(mockRouter.navigate).toHaveBeenCalledWith(['/route1']);
            expect(mockRouter.navigate).toHaveBeenCalledWith(['/route2']);
        });
    });

    describe('Mixed Event Flow', () => {
        it('should handle multiple different event types', async () => {
            eventBus.emit(DomainEventType.ERROR, { message: 'Error' });
            eventBus.emit(DomainEventType.SUCCESS, { message: 'Success' });
            eventBus.emit(DomainEventType.INFO, { message: 'Info' });
            eventBus.emit(DomainEventType.NAVIGATE, { route: '/test' });

            await new Promise(resolve => setTimeout(resolve, 110));
            expect(mockToastService.showError).toHaveBeenCalledTimes(1);
            expect(mockToastService.showSuccess).toHaveBeenCalledTimes(1);
            expect(mockToastService.showInfo).toHaveBeenCalledTimes(1);
            expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
        });

        it('should process events in order', async () => {
            const calls: string[] = [];

            mockToastService.showError.mockImplementation(() => calls.push('error'));
            mockToastService.showSuccess.mockImplementation(() => calls.push('success'));
            mockToastService.showInfo.mockImplementation(() => calls.push('info'));

            eventBus.emit(DomainEventType.ERROR, { message: '1' });
            eventBus.emit(DomainEventType.SUCCESS, { message: '2' });
            eventBus.emit(DomainEventType.INFO, { message: '3' });

            await new Promise(resolve => setTimeout(resolve, 110));
            expect(calls).toEqual(['error', 'success', 'info']);
        });
    });

    describe('Domain Service Simulation', () => {
        it('should simulate a Domain Service emitting events', async () => {
            class MockDomainService {
                constructor(private eventBus: EventBus) { }

                async saveData(data: unknown): Promise<void> {
                    try {
                        if (!data) {
                            this.eventBus.emit(DomainEventType.ERROR, {
                                message: 'Data is required',
                                code: 'VALIDATION_ERROR',
                                context: 'MockDomainService.saveData',
                            });
                            return;
                        }

                        this.eventBus.emit(DomainEventType.SUCCESS, {
                            message: 'Data saved successfully',
                            context: 'MockDomainService.saveData',
                        });

                        this.eventBus.emit(DomainEventType.NAVIGATE, {
                            route: '/success-page',
                        });
                    }
                    catch {
                        this.eventBus.emit(DomainEventType.ERROR, {
                            message: 'Failed to save data',
                            code: 'SAVE_ERROR',
                            context: 'MockDomainService.saveData',
                        });
                    }
                }
            }

            const service = new MockDomainService(eventBus);
            service.saveData({ id: 1 });

            await new Promise(resolve => setTimeout(resolve, 110));
            expect(mockToastService.showSuccess).toHaveBeenCalledWith('Data saved successfully', 'MockDomainService.saveData', '');
            expect(mockRouter.navigate).toHaveBeenCalledWith(['/success-page']);
        });

        it('should simulate validation error flow', async () => {
            class MockDomainService {
                constructor(private eventBus: EventBus) { }

                validateAndSave(data: unknown): void {
                    if (!data) {
                        this.eventBus.emit(DomainEventType.ERROR, {
                            message: 'Validation failed',
                            code: 'VALIDATION_ERROR',
                        });
                        return;
                    }
                }
            }

            const service = new MockDomainService(eventBus);
            service.validateAndSave(null);

            await new Promise(resolve => setTimeout(resolve, 110));
            expect(mockToastService.showError).toHaveBeenCalledWith('Validation failed', 'VALIDATION_ERROR');
        });
    });

    describe('Event Isolation', () => {
        it('should not interfere with other observers', async () => {
            let customObserverCalled = false;

            eventBus.on<ErrorEvent>(DomainEventType.ERROR).subscribe((event) => {
                customObserverCalled = true;
                expect(event.message).toBe('Test error');
            });

            eventBus.emit(DomainEventType.ERROR, {
                message: 'Test error',
                code: 'TEST',
            });

            await new Promise(resolve => setTimeout(resolve, 110));
            expect(customObserverCalled).toBe(true);
            expect(mockToastService.showError).toHaveBeenCalled();
        });
    });

    describe('Performance', () => {
        it('should handle rapid event emission', async () => {
            const eventCount = 100;

            for (let i = 0; i < eventCount; i++) {
                eventBus.emit(DomainEventType.INFO, {
                    message: `Event ${i}`,
                });
            }

            await new Promise(resolve => setTimeout(resolve, 210));
            expect(mockToastService.showInfo).toHaveBeenCalledTimes(eventCount);
        });
    });
});
