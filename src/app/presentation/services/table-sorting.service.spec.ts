// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { TableSortingService, TableSortingConfig } from './table-sorting.service';

describe('TableSortingService', () => {
    let service: TableSortingService;

    const defaultConfig: TableSortingConfig = {
        columns: ['name', 'firstName', 'company'],
        defaultOrderBy: 'name',
        defaultSortOrder: 'asc',
        useThreeWaySort: false
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [TableSortingService]
        });
        service = TestBed.inject(TableSortingService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('initialize', () => {
        it('should initialize with default configuration', () => {
            service.initialize(defaultConfig);

            expect(service.getCurrentOrderBy()).toBe('name');
            expect(service.getCurrentSortOrder()).toBe('asc');
        });

        it('should create headers for all configured columns', () => {
            service.initialize(defaultConfig);

            expect(service.getArrow('name')).toBe('↓');
            expect(service.getArrow('firstName')).toBe('');
            expect(service.getArrow('company')).toBe('');
        });

        it('should set initial arrow for default column', () => {
            service.initialize(defaultConfig);

            const arrow = service.getArrow('name');
            expect(arrow).toBe('↓');
        });
    });

    describe('onHeaderClick - Two-Way Sort', () => {
        beforeEach(() => {
            service.initialize(defaultConfig);
        });

        it('should toggle from asc to desc', () => {
            let callbackExecuted = false;
            const callback = () => { callbackExecuted = true; };

            service.onHeaderClick('firstName', callback);

            expect(service.getCurrentOrderBy()).toBe('firstName');
            expect(service.getCurrentSortOrder()).toBe('asc');
            expect(service.getArrow('firstName')).toBe('↓');
            expect(callbackExecuted).toBe(true);
        });

        it('should toggle from desc back to asc', () => {
            const callback = () => { };

            service.onHeaderClick('firstName', callback);
            service.onHeaderClick('firstName', callback);

            expect(service.getCurrentSortOrder()).toBe('desc');
            expect(service.getArrow('firstName')).toBe('↑');
        });

        it('should reset other headers when clicking new column', () => {
            const callback = () => { };

            service.onHeaderClick('firstName', callback);
            service.onHeaderClick('company', callback);

            expect(service.getArrow('firstName')).toBe('');
            expect(service.getArrow('company')).toBe('↓');
        });
    });

    describe('onHeaderClick - Three-Way Sort', () => {
        beforeEach(() => {
            const threeWayConfig: TableSortingConfig = {
                ...defaultConfig,
                useThreeWaySort: true
            };
            service.initialize(threeWayConfig);
        });

        it('should cycle through asc -> desc -> none', () => {
            const callback = () => { };

            service.onHeaderClick('firstName', callback);
            expect(service.getCurrentSortOrder()).toBe('asc');
            expect(service.getArrow('firstName')).toBe('↓');

            service.onHeaderClick('firstName', callback);
            expect(service.getCurrentSortOrder()).toBe('desc');
            expect(service.getArrow('firstName')).toBe('↑');

            service.onHeaderClick('firstName', callback);
            expect(service.getCurrentSortOrder()).toBe('');
            expect(service.getArrow('firstName')).toBe('');
        });

        it('should cycle back to asc after none', () => {
            const callback = () => { };

            service.onHeaderClick('firstName', callback);
            service.onHeaderClick('firstName', callback);
            service.onHeaderClick('firstName', callback);
            service.onHeaderClick('firstName', callback);

            expect(service.getCurrentSortOrder()).toBe('asc');
            expect(service.getArrow('firstName')).toBe('↓');
        });
    });

    describe('getArrow', () => {
        beforeEach(() => {
            service.initialize(defaultConfig);
        });

        it('should return down arrow for asc sort', () => {
            expect(service.getArrow('name')).toBe('↓');
        });

        it('should return up arrow for desc sort', () => {
            service.onHeaderClick('name', () => { });
            expect(service.getArrow('name')).toBe('↑');
        });

        it('should return empty string for non-configured column', () => {
            expect(service.getArrow('nonExistentColumn')).toBe('');
        });
    });

    describe('arrows computed signal', () => {
        beforeEach(() => {
            service.initialize(defaultConfig);
        });

        it('should update arrows map when sorting changes', () => {
            service.onHeaderClick('company', () => { });

            const arrowsMap = service.arrows();
            expect(arrowsMap.get('company')).toBe('↓');
            expect(arrowsMap.get('name')).toBe('');
            expect(arrowsMap.get('firstName')).toBe('');
        });
    });

    describe('currentSort signal', () => {
        beforeEach(() => {
            service.initialize(defaultConfig);
        });

        it('should update currentSort signal on header click', () => {
            service.onHeaderClick('company', () => { });

            const sortState = service.currentSort();
            expect(sortState.orderBy).toBe('company');
            expect(sortState.sortOrder).toBe('asc');
        });

        it('should be reactive to changes', () => {
            const initialSort = service.currentSort();
            expect(initialSort.orderBy).toBe('name');

            service.onHeaderClick('firstName', () => { });

            const updatedSort = service.currentSort();
            expect(updatedSort.orderBy).toBe('firstName');
        });
    });

    describe('restoreSortState', () => {
        beforeEach(() => {
            service.initialize(defaultConfig);
        });

        it('should restore previous sort state', () => {
            service.restoreSortState('company', 'desc');

            expect(service.getCurrentOrderBy()).toBe('company');
            expect(service.getCurrentSortOrder()).toBe('desc');
            expect(service.getArrow('company')).toBe('↑');
        });

        it('should reset other columns when restoring', () => {
            service.onHeaderClick('firstName', () => { });

            service.restoreSortState('company', 'asc');

            expect(service.getArrow('firstName')).toBe('');
            expect(service.getArrow('company')).toBe('↓');
        });
    });

    describe('edge cases', () => {
        beforeEach(() => {
            service.initialize(defaultConfig);
        });

        it('should silently ignore clicking non-configured column', () => {
            const callback = vi.fn();

            service.onHeaderClick('nonExistentColumn', callback);

            expect(callback).not.toHaveBeenCalled();
            expect(service.getCurrentOrderBy()).toBe('name');
            expect(service.getCurrentSortOrder()).toBe('asc');
        });

        it('should handle empty columns array', () => {
            const emptyConfig: TableSortingConfig = {
                columns: [],
                defaultOrderBy: '',
                defaultSortOrder: 'asc'
            };

            service.initialize(emptyConfig);

            expect(service.getCurrentOrderBy()).toBe('');
        });
    });
});
