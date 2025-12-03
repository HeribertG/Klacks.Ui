/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { DomainEventHandler } from './domain-event.handler';
import { EventBus } from 'src/app/application/services/event-bus.service';
import { ToastShowService } from '../toast/toast-show.service';
import { of } from 'rxjs';
import { DomainEventType, } from 'src/app/domain/events/domain-events';

describe('DomainEventHandler', () => {
    let handler: DomainEventHandler;
    let mockEventBus: any;

    beforeEach(() => {
        const eventBusSpy = {
            on: vi.fn(),
            emit: vi.fn()
        };
        const toastServiceSpy = {
            showError: vi.fn(),
            showSuccess: vi.fn(),
            showInfo: vi.fn()
        };
        const routerSpy = {
            navigate: vi.fn()
        };

        eventBusSpy.on.mockReturnValue(of());

        TestBed.configureTestingModule({
            providers: [
                DomainEventHandler,
                { provide: EventBus, useValue: eventBusSpy },
                { provide: ToastShowService, useValue: toastServiceSpy },
                { provide: Router, useValue: routerSpy },
            ],
        });

        mockEventBus = TestBed.inject(EventBus) as any;
    });

    it('should be created', () => {
        handler = TestBed.inject(DomainEventHandler);
        expect(handler).toBeTruthy();
    });

    describe('constructor initialization', () => {
        it('should setup all event handlers', () => {
            handler = TestBed.inject(DomainEventHandler);

            expect(mockEventBus.on).toHaveBeenCalledWith(DomainEventType.ERROR);
            expect(mockEventBus.on).toHaveBeenCalledWith(DomainEventType.SUCCESS);
            expect(mockEventBus.on).toHaveBeenCalledWith(DomainEventType.WARNING);
            expect(mockEventBus.on).toHaveBeenCalledWith(DomainEventType.INFO);
            expect(mockEventBus.on).toHaveBeenCalledWith(DomainEventType.NAVIGATE);
            expect(mockEventBus.on).toHaveBeenCalledTimes(5);
        });
    });

    describe('integration with EventBus and Presentation Services', () => {
        it('should not be tested with mocks - see event-bus.integration.spec.ts', () => {
            expect(true).toBe(true);
        });
    });
});
