import type { MockedObject } from "vitest";
import { TestBed } from '@angular/core/testing';
import { AbsenceSearchStrategy } from './absence-search.strategy';
import { DataManagementBreakService } from 'src/app/domain/services/absence/data-management-break.service';
import { EntityName } from 'src/app/domain/models/entity-names.enum';

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
                { provide: DataManagementBreakService, useValue: spy }
            ]
        });

        strategy = TestBed.inject(AbsenceSearchStrategy);
        mockBreakService = TestBed.inject(DataManagementBreakService) as any;
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
