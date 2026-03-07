// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { WorkplaceStateService } from './workplace-state.service';
import { LOADING_INDICATOR_TOKEN, ILoadingIndicator } from 'src/app/domain/interfaces/loading-indicator.interface';
import { MANAGEABLE_SERVICE_REGISTRY_TOKEN, IManageableServiceRegistry } from 'src/app/domain/interfaces/manageable-service-registry.interface';

describe('WorkplaceStateService', () => {
    let service: WorkplaceStateService;
    let mockLoadingIndicator: ILoadingIndicator;
    let mockRegistry: IManageableServiceRegistry;

    beforeEach(() => {
        mockLoadingIndicator = { showProgressSpinner: false, interceptorSuppressed: false };
        mockRegistry = {
            register: vi.fn(),
            get: vi.fn().mockReturnValue(null),
            has: vi.fn().mockReturnValue(false),
            clear: vi.fn(),
            getRegisteredRoutes: vi.fn().mockReturnValue([])
        };

        TestBed.configureTestingModule({
            providers: [
                { provide: LOADING_INDICATOR_TOKEN, useValue: mockLoadingIndicator },
                { provide: MANAGEABLE_SERVICE_REGISTRY_TOKEN, useValue: mockRegistry }
            ]
        });
        service = TestBed.inject(WorkplaceStateService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('isDirty', () => {
        it('should return false initially', () => {
            expect(service.isDirty).toBe(false);
        });

        it('should update when set', () => {
            service.isDirty = true;
            expect(service.isDirty).toBe(true);
        });
    });

    describe('canSave', () => {
        it('should return false initially', () => {
            expect(service.canSave).toBe(false);
        });

        it('should update when set', () => {
            service.canSave = true;
            expect(service.canSave).toBe(true);
        });

        it('should be independent of isDirty', () => {
            service.isDirty = true;
            service.canSave = false;
            expect(service.isDirty).toBe(true);
            expect(service.canSave).toBe(false);
        });
    });

    describe('isDisabled', () => {
        it('should return false initially', () => {
            expect(service.isDisabled).toBe(false);
        });

        it('should update when set', () => {
            service.isDisabled = true;
            expect(service.isDisabled).toBe(true);
        });
    });
});
