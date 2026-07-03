// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { DomainEventHandler } from './domain-event.handler';
import { EventBus } from 'src/app/application/services/event-bus.service';
import { ToastShowService } from '../toast/toast-show.service';
import { of, Subject } from 'rxjs';
import { DomainEventType, ErrorEvent, SuccessEvent } from 'src/app/domain/events/domain-events';

describe('DomainEventHandler', () => {
    let handler: DomainEventHandler;
    let mockEventBus: any;
    let mockToastService: any;
    let mockTranslate: any;

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
        const translateSpy = {
            instant: vi.fn((key: string) => `translated:${key}`)
        };

        eventBusSpy.on.mockReturnValue(of());

        TestBed.configureTestingModule({
            providers: [
                DomainEventHandler,
                { provide: EventBus, useValue: eventBusSpy },
                { provide: ToastShowService, useValue: toastServiceSpy },
                { provide: Router, useValue: routerSpy },
                { provide: TranslateService, useValue: translateSpy },
            ],
        });

        mockEventBus = TestBed.inject(EventBus) as any;
        mockToastService = TestBed.inject(ToastShowService) as any;
        mockTranslate = TestBed.inject(TranslateService) as any;
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

    describe('message translation', () => {
        it('should translate the event message before showing the toast', () => {
            const successEvents = new Subject<SuccessEvent>();
            mockEventBus.on.mockImplementation((type: string) =>
                type === DomainEventType.SUCCESS ? successEvents.asObservable() : of()
            );

            handler = TestBed.inject(DomainEventHandler);
            successEvents.next({ message: 'settings.erp-drop-points.success.upload', context: 'Success' });

            expect(mockTranslate.instant).toHaveBeenCalledWith('settings.erp-drop-points.success.upload');
            expect(mockToastService.showSuccess).toHaveBeenCalledWith(
                'translated:settings.erp-drop-points.success.upload',
                'Success',
                ''
            );
        });

        it('should stringify a non-string message instead of throwing (raw error objects reach this handler)', () => {
            const errorEvents = new Subject<ErrorEvent>();
            mockEventBus.on.mockImplementation((type: string) =>
                type === DomainEventType.ERROR ? errorEvents.asObservable() : of()
            );

            handler = TestBed.inject(DomainEventHandler);
            const rawError = { status: 500, message: 'Server error' } as unknown as string;
            errorEvents.next({ message: rawError, code: 'GroupTreeError' });

            expect(mockTranslate.instant).not.toHaveBeenCalled();
            expect(mockToastService.showError).toHaveBeenCalledWith(
                String(rawError),
                'GroupTreeError'
            );
        });
    });

    describe('integration with EventBus and Presentation Services', () => {
        it('should not be tested with mocks - see event-bus.integration.spec.ts', () => {
            expect(true).toBe(true);
        });
    });
});
