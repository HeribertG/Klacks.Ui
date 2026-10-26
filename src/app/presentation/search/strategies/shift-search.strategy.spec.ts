// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { ShiftSearchStrategy } from './shift-search.strategy';
import { DataManagementShiftService } from 'src/app/domain/services/shift/data-management-shift.service';
import { EntityName } from 'src/app/domain/enums/entity-names.enum';

describe('ShiftSearchStrategy', () => {
    let strategy: ShiftSearchStrategy;
    let mockShiftService: any;

    beforeEach(() => {
        const spy = {
            readPage: vi.fn(),
            currentFilter: { searchString: '', includeClientName: false, city: 'Thun', zipPrefix: '30' },
            onExternalFilterChange: vi.fn()
        };

        TestBed.configureTestingModule({
            providers: [
                ShiftSearchStrategy,
                { provide: DataManagementShiftService, useValue: spy }
            ]
        });

        strategy = TestBed.inject(ShiftSearchStrategy);
        mockShiftService = TestBed.inject(DataManagementShiftService) as any;
    });

    it('should be created', () => {
        expect(strategy).toBeTruthy();
    });

    it('should return correct entity name', () => {
        expect(strategy.getEntityName()).toBe(EntityName.SHIFT);
    });

    it('should search with correct parameters', () => {
        strategy.search('night shift', { includeClient: true });

        expect(mockShiftService.currentFilter.searchString).toBe('night shift');
        expect(mockShiftService.currentFilter.includeClientName).toBe(true);
        expect(mockShiftService.onExternalFilterChange).toHaveBeenCalled();
        expect(mockShiftService.readPage).toHaveBeenCalled();
    });

    it('should search with default options', () => {
        strategy.search('day shift');

        expect(mockShiftService.currentFilter.searchString).toBe('day shift');
        expect(mockShiftService.currentFilter.includeClientName).toBe(false);
        expect(mockShiftService.readPage).toHaveBeenCalled();
    });

    it('should leave city and zip prefix alone when the options do not carry them', () => {
        strategy.search('day shift');

        expect(mockShiftService.currentFilter.city).toBe('Thun');
        expect(mockShiftService.currentFilter.zipPrefix).toBe('30');
    });

    it('should set trimmed city and zip prefix and reload the list', () => {
        strategy.search('', { city: ' Bern ', zipPrefix: '30' });

        expect(mockShiftService.currentFilter.searchString).toBe('');
        expect(mockShiftService.currentFilter.city).toBe('Bern');
        expect(mockShiftService.currentFilter.zipPrefix).toBe('30');
        expect(mockShiftService.onExternalFilterChange).toHaveBeenCalled();
        expect(mockShiftService.readPage).toHaveBeenCalledTimes(1);
    });

    it('should clear city and zip prefix when the options carry empty strings', () => {
        strategy.search('', { city: '', zipPrefix: '' });

        expect(mockShiftService.currentFilter.city).toBe('');
        expect(mockShiftService.currentFilter.zipPrefix).toBe('');
        expect(mockShiftService.readPage).toHaveBeenCalled();
    });

    it('should reset filter correctly', () => {
        strategy.resetFilter();

        expect(mockShiftService.currentFilter.searchString).toBe('');
        expect(mockShiftService.onExternalFilterChange).toHaveBeenCalled();
        expect(mockShiftService.readPage).toHaveBeenCalled();
    });
});
