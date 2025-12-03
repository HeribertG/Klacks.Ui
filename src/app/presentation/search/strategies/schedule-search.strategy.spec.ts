/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { ScheduleSearchStrategy } from './schedule-search.strategy';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { EntityName } from 'src/app/domain/models/entity-names.enum';

describe('ScheduleSearchStrategy', () => {
    let strategy: ScheduleSearchStrategy;
    let mockScheduleService: any;

    beforeEach(() => {
        const spy = {
            readDatas: vi.fn(),
            workFilter: { searchString: '' },
            onExternalFilterChange: vi.fn()
        };

        TestBed.configureTestingModule({
            providers: [
                ScheduleSearchStrategy,
                { provide: DataManagementScheduleService, useValue: spy }
            ]
        });

        strategy = TestBed.inject(ScheduleSearchStrategy);
        mockScheduleService = TestBed.inject(DataManagementScheduleService) as any;
    });

    it('should be created', () => {
        expect(strategy).toBeTruthy();
    });

    it('should return correct entity name', () => {
        expect(strategy.getEntityName()).toBe(EntityName.SCHEDULE);
    });

    it('should search with correct parameters', () => {
        strategy.search('morning shift');

        expect(mockScheduleService.workFilter.searchString).toBe('morning shift');
        expect(mockScheduleService.onExternalFilterChange).toHaveBeenCalled();
        expect(mockScheduleService.readDatas).toHaveBeenCalled();
    });

    it('should reset filter correctly', () => {
        strategy.resetFilter();

        expect(mockScheduleService.workFilter.searchString).toBe('');
        expect(mockScheduleService.readDatas).toHaveBeenCalled();
    });
});
