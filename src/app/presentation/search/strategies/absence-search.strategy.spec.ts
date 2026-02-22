// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { AbsenceSearchStrategy } from './absence-search.strategy';
import { DataManagementBreakPlaceholderService } from 'src/app/domain/services/break/data-management-break-placeholder.service';
import { EntityName } from 'src/app/domain/enums/entity-names.enum';

describe('AbsenceSearchStrategy', () => {
    let strategy: AbsenceSearchStrategy;
    let mockBreakService: any;

    beforeEach(() => {
        const spy = {
            readYear: vi.fn(),
            breakFilter: { searchString: '' },
            onExternalFilterChange: vi.fn()
        };

        TestBed.configureTestingModule({
            providers: [
                AbsenceSearchStrategy,
                { provide: DataManagementBreakPlaceholderService, useValue: spy }
            ]
        });

        strategy = TestBed.inject(AbsenceSearchStrategy);
        mockBreakService = TestBed.inject(DataManagementBreakPlaceholderService) as any;
    });

    it('should be created', () => {
        expect(strategy).toBeTruthy();
    });

    it('should return correct entity name', () => {
        expect(strategy.getEntityName()).toBe(EntityName.ABSENCE);
    });

    it('should search with correct parameters', () => {
        strategy.search('vacation');

        expect(mockBreakService.breakFilter.searchString).toBe('vacation');
        expect(mockBreakService.onExternalFilterChange).toHaveBeenCalled();
        expect(mockBreakService.readYear).toHaveBeenCalled();
    });

    it('should reset filter correctly', () => {
        strategy.resetFilter();

        expect(mockBreakService.breakFilter.searchString).toBe('');
        expect(mockBreakService.readYear).toHaveBeenCalled();
    });
});
