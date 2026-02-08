/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { DataManagementBreakPlaceholderService } from './data-management-break-placeholder.service';
import { EVENT_BUS_TOKEN } from '../../interfaces/event-bus.interface';
import { MANAGEABLE_SERVICE_REGISTRY_TOKEN } from '../../interfaces/manageable-service-registry.interface';
import { DataBreakPlaceholderService } from '../../../infrastructure/api/break/data-break-placeholder.service';
import { IClientBreak, IMembership } from '../../models/client/client-class';
import { IBreakPlaceholder } from '../../models/break/break-class';

describe('DataManagementBreakPlaceholderService', () => {
    let service: DataManagementBreakPlaceholderService;
    let mockEventBus: any;
    let mockDataBreakPlaceholderService: any;
    let mockTranslateService: any;

    beforeEach(() => {
        const eventBusSpy = {
            emit: vi.fn(),
            on: vi.fn(),
            onAny: vi.fn()
        };
        const dataSpy = {
            addBreak: vi.fn(),
            updateBreak: vi.fn(),
            deleteBreak: vi.fn()
        };
        const translateSpy = {
            get: vi.fn()
        };
        const mockRegistry = {
            register: vi.fn(),
            get: vi.fn().mockReturnValue(null),
            has: vi.fn().mockReturnValue(false),
            clear: vi.fn(),
            getRegisteredRoutes: vi.fn().mockReturnValue([])
        };

        TestBed.configureTestingModule({
            imports: [TranslateModule.forRoot()],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                DataManagementBreakPlaceholderService,
                { provide: EVENT_BUS_TOKEN, useValue: eventBusSpy },
                { provide: DataBreakPlaceholderService, useValue: dataSpy },
                { provide: TranslateService, useValue: translateSpy },
                { provide: MANAGEABLE_SERVICE_REGISTRY_TOKEN, useValue: mockRegistry },
            ],
        });

        service = TestBed.inject(DataManagementBreakPlaceholderService);
        mockEventBus = TestBed.inject(EVENT_BUS_TOKEN) as any;
        mockDataBreakPlaceholderService = TestBed.inject(DataBreakPlaceholderService) as any;
        mockTranslateService = TestBed.inject(TranslateService) as any;

        mockTranslateService.get.mockReturnValue(of('Translated message {0} {1}'));
        mockDataBreakPlaceholderService.addBreak.mockReturnValue(of({ id: '1', from: new Date(), until: new Date() } as IBreakPlaceholder));
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('Membership validation', () => {
        let clientWithMembership: IClientBreak;
        let clientWithoutMembership: IClientBreak;
        let validBreak: IBreakPlaceholder;
        let invalidBreakBefore: IBreakPlaceholder;
        let invalidBreakAfter: IBreakPlaceholder;

        beforeEach(() => {
            const membership: IMembership = {
                id: '1',
                clientId: 'client1',
                client: undefined,
                validFrom: new Date('2024-03-01'),
                validUntil: new Date('2024-11-30'),
                type: 1,
            };

            clientWithMembership = {
                id: 'client1',
                idNumber: 1001,
                firstName: 'John',
                name: 'Doe',
                secondName: '',
                maidenName: '',
                title: '',
                company: '',
                birthdate: undefined,
                gender: '0',
                legalEntity: false,
                type: 0,
                breakPlaceholders: [],
                membership: membership,
            } as IClientBreak;

            clientWithoutMembership = {
                id: 'client2',
                idNumber: 1002,
                firstName: 'Jane',
                name: 'Smith',
                secondName: '',
                maidenName: '',
                title: '',
                company: '',
                birthdate: undefined,
                gender: '0',
                legalEntity: false,
                type: 0,
                breakPlaceholders: [],
                membership: undefined,
            } as IClientBreak;

            validBreak = {
                id: undefined,
                clientId: 'client1',
                from: new Date('2024-06-01'),
                until: new Date('2024-06-07'),
                absenceId: 'absence1',
            } as IBreakPlaceholder;

            invalidBreakBefore = {
                id: undefined,
                clientId: 'client1',
                from: new Date('2024-01-01'),
                until: new Date('2024-01-07'),
                absenceId: 'absence1',
            } as IBreakPlaceholder;

            invalidBreakAfter = {
                id: undefined,
                clientId: 'client1',
                from: new Date('2024-12-01'),
                until: new Date('2024-12-07'),
                absenceId: 'absence1',
            } as IBreakPlaceholder;

            service.clients = [clientWithMembership, clientWithoutMembership];
        });

        it('should allow break creation for client without membership', () => {
            const result = service.addBreak(1, validBreak);

            expect(result).toBe(true);
            expect(mockDataBreakPlaceholderService.addBreak).toHaveBeenCalled();
            expect(mockEventBus.emit).not.toHaveBeenCalled();
        });

        it('should allow valid break creation within membership period', () => {
            const result = service.addBreak(0, validBreak);

            expect(result).toBe(true);
            expect(mockDataBreakPlaceholderService.addBreak).toHaveBeenCalled();
            expect(mockEventBus.emit).not.toHaveBeenCalled();
        });

        it('should reject break creation before membership start', () => {
            const result = service.addBreak(0, invalidBreakBefore);

            expect(result).toBe(false);
            expect(mockDataBreakPlaceholderService.addBreak).not.toHaveBeenCalled();
            expect(mockTranslateService.get).toHaveBeenCalledWith('absence-gantt.validation.membership.before-start');
            expect(mockEventBus.emit).toHaveBeenCalled();
        });

        it('should reject break creation after membership end', () => {
            const result = service.addBreak(0, invalidBreakAfter);

            expect(result).toBe(false);
            expect(mockDataBreakPlaceholderService.addBreak).not.toHaveBeenCalled();
            expect(mockTranslateService.get).toHaveBeenCalledWith('absence-gantt.validation.membership.after-end');
            expect(mockEventBus.emit).toHaveBeenCalled();
        });

        it('should reject break spanning outside membership period', () => {
            const invalidBreakSpanning: IBreakPlaceholder = {
                id: undefined,
                clientId: 'client1',
                from: new Date('2024-02-01'),
                until: new Date('2024-12-31'),
                absenceId: 'absence1',
            } as IBreakPlaceholder;

            const result = service.addBreak(0, invalidBreakSpanning);

            expect(result).toBe(false);
            expect(mockDataBreakPlaceholderService.addBreak).not.toHaveBeenCalled();
            // The validation logic checks for "before-start" first, so spanning breaks get that message
            expect(mockTranslateService.get).toHaveBeenCalledWith('absence-gantt.validation.membership.before-start');
            expect(mockEventBus.emit).toHaveBeenCalled();
        });

        it('should return false for invalid client index', () => {
            const result = service.addBreak(999, validBreak);

            expect(result).toBe(false);
            expect(mockDataBreakPlaceholderService.addBreak).not.toHaveBeenCalled();
            expect(mockEventBus.emit).not.toHaveBeenCalled();
        });

        it('should format error messages with date parameters', () => {
            service.addBreak(0, invalidBreakBefore);

            expect(mockTranslateService.get).toHaveBeenCalledWith('absence-gantt.validation.membership.before-start');
            expect(mockEventBus.emit).toHaveBeenCalled();
        });

        it('should validate membership with only validFrom date', () => {
            clientWithMembership.membership!.validUntil = undefined;

            const result = service.addBreak(0, validBreak);

            expect(result).toBe(true);
            expect(mockDataBreakPlaceholderService.addBreak).toHaveBeenCalled();
        });

        it('should validate membership with only validUntil date', () => {
            clientWithMembership.membership!.validFrom = undefined as any;

            const result = service.addBreak(0, validBreak);

            expect(result).toBe(true);
            expect(mockDataBreakPlaceholderService.addBreak).toHaveBeenCalled();
        });
    });

    describe('resetScrollPositionTrigger Signal', () => {
        it('should have resetScrollPositionTrigger signal initialized to 0', () => {
            // Assert
            expect(service.resetScrollPositionTrigger).toBeDefined();
            expect(typeof service.resetScrollPositionTrigger).toBe('function');
            expect(service.resetScrollPositionTrigger()).toBe(0);
        });

        it('should increment resetScrollPositionTrigger when update is called', () => {
            // Arrange
            const initialValue = service.resetScrollPositionTrigger();

            // Act
            service.resetScrollPositionTrigger.update(v => v + 1);

            // Assert
            expect(service.resetScrollPositionTrigger()).toBe(initialValue + 1);
        });

        it('should allow tracking multiple increments', () => {
            // Arrange
            const initialValue = service.resetScrollPositionTrigger();

            // Act
            service.resetScrollPositionTrigger.update(v => v + 1);
            service.resetScrollPositionTrigger.update(v => v + 1);
            service.resetScrollPositionTrigger.update(v => v + 1);

            // Assert
            expect(service.resetScrollPositionTrigger()).toBe(initialValue + 3);
        });
    });

    describe('Signal state management', () => {
        it('should have isRead signal initialized to false', () => {
            // Assert
            expect(service.isRead).toBeDefined();
            expect(service.isRead()).toBe(false);
        });

        it('should have isUpdate signal initialized to undefined', () => {
            // Assert
            expect(service.isUpdate).toBeDefined();
            expect(service.isUpdate()).toBeUndefined();
        });

        it('should have isAbsenceHeaderInit signal initialized to false', () => {
            // Assert
            expect(service.isAbsenceHeaderInit).toBeDefined();
            expect(service.isAbsenceHeaderInit()).toBe(false);
        });
    });

    describe('updateBreak validation', () => {
        let clientWithMembership: IClientBreak;
        let invalidBreak: IBreakPlaceholder;

        beforeEach(() => {
            const membership: IMembership = {
                id: '1',
                clientId: 'client1',
                client: undefined,
                validFrom: new Date('2024-03-01'),
                validUntil: new Date('2024-11-30'),
                type: 1,
            };

            clientWithMembership = {
                id: 'client1',
                idNumber: 1001,
                firstName: 'John',
                name: 'Doe',
                secondName: '',
                maidenName: '',
                title: '',
                company: '',
                birthdate: undefined,
                gender: '0',
                legalEntity: false,
                type: 0,
                breakPlaceholders: [],
                membership: membership,
            } as IClientBreak;

            invalidBreak = {
                id: '1',
                clientId: 'client1',
                from: new Date('2024-01-01'),
                until: new Date('2024-01-07'),
                absenceId: 'absence1',
            } as IBreakPlaceholder;

            service.clients = [clientWithMembership];
            mockDataBreakPlaceholderService.updateBreak.mockReturnValue(of({} as IBreakPlaceholder));
        });

        it('should reject break update outside membership period', async () => {
            await service.updateBreak(0, invalidBreak);

            expect(mockDataBreakPlaceholderService.updateBreak).not.toHaveBeenCalled();
            expect(mockTranslateService.get).toHaveBeenCalledWith('absence-gantt.validation.membership.before-start');
            expect(mockEventBus.emit).toHaveBeenCalled();
        });
    });
});
