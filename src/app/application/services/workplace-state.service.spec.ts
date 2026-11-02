// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

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

    describe('a save the server refused', () => {
        const stubManager = (dirty = true) => ({
            areObjectsDirty: vi.fn().mockReturnValue(dirty),
            save: vi.fn(),
            isSaveAndClose: false,
            onSaveCompleted: undefined as (() => void) | undefined,
            onSaveRefused: undefined as (() => void) | undefined,
        });

        const activate = (manager: ReturnType<typeof stubManager>) => {
            service.activeManager.set(manager as never);
        };

        it('does not navigate away on save and close, and frees the save button', () => {
            const manager = stubManager();
            activate(manager);
            const navigateBack = vi.fn();

            service.onClickSaveAndClose(navigateBack);
            manager.onSaveRefused?.();

            expect(navigateBack).not.toHaveBeenCalled();
            expect(service.isDisabled).toBe(false);
        });

        it('keeps the form dirty, whatever the interceptor did to the flag', () => {
            const manager = stubManager();
            activate(manager);
            service.onClickSave();
            service.isDirty = false;

            manager.onSaveRefused?.();

            expect(service.isDirty).toBe(true);
        });

        it('forgets the close of the refused save, so a later plain save stays on the page', () => {
            const manager = stubManager();
            activate(manager);
            const navigateBack = vi.fn();
            service.onClickSaveAndClose(navigateBack);
            manager.onSaveRefused?.();

            service.onClickSave();
            manager.onSaveCompleted?.();

            expect(navigateBack).not.toHaveBeenCalled();
        });

        it('still navigates after a save that went through', () => {
            const manager = stubManager();
            activate(manager);
            const navigateBack = vi.fn();

            service.onClickSaveAndClose(navigateBack);
            manager.onSaveCompleted?.();

            expect(navigateBack).toHaveBeenCalledTimes(1);
        });

        it('forgets the refusal hook of a refused save', () => {
            const manager = stubManager();
            activate(manager);

            service.onClickSave();
            manager.onSaveRefused?.();

            expect(manager.onSaveRefused).toBeUndefined();
        });
    });

    describe('two saves in a row on a root manager', () => {
        const stubManager = () => ({
            areObjectsDirty: vi.fn().mockReturnValue(true),
            save: vi.fn(),
            isSaveAndClose: false,
            onSaveCompleted: undefined as (() => void) | undefined,
            onSaveRefused: undefined as (() => void) | undefined,
        });

        const activate = (manager: ReturnType<typeof stubManager>) => {
            service.activeManager.set(manager as never);
        };

        it('stays on the page on a plain save after save and close', () => {
            const manager = stubManager();
            activate(manager);
            const navigateBack = vi.fn();
            service.onClickSaveAndClose(navigateBack);
            manager.onSaveCompleted?.();

            service.onClickSave();
            manager.onSaveCompleted?.();

            expect(navigateBack).toHaveBeenCalledTimes(1);
        });

        it('calls the callback of the page once per save, the wrappers do not stack', () => {
            const manager = stubManager();
            const pageCallback = vi.fn();
            manager.onSaveCompleted = pageCallback;
            activate(manager);

            service.onClickSave();
            manager.onSaveCompleted?.();
            service.onClickSave();
            manager.onSaveCompleted?.();

            expect(pageCallback).toHaveBeenCalledTimes(2);
        });

        it('hands the slots back to the page after a finished save', () => {
            const manager = stubManager();
            const pageCallback = vi.fn();
            manager.onSaveCompleted = pageCallback;
            activate(manager);

            service.onClickSaveAndClose(vi.fn());
            manager.onSaveCompleted?.();

            expect(manager.onSaveCompleted).toBe(pageCallback);
            expect(manager.onSaveRefused).toBeUndefined();
        });
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
