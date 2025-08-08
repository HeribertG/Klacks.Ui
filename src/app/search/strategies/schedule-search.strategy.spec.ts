import { TestBed } from '@angular/core/testing';
import { ScheduleSearchStrategy } from './schedule-search.strategy';
import { DataManagementScheduleService } from '../../data/management/data-management-schedule.service';
import { EntityName } from 'src/app/models/entity-names.enum';

describe('ScheduleSearchStrategy', () => {
  let strategy: ScheduleSearchStrategy;
  let mockScheduleService: jasmine.SpyObj<DataManagementScheduleService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('DataManagementScheduleService', ['readDatas'], {
      workFilter: { searchString: '' },
      onExternalFilterChange: jasmine.createSpy()
    });

    TestBed.configureTestingModule({
      providers: [
        ScheduleSearchStrategy,
        { provide: DataManagementScheduleService, useValue: spy }
      ]
    });

    strategy = TestBed.inject(ScheduleSearchStrategy);
    mockScheduleService = TestBed.inject(DataManagementScheduleService) as jasmine.SpyObj<DataManagementScheduleService>;
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